"""Preserve and verify a time prefix, with separate full-run completion evidence."""
import argparse,hashlib,json,re,shutil
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
from collect_cable_results import window_response,ENC,KEYS

p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--cutoff-ns',type=int,default=20);p.add_argument('--out',default='reports/porta-test-02/records/time-17');a=p.parse_args()
raw=Path(a.runs);src=raw/'test02-near-long';out=Path(a.out);folder=out/f'near-prefix-{a.cutoff_ns}ns';folder.mkdir(parents=True,exist_ok=False)
read=lambda p:json.loads(p.read_text(encoding='utf-8'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
meta=read(src/'input.json');old=read(raw/'test02-near/response.json');assert meta['maximumPhysicalTime_ns']==25
for name in ['geometry.xml','mesh.json','native-check.json','native-far-check.json']:
    assert sha(src/name)==sha(raw/'test02-near'/name)
for name in ['input.json','model.json','mesh.json','geometry.xml','native-check.json','native-far-check.json','run_common_mode.py']:
    shutil.copy2(src/name,folder/name)
names=[f'port_{kind}_{i}' for kind in ['ut','it'] for i in range(1,9)]
names += [f'cm_{end}_{pair}_{wire}' for end in [-1,1] for pair in [0,1] for wire in [0,1]]
names += [b['currentProbe'] for b in meta['shieldBonds']]
for name in names:
    lines=(src/name).read_bytes().splitlines(keepends=True);prefix=[];bracket=False
    for line in lines:
        if not line.endswith((b'\n',b'\r')):break
        prefix.append(line)
        if line.strip() and not line.lstrip().startswith(b'%') and float(line.split()[0])>a.cutoff_ns*1e-9:
            bracket=True;break
    assert bracket,(name,'requested prefix not fully present')
    content=b''.join(prefix);assert (src/name).read_bytes().startswith(content)
    (folder/name).write_bytes(content)
log=(raw/'logs/test02-near-long.log').read_bytes();(folder/'solver-at-snapshot.log').write_bytes(log)
complete=(src/'response.json').exists()
completion=None
if complete:
    full=read(src/'response.json')
    assert full['solverRun'] is True and full['input']['maximumPhysicalTime_ns']==25
    assert 'RESULT ' in log.decode('utf-8') and 'Time for 88513 iterations' in log.decode('utf-8')
    assert sha(src/'run_common_mode.py')==meta['runner_sha256']
    original=read(raw/'test02-preflight-near/input.json')
    revised=read(raw/'test02-preflight-near-long/input.json')
    for name,digest in revised['timeReview']['unchangedPreparedFilesSHA256'].items():
        assert sha(raw/'test02-preflight-near'/name)==digest
    assert {k:v for k,v in revised.items() if k not in ['timeReview','maximumPhysicalTime_ns']}=={k:v for k,v in original.items() if k!='maximumPhysicalTime_ns'}
    for name in ['response.json','response.npz']:
        shutil.copy2(src/name,folder/('completed-'+name))
    trace=np.loadtxt(src/'port_ut_7',comments='%')
    assert trace[-1,0]>24.99e-9
    completion=dict(solverRun=True,elapsed_s=full['elapsed_s'],lastVoltageSample_ns=float(trace[-1,0]*1e9),
        response_sha256=sha(src/'response.json'),runner_sha256=meta['runner_sha256'],
        sourcePreparationHashesChecked=len(revised['timeReview']['unchangedPreparedFilesSHA256']),
        changedPhysicalParameter='maximumPhysicalTime_ns:12.5->25; unchanged geometry and mesh')
descriptor={'test':'02','input':meta,'frequency_Hz':old['frequency_Hz']}
windows={};checks=0;compatibility=[]
for ns in [12,16,20,24]:
    if ns>a.cutoff_ns:continue
    w,arrays=window_response(folder,descriptor,ns)
    drive=(arrays['portVoltage'][6:8]+50*arrays['portCurrent'][6:8]).mean(axis=0)
    factor=arrays['Vin']/drive;w['drive']={k:ENC(arrays[k]*factor) for k in KEYS}
    w['VinOverDrive']=ENC(factor);w['driveSpectrum']=ENC(drive)
    w['sourceDriveImbalance']=ENC(((arrays['portVoltage'][6]+50*arrays['portCurrent'][6])-(arrays['portVoltage'][7]+50*arrays['portCurrent'][7]))/drive)
    windows[str(ns)]=w
    np.savez_compressed(folder/f'window-{ns}ns.npz',**arrays,drive=drive,VinOverDrive=factor)
    def scalar(name,k):
        t=np.loadtxt(folder/name,comments='%');t=t[t[:,0]<=ns*1e-9];t,v=t.T
        return sum(v0*np.exp(-2j*np.pi*arrays['frequency_Hz'][k]*t0) for t0,v0 in zip(t,v))*2*(t[1]-t[0])
    for k in [0,90,163,165,190]:
        vin=(scalar('port_ut_7',k)+scalar('port_ut_8',k))/2
        e=(scalar('port_ut_7',k)+50*scalar('port_it_7',k)+scalar('port_ut_8',k)+50*scalar('port_it_8',k))/2
        np.testing.assert_allclose([vin,e],[arrays['Vin'][k],drive[k]],rtol=1e-10,atol=1e-20);checks+=2
        for suffix,end,offset in [('Near',-1,1),('',1,4)]:
            for pair in range(2):
                v=scalar(f'port_ut_{offset+pair}',k);cm=(scalar(f'cm_{end}_{pair}_0',k)+scalar(f'cm_{end}_{pair}_1',k))/2
                for reference,denominator in [('loaded',vin),('drive',e)]:
                    expected=[arrays['Hdiff'+suffix][pair,k],arrays['Hcommon'+suffix][pair,k]]
                    if reference=='drive':expected=np.array(expected)*factor[k]
                    np.testing.assert_allclose([v/denominator,cm/denominator],expected,rtol=1e-10,atol=1e-13);checks+=2
        for bi,b in enumerate(meta['shieldBonds']):
            np.testing.assert_allclose(scalar(b['currentProbe'],k)/vin,arrays['HshieldCurrent'][bi,k],rtol=1e-10,atol=1e-13);checks+=1
for name in names:
    original=np.loadtxt(raw/'test02-near'/name,comments='%');later=np.loadtxt(folder/name,comments='%')
    original=original[original[:,0]<=12e-9];later=later[later[:,0]<=12e-9]
    np.testing.assert_array_equal(original[:,0],later[:,0]);delta=float(abs(original[:,1]-later[:,1]).max())
    compatibility.append(dict(file=name,maxAbsoluteTraceDifference=delta))
    np.testing.assert_allclose(original[:,1],later[:,1],rtol=1e-7,atol=1e-12)
energy=re.findall(r'Energy:.*?\(\s*(-?[\d.]+)dB\)',log.decode('utf-8'))
result=dict(revision='time-prefix-18' if complete else 'time-prefix-17',case='test02-near-long',snapshotUTC=datetime.now(timezone.utc).isoformat(),
    snapshotOfRunningSolve=not complete,plannedMaximum_ns=25,snapshotCutoff_ns=a.cutoff_ns,completedRun=completion,
    scientificVerdictComplete=False,input=meta,frequency_Hz=old['frequency_Hz'],windows=windows,
    independentScalarChecks=checks,old12nsTraceCompatibility=compatibility,
    lastLogEnergy_dB=float(energy[-1]),note=('Completed25ns run; the window responses use only the stated prefix, at most24ns. ' if complete else 'Immutable prefix of an ongoing25ns simulation. ')+"Loaded and source-reference outputs use each record's own voltage/current transforms.",
    evidenceFolder=folder.name,files=[dict(file=x.name,sha256=sha(x)) for x in sorted(folder.iterdir()) if x.is_file()])
(out/'time-review.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(windows=list(windows),independentScalarChecks=checks,evidenceFiles=len(result['files']),maxOld12nsDifference=max(r['maxAbsoluteTraceDifference'] for r in compatibility))))
for ns,w in windows.items():
    dec=lambda w,k:np.array(w[k]['real'])+1j*np.array(w[k]['imag'])
    print(ns,json.dumps({basis:{k:abs(dec(values,k)[:,90]).tolist() for k in KEYS} for basis,values in [('loaded',w),('drive',w['drive'])]}))
