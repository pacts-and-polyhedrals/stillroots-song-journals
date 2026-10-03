# Validation scope

## Results for 1.2.0

- 31/31 offline importer and hub tests passed.
- Source validation passed: 51 journals, 114 pages, 16 player handouts, 9 compendium
  folders, 655 internal references resolved, two image paths, three font files.
- Both compendiums were read back and recompiled with the official Foundry CLI
  (native classic-level); every reconstructed document matched its source.
- The release ZIP was checked for a root-level module.json and matching manifest.
- Journal and hub styling were inspected in Chromium fixtures at desktop and narrow
  widths. This was not the Foundry renderer.

## What the automated checks cover

- Importer behaviour through a mocked Foundry document API: fresh and repeated import,
  hidden defaults, preserved edits, legacy imports, ID and page collisions, missing
  pages, cancellation, permission and version guards, interrupted-import recovery,
  blocked creation hooks, duplicate identities, source links and concurrency.
- Handout sharing: handouts start hidden, only handouts can be revealed, hiding touches
  only default ownership, cancelling changes nothing, non-GMs are refused.
- All journal and page identities, compendium references, folder references, the 35/16
  GM-handout split, and absence of player-to-GM links.
- No inline styles, scripts or iframes in journal content; handouts carry the paper class.
- Image, font and runtime file references.
- module.json, package.json, CHANGELOG and catalog versions agree; manifest, download
  and other hosting URLs agree with the repository and version.
- LevelDB log/manifest serialization, CRC32C reference vector, block fragmentation edge
  cases, and JSON read-back with the included decoder.
- ZIP integrity and consistency between the staged and published manifests.

## Gate in GitHub Actions

The release workflow repeats all of the above, including the native read-back, and
refuses to publish if any step fails.

## Not claimed

The module has not been launched in a live Foundry VTT installation by these checks.
The tests use a mock, not Foundry's actual document model or renderer, and the styling
fixtures are not Foundry screenshots. No playtesting or encounter-balance testing is
claimed. Back up the world and complete the checklist in INSTALL.md first.
