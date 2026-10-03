/** Release gate: open our initial packs with real LevelDB, compare all content,
 * then compact/rebuild with the official Foundry CLI and compare again.
 * This script runs in GitHub Actions, or locally after npm install.
 */
import {compilePack, extractPack} from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs/promises";
import path from "node:path";
import {isDeepStrictEqual} from "node:util";

const root=path.resolve(import.meta.dirname,"..");
const manifest=JSON.parse(await fs.readFile(path.join(root,"module.json"),"utf8"));
async function readDocs(dir) {
  const docs=new Map();
  for (const filename of await fs.readdir(dir)) {
    if (!filename.endsWith(".json")) continue;
    const doc=JSON.parse(await fs.readFile(path.join(dir,filename),"utf8"));
    if (!doc._key) throw new Error("Missing source key: "+filename);
    docs.set(doc._key,doc);
  }
  return docs;
}
async function compare(packDir,sourceDir,label) {
  const output=path.join(root,".tmp",label);
  await fs.rm(output,{recursive:true,force:true});
  await extractPack(packDir,output,{clean:true});
  const expected=await readDocs(sourceDir), actual=await readDocs(output);
  if (expected.size!==actual.size) throw new Error(`${label}: document count mismatch`);
  for (const [key,value] of expected) if (!isDeepStrictEqual(value,actual.get(key))) throw new Error(`${label}: content mismatch for ${key}`);
  console.log(`${label}: native LevelDB read-back matched ${expected.size} complete documents`);
}
for (const pack of manifest.packs) {
  const source=path.join(root,"source-packs",pack.name), target=path.join(root,pack.path);
  await compare(target,source,pack.name+"-portable");
  await compilePack(source,target,{log:true});
  await compare(target,source,pack.name+"-native");
}
await fs.mkdir(path.join(root,".tmp"),{recursive:true});
await fs.writeFile(path.join(root,".tmp/native-verified.json"),JSON.stringify({module:manifest.id,version:manifest.version,packs:manifest.packs.map(p=>p.name),engine:"official Foundry CLI / classic-level",verifiedAt:new Date().toISOString()},null,2));
console.log("All native compendium round-trips passed. This is not a live Foundry UI test.");
