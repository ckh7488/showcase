"""Publish verified TEST02 preparation evidence, explicitly without results."""
import argparse,hashlib,json,re,shutil
from pathlib import Path
import numpy as np
from read_native_pec import read
p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--out',required=True);a=p.parse_args();root=Path(a.runs);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
rows=[];files=[]
for bond in ['floating','near','both']:
    src=root/f'test02-preflight-{bond}';dst=out/bond;dst.mkdir(exist_ok=True)
    model=json.loads((src/'model.json').read_text());near=json.loads((src/'native-check.json').read_text());far=json.loads((src/'native-far-check.json').read_text())
    points,edges,labels,count=read(src/'native-near-check'/'PEC_dump.vtp')
    def component(point):
        distances=np.linalg.norm(points-np.array(point),axis=1);i=int(distances.argmin());assert distances[i]<.45;return int(labels[i])
    entries=[component(w['cablePoints'][0]) for w in model['wires']]
    assert entries==near['terminalComponents'];assert far['allWiresConnectToCable']
    assert near['shieldConnectedToPlate']==(bond!='floating');assert far['localShieldBondConnected']==(bond=='both')
    for name in ['input.json','model.json','mesh.json','geometry.xml','native-check.json','native-far-check.json','native-near-check/PEC_dump.vtp','native-near-check/cropped-geometry.xml','native-far-check/PEC_dump.vtp','native-far-check/cropped-geometry.xml']:
        target=dst/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src/name,target);files.append(target)
    for side,suffix in [('near',''),('far','-far')]:
        content=(root/'logs'/f'test02-preflight-{bond}{suffix}.log').read_text(encoding='utf-8')
        assert not re.search(r'(?<![A-Za-z0-9_])[A-Za-z]:[\\/]|/Users/|/home/',content)
        target=dst/f'{side}-setup.log';target.write_text(content);files.append(target)
    rows.append({'bond':bond,'fieldSolution':False,'allEightWiresConnectAtBothEnds':True,'localShieldBondNear':near['shieldConnectedToPlate'],'localShieldBondFar':far['localShieldBondConnected'],'sourcePorts':model['sourcePorts'],'shieldBonds':model['shieldBonds'],'input':f'{bond}/input.json','model':f'{bond}/model.json','nativeNear':f'{bond}/native-check.json','nativeFar':f'{bond}/native-far-check.json'})
for name in ['prepare_common_mode.py','check_common_far.py','read_native_pec.py','publish_common_preflight.py']:
    target=out/name;shutil.copy2(Path(__file__).parent/name,target);files.append(target)
manifest={'revision':'common-preflight-07','fieldSolutionsComplete':False,'purpose':'Prepared common-mode/shield comparison and native conductor checks only. No new coupling numbers or shield winner.','cases':rows,'files':[{'path':p.relative_to(out).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps({'cases':len(rows),'files':len(files),'fieldSolutionsComplete':False}))
