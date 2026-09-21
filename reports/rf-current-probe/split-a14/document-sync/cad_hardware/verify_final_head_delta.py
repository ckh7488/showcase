"""Final hand screw delta against the frozen c718 catalogue-only assembly.

Use only after the selected hand screw has been incorporated. The earlier455
poses retain their c718 hash; this script additionally checks the new head's
added material against conservative envelopes of those previously tested paths.
"""
from pathlib import Path
import json, hashlib, math
import FreeCAD as A, Part
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT';B=O/'before_f05';B0=R/'reviews/a14_document_sync_20260921/before_cad/assembly_A14_DRAFT'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
F05=R/'reviews/a14_document_sync_20260921/independent/f05_stud_knob.json'
sources={str(p.relative_to(R)):sha(p) for p in [P/'RFCP_A14_Integrated_DRAFT.FCStd',P/'mesh.json',R/'mechanical/build_assembly_A14.py',B/'RFCP_A14_Integrated_DRAFT.FCStd',B/'catalogue_delta_verification.json',F05,Path(__file__)]}
bd=A.openDocument(str(B/'RFCP_A14_Integrated_DRAFT.FCStd'));ad=A.openDocument(str(P/'RFCP_A14_Integrated_DRAFT.FCStd'))
BS={o.Name:o.Shape.copy() for o in bd.Objects if hasattr(o,'Shape')};S={o.Name:o.Shape.copy() for o in ad.Objects if hasattr(o,'Shape')}
def dv(a,b):return a.cut(b).Volume+b.cut(a).Volume
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def bounds(s):
 b=s.BoundBox
 return [b.XMin,b.YMin,b.ZMin,b.XMax,b.YMax,b.ZMax]
closure_names={'HeadHandScrews','HeadClosureKnobs','HeadClosureJamNuts','HeadClosureWashers'}
expected_added=closure_names-{'HeadHandScrews'}
def cy(r,h,x,y,z):return Part.makeCylinder(r,h,V(x,y,z),V(0,1,0))
# Exact independent candidate recipe, translated to the two recorded axes.
expected={n:[] for n in closure_names}
for x in [-111,111]:
 expected['HeadHandScrews'].append(cy(2,70,x,-16.5,6.35))
 expected['HeadClosureKnobs'].append(cy(4,6,x,44,6.35).fuse(cy(8,3.5,x,50,6.35)).cut(cy(2.1,11,x,43.5,6.35)))
 expected['HeadClosureWashers'].append(cy(4.5,.8,x,40,6.35).cut(cy(2.15,2,x,39.5,6.35)))
 rr=7/math.sqrt(3);ps=[V(x+rr*math.cos(math.radians(30+i*60)),40.8,6.35+rr*math.sin(math.radians(30+i*60))) for i in range(6)]
 expected['HeadClosureJamNuts'].append(Part.Face(Part.makePolygon(ps+[ps[0]])).extrude(V(0,3.2,0)).cut(cy(2.1,5,x,40,6.35)))
candidate_match={n:dv(S[n],Part.makeCompound(ss)) for n,ss in expected.items()}
candidate_report=json.loads(F05.read_text())
assert candidate_report['pass_scoped']
assert any(v==sha(B/'RFCP_A14_Integrated_DRAFT.FCStd') for n,v in candidate_report['sources'].items() if n.endswith('.FCStd'))
delta=[]
for n in sorted(set(S)&set(BS)):
 equal_brep=S[n].exportBrepToString()==BS[n].exportBrepToString()
 difference=0 if equal_brep else dv(S[n],BS[n])
 delta.append(dict(part=n,symmetric_difference_mm3=difference,exact_brep_string_match=equal_brep,valid=S[n].isValid(),expected_change=n=='HeadHandScrews'))
print('ALL_GEOMETRY_COMPARED',flush=True)
stls=[dict(file=p.name,before_sha256=sha(B0/'parts'/p.name),after_sha256=sha(p),byte_identical=p.read_bytes()==(B0/'parts'/p.name).read_bytes()) for p in sorted((P/'parts').glob('*.stl'))]
head=Part.makeCompound([s for n in closure_names for s in S[n].Solids]);poses=[]
units=[Part.makeCompound([s for n in closure_names for s in S[n].Solids if (s.BoundBox.Center.x<0)==(sign<0)]) for sign in [-1,1]]
for i,s in enumerate(units):
 for y in range(0,81,2):
  q=s.copy();q.translate(V(0,y,0));poses.append(dict(screw_assembly=i,upward_offset_mm=y,collisions=bad(q,{n:p for n,p in S.items() if n not in closure_names})))
# Full envelopes of the455 prior changed-hardware poses, intentionally broad.
# All diameter/radius motions leave these fixed axis-location parts unchanged.
envelopes={}
for k,off in [(1,-118.65),(2,121.35)]:
 envelopes[f'Cable{k}_washer_sweep']=box(74,40.2,20+off,12,1.6,62)
 envelopes[f'Cable{k}_nyloc_sweep']=box(74,34.2,20+off,12,6,62)
 envelopes[f'Cable{k}_lower_spanner_sweep']=box(74,35.2,17+off,146,4,18)
envelopes['M2_screw_front_sweep']=box(-16.5,-62.5,-3.65,33,4,71.6)
added=head.cut(BS['HeadHandScrews'])
affected=[dict(envelope=n,added_head_material_overlap_mm3=vol(added,s)) for n,s in envelopes.items()]
prev=json.loads((B/'catalogue_delta_verification.json').read_text())
assert prev['pass_nominal'] and prev['path_count']==455
result=dict(classification='CALCULATED_FINAL_HANDSCREW_DELTA_AND_SCOPED_EVIDENCE_CHAIN',sources=sources,previous455_report_sha256=sha(B/'catalogue_delta_verification.json'),previous455_native_sha256=sha(B/'RFCP_A14_Integrated_DRAFT.FCStd'),added_names=sorted(set(S)-set(BS)),expected_added_names=sorted(expected_added),removed_names=sorted(set(BS)-set(S)),shape_delta=delta,added_objects_valid={n:S[n].isValid() for n in expected_added},head_solid_bounds_mm=[bounds(s) for s in head.Solids],head_static_collisions=bad(head,{n:s for n,s in S.items() if n not in closure_names}),hand_screw_poses=poses,pose_count=len(poses),added_material_against_prior455_envelopes=affected,stl_files=stls,
 limits=['Earlier978 and455 pose records retain their original hashes; not relabelled as a fresh full-assembly test.','Only existing HeadHandScrews changes relative to the455-pose source; three new paired compounds complete the catalog closure assembly. Added material is checked against conservative prior path envelopes.','82 finite head paths plus geometry evidence do not prove physical threads, bearing force, creep, torque or finger usability.','Hand screw catalogue dimensions and purchase availability remain separate source records.'])
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
result['independent_candidate_symmetric_difference_mm3']=candidate_match
result['pass_nominal']=set(result['added_names'])==expected_added and not result['removed_names'] and all(result['added_objects_valid'].values()) and all(r['valid'] and (r['expected_change'] or r['symmetric_difference_mm3']<1e-6) for r in delta) and not result['head_static_collisions'] and all(not r['collisions'] for r in poses) and all(r['added_head_material_overlap_mm3']<1e-4 for r in affected) and len(stls)==15 and all(r['byte_identical'] for r in stls) and result['sources_unchanged']
result['pass_nominal']=result['pass_nominal'] and all(v<1e-6 for v in candidate_match.values())
(O/'final_head_delta_verification.json').write_text(json.dumps(result,indent=2))
print('FINAL_HEAD_PASS',result['pass_nominal'],'POSES',len(poses),'STLS_IDENTICAL',all(r['byte_identical'] for r in stls),flush=True)
