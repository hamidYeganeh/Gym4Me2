"""Disposable-repository tests; never connect to or mutate production."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('preflight', Path(__file__).with_name('preflight.py'))
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'))
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.repo)], check=True)
        for name, content in {
            '.gitignore': '.ops-private/\nnode_modules/\n',
            'package.json': '{"name":"Gym4Me"}',
            'ops/vps/README.md': 'fixture',
            'apps/api/src/main.ts': 'original source',
            'apps/api/.env': 'AUTH_SECRET=must-never-ship',
            'credentials.json': '{"private_key":"must-never-ship"}',
            'apps/application/ios/private.txt': 'native output',
        }.items():
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
        self.git('add', '.')
        self.git('-c', 'user.name=Skill Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture')

    def git(self, *args):
        return subprocess.run(['git', '-C', str(self.repo), *args], check=True, capture_output=True)

    def test_snapshot_excludes_even_tracked_secrets_and_includes_new_source(self):
        (self.repo / 'apps/api/src/new.ts').write_text('new source')
        ignored = self.repo / '.ops-private/secret.txt'
        ignored.parent.mkdir()
        ignored.write_text('ignored secret')
        destination = self.repo / '.ops-private/releases/one'
        result = preflight.snapshot(self.repo, destination)
        self.assertEqual((destination / 'apps/api/src/new.ts').read_text(), 'new source')
        self.assertFalse((destination / 'apps/api/.env').exists())
        self.assertFalse((destination / 'credentials.json').exists())
        self.assertFalse((destination / 'apps/application/ios').exists())
        manifest = json.loads((destination / '.gym4me-release.json').read_text())
        self.assertNotIn('must-never-ship', json.dumps(manifest))
        self.assertEqual(manifest['source_sha256'], result['source_sha256'])

    def test_hash_changes_for_source_but_not_for_secret_rotation(self):
        first = preflight.snapshot(self.repo)['source_sha256']
        (self.repo / 'apps/api/.env').write_text('AUTH_SECRET=rotated-private-value')
        self.assertEqual(first, preflight.snapshot(self.repo)['source_sha256'])
        (self.repo / 'apps/api/src/main.ts').write_text('changed source')
        self.assertNotEqual(first, preflight.snapshot(self.repo)['source_sha256'])

    def test_deletions_are_respected_and_existing_snapshot_is_preserved(self):
        (self.repo / 'apps/api/src/main.ts').unlink()
        destination = self.repo / '.ops-private/releases/one'
        preflight.snapshot(self.repo, destination)
        self.assertFalse((destination / 'apps/api/src/main.ts').exists())
        with self.assertRaises(ValueError):
            preflight.snapshot(self.repo, destination)
        self.assertTrue((destination / '.gym4me-release.json').is_file())
        with self.assertRaises(ValueError):
            preflight.snapshot(self.repo, self.repo / 'outside-private')

    def test_source_symlinks_are_not_followed_into_private_files(self):
        (self.repo / 'apps/api/src/leak.ts').symlink_to('../.env')
        with self.assertRaises(ValueError):
            preflight.snapshot(self.repo)

    def test_ssh_option_injection_is_rejected_before_connection(self):
        with self.assertRaises(ValueError):
            preflight.live('-oProxyCommand=unexpected')


if __name__ == '__main__':
    unittest.main()
