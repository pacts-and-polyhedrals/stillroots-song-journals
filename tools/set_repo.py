"""Point module.json at a different GitHub repository.

    python3 tools/set_repo.py OWNER/REPOSITORY

Rewrites url, manifest, download, bugs, changelog, readme and license so they
match the given repository and the version already in module.json.
"""
from __future__ import annotations
import json
import pathlib
import re
import sys
ROOT=pathlib.Path(__file__).resolve().parents[1]

def urls(repository: str, module_id: str, version: str) -> dict[str,str]:
    base='https://github.com/'+repository
    return {
        'url':base,
        'manifest':base+'/releases/latest/download/module.json',
        'download':f'{base}/releases/download/v{version}/{module_id}.zip',
        'bugs':base+'/issues',
        'changelog':base+'/blob/main/CHANGELOG.md',
        'readme':base+'/blob/main/README.md',
        'license':base+'/blob/main/LICENSE.txt',
    }

def repository_of(manifest: dict) -> str:
    match=re.fullmatch(r'https://github\.com/([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)',manifest.get('url',''))
    if not match: raise SystemExit('module.json "url" must be https://github.com/OWNER/REPOSITORY')
    return match.group(1)

def main():
    if len(sys.argv)!=2 or not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',sys.argv[1]):
        raise SystemExit('Usage: python3 tools/set_repo.py OWNER/REPOSITORY')
    path=ROOT/'module.json'
    manifest=json.loads(path.read_text(encoding='utf-8'))
    manifest.update(urls(sys.argv[1],manifest['id'],manifest['version']))
    path.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('module.json now points at',manifest['url'])
    print('Manifest URL:',manifest['manifest'])

if __name__=='__main__': main()
