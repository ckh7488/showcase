"""Compare fixed source-reference and loaded common-mode normalization."""
import hashlib,json
from importlib.util import find_spec
from pathlib import Path
import numpy as np

root=Path('reports/porta-test-02/records/common-14');manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
enc=lambda a:dict(real=a.real.tolist(),imag=a.imag.tolist())
result=dict(revision='drive-reference-16',definition='Edrive = ((V7 + 50*I7) + (V8 + 50*I8))/2. Twice the average incident-wave voltage, a 50-ohm source-voltage reference; not the loaded cable voltage.',
    formulaSource='https://github.com/thliebig/openEMS/blob/master/python/openEMS/ports.py',
    installedPortsSHA256=sha(Path(find_spec('openEMS').origin).with_name('ports.py')),
    cases={},independentScalarChecks=0,scientificVerdictComplete=False)
for c in manifest['cases']:
    folder=root/c['id'];freq=np.array(c['frequency_Hz']);windows={}
    for ns in c['windows']:
        path=folder/f'window-{ns}ns.npz';a=np.load(path);v=a['portVoltage'];i=a['portCurrent'];sources=v[6:8]+50*i[6:8];drive=sources.mean(axis=0);factor=a['Vin']/drive
        assert np.isfinite(drive).all() and (abs(drive)>1e-30).all()
        values={k:a[k]*factor for k in ['HcommonNear','Hcommon','HdiffNear','Hdiff']}
        windows[ns]=dict(npz_sha256=sha(path),VinOverDrive=enc(factor),driveSpectrum=enc(drive),
            driveImbalance=enc((sources[0]-sources[1])/drive),**{k:enc(val) for k,val in values.items()},
            sourceDifferenceMax=float((abs(sources[0]-sources[1])/abs(drive)).max()))
        cache={}
        def scalar(name,k):
            if name not in cache:
                t=np.loadtxt(folder/name,comments='%');cache[name]=t[t[:,0]<=int(ns)*1e-9]
            t,y=cache[name].T
            return sum(a*np.exp(-2j*np.pi*freq[k]*b) for b,a in zip(t,y))*2*(t[1]-t[0])
        for k in [0,90,163,165,190]:
            source=(scalar('port_ut_7',k)+50*scalar('port_it_7',k)+scalar('port_ut_8',k)+50*scalar('port_it_8',k))/2
            np.testing.assert_allclose(source,drive[k],rtol=1e-10,atol=1e-20);result['independentScalarChecks']+=1
            for suffix,sign,offset in [('Near',-1,1),('',1,4)]:
                for pair in range(2):
                    dm=scalar(f'port_ut_{offset+pair}',k)/source
                    cm=(scalar(f'cm_{sign}_{pair}_0',k)+scalar(f'cm_{sign}_{pair}_1',k))/(2*source)
                    np.testing.assert_allclose([dm,cm],[values['Hdiff'+suffix][pair,k],values['Hcommon'+suffix][pair,k]],rtol=1e-10,atol=1e-13)
                    result['independentScalarChecks']+=2
    result['cases'][c['id']]=dict(analysis_sha256=sha(folder/'analysis.json'),windows=windows)

base=result['cases']['test02-floating']['windows'];comparisons=[]
for name,c in result['cases'].items():
    for ns,w in c['windows'].items():
        dec=lambda w,k:np.array(w[k]['real'])+1j*np.array(w[k]['imag'])
        for k in ['HcommonNear','Hcommon','HdiffNear','Hdiff']:
            ratios=abs(dec(w,k))/abs(dec(base[ns],k))
            comparisons.append(dict(case=name,window_ns=int(ns),output=k,lowerPoints=(ratios<1).sum(axis=1).tolist(),ratioMax=ratios.max(axis=1).tolist()))
result['comparisonsWithFloating']=comparisons
result['interpretation']='Large loaded-voltage-normalized peaks near173-175MHz partly reflect small denominator voltage. Preserve that transfer, but compare fixed source-reference outputs separately. The longer record is still needed for output settling; source reference does not prove time/mesh acceptance.'
(root/'drive-reference.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
print(json.dumps(dict(cases=len(result['cases']),independentScalarChecks=result['independentScalarChecks'],sourceImbalanceMax=max(w['sourceDifferenceMax'] for c in result['cases'].values() for w in c['windows'].values()))))
