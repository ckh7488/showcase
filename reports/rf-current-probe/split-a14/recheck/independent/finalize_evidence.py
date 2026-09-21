"""Bundle final independent scope and source bindings; does not run CAD tests."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda n:json.loads((O/n).read_text())
access=read('access_and_paths.json');catalog=read('saved_c07_equivalence.json');tol=read('tolerance_screen.json')
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd';native_sha=sha(P)
clear=lambda rows:all(not r['collisions'] for r in rows)
short_mount=[r for r in access['mount_screw_paths'] if r['path']=='candidate lift25 then outwardX']
rows=[access['tools'],access['serial_fastener_paths'],access['upper_M4x30_paths'],short_mount]
sources={str(p.relative_to(R)):sha(p) for p in [P,R/'mechanical/build_assembly_A14.py',R/'mechanical/verify_assembly_A14.py']}
bindings={name:(data['sources'].get(str(P.relative_to(R)))==native_sha) for name,data in [('access_and_paths.json',access),('saved_c07_equivalence.json',catalog),('tolerance_screen.json',tol)]}
scope_pass=all(clear(r) for r in rows) and catalog['pass_scoped'] and tol['pass_declared_hole_and_length_screens'] and all(bindings.values()) and access['sources_unchanged'] and catalog['sources_unchanged']
result=dict(classification='CALCULATED_SCOPED_INDEPENDENT_CAD_REVIEW_NOT_FABRICATION_APPROVAL',date='2026-09-21',sources=sources,
 final_source_bindings=bindings,pass_scoped=scope_pass,
 checked_counts=dict(new_joint_tool_poses=len(access['tools']),sequential_fastener_poses=len(access['serial_fastener_paths']),upper_M4x30_poses=len(access['upper_M4x30_paths']),selected_mount_screw_poses=len(short_mount),
  final_c07_newpart_motion_poses=len(catalog['actual_motion']),final_c07_nut_rotations=len(catalog['actual_nut_rotation']),final_c07_selected_tool_1mm_poses=len(catalog['actual_selected_tool_path_1mm_samples']),tolerance_corner_combinations=len(tol['relative_hole_cases'])),
 rejected_alternatives=dict(old_mount_up40=[r for r in access['mount_screw_paths'] if r['path']=='old straight up 40' and r['collisions']],c07_tool_approaches=catalog['rejected_tool_poses']),
 margins=dict(hole_radial_sensitivity_min_mm=tol['minimum_radial_margin_mm'],lap_length_sensitivity_min_mm=min(r['minimum_mm'] for r in tol['open_lap_dimension_gaps']),actual_nominal_shaft_protrusion=access['nominal_length_margins']),
 evidence={n:sha(O/n) for n in ['README.md','access_and_paths.json','tolerance_screen.json','saved_c07_equivalence.json','c07_catalog_candidate.json','check_access_and_paths.py','check_tolerance_screen.py','check_saved_c07.py','check_c07_catalog_candidate.py',Path(__file__).name]},
 historical_only=['access_and_paths_baseline.json','base_reverse_candidate.json'],
 first_article_not_executed=['Printed shape/warp/fit/coaxial alignment','Actual hand tools and assembly usability','Thread engagement/locking torque/friction/axial play','Creep/fatigue/repeated opening','RF calibration, insertion effects and repeatability'],
 notes=['Passed selected usable paths, not every possible tool orientation or removal direction.',
 'Local LowerCenter DFM reinforcement is permitted as a scene change and included in fresh actual saved-CAD C07 and joint-access tests.',
 'Catalogue STEP hashes and eight saved hardware shapes are checked by saved_c07_equivalence.json; actual saved-scene paths are freshly rerun. The candidate source hash is intentionally historical, not falsely relabeled current.',
 'Supplier dimensional tolerances do not establish the assumed independent hole position tolerance or final alignment.'])
(O/'current_evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print('FINAL_SCOPED_PASS',scope_pass,'NATIVE',native_sha)
