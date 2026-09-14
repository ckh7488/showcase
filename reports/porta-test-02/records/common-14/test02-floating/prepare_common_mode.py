"""Prepare TEST 02 from a connected TEST 01 coupon; no field solve by default.

Two equal-phase 50-ohm ports drive the power buses relative to the finite
reference plate. Existing 100-ohm differential loads remain. Shield bonds
are explicit finite PEC straps; they are assumed test fixtures, not lab facts.
"""
import argparse, hashlib, json, os, shutil
from pathlib import Path
import xml.etree.ElementTree as ET

p=argparse.ArgumentParser()
p.add_argument('--base',required=True);p.add_argument('--out',required=True)
p.add_argument('--install',required=True)
p.add_argument('--bond',choices=['floating','near','both'],required=True)
p.add_argument('--native-near-check',action='store_true')
a=p.parse_args();base=Path(a.base).resolve();out=Path(a.out).resolve()
out.mkdir(parents=True,exist_ok=False)
os.environ['OPENEMS_INSTALL_PATH']=a.install
import numpy as np
from CSXCAD import ContinuousStructure
from openEMS import openEMS
from read_native_pec import read as read_pec

model=json.loads((base/'model.json').read_text());meta=model['input']
assert meta['wiring']=='same', 'TEST 02 holds current power assignment fixed.'
audit=json.loads((base/'pec-connection-audit.json').read_text())
assert all(c[0] is not None and c[0]==c[1] for c in audit['terminalComponentsWithCaps'])
root=ET.parse(base/'geometry.xml');props=root.getroot().find('Properties')
excitations=props.findall('Excitation');assert len(excitations)==1
assert excitations[0].attrib['Name']=='port_excite_3'
props.remove(excitations[0]);root.write(out/'base-without-DM-source.xml',encoding='utf-8',xml_declaration=True)
c=ContinuousStructure();assert not c.ReadFromXML(str(out/'base-without-DM-source.xml'))
f=openEMS(NrTS=160000,EndCriteria=1e-5);f.SetCSX(c)
f.SetGaussExcite(0,500e6);f.SetMaxTime(12.5e-9);f.SetBoundaryCond(['PML_8']*6)
H,half=meta['height_mm'],meta['length_mm']/2;xf=-half-20
sources=[]
for nr,y,group in [(7,-2.4,'plus'),(8,2.4,'zero')]:
    start=[xf-.4,y,0];stop=[xf+.4,y,H+4]
    f.AddLumpedPort(nr,50,start,stop,'z',excite=1,priority=15)
    sources.append({'number':nr,'group':group,'start':start,'stop':stop,'R_ohm':50,'phase_deg':0,'return':'finite_reference_plate'})
bonds=[]
for side in ([-1,1] if a.bond=='both' else [-1] if a.bond=='near' else []):
    x=side*(half-.4)
    start=[x-.2,-1,0];stop=[x+.2,1,H-meta['shield']['radius_mm']+.2]
    c.AddMetal('assumed_shield_strap_'+str(side)).AddBox(start,stop,priority=22)
    # Current around the strap at midheight; fixed +z normal for both ends.
    probe=c.AddProbe('shield_current_'+str(side),p_type=1,weight=1,norm_dir=2)
    probe.AddBox([x-.8,-1.6,H/2],[x+.8,1.6,H/2])
    bonds.append({'end':'near' if side<0 else 'far','start':start,'stop':stop,'material':'PEC','currentProbe':'shield_current_'+str(side),'normal':'+z'})
meta={**meta,'test':'02','solverRun':False,'excitationMode':'common-mode','shieldBondCase':a.bond,
      'baseGeometry_sha256':hashlib.sha256((base/'geometry.xml').read_bytes()).hexdigest(),
      'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
      'shield':{**meta['shield'],'endBonds':[a.bond!='floating',a.bond=='both']},
      'sourcePorts':sources,'shieldBonds':bonds,
      'observation':'Actual VinCM=(V7+V8)/2; report residual input DM=(V7-V8), Ethernet DM/CM at both ends, source and bond currents.',
      'termination':'Original 100-ohm differential loads on both Ethernet pairs and power buses at both ends. Near power CM: two 50-ohm source resistances to plate; no added far-end power CM load.',
      'assumptions':meta['assumptions']+['Finite shield straps are assumed test fixtures, not measured shield/PE connections.','Equal source waveforms do not guarantee identical loaded power-bus voltages; record residual differential input.']}
for port in model['ports']:port['excite']=False
model.update(input=meta,sourcePorts=sources,shieldBonds=bonds)
(out/'input.json').write_text(json.dumps(meta,indent=2))
(out/'model.json').write_text(json.dumps(model))
(out/'mesh.json').write_text(json.dumps({k:c.GetGrid().GetLines(k).tolist() for k in 'xyz'}))
c.Write2XML(str(out/'geometry.xml'))
for fn in ['prepare_common_mode.py','read_native_pec.py']:shutil.copy2(Path(__file__).parent/fn,out/fn)
print(json.dumps({'test':'02','bond':a.bond,'fieldSolution':False,'sources':sources,'bonds':bonds}),flush=True)
if a.native_near_check:
    debug=out/'native-near-check';debug.mkdir()
    grid=c.GetGrid()
    # Keep the plate inside the crop. A PMC face placed directly on z=0
    # overrides its tangential PEC edges and would invalidate this check.
    for k,(lo,hi) in enumerate([(-half-21,-half+2),(-7.2,7.2),(-8,H+8)]):
        lines=grid.GetLines(k);lines=lines[(lines>=lo)&(lines<=hi)];grid.ClearLines(k);grid.AddLine(k,lines)
    f.SetBoundaryCond(['PMC']*6)
    c.Write2XML(str(debug/'cropped-geometry.xml'))
    f.Run(str(debug),cleanup=False,numThreads=2,setup_only=True,debug_pec=True,verbose=1)
    points,edges,labels,count=read_pec(debug/'PEC_dump.vtp')
    def component(point):
        distances=np.linalg.norm(points-np.array(point),axis=1);i=int(distances.argmin())
        assert distances[i]<.45,(point,distances[i])
        return int(labels[i])
    terminal=[component(w['terminals'][0]) for w in model['wires']]
    plate=component([-half,0,0]);shield=component([-half+1.2,0,H-2.6])
    check={'source':'Native cropped openEMS PEC edges; setup only, no field response.','componentCount':int(count),'terminalComponents':terminal,'plateComponent':plate,'shieldComponent':shield,
           'shieldConnectedToPlate':shield==plate,'powerBusGroupsDistinct':terminal[4]==terminal[5] and terminal[6]==terminal[7] and terminal[4]!=terminal[6],
           'noWireShortToShieldOrPlate':all(v not in [plate,shield] for v in terminal)}
    assert check['shieldConnectedToPlate']==(a.bond!='floating'),check
    assert check['powerBusGroupsDistinct'] and check['noWireShortToShieldOrPlate'],check
    (out/'native-check.json').write_text(json.dumps(check,indent=2));print('NATIVE_CHECK',json.dumps(check),flush=True)
