"""No-cut F05 threaded-through knob +70mm stud + jamnut + washer candidate."""
from pathlib import Path
import FreeCAD as A,Part
import json,math,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def cy(r,h,x,y,z):return Part.makeCylinder(r,h,V(x,y,z),V(0,1,0))
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
local={}
local['Stud']=cy(2,70,0,-16.5,0)
local['Washer']=cy(4.5,.8,0,40,0).cut(cy(2.15,2,0,39.5,0))
rr=7/math.sqrt(3);pts=[V(rr*math.cos(math.radians(30+i*60)),40.8,rr*math.sin(math.radians(30+i*60))) for i in range(6)]
local['JamNut']=Part.Face(Part.makePolygon(pts+[pts[0]])).extrude(V(0,3.2,0)).cut(cy(2.1,5,0,40,0))
local['Knob']=cy(4,6,0,44,0).fuse(cy(8,3.5,0,50,0)).cut(cy(2.1,11,0,43.5,0))
parts={f'{side}_{n}':mv(q,x=x,z=6.35) for side,x in [('L',-111),('R',111)] for n,q in local.items()}
obs={n:q for n,q in S.items() if n!='HeadHandScrews'};poses=[]
for t in range(0,81,2):
 posed={n:mv(q,y=t) for n,q in parts.items()}
 for n,q in posed.items():poses.append(dict(part=n,lift_mm=t,collisions=bad(q,{**obs,**{k:v for k,v in posed.items() if k!=n}})))
# Bare outside-frame preassembly.7.2mm-mouth/12mm-head/3mm-thick open wrench.
tool=cy(6,3,0,40.9,0).fuse(box(-3,40.9,0,6,3,45)).cut(box(-3.6,40,-7,7.2,5,11.3))
fit=dict(nut_overlap_mm3=vol(tool,local['JamNut']),stud_overlap_mm3=vol(tool,local['Stud']))
toolposes=[]
for t in range(0,51,2):toolposes.append(dict(front_offset_mm=t,collisions=bad(mv(tool,z=t),{n:q for n,q in local.items() if n not in ['JamNut','Stud']})))
result=dict(classification='CALCULATED_F05_CATALOGUE_COMBINATION_ENVELOPE_NO_PRODUCT_EDIT',sources=sources,
 parts=dict(knob='NBK KNFS-16-M4',stud='Fabory20106.040.070 M4x70',jamnut='Fabory51080.040.001 M4 AF7 H3.2',washer='Essentra17M04DIN34815 ID4.3 OD9 t0.8'),
 coordinates=dict(axes_x_mm=[-111,111],axis_z_mm=6.35,stud_y_mm=[-16.5,53.5],washer_y_mm=[40,40.8],jamnut_y_mm=[40.8,44],knob_hub_d8_y_mm=[44,50],knob_disc_d16_y_mm=[50,53.5],knob_through_bore_d_mm=4.2),
 poses=poses,bare_preassembly_spanner=toolposes,spanner_jaw_fit=fit,
 length_margins=dict(under_bearing_to_tip_mm=56.5,square_nut_y_mm=[-9.6,-6.4],tip_beyond_square_nut_mm=6.9,stud_top_flush_with_knob_top=True,nominal_knob_threaded_height_mm=9.5,head_removed_gap_after_lift65_mm=8.5),
 bearing=dict(washer_centered_annulus_mm2=math.pi/4*(9**2-5.2**2),washer_hole_to_stud_radial_mm=.15),
 limits=['Confirmed supplier thread-through construction and product dimensions are owned by the hardware review; these are declared CAD envelopes.',
 'Preassemble outside frame: jamnut on stud first, knob threaded on to top-flush70mm location, jamnut tightened against knob hub, then washer from lower stud end.',
 'The square closure nut remains the primary female thread. The new jamnut only locks stud to knob; washer rests on the printed upper stop.',
 'Tool is a declared3mm-thick gauge, not a qualified arbitrary7mm spanner. Threads, knob locking torque, creep, washer/PA bearing and hand force require physical checks.',
 'Lifting65mm is required in the display to leave the shown8.5mm nominal extraction margin; do not infer continuous trajectory or printed tolerance proof.'])
result['pass_scoped']=all(not x['collisions'] for x in poses+toolposes) and max(fit.values())<1e-4
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'f05_stud_knob.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'ASSEMBLY_POSES',len(poses),'SPANNER',len(toolposes),'FIT',fit,flush=True)
