from pathlib import Path
import FreeCAD as A,Part,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT'; old=R/'mechanical/assembly_A13_DRAFT'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
d=A.openDocument(str(P/'RFCP_A14_Integrated_DRAFT.FCStd'));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
od=A.openDocument(str(old/'RFCP_A13_Integrated_DRAFT.FCStd'));OS={o.Name:o.Shape.copy() for o in od.Objects if hasattr(o,'Shape')}
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def bb(s):b=s.BoundBox;return dict(min=[b.XMin,b.YMin,b.ZMin],max=[b.XMax,b.YMax,b.ZMax])
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def volume(a,b):return a.common(b).Volume
def merge_spans(spans):
 out=[]
 for a,b in sorted(spans):
  if out and a<=out[-1][1]+1e-6:out[-1][1]=max(out[-1][1],b)
  else:out.append([a,b])
 return out
joints=[]
for left,right in [('LowerCenter','LowerArmLeft'),('LowerCenter','LowerArmRight'),('UpperLeft','UpperRight'),('BaseCenter','BaseFront'),('BaseCenter','BaseRear')]:
 areas={}
 for i,ax in enumerate('XYZ'):
  for sign in [-1,1]:
   v=[0,0,0];v[i]=sign*.01
   areas[ax+str(sign)]=volume(mv(S[left],*v),S[right])/.01
 joints.append(dict(a=left,b=right,distance_mm=S[left].distToShape(S[right])[0],directional_contact_estimate_mm2=areas))
# Ideal perfect bond at all touching upper-joint faces. This is a NEW A14
# reference model, not an as-built bolt/contact or slipping-joint simulation.
u=[Part.read(str(P/'parts'/(n+'_A14_DRAFT.step'))) for n in ['UpperLeft','UpperRight']]
bond=u[0].fuse(u[1]).removeSplitter()
bondpath=O/'upper_A14_IDEAL_BONDED.step'
if not bondpath.exists():bond.exportStep(str(bondpath))
savedbond=Part.read(str(bondpath));bonddelta=bond.cut(savedbond).Volume+savedbond.cut(bond).Volume
region=box(-25,-72,-10,50,43,30)
pc=[dict(index=i,area_mm2=f.Area,bbox=bb(f),center=list(f.CenterOfMass)) for i,f in enumerate(S['LowerCenter'].Faces) if f.BoundBox.intersect(region.BoundBox)]
# All planar scan rays through the PCB-holder block, along each Cartesian axis.
# Thin fragments are recorded with native coordinates; edge slivers are not
# automatically structural failures and require the flagged region's role.
thin=[];sections=[]
for x in [-20,-18,-16,-14.5,-10,0,10,14.5,16,18,20]:
 for y in [-69,-67,-65.5,-64,-60,-54,-49,-40,-37,-36,-35]:
  line=Part.makeLine(V(x,y,-15),V(x,y,25)); q=line.common(S['LowerCenter'])
  spans=merge_spans([(e.BoundBox.ZMin,e.BoundBox.ZMax) for e in q.Edges])
  sections.append(dict(x=x,y=y,z_intervals=spans))
  for a,b in spans:
   if 1e-4<b-a<1.5-1e-6:thin.append(dict(axis='Z',x=x,y=y,start=a,end=b,thickness=b-a))
for x in [-20,-18,-16,-14.5,-10,0,10,14.5,16,18,20]:
 for z in [-4,0,3,4.75,5,7,10,13.5,15]:
  q=Part.makeLine(V(x,-75,z),V(x,-28,z)).common(S['LowerCenter'])
  spans=merge_spans([(e.BoundBox.YMin,e.BoundBox.YMax) for e in q.Edges])
  for a,b in spans:
   if 1e-4<b-a<1.5-1e-6:thin.append(dict(axis='Y',x=x,z=z,start=a,end=b,thickness=b-a))
report=dict(classification='CALCULATED_SAVED_CAD',native_sha256=sha(P/'RFCP_A14_Integrated_DRAFT.FCStd'),source_sha256=sha(R/'mechanical/build_assembly_A14.py'),
 bbox={n:bb(S[n]) for n in ['PCB','PCBScrews','PCBNuts','LowerCenter','UpperLeft','UpperRight']},joint_contacts=joints,
 ideal_bonded_upper=dict(valid=bond.isValid(),solids=len(bond.Solids),sha256=sha(O/'upper_A14_IDEAL_BONDED.step'),saved_reference_geometry_difference_mm3=bonddelta),
 ideal_ferrite_seam_area_mm2=volume(S['FixedCore'],mv(S['MovingCore'],y=-.01))/.01,
 pcb_holder_faces=pc,pcb_holder_z_sections=sections,pcb_holder_thin_line_segments=thin)
(O/'geometry_inspection.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['bbox','joint_contacts','ideal_bonded_upper','pcb_holder_thin_line_segments']},indent=2),flush=True)
