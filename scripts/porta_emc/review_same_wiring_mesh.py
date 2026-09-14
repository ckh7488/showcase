"""Bounded screening acceptance for the current wiring's two connected meshes."""
import hashlib
import json
from pathlib import Path
import numpy as np

root = Path('reports/porta-test-01/records/connected-10')
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
d = read(root/'manifest.json')
byid = {c['id']: c for c in d['cases']}
cases = [byid['test01-same-'+mesh] for mesh in ['coarse','fine']]
decode = lambda w,k: np.array(w[k]['real']) + 1j*np.array(w[k]['imag'])
hashes = 0
for c in d['cases']:
    for f in c['files']:
        assert sha(root/c['id']/f['file']) == f['sha256']
        hashes += 1

checks = []
for c in cases:
    for ns,w in c['windows'].items():
        dm = np.concatenate([abs(decode(w,k)) for k in ['HdiffNear','Hdiff']])
        channel,fi = np.unravel_index(dm.argmax(),dm.shape)
        rank = np.argsort(-dm[:,90]).tolist()
        assert channel == 1 and fi == 190
        assert rank == [1,3,0,2]
        checks.append(dict(case=c['id'],window_ns=int(ns),
            maximumDifferential_mVperV=float(dm.max()*1000),
            maximumChannel='input_side_pair_2',maximumFrequency_Hz=c['frequency_Hz'][fi],
            channelOrderAt100MHz=rank))

comparison = d['comparisons']['mesh-same']
maximum = {}
for mode,keys in [('differential',['HdiffNear','Hdiff']),('common',['HcommonNear','Hcommon'])]:
    maximum[mode] = max(row['maxAbsoluteMagnitudeChange_VperV']*1000
        for ns in comparison for key in keys for row in comparison[ns][key])

review = dict(revision='same-wiring-mesh-review-12',
    scientificVerdictComplete=False,
    scopeStatus='current_wiring_screening_accepted_mixed_wiring_mesh_pending',
    scope='120 mm coupon plus 20 mm fanout at each end; current +/+ and 0/0 power assignment; 10–200 MHz stored points; both Ethernet pairs and ends.',
    geometry='Length direction 0.4 mm in both; transverse grid 0.20 → 0.16 mm. Physical geometry, source and loads held fixed.',
    decision='The current-wiring response is sufficient for screening the broad output scale and largest observed differential channel. Do not extend this acceptance to the uncompleted mixed-wiring mesh comparison.',
    evidence='The band maximum remains input-side pair 2 at 200 MHz for both meshes and each 8/10/12 ns record. The four differential outputs at 100 MHz keep the same ordering.',
    allowedDifference='Across the recorded band, all four outputs and the three observation windows, maximum mesh-induced magnitude changes are recorded below. Common-mode channels remain similar in scale; their close rankings and small differential spectral features are not resolved as design priorities.',
    maxMeshMagnitudeChange_mVperV=maximum,
    timeWindowPolicy='8/10/12 ns windows support the broad scale and peak-channel judgment, not exact convergence of every frequency point.',
    energyPolicy='Both runs reached their time cap before the -50 dB energy target. This is accepted for the stated screening scope based on output comparisons, not treated as a universal energy tolerance.',
    sources=[dict(id=c['id'],analysis_sha256=sha(root/c['id']/'analysis.json'),
        solverResponse_sha256=sha(root/c['id']/'response.json'),
        source_sha256=c['input']['script_sha256'],lastReportedEnergy_dB=c['lastReportedEnergy_dB']) for c in cases],
    evidenceHashesChecked=hashes,
    independentScalarOutputsChecked=sum(c['numericalVerification']['independentScalarOutputs'] for c in d['cases']),
    peakAndOrderingChecks=checks,meshComparisons=comparison,
    unresolved=['Mixed-wiring fine-grid run is active; no final wiring-effect acceptance yet.',
        'Cable-interior versus changed fanout coupling has not been separated.',
        'No actual 20 m link, transformer/PHY termination, measured noise or CRC outcome is included.'])
(root/'mesh-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(status=review['scopeStatus'],hashesChecked=hashes,peakChecks=len(checks),maxMeshDelta_mVperV=maximum)))
