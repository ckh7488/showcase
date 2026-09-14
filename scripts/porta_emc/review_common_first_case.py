"""Review the measured input and time sensitivity of the first TEST02 case."""
import json,hashlib
from pathlib import Path
import numpy as np
r=Path('reports/porta-test-02/records/common-14');d=json.loads((r/'manifest.json').read_text(encoding='utf-8'))
c=next(c for c in d['cases'] if c['id']=='test02-floating')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for f in c['files']:assert sha(r/c['id']/f['file'])==f['sha256']
rows=[]
for ns,w in c['windows'].items():
    z=lambda k:abs(np.array(w[k]['real'])+1j*np.array(w[k]['imag']))
    rows.append(dict(window_ns=int(ns),sourceDifferenceOverCommonAt100MHz=float(z('inputDM_over_CM')[90]),
        sourceDifferenceOverCommonPeak=float(z('inputDM_over_CM').max()),
        directBusDifferenceOverCommonAt100MHz=float(z('inputBusDM_over_CM')[90]),
        directBusDifferenceOverCommonPeak=float(z('inputBusDM_over_CM').max()),
        differentialAt100MHz_mVperV=np.concatenate([z(k)[:,90] for k in ['HdiffNear','Hdiff']]).tolist(),
        commonAt100MHz_VperV=np.concatenate([z(k)[:,90] for k in ['HcommonNear','Hcommon']]).tolist()))
    rows[-1]['differentialAt100MHz_mVperV']=[x*1000 for x in rows[-1]['differentialAt100MHz_mVperV']]
review=dict(revision='common-first-case-14',scientificVerdictComplete=False,status='floating_input_and_data_checked_bond_comparison_pending',
    sources=[dict(id=c['id'],analysis_sha256=sha(r/c['id']/'analysis.json'),response_sha256=sha(r/c['id']/'response.json'))],
    evidenceHashesChecked=len(c['files']),independentOutputChecks=c['numericalVerification']['independentScalarOutputs'],
    independentInputChecks=c['inputDiagnostics']['independentScalarOutputs'],
    finding='Floating shield is present. At 100 MHz the Ethernet common-mode outputs are about 0.9–1.1 times the actual common-mode input across the sampled windows. Differential outputs are millivolts per volt and time-sensitive.',
    inputDefinition='Normalize each window by actual (V7+V8)/2. Record V7-V8 and the separate direct power-bus voltage V3. Different integration paths are not assumed identical.',
    acceptance='No shield winner or final TEST02 acceptance yet. Wait for the two bonded cases and compare their effects against the observed time changes; perform further time/grid work if it changes the intended noise judgment.',
    warningAgainstOverinterpretation='Do not equate small source imbalance with an exactly pure common-mode input or use this first short-coupon case as a 20 m link conclusion.',
    windows=rows,timeComparisons=c['timeComparisons'])
(r/'first-condition-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(status=review['status'],evidenceHashesChecked=review['evidenceHashesChecked'],inputChecks=review['independentInputChecks'])))
