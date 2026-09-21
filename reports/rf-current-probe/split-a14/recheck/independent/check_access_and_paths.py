"""Independent A14 saved-CAD access, actual nut-engaging socket, and removal paths.
No product edits, thread/force/contact simulation, or physical approval.
"""
from pathlib import Path
import json,hashlib,itertools
import FreeCAD as A,Part
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT';native=P/'RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source_paths=[native,P/'build_report.json',R/'mechanical/build_assembly_A14.py',R/'mechanical/verify_assembly_A14.py',Path(__file__)]
sources={str(p.relative_to(R)):sha(p) for p in source_paths}
doc=A.openDocument(str(native));S={o.Name:o.Shape.copy() for o in doc.Objects if hasattr(o,'Shape')}
M=json.loads((P/'mesh.json').read_text());assert json.loads((P/'build_report.json').read_text())['native_sha256']==sha(native)
def mv(s,v):q=s.copy();q.translate(v);return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def overlaps(s,obs):return [dict(part=n,volume_mm3=v) for n,b in obs.items() if (v:=vol(s,b))>1e-4]
def unit(n):return V(0,1 if S[n].BoundBox.Center.y>-75 else -1,0) if n.startswith('BaseJoint') else V(0,0,1)
def bare(n):
 if n.startswith('BaseJoint'):return {k:s for k,s in S.items() if k.startswith('Base')}
 if n.startswith('LowerJoint'):return {k:s for k,s in S.items() if k.startswith(('LowerCenter','LowerArm','LowerJoint'))}
 return {k:s for k,s in S.items() if k.startswith(('UpperLeft','UpperRight','UpperJoint'))}
tools=[];insertion=[];extended=[];lengths=[]
for n,meta in M.items():
 if not meta.get('new_hardware') or not n.endswith('Nut'):continue
 stem=n[:-3];nut=S[n];bolt=S[stem+'Screw'];u=unit(n);b=nut.BoundBox;c=b.Center;ob=bare(n)
 # Start at nut's bearing face, so the socket surrounds the actual nut, unlike
 # the previous gauge which started beyond the nut's outside face.
 bearing=V(c.x,b.YMin if u.y>0 else b.YMax,c.z) if n.startswith('BaseJoint') else V(c.x,c.y,b.ZMin)
 bb=bolt.BoundBox
 back=V(c.x,bb.YMin if u.y>0 else bb.YMax,c.z) if n.startswith('BaseJoint') else V(c.x,c.y,bb.ZMin)
 for advance in [0,2,5,10,20,30]:
  sock=Part.makeCylinder(6,30,bearing+u*advance,u)
  tools.append(dict(joint=stem,kind='OD12 socket starts at nut bearing face',offset_mm=advance,
   collisions=overlaps(sock,{k:s for k,s in ob.items() if k not in [n,stem+'Screw']})))
  driver=Part.makeCylinder(3,35,back-u*advance,-u)
  tools.append(dict(joint=stem,kind='OD6 straight driver at back of screw head',offset_mm=advance,
   collisions=overlaps(driver,{k:s for k,s in ob.items() if k!=stem+'Screw'})))
 for suffix,direction in [('Screw',-u),('RearWasher',-u),('FrontWasher',u),('Nut',u)]:
  name=stem+suffix
  for t in [0,1,2,5,10,20,40,60]:
   obstacles={k:s for k,s in ob.items() if k!=name}
   # Screw is absent when washers are placed. No hardware is placed through a
   # preinstalled screw head; these are a serial assembly sequence.
   if suffix in ['RearWasher','FrontWasher']:obstacles.pop(stem+'Screw',None)
   if suffix=='FrontWasher':obstacles.pop(stem+'Nut',None)
   insertion.append(dict(joint=stem,part=name,outward_mm=t,collisions=overlaps(mv(S[name],direction*t),obstacles)))
 tip=(bb.YMax if u.y>0 else bb.YMin) if n.startswith('BaseJoint') else bb.ZMax
 nutend=(b.YMax if u.y>0 else b.YMin) if n.startswith('BaseJoint') else b.ZMax
 protr=(tip-nutend)*u.y if n.startswith('BaseJoint') else (tip-nutend)
 lengths.append(dict(joint=stem,nominal_shaft_protrusion_beyond_nut_mm=protr,
   nut_axial_height_mm=b.YLength if n.startswith('BaseJoint') else b.ZLength))
 if n.startswith('UpperJoint'):
  # Length-target check, not a repeated +5mm mutation after the builder adopts30.
  head_h=max(f.BoundBox.ZLength for f in bolt.Faces if hasattr(f.Surface,'Radius') and abs(f.Surface.Radius-4)<1e-4)
  actual_l=bb.ZLength-head_h;extra=max(0,30-actual_l)
  long=bolt.fuse(Part.makeCylinder(2,extra,V(c.x,c.y,bb.ZMax),u)).removeSplitter() if extra>1e-5 else bolt
  for t in [0,1,2,5,10,20,40,60]:
   extended.append(dict(joint=stem,candidate='M4x30 length target; existing30 is unchanged',actual_saved_shaft_length_mm=actual_l,added_length_mm=extra,outward_mm=t,
    collisions=overlaps(mv(long,-u*t),{k:s for k,s in ob.items() if k!=stem+'Screw'})))
# Recheck old B05/B07 display failure and an actual short-lift/side-exit path.
mount=[]
for i in [2,3,4,5]:
 name='MountScrew'+str(i);bolt=S[name];ob={k:s for k,s in S.items() if k!=name}
 for t in range(0,41):
  mount.append(dict(screw=name,path='old straight up 40',position_mm=[0,t,0],collisions=overlaps(mv(bolt,V(0,t,0)),ob)))
 sign=-1 if i in [2,4] else 1
 for t in range(0,26):
  mount.append(dict(screw=name,path='candidate lift25 then outwardX',position_mm=[0,t,0],collisions=overlaps(mv(bolt,V(0,t,0)),ob)))
 for t in range(1,41,2):
  q=V(sign*t,25,0);mount.append(dict(screw=name,path='candidate lift25 then outwardX',position_mm=list(q),collisions=overlaps(mv(bolt,q),ob)))
result=dict(classification='CALCULATED_SAVED_CAD_DISCRETE_SERIAL_ASSEMBLY_AND_TOOL_ENVELOPES',sources=sources,
 tools=tools,serial_fastener_paths=insertion,upper_M4x30_paths=extended,nominal_length_margins=lengths,mount_screw_paths=mount,
 limits=['Bare subassembly order for new joints; actual hands, socket engagement/lead chamfer, driver head pattern, friction and force not validated.',
 'Sockets are conservative solid OD12 outside envelopes with deliberate target nut/screw omitted; selected tool product is not yet specified.',
 'M4x30 virtual check changes length only, not vendor-specific head, thread, washer or nut dimensions.',
 'No printed errors or flexibility in this geometric check; no continuous swept-volume or thread simulation.'])
result['sources_unchanged']=all(sha(R/k)==v for k,v in sources.items())
(O/'access_and_paths.json').write_text(json.dumps(result,indent=2)+'\n')
print('TOOLS_FAIL',sum(bool(r['collisions']) for r in tools),'SERIAL_FAIL',sum(bool(r['collisions']) for r in insertion),'UPPER30_FAIL',sum(bool(r['collisions']) for r in extended),flush=True)
for path in sorted({r['path'] for r in mount}):print(path,sum(bool(r['collisions']) for r in mount if r['path']==path),flush=True)
