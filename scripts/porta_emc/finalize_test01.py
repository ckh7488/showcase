"""Finalize the bounded TEST01 screening, retaining the unresolved far-pair result."""
import hashlib,json
from pathlib import Path
import numpy as np

root=Path('reports/porta-test-01/records/connected-10')
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
d=read(root/'manifest.json');cases={c['id']:c for c in d['cases']}
assert set(cases)==set(d['expectedCases']) and len(cases)==4
decode=lambda w,k:abs(np.array(w[k]['real'])+1j*np.array(w[k]['imag']))
hashes=0;peaks=[];ratios=[]
for c in d['cases']:
    for f in c['files']:
        assert sha(root/c['id']/f['file'])==f['sha256'];hashes+=1
    for ns,w in c['windows'].items():
        dm=np.concatenate([decode(w,k) for k in ['HdiffNear','Hdiff']])
        assert np.unravel_index(dm.argmax(),dm.shape)==(1,190)
        peaks.append(dict(case=c['id'],window_ns=int(ns),peakDifferential_mVperV=float(dm.max()*1000),
            observation='input_side_pair_2',frequency_Hz=200e6))
for mesh in ['coarse','fine']:
    a,b=[cases[f'test01-{w}-{mesh}'] for w in ['same','mixed']]
    for ns in ['8','10','12']:
        for key in ['HdiffNear','Hdiff','HcommonNear','Hcommon']:
            x,y=[decode(c['windows'][ns],key) for c in [a,b]]
            if key=='HdiffNear':assert (y>x).all()
            if 'common' in key:assert (y<x).all()
            for pair in range(2):
                ratio=y[pair]/x[pair]
                ratios.append(dict(mesh=mesh,window_ns=int(ns),output=key,pair=pair+1,
                    at100MHz_mVperV=[float(x[pair,90]*1000),float(y[pair,90]*1000)],
                    ratioAt100MHz=float(ratio[90]),ratioRange=[float(ratio.min()),float(ratio.max())],
                    mixedLowerFrequencyCount=int(sum(y[pair]<x[pair])),storedFrequencyCount=191))
mesh_delta={}
for wiring in ['same','mixed']:
    mesh_delta[wiring]={mode:max(r['maxAbsoluteMagnitudeChange_VperV']*1000
        for w in d['comparisons']['mesh-'+wiring].values() for k in keys for r in w[k])
        for mode,keys in [('differential',['HdiffNear','Hdiff']),('common',['HcommonNear','Hcommon'])]}
verdict=dict(test='01',revision='screening-verdict-13',scientificVerdictComplete=True,
    status='screening_complete_with_far_pair2_unresolved',
    scope='Dominant local noise-output screening of a 120 mm coupon and two 20 mm fanouts, 10–200 MHz. Both power assignments, both connected meshes and 8/10/12 ns records.',
    conclusion='The largest differential output remains input-side pair 2 in all cases/windows. Mixed +/0 wiring increases both input-side differential outputs and reduces all four common-mode outputs in both meshes and all recorded windows.',
    unresolved='Far-side pair 2 does not have a mesh-stable wiring-effect direction. Label it inconclusive; do not repeat the initial coarse-only all-four-differential-outputs-increase statement as a final conclusion.',
    stoppingDecision='Enough for prioritizing the largest local output and identifying the input-side DM/CM tradeoff. Remaining far-side uncertainty does not change that priority. Further work on the far-side transfer is needed if it is used for a downstream-link decision; no exact all-channel convergence is claimed.',
    acceptedDifference='Mesh changes and short-window differences below are retained as observed differences, not universal tolerances. Common-mode voltage stays in the same broad scale. Small spectral features, close channel rankings, and the ambiguous far pair are not resolved as design priorities.',
    maxMeshMagnitudeChange_mVperV=mesh_delta,
    energyPolicy='All four runs reached their time cap before the -50 dB goal. Acceptance is for the scoped output judgment after the 8/10/12 ns comparisons; energy is not an independent universal pass line.',
    physicalLimits=['Actual braid loss, pair pitches/phases and device loads are assumed or omitted.',
        'Changed power fanout is included; cable-interior and fanout contributions are not isolated.',
        'No measured sensor noise, 20 m link, transformer/PHY or CRC outcome is inferred.'],
    evidenceHashesChecked=hashes,independentScalarOutputsChecked=sum(c['numericalVerification']['independentScalarOutputs'] for c in d['cases']),
    sources=[dict(id=c['id'],analysis_sha256=sha(root/c['id']/'analysis.json'),
        response_sha256=sha(root/c['id']/'response.json'),source_sha256=c['input']['script_sha256'],
        lastReportedEnergy_dB=c['lastReportedEnergy_dB']) for c in d['cases']],
    peaks=peaks,wiringComparisons=ratios)
(root/'screening-verdict.json').write_text(json.dumps(verdict,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(status=verdict['status'],hashesChecked=hashes,peakChecks=len(peaks),comparisons=len(ratios),maxMeshDelta_mVperV=mesh_delta)))
