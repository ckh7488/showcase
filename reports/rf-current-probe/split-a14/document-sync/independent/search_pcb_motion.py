from pathlib import Path
import FreeCAD as A,Part
import json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
obs={n:s for n,s in S.items() if n.startswith(('LowerCenter','LowerArm','LowerJoint')) or n in ['FixedCore','PCBNuts']}
def at(angle,dy,dz):
 for name in ['PCB','SMAEnvelope']:
  q=S[name].copy();q.rotate(V(0,-36,5.55),V(1,0,0),-angle);q.translate(V(0,dy,dz))
  for n,s in obs.items():
   if not q.BoundBox.intersect(s.BoundBox):continue
   c=q.common(s)
   if c.Volume>1e-4:
    solids=[x for x in c.Solids if x.Volume>1e-6];b=Part.makeCompound(solids).BoundBox if solids else c.BoundBox
    return dict(part=name,obstacle=n,volume_mm3=c.Volume,bounds_mm=[b.XMin,b.YMin,b.ZMin,b.XMax,b.YMax,b.ZMax],pose=[angle,dy,dz])
 return None
rows=[]
for angle in [30,35,40,45,50,55]:
 for drop in [1.6,2.4,3.2,4.0]:
  cases=[(angle*i/12,0,0) for i in range(13)]+[(angle,-drop*i/10,0) for i in range(1,11)]+[(angle,-drop,z) for z in range(1,41)]
  bad=None;count=0
  for pose in cases:
   count+=1;bad=at(*pose)
   if bad:break
  rows.append(dict(angle_deg=angle,drop_mm=drop,checked=count,pass_coarse=not bad,first_collision=bad))
  print(angle,drop,'PASS',not bad,flush=True)
(O/'pcb_motion_search.json').write_text(json.dumps(dict(native_sha256=hashlib.sha256(P.read_bytes()).hexdigest(),script_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),cases=rows),indent=2)+'\n')
