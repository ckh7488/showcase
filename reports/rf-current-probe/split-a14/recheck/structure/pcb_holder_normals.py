from pathlib import Path
import json,hashlib,numpy as np,trimesh
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
p=R/'mechanical/assembly_A14_DRAFT/parts/LowerCenter_A14_DRAFT.stl'
m=trimesh.load_mesh(p);m.apply_translation([-86,-72,-12])
c=m.triangles_center
indices=np.where((abs(c[:,0])<=25)&(c[:,1]>=-72)&(c[:,1]<=-30)&(c[:,2]>=-10)&(c[:,2]<=20))[0]
sub=m.submesh([indices],append=True,repair=False)
pts,faces=trimesh.sample.sample_surface(sub,40000,seed=20260921)
normals=sub.face_normals[faces];directions=-normals;orig=pts+directions*1e-4
loc,ir,it=m.ray.intersects_location(orig,directions,multiple_hits=True)
dist=np.linalg.norm(loc-orig[ir],axis=1);good=dist>1e-5
near=np.full(len(pts),np.inf);np.minimum.at(near,ir[good],dist[good]);near+=1e-4
rows=[dict(point_native_mm=pts[i].tolist(),normal=normals[i].tolist(),thickness_mm=float(near[i])) for i in np.flatnonzero(near<2-1e-5)]
out=dict(classification='CALCULATED_TARGETED_STL_NORMAL_CHORD_SAMPLING',source_stl_sha256=hashlib.sha256(p.read_bytes()).hexdigest(),native_translation_mm=[-86,-72,-12],
 region_mm=dict(x=[-25,25],y=[-72,-30],z=[-10,20]),samples=len(pts),minimum_sampled_mm=float(near.min()),below_2_mm=len(rows),below_1p5_mm=int(sum(near<1.5)),no_exit=int(sum(~np.isfinite(near))),
 flags=rows,limitations=['Surface sampling is not a global minimum-wall proof or a reproduction of JLC proprietary DFM.','Normal chords near rounded bore edges need local geometry interpretation.'])
(O/'pcb_holder_normals.json').write_text(json.dumps(out,indent=2)+'\n');print({k:v for k,v in out.items() if k!='flags'})
