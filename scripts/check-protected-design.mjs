import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseline=JSON.parse(await readFile(resolve(root,'docs/qa/protected-design-baseline.json'),'utf8'));
const changed=[];
for(const [path,expected] of Object.entries(baseline)) {
 const actual=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
 if(actual!==expected)changed.push(path);
}
if(changed.length)throw new Error(`Protected design changed: ${changed.join(', ')}`);
console.log(`${Object.keys(baseline).length} catalog files match the reviewed design baseline.`);
