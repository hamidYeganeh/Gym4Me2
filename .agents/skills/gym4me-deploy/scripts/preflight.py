#!/usr/bin/env python3
"""Read-only deployment checks and optional local source snapshot; no remote mutations."""
import argparse
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.request import urlopen

SKIP_DIRS = {'.git', '.agents', '.codex', 'node_modules', 'dist', 'build', 'out',
             'coverage', 'outputs', 'docs', 'android', 'ios', '.turbo', '.vercel',
             '.artifacts', '.ops-private'}
SKIP_FILES = ('*.pem', '*.key', '*.p12', '*.pfx', '*.jks', '*.keystore', '*.log',
              '*.tsbuildinfo', '.ds_store', '*service-account*.json', 'credentials.json')


def command(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout.strip()


def include(path):
    return not (any(p in SKIP_DIRS or p.startswith(('.env', '.next', '.staging-', '.native-build-', '.venv', 'dist-'))
                    for p in path.parts)
                or any(fnmatch.fnmatch(path.name.lower(), pattern) for pattern in SKIP_FILES))


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def snapshot(repo, destination=None):
    raw = subprocess.run(['git', '-C', str(repo), 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
                         check=True, capture_output=True).stdout
    files = sorted({os.fsdecode(p) for p in raw.split(b'\0') if p})
    inventory, digest = [], hashlib.sha256()
    if destination:
        destination = destination.resolve()
        private = (repo / '.ops-private').resolve()
        if not destination.is_relative_to(private) or destination == private or destination.exists():
            raise ValueError('Choose a new snapshot directory under REPO/.ops-private/')
        destination.mkdir(parents=True, mode=0o700)
        destination.chmod(0o700)
    for name in files:
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or not include(relative):
            continue
        source = repo / relative
        if source.is_symlink():
            raise ValueError(f'Review source symlink before deployment: {name}')
        if not source.is_file():
            continue  # Intended working-tree deletion.
        source_hash = sha(source)
        if destination:
            target = destination / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            if sha(target) != source_hash:
                raise ValueError('Source changed while copying; create a new snapshot')
        digest.update(os.fsencode(name) + b'\0' + source_hash.encode() + b'\n')
        inventory.append({'path': name, 'sha256': source_hash})
    manifest = {'project': 'Gym4Me', 'git_head': command(['git', '-C', str(repo), 'rev-parse', 'HEAD']),
                'dirty': bool(command(['git', '-C', str(repo), 'status', '--porcelain'])),
                'source_sha256': digest.hexdigest(), 'file_count': len(inventory), 'files': inventory}
    if destination:
        (destination / '.gym4me-release.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return {k: v for k, v in manifest.items() if k != 'files'}


def live(host):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.@:-]*', host):
        raise ValueError('Invalid SSH host')
    probe = r'''
import json, os, pathlib, shutil, stat, subprocess
def run(args):
    p = subprocess.run(args, text=True, capture_output=True)
    return p.stdout.strip() if p.returncode == 0 else None
units = ['gym4me-api','gym4me-web@application','gym4me-web@admin','gym4me-web@business','gym4me-web@website']
addresses = json.loads(run(['ip','-j','address']) or '[]')
envs = ['/etc/gym4me/api.env','/etc/gym4me/migration.env','/etc/gym4me/infra/infra.env']
memory = dict(line.split(':',1) for line in pathlib.Path('/proc/meminfo').read_text().splitlines())
print(json.dumps({'hostname': run(['hostname']),
 'ipv4': [a['local'] for i in addresses for a in i.get('addr_info',[]) if a.get('family') == 'inet'],
 'current': os.path.realpath('/opt/gym4me/current'),
 'services': {u: run(['systemctl','is-active',u]) for u in units},
 'node': run(['/usr/local/bin/node','--version']), 'pnpm': run(['/usr/local/bin/pnpm','--version']),
 'env_file_modes': {p: oct(stat.S_IMODE(os.stat(p).st_mode)) if os.path.isfile(p) else None for p in envs},
 'public_map_env_present': os.path.isfile('/opt/gym4me/current/apps/application/.env.production'),
 'backup_timer': run(['systemctl','is-enabled','gym4me-backup.timer']),
 'memory_available': memory.get('MemAvailable','').strip(), 'swap_total': memory.get('SwapTotal','').strip(),
 'disk_available_bytes': shutil.disk_usage('/opt/gym4me').free,
 'containers': run(['docker','ps','--format','{{.Names}} {{.Status}}'])}))
'''
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o',
                             'StrictHostKeyChecking=yes', host, 'python3', '-'],
                            input=probe, capture_output=True, text=True, timeout=40, check=True)
    report = json.loads(result.stdout)
    report['expected_target_matches'] = '188.212.99.190' in report['ipv4']
    with urlopen('https://api.gym4me.ir/api/v1/system/health/ready', timeout=15) as response:
        health = json.load(response)
    report['api_checks'] = health.get('checks')
    container_lines = (report['containers'] or '').splitlines()
    report['infra_healthy'] = all(
        any(line.startswith(name + ' ') and '(healthy)' in line for line in container_lines)
        for name in ['gym4me-production-postgres-1', 'gym4me-production-storage-1'])
    report['ready_for_routine_release'] = (
        report['expected_target_matches'] and report['current'].startswith('/opt/gym4me/releases/')
        and all(v == 'active' for v in report['services'].values())
        and all(v == '0o600' for v in report['env_file_modes'].values())
        and report['public_map_env_present'] and report['infra_healthy']
        and report['backup_timer'] == 'enabled' and report['disk_available_bytes'] >= 6 * 1024**3
        and health.get('status') == 'ok'
        and health.get('checks') == {'database': 'up', 'storage': 'up'})
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    parser.add_argument('--snapshot', type=Path, help='New local directory under REPO/.ops-private/')
    parser.add_argument('--live', action='store_true', help='Read-only SSH and public API checks')
    parser.add_argument('--host', default='gym4me-vps')
    args = parser.parse_args()
    repo = Path(command(['git', '-C', str(args.repo), 'rev-parse', '--show-toplevel'])).resolve()
    package = json.loads((repo / 'package.json').read_text())
    if package.get('name', '').lower() != 'gym4me' or not (repo / 'ops/vps/README.md').is_file():
        raise ValueError('Not the Gym4Me deployment repository')
    report = {'repo': str(repo), 'package_manager': package.get('packageManager')}
    if args.live:
        report['production'] = live(args.host)
        if not report['production']['ready_for_routine_release']:
            print(json.dumps(report, indent=2))
            return 1
    report['source'] = snapshot(repo, args.snapshot)
    if args.snapshot:
        report['snapshot'] = str(args.snapshot.resolve())
    print(json.dumps(report, indent=2))
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        # Never print SSH stderr, env values or provider responses.
        print(f'Preflight failed: {type(error).__name__}. Check repository, snapshot path and SSH target.', file=sys.stderr)
        sys.exit(1)
