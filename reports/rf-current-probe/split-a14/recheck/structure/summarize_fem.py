from pathlib import Path
import re,json,hashlib,numpy as np
O=Path(__file__).resolve().parent;rows=[]
for p in sorted((O/'fem_bonded').glob('mesh_*/lid.dat')):
 text=p.read_text();force=re.search(r'total force .*?\n\s*\n\s*([^\n]+)',text).group(1)
 reaction=[float(x) for x in force.split()];s=[]
 for line in text.split('stresses (elem, integ.pnt.,sxx,syy,szz,sxy,sxz,syz)')[-1].splitlines()[2:]:
  v=line.split()
  if len(v)!=8:continue
  try:s.append([float(x) for x in v[2:]])
  except ValueError:continue
 a,b,c,d,e,f=np.array(s).T;vm=np.sqrt(((a-b)**2+(b-c)**2+(c-a)**2)/2+3*(d*d+e*e+f*f))
 r=json.loads((p.parent/'settings.json').read_text());r.update(reaction_N=reaction,integration_points=len(vm),max_von_mises_MPa=float(vm.max()),von_mises_percentiles_MPa=np.percentile(vm,[95,99,99.9]).tolist())
 rows.append(r)
assert len(rows)==2
result=dict(classification='SIMULATED_A14_IDEAL_BONDED_REFERENCE_NOT_BOLTED_JOINT_QUALIFICATION',models=rows,
 two_mesh_relative_change_percent=dict(reaction=abs(rows[0]['reaction_N'][1]-rows[1]['reaction_N'][1])/abs(rows[0]['reaction_N'][1])*100,peak_stress=abs(rows[0]['max_von_mises_MPa']-rows[1]['max_von_mises_MPa'])/rows[0]['max_von_mises_MPa']*100),
 limits=['Actual new A14 free upper halves fused only at nominal touching faces; represents perfect bonding.','No simulation of screw preload, washer contact, friction/slip, joint clearance, ferrite contact distribution, anisotropy or creep.',
 'E1500MPa is a nominal reference, not measured lot-specific printed material. Short-term tensile strength is not an allowable fatigue/creep stress.',
 'Two mesh sizes test one idealized boundary condition; no production acceptance or zero-warp conclusion.'])
(O/'fem_summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
