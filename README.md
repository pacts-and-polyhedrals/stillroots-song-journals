# Stillroot's Song

*A refuge. A missing name. A song nobody admits hearing.*

A Halloween psychological folk-horror one-shot by **DM Asmo / Pacts & Polyhedrals**
for **Foundry VTT 14** and **D&D5e 5.3.3**. Four to six level-10 adventurers reach
Stillroot Hollow carrying the body of their verdan bard, Uppa Kase. The village offers
shelter, a priest and a smile. Something beneath it is singing.

**51 linked journals · 114 pages · 35 GM dossiers · 16 player handouts · 2 illustrations · 4-6 hours**

## Install

In Foundry Setup choose **Add-on Modules > Install Module** and paste this into **Manifest URL**:

```text
https://github.com/pacts-and-polyhedrals/stillroots-song-journals/releases/latest/download/module.json
```

Enable **Stillroot's Song - Halloween Horror Journals** in your world. The GM hub opens
once per installed version; it is also on the **Stillroot's Song** button in the Journal
Directory and under **Configure Settings > Module Settings**.

Manual install: download `stillroots-song-journals.zip` from the
[latest release](https://github.com/pacts-and-polyhedrals/stillroots-song-journals/releases/latest)
(not GitHub's automatic "Source code" archive) and extract it so that this file exists:

```text
Data/modules/stillroots-song-journals/module.json
```

## Running it

1. **Import missing journals** creates editable world copies with every internal link remapped.
2. **Open GM index** starts you at *00 - GM Command Centre*: run sheets, the truth, the evidence web.
3. **Share handouts** reveals letters, ledgers and riddles to the players as they are found.
4. **Check imported links** reports broken links and which journals players can currently see.

You can also read everything straight from the two compendiums without importing.

## What is in the module

| | |
|---|---|
| **GM dossiers** | Acts and locations, six villager dossiers in two forms each, the dream dungeon room by room, the coven, optional scenes, mechanical audit and rulings |
| **Player handouts** | Five pre-game pages and eleven reveal handouts, each a separate journal so one clue can be shared without exposing anything else |
| **GM hub** | Safe importer, handout sharing, link checker, artwork attachment for older imports |
| **Styling** | Dark dossier pages and aged-paper handouts in Cinzel and EB Garamond, scoped to this module's journals only |

**Not included:** Actors, Items, Scenes, RollTables, maps, tokens, Active Effects or rule
automation. Monster statistics and house rules are readable references. Bring your own map.

No third-party module, external account, telemetry or runtime network request is needed.
The only setting is a per-GM flag recording that the welcome hub has been seen.

## Safe by design

- Both compendiums are hidden from players and trusted players.
- Every imported journal starts with default ownership **None**; pages inherit from their journal.
- Import is add-only. It never overwrites your edits or resets sharing, and it can be re-run after an interruption without creating duplicates.
- **Share handouts** only ever changes a handout's default ownership. GM dossiers cannot be shared through it.
- Module updates refresh the compendium originals, not your edited world copies.
- If you deleted a page from an imported journal, links to it fall back to the parent journal instead of recreating the page.

In-game permissions are not encryption: anyone who can download the module files can read
them. See the note for publishers in [PUBLISH_TO_GITHUB.md](PUBLISH_TO_GITHUB.md).

## Compatibility and testing

Foundry VTT generation 14 only. D&D5e 5.3.3 is the target; later versions work because the
module contains plain text journal pages and no system data.

Every release is checked by 31 automated importer tests against a mocked Foundry API, a
full source validation (IDs, 655 internal links, permissions, player-to-GM link leaks,
image and font paths, manifest URLs), and a read-back of both compendiums with the official
Foundry CLI's native LevelDB engine. **It has not been exercised inside a live Foundry
world by an automated test**, so try it in a backed-up test world first and follow the
checklist in [docs/INSTALL.md](docs/INSTALL.md). Scope and limits are in
[docs/VALIDATION.md](docs/VALIDATION.md).

Upgrading from 1.1.0 or the earlier standalone journals? Keep the module ID
`stillroots-song-journals`, update, and your existing imports are recognised. Nothing is
re-imported or overwritten.

## Development

`source-packs/` holds the editable journal JSON and is the single source of truth. Edit
there, then rebuild:

```sh
npm install
npm test                 # importer and hub tests
npm run build            # source JSON -> packs/
npm run validate         # content, links, permissions, manifest
npm run verify:native    # read back with the official Foundry CLI
npm run release          # dist/module.json + dist/stillroots-song-journals.zip
```

To release a new version, change `version` in `module.json` and `package.json`, add a
`CHANGELOG.md` entry, commit, and publish a GitHub release tagged `v<version>`. The
workflow builds and attaches the assets. Moving the repository? Run
`python3 tools/set_repo.py OWNER/REPOSITORY`.

## Rights and attribution

Adventure text and illustrations © DM Asmo / Pacts & Polyhedrals. No redistribution,
resale or open-source licence is granted; see [LICENSE.txt](LICENSE.txt). The false hydra
concept originates with Arnold K.'s *Goblin Punch* blog (2014). Cinzel and EB Garamond are
bundled under the SIL Open Font License 1.1. This is an independent product and is not
affiliated with Foundry Gaming LLC or Wizards of the Coast.

Support the work: [Patreon](https://www.patreon.com/pactsandpolyhedrals) ·
[StartPlaying](https://startplaying.games/gm/dmasmo)
