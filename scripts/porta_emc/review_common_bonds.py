"""Review completed shield conditions without an automatic convergence verdict."""
import argparse, hashlib, json
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--records',default='reports/porta-test-02/records/common-14');a=p.parse_args()
root=Path(a.records);manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
decode=lambda w,k:np.array(w[k]['real'])+1j*np.array(w[k]['imag'])
cases=manifest['cases'];baseline=next(c for c in cases if c['input']['shieldBondCase']=='floating')
freq=np.array(baseline['frequency_Hz']);assert freq[90]==100e6
summary=[];sources=[];checked=0;current_checks=0
base_model=json.loads((root/baseline['id']/'model.json').read_text())
for c in cases:
    folder=root/c['id'];model=json.loads((folder/'model.json').read_text())
    assert model['wires']==base_model['wires'] and model['sourcePorts']==base_model['sourcePorts']
    assert model['referencePlate']==base_model['referencePlate']
    assert sha(folder/'mesh.json')==sha(root/baseline['id']/'mesh.json')
    for f in c['files']:assert sha(folder/f['file'])==f['sha256'];checked+=1
    sources.append(dict(id=c['id'],analysis_sha256=sha(folder/'analysis.json'),response_sha256=sha(folder/'response.json')))
    rows=[]
    for ns,w in c['windows'].items():
        vin=decode(w,'Vin');ratio=abs(decode(w,'inputDM_over_CM'));k=int(ratio.argmax())
        cm=np.concatenate([abs(decode(w,key)) for key in ['HcommonNear','Hcommon']])
        dm=np.concatenate([abs(decode(w,key)) for key in ['HdiffNear','Hdiff']])
        rows.append(dict(window_ns=int(ns),commonAt100MHz_VperV=cm[:,90].tolist(),
            differentialAt100MHz_mVperV=(dm[:,90]*1000).tolist(),
            sourceDifferenceOverCommonAt100MHz=float(ratio[90]),sourceDifferenceOverCommonPeak=float(ratio[k]),
            sourceDifferencePeakFrequency_Hz=float(freq[k]),directBusDifferenceOverCommonAt100MHz=float(abs(decode(w,'inputBusDM_over_CM')[90])),
            inputSpectrumMinimum_Vs=float(abs(vin).min()),inputSpectrumAt100MHz_Vs=float(abs(vin[90])),
            commonPeak_VperV=cm.max(axis=1).tolist(),commonPeak_Hz=freq[cm.argmax(axis=1)].tolist(),
            differentialPeak_mVperV=(dm.max(axis=1)*1000).tolist(),differentialPeak_Hz=freq[dm.argmax(axis=1)].tolist(),
            bondCurrentAt100MHz_mAperV=(1000*abs(decode(w,'HshieldCurrent')[:,90])).tolist() if c['input']['shieldBonds'] else []))
        for bi,bond in enumerate(c['input']['shieldBonds']):
            raw=np.loadtxt(folder/bond['currentProbe'],comments='%');raw=raw[raw[:,0]<=int(ns)*1e-9];t,values=raw.T
            for fi in [0,90,190]:
                scalar=sum(v*np.exp(-2j*np.pi*freq[fi]*t0) for t0,v in zip(t,values))*2*(t[1]-t[0])/vin[fi]
                np.testing.assert_allclose(scalar,decode(w,'HshieldCurrent')[bi,fi],rtol=1e-10,atol=1e-13);current_checks+=1
    summary.append(dict(id=c['id'],energy_dB=c['lastReportedEnergy_dB'],windows=rows,timeComparisons=c['timeComparisons']))

comparisons=[]
for c in cases:
    if c['id']==baseline['id']:continue
    for ns,w in c['windows'].items():
        for key in ['HcommonNear','Hcommon','HdiffNear','Hdiff']:
            values=abs(decode(w,key));base=abs(decode(baseline['windows'][ns],key));ratio=values/base
            comparisons.append(dict(case=c['id'],window_ns=int(ns),output=key,
                ratioAt100MHz=ratio[:,90].tolist(),ratioMin=ratio.min(axis=1).tolist(),ratioMax=ratio.max(axis=1).tolist(),
                lowerPointCount=(ratio<1).sum(axis=1).tolist(),totalFrequencyPoints=len(freq)))

review=dict(revision='common-bond-comparison-16',scientificVerdictComplete=False,
    status='bond_comparison_time_and_input_review_pending',sources=sources,evidenceHashesChecked=checked,
    independentOutputChecks=sum(c['numericalVerification']['independentScalarOutputs'] for c in cases),
    independentInputChecks=sum(c['inputDiagnostics']['independentScalarOutputs'] for c in cases),
    independentBondCurrentChecks=current_checks,geometryComparison='Same wire paths, source ports, reference plate and mesh verified; shield straps differ.',
    finding='At 100 MHz both bonded cases reduce common-mode pickup but increase differential pickup versus floating in all sampled windows. Both-end and near-only differential differences are smaller than the observed time-window changes. Large upper-band loaded-voltage-normalized peaks require separate source-reference and time review.',
    acceptance='Three shield conditions available; no final TEST02 acceptance. Preserve loaded-voltage results, inspect the source-reference comparison, and complete the ongoing near-bond longer-record check before deciding the remaining time/grid scope.',
    cases=summary,comparisons=comparisons)
target=root/'bond-comparison-review.json';target.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:review[k] for k in ['status','evidenceHashesChecked','independentOutputChecks','independentInputChecks','independentBondCurrentChecks']}))
for row in summary:print(row['id'],json.dumps(row['windows'][-1]))
