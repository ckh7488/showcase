"""Native far-end connection check for prepared TEST 02 fixtures; no fields."""
import argparse,json,os
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--prepared',required=True);p.add_argument('--install',required=True);a=p.parse_args()
base=Path(a.prepared).resolve();out=base/'native-far-check';out.mkdir(exist_ok=False)
os.environ['OPENEMS_INSTALL_PATH']=a.install
import numpy as np
from CSXCAD import ContinuousStructure
from openEMS import openEMS
from read_native_pec import read
model=json.loads((base/'model.json').read_text());meta=model['input'];half=meta['length_mm']/2;H=meta['height_mm']
c=ContinuousStructure();assert not c.ReadFromXML(str(base/'geometry.xml'));g=c.GetGrid()
for k,(lo,hi) in enumerate([(half-2,half+21),(-7.2,7.2),(-8,H+8)]):
    lines=g.GetLines(k);lines=lines[(lines>=lo)&(lines<=hi)];g.ClearLines(k);g.AddLine(k,lines)
f=openEMS(NrTS=1,EndCriteria=1e-5);f.SetCSX(c);f.SetGaussExcite(0,500e6);f.SetBoundaryCond(['PMC']*6)
c.Write2XML(str(out/'cropped-geometry.xml'));f.Run(str(out),cleanup=False,numThreads=2,setup_only=True,debug_pec=True,verbose=1)
points,edges,labels,count=read(out/'PEC_dump.vtp')
def component(point):
    dist=np.linalg.norm(points-np.array(point),axis=1);i=int(dist.argmin());assert dist[i]<.45,(point,dist[i]);return int(labels[i])
terminal=[component(w['terminals'][1]) for w in model['wires']]
entry=[component(w['cablePoints'][-1]) for w in model['wires']]
plate=component([half,0,0]);shield=component([half-1.2,0,H-2.6])
result={'fieldSolution':False,'scope':'Cropped far end only. Checks the local strap, not global shield-to-plate connectivity via a remote bond. Zero source excitations are expected in this source-free crop.','componentCount':int(count),'terminalComponents':terminal,'cableEntryComponents':entry,'allWiresConnectToCable':terminal==entry,'plateComponent':plate,'shieldComponent':shield,'localShieldBondConnected':plate==shield,'powerBusGroupsDistinct':terminal[4]==terminal[5] and terminal[6]==terminal[7] and terminal[4]!=terminal[6],'noWireShortToShieldOrPlate':all(v not in [plate,shield] for v in terminal)}
assert result['allWiresConnectToCable'] and result['powerBusGroupsDistinct'] and result['noWireShortToShieldOrPlate'],result
assert result['localShieldBondConnected']==(meta['shieldBondCase']=='both'),result
(base/'native-far-check.json').write_text(json.dumps(result,indent=2));print('NATIVE_FAR_CHECK',json.dumps(result),flush=True)
