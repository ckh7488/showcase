"""Read-only F02 maximum-envelope sensitivity; no product exports or mutations."""
from pathlib import Path
import json,hashlib,math
import FreeCAD as A
import Part
R=Path(__file__).resolve().parents[2]; O=Path(__file__).resolve().parent; V=A.Vector
p=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
d=A.openDocument(str(p));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def over(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0
def bb(s):
 b=s.BoundBox;return dict(x=[b.XMin,b.XMax],y=[b.YMin,b.YMax],z=[b.ZMin,b.ZMax])
rows=[]
for i,s in enumerate(S['PCBNuts'].Solids):
 b=s.BoundBox;x=(b.XMin+b.XMax)/2;y=(b.YMin+b.YMax)/2
 # Read manufacturer drawing image /936/04M020040HN.PDF directly:
 # horizontal flats3.90+/-.26, thickness1.20+/-.26.
 # Use a circumscribed cylinder so all in-plane hex rotations are bounded.
 r=4.16/math.sqrt(3);h=1.46
 q=Part.makeCylinder(r,h,V(x,y,b.ZMax-h)).cut(Part.makeCylinder(1.05,h+2,V(x,y,b.ZMax-h-1)))
 static=[dict(part=n,vol_mm3=over(q,a)) for n,a in S.items() if n not in ['PCBNuts','PCBScrews'] and over(q,a)>1e-5]
 paths=[]
 # H04 isolated head assembly: rear insertion before PCB and lower keeper.
 obs={n:a for n,a in S.items() if n in ['LowerCenter','LowerArmLeft','LowerArmRight','FixedCore','Winding'] or n.startswith('LowerJoint')}
 for t in range(29):
  z=q.copy();z.translate(V(0,0,-t))
  hits=[dict(part=n,vol_mm3=over(z,a)) for n,a in obs.items() if over(z,a)>1e-5]
  paths.append(dict(rear_travel_mm=t,collisions=hits))
 # Locate associated screw and report modeled shank length, without thread claims.
 sc=min(S['PCBScrews'].Solids,key=lambda a:abs(a.BoundBox.Center.x-x))
 sb=sc.BoundBox; projection=(b.ZMax-h)-sb.ZMin
 rows.append(dict(index=i,original_bbox=bb(s),candidate_bbox=bb(q),static_collisions=static,rear_insertion=paths,screw_bbox=bb(sc),nominal_screw_tip_projection_mm=projection,original_nut_front_face_z_mm=b.ZMax))
out=dict(classification='CALCULATED_MAXIMUM_NUT_ENVELOPE_NOT_FULL_TOLERANCE_OR_THREAD_QUALIFICATION',native_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),source=dict(url='https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/936/04M020040HN.PDF',path='reviews/full_audit_20260921/sources/04M020040HN.PDF',sha256=hashlib.sha256((O/'sources/04M020040HN.PDF').read_bytes()).hexdigest(),visual_read=True,date_field='blank; UNCONTROLLED DOCUMENT'),assumption=dict(AF_nominal=3.90,height_nominal=1.20,tolerance_each=.26,max_AF=4.16,max_height=1.46,rotation_envelope='circumscribed cylinder, bore2.1, nut front bearing face preserved'),rows=rows,nominal_geometry_pass=all(not r['static_collisions'] and all(not s['collisions'] for s in r['rear_insertion']) for r in rows),length_sensitivity=dict(nominal_shank_available_beyond_bearing_mm=1.65,max_nut_thickness_mm=1.46,remaining_nominal_tip_projection_mm=.19,illustrative_screw_length_minus_mm=.3,illustrative_remaining_mm=-.11,illustrative_not_lot_tolerance=True),superseded_initial_assumption='f02_unconfirmed_initial_assumption.json used unverified3.98/H1.62; not the retrieved manufacturer drawing and not current evidence',limits=['All-body insertion envelope passes for this manufacturer maximum; no product defect established by the superseded unverified larger-height case.','Threads and physical nut/spanner not modeled; tool size cannot be inferred solely from nominalAF.','Actual incomplete screw-end threads and full screw/PCB/holder tolerance stack remain. Nominal0.19 tip margin is not a worst-case pass.','Manufacturer revision/lot is uncontrolled in retrieved document; confirm supplied product.','No new product CAD or STL was written.'])
# Bounded optional M2x12 candidate: unchanged head, add2mm to each nominal shank.
# This is an envelope candidate, not selection/ordering or a product-model update.
screws=[]
for s in S['PCBScrews'].Solids:
 b=s.BoundBox;c=b.Center
 screws.append(s.fuse(Part.makeCylinder(1,2.05,V(c.x,c.y,b.ZMin-2))).removeSplitter())
candidate=Part.makeCompound(screws); trials=[]
for t in range(61):
 a=candidate.copy();a.translate(V(0,0,t*1.5))
 bad=[dict(part=n,vol_mm3=over(a,s)) for n,s in S.items() if n!='PCBScrews' and over(a,s)>1e-5]
 trials.append(dict(front_travel_mm=t*1.5,collisions=bad))
out['M2x12_candidate']=dict(description='same existing maximum D4/H1.6 head; nominal shank12 instead of10; exactSKU not yet adopted',poses=61,rows=trials,pass_nominal=all(not r['collisions'] for r in trials),projection_past_maximum_nut_mm=2.19,limits=['No supplier product/length tolerance or completed threads qualified by this geometric candidate.','Actual wrist/driver manipulation and variable print/PCB grip not modeled.'])
(O/'f02_envelope_sensitivity.json').write_text(json.dumps(out,indent=2))
print(json.dumps(dict(nut_maximum_fit=out['nominal_geometry_pass'],nut_poses=58,M2x12_pass=out['M2x12_candidate']['pass_nominal'],M2x12_poses=61,M2x10_projection_mm=.19,M2x12_projection_mm=2.19),indent=2),flush=True)
