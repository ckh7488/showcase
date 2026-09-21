"""NBK SBSMS-M4-5-20 max shoulder length20.25; no product edits."""
from pathlib import Path
import FreeCAD as A,Part
import math,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P));S={o.Name[7:]:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape') and o.Name.startswith('Cable1_')}
for s in S.values():s.translate(V(0,0,118.65))
M=json.loads((P.parent/'mesh.json').read_text());M={n[7:]:r for n,r in M.items() if n.startswith('Cable1_')}
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
normals=[(math.cos(math.radians(a)),math.sin(math.radians(a))) for a in [210,330]]
def pose(n,s,r):
 g=M[n].get('subgroup','');t=r-8
 if g in ['DRIVE','TOP','TOPSCREW']:return mv(s,y=t)
 if g.startswith('JAW'):nx,ny=normals[int(g[-1])-1];return mv(s,nx*t,ny*t)
 return s
maxf={}
for i,(nx,ny) in enumerate(normals,1):
 x=nx*34;y=ny*34
 maxf['Follower'+str(i)]=Part.makeCylinder(2,8,V(x,y,2)).fuse(Part.makeCylinder(2.5,20.25,V(x,y,10))).fuse(Part.makeCylinder(4.5,4,V(x,y,30.25)))
ss={**S,**maxf};motion=[];loading=[];tools=[]
for r in [3+i*.5 for i in range(21)]:
 posed={n:pose(n,s,r) for n,s in ss.items()}
 for n in maxf:motion.append(dict(radius_mm=r,part=n,collisions=bad(posed[n],{k:s for k,s in posed.items() if k!=n})))
for n,q in maxf.items():
 obs={k:s for k,s in ss.items() if k!=n and k not in ['TopBridgeJaw','BridgeScrew1','BridgeScrew2','BridgeNut1','BridgeNut2']}
 for z in range(0,61,2):loading.append(dict(part=n,front_offset_mm=z,collisions=bad(mv(q,z=z),obs)))
 b=q.BoundBox;c=b.Center;tool=Part.makeCylinder(2.5,50,V(c.x,c.y,34.25))
 for z in range(0,41,2):tools.append(dict(part=n,driver_front_offset_mm=z,collisions=bad(mv(tool,z=z),obs)))
result=dict(classification='CALCULATED_MAX_CATALOGUE_SHOULDER_ENVELOPE_NOT_TORQUE_OR_FRICTION_TEST',sources=sources,
 candidate=dict(product='NBK SBSMS-M4-5-20',shoulder_d_max_mm=5,shoulder_l_max_mm=20.25,thread_m4_length_mm=8,head_d_mm=9,head_h_mm=4,hex_key_nominal_mm=2.5),motion=motion,loading=loading,straight_driver_gauge=tools,
 engagement=dict(shoulder_root_z_mm=10,thread_range_z_mm=[2,10],nut_range_z_mm=[3.5,6.7],nominal_full_nut_thread_overlap_mm=3.2,tip_beyond_nut_mm=1.5,nominal_yoke_face_z_mm=28,max_shoulder_head_bearing_z_mm=30.25,max_shoulder_yoke_axial_gap_mm=2.25),
 limits=['Diameter5mm is the conservative upper envelope of f9 tolerance; length20.25 is supplier maximum. Thread, fillets/undercuts, tolerances of other parts and printed errors are not modeled.',
 'The unchanged shoulder root means the nominal thread/nut overlap is unchanged; actual complete-thread engagement and jaw seating still require inspection.',
 'Tool is a straight OD5mm gauge aligned to a2.5mm hex recess, not proof that an arbitrary L-key can swing here.',
 'Do not replace shoulder fastener with a plain M4 screw; tightening must seat on the jaw without pressing the sliding yoke.'])
result['pass_scoped']=all(not r['collisions'] for rs in [motion,loading,tools] for r in rs)
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'follower_max.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'MOTION',len(motion),'LOADING',len(loading),'TOOLS',len(tools),flush=True)
