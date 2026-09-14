"""Independently verify the packaged connection-review evidence and numbers."""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from read_native_pec import read as read_pec
from check_pec_connections import audit
p=argparse.ArgumentParser();p.add_argument('--records',required=True);a=p.parse_args();root=Path(a.records)
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
m=read(root/'manifest.json')
for item in m['evidence']:assert hashlib.sha256((root/item['file']).read_bytes()).hexdigest()==item['sha256'],item['file']
for level in ['coarse','fine']:
    original=read(root/f'native-{level}-edges.json');points,edges,labels,count=read_pec(root/f'native-{level}/PEC_dump.vtp')
    assert np.array_equal(points,original['nodes']);assert np.array_equal(edges,original['edges']);assert np.array_equal(labels,original['component'])
    assert [r['connectedPortToCable'] for r in original['wireChecks']]==[True]*4+[level=='fine']*4
    recomputed=audit(root/'partial'/f'test01-same-{level}')
    assert recomputed==read(root/f'connectivity-same-{level}.json')
for wiring in ['same','mixed']:
    old=root.parent/'initial-openems'/f'test01-{wiring}-coarse'
    for row in [r for r in m['test01']['powerThroughDiagnostics'] if r['wiring']==wiring]:
        def scalar_dft(name):
            raw=np.loadtxt(old/name,comments='%');raw=raw[raw[:,0]<=8e-9];dt=raw[1,0]-raw[0,0]
            return 2*dt*sum(value*np.exp(-2j*np.pi*row['frequency_Hz']*time) for time,value in raw)
        vin=scalar_dft('port_ut_3');vout=scalar_dft('port_ut_6');current=scalar_dft('port_it_3')
        assert np.isclose(abs(vout/vin),row['farPowerOverInputVoltage'],rtol=1e-9)
        assert np.isclose(abs((vin-100*current)/(vin+100*current)),row['inputReflectionMagnitude'],rtol=1e-9)
curves=[]
for c in m['test00']['curves']:
    evidence=root/c['evidence'];assert hashlib.sha256(evidence.read_bytes()).hexdigest()==c['sha256']
    d=np.load(evidence);mask=(d['frequency_Hz']>=10e6)&(d['frequency_Hz']<=200e6);curves.append(d['transmission'][mask])
    assert np.array_equal(d['frequency_Hz'][mask],c['frequency_Hz'])
delta=float(np.max(abs(20*np.log10(abs(curves[1])/abs(curves[0])))))
assert np.isclose(delta,m['test00']['checks']['targetBandCheck']['maxMagnitudeDifference_dB'],atol=1e-12)
assert not m['test01']['replacementTransientComplete'];assert not m['test01']['longerWindowComparisonComplete']
print(json.dumps({'passed':True,'hashedFiles':len(m['evidence']),'nativeEdgesVerified':True,'wholeMeshAuditRepeated':True,'independentPowerDFTs':6,'referenceMagnitudeChange_dB':delta,'replacementTransientClaim':False}))
