# In-world quick start and troubleshooting

1. Install the complete module, restart Foundry if copied manually, and enable it.
2. Sign in as GM. Open the module hub in the Journal Directory or Module Settings.
3. Select **Import missing journals**, review the prompt, and confirm.
4. Open **00 - GM Command Centre**. Check the run sheet, canon ledger and evidence web.
5. Run **Check imported links**. Use **Share handouts** to reveal individual handouts as the party finds them.

## Existing standalone journal edition

The importer recognizes `flags.world.stillrootPack` and `stillrootKey` from
the previous edition, so importing again does not create a second set.
Use **Attach missing artwork** to append the two supplied images when upgrading
text-only imports. The old macro is no longer needed for new imports.

## The button does not appear

Use Configure Settings > Module Settings > Stillroot's Song > Open module hub.
Confirm the module is enabled and you are a GM. The hub can also be opened with:

```js
game.modules.get("stillroots-song-journals").api.openHub();
```

## A compendium or database is missing

Reinstall the complete release asset `stillroots-song-journals.zip`.
Do not install only module.json, only the source JSON files, or the old
artwork-only companion. There must be two database directories under `packs`.
For manual installs avoid double nesting the folder or renaming it.

## Duplicate journal identity or partial-import collision

The importer stops rather than guessing. Back up, use the diagnostic report,
and inspect the flagged duplicates in your world. Keep the intended edited
copy and resolve the duplicate manually before retrying. Do not delete the
GM folder's saved import plan during an interrupted import.

## I edited a journal and an update did not replace it

That is intentional. Updates replace module compendium originals, not your
world copies. Consult the refreshed compendium and merge desired changes.

## Handouts are not visible to players

That is intentional. Open the hub and choose **Share handouts**, tick the
handouts the party has found and apply. Foundry's own ownership controls work
too. Do not grant players access to the GM compendium or GM folder's entries.

## Journals look unstyled

The dark dossier and aged-paper handout styling comes from this module's
stylesheet. Imported journals stay readable but plain if the module is
disabled; re-enable it to restore the look.

## Test-world acceptance checklist

- Enable under Foundry 14 and D&D5e 5.3.3; inspect the console for errors.
- Check both compendiums open and their internal page links navigate correctly.
- Import 51 entries / 114 pages and confirm the two separate world folder trees.
- Verify the command centre, an NPC dossier, a long stat page, and both images.
- Sign in as a player: GM dossiers and unrevealed handouts should be invisible.
- Reveal one handout with **Share handouts** and confirm only that handout becomes accessible; hide it again.
- Check a GM dossier renders dark with gold headings and a handout renders as aged paper, in both Foundry colour themes.
- Edit one world journal, repeat import, and confirm the edit stays intact.
- Confirm existing maps, Actors, Items, and character resources are unchanged.
