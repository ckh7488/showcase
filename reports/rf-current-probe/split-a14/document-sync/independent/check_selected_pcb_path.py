"""Fine checks of the simple45deg/4mm PCB path; diagnose actual added roof contact."""
from pathlib import Path
import FreeCAD as A,Part
import hashlib,json
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
obs={n:s for n,s in S.items() if n.startswith(('LowerCenter','LowerArm','LowerJoint')) or n in ['FixedCore','PCBNuts']}
keys=[[0,[0,0,0],0],[.25,[0,0,0],0],[.5,[0,0,0],-45],[.65,[0,-4,0],-45],[1,[0,-4,40],-45]]
def pose(s,angle,vector):q=s.copy();q.rotate(V(0,-36,5.55),V(1,0,0),angle);q.translate(V(*vector));return q
cases=[]
for i in range(181):
 t=i/180;j=next((j for j in range(1,len(keys)) if keys[j][0]>=t),len(keys)-1);a,b=keys[j-1],keys[j];f=(t-a[0])/(b[0]-a[0]);angle=a[2]+(b[2]-a[2])*f;v=[x+(y-x)*f for x,y in zip(a[1],b[1])]
 for name in ['PCB','SMAEnvelope']:
  q=pose(S[name],angle,v);bad=[]
  for n,s in obs.items():
   if not q.BoundBox.intersect(s.BoundBox):continue
   c=q.common(s)
   if c.Volume>1e-4:bad.append(dict(part=n,volume_mm3=c.Volume))
  cases.append(dict(t=t,part=name,angle_deg=angle,offset_mm=v,collisions=bad))
# A14 roof additions are exactly these two boxes. The exterior bottom/side rim is separate.
roof=Part.makeBox(12.5,3.1,2.4,V(-18.5,-38.1,13.1)).fuse(Part.makeBox(12.5,3.1,2.4,V(6,-38.1,13.1)))
old=pose(S['PCB'],-30,[0,-1.6,8]);roof_v=old.common(roof).Volume
all_v=old.common(S['LowerCenter']).Volume
result=dict(classification='CALCULATED_NOMINAL_PCB_GUIDE_PATH_REPAIR_NO_PRODUCT_GEOMETRY_CHANGE',sources=sources,
 guide_keys=keys,pivot_mm=[0,-36,5.55],cases=cases,
 old_path_diagnosis=dict(pose=dict(angle_deg=-30,translation_mm=[0,-1.6,8]),total_lowercenter_overlap_mm3=all_v,added_roof_overlap_mm3=roof_v,
  note='Old30deg/1.6mm route intersects the added A14 rear-roof reinforcement. More downward movement alone also hits the base;45deg/4mm avoids both.'),
 sequence=['SMA soldered to bare PCB first; lower split joints already fastened.',
 'Lower keeper and PCB screws absent. Lower core is present; flexible winding leads held forward/outside the path and not yet soldered to the PCB.',
 'Insertion is reverse of slider: hold board45deg with lower edge forward, bring it into the front window4mm below seating height, raise4mm while tilted, then rotate upright and fasten M2 screws.',
 'The two rear M2 nuts remain in the nominal test, but supporting them by hand is not simulated.'],
 limits=['No added machining, multi-axis spiral or changed product CAD. One rotation axis plus two straight translations.',
 '181 samples per PCB/SMA body do not prove continuous no-collision, print-tolerance or hand-assembly success.',
 'Nominal angle/drop is a demonstrated route, not a demand that users precisely measure45deg/4mm. First-article trial is still necessary.'])
result['pass_scoped']=all(not x['collisions'] for x in cases)
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'selected_pcb_path.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'SAMPLES',len(cases),'ROOF',roof_v,'TOTAL',all_v,flush=True)
