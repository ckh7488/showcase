"""Bind document audit to final source, retaining all original test source hashes."""
from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda n:json.loads((O/n).read_text())
chain_path=O.parent/'cad_hardware/final_head_delta_verification.json';chain=json.loads(chain_path.read_text())
guide=read('guide_contract.json');pcb=read('selected_pcb_path.json');f12=read('follower_max.json');f05=read('f05_stud_knob.json');washer=read('lower_washer_candidates.json');native=sha(P)
binding=chain['sources'][str(P.relative_to(R))]==native and chain['pass_nominal'] and chain['sources_unchanged']
guide_current=all(sha(R/n)==h for n,h in guide['sources'].items())
original_report_scopes={n:dict(sha256=sha(O/n),native_sha256=r['sources'][str(P.relative_to(R))],scoped_pass=r['pass_scoped'],sources_unchanged_when_run=r['sources_unchanged']) for n,r in [('selected_pcb_path.json',pcb),('follower_max.json',f12),('f05_stud_knob.json',f05)]}
result=dict(classification='CALCULATED_SCOPED_DOCUMENT_ASSEMBLY_REVIEW_NO_PHYSICAL_TEST',date='2026-09-21',final_native_sha256=native,
 final_geometry_chain=dict(path=str(chain_path.relative_to(R)),sha256=sha(chain_path),pass_nominal=chain['pass_nominal'],binding_matches_current_native=binding,
  note='Mechanics-owned final saved CAD audit: old geometry preserved except selected catalogue hardware. New F05 unit has direct saved-CAD extraction checks and prior-path bounds checks.'),
 original_report_scopes=original_report_scopes,
 latest_guide_contract=dict(path='guide_contract.json',sha256=sha(O/'guide_contract.json'),step_count=guide['step_count'],pass_scoped=guide['pass_scoped'],all_source_hashes_current=guide_current,
  node_motion_cases=len(guide['actual_JS_head_unit_motion'])),
 resolved=dict(PCB_old_route='30deg/1.6mm blocked by added roof;45deg/4mm362poses clear without CAD edits',
  F11='Fabory lower washer1.6mm + nyloc down0.8mm adopted; local candidate197poses passed and mechanics verified actual saved change',
  F12='NBK maximum shoulder20.25mm146poses clear; threads/fillets/friction need first-article checks',
  F05='70mm stud/through-knob/jamnut/washer328candidateposes+26outside-spannerposes clear;6.9mm nominal tip projection',
  guide='A14 split subassemblies, rear/up paths, short-lift mount path, new shaft preassembly,4-object closure motion and separate upper/lower wrench roles aligned'),
 inherited_scope_notes=['PCB insertion occurs before head screw installation; its tested LowerCenter/core/PCB/rear-nut objects are unchanged by final F05 addition.',
 'F12 and lower-washer tests are on the bare independent C07 module, before mounting near the probe.',
 'Candidate and failed diagnostic reports retain original native hashes; no earlier test is relabeled as a new full-assembly run.'],
 historical_diagnostics=['sequence_checks.json (old PCB path fails; other new insertion rows pass)','pcb_adjusted_path.json','pcb_motion_search.json','head_handknob_candidates.json (50/55/60mm single-piece alternatives, not selected)'],
 physical_not_run=['Actual hands and support during small-nut assembly','Printed warp/form/fit and coaxial alignment','Actual thread/fillet/shoulder seating and incomplete tip threads','Torque, jamnut locking, axial drag, creep and endurance','RF calibration, insertion and repeatability'])
result['pass_scoped']=binding and guide_current and guide['pass_scoped'] and all(x['scoped_pass'] and x['sources_unchanged_when_run'] for x in original_report_scopes.values()) and washer['candidates']['B_OD12_t1_6']['pass_nominal']
result['evidence_hashes']={p.name:sha(p) for p in O.glob('*') if p.is_file() and p.suffix in ['.py','.md','.json'] and p.name!='current_evidence.json'}
(O/'current_evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'FINAL_NATIVE',native,'GUIDE_STEPS',guide['step_count'])
