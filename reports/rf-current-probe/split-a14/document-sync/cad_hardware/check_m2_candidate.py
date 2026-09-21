"""M2 vendor maximum head envelope only; product files are not modified."""
from pathlib import Path
import FreeCAD as A, Part
import json, hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
P=R/'reviews/a14_document_sync_20260921/before_cad/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
V=A.Vector
d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def box(s):
 b=s.BoundBox
 return [b.XMin,b.YMin,b.ZMin,b.XMax,b.YMax,b.ZMax]
def bad(q,obs):
 out=[]
 for n,s in obs.items():
  if q.BoundBox.intersect(s.BoundBox):
   v=q.common(s).Volume
   if v>1e-4:out.append(dict(part=n,volume_mm3=v))
 return out
parts=[]
for s in S['PCBScrews'].Solids:
 b=s.BoundBox; x=(b.XMin+b.XMax)/2; y=(b.YMin+b.YMax)/2
 # Derive the original head seating plane (actual baseline Z6.35) from H1.3.
 headbase=b.ZMax-1.3
 q=s.fuse(Part.makeCylinder(2,1.6,V(x,y,headbase),V(0,0,1))).removeSplitter()
 parts.append(q)
candidate=Part.makeCompound(parts)
obs={n:s for n,s in S.items() if n!='PCBScrews'}
static=bad(candidate,obs)
# Main screw head service is straight toward the exposed front after unthreading.
rows=[]
for z in range(61):
 q=candidate.copy();q.translate(V(0,0,z));rows.append(dict(front_offset_mm=z,collisions=bad(q,obs)))
result=dict(classification='CALCULATED_M2_MAX_HEAD_ENVELOPE_STATIC_AND_DISCRETE_FRONT_PATH',baseline_native_sha256=hashlib.sha256(P.read_bytes()).hexdigest(),original_bounds_mm=box(S['PCBScrews']),candidate_bounds_mm=box(candidate),original_solid_bounds_mm=[box(s) for s in S['PCBScrews'].Solids],seating_planes_mm=[s.BoundBox.ZMax-1.3 for s in S['PCBScrews'].Solids],candidate_head=dict(diameter_mm=4,height_mm=1.6,source='Essentra 50M020040P010 manufacturer catalogue PDF p35'),static=static,front_path=rows,valid=candidate.isValid(),solids=len(candidate.Solids),pass_nominal=not static and all(not r['collisions'] for r in rows) and candidate.isValid(),limits=['Actual thread engagement, driver recess, tool insertion and hand usability not modelled.','Both screws are a compound; both move in the stated +Z path.','No new printed geometry or hole change.'])
(O/'m2_candidate.json').write_text(json.dumps(result,indent=2))
candidate.exportStep(str(O/'M2_Candidate_D4_H1p6.step'))
print(json.dumps({k:v for k,v in result.items() if k not in ['front_path','limits']},indent=2),flush=True)
