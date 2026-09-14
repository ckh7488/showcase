"""Bounded first mesh finding; the matched floating fine comparison is pending."""
from pathlib import Path
import json
import numpy as np
from collect_cable_results import READ, SHA, DEC, KEYS
r=Path('reports/porta-test-02/records/mesh-19');m=READ(r/'manifest.json');d=READ(r/'drive-reference.json');check=READ(r/'mesh-data-review.json')
assert check['manifest_sha256']==SHA(r/'manifest.json') and check['drive_sha256']==SHA(r/'drive-reference.json')
for source in check['sources']:
    assert source['analysis_sha256']==SHA(r/source['id']/'analysis.json')
    c=READ(r/source['id']/'analysis.json')
    for f in c['files']:assert f['sha256']==SHA(r/source['id']/f['file'])
near=d['cases']['test02-near']['windows'];fine=d['cases']['test02-near-fine']['windows'];rows=[]
for ns in near:
    for case,windows in [('coarse',near),('fine',fine)]:
        w=windows[ns];cm=np.concatenate([abs(DEC(w,k)) for k in ['HcommonNear','Hcommon']]);dm=np.concatenate([abs(DEC(w,k)) for k in ['HdiffNear','Hdiff']])
        rows.append({'case':case,'window_ns':int(ns),'commonAt100MHz_VperV':cm[:,90].tolist(),'differentialAt100MHz_mVperV':(dm[:,90]*1000).tolist(),'commonBandPeak_VperV':float(cm.max()),'differentialBandPeak_mVperV':float(dm.max()*1000)})
delta={k:max(float(abs(abs(DEC(fine[ns],k))-abs(DEC(near[ns],k))).max()) for ns in near) for k in KEYS}
out={'revision':'near-mesh-first-review-19','scientificVerdictComplete':False,'nearMeshScaleAccepted':True,'matchedBondChangeComplete':False,
     'sourceDataReviewSHA256':SHA(r/'mesh-data-review.json'),'scope':'One-end bond only, transverse0.20->0.16mm with axial0.4mm unchanged; same8/10/12ns records and source reference.',
     'accepted':'Near-bond differential/common output scale is sufficiently stable for the large-effect screening. Absolute fine structure and small near/both rankings are outside this scope.',
     'remaining':'Need floating-fine to review the same-grid floating/near change. No overallTEST02 mesh verdict yet.',
     'maxAbsoluteMagnitudeChanges_VperV':delta,'values':rows,
     'note':'At8ns some small near-end common-mode values differ by up to40%; the absolute differences stay below0.014V/V. This is not a universal percentage convergence claim.'}
(r/'near-mesh-verdict.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'maxDMChange_mVperV':1000*max(delta[k] for k in ['HdiffNear','Hdiff']),'maxCMChange_VperV':max(delta[k] for k in ['HcommonNear','Hcommon']),'scopeAccepted':out['nearMeshScaleAccepted'],'wholeTestComplete':False}))
