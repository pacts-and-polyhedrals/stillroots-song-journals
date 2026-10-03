# Changelog

## 1.2.0 - Pacts & Polyhedrals edition

- **New look.** GM dossiers now render as dark gold-and-crimson pages in Cinzel and EB Garamond; player handouts render as aged-paper documents. Both fonts are bundled (SIL Open Font License), so nothing is downloaded at runtime.
- **Share handouts.** A new hub tool lists the 16 handouts with a tick box each, reveals or hides them for all players in one step, and can open newly revealed handouts on players' screens. Only a journal's default ownership is changed.
- **Lighter journals.** Presentation moved out of the journal HTML into the module stylesheet: the journal data is about 35% smaller and easier to edit in Foundry. Journals imported from 1.1.0 keep working and pick up the new look automatically.
- **Wording pass.** Production notes that referred to the drafting process now read as author's design notes. No plot, canon decision, stat block or handout text was changed.
- **Release fixes.** The module ZIP now has `module.json` at its root (no wrapper folder), `module.json` in the repository carries the manifest and download URLs, and the release version is always read from `module.json` so the tag, ZIP name and download URL cannot drift apart.
- The hub shows how many journals are imported and how many handouts are revealed. Later D&D5e patch releases no longer raise a version notice on import.
- Removed unused artwork-fallback code and hard-coded version strings from the importer. 31 offline tests (was 25).
- Removed the archived Markdown copy of the 1.0.0 edition from the repository; `source-packs` is the single source of truth.

## 1.1.0 - Installable module edition

- Converts the previous 51-journal / 114-page edition into two native LevelDB compendiums.
- Adds a Foundry 14 GM hub, journal-directory button and settings menu.
- Adds safe, repeatable import with earlier-macro recognition and world-link remapping.
- Includes the existing arrival and Bone Ring art; adds opt-in artwork attachment for old imports.
- Keeps new compendiums and handouts GM-controlled by default.
- Adds an imported-link diagnostic and preserves all existing prose/permissions on repeat import.
- Adds GitHub Actions for tests, native pack verification and releases.
- Supplies source JSON, local database build tools and offline tests.

## 1.0.0 - Standalone journal edition

The earlier macro importer, individual journal JSON, readable HTML/Markdown,
and optional artwork-only companion module.
