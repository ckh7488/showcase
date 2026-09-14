"""Independently trace the displayed screening numbers back to retained probes."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--records',required=True)
p.add_argument('--initial',required=True)
args=p.parse_args()
root, initial = Path(args.records).resolve(), Path(args.initial).resolve()
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
manifest=read(root/'manifest.json')
hashes=points=0
for r in manifest['references']+manifest['cableRuns']:
    runner=root/(r.get('runnerFile') or 'run_reference.py')
    assert hashlib.sha256(runner.read_bytes()).hexdigest()==r['input']['script_sha256']
    for entry in r['evidenceFiles']:
        file=(root/entry['file']).resolve()
        assert file.is_relative_to(root)
        assert hashlib.sha256(file.read_bytes()).hexdigest()==entry['sha256'], entry['file']
        hashes+=1
    if r['test']=='00':
        continue
    folder=root/r['id']
    assert r['input']['maximumPhysicalTime_ns']==16
    assert r['input']['cells']==np.prod([v-1 for v in r['input']['meshLines'].values()])
    assert r['termination']['iterations']>0
    assert r['energyProgress']['time_s'][-1]>=15.5e-9
    for ns, w in r['windows'].items():
        npz=np.load(folder/f'window-{ns}ns.npz')
        for key in ['Vin','Hdiff','Hcommon','HdiffNear','HcommonNear']:
            z=np.array(w[key]['real'])+1j*np.array(w[key]['imag'])
            np.testing.assert_allclose(z,npz[key],rtol=1e-14,atol=1e-16)
        # Scalar, per-frequency sums from the raw probes, independent of the
        # vectorized packaging implementation and saved NPZ matrices.
        for k in [0,90,190]:
            frequency=w['frequency_Hz'][k]
            def transform(name):
                trace=np.loadtxt(folder/name,comments='%')
                trace=trace[trace[:,0]<=float(ns)*1e-9]
                t,v=trace.T
                return sum(value*np.exp(-2j*np.pi*frequency*time) for time,value in zip(t,v))*2*(t[1]-t[0])
            vin=transform('port_ut_3')
            for pair in [0,1]:
                hd=transform(f'port_ut_{4+pair}')/vin
                hc=(transform(f'cm_1_{pair}_0')+transform(f'cm_1_{pair}_1'))/(2*vin)
                hdn=transform(f'port_ut_{1+pair}')/vin
                hcn=(transform(f'cm_-1_{pair}_0')+transform(f'cm_-1_{pair}_1'))/(2*vin)
                np.testing.assert_allclose([hd,hc,hdn,hcn],[npz['Hdiff'][pair,k],npz['Hcommon'][pair,k],npz['HdiffNear'][pair,k],npz['HcommonNear'][pair,k]],rtol=1e-10,atol=1e-13)
                points+=4
    with (folder/'transfer.csv').open(encoding='utf-8') as stream:
        rows=list(csv.DictReader(stream))
    assert len(rows)==3*191*2
assert all(manifest['screening']['inputChecks'].values())
old_window_changes={}
for wiring in ['same','mixed']:
    r=next(r for r in manifest['cableRuns'] if r['id']==f'test01-{wiring}-coarse')
    old=read(initial/r['id']/'response.json')
    change={}
    for key in ['Hdiff','Hcommon']:
        a=np.array(old[key]['real'])+1j*np.array(old[key]['imag'])
        w=r['windows']['8']
        b=np.array(w[key]['real'])+1j*np.array(w[key]['imag'])
        change[key]=float(abs(a-b).max())
        np.testing.assert_allclose(a,b,rtol=5e-4,atol=1e-9,err_msg='A longer same-mesh rerun changed the earlier retained response unexpectedly.')
    old_window_changes[wiring]=change
print(json.dumps({'passed':True,'evidenceHashes':hashes,'independentlyCheckedProbeOutputs':points,'first8nsRerunDifference_VperV':old_window_changes}))
