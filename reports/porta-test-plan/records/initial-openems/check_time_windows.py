"""Compare DFTs of retained cable traces with shorter observation windows.

This is a postprocessing stability check, not another field solve or a substitute
for a refined spatial grid. Raw samples are retained unchanged.
"""
import argparse
import json
from pathlib import Path
import numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--run',required=True)
args=parser.parse_args()
folder=Path(args.run)
response=json.loads((folder/'response.json').read_text())
frequency=np.array(response['frequency_Hz'])
traces=[np.loadtxt(folder/f'port_ut_{number}',comments='%') for number in [3,4,5]]
traces += [np.loadtxt(folder/f'cm_1_{pair}_{leg}',comments='%') for pair in [0,1] for leg in [0,1]]

def transform(trace,stop=None):
    # Same rectangular time integration as openEMS DFT_time2freq for pulses.
    if stop is not None:
        trace=trace[trace[:,0]<=stop]
    t,value=trace.T
    dt=t[1]-t[0]
    return 2*dt*(np.exp(-2j*np.pi*frequency[:,None]*t[None,:])@value)

full=np.array([transform(trace) for trace in traces])
href=full[1:3]/full[0]
cmref=np.array([(full[3]+full[4])/2,(full[5]+full[6])/2])/full[0]
saved=np.array(response['Hdiff']['real'])+1j*np.array(response['Hdiff']['imag'])
np.testing.assert_allclose(href,saved,rtol=1e-9,atol=1e-12)
np.testing.assert_allclose(cmref,np.array(response['Hcommon']['real'])+1j*np.array(response['Hcommon']['imag']),rtol=1e-9,atol=1e-12)
duration=min(trace[-1,0] for trace in traces)
comparisons=[]
for fraction in [.8,.9]:
    stop=duration*fraction
    shorter=np.array([transform(trace,stop) for trace in traces])
    h=shorter[1:3]/shorter[0]
    cm=np.array([(shorter[3]+shorter[4])/2,(shorter[5]+shorter[6])/2])/shorter[0]
    delta=abs(h-href)
    tolerance=np.maximum(.05*abs(href),1e-5)
    ok=delta<=tolerance
    comparisons.append({'windowFraction':fraction,'stop_s':stop,
        'maxComplexDifferenceEachPair':delta.max(axis=1).tolist(),
        'passFractionEachPair':ok.mean(axis=1).tolist(),
        'passed':bool(ok.all()),
        'commonMode':{'maxComplexDifferenceEachPair':abs(cm-cmref).max(axis=1).tolist(),
            'passed':bool((abs(cm-cmref)<=np.maximum(.05*abs(cmref),1e-5)).all())}})
result={'operation':'DFT of the same saved samples with earlier cutoffs; no solver run.',
    'fullDuration_s':float(duration),'checks':comparisons,
    'threshold':'|Hshorter-Hfull| <= max(0.05|Hfull|,1e-5)',
    'scope':'Tail-window stability only. It does not test spatial resolution, a stricter solver energy setting, boundary distance, or a longer unrecorded tail.'}
(folder/'time-window-check.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
