"""Verify final production-file geometry equals the reviewed local candidate."""
from pathlib import Path
import FreeCAD as A,Part,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;P=R/'mechanical/assembly_A14_DRAFT'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
d=A.openDocument(str(P/'RFCP_A14_Integrated_DRAFT.FCStd'));S={o.Name:o.Shape for o in d.Objects if hasattr(o,'Shape')}
q=Part.read(str(O/'LowerCenter_PCB_RIM_REVIEW.step'));actual=S['LowerCenter']
delta=actual.cut(q).Volume+q.cut(actual).Volume
bad=[]
for n,s in S.items():
 if n=='LowerCenter' or not s.BoundBox.intersect(actual.BoundBox):continue
 v=actual.common(s).Volume
 if v>1e-4:bad.append(dict(part=n,volume_mm3=v))
out=dict(classification='CALCULATED_FINAL_INTEGRATED_CANDIDATE_IDENTITY_NOT_MANUFACTURING_APPROVAL',
 source_native_sha256=sha(P/'RFCP_A14_Integrated_DRAFT.FCStd'),source_builder_sha256=sha(R/'mechanical/build_assembly_A14.py'),
 actual_stl_sha256=sha(P/'parts/LowerCenter_A14_DRAFT.stl'),actual_step_sha256=sha(P/'parts/LowerCenter_A14_DRAFT.step'),
 candidate_step_sha256=sha(O/'LowerCenter_PCB_RIM_REVIEW.step'),symmetric_difference_volume_mm3=delta,
 valid=actual.isValid(),solids=len(actual.Solids),assembly_collisions=bad)
out['pass_geometry']=delta<1e-4 and actual.isValid() and len(actual.Solids)==1 and not bad
(O/'integrated_rim_verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
