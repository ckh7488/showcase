"""Collect completed TEST 01/02 probes; never infer an uncomputed case or verdict.

The original solver response, model, trace samples and source snapshots stay
with each case. Window DFTs use actual sample times without interpolation.
"""
import argparse, csv, hashlib, json, re, shutil
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

KEYS = ['HdiffNear', 'Hdiff', 'HcommonNear', 'Hcommon']
ENC = lambda a: {'real': a.real.tolist(), 'imag': a.imag.tolist()}
DEC = lambda r, k: np.array(r[k]['real'])+1j*np.array(r[k]['imag'])
READ = lambda p: json.loads(p.read_text(encoding='utf-8'))
SHA = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def window_response(src, original, cutoff_ns):
    freq=np.array(original['frequency_Hz']);cache={};trace_info={}
    def transform(name):
        if name not in cache:
            all_samples=np.loadtxt(src/name,comments='%')
            assert all_samples[-1,0]>=cutoff_ns*1e-9, (name,cutoff_ns)
            samples=all_samples[all_samples[:,0]<=cutoff_ns*1e-9]
            t,v=samples.T;assert len(t)>2 and np.all(np.diff(t)>0)
            dt=float(t[1]-t[0])
            np.testing.assert_allclose(np.diff(t),dt,rtol=1e-6,atol=1e-20)
            cache[name]=2*dt*(np.exp(-2j*np.pi*freq[:,None]*t[None,:])@v)
            trace_info[name]={'samples':len(t),'lastSample_s':float(t[-1]),'sampleInterval_s':dt}
        return cache[name]
    count=6 if original['test']=='01' else 8
    v=np.array([transform(f'port_ut_{n}') for n in range(1,count+1)])
    i=np.array([transform(f'port_it_{n}') for n in range(1,count+1)])
    vin=v[2] if count==6 else (v[6]+v[7])/2
    assert np.isfinite(vin).all() and (abs(vin)>1e-30).all()
    cm=np.array([(transform(f'cm_{end}_{pair}_0')+transform(f'cm_{end}_{pair}_1'))/2 for end in [-1,1] for pair in [0,1]])
    arrays=dict(frequency_Hz=freq,Vin=vin,HdiffNear=v[:2]/vin,Hdiff=v[3:5]/vin,
                HcommonNear=cm[:2]/vin,Hcommon=cm[2:]/vin,portVoltage=v,portCurrent=i)
    if count==6:
        arrays['Hpower']=v[5]/vin
        incident=(v+100*i)/2;reflected=(v-100*i)/2
        arrays['Scolumn']=reflected/incident[2]
    else:
        arrays['inputDM_over_CM']=(v[6]-v[7])/vin
        arrays['inputBusDM_over_CM']=v[2]/vin
        arrays['sourcePort7_over_CM']=v[6]/vin
        arrays['sourcePort8_over_CM']=v[7]/vin
        bonds=original['input']['shieldBonds']
        arrays['HshieldCurrent']=np.array([transform(b['currentProbe']) for b in bonds]).reshape(len(bonds),len(freq))/vin
    record={k:ENC(a) for k,a in arrays.items() if k not in ['frequency_Hz','portVoltage','portCurrent']}
    record['cutoff_ns']=cutoff_ns;record['traceWindows']=trace_info
    record['outputs']={k:{'peak_VperV':abs(arrays[k]).max(axis=1).tolist(),
                          'peak_Hz':freq[abs(arrays[k]).argmax(axis=1)].tolist(),
                          'at100MHz_VperV':abs(arrays[k][:,np.argmin(abs(freq-100e6))]).tolist()} for k in KEYS}
    return record,arrays

def compare(a,b,freq):
    result={}
    for key in KEYS:
        x,y=DEC(a,key),DEC(b,key);rows=[]
        for pair in [0,1]:
            peak=max(abs(x[pair]).max(),abs(y[pair]).max())
            prominent=np.maximum(abs(x[pair]),abs(y[pair]))>=.1*peak
            delta=abs(20*np.log10(np.maximum(abs(y[pair]),1e-30)/np.maximum(abs(x[pair]),1e-30)))
            k=int(np.where(prominent,delta,-1).argmax())
            rows.append({'pair':pair+1,'maxMagnitudeChangeProminentBand_dB':float(delta[k]),
                         'atWorstFrequency_Hz':float(freq[k]),'beforeAtWorst_VperV':float(abs(x[pair,k])),
                         'afterAtWorst_VperV':float(abs(y[pair,k])),
                         'maxAbsoluteMagnitudeChange_VperV':float(abs(abs(y[pair])-abs(x[pair])).max()),
                         'peakBefore_VperV':float(abs(x[pair]).max()),'peakAfter_VperV':float(abs(y[pair]).max())})
        result[key]=rows
    return result

def collect_case(src,logpath,dst):
    original=READ(src/'response.json');assert original['solverRun'] is True
    log=logpath.read_text(encoding='utf-8')
    assert re.search(r'Time for \d+ iterations',log), 'Incomplete solver log'
    assert not re.search(r'(?<![A-Za-z0-9_])[A-Za-z]:[\\/]|/Users/|/home/',log), 'Local path in log'
    meta=original['input']
    runner='run_cable_screening.py' if original['test']=='01' else 'run_common_mode.py'
    assert SHA(src/runner)==meta['script_sha256' if original['test']=='01' else 'runner_sha256']
    if original['test']=='01':
        audit=READ(src/'pec-connection-audit.json');ids=audit['terminalComponentsWithCaps']
        assert all(a is not None and a==b for a,b in ids) and len({a for a,b in ids})==6
        assert .05<original['metrics']['powerThroughMagnitudeAt100MHz']<10
    else:
        for name in ['native-check.json','native-far-check.json']:
            audit=READ(src/name)
            assert audit['powerBusGroupsDistinct'] and audit['noWireShortToShieldOrPlate']
    dst.mkdir(parents=True,exist_ok=True)
    for p in src.iterdir():
        if p.is_file() and (p.suffix in ['.json','.npz','.xml','.py'] or p.name.startswith(('port_ut_','port_it_','cm_','shield_'))):
            shutil.copy2(p,dst/p.name)
    (dst/'solver.log').write_text(log,encoding='utf-8')
    dt=float(re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',log)[-1])
    pulse=int(re.findall(r'Excitation signal length is:\s*(\d+) timesteps',log)[-1])*dt*1e9
    end=min(np.loadtxt(src/f'port_ut_{n}',comments='%')[-1,0]*1e9 for n in range(1,7))
    assert end>pulse, 'Source pulse was not completely recorded'
    windows={};npz_by_window={}
    for ns in [8,10,12]:
        if ns<=end:
            w,arrays=window_response(src,original,ns);windows[str(ns)]=w;npz_by_window[str(ns)]=arrays
            np.savez_compressed(dst/f'window-{ns}ns.npz',**arrays)
    assert windows, 'Review early completion before packaging this case'
    freq=np.array(original['frequency_Hz'])
    energies=re.findall(r'Energy:.*?\(\s*(-?[\d.]+)dB\)',log)
    last_energy=float(energies[-1]);criterion=meta['EndCriteria']
    time_comparisons={f'{a}→{b} ns':compare(windows[a],windows[b],freq) for a,b in zip(list(windows)[:-1],list(windows)[1:])}
    # Independently verify scalar DFT points, including all four observation channels.
    scalar_checks=0;input_checks=0
    for ns,arrays in npz_by_window.items():
        def scalar(name,k):
            raw=np.loadtxt(src/name,comments='%');raw=raw[raw[:,0]<=float(ns)*1e-9];t,v=raw.T
            return sum(value*np.exp(-2j*np.pi*freq[k]*time) for time,value in zip(t,v))*2*(t[1]-t[0])
        for k in [0,90,190]:
            vin=scalar('port_ut_3',k) if original['test']=='01' else (scalar('port_ut_7',k)+scalar('port_ut_8',k))/2
            if original['test']=='02':
                np.testing.assert_allclose([vin,(scalar('port_ut_7',k)-scalar('port_ut_8',k))/vin,scalar('port_ut_3',k)/vin],
                    [arrays['Vin'][k],arrays['inputDM_over_CM'][k],arrays['inputBusDM_over_CM'][k]],rtol=1e-10,atol=1e-20)
                input_checks+=3
            for endname,sign,offset in [('Near',-1,1),('',1,4)]:
                for pair in [0,1]:
                    hd=scalar(f'port_ut_{offset+pair}',k)/vin
                    hc=(scalar(f'cm_{sign}_{pair}_0',k)+scalar(f'cm_{sign}_{pair}_1',k))/(2*vin)
                    np.testing.assert_allclose([hd,hc],[arrays['Hdiff'+endname][pair,k],arrays['Hcommon'+endname][pair,k]],rtol=1e-10,atol=1e-13)
                    scalar_checks+=2
    with (dst/'transfer.csv').open('w',newline='',encoding='utf-8') as f:
        writer=csv.writer(f);writer.writerow(['observation_ns','frequency_Hz','output','pair','real_VperV','imag_VperV'])
        for ns,w in windows.items():
            for key in KEYS:
                z=DEC(w,key)
                for pair in [0,1]:
                    for k,freq_hz in enumerate(freq):writer.writerow([ns,freq_hz,key,pair+1,z[pair,k].real,z[pair,k].imag])
    report=dict(id=src.name,test=original['test'],input=meta,elapsed_s=original['elapsed_s'],
                frequency_Hz=freq.tolist(),windows=windows,timeComparisons=time_comparisons,
                sourceEnd_ns=pulse,recordEnd_ns=float(end),lastReportedEnergy_dB=last_energy,
                energyCriterion=criterion,energyCriterionMet=bool(last_energy<=10*np.log10(criterion)+.05),
                numericalVerification={'passed':True,'independentScalarOutputs':scalar_checks},
                reviewStatus='case_data_checked_comparison_judgment_pending')
    if original['test']=='02':
        input_traces=[np.loadtxt(src/f'port_ut_{n}',comments='%') for n in [7,8,3]]
        assert all(np.array_equal(t[:,0],input_traces[0][:,0]) for t in input_traces)
        v7,v8,v3=[t[:,1] for t in input_traces];vcm=(v7+v8)/2
        report['inputDiagnostics']={'definition':'Actual Vcm=(V7+V8)/2; source-path difference V7-V8 and direct power-bus port V3 are recorded separately.',
            'peakCommonInput_V':float(abs(vcm).max()),'peakSourceDifference_V':float(abs(v7-v8).max()),
            'peakDirectBusDifference_V':float(abs(v3).max()),'independentScalarOutputs':input_checks,
            'time_ns':(input_traces[0][:,0]*1e9).tolist(),'V7_V':v7.tolist(),'V8_V':v8.tolist(),'Vcm_V':vcm.tolist(),'V3_V':v3.tolist()}
    report['files']=[{'file':p.name,'sha256':SHA(p)} for p in sorted(dst.iterdir()) if p.is_file() and p.name!='analysis.json']
    (dst/'analysis.json').write_text(json.dumps(report,ensure_ascii=False),encoding='utf-8')
    return report

def main():
    p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--out',required=True);p.add_argument('--test',choices=['01','02'],required=True);args=p.parse_args()
    root,out=Path(args.runs),Path(args.out);out.mkdir(parents=True,exist_ok=True)
    names=[f'test01-{w}-{m}' for w in ['same','mixed'] for m in ['coarse','fine']] if args.test=='01' else [f'test02-{b}' for b in ['floating','near','both']]
    cases=[]
    for name in names:
        src=root/name
        if not (src/'response.json').exists():continue
        cases.append(collect_case(src,root/'logs'/f'{name}.log',out/name))
    byid={c['id']:c for c in cases};comparisons={}
    if args.test=='01':
        pairs=[('mesh-'+w,f'test01-{w}-coarse',f'test01-{w}-fine') for w in ['same','mixed']]+[('wiring-'+m,f'test01-same-{m}',f'test01-mixed-{m}') for m in ['coarse','fine']]
    else:pairs=[('bond-'+b,'test02-floating',f'test02-{b}') for b in ['near','both']]
    for label,a,b in pairs:
        if a in byid and b in byid:
            x,y=byid[a],byid[b];assert x['frequency_Hz']==y['frequency_Hz']
            models=[READ(out/name/'model.json') for name in [a,b]]
            if label.startswith('mesh'):assert all(models[0][k]==models[1][k] for k in ['wires','ports','referencePlate'])
            elif label.startswith('wiring'):
                assert models[0]['wires'][:4]==models[1]['wires'][:4]
                assert models[0]['ports']==models[1]['ports']
            comparisons[label]={ns:compare(x['windows'][ns],y['windows'][ns],np.array(x['frequency_Hz'])) for ns in x['windows'] if ns in y['windows']}
    manifest={'test':args.test,'updatedAtUTC':datetime.now(timezone.utc).isoformat(),
              'status':'all_case_data_checked_review_pending' if len(cases)==len(names) else 'partial_case_data_checked',
              'expectedCases':names,'cases':cases,'comparisons':comparisons,
              'method':'DFT at stored frequencies from actual probe times; 8/10/12 ns cutoffs where available. No interpolation. Inputs are actual port voltages.',
              'comparisonGuide':'The prominent-band mask is 10% of each channel peak, a display aid, not an immunity limit. Inspect absolute differences and dominant channels before accepting a result.',
              'scientificVerdictComplete':False}
    # Preserve an explicit review only while every reviewed case's evidence is unchanged.
    review_file=out/'screening-verdict.json'
    if review_file.exists():
        review=READ(review_file)
        if (review.get('scientificVerdictComplete') is True and len(cases)==len(names)
            and {s['id'] for s in review['sources']}==set(byid)
            and all(SHA(out/s['id']/'analysis.json')==s['analysis_sha256'] for s in review['sources'])):
            manifest.update(scientificVerdictComplete=True,status=review['status'],
                scientificReview={'file':review_file.name,'sha256':SHA(review_file)})
    shutil.copy2(Path(__file__),out/Path(__file__).name)
    manifest['collector_sha256']=SHA(out/Path(__file__).name)
    pending=out/'.manifest.pending';pending.write_text(json.dumps(manifest,ensure_ascii=False),encoding='utf-8');pending.replace(out/'manifest.json')
    print(json.dumps({'test':args.test,'completed':len(cases),'expected':len(names),'scalarOutputsChecked':sum(c['numericalVerification']['independentScalarOutputs'] for c in cases),'output':str(out)}))

if __name__=='__main__':main()
