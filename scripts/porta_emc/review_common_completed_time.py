"""Accept a bounded time-screening scope; do not claim TEST02 mesh completion."""
import hashlib,json
from pathlib import Path
import numpy as np
root=Path('reports/porta-test-02/records/time-18');path=root/'time-review.json';d=json.loads(path.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();dec=lambda w,k:np.array(w[k]['real'])+1j*np.array(w[k]['imag'])
assert d['snapshotOfRunningSolve'] is False and d['completedRun']['solverRun'] is True
assert d['snapshotCutoff_ns']==24 and set(d['windows'])=={'12','16','20','24'}
for f in d['files']:assert sha(root/d['evidenceFolder']/f['file'])==f['sha256']
assert sha(root/d['evidenceFolder']/'completed-response.json')==d['completedRun']['response_sha256']
assert max(x['maxAbsoluteTraceDifference'] for x in d['old12nsTraceCompatibility'])==0
summary=[];changes=[]
for ns,w in d['windows'].items():
    for basis,v in [('loaded',w),('drive',w['drive'])]:
        cm=np.concatenate([abs(dec(v,k)) for k in ['HcommonNear','Hcommon']]);dm=np.concatenate([abs(dec(v,k)) for k in ['HdiffNear','Hdiff']])
        summary.append(dict(window_ns=int(ns),reference=basis,commonAt100MHz_VperV=cm[:,90].tolist(),differentialAt100MHz_mVperV=(1000*dm[:,90]).tolist(),
            commonPeak_VperV=cm.max(axis=1).tolist(),differentialPeak_mVperV=(1000*dm.max(axis=1)).tolist()))
for start,end in [('12','16'),('16','20'),('20','24'),('12','24')]:
    for basis in ['loaded','drive']:
        x=d['windows'][start];y=d['windows'][end]
        if basis=='drive':x=x['drive'];y=y['drive']
        changes.append(dict(start_ns=int(start),end_ns=int(end),reference=basis,maxAbsoluteMagnitudeChanges={k:abs(abs(dec(y,k))-abs(dec(x,k))).max(axis=1).tolist() for k in ['HcommonNear','Hcommon','HdiffNear','Hdiff']}))
normal=Path('reports/porta-test-02/records/common-14');m=json.loads((normal/'manifest.json').read_text(encoding='utf-8'));drive=json.loads((normal/'drive-reference.json').read_text(encoding='utf-8'))
floating=next(c for c in m['cases'] if c['id']=='test02-floating')
# Later near-only windows are a robustness check, not matched long-window A/B runs.
for ns,w in d['windows'].items():
    for oldns,old in floating['windows'].items():
        for basis in ['loaded','drive']:
            v=w if basis=='loaded' else w['drive'];ref=old if basis=='loaded' else drive['cases']['test02-floating']['windows'][oldns]
            for key in ['HcommonNear','Hcommon']:assert np.all(abs(dec(v,key)[:,90])<abs(dec(ref,key)[:,90]))
            for key in ['HdiffNear','Hdiff']:assert np.all(abs(dec(v,key)[:,90])>abs(dec(ref,key)[:,90]))
last=next(c for c in changes if c['start_ns']==20 and c['end_ns']==24 and c['reference']=='drive')['maxAbsoluteMagnitudeChanges']
dm=max(max(last[k]) for k in ['HdiffNear','Hdiff'])*1000;cm=max(max(last[k]) for k in ['HcommonNear','Hcommon'])
r=dict(revision='completed-time-review-18',scientificVerdictComplete=False,timeScreeningAccepted=True,meshScreeningComplete=False,
    status='completed25ns_time_screening_accepted_matched_finer_grid_running',snapshot_sha256=sha(path),
    originalManifestSHA256=sha(normal/'manifest.json'),originalDriveReferenceSHA256=sha(normal/'drive-reference.json'),
    evidenceHashesChecked=len(d['files']),independentScalarChecks=d['independentScalarChecks'],
    acceptedScope='Near-bond100MHz large common-mode reduction/differential increase and approximate source-referenced noise scale. Not a full-band shield ranking or precise resonance.',
    decision='Stop extending this near-bond record:20->24ns changes are small relative to the adopted large effect. Continue the matched floating/near transverse-grid check before the overallTEST02 verdict.',
    acceptedTimeVariation=dict(lastWindowPair_ns=[20,24],maxDifferentialMagnitudeChange_mVperV=dm,maxCommonMagnitudeChange_VperV=cm,
        lastReportedResidualEnergy_dB=d['lastLogEnergy_dB'],energyUsedAsPassCriterion=False),
    exclusions=['No small near/both advantage is adopted; both has no long-window run.','Loaded-input-null ratio peaks are not fixed-source output peaks or pure-CM transfer.','The far-end CM spectrum still changes with time; exact spectral features are outside the accepted scope.','NoTEST02 finer-grid result has completed yet. Axial-grid refinement is not claimed.'],
    windows=summary,changes=changes)
(root/'time-verdict.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(status=r['status'],hashes=r['evidenceHashesChecked'],max20to24DM_mVperV=dm,max20to24CM_VperV=cm)))
