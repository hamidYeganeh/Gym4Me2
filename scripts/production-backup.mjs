import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {encryptBackup} from './encrypted-backup.mjs';
const require=createRequire(new URL('../apps/api/package.json',import.meta.url)),{Pool}=require('pg');
const database=process.env.GYM_BACKUP_DATABASE_URL;
if(!database||!['postgres:','postgresql:'].includes(new URL(database).protocol))throw new Error('Explicit backup database required.');
const connection=new URL(database);
const pgEnvironment={PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGDATABASE:decodeURIComponent(connection.pathname.slice(1)),PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGSSLMODE:connection.searchParams.get('sslmode')||'verify-full'};
const full=process.argv.includes('--full'),directory=await mkdtemp(join(tmpdir(),'gym4me-production-capture-'));
const pool=new Pool({connectionString:database,max:1,connectionTimeoutMillis:10000}),client=await pool.connect();
async function run(command,args,env={}){await new Promise((resolve,reject)=>{const child=spawn(command,args,{env:{...process.env,...env},stdio:['ignore','ignore','pipe']});let failed=false;child.stderr.on('data',(data)=>{failed=true;if(process.env.GYM_BACKUP_DIAGNOSTICS)void import('node:fs').then(({appendFileSync})=>appendFileSync(process.env.GYM_BACKUP_DIAGNOSTICS,String(data).split(database).join('[database]').split(new URL(database).password).join('[password]'),{mode:0o600}));});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Backup subprocess failed'+(failed?' (diagnostics withheld)':''))));});}
try{
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const marker=await client.query("SELECT id FROM gym4me_demo_installation WHERE id='isolated-demo-v1'");
 if(marker.rowCount!==1)throw new Error('This backup profile is restricted to the existing isolated cloud demo.');
 const {rows:[snapshot]}=await client.query('SELECT pg_export_snapshot() id,transaction_timestamp() at');
 const {rows:ledger}=await client.query('SELECT id,deleted_at FROM users WHERE deleted_at IS NOT NULL ORDER BY id');
 const {rows:media}=await client.query('SELECT count(*)::int count,coalesce(sum(octet_length(body)),0)::text bytes FROM gym4me_demo_media');
 await writeFile(join(directory,'deletion-ledger.json'),JSON.stringify({version:1,exportedAt:snapshot.at,entries:ledger.map(entry=>({userId:entry.id,deletedAt:entry.deleted_at.toISOString()}))}),{mode:0o600});
 if(full){const pg=process.env.GYM_PG_DUMP??'pg_dump';if(pg==='docker')await run('docker',['run','--rm',...Object.keys(pgEnvironment).flatMap(key=>['--env',key]),'-v',`${directory}:/capture`,'postgres:18','pg_dump','--format=custom','--no-owner','--no-acl',`--snapshot=${snapshot.id}`,'--file=/capture/database.dump'],pgEnvironment);else await run(pg,['--format=custom','--no-owner','--no-acl',`--snapshot=${snapshot.id}`,`--file=${join(directory,'database.dump')}`],pgEnvironment);}
 await writeFile(join(directory,'manifest.json'),JSON.stringify({version:1,capturedAt:snapshot.at,kind:full?'full':'deletion-ledger',mediaInDatabase:true,media:media[0]}),{mode:0o600});
 await client.query('COMMIT');
 const output=resolve(process.env.GYM_BACKUP_OUTPUT??'.artifacts/cloud-backup');await mkdir(output,{recursive:true,mode:0o700});const archive=join(directory,'archive.tar.gz');
 await run('tar',['-czf',archive,'-C',directory,'manifest.json','deletion-ledger.json',...(full?['database.dump']:[])]);
 const target=join(output,`${full?'full':'ledger'}-${new Date().toISOString().replace(/[:.]/g,'-')}.bin`);await encryptBackup(archive,target,await readFile(new URL('./backup-recipient.public-key',import.meta.url),'utf8'));
 console.log(JSON.stringify({kind:full?'full':'deletion-ledger',encryptedBytes:(await stat(target)).size,mediaIncluded:media[0].count}));
}finally{await client.query('ROLLBACK').catch(()=>undefined);client.release();await pool.end();await rm(directory,{recursive:true,force:true});}
