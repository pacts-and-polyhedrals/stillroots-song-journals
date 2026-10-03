import {MODULE_ID, EXPECTED, TARGET_SYSTEM, moduleVersion, documents, worldFlags, escapeHTML, ownedJournals, requireGM, importJournals, loadBundle} from "./importer.js";

async function safely(task) {
  try { return await task(); }
  catch (error) {
    console.error(`${MODULE_ID} |`, error);
    ui.notifications.error(`Stillroot: ${error.message}`);
    return null;
  }
}

export async function openIndex() {
  requireGM();
  const matches = ownedJournals().filter(d => worldFlags(d).stillrootKey === "start");
  if (matches.length > 1) throw new Error("More than one GM index was found. Use Check imported links to identify duplicates.");
  const entry = matches[0] ?? await game.packs.get(`${MODULE_ID}.gm-journals`)?.getDocument("51568cbd1c2f53df");
  if (!entry) throw new Error("The GM index is missing. Reinstall the complete release.");
  await entry.sheet.render({force:true});
  return entry;
}

export async function openPack(name) {
  requireGM();
  if (!["gm-journals","handouts"].includes(name)) throw new Error("Unknown Stillroot compendium.");
  const pack = game.packs.get(`${MODULE_ID}.${name}`);
  if (!pack) throw new Error("Compendium not found. Reinstall the complete release.");
  pack.render(true);
}

/** Explicit opt-in migration for journals imported without the previous companion. */
export async function attachArtwork({confirm=true}={}) {
  requireGM();
  const bundle = await loadBundle();
  const byKey = new Map();
  for (const doc of ownedJournals()) {
    const key = worldFlags(doc).stillrootKey;
    if (byKey.has(key)) throw new Error("Duplicate journal key: " + key);
    byKey.set(key, doc);
  }
  const changes = [];
  for (const record of bundle.journals) {
    const live = byKey.get(record.key);
    if (!live) continue;
    for (const sourcePage of record.data.pages) {
      const figures = [...sourcePage.text.content.matchAll(/<figure\b[^>]*class="sr-art"[^>]*>[\s\S]*?<\/figure>/g)].map(m=>m[0]);
      if (!figures.length) continue;
      const page = documents(live.pages).find(p=>worldFlags(p).stillrootPageKey === worldFlags(sourcePage).stillrootPageKey);
      if (!page) continue; // A deliberately removed page is not recreated.
      const content = page.text?.content ?? "";
      const additions = figures.filter(f => {
        const src = f.match(/src="([^"]+)"/)?.[1];
        return src && !content.includes(src);
      });
      if (additions.length) changes.push({page, content:content+"\n"+additions.join("\n")});
    }
  }
  if (!changes.length) {
    ui.notifications.info("The supplied artwork is already attached, or its target journals have not been imported.");
    return {updated:0};
  }
  if (confirm && !await foundry.applications.api.DialogV2.confirm({window:{title:"Attach existing Stillroot artwork"}, content:`<p>Append the missing supplied image to ${changes.length} existing journal page(s)?</p><p>No prose, permissions, or other images will be replaced. The two images are the forest arrival and the Bone Ring scene.</p>`,rejectClose:false,modal:true})) return {cancelled:true};
  for (const {page, content} of changes) await page.update({"text.content":content},{render:false});
  ui.notifications.info(`Stillroot: artwork attached to ${changes.length} page(s).`);
  return {updated:changes.length};
}

export async function checkLinks({show=true}={}) {
  requireGM();
  const docs = ownedJournals();
  const byKey = new Map(), problems = [], shared = [];
  let pages=0, checked=0;
  for (const doc of docs) {
    const key = worldFlags(doc).stillrootKey;
    if (byKey.has(key)) problems.push(`Duplicate journal key ${key}: ${byKey.get(key).name} / ${doc.name}`);
    byKey.set(key,doc);
    if (Object.entries(doc.ownership ?? {}).some(([id,v])=> Number(v)>0 && (id==="default" || !game.users?.get?.(id)?.isGM))) shared.push(doc.name);
    for (const page of documents(doc.pages)) {
      pages++;
      for (const m of (page.text?.content ?? "").matchAll(/@UUID\[([^\]]+)\]/g)) {
        if (!m[1].startsWith("JournalEntry.") && !m[1].startsWith(`Compendium.${MODULE_ID}.`)) continue;
        checked++;
        try { if (!await fromUuid(m[1])) problems.push(`${doc.name} / ${page.name}: ${m[1]}`); }
        catch { problems.push(`${doc.name} / ${page.name}: ${m[1]}`); }
      }
    }
  }
  const report={journals:docs.length,pages,checked,problems,shared};
  if (show) {
    const details = problems.length ? `<details><summary>${problems.length} issue(s)</summary><ul>${problems.map(p=>`<li>${escapeHTML(p)}</li>`).join("")}</ul></details>` : "<p>No broken Stillroot links were found in the imported journals.</p>";
    const sharing = shared.length ? `<details><summary>${shared.length} journal(s) have player permissions</summary><p>These may have been deliberately shared. This check changes nothing.</p><ul>${shared.map(p=>`<li>${escapeHTML(p)}</li>`).join("")}</ul></details>` : "<p>No imported journal has explicit player-level access.</p>";
    await foundry.applications.api.DialogV2.prompt({window:{title:"Stillroot import report"},content:`<p><strong>${docs.length} journals / ${pages} pages / ${checked} checked links.</strong></p>${details}${sharing}<p>Expected complete set: ${EXPECTED.journals} journals and ${EXPECTED.pages} pages. Missing or edited pages are not repaired automatically.</p>`,ok:{label:"Close"},rejectClose:false});
  }
  return report;
}

const observerLevel = () => globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
const importedHandouts = () => ownedJournals().filter(d => worldFlags(d).stillrootAudience === "player");

/** Sharing state of every imported handout. Reads only; changes nothing. */
export function handoutStatus() {
  requireGM();
  const level = observerLevel();
  return importedHandouts()
    .map(doc => {
      const ownership = doc.ownership ?? {};
      const selected = Object.entries(ownership).filter(([id, v]) => id !== "default" && Number(v) >= level && !game.users?.get?.(id)?.isGM).length;
      return {key: worldFlags(doc).stillrootKey, id: doc.id, name: doc.name, shared: Number(ownership.default ?? 0) >= level, selected};
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
}

/**
 * Reveal or hide handouts for all players. `changes` maps a handout key to true (reveal) or false (hide).
 * Only each journal's default ownership is written; prose and per-player permissions are untouched.
 */
export async function setHandoutSharing(changes = {}, {show = false} = {}) {
  requireGM();
  const level = observerLevel();
  const byKey = new Map(importedHandouts().map(doc => [worldFlags(doc).stillrootKey, doc]));
  const revealed = [], hidden = [];
  for (const [key, wanted] of Object.entries(changes)) {
    const doc = byKey.get(key);
    if (!doc) continue; // GM dossiers and unknown keys can never be shared through this tool.
    const isShared = Number(doc.ownership?.default ?? 0) >= level;
    if (Boolean(wanted) === isShared) continue;
    await doc.update({"ownership.default": wanted ? level : 0});
    (wanted ? revealed : hidden).push(doc.name);
    if (wanted && show) {
      try { await game.journal?.constructor?.show?.(doc, {force: true}); }
      catch (error) { console.warn(`${MODULE_ID} | The handout was shared, but could not be opened for players.`, error); }
    }
  }
  if (revealed.length || hidden.length) ui.notifications.info(`Stillroot: ${revealed.length} handout(s) revealed, ${hidden.length} hidden.`);
  return {revealed, hidden};
}

/** Checklist dialog for revealing handouts as the party finds them. */
export async function manageHandouts() {
  const list = handoutStatus();
  if (!list.length) {
    ui.notifications.info("No Stillroot handouts are in this world yet. Use Import missing journals first.");
    return {revealed: [], hidden: []};
  }
  const rows = list.map(h => `<label class="sr-share-row"><input type="checkbox" name="handout" value="${escapeHTML(h.key)}"${h.shared ? " checked" : ""}><span>${escapeHTML(h.name)}</span>${h.selected && !h.shared ? `<em>${h.selected} selected player(s)</em>` : ""}</label>`).join("");
  const content = `<p class="sr-share-intro">Tick a handout to let every player read it; untick to hide it again. GM dossiers are never listed here.</p>
    <div class="sr-share-list">${rows}</div>
    <label class="sr-share-option"><input type="checkbox" name="show" checked><span>Open newly revealed handouts on players' screens</span></label>`;
  const result = await foundry.applications.api.DialogV2.wait({
    window: {title: "Stillroot's Song - Share handouts"}, classes: ["sr-module-hub", "sr-share"], position: {width: 480}, content, rejectClose: false,
    buttons: [
      {action: "apply", icon: "fa-solid fa-eye", label: "Apply sharing", default: true, callback: (_event, button) => ({
        changes: Object.fromEntries(Array.from(button.form.querySelectorAll('input[name="handout"]'), i => [i.value, i.checked])),
        show: Boolean(button.form.querySelector('input[name="show"]')?.checked)
      })},
      {action: "cancel", icon: "fa-solid fa-xmark", label: "Cancel"}
    ]
  });
  if (!result?.changes) return {cancelled: true};
  return setHandoutSharing(result.changes, {show: result.show});
}

function hubContent() {
  const installed=ownedJournals().length;
  const shared=importedHandouts().filter(d => Number(d.ownership?.default ?? 0) >= observerLevel()).length;
  return `<div class="sr-hub">
    <header class="sr-hub-hero">
      <p class="sr-hub-kicker">Pacts &amp; Polyhedrals / DM Asmo</p>
      <h1>Stillroot's Song</h1>
      <p class="sr-hub-tagline">A refuge. A missing name.<br>A song nobody admits hearing.</p>
    </header>
    <div class="sr-hub-stats"><span><strong>${EXPECTED.journals}</strong> journals</span><span><strong>${EXPECTED.pages}</strong> pages</span><span><strong>${EXPECTED.handouts}</strong> handouts</span></div>
    <section class="sr-hub-body">
      <p class="sr-hub-status"><strong>${installed}</strong> of ${EXPECTED.journals} journals imported into this world &middot; <strong>${shared}</strong> handout(s) revealed to players.</p>
      <h2>Open the book. Keep the secrets.</h2>
      <p>Browse the compendiums, or import editable world copies with all internal links remapped. The GM Command Centre is your starting point.</p>
      <div class="sr-hub-note"><strong>Safe by default.</strong> Import adds missing journals only. Existing edits and sharing permissions stay untouched. New handouts remain hidden until you reveal them with <em>Share handouts</em>.</div>
      <p class="sr-hub-small">Level 10 / 4-6 players / 4-6 hours<br>Foundry VTT 14 &middot; D&amp;D5e ${TARGET_SYSTEM}+ &middot; v${escapeHTML(moduleVersion())}. Journal content only: no Actors, maps, or house-rule automation.</p>
    </section>
  </div>`;
}

export class StillrootHub extends foundry.applications.api.DialogV2 {
  constructor(options={}) {
    super({
      id:"stillroot-module-hub",
      window:{title:"Stillroot's Song - Module Hub",resizable:true},
      position:{width:640},
      classes:["sr-module-hub"],
      content:hubContent(),
      buttons:[
        {action:"import",icon:"fa-solid fa-file-import",label:"Import missing journals",default:true,callback:()=>safely(()=>importJournals())},
        {action:"index",icon:"fa-solid fa-book-open",label:"Open GM index",callback:()=>safely(openIndex)},
        {action:"share",icon:"fa-solid fa-eye",label:"Share handouts",callback:()=>safely(manageHandouts)},
        {action:"library",icon:"fa-solid fa-book-skull",label:"GM compendium",callback:()=>safely(()=>openPack("gm-journals"))},
        {action:"handouts",icon:"fa-solid fa-scroll",label:"Handout compendium",callback:()=>safely(()=>openPack("handouts"))},
        {action:"art",icon:"fa-solid fa-image",label:"Attach missing artwork",callback:()=>safely(()=>attachArtwork())},
        {action:"check",icon:"fa-solid fa-link",label:"Check imported links",callback:()=>safely(()=>checkLinks())}
      ],...options
    });
  }
}

export function openHub() {
  requireGM();
  return new StillrootHub().render({force:true});
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID,"seenVersion",{scope:"client",config:false,type:String,default:""});
  game.settings.registerMenu(MODULE_ID,"hub",{name:"Stillroot's Song",label:"Open module hub",hint:"Browse, safely import, or check the adventure journals.",icon:"fa-solid fa-book-skull",type:StillrootHub,restricted:true});
  const mod=game.modules.get(MODULE_ID);
  if (mod) mod.api={openHub,openIndex,importJournals,attachArtwork,checkLinks,handoutStatus,setHandoutSharing,manageHandouts};
});

Hooks.on("renderJournalDirectory", (_app, element) => {
  if (!game.user?.isGM) return;
  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!root || root.querySelector(".sr-module-open")) return;
  const button=document.createElement("button");
  button.type="button"; button.className="sr-module-open";
  button.innerHTML='<i class="fa-solid fa-book-skull" aria-hidden="true"></i> Stillroot\'s Song';
  button.title="Open the Stillroot journal module hub";
  button.addEventListener("click",()=>safely(openHub));
  const header=root.querySelector(".directory-header");
  if (header) header.append(button); else root.prepend(button);
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM || Number(game.release?.generation)!==14) return;
  const version=moduleVersion();
  if (game.settings.get(MODULE_ID,"seenVersion")===version) return;
  const opened=await safely(openHub);
  if (opened) await game.settings.set(MODULE_ID,"seenVersion",version);
});
