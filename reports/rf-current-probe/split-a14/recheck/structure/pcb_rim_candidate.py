"""Review-only local reinforcement, never changes A14 production source/CAD."""
from pathlib import Path
import FreeCAD as A,Part,MeshPart,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT';d=A.openDocument(str(P/'RFCP_A14_Integrated_DRAFT.FCStd'))
S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def overlap(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
base=S['LowerCenter']
# Keep the inner PCB opening and standoff/thread planes unchanged. Add only to
# the outside and underside: side walls2.5->5.5mm, lower continuous block48x5x20.
additions=[box(-24,-70,-8,48,5,20),box(-24,-65,-4.5,5.5,30,12),box(18.5,-65,-4.5,5.5,30,12)]
candidate=base.multiFuse(additions).removeSplitter()
bad=[dict(part=n,mm3=v) for n,s in S.items() if n!='LowerCenter' and (v:=overlap(candidate,s))>1e-4]
g=[]
for x in [-14.5,14.5]:
 g.append(('M2_driver_assumed_D4_'+str(x),Part.makeCylinder(2,45,V(x,-60.5,7.65))))
 g.append(('M2_driver_D8_sensitivity_'+str(x),Part.makeCylinder(4,45,V(x,-60.5,7.65))))
sma=S['SMAEnvelope'].BoundBox
g.append(('SMA_D16',Part.makeCylinder(8,45,V(sma.Center.x,sma.Center.y,sma.ZMax))))
for x in [-1.27,1.27]:
 tip=Part.makeCylinder(.8,6,V(x,-38.5,6.35))
 cone=Part.makeCone(.8,3,12,V(x,-38.5,12.35))
 shaft=Part.makeCylinder(3,50,V(x,-38.5,24.35))
 g.append(('Solder_assumed_'+str(x),tip.fuse(cone).fuse(shaft)))
tools=[dict(gauge=n,overlap_original_mm3=overlap(s,base),overlap_candidate_mm3=overlap(s,candidate)) for n,s in g]
candidate.exportStep(str(O/'LowerCenter_PCB_RIM_REVIEW.step'))
b=candidate.BoundBox
MeshPart.meshFromShape(Shape=mv(candidate,-b.XMin,-b.YMin,-b.ZMin),LinearDeflection=.08,AngularDeflection=.12,Relative=False).write(str(O/'LowerCenter_PCB_RIM_REVIEW.stl'))
# 0.01mm slice tessellations for three readable sections in native coordinates.
plots=[]
for axis,value,name in [('Z',3,'PCB support level Z=3'),('Z',6,'PCB board level Z=6'),('X',0,'Centre section X=0')]:
 cut=box(-30,-73,value-.005,60,45,.01) if axis=='Z' else box(value-.005,-73,-13,.01,45,32)
 rows=[]
 for label,s in [('Current',base),('Candidate',candidate)]:
  q=s.common(cut);vs,tr=q.tessellate(.03)
  coords=[[v.x,v.y] if axis=='Z' else [v.z,v.y] for v in vs]
  rows.append(dict(label=label,xy=coords,triangles=tr))
 plots.append(dict(axis=axis,value=value,name=name,models=rows))
out=dict(classification='CALCULATED_REVIEW_CANDIDATE_NOT_SUPPLIER_APPROVED',source_native_sha256=hashlib.sha256((P/'RFCP_A14_Integrated_DRAFT.FCStd').read_bytes()).hexdigest(),
 valid=candidate.isValid(),solids=len(candidate.Solids),added_volume_mm3=candidate.Volume-base.Volume,removed_volume_mm3=base.cut(candidate).Volume,
 changes=dict(inner_window_x_mm=[-18.5,18.5],inner_window_bottom_y_mm=-65,side_wall_nominal_mm=5.5,lower_block_xyz_mm=[48,5,20]),
 nominal_assembly_collisions=bad,tools=tools,section_geometry=plots,
 limitations=['Only a candidate outside-rim reinforcement. JLC warning mechanism not reproduced; supplier DFM must be re-run.',
 'No change to inside PCB fit, SMA position, screw seats, winding opening, core contact or free lid.',
 'Assumed gauge cylinders do not certify actual hand tool, plug or assembly force.'])
(O/'pcb_rim_candidate.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k!='section_geometry'},indent=2))
