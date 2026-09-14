"""Verify what existing ATLAS PCB results cover before scheduling PCB work."""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--atlas',required=True);p.add_argument('--out',required=True);a=p.parse_args();root=Path(a.atlas);out=Path(a.out)
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
folder=root/'reports/porta-pcb/records/tx-recheck';summary=read(folder/'summary.json');phy=read(root/'reports/porta-pcb/records/phy-initial-summary.json')
checks=[]
for level,case in [('base',summary['cases'][0]),('fine',summary['cases'][1])]:
    file=folder/f'{level}-fem-results.npz';data=np.load(file);assert sha(file)==case['result_sha256'];assert data['s'].shape==(1,4,4);assert np.isclose(data['f'][0],100e6)
    pairs=[]
    for pair,index in [('TX',0),('RX',1)]:
        reflection=float(-20*np.log10(abs(data['s'][0,index,index])));transmission=float(-20*np.log10(abs(data['s'][0,index+2,index])))
        expected=case['rows'][0]['pairs'][pair];assert np.isclose(reflection,expected['t2_return_loss_db']);assert np.isclose(transmission,expected['t2_to_m12_insertion_loss_db'])
        pairs.append({'pair':pair,'returnLoss_dB':reflection,'insertionLoss_dB':transmission})
    checks.append({'mesh':level,'frequency_Hz':float(data['f'][0]),'S_shape':list(data['s'].shape),'ports':['T2_TX_diff','T2_RX_diff','M12_TX_diff','M12_RX_diff'],'pairs':pairs})
sources=['reports/porta-pcb/records/tx-recheck/summary.json','reports/porta-pcb/records/tx-recheck/base-fem-results.npz','reports/porta-pcb/records/tx-recheck/fine-fem-results.npz','reports/porta-pcb/records/phy-initial-summary.json','reports/porta-pcb/assessment.md']
result={'revision':'pcb-reuse-review-07','date':'2026-09-13','newPCBSolverRun':False,'verifiedSavedMatrices':checks,
    'scope':summary['geometry'],'validationRetained':summary['validation'],'limitsRetained':summary['remaining_model_limits'],
    'reuseDecision':{'existing100MHzDifferentialSI':'Reuse both saved TX/RX meshes and geometry; no repeat of the same four-port SI solve.',
      'commonModeInput':'Not present in the saved four-differential-port matrix. Common-mode-to-differential conversion requires common-mode input/reference/return paths; relabeling these four ports cannot supply it.',
      'T2AndMountedLoads':'Not included in existing PCB field solves. Add electrical models only when integrating measured or assumed noise with the PCB.',
      'PHYSide':'Reuse saved PCB geometry and initial differential evidence. Individual-port raw traces may permit additional output combinations for the original excitation, but a common-mode excitation response is not established by this summary.',
      'immediateNext':'Complete the corrected short-cable TEST01 before TEST02 shield/common-mode tests. PCB TEST03 uses this reuse audit; full20m model is TEST04.'},
    'phyScope':phy['model_scope'],'phyValidation':phy['numerical_validation'],
    'evidence':[{'file':f,'sha256':sha(root/f)} for f in sources]}
out.parent.mkdir(exist_ok=True,parents=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'verifiedMatrices':checks,'repeatPCBSolve':False}))
