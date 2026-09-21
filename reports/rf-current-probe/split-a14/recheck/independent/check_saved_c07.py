"""Bind checked catalogue candidates to saved A14; no geometry edits."""
from pathlib import Path
import hashlib,json,math
import FreeCAD as A,Part
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;T=O/'c07_candidate'
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[P,P.parent/'mesh.json',O/'c07_catalog_candidate.json',Path(__file__)]+[T/(n+'.step') for n in ['LeadStud','HandKnob','TopWasher','TopJamNut']]
sources={str(p.relative_to(R)):sha(p) for p in paths}
d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def delta(a,b):
 if not a.isValid() or not b.isValid():return dict(valid=False,delta_mm3=None)
 return dict(valid=True,delta_mm3=a.cut(b).Volume+b.cut(a).Volume)
matched=[]
for k,z in [(1,-118.65),(2,121.35)]:
 for part in ['LeadStud','HandKnob','TopWasher','TopJamNut']:
  name=f'Cable{k}_{part}';q=Part.read(str(T/(part+'.step')));q.translate(A.Vector(0,0,z))
  matched.append(dict(part=name,**delta(S[name],q)) if name in S else dict(part=name,valid=False,missing=True,delta_mm3=None))
removed={f'Cable{k}_LeadScrewKnob' for k in [1,2]}
expected={f'Cable{k}_{p}' for k in [1,2] for p in ['LeadStud','HandKnob','TopWasher','TopJamNut']}
M=json.loads((P.parent/'mesh.json').read_text());V=A.Vector
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
normals=[(math.cos(math.radians(a)),math.sin(math.radians(a))) for a in [210,330]]
def pose(n,s,r):
 g=M.get(n,{}).get('subgroup','');t=r-8
 if g in ['DRIVE','TOP','TOPSCREW']:return mv(s,y=t)
 if g.startswith('JAW'):nx,ny=normals[int(g[-1])-1];return mv(s,nx*t,ny*t)
 return s
motion=[];tools=[];selected=[];rotation=[]
for r in [3+i*.5 for i in range(21)]:
 obs={n:pose(n,s,r) for n,s in S.items()}
 for n in sorted(expected):motion.append(dict(radius_mm=r,part=n,collisions=bad(obs[n],{k:s for k,s in obs.items() if k!=n})))
tool=Part.makeCylinder(9,4,V(80,52.1,26),V(0,1,0)).fuse(Part.makeBox(8,4,59,V(76,52.1,26))).cut(Part.makeBox(10.2,7,17,V(74.9,51,15)))
for k,z in [(1,-118.65),(2,121.35)]:
 pivot=V(80,54.1,26+z);name=f'Cable{k}_TopJamNut';obs={n:s for n,s in S.items() if n not in [name,f'Cable{k}_LeadStud']}
 for a in range(0,360,30):
  q=mv(tool,z=z);q.rotate(pivot,V(0,1,0),a);direction=A.Rotation(V(0,1,0),a).multVec(V(0,0,1))
  for t in [0,10,30,60]:
   w=q.copy();w.translate(direction*t);tools.append(dict(clamp=k,angle_deg=a,approach_mm=t,collisions=bad(w,obs)))
 for t in range(61):selected.append(dict(clamp=k,angle_deg=0,approach_mm=t,collisions=bad(mv(tool,z=z+t),obs)))
 for a in range(0,360,15):
  q=S[name].copy();q.rotate(pivot,V(0,1,0),a);rotation.append(dict(clamp=k,angle_deg=a,collisions=bad(q,obs)))
candidate=json.loads((O/'c07_catalog_candidate.json').read_text())
staging_matches=all(candidate['staged_files'][p.name]==sha(p) for p in paths if p.suffix=='.step')
rows=matched
result=dict(classification='CALCULATED_SAVED_CAD_CATALOGUE_EQUIVALENCE_PLUS_ACTUAL_MOTION_TOOL_RECHECK',sources=sources,
 matched_new_parts=matched,
 updated_scene=dict(part='LowerCenter',reason='Root added local PCB-frame perimeter reinforcement after catalogue candidate; actual updated body included in fresh checks below. No unchanged-whole-scene claim.'),
 actual_motion=motion,actual_tool_paths=tools,actual_selected_tool_path_1mm_samples=selected,actual_nut_rotation=rotation,
 rejected_tool_poses=[r for r in tools if r['collisions']],
 removed_original_knobs=all(n not in S for n in removed),
 candidate_staging_hashes_match=staging_matches,
 candidate_pass_scoped=candidate['pass_scoped'],candidate_sources_unchanged=candidate['sources_unchanged'],
 limits=['Saved hardware is compared to checked candidates; actual saved-scene motion/tool calculations are rerun. This is not a physical test.',
 'The candidate external approach at clamp1 angle330/offset60 is rejected, not silently passed.',
 'Threads, locking torque, axial friction and printed dimensional/warp errors remain first-article checks.'])
required_tools=[r for r in tools if r['angle_deg']==0 or r['approach_mm']==0]
actual_pass=all(not r['collisions'] for rs in [motion,required_tools,selected,rotation] for r in rs)
result['pass_scoped']=all(r['valid'] and r['delta_mm3']<1e-4 for r in rows) and actual_pass and result['removed_original_knobs'] and staging_matches and candidate['pass_scoped'] and candidate['sources_unchanged']
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'saved_c07_equivalence.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'NEW_MATCHED',len(matched),'ACTUAL_MOTION',len(motion),flush=True)
