"""Build initial Foundry compendium databases from editable source documents."""
from __future__ import annotations
import copy
import json
import pathlib
import shutil
from portable_leveldb import write_database, read_database
ROOT=pathlib.Path(__file__).resolve().parents[1]

def flatten(docs: list[dict]) -> dict[str,dict]:
    records={}
    for source in docs:
        data=copy.deepcopy(source)
        key=data.pop('_key')
        assert key not in records
        if key.startswith('!journal!'):
            page_ids=[]
            for page in data.get('pages',[]):
                pkey=page.pop('_key')
                assert pkey not in records
                records[pkey]=page
                page_ids.append(page['_id'])
            data['pages']=page_ids
            assert data.get('categories',[]) == [], 'Add category support before building nonempty categories'
        records[key]=data
    return records

def main():
    manifest=json.loads((ROOT/'module.json').read_text())
    for pack in manifest['packs']:
        src=ROOT/'source-packs'/pack['name']
        docs=[json.loads(p.read_text()) for p in sorted(src.glob('*.json'))]
        records=flatten(docs)
        dest=ROOT/pack['path']
        assert dest.is_relative_to(ROOT/'packs')
        if dest.exists(): shutil.rmtree(dest)
        write_database(dest,records)
        assert read_database(dest)==records
        print(f"Built {pack['name']}: {len(docs)} source documents, {len(records)} database records; WAL round-trip passed")

if __name__=='__main__': main()
