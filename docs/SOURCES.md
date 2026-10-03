# Technical sources and provenance

Adventure source: the Stillroot's Song journal edition (1.0.0) by DM Asmo /
Pacts & Polyhedrals, consolidated from the author's development drafts and
homebrew. The module retains its 51 journals, 114 pages, two images and canon
decisions.

False hydra concept: Arnold K., Goblin Punch, 'False Hydra', 4 September 2014.
https://goblinpunch.blogspot.com/2014/09/false-hydra.html

Fonts: Cinzel (The Cinzel Project Authors) and EB Garamond (The EB Garamond
Project Authors), SIL Open Font License 1.1, latin subsets from the Fontsource
packages. Licence text: assets/fonts/OFL.txt.

Technical references checked while preparing this module:

- Foundry module manifests, packs, permissions and hosting URLs:
  https://foundryvtt.com/article/module-development/
- Foundry 14 DialogV2:
  https://foundryvtt.com/api/v14/classes/foundry.applications.api.DialogV2.html
- Foundry 14 Journal Directory:
  https://foundryvtt.com/api/v14/classes/foundry.applications.sidebar.tabs.JournalDirectory.html
- D&D5e 5.3.3 official system manifest (declares Foundry 14 verified):
  https://raw.githubusercontent.com/foundryvtt/dnd5e/release-5.3.3/system.json
- Official Foundry CLI 3.0.4 release, pack structure and compilation:
  https://github.com/foundryvtt/foundryvtt-cli/releases/tag/3.0.4
  https://github.com/foundryvtt/foundryvtt-cli
  https://github.com/foundryvtt/foundryvtt-cli/blob/main/lib/package.mjs
- LevelDB log, write batch and manifest format:
  https://github.com/google/leveldb/blob/main/doc/log_format.md
  https://github.com/google/leveldb/blob/main/db/write_batch.cc
  https://github.com/google/leveldb/blob/main/db/version_edit.cc
- GitHub browser uploads (100-file limit):
  https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
- GitHub workflow triggers:
  https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow

The portable LevelDB writer is an original implementation of the documented
format, not a vendored copy of LevelDB. GitHub publishing uses the official
Foundry CLI to validate and compact the output with the native engine.

No licensed Foundry core code, D&D system installation, Node dependencies,
private credentials, or access tokens are shipped.
