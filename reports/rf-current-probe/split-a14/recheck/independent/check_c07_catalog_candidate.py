"""Non-press-fit C07 catalog candidate, staged geometry only. No product edits."""
from pathlib import Path
import FreeCAD as A,Part
import hashlib,json,math
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;T=O/'c07_candidate';T.mkdir(exist_ok=True);V=A.Vector
p=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();sources={str(q.relative_to(R)):sha(q) for q in [p,Path(__file__)]}
d=A.openDocument(str(p));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape') and not o.Name.endswith('LeadScrewKnob')}
M=json.loads((p.parent/'mesh.json').read_text())
def cyl(r,h,x,y,z,axis=V(0,1,0)):return Part.makeCylinder(r,h,V(x,y,z),axis)
def box(x,y,z,a,b,c):return Part.makeBox(a,b,c,V(x,y,z))
def mv(s,x=0,y=0,z=0):q=s.copy();q.translate(V(x,y,z));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
def hex_y(x,y,z,af,h):
 rr=af/math.sqrt(3);pts=[V(x+rr*math.cos(math.radians(30+i*60)),y,z+rr*math.sin(math.radians(30+i*60))) for i in range(6)]
 return Part.Face(Part.makePolygon(pts+[pts[0]])).extrude(V(0,h,0)).cut(cyl(3.1,h+2,x,y-1,z))
local=dict(LeadStud=cyl(3,120,80,-53.4,26),
 HandKnob=cyl(16,20,80,56.6,26).cut(cyl(3.1,10,80,56.6,26)),
 TopWasher=cyl(6,1.6,80,50,26).cut(cyl(3.2,3,80,49.5,26)),
 TopJamNut=hex_y(80,51.6,26,10,5))
staged=A.newDocument('C07CatalogCandidate');mesh={}
for n,s in local.items():
 o=staged.addObject('PartDesign::Feature',n);o.Shape=s;s.exportStep(str(T/(n+'.step')))
 vs,ts=s.tessellate(.12);mesh[n]=dict(vertices=[list(v) for v in vs],triangles=ts,group='FIXED' if n=='TopWasher' else 'LEAD',color='#b5c0c6',printed=False)
staged.recompute();staged.saveAs(str(T/'C07_Catalog_Candidate.FCStd'))
(T/'mesh.json').write_text(json.dumps(mesh,separators=(',',':')))
added={}
for k,off in [(1,-118.65),(2,121.35)]:
 for n,s in local.items():added[f'Cable{k}_{n}']=mv(s,z=off)
normals=[(math.cos(math.radians(a)),math.sin(math.radians(a))) for a in [210,330]]
def pose(n,s,r):
 if n not in M:return s
 g=M[n].get('subgroup','');t=r-8
 if g in ['DRIVE','TOP','TOPSCREW']:return mv(s,y=t)
 if g.startswith('JAW'):nx,ny=normals[int(g[-1])-1];return mv(s,nx*t,ny*t)
 return s
motion=[]
for r in [3+i*.5 for i in range(21)]:
 obs={n:pose(n,s,r) for n,s in S.items()};obs.update(added)
 for n,q in added.items():motion.append(dict(radius_mm=r,part=n,collisions=bad(q,{k:s for k,s in obs.items() if k!=n})))
# 10mm open wrench external envelope, 18mm head, 4mm thick, 8x50 handle.
# Nut flats face X and fit the10.2mm open jaw. No selected tool product implied.
tool=cyl(9,4,80,52.1,26).fuse(box(76,52.1,26,8,4,59))
tool=tool.cut(box(74.9,51,15,10.2,7,17))
tool_jaw_nut_overlap=vol(tool,local['TopJamNut'])
tool_jaw_stud_overlap=vol(tool,local['LeadStud'])
tools=[];rotation=[];selected=[]
for k,off in [(1,-118.65),(2,121.35)]:
 pivot=V(80,54.1,26+off);name=f'Cable{k}_TopJamNut'
 obs={**S,**added};obs.pop(name);obs.pop(f'Cable{k}_LeadStud')
 for a in range(0,360,30):
  q=mv(tool,z=off);q.rotate(pivot,V(0,1,0),a)
  approach=A.Rotation(V(0,1,0),a).multVec(V(0,0,1))
  for t in [0,10,30,60]:
   x=q.copy();x.translate(approach*t);tools.append(dict(clamp=k,angle_deg=a,approach_mm=t,collisions=bad(x,obs)))
 for t in range(61):
  selected.append(dict(clamp=k,angle_deg=0,approach_mm=t,collisions=bad(mv(tool,z=off+t),obs)))
 for a in range(0,360,15):
  q=added[name].copy();q.rotate(pivot,V(0,1,0),a)
  rotation.append(dict(clamp=k,angle_deg=a,collisions=bad(q,obs)))
depths=[]
for r in [3,8,13]:
 n=pose('Cable1_DriveNut',S['Cable1_DriveNut'],r).BoundBox
 depths.append(dict(radius_mm=r,drive_nut_y_mm=[n.YMin,n.YMax],stud_bottom_y_mm=-53.4,thread_beyond_nut_lower_face_mm=n.YMin-(-53.4)))
result=dict(classification='CALCULATED_CATALOG_CANDIDATE_ENVELOPE_NOT_REAL_THREAD_OR_LOCKING_TEST',sources=sources,
 replaced='Cable1_LeadScrewKnob and Cable2_LeadScrewKnob only; existing lower locknut/washer retained',
 local_geometry=dict(axis_xz_mm=[80,26],stud_y_mm=[-53.4,66.6],stud_length_mm=120,knob_y_mm=[56.6,76.6],knob_max_diameter_mm=32,knob_thread_insertion_mm=10,upper_jam_nut_y_mm=[51.6,56.6],upper_washer_y_mm=[50,51.6],existing_frame_bearing_y_mm=50),
 local_to_assembly_z_offsets_mm=[-118.65,121.35],motion=motion,upper_jam_tool_paths=tools,upper_jam_nut_rotation=rotation,drive_thread_range=depths,
 selected_tool_path_1mm_samples=selected,
 tool_jaw_fit=dict(nut_overlap_mm3=tool_jaw_nut_overlap,stud_overlap_mm3=tool_jaw_stud_overlap,jaw_width_mm=10.2,jaw_depth_end_z_mm=32),
 selected_tool_path=dict(angle_deg=0,approach_mm=[60,30,10,0],description='Approach along local +Z, then slide open jaw onto nut; both clamps checked.'),
 staged_files={q.name:sha(q) for q in T.glob('*') if q.is_file()},
 limits=['Exact purchased products, internal insert depth/chamfer, clamp torque and reversal locking need component and first-article checks.',
 'Knob is conservative full diameter32x20 envelope; solid stud is relieved by modeled thread-clearance bore, not modeled thread contact.',
 'Tool is declared18mm-wide/4mm-thick open-wrench envelope, not an actual purchased wrench or hand.',
 'Maintaining lower0.2mm axial clearance, coaxial printed bore fit, washer friction and repeated reversal were not physically tested.',
 'No RF clearance threshold or invariance is inferred from geometric non-overlap.'])
result['rejected_tool_poses']=[r for r in tools if r['collisions']]
result['all_tool_approaches_clear']=not result['rejected_tool_poses']
required_tools=[r for r in tools if r['angle_deg']==0 or r['approach_mm']==0]
result['pass_scoped']=all(not r['collisions'] for rs in [motion,required_tools,selected,rotation] for r in rs) and min(x['thread_beyond_nut_lower_face_mm'] for x in depths)>0 and tool_jaw_nut_overlap<1e-4 and tool_jaw_stud_overlap<1e-4
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'c07_catalog_candidate.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'MOTION',sum(bool(r['collisions']) for r in motion),'TOOLS',sum(bool(r['collisions']) for r in tools),'ROTATION',sum(bool(r['collisions']) for r in rotation),flush=True)
