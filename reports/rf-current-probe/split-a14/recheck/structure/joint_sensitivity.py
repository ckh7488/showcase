from pathlib import Path
import math,json
O=Path(__file__).resolve().parent
g=json.loads((O/'geometry_inspection.json').read_text())
E=1500.;b=18.;t=2.4;L=63.;delta=1.8
k=2*E*b*t**3/L**3;force=k*delta
geom={r['a']+' / '+r['b']:r for r in g['joint_contacts']}
settlement=[dict(settlement_mm=s,remaining_deflection_mm=max(0,delta-s),ideal_force_N=k*max(0,delta-s),remaining_force_fraction=max(0,delta-s)/delta) for s in [0,.1,.3,.6,1.,1.8]]
preloads=[]
for od in [9,10]:
 area=math.pi/4*(od**2-4.4**2)
 for preload in [25,50,100,250]:
  preloads.append(dict(washer_outer_diameter_mm=od,illustrative_preload_per_screw_N=preload,washer_annulus_area_mm2=area,average_washer_pressure_MPa=preload/area,
   M4_nominal_tensile_stress_area_mm2=8.78,average_screw_tension_MPa=preload/8.78))
# In a lower arm lap the closure load acts outside the joint. This is an
# illustrative friction-only budget, not a complete contact/bolt force model.
friction=[]
F=force/2;moment=F*(111-72)
for mu in [.1,.2,.3]:
 for preload in [25,50,100]:
  capacity=2*mu*preload*6
  friction.append(dict(friction_coefficient_assumed=mu,preload_per_bolt_N=preload,two_bolts_12mm_spacing_friction_moment_Nmm=capacity,closure_arm_moment_Nmm=moment,ratio=capacity/moment))
report=dict(classification='CALCULATED_IDEAL_BEAM_AND_JOINT_SENSITIVITY_NOT_STRENGTH_APPROVAL',native_sha256=g['native_sha256'],
 ideal_beam=dict(E_MPa=E,width_mm=b,thickness_mm=t,span_mm=L,delta_mm=delta,stiffness_N_per_mm=k,total_force_N=force,peak_ideal_strain=3*t*delta/L**2,peak_ideal_stress_MPa=E*3*t*delta/L**2),
 seating_settlement_sensitivity=settlement,illustrative_fastener_preloads=preloads,illustrative_lower_joint_friction_budget=friction,
 service_average_support_pressure=dict(lower_lap_each_308mm2_MPa=F/308,upper_shelf_232mm2_if_full_total_force_MPa=force/232),
 limits=['Preloads and friction coefficients are chosen scenarios, not measured values or tightening-torque instructions.',
 'The friction-only check omits distributed surface contact and screw-shank bearing. It demonstrates preload dependence, not joint failure or an exact safety factor.',
 'The 63mm leaf formula assumes fixed-guided behavior; the new FEM bonded reference is separate.',
 'A compliant/misaligned joint can change seating before any plastic strength limit is reached. Creep can relax preload and contact force.',
 'Bench support carries the base in normal use; carrying by one disconnected station or prying unsupported joints is not a qualified load case.'])
(O/'joint_sensitivity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report['ideal_beam'],indent=2))
