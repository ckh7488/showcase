"""Verify the portable report's numeric arrays and evidence against its manifest."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--records',required=True)
args=p.parse_args();root=Path(args.records).resolve()
manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
count=0
for run in manifest['references']+manifest['cableRuns']:
    assert run['solverRun'] is True
    runner=root/('run_reference.py' if run['test']=='00' else 'run_cable.py')
    assert hashlib.sha256(runner.read_bytes()).hexdigest()==run['input']['script_sha256']
    for item in run['evidenceFiles']:
        target=(root/item['file']).resolve()
        assert target.is_relative_to(root)
        assert hashlib.sha256(target.read_bytes()).hexdigest()==item['sha256'],item['file']
        count+=1
    response=np.load(root/run['id']/'response.npz')
    np.testing.assert_array_equal(response['frequency_Hz'],run['frequency_Hz'])
    for name in (['reflection','transmission'] if run['test']=='00' else ['Hdiff','Hcommon','Vin']):
        displayed=np.array(run[name]['real'])+1j*np.array(run[name]['imag'])
        np.testing.assert_allclose(response[name],displayed,rtol=1e-14,atol=1e-16)
    if run['test']=='01':
        assert run['input']['cells']==int(np.prod([n-1 for n in run['input']['meshLines'].values()]))
        assert run['postprocessing']['requestedObservationEnd_s']==8e-9
        assert run['postprocessing']['traceWindows']['port_ut_3']['lastSample_s']<=8e-9
        assert run['energyProgress']['time_s'][-1]>run['energyProgress']['sourceEnd_s']
        if run.get('diagnosticStop'):
            assert not run['termination']['energyCriterionConfirmed']
if manifest['completedComparisons']['coarseAB']:
    a,b=[next(r for r in manifest['cableRuns'] if r['id']==f'test01-{w}-coarse') for w in ['same','mixed']]
    assert a['postprocessing']['traceWindows']==b['postprocessing']['traceWindows']
    np.testing.assert_array_equal(a['frequency_Hz'],b['frequency_Hz'])
assert manifest['abInputCheck']['passed']
print(json.dumps({'passed':True,'evidenceHashesChecked':count,
    'cableRuns':len(manifest['cableRuns']),'sameABObservationWindow':manifest['completedComparisons']['coarseAB']}))
