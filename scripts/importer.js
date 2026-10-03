/** Native Foundry VTT 14 journal import. No third-party runtime dependencies. */
export const MODULE_ID = "stillroots-song-journals";
export const PACK_NAMES = ["gm-journals", "handouts"];
/** The complete set shipped in the compendiums. Checked by tools/validate.py. */
export const EXPECTED = Object.freeze({journals: 51, pages: 114, gmJournals: 35, handouts: 16});
export const TARGET_SYSTEM = "5.3.3";
export const moduleVersion = () => game.modules?.get?.(MODULE_ID)?.version ?? "0.0.0";
export const documents = collection => collection?.contents ?? Array.from(collection?.values?.() ?? []);
export const worldFlags = doc => doc?.flags?.world ?? {};
export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const ownedJournals = () => documents(game.journal).filter(d => worldFlags(d).stillrootPack === MODULE_ID);
let inFlight = null;

export function requireGM() {
  if (!game.user?.isGM) throw new Error("Only a GM may use Stillroot's module tools.");
  if (Number(game.release?.generation) !== 14) throw new Error("This module's tools target Foundry VTT 14.");
}

/** Convert portable compendium references to canonical world IDs before import. */
export function normalizePackDocument(input) {
  const data = foundry.utils.deepClone(input);
  delete data._key;
  delete data._stats;
  data.folder = null;
  data.ownership = {default: 0};
  for (const page of data.pages ?? []) {
    delete page._key;
    delete page._stats;
    page.ownership = {default: -1};
    page.text.content = page.text.content.replace(
      /@UUID\[Compendium\.stillroots-song-journals\.(?:gm-journals|handouts)\.JournalEntry\.([A-Za-z0-9]{16})(\.JournalEntryPage\.[A-Za-z0-9]{16})?\]/g,
      (_, id, suffix) => `@UUID[JournalEntry.${id}${suffix ?? ""}]`
    );
  }
  return data;
}

export async function loadBundle() {
  requireGM();
  const journals = [];
  for (const name of PACK_NAMES) {
    const pack = game.packs.get(`${MODULE_ID}.${name}`);
    if (!pack) throw new Error(`Missing compendium ${name}. Install the complete module ZIP, not GitHub's automatic source archive.`);
    for (const document of await pack.getDocuments()) {
      const data = normalizePackDocument(document.toObject());
      const f = worldFlags(data);
      if (f.stillrootPack !== MODULE_ID || !f.stillrootKey) throw new Error(`Unrecognized journal in ${name}.`);
      journals.push({key:f.stillrootKey, group:f.stillrootGroup, audience:f.stillrootAudience, data});
    }
  }
  journals.sort((a,b) => a.data.sort - b.data.sort);
  if (journals.length !== EXPECTED.journals) throw new Error(`Expected ${EXPECTED.journals} journals; found ${journals.length}. Reinstall the complete release before importing.`);
  return {format:"stillroot-journals-v1", packId:MODULE_ID, version:moduleVersion(), journals};
}

/** Single-flight guard also prevents a double-click creating duplicate folders. */
export async function importJournals(options = {}) {
  requireGM();
  if (game.users?.activeGM && game.users.activeGM.id !== game.user.id) {
    ui.notifications.warn("Please have the active GM import Stillroot to avoid simultaneous imports.");
    return {cancelled:true, reason:"other-active-gm"};
  }
  if (inFlight) return inFlight;
  inFlight = (async () => importBundle(await loadBundle(), options))();
  try { return await inFlight; } finally { inFlight = null; }
}

/** Stillroot's Song journal importer. Foundry VTT 14; no actor or system-data writes. */
export async function importBundle(bundle, options = {}) {
  const PACK = 'stillroots-song-journals';
  const clone = value => foundry.utils.deepClone(value);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const flag = doc => doc.flags?.world ?? {};
  const entries = collection => collection?.contents ?? Array.from(collection?.values?.() ?? []);
  const warn = text => ui.notifications.warn(text);
  if (!game.user?.isGM) { warn('Only a GM may import these journals.'); return {cancelled:true, reason:'not-gm'}; }
  if (Number(game.release?.generation) !== 14) {
    warn('This importer targets Foundry VTT 14. No documents were changed.');
    return {cancelled:true, reason:'core-version'};
  }
  if (bundle?.format !== 'stillroot-journals-v1' || bundle?.packId !== PACK || !Array.isArray(bundle.journals)) {
    throw new Error('This is not a valid Stillroot journal bundle. No import was attempted.');
  }
  const seenKeys = new Set(), sourceIds = new Set(), allSourcePages = new Set();
  for (const record of bundle.journals) {
    if (!record.key || seenKeys.has(record.key)) throw new Error('Duplicate or absent journal key.');
    seenKeys.add(record.key);
    const data = record.data;
    if (!/^[A-Za-z0-9]{16}$/.test(data?._id) || sourceIds.has(data._id)) throw new Error('Invalid or duplicate journal ID.');
    sourceIds.add(data._id);
    if (!Array.isArray(data.pages) || !data.pages.length) throw new Error('A journal has no pages.');
    for (const page of data.pages) {
      if (!/^[A-Za-z0-9]{16}$/.test(page._id) || allSourcePages.has(page._id)) throw new Error('Invalid or duplicate page ID.');
      allSourcePages.add(page._id);
      if (page.type !== 'text' || page.text?.format !== 1 || typeof page.text?.content !== 'string') {
        throw new Error('A journal page is not native HTML text-page data.');
      }
    }
  }
  const bySourceId = new Map(bundle.journals.map(r => [r.data._id, r]));
  for (const record of bundle.journals) {
    if (flag(record.data).stillrootKey !== record.key || flag(record.data).stillrootPack !== PACK) throw new Error("Journal identity flags do not match their source.");
    for (const page of record.data.pages) {
      for (const m of page.text.content.matchAll(/@UUID\[JournalEntry\.([A-Za-z0-9]{16})(?:\.JournalEntryPage\.([A-Za-z0-9]{16}))?\]/g)) {
        const target = bySourceId.get(m[1]);
        if (!target || (m[2] && !target.data.pages.some(p => p._id === m[2]))) throw new Error("Invalid internal source link: " + m[0]);
        if (record.audience === "player" && target.audience !== "player") throw new Error("A player handout contains a GM link. Import refused.");
      }
    }
  }
  const existing = entries(game.journal).filter(d => flag(d).stillrootPack === PACK);
  const byKey = new Map();
  for (const doc of existing) {
    const key = flag(doc).stillrootKey;
    if (byKey.has(key)) throw new Error('Two existing Stillroot journals share the key '+key+'. Resolve the duplicate before importing.');
    byKey.set(key, doc);
  }
  const missing = bundle.journals.filter(r => !byKey.has(r.key));
  // Only an older or different system earns a notice; later D&D5e patch releases do not.
  const older = foundry.utils.isNewerVersion ? foundry.utils.isNewerVersion(TARGET_SYSTEM, game.system?.version ?? '0') : game.system?.version !== TARGET_SYSTEM;
  const mismatch = game.system?.id !== 'dnd5e' || older;
  const message = `<p>Create <strong>${missing.length}</strong> missing journals (${bundle.journals.length} in the complete set). Existing journals and your edits will be left unchanged.</p>`+
    '<p>All newly created journals are hidden from players. Player handouts are separate documents for deliberate sharing. No Actors, Items, Scenes, Active Effects, or character resources will be changed.</p>'+
    (mismatch ? `<p><strong>Version notice:</strong> you are running ${escape(game.system?.id)} ${escape(game.system?.version)}. The target is D&amp;D5e ${TARGET_SYSTEM} or later; these journals contain no system-specific Actor data.</p>` : '')+
    '<p>Use a backed-up test world first. Continue?</p>';
  if (options.confirm !== false) {
    const accepted = await foundry.applications.api.DialogV2.confirm({window:{title:"Import Stillroot's Song"}, content:message, rejectClose:false, modal:true});
    if (!accepted) return {cancelled:true, reason:'user'};
  }
  if (!missing.length) {
    ui.notifications.info("All Stillroot journals already exist. No prose or permissions were overwritten.");
    const index = byKey.get('start');
    if (options.open !== false && index?.sheet) await index.sheet.render({force:true});
    return {created:0, skipped:bundle.journals.length};
  }
  const JournalClass = CONFIG.JournalEntry.documentClass;
  const FolderClass = CONFIG.Folder.documentClass;
  // Validate all source documents in the target client's actual core model before writing anything.
  for (const record of missing) {
    const probe = clone(record.data);
    probe.folder = null;
    const model = new JournalClass(probe, {strict:true});
    if (model.validate({strict:true}) === false) throw new Error('Core validation failed for '+probe.name);
  }
  const folders = entries(game.folders);
  const folderByKey = new Map();
  for (const folder of folders) {
    if (flag(folder).stillrootPack !== PACK || !flag(folder).stillrootFolderKey) continue;
    const key = flag(folder).stillrootFolderKey;
    if (folderByKey.has(key)) throw new Error('Duplicate Stillroot folder key: '+key);
    folderByKey.set(key,folder);
  }
  const existingRoot = folderByKey.get('root:gm');
  const priorPlan = clone(flag(existingRoot ?? {}).stillrootImportPlan ?? {});
  const idMap = new Map(), pageMap = new Map();
  const occupied = new Set(entries(game.journal).map(d=>d.id));
  const reserved = new Set([...occupied, ...sourceIds, ...Object.values(priorPlan)]);
  const allocated = new Set();
  const newId = () => {
    let id;
    do { id = foundry.utils.randomID(16); } while (reserved.has(id));
    reserved.add(id); return id;
  };
  const planned = {...priorPlan};
  const fallbackPages = [];
  for (const record of bundle.journals) {
    const doc = byKey.get(record.key);
    let id;
    if (doc) id = doc.id;
    else if (priorPlan[record.key]) {
      id = priorPlan[record.key];
      if (occupied.has(id)) throw new Error('A saved partial-import ID is now occupied by another journal. Resolve that collision before retrying: '+id);
      reserved.add(id);
    } else {
      id = record.data._id;
      if (occupied.has(id) || allocated.has(id)) id = newId(); else reserved.add(id);
    }
    if (allocated.has(id)) throw new Error('Two journals were allocated the same ID. No documents changed.');
    allocated.add(id);
    idMap.set(record.data._id,id);
    planned[record.key]=id;
    const livePages = doc ? entries(doc.pages) : [];
    for (const sourcePage of record.data.pages) {
      let actual = sourcePage._id;
      if (doc) {
        const key=sourcePage.flags.world.stillrootPageKey;
        const live=livePages.find(p=>flag(p).stillrootPageKey===key) ?? livePages.find(p=>p.id===sourcePage._id);
        actual=live?.id ?? null;
        if (!actual) fallbackPages.push(record.key+' / '+sourcePage.name);
      }
      pageMap.set(record.data._id+'.'+sourcePage._id,actual);
    }
  }
  const refPattern = /@UUID\[JournalEntry\.([A-Za-z0-9]{16})(?:\.JournalEntryPage\.([A-Za-z0-9]{16}))?\]/g;
  const rewriteRefs = text => text.replace(refPattern,(match,j,p)=>{
    const id=idMap.get(j);
    if (!id) throw new Error('An internal link points outside the supplied bundle: '+j);
    const page=p ? pageMap.get(j+'.'+p) : null;
    return '@UUID[JournalEntry.'+id+(page ? '.JournalEntryPage.'+page : '')+']';
  });
  // Complete the transformed content and validate links before creating folders.
  const prepared = missing.map(record=>{
    const data=clone(record.data);
    data._id=idMap.get(record.data._id);
    data.folder=null;
    data.ownership={default:0};
    for (const page of data.pages) {
      page.ownership={default:-1};
      page.text.content=rewriteRefs(page.text.content);
      if (page.text.content.includes('__ASSET_ROOT__')) throw new Error('Unresolved artwork path in '+data.name);
    }
    return {record,data};
  });
  let sort=0;
  async function ensureFolder(key,name,parent=null,color='#586052') {
    if(folderByKey.has(key)) {
      const f = folderByKey.get(key);
      if (f.type !== 'JournalEntry') throw new Error('A Stillroot folder has the wrong document type.');
      return f;
    }
    const [created]=await FolderClass.createDocuments([{name,type:'JournalEntry',folder:parent?.id ?? null,sorting:'a',sort:(++sort)*100000,color,
      flags:{world:{stillrootPack:PACK,stillrootFolderKey:key}}}],{render:false});
    folderByKey.set(key,created); return created;
  }
  const gmRoot=await ensureFolder('root:gm',"Stillroot's Song - GM",null,'#5a554b');
  const playerRoot=await ensureFolder('root:player',"Stillroot's Song - Handouts (hidden until shared)",null,'#6d5148');
  // Persist allocated IDs so a partial import can be retried without breaking existing links.
  await gmRoot.update({'flags.world.stillrootImportPlan':planned},{render:false});
  for (const item of prepared) {
    const parent=item.record.audience==='player' ? playerRoot : gmRoot;
    const f=await ensureFolder('group:'+item.record.group,item.record.group,parent);
    item.data.folder=f.id;
  }
  const createdIds=[];
  try {
    for (let i=0;i<prepared.length;i+=8) {
      const batch=prepared.slice(i,i+8).map(x=>x.data);
      const created=await JournalClass.createDocuments(batch,{keepId:true,keepEmbeddedIds:true,render:false});
      createdIds.push(...created.map(d=>d.id));
      if(created.length!==batch.length) throw new Error('A preCreate hook prevented one or more journals from being created.');
      ui.notifications.info(`Stillroot: ${createdIds.length} / ${prepared.length} new journals imported.`);
    }
  } catch (error) {
    console.error("Stillroot import stopped; existing content was not deleted.",error);
    ui.notifications.error('Stillroot import stopped after '+createdIds.length+' confirmed creations. Keep the created content and run the importer again to add missing journals. See the console for details.');
    return {created:createdIds.length, skipped:byKey.size, partial:true, error:String(error)};
  }
  const linkProblems=[];
  const checkPattern=/@UUID\[JournalEntry\.([A-Za-z0-9]{16})(?:\.JournalEntryPage\.([A-Za-z0-9]{16}))?\]/g;
  for(const id of createdIds){
    const doc=game.journal.get(id);
    for(const page of entries(doc.pages)){
      for(const m of page.text.content.matchAll(checkPattern)){
        const target=game.journal.get(m[1]);
        if(!target || (m[2] && !target.pages.get(m[2]))) linkProblems.push(doc.name+' -> '+m[0]);
      }
    }
  }
  if(fallbackPages.length) console.warn('Links to pages you removed were redirected to their parent journals:',fallbackPages);
  if(linkProblems.length){console.error('Stillroot unresolved links:',linkProblems);warn('Import finished, but '+linkProblems.length+' internal links need review in the console.');}
  else ui.notifications.info(`Stillroot ready: ${createdIds.length} created, ${bundle.journals.length-createdIds.length} kept. All newly imported internal links resolved.`);
  game.journal.render?.();
  const startId=idMap.get(bundle.journals.find(r=>r.key==='start').data._id);
  if(options.open!==false) await game.journal.get(startId)?.sheet?.render({force:true});
  return {created:createdIds.length, skipped:bundle.journals.length-createdIds.length, linkProblems, fallbackPages};
}

