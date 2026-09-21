"""Read-only virtual A14 base fastener reversal; unchanged print geometry."""
from pathlib import Path
import FreeCAD as A,Part
import hashlib,json,math
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
p=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();sources={str(q.relative_to(R)):sha(q) for q in [p,Path(__file__)]}
d=A.openDocument(str(p));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape') and not o.Name.startswith('BaseJoint')}
def cy(r,h,x,y,z,axis=V(0,1,0)):return Part.makeCylinder(r,h,V(x,y,z),axis)
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(a,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(a,s))>1e-4]
def mv(s,u,t):q=s.copy();q.translate(u*t);return q
H={};groups=[]
for z,xs in [(-50,[-45,45]),(94,[-68,68])]:
 for x in xs:
  name=f'ReversedBase_{x}_{z}_';g={}
  g[name+'Screw']=cy(2,20,x,-82.8,z).fuse(cy(4,3.1,x,-85.9,z))
  g[name+'BottomWasher']=cy(4.5,.8,x,-82.8,z).cut(cy(2.15,2,x,-83.4,z))
  g[name+'TopWasher']=cy(4.5,.8,x,-72,z).cut(cy(2.15,2,x,-72.5,z))
  rr=7/math.sqrt(3);pts=[V(x+rr*math.cos(i*math.pi/3),-71.2,z+rr*math.sin(i*math.pi/3)) for i in range(6)]
  g[name+'Nut']=Part.Face(Part.makePolygon(pts+[pts[0]])).extrude(V(0,3.2,0)).cut(cy(2.05,5,x,-72,z))
  H.update(g);groups.append((name,x,z,g))
static=[];tools=[];paths=[]
for name,x,z,g in groups:
 for n,s in g.items():
  ob={**S,**{k:q for k,q in H.items() if k!=n}}
  static.append(dict(part=n,collisions=bad(s,ob)))
  if n.endswith('Screw'):u=V(0,-1,0)
  elif n.endswith('BottomWasher'):u=V(0,-1,0);ob.pop(name+'Screw',None)
  else:u=V(0,1,0)
  if n.endswith('TopWasher'):ob.pop(name+'Screw',None);ob.pop(name+'Nut',None)
  for t in [0,2,5,10,20,35]:paths.append(dict(part=n,outward_mm=t,collisions=bad(mv(s,u,t),ob)))
 for t in [0,5,15,30]:
  sock=cy(6,35,x,-71.2+t,z)
  driver=cy(3,35,x,-85.9-t,z,V(0,-1,0))
  tools.append(dict(joint=name,tool='OD12 socket fully engaging top nut',offset_mm=t,collisions=bad(sock,{**S,**{k:q for k,q in H.items() if k not in [name+'Screw',name+'Nut']}})))
  tools.append(dict(joint=name,tool='OD6 screwdriver below head',offset_mm=t,collisions=bad(driver,{**S,**{k:q for k,q in H.items() if k!=name+'Screw'}})))
result=dict(classification='CALCULATED_VIRTUAL_M4X20_BASE_REVERSAL_UNCHANGED_PRINTS',sources=sources,static=static,paths=paths,tools=tools,
 parameters=dict(screw='M4x20 candidate',head_max_diameter_mm=8,head_max_height_mm=3.1,washer_outer_diameter_mm=9,washer_thickness_mm=.8,nut_af_mm=7,nut_height_mm=3.2,nominal_tip_y_mm=-62.8,nominal_tip_protrusion_mm=5.2,head_bottom_y_mm=-85.9,bench_y_mm=-88,head_bench_gap_mm=2.1),
 limits=['Candidate maximum envelopes supplied by hardware review; actual product tolerances, engagement/chamfers, torque and print strength remain separate.',
 'Full saved surrounding assembly used geometrically. Practical underside access requires lifting/inverting the base; table is not an obstacle in this service pose.',
 'No fabrication, human access, actual selected driver/socket geometry or thread simulation.'])
result['pass_scoped']=all(not r['collisions'] for group in [static,paths,tools] for r in group)
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'base_reverse_candidate.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],flush=True)
