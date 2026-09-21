"""Verpas14mm head envelope and50/55/60mm shaft length screens, no product edits."""
from pathlib import Path
import FreeCAD as A,Part
import math,json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]};d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
def cy(r,h,x,y,z):return Part.makeCylinder(r,h,V(x,y,z),V(0,1,0))
obs={n:s for n,s in S.items() if n!='HeadHandScrews'};rows=[]
for L in [50,55,60]:
 checks=[]
 for x in [-111,111]:
  q=cy(2,L,x,40-L,6.35).fuse(cy(3.5,4,x,40,6.35)).fuse(cy(7,5,x,44,6.35))
  for t in range(0,81,2):
   s=q.copy();s.translate(V(0,t,0));checks.append(dict(x_mm=x,upward_offset_mm=t,collisions=bad(s,obs)))
 rows.append(dict(shaft_length_mm=L,shaft_y_mm=[40-L,40],head_hub_y_mm=[40,44],head_grip_y_mm=[44,49],nut_y_mm=[-9.6,-6.4],nominal_tip_beyond_nut_mm=L-49.6,poses=checks,pass_nominal=all(not r['collisions'] for r in checks)))
result=dict(classification='CALCULATED_HANDKNOB_HEAD_AND_LENGTH_CANDIDATES_NOT_CATALOGUE_APPROVAL',sources=sources,candidates=rows,
 bearing=dict(hub_nominal_d_mm=7,upper_hole_nominal_d_mm=5.2,centered_radial_land_mm=.9,centered_annular_area_mm2=math.pi/4*(7**2-5.2**2),
  assumed_hole_max_mm=5.5,centered_area_at_assumed_hole_max_mm2=math.pi/4*(7**2-5.5**2),min_edge_land_with_M4_floating_to_hole_edge_mm=(7-5.5)/2-(5.5-4)/2,
  note='The7mm hub remains larger than the hole. At hole5.5 and maximum shaft eccentricity, the minimum local radial land reaches0; total bearing area remains positive. This is not a load or print-tolerance guarantee.'),
 limits=['Verpas M4x50 actual SKU defines the14x9mm head with7x4mm hub.55/60 are geometric alternatives only until a supplier SKU is matched.',
 'Nominal50mm tip projection0.4mm has little allowance for length tolerance and incomplete tip threads; full-thread engagement requires confirmation.',
 'No washer added. A washer would raise the head and reduce engagement by its thickness.',
 'Only nominal rigid geometry and contact area arithmetic tested; PA head bearing stress, clamp force, creep and hand comfort require actual tests.'])
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'head_handknob_candidates.json').write_text(json.dumps(result,indent=2)+'\n')
for r in rows:print('L',r['shaft_length_mm'],'PASS',r['pass_nominal'],'TIP',r['nominal_tip_beyond_nut_mm'],flush=True)
