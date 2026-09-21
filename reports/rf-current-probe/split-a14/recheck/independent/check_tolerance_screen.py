"""Declared independent-error tolerance screen, not a JLC GD&T guarantee."""
from pathlib import Path
import json,math,itertools,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[R/'mechanical/build_assembly_A14.py',R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd',Path(__file__)]
positions=[];hole_nom=5.4;hole_min=hole_nom-.3;shaft_max=4.0;r=(hole_min-shaft_max)/2
# Explicit sensitivity assumption, not a supplier promise of hole true position:
# each part's hole center is displaced independently +/-0.3 in both transverse axes.
for ax,ay,bx,by in itertools.product([-.3,.3],repeat=4):
 a=(ax,ay);b=(bx,by);sep=math.dist(a,b);axis=((ax+bx)/2,(ay+by)/2)
 positions.append(dict(hole_A_center_offset_mm=a,hole_B_center_offset_mm=b,common_bolt_axis_offset_mm=axis,
  center_separation_mm=sep,bolt_radial_clearance_each_hole_mm=r-sep/2,pass_both_holes=sep<=2*r))
gaps=[]
for name,gap in [('Lower arm open socket end',1.0),('Lower arm open socket height above seated datum',1.0),('Upper rear overlap end allowance',.8),('Base lap end allowance',.8)]:
 gaps.append(dict(feature=name,nominal_clearance_mm=gap,assumption='Each mating LENGTH dimension has +/-0.3mm independent error; no bow/form/position contribution',minimum_mm=gap-.6,maximum_mm=gap+.6,positive_minimum=gap-.6>0))
# Fastener margins are reported in the hardware report with exact product bounds.
# This independent example shows why nominally matching datums are not certified
# coaxial after several separate prints. It is not a measured alignment error.
stack=dict(interpretation='Illustrative independent dimension stack, not a predicted error or JLC alignment specification',
 dimensions_mm=dict(end_station_total_height=16,end_station_lap_height=10,central_lap_thickness=6,module_datum_to_axis=72),
 assumed_each_linear_dimension_error_mm=.3,
 seated_center_to_end_top_height_worst_mm=.3+.3+.3,
 two_independent_module_axis_height_difference_extra_mm=.3+.3,
 total_axis_difference_bound_example_mm=1.5,
 note='Correlations, seating contact, flatness, warpage, ferrite tolerance and nylon creep are not included. This bound cannot be used as a qualification limit or statistical estimate.')
result=dict(classification='CALCULATED_DECLARED_TOLERANCE_SENSITIVITY_NOT_WORST_CASE_CERTIFICATE',
 sources={str(p.relative_to(R)):sha(p) for p in paths},
 supplier_source=dict(url='https://jlc3dp.com/help/article/3d-printing-design-guideline',access_date='2026-09-21',section='10',nylon_sls_linear_up_to_100mm='.3mm',nylon_sls_linear_over_100mm='.4 percent',hole_tolerance_mm=.3,excludes='deformation, warping, sprayed or painted finishing'),
 diameter_screen=dict(hole_nominal_mm=hole_nom,hole_minimum_mm=hole_min,M4_maximum_shaft_envelope_mm=shaft_max,per_hole_radial_allowance_mm=r),
 relative_hole_cases=positions,pair_center_separation_allowance_mm=2*r,max_tested_pair_offset_mm=max(q['center_separation_mm'] for q in positions),minimum_radial_margin_mm=min(q['bolt_radial_clearance_each_hole_mm'] for q in positions),
 open_lap_dimension_gaps=gaps,axis_stack_example=stack,
 limits=['Supplier linear/hole tolerances are not true-position, parallelism, flatness or assembly-level guarantees.',
 'The independent +/-0.3 coordinate model is an explicit sensitivity assumption; supplier data does not establish this positional bound.',
 'The two length-error model for lap gaps does not assert that every mating face has independently +/-0.3 position tolerance.',
 'A positive hole-axis overlap does not prove all warped parts seat without load. Never force nylon joints flat with bolt torque.',
 'Measure first articles: actual hole/slot/nut fit, seated flatness, three axis heights, core mating and smooth full-range motion. RF repeatability remains a measurement requirement.'])
result['pass_declared_hole_and_length_screens']=all(r['pass_both_holes'] for r in positions) and all(r['positive_minimum'] for r in gaps)
(O/'tolerance_screen.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_declared_hole_and_length_screens'],'radial margin',result['minimum_radial_margin_mm'])
