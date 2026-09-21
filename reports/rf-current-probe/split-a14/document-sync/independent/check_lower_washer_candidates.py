"""Local A/B lower-washer catalogue candidates; product CAD untouched."""
from pathlib import Path
import FreeCAD as A,Part
import math,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P))
S={o.Name[7:]:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape') and o.Name.startswith('Cable1_')}
for s in S.values():s.translate(V(0,0,118.65))
M=json.loads((P.parent/'mesh.json').read_text());M={n[7:]:r for n,r in M.items() if n.startswith('Cable1_')}
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def cy(r,h,x,y,z):return Part.makeCylinder(r,h,V(x,y,z),V(0,1,0))
normals=[(math.cos(math.radians(a)),math.sin(math.radians(a))) for a in [210,330]]
def pose(n,s,r):
 g=M[n].get('subgroup','');t=r-8
 if g in ['DRIVE','TOP','TOPSCREW']:return mv(s,y=t)
 if g.startswith('JAW'):nx,ny=normals[int(g[-1])-1];return mv(s,nx*t,ny*t)
 return s
result=dict(classification='CALCULATED_LOCAL_CANDIDATES_NO_PRODUCT_CHANGE',sources=sources,candidates={})
for name,od,thickness,dy in [('A_OD12_5_t0_8',12.5,.8,0),('B_OD12_t1_6',12,1.6,-.8)]:
 ss=dict(S);ss['ThrustWasher']=cy(od/2,thickness,80,41.8-thickness,26).cut(cy(3.2,thickness+2,80,40.8-thickness,26));ss['LeadLockNut']=mv(S['LeadLockNut'],y=dy)
 motion=[];rotation=[];loading=[];toolrows=[]
 for r in [3+i*.5 for i in range(21)]:
  posed={n:pose(n,s,r) for n,s in ss.items()}
  for n in ['ThrustWasher','LeadLockNut']:motion.append(dict(radius_mm=r,part=n,collisions=bad(posed[n],{k:s for k,s in posed.items() if k!=n})))
 for r in [3,8,13]:
  posed={n:pose(n,s,r) for n,s in ss.items()}
  for a in range(0,360,15):
   q=ss['LeadLockNut'].copy();q.rotate(V(80,38+dy,26),V(0,1,0),a);rotation.append(dict(radius_mm=r,angle_deg=a,collisions=bad(q,{n:s for n,s in posed.items() if n not in ['LeadLockNut','LeadStud']})))
 for n in ['ThrustWasher','LeadLockNut']:
  obs={k:s for k,s in ss.items() if k not in ['ThrustWasher','LeadLockNut','LeadStud','HandKnob','TopJamNut','TopWasher']}
  for z in range(0,51,2):loading.append(dict(part=n,front_offset_mm=z,collisions=bad(mv(ss[n],z=z),obs)))
 # Old declared lower-nut tool, approaching +X with fixed tool while knob turns.
 tool=box(74,36+dy,17,20,4,18).cut(box(72,35+dy,20.75,15,6,10.5)).fuse(box(94,36+dy,22,66,4,8))
 toolfit=dict(nut_overlap_mm3=vol(tool,ss['LeadLockNut']),stud_overlap_mm3=vol(tool,ss['LeadStud']))
 obs={n:s for n,s in ss.items() if n not in ['LeadLockNut','LeadStud']}
 for x in range(0,61,2):toolrows.append(dict(x_offset_mm=x,collisions=bad(mv(tool,x=x),obs)))
 rows=motion+rotation+loading+toolrows
 result['candidates'][name]=dict(washer_od_mm=od,washer_id_mm=6.4,washer_thickness_mm=thickness,washer_y_mm=[41.8-thickness,41.8],locknut_y_mm=[35+dy,41+dy],frame_gap_nominal_mm=.2,motion=motion,rotation=rotation,loading=loading,lower_spanner_approach=toolrows,tool_fit=toolfit,
  pass_nominal=all(not r['collisions'] for r in rows) and max(toolfit.values())<1e-4,
  limits=['Exact selected catalogue part tolerances/material/flatness and actual thrust friction are not proven.',
  'Spanner is an 18 mm head-width / 4 mm thick / 10.5 mm mouth envelope, held still during knob rotation.',
  'Nominal0.2mm free play is adjusted by the lower nyloc position; replacing washer without adjusting nut is not this candidate.',
  'No repeat of previous full-assembly motion tests; only changed washer, nut, loading and tool access were tested.'])
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'lower_washer_candidates.json').write_text(json.dumps(result,indent=2)+'\n')
for n,r in result['candidates'].items():print(n,'PASS',r['pass_nominal'],'FIT',r['tool_fit'],flush=True)
