"""Bind saved A14 catalogue update to baseline; changed hardware paths only."""
from pathlib import Path
import json, hashlib, math
import FreeCAD as A, Part
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
B=R/'reviews/a14_document_sync_20260921/before_cad';P=R/'mechanical/assembly_A14_DRAFT'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P/'RFCP_A14_Integrated_DRAFT.FCStd',P/'mesh.json',R/'mechanical/build_assembly_A14.py',B/'assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd',Path(__file__)]}
before=A.openDocument(str(B/'assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'))
after=A.openDocument(str(P/'RFCP_A14_Integrated_DRAFT.FCStd'))
BS={o.Name:o.Shape.copy() for o in before.Objects if hasattr(o,'Shape')};S={o.Name:o.Shape.copy() for o in after.Objects if hasattr(o,'Shape')}
M=json.loads((P/'mesh.json').read_text())
changed={'Cable1_ThrustWasher','Cable2_ThrustWasher','Cable1_LeadLockNut','Cable2_LeadLockNut','PCBScrews'}
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def diff(a,b):return a.cut(b).Volume+b.cut(a).Volume
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
def cy(r,h,x,y,z):return Part.makeCylinder(r,h,V(x,y,z),V(0,1,0))
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
delta=[]
for n in sorted(set(S)&set(BS)):
 dv=diff(S[n],BS[n]);delta.append(dict(part=n,symmetric_difference_mm3=dv,expected_change=n in changed,valid=S[n].isValid()))
stls=[]
for p in sorted((P/'parts').glob('*.stl')):
 b=B/'assembly_A14_DRAFT/parts'/p.name
 stls.append(dict(file=p.name,before_sha256=sha(b),after_sha256=sha(p),byte_identical=b.read_bytes()==p.read_bytes()))
expected={}
for k,off in [(1,-118.65),(2,121.35)]:
 expected[f'Cable{k}_ThrustWasher']=cy(6,1.6,80,40.2,26+off).cut(cy(3.2,3.6,80,39.2,26+off))
 expected[f'Cable{k}_LeadLockNut']=mv(BS[f'Cable{k}_LeadLockNut'],y=-.8)
expected['PCBScrews']=Part.read(str(O/'M2_Candidate_D4_H1p6.step'))
candidate_match={n:diff(S[n],s) for n,s in expected.items()}
rows=[];fits=[]
for k,off in [(1,-118.65),(2,121.35)]:
 pre=f'Cable{k}_';names=[n for n in S if n.startswith(pre)]
 def pose(n,s,r):
  if n not in names:return s
  g=M[n].get('subgroup','');t=r-8
  if g in ['DRIVE','TOP','TOPSCREW']:return mv(s,y=t)
  if g.startswith('JAW'):
   a=[210,330][int(g[-1])-1];return mv(s,x=math.cos(math.radians(a))*t,y=math.sin(math.radians(a))*t)
  return s
 for r in [3+i*.5 for i in range(21)]:
  posed={n:pose(n,s,r) for n,s in S.items()}
  for suffix in ['ThrustWasher','LeadLockNut']:
   n=pre+suffix;rows.append(dict(clamp=k,test='diameter_sweep',radius_mm=r,part=n,collisions=bad(posed[n],{a:s for a,s in posed.items() if a!=n})))
 for r in [3,8,13]:
  posed={n:pose(n,s,r) for n,s in S.items()}
  for a in range(0,360,15):
   q=S[pre+'LeadLockNut'].copy();q.rotate(V(80,37.2,26+off),V(0,1,0),a)
   rows.append(dict(clamp=k,test='nyloc_rotation',radius_mm=r,angle_deg=a,collisions=bad(q,{n:s for n,s in posed.items() if n not in [pre+'LeadLockNut',pre+'LeadStud']})))
 omitted={pre+s for s in ['ThrustWasher','LeadLockNut','LeadStud','HandKnob','TopJamNut','TopWasher']}
 for suffix in ['ThrustWasher','LeadLockNut']:
  for z in range(0,51,2):
   rows.append(dict(clamp=k,test='front_insertion_before_shaft',part=pre+suffix,z_offset_mm=z,collisions=bad(mv(S[pre+suffix],z=z),{n:s for n,s in S.items() if n not in omitted})))
 tool=box(74,35.2,17+off,20,4,18).cut(box(72,34.2,20.75+off,15,6,10.5)).fuse(box(94,35.2,22+off,66,4,8))
 fits.append(dict(clamp=k,nut_overlap_mm3=vol(tool,S[pre+'LeadLockNut']),stud_overlap_mm3=vol(tool,S[pre+'LeadStud'])))
 for x in range(0,61,2):
  rows.append(dict(clamp=k,test='lower_spanner_plus_x',x_offset_mm=x,collisions=bad(mv(tool,x=x),{n:s for n,s in S.items() if n not in [pre+'LeadLockNut',pre+'LeadStud']})))
 print('CLAMP',k,'tested',sum(r['clamp']==k for r in rows),flush=True)
pcbrows=[]
for z in range(61):pcbrows.append(dict(z_offset_mm=z,collisions=bad(mv(S['PCBScrews'],z=z),{n:s for n,s in S.items() if n!='PCBScrews'})))
limits=['Only two lower washers, two shifted nylocs and two M2 screw heads changed.','455 finite changed-hardware path poses do not prove continuous motion, threads, friction, hand usability, torque or RF performance.','Earlier 978-path evidence is preserved at its original native hash. Only unchanged object geometry and this explicit scoped delta connect it to current CAD.','Lower washer insertion is before shaft, knob, top nut/washer and lower nut/washer set are installed; obstacles omitted explicitly.','Tool is generic 18mm head width/4mm thick/10.5mm mouth with 66mm handle. Actual supplied tool not measured.','The nominal0.2mm axial gap is adjusted in real assembly, not guaranteed by vendor or print tolerance.']
result=dict(classification='CALCULATED_SAVED_CAD_CATALOGUE_DELTA_NOT_FABRICATION_QUALIFICATION',sources=sources,added_names=sorted(set(S)-set(BS)),removed_names=sorted(set(BS)-set(S)),shape_delta=delta,changed_objects=sorted(changed),expected_candidate_symmetric_difference_mm3=candidate_match,stl_files=stls,changed_hardware_paths=rows,m2_paths=pcbrows,tool_fits=fits,path_count=len(rows)+len(pcbrows),previous_candidate_reference='reviews/a14_document_sync_20260921/independent/lower_washer_candidates.json:B_OD12_t1_6',limits=limits)
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
result['pass_nominal']=not result['added_names'] and not result['removed_names'] and all(r['valid'] and (r['expected_change'] or r['symmetric_difference_mm3']<1e-6) for r in delta) and all(v<1e-6 for v in candidate_match.values()) and len(stls)==15 and all(r['byte_identical'] for r in stls) and all(not r['collisions'] for r in rows+pcbrows) and all(r['nut_overlap_mm3']<1e-4 and r['stud_overlap_mm3']<1e-4 for r in fits) and result['sources_unchanged']
(O/'catalogue_delta_verification.json').write_text(json.dumps(result,indent=2))
print('RESULT',result['pass_nominal'],'PARTS',len(delta),'PATHS',result['path_count'],'FAILS',sum(bool(r['collisions']) for r in rows+pcbrows),'STLS_IDENTICAL',all(r['byte_identical'] for r in stls),flush=True)
