"""Find a motion-only repair for A14 roof catching the old guide PCB path."""
from pathlib import Path
import FreeCAD as A,Part
import hashlib,json
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
obs={n:s for n,s in S.items() if n.startswith(('LowerCenter','LowerArm','LowerJoint')) or n in ['FixedCore','PCBNuts']}
rows=[]
for drop in [1.6,2.4,2.8,3.2,3.6]:
 keys=[(0,(0,0,0),0),(.25,(0,0,0),0),(.5,(0,0,0),-30),(.65,(0,-drop,0),-30),(1,(0,-drop,40),-30)]
 cases=[]
 for i in range(121):
  t=i/120;j=next((j for j in range(1,len(keys)) if keys[j][0]>=t),len(keys)-1);a,b=keys[j-1],keys[j];f=(t-a[0])/(b[0]-a[0]);angle=a[2]+(b[2]-a[2])*f;v=[x+(y-x)*f for x,y in zip(a[1],b[1])]
  for name in ['PCB','SMAEnvelope']:
   q=S[name].copy();q.rotate(V(0,-36,5.55),V(1,0,0),angle);q.translate(V(*v));bad=[]
   for n,s in obs.items():
    if not q.BoundBox.intersect(s.BoundBox):continue
    c=q.common(s)
    if c.Volume>1e-4:
     box=c.BoundBox;bad.append(dict(part=n,volume_mm3=c.Volume,intersection_bounds_mm=[box.XMin,box.YMin,box.ZMin,box.XMax,box.YMax,box.ZMax]))
   cases.append(dict(t=t,part=name,angle_deg=angle,offset_mm=v,collisions=bad))
 rows.append(dict(drop_mm=drop,samples=len(cases),pass_nominal=all(not x['collisions'] for x in cases),failed=[x for x in cases if x['collisions']]))
result=dict(classification='CALCULATED_GUIDE_MOTION_REPAIR_WITHOUT_CAD_CHANGE',sources=sources,candidates=rows,
 limits=['No material removed; only the demonstrated PCB/SMA rigid-body trajectory changes.',
 'Bare lower subassembly; M2 screws/lower keeper absent, core and rear PCB nuts present. Flexible leads remain out of the way.',
 'Finite CAD positions do not establish physical hand usability, tolerance/warp margin or continuous collision proof.'])
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'pcb_adjusted_path.json').write_text(json.dumps(result,indent=2)+'\n')
for r in rows:print('DROP',r['drop_mm'],'PASS',r['pass_nominal'],'FAILS',len(r['failed']),flush=True)
