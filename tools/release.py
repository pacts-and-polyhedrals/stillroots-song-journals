"""Package the two release assets Foundry needs: module.json and the module ZIP.

The version comes from module.json. The repository comes from GitHub Actions
(GITHUB_REPOSITORY) or, when run by hand, from the "url" already in module.json.

    python3 tools/release.py            # requires npm run verify:native first
    python3 tools/release.py --local    # skips the native-engine proof

The ZIP has module.json at its root - no wrapper folder.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import zipfile
from set_repo import urls, repository_of
ROOT=pathlib.Path(__file__).resolve().parents[1]
RUNTIME_DIRS=['scripts','styles','assets','packs','data']
RUNTIME_FILES=['README.md','CHANGELOG.md','LICENSE.txt']
DOCS=['INSTALL.md','VALIDATION.md','SOURCES.md','validation.json']

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--local',action='store_true'); args=parser.parse_args()
    manifest=json.loads((ROOT/'module.json').read_text(encoding='utf-8'))
    version=manifest['version']
    requested=os.environ.get('RELEASE_VERSION','').strip().removeprefix('v')
    if not re.fullmatch(r'\d+\.\d+\.\d+',version): raise SystemExit('module.json version must look like 1.2.0')
    if requested and requested!=version:
        raise SystemExit(f'Release {requested} was requested but module.json says {version}. Update the version in module.json and package.json, add a CHANGELOG entry, commit, then release again.')
    tag='v'+version
    repository=os.environ.get('GITHUB_REPOSITORY','').strip() or repository_of(manifest)
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repository): raise SystemExit('GITHUB_REPOSITORY must be owner/repository')
    manifest.update(urls(repository,manifest['id'],version))
    native=ROOT/'.tmp/native-verified.json'
    if not args.local:
        if not native.is_file(): raise SystemExit('Native pack verification has not passed. Run npm run verify:native first.')
        proof=json.loads(native.read_text())
        if proof.get('module')!=manifest['id'] or proof.get('version')!=version:
            raise SystemExit('Native pack proof does not match this source version.')
    dist=ROOT/'dist'
    if dist.exists(): shutil.rmtree(dist)
    dist.mkdir()
    stage=ROOT/'.tmp/release'
    if stage.exists(): shutil.rmtree(stage)
    stage.mkdir(parents=True)
    for directory in RUNTIME_DIRS: shutil.copytree(ROOT/directory,stage/directory)
    for filename in RUNTIME_FILES: shutil.copy(ROOT/filename,stage/filename)
    (stage/'docs').mkdir()
    for filename in DOCS:
        if (ROOT/'docs'/filename).exists(): shutil.copy(ROOT/'docs'/filename,stage/'docs'/filename)
    if not args.local: shutil.copy(native,stage/'docs/native-verification.json')
    for path in stage.rglob('*'):
        if path.is_file() and path.name in ['LOCK','LOG','LOG.old','.DS_Store']: path.unlink()
    text=json.dumps(manifest,indent=2,ensure_ascii=False)+'\n'
    (stage/'module.json').write_text(text,encoding='utf-8')
    (dist/'module.json').write_text(text,encoding='utf-8')
    archive=dist/(manifest['id']+'.zip')
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for file in sorted(stage.rglob('*')):
            if file.is_file(): z.write(file,file.relative_to(stage).as_posix())
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        names=set(z.namelist())
        assert 'module.json' in names, 'module.json must sit at the ZIP root'
        assert not any(n.startswith(manifest['id']+'/') for n in names), 'ZIP must not contain a wrapper folder'
        assert json.loads(z.read('module.json'))==manifest
        for asset in manifest['esmodules']+manifest['styles']: assert asset in names, 'Missing from ZIP: '+asset
        for pack in manifest['packs']: assert pack['path']+'/CURRENT' in names
    assert manifest['download'].endswith(f'/releases/download/{tag}/{archive.name}')
    hashes=[hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.name for f in (dist/'module.json',archive)]
    (dist/'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n')
    changes=[]
    capture=False
    for line in (ROOT/'CHANGELOG.md').read_text(encoding='utf-8').splitlines():
        if line.startswith('## '):
            if capture: break
            capture=line.startswith('## '+version)
            continue
        if capture: changes.append(line)
    notes=f"""# Stillroot's Song {tag}

A Halloween psychological folk-horror one-shot for Foundry VTT 14 and D&D5e 5.3.3:
51 journals, 114 pages, 35 GM dossiers, 16 GM-controlled handouts and two illustrations.

## Install

In Foundry Setup choose **Add-on Modules > Install Module** and paste this manifest URL:

```text
{manifest['manifest']}
```

For a manual install download `{archive.name}` below (not GitHub's automatic
"Source code" archives) and extract it into `Data/modules/{manifest['id']}/`.

## What changed in {version}

{chr(10).join(changes).strip() or 'See CHANGELOG.md.'}

## Good to know

The importer only adds missing journals; existing edits and sharing permissions are kept.
Handouts stay hidden until the GM reveals them. No Actors, Items, Scenes, maps or rule
automation are installed. Back up your world before importing.
"""
    if not args.local: notes+='\nBoth compendiums passed a native LevelDB read-back with the official Foundry CLI during this build.\n'
    (dist/'RELEASE.md').write_text(notes,encoding='utf-8')
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'],'a') as out: out.write('tag='+tag+'\nversion='+version+'\n')
    print('Packaged',archive,'('+str(archive.stat().st_size)+' bytes) for',repository,tag)

if __name__=='__main__': main()
