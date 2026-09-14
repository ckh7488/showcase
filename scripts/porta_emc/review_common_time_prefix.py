"""Bounded scientific review of the immutable20ns intermediate record."""
import hashlib,json
from pathlib import Path
import numpy as np
root=Path('reports/porta-test-02/records/time-17');path=root/'time-review.json';d=json.loads(path.read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();dec=lambda w,k:np.array(w[k]['real'])+1j*np.array(w[k]['imag'])
for f in d['files']:assert sha(root/d['evidenceFolder']/f['file'])==f['sha256']
summary=[];changes=[]
for ns,w in d['windows'].items():
    for basis,v in [('loaded',w),('drive',w['drive'])]:
        cm=np.concatenate([abs(dec(v,k)) for k in ['HcommonNear','Hcommon']]);dm=np.concatenate([abs(dec(v,k)) for k in ['HdiffNear','Hdiff']])
        summary.append(dict(window_ns=int(ns),reference=basis,commonAt100MHz_VperV=cm[:,90].tolist(),differentialAt100MHz_mVperV=(1000*dm[:,90]).tolist(),
            commonPeak_VperV=cm.max(axis=1).tolist(),differentialPeak_mVperV=(1000*dm.max(axis=1)).tolist()))
for start,end in [('12','16'),('16','20'),('12','20')]:
    for basis in ['loaded','drive']:
        x=d['windows'][start];y=d['windows'][end]
        if basis=='drive':x=x['drive'];y=y['drive']
        changes.append(dict(start_ns=int(start),end_ns=int(end),reference=basis,maxAbsoluteMagnitudeChanges={k:abs(abs(dec(y,k))-abs(dec(x,k))).max(axis=1).tolist() for k in ['HcommonNear','Hcommon','HdiffNear','Hdiff']}))
r=dict(revision='interim-time-review-17',scientificVerdictComplete=False,snapshot_sha256=sha(path),evidenceHashesChecked=len(d['files']),
    status='20ns_interim_review_25ns_running',scope='Intermediate time check only; no new TEST02 grid comparison has been completed.',
    finding='At100MHz the large near-bond common-mode reduction and differential increase persist through20ns. Small near-versus-both differential order changes when the near record is extended, so no small shield advantage is adopted.',
    limitation='The same-source record settles far more than loaded-voltage-normalized ratios near their input null. Need the final longer record and an explicit decision about the remaining mesh-sensitive claims; no universal energy/percent criterion.',
    windows=summary,changes=changes)
(root/'interim-verdict.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(status=r['status'],hashes=r['evidenceHashesChecked'],independentScalarChecks=d['independentScalarChecks'])))
