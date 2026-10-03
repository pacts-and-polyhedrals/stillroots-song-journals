"""Static validation of the complete module; no licensed Foundry runtime needed."""
from __future__ import annotations
import argparse
import json
import pathlib
import re
from build import flatten
from set_repo import urls, repository_of
from portable_leveldb import crc32c, log_records, read_log, read_database
ROOT=pathlib.Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--source-only',action='store_true'); args=parser.parse_args()
    module=json.loads((ROOT/'module.json').read_text()); mid=module['id']
    assert mid=='stillroots-song-journals'
    assert module['compatibility']['minimum']=='14'
    assert module['compatibility']['maximum']=='14'
    assert module['relationships']['systems'][0]['id']=='dnd5e'
    version=module['version']
    assert re.fullmatch(r'\d+\.\d+\.\d+',version)
    package=json.loads((ROOT/'package.json').read_text())
    assert package['version']==version, 'package.json and module.json versions differ'
    assert ('## '+version) in (ROOT/'CHANGELOG.md').read_text(encoding='utf-8'), 'CHANGELOG.md has no entry for '+version
    # Hosting URLs must agree with each other, the version and the release asset names.
    for key,value in urls(repository_of(module),mid,version).items():
        assert module.get(key)==value, f'module.json {key} should be {value}'
    for font in ['cinzel-latin-wght-normal.woff2','eb-garamond-latin-wght-normal.woff2','eb-garamond-latin-wght-italic.woff2','OFL.txt']:
        assert (ROOT/'assets/fonts'/font).is_file(), 'Missing font file: '+font
    css=(ROOT/'styles/journals.css').read_text()
    for ref in re.findall(r'url\("([^"]+)"\)',css): assert (ROOT/'styles'/ref).resolve().is_file(), 'Missing CSS asset: '+ref
    importer=(ROOT/'scripts/importer.js').read_text()
    assert 'journals: 51, pages: 114, gmJournals: 35, handouts: 16' in importer, 'EXPECTED in importer.js is out of date'
    for asset in module['esmodules']+module['styles']+['README.md','LICENSE.txt','CHANGELOG.md']:
        assert (ROOT/asset).is_file(), 'Missing runtime file: '+asset
    docs={}; folder_ids=set(); pack_docs={}; page_ids=set()
    for pack in module['packs']:
        assert pack['type']=='JournalEntry'
        assert pack['ownership']['PLAYER']=='NONE'
        assert pack['ownership']['TRUSTED']=='NONE'
        data=[json.loads(f.read_text()) for f in sorted((ROOT/'source-packs'/pack['name']).glob('*.json'))]
        pack_docs[pack['name']]=data
        for doc in data:
            assert re.fullmatch('[A-Za-z0-9]{16}',doc['_id'])
            if doc['_key'].startswith('!folders!'):
                assert doc['type']=='JournalEntry'; folder_ids.add(doc['_id']); continue
            assert doc['_id'] not in docs
            docs[doc['_id']]=(pack['name'],doc)
            assert doc['_key']=='!journal!'+doc['_id']
            assert doc['ownership']=={'default':0}
            for page in doc['pages']:
                assert page['_id'] not in page_ids
                page_ids.add(page['_id'])
                assert page['_key']=='!journal.pages!'+doc['_id']+'.'+page['_id']
                assert page['type']=='text' and page['text']['format']==1
                assert page['ownership']=={'default':-1}
                assert '__ASSET_ROOT__' not in page['text']['content']
                assert not re.search(r'\sstyle=',page['text']['content']), 'Inline style in '+doc['name']+'; use styles/journals.css'
                assert doc['flags']['world']['stillrootVersion']==version
                handout='class="sr-journal sr-handout"' in page['text']['content']
                assert handout==(pack['name']=='handouts'), 'Handout styling class mismatch in '+doc['name']
                assert page['text']['content'].count('<section class="sr-journal')==1
                assert not re.search(r'<(?:script|iframe)\b|javascript\s*:',page['text']['content'],re.I)
    assert len(docs)==51 and len(page_ids)==114 and len(folder_ids)==9
    ids=set(); links=0; image_count=0
    pattern=re.compile(r'@UUID\[Compendium\.stillroots-song-journals\.([a-z-]+)\.JournalEntry\.([A-Za-z0-9]{16})(?:\.JournalEntryPage\.([A-Za-z0-9]{16}))?\]')
    for pack,doc in docs.values():
        assert doc['folder'] in folder_ids
        key=doc['flags']['world']['stillrootKey']
        assert key not in ids; ids.add(key)
        for page in doc['pages']:
            text=page['text']['content']
            assert '@UUID[JournalEntry.' not in text, 'Nonportable world link in compendium'
            for ref in re.findall(r'@UUID\[[^\]]+\]',text):
                match=pattern.fullmatch(ref)
                assert match, 'Unrecognized UUID format: '+ref
                target_pack,jid,pid=match.groups()
                assert jid in docs and docs[jid][0]==target_pack
                assert not(pack=='handouts' and target_pack!='handouts'), 'Player-to-GM link'
                assert not pid or any(p['_id']==pid for p in docs[jid][1]['pages'])
                links+=1
            for src in re.findall(r'<img[^>]+src="([^"]+)"',text):
                assert src.startswith('modules/'+mid+'/')
                assert (ROOT/src.removeprefix('modules/'+mid+'/')).is_file()
                image_count+=1
    assert image_count==2
    assert len([1 for p,d in docs.values() if p=='handouts'])==16
    catalog=json.loads((ROOT/'data/catalog.json').read_text())
    assert set(r['key'] for r in catalog['journals'])==ids
    assert catalog['version']==version
    assert crc32c(b'123456789')==0xE3069283
    samples=[b'a'*n for n in (0,1,32760,32761,32762,65522,200000)]
    assert read_log(log_records(samples))==samples
    if not args.source_only:
        for pack in module['packs']:
            assert read_database(ROOT/pack['path'])==flatten(pack_docs[pack['name']])
    report={'module':mid,'version':module['version'],'journals':len(docs),'pages':len(page_ids),'compendiumFolders':len(folder_ids),'gmJournals':35,'handouts':16,'internalLinks':links,'images':image_count,'sourceValidation':'passed','portableLevelDBRoundTrip':'not run' if args.source_only else 'passed','fontFiles':3,'manifestUrl':module['manifest'],'liveFoundryTested':False,'nativeEngineTest':'requires npm run verify:native; enforced in release workflow'}
    out=ROOT/'docs/validation.json'; out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__': main()
