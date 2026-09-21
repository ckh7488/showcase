"""Read-only independent audit; outputs stay beside this file.

Reintegrates the saved 2-D potential field, checks unchanged source bindings,
and derives an illustrative finite uniform-line example. No measured RF data,
full-board EM, PCB edit, tuning adoption or fabrication approval is implied.
"""
from pathlib import Path
import csv, hashlib, importlib.util, json, math, sys
import numpy as np
from scipy.constants import epsilon_0, c

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
OLD = ROOT/'reviews/fixture_impedance_20260918'
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old=json.loads((OLD/'results.json').read_text())
cross=json.loads((OLD/'cad_cross_section.json').read_text())
nom=old['cases'][2]

# The independent calculation uses edge flux directly, without constructing
# or solving the original sparse matrix. Boundary and dielectric assumptions
# deliberately match the saved model so it tests arithmetic, not model truth.
with np.load(OLD/'potential_field.npz') as raw:
    x,y,V,sig,gnd=[raw[k].copy() for k in ['x','y','V','signal','ground']]
xb=np.r_[x[0],(x[:-1]+x[1:])/2,x[-1]]
yb=np.r_[y[0],(y[:-1]+y[1:])/2,y[-1]]
wx,wy=np.diff(xb),np.diff(yb)
overlap=lambda lo,hi,a,b: np.maximum(0,np.minimum(hi,b)-np.maximum(lo,a))
xm=(x[:-1]+x[1:])/2; ym=(y[:-1]+y[1:])/2
solidx=(abs(xm)<=4)|((abs(xm)>=51)&(abs(xm)<=72))
fy=overlap(yb[:-1],yb[1:],-.8,.8)/wy
fx=(overlap(xb[:-1],xb[1:],-4,4)+overlap(xb[:-1],xb[1:],-72,-51)+overlap(xb[:-1],xb[1:],51,72))/wx
gx=(1+3.3*fy[:,None]*solidx[None,:])*wy[:,None]/np.diff(x)[None,:]
gy=(1+3.3*(abs(ym)<.8)[:,None]*fx[None,:])*wx[None,:]/np.diff(y)[:,None]
dx,dy=V[:,:-1]-V[:,1:],V[:-1,:]-V[1:,:]
flux=np.zeros_like(V)
flux[:,:-1]+=gx*dx;flux[:,1:]-=gx*dx
flux[:-1,:]+=gy*dy;flux[1:,:]-=gy*dy
cap=float(flux[sig].sum()*epsilon_0)
groundcap=float(flux[gnd].sum()*epsilon_0)
energycap=float(((gx*dx**2).sum()+(gy*dy**2).sum())*epsilon_0)
C0=nom['air']['C_F_per_m']; z=1/(c*math.sqrt(C0*cap)); er=cap/C0

rows=[]
for mhz in [.1,1,10,30,50,100,200,300,500]:
    # Current and voltage normalized by a1=1/sqrt(50), i.e. incident V=1.
    th=2*math.pi*mhz*1e6*.03375*math.sqrt(er)/c
    A=D=math.cos(th); B=1j*z*math.sin(th); C=1j*math.sin(th)/z
    den=A+B/50+50*C+D
    s11=(A+B/50-50*C-D)/den; s21=2/den
    vi=1+s11; ii=(1-s11)/50
    ic=ii*math.cos(th/2)-1j*vi*math.sin(th/2)/z
    hc=50*ic # actual centre current relative to assumed incident/50 current.
    inp=hc/(1-s11)
    # Independent backward evaluation from the matched load plane.
    ic_from_out=s21/50*math.cos(th/2)+1j*s21*math.sin(th/2)/z
    rows.append(dict(f_MHz=mhz,S11_dB=float(20*np.log10(abs(s11))),
        S21_dB=float(20*np.log10(abs(s21))),
        centre_current_ratio_real=float(hc.real),centre_current_ratio_imag=float(hc.imag),
        matched_ZT_error_dB=float(20*np.log10(abs(hc))),
        matched_ZT_phase_error_deg=float(np.angle(hc,deg=True)),
        input_current_ZT_error_dB=float(20*np.log10(abs(inp))),
        input_current_ZT_phase_error_deg=float(np.angle(inp,deg=True)),
        lossless_power_residual=float(abs(abs(s11)**2+abs(s21)**2-1)),
        centre_forward_backward_residual_A=float(abs(ic-ic_from_out))))

readpaths=[
 'docs/RF_CURRENT_PROBE_WHITEPAPER.md','docs/REQUIREMENTS.csv',
 'docs/G1_FIXTURE_REVIEW.md','docs/G2_BENCH_PROCEDURE.md','docs/G2_VERIFICATION.md',
 'docs/G3_PROTOTYPE_PACKAGE.md','docs/END_TO_END_REHEARSAL.md',
 'docs/PROTECTION_AND_PROCUREMENT.md','docs/ATLAS_A02_DESIGN_REVIEW.md',
 'analysis/README.md','analysis/rfcp.py','analysis/scope_tone.py',
 'analysis/metadata_template.json','analysis/scope_metadata_template.json',
 'analysis/fixture_model.py','analysis/fixture_impedance_20260918.py','analysis/extract_fixture_cross_section.py',
 'hardware/probe_head_A03/README.md','hardware/probe_head_A03/build_head.py',
 'hardware/probe_head_A03/design_geometry.json','hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_pcb',
 'hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_sch','hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_pro',
 'hardware/probe_head_A03/review/erc.json','hardware/probe_head_A03/review/drc.json',
 'hardware/probe_head_A03/review/saved_board_verification.json','hardware/probe_head_A03/review/fabrication_verification.json',
 'hardware/calibration_fixture_PCB_A02/README.md','hardware/calibration_fixture_PCB_A02/ASSEMBLY.md',
 'hardware/calibration_fixture_PCB_A02/build_pcb.py','hardware/calibration_fixture_PCB_A02/geometry.json',
 'hardware/calibration_fixture_PCB_A02/verification.json','hardware/calibration_fixture_PCB_A02/review/erc.json',
 'hardware/calibration_fixture_PCB_A02/review/drc.json','hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_pcb',
 'hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_sch',
 'hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_pro',
 'reviews/functionality_20260918/README.md','reviews/functionality_20260918/head_strict_erc.json',
 'reviews/functionality_20260918/head_drc.json','reviews/functionality_20260918/fixture_erc.json',
 'reviews/functionality_20260918/fixture_drc.json',
 'reviews/fixture_impedance_20260918/README.md','reviews/fixture_impedance_20260918/results.json',
 'reviews/fixture_impedance_20260918/cad_cross_section.json','reviews/fixture_impedance_20260918/runtime.json',
 'reviews/fixture_impedance_20260918/potential_field.npz',
 'viewer_A05/dist/manual.html','viewer_A05/assembly_template.html','viewer_A05/assembly_viewer.js',
 'viewer_A05/current_guide_steps.py','viewer_A05/guide_bom.py','viewer_A05/set_content.py',
 'docs/atlas/source/sections/calibration.html']
manifest=[]
for rel in readpaths:
    p=ROOT/rel
    manifest.append(dict(path=rel,bytes=p.stat().st_size,sha256=sha(p),
        review_scope='raw array numerical re-integration' if p.suffix=='.npz' else 'full document/source or structured saved evidence'))

head=json.loads((ROOT/'hardware/probe_head_A03/review/saved_board_verification.json').read_text())
binding={
 'head_pcb':sha(ROOT/'hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_pcb')==head['sha256']['RFCP_Head_A03_DRAFT.kicad_pcb'],
 'head_schematic':sha(ROOT/'hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_sch')==head['sha256']['RFCP_Head_A03_DRAFT.kicad_sch'],
 'fixture_pcb':sha(ROOT/'hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_pcb')==cross['board_sha256'],
 'model_source':sha(ROOT/'analysis/fixture_impedance_20260918.py')==old['source_sha256']}
res={
 'classification':'CALCULATED / recheck of saved SIMULATED cross-section and SYNTHETIC finite-line illustrations',
 'date':'2026-09-21','source_binding':binding,
 'raw_field_reintegration':dict(nodes=V.size,C_F_per_m=cap,energy_C_F_per_m=energycap,
   ground_charge_F_per_m=groundcap,charge_balance_relative=abs(cap+groundcap)/cap,
   saved_C_relative_difference=abs(cap/nom['dielectric']['C_F_per_m']-1),
   Z0_ohm=z,effective_er=er,max_free_node_flux=float(abs(flux[~(sig|gnd)]).max()),
   saved_potential_sha256=sha(OLD/'potential_field.npz')),
 'geometry_applicability':dict(uniform_length_mm=33.75,signal_return_gap_mm=47.9,
   length_to_gap_ratio=33.75/47.9,full_connector_separation_mm=68.7,
   note='Short central window only; end transitions/core/vias/loss/nearby structures omitted; no overall 242-ohm input claim'),
 'uniform_line_illustration':rows,
 'port_nonidentifiability_example':[
   dict(ideal_first_transformer_voltage_ratio=n,ideal_second_transformer_voltage_ratio=1/n,
        external_S11=0,external_S21=1,external_S22=0,internal_I_over_input_I=1/n)
   for n in [.5,1,2]],
 'nonidentifiability_note':'SYNTHETIC proof, not an A02 model. Two inverse ideal transformers have identity ABCD but different internal current; port S alone does not locate internal current without a structural model.',
 'limits':['No full-board EM solved','No ferrite/winding/launch model','No measured S-parameters',
   'No new matching component adopted','No new PCB or Gerber generated','No fixture redesign necessity proved'],
 'read_files':manifest,
 'raw_measurement_files':[str(p.relative_to(ROOT)) for p in (ROOT/'measurements/raw').rglob('*') if p.is_file()],
 'script_sha256':sha(Path(__file__))}
assert all(binding.values()),binding
assert res['raw_field_reintegration']['saved_C_relative_difference']<1e-10
assert max(r['centre_forward_backward_residual_A'] for r in rows)<1e-12
assert max(r['lossless_power_residual'] for r in rows)<1e-12
(OUT/'calculations.json').write_text(json.dumps(res,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (OUT/'uniform_line_illustration.csv').open('w',newline='',encoding='utf-8-sig') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(json.dumps({'binding':binding,'reintegration':res['raw_field_reintegration'],'illustration':rows,'files_read':len(manifest),'raw_measurements':res['raw_measurement_files']},ensure_ascii=False,indent=2))
