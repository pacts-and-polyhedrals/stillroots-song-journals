# Publishing Stillroot's Song on GitHub

Everything here is set up for the repository
**`pacts-and-polyhedrals/stillroots-song-journals`**. If the repository will live under a
different account or name, see *Using a different account* at the end before uploading.

## Before you start: public means readable

Foundry's manifest install needs release files that download without a login, so the
repository has to be **public**. A public repository also publishes the full adventure
text and both illustrations: GM-only permissions protect the in-game UI, not the files.
If this adventure is a paid or patron-only product, keep that in mind before publishing.

## 1. Create the repository

On GitHub create a new **public** repository named `stillroots-song-journals` under the
`pacts-and-polyhedrals` account. Do not add a README, licence or .gitignore; the upload
contains them.

## 2. Upload the files

Open the `1-repository-files` folder from the upload bundle. Its **contents** go at the
**repository root** - `module.json` must be at the top level, not inside a folder.

Browser upload: **Add file > Upload files**, drag in everything inside `1-repository-files`,
and commit to `main`. The upload is under GitHub's 100-file limit. The `.github` folder is
hidden on macOS and Linux file browsers; show hidden files (macOS: Cmd+Shift+.) and make
sure it is included, or the release workflow will not exist.

Or with git:

```sh
cd 1-repository-files
git init -b main
git add .
git commit -m "Stillroot's Song 1.2.0"
git remote add origin https://github.com/pacts-and-polyhedrals/stillroots-song-journals.git
git push -u origin main
```

## 3. Create the release

**Releases > Draft a new release**

- Tag: `v1.2.0` (create on publish, target `main`)
- Title: `Stillroot's Song v1.2.0`
- Description: paste the contents of `RELEASE.md` from the folder below
- Attach both files from `2-release-assets/pacts-and-polyhedrals/`:
  - `module.json`
  - `stillroots-song-journals.zip`
- Tick **Set as the latest release**, then **Publish release**

The asset names must stay exactly as they are: `module.json` points at
`.../releases/download/v1.2.0/stillroots-song-journals.zip`.

Publishing also triggers the **Build and publish Foundry module** workflow, which rebuilds
the same two files from the repository, re-verifies them and replaces the attachments.
If Actions is disabled or the run fails, the files you attached by hand remain and the
module is still installable.

## 4. Install and check

```text
https://github.com/pacts-and-polyhedrals/stillroots-song-journals/releases/latest/download/module.json
```

Paste that into Foundry's **Install Module > Manifest URL**, enable the module in a
backed-up test world, and run the checklist at the end of `docs/INSTALL.md`.

## Later releases

1. Edit the journals in `source-packs/` or the code.
2. Raise `version` in `module.json` and `package.json` to the next number in sequence
   (`1.2.1`, `1.3.0`...). In `module.json` also change the version inside `download`.
3. Add a section to `CHANGELOG.md`.
4. Commit, then publish a release tagged `v<version>` and marked latest. The workflow
   attaches `module.json` and the ZIP. (Or run it yourself from **Actions > Build and
   publish Foundry module > Run workflow**.)

`npm run validate` fails if the versions, changelog and URLs disagree, so a mismatched
release cannot be built. Never change the module ID; the manifest URL stays the same for
every version, which is how Foundry finds updates.

## Using a different account

`2-release-assets/macv0223/` holds the same release built for
`macv0223/stillroots-song-journals`. To publish there instead:

1. In the repository files, run `python3 tools/set_repo.py macv0223/stillroots-song-journals`
   (or edit the seven GitHub URLs in `module.json` by hand) and update the two URLs in
   `README.md`.
2. Upload, then attach the two files from `2-release-assets/macv0223/` to the release.

The workflow always uses the repository it runs in, so its builds are correct either way.

## If something goes wrong

| Symptom | Cause |
|---|---|
| Foundry: "manifest could not be found" | Release is a draft or pre-release, not marked latest, or the repository is private |
| Foundry: download fails after the manifest loads | ZIP was renamed, or the tag is not exactly `v1.2.0` |
| Module installs but has no compendiums | GitHub's "Source code (zip)" was installed instead of `stillroots-song-journals.zip` |
| No workflow under Actions | `.github` folder was not uploaded, or files are one folder too deep |
| Workflow fails on "Publish installable assets" | Repository **Settings > Actions > General > Workflow permissions** must allow read and write |
