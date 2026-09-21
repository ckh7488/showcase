from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;P=R/'mechanical/assembly_A14_DRAFT'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
g=json.loads((O/'geometry_inspection.json').read_text());w=json.loads((O/'pcb_holder_normals.json').read_text());f=json.loads((O/'fem_summary.json').read_text())
assert g['native_sha256']==sha(P/'RFCP_A14_Integrated_DRAFT.FCStd')
assert g['source_sha256']==sha(R/'mechanical/build_assembly_A14.py')
assert w['source_stl_sha256']==sha(P/'parts/LowerCenter_A14_DRAFT.stl')
assert g['ideal_bonded_upper']['saved_reference_geometry_difference_mm3']<1e-5
assert all(x['step_sha256']==sha(O/'upper_A14_IDEAL_BONDED.step') for x in f['models'])
files=[p for p in O.rglob('*') if p.is_file() and p.name!='manifest.json' and '__pycache__' not in str(p)]
files += [R/'reviews/functionality_20260918/wall_scan_A14/summary.json']
rim=json.loads((O/'integrated_rim_verification.json').read_text())
assert rim['pass_geometry'] and rim['source_native_sha256']==g['native_sha256']
whole=json.loads((R/'reviews/functionality_20260918/wall_scan_A14/summary.json').read_text())
assert all(x['stl_sha256']==sha(P/'parts'/x['part']) for x in whole['parts'])
out=dict(classification='CALCULATED_AND_IDEAL_BONDED_SIMULATION_NOT_PHYSICAL_APPROVAL',native_sha256=g['native_sha256'],source_sha256=g['source_sha256'],
 source_identity_pass=True,pcb_holder_40000_samples_below_2mm=w['below_2_mm'],pcb_holder_min_sample_mm=w['minimum_sampled_mm'],pcb_holder_exact_section_flags=len(g['pcb_holder_thin_line_segments']),
 ideal_bonded_FEM_executed=True,physical_bolted_joint_or_creep_qualified=False,RF_qualified=False,
 integrated_rim_candidate_geometry_identity=True,whole_stl_samples=sum(x['samples'] for x in whole['parts']),whole_stl_below_1p5mm_samples=sum(x['below_1p5mm_samples'] for x in whole['parts']),
 files={str(p.relative_to(R)):sha(p) for p in files})
(O/'manifest.json').write_text(json.dumps(out,indent=2)+'\n');print('manifest',out['native_sha256'],len(files))
