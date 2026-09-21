"""Adopt the selected longer F01 screw, with a scoped CAD delta verification.

Run under FreeCAD. Preserve all print files and historical audit evidence.
Incoming acceptance limits below are design requirements, NOT vendor tolerances.
"""
from pathlib import Path
import json,hashlib,shutil
import FreeCAD as A
import Part
R=Path(__file__).resolve().parents[2];O=Path(__file__).resolve().parent
C=R/'mechanical/assembly_A14_DRAFT';B=O/'before_m2'
V=A.Vector
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
native=C/'RFCP_A14_Integrated_DRAFT.FCStd';meshfile=C/'mesh.json'
assert sha(native)=='93ba7a61650cfc94c3a9d644f7af4473283908f98d1194f296e7ecd7819f7f92','unexpected baseline; never apply twice'
B.mkdir(parents=True,exist_ok=True)
for p in [native,meshfile,C/'build_report.json',C/'catalogue_delta_verification.json',R/'mechanical/build_assembly_A14.py']:
 shutil.copy2(p,B/p.name)
stl={p.name:sha(p) for p in (C/'parts').glob('*.stl')}
d=A.openDocument(str(native));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
assert len(S)==125
def extended(length):
 out=[]
 for s in S['PCBScrews'].Solids:
  b=s.BoundBox;c=b.Center
  assert abs(b.ZLength-11.6)<1e-6
  out.append(s.fuse(Part.makeCylinder(1,length-10+.05,V(c.x,c.y,b.ZMin-(length-10)))).removeSplitter())
 return Part.makeCompound(out)
q=extended(12);worst=extended(12.3)
assert q.isValid() and len(q.Solids)==2
def hits(q):
 bad=[]
 for n,s in S.items():
  if n=='PCBScrews' or not q.BoundBox.intersect(s.BoundBox):continue
  v=q.common(s).Volume
  if v>1e-5:bad.append(dict(part=n,overlap_mm3=v))
 return bad
trials=[]
for i in range(61):
 w=worst.copy();w.translate(V(0,0,i*1.5))
 trials.append(dict(front_travel_mm=i*1.5,collisions=hits(w)))
assert all(not row['collisions'] for row in trials),trials
d.getObject('PCBScrews').Shape=q;d.recompute()
unchanged={n:dict(symmetric_difference_mm3=s.cut(d.getObject(n).Shape).Volume+d.getObject(n).Shape.cut(s).Volume,solids=len(s.Solids)) for n,s in S.items() if n!='PCBScrews'}
assert all(v['symmetric_difference_mm3']<1e-6 for v in unchanged.values())
d.save()
Part.makeCompound([o.Shape for o in d.Objects if hasattr(o,'Shape')]).exportStep(str(C/'RFCP_A14_Integrated_DRAFT.step'))
m=json.loads(meshfile.read_text());verts,tri=q.tessellate(.2)
m['PCBScrews'].update(vertices=[list(v) for v in verts],triangles=tri,mpn='50M020040P012',shaft_length_mm=12)
meshfile.write_text(json.dumps(m,separators=(',',':')))
builder=R/'mechanical/build_assembly_A14.py';t=builder.read_text()
t=t.replace('50M020040P010','50M020040P012')
t=t.replace('Preserve each M2 shank, head seating plane and both PCB mounting axes.','Extend the original M2x10 shank to12; keep seating plane and mounting axes.')
t=t.replace('s.fuse(cyl(2,1.6,x,y,head_base)).removeSplitter()', 's.fuse(cyl(2,1.6,x,y,head_base)).fuse(cyl(1,2.05,x,y,b.ZMin-2)).removeSplitter()')
t=t.replace('existing M2x10 shank unchanged','M2x12 shank adopted; print geometry unchanged')
t=t.replace("mpn='50M020040P012',head_max", "mpn='50M020040P012',shaft_length_mm=12,head_max")
builder.write_text(t)
report=dict(classification='CALCULATED_SCOPED_HARDWARE_CHANGE_NOT_PHYSICAL_THREAD_TEST',part='F01 Essentra 50M020040P012 PA66 M2x0.4x12',quantity=2,baseline_native_sha256=sha(B/native.name),native_sha256=sha(native),mesh_sha256=sha(meshfile),builder_sha256=sha(builder),unchanged_objects=unchanged,changed_objects=['PCBScrews'],nominal_tip_projection_past_max_nut_mm=2.19,max_length_12_3_front_withdrawal_poses=trials,stl_sha256=stl,all15_stl_byte_identical=stl=={p.name:sha(p) for p in (C/'parts').glob('*.stl')},incoming_acceptance=dict(classification='DESIGN_ACCEPTANCE_REQUIREMENTS_NOT_MANUFACTURER_TOLERANCES',under_head_length_mm=[11.7,12.3],assembled_grip_mm=[7.85,8.85],nut_height_max_mm=1.46,unfinished_tip_length_max_mm=.6,required_projection_mm=.8,worst_case_projection_mm=round(11.7-8.85-1.46,2),residual_full_thread_beyond_nut_mm=round(11.7-8.85-1.46-.6,2),inspection='Measure under-head length and assembled grip; verify full thread emerges through nut and no shaft-end contact. Reject out-of-envelope parts; do not force or shorten.'),limitations=['These inspection bounds are specified design acceptance, not a claim of supplier guaranteed tolerances.','No torque, nylon creep, physical thread quality, print error or hand manipulation has been tested.','The prior PCB insertion path is preserved; attach these screws only AFTER PCB seating.'],pass_scoped=True)
assert report['all15_stl_byte_identical']
(O/'m2x12_result.json').write_text(json.dumps(report,indent=2))
old=json.loads((B/'catalogue_delta_verification.json').read_text())
chain=dict(classification='CALCULATED_SCOPED_HARDWARE_DELTA_CHAIN_NOT_FULL_RETEST',native_sha256=sha(native),source_sha256=sha(builder),mesh_sha256=sha(meshfile),pass_scoped=True,baseline_native_sha256=sha(B/native.name),prior_verification_record='reviews/technical_closure_20260921/before_m2/catalogue_delta_verification.json',prior_verification_sha256=sha(B/'catalogue_delta_verification.json'),delta_record='reviews/technical_closure_20260921/m2x12_result.json',delta_sha256=sha(O/'m2x12_result.json'),unchanged_objects=124,changed_objects=['PCBScrews'],all15_stl_byte_identical_to_original=True,physical_validation_executed=False,original_full_path_tests_rerun_on_final=False,limitations=report['limitations'])
chain['references']={n:dict(path=chain[k],sha256=sha(R/chain[k])) for n,k in [('prior_chain','prior_verification_record'),('m2_delta','delta_record')]}
(C/'catalogue_delta_verification.json').write_text(json.dumps(chain,indent=2))
br=json.loads((C/'build_report.json').read_text());br.update(native_sha256=sha(native),mesh_sha256=sha(meshfile),source_sha256=sha(builder))
br['catalogue_only_update_20260921']['pcb_screw']='Essentra 50M020040P012; qty2; maximum head D4 H1.6; nominal M2x12 shank'
br['m2x12_adoption_record']='reviews/technical_closure_20260921/m2x12_result.json'
(C/'build_report.json').write_text(json.dumps(br,indent=2))
print(json.dumps({k:report[k] for k in ['part','quantity','native_sha256','all15_stl_byte_identical','pass_scoped']}),flush=True)
