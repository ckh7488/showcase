"""Use exactly the same saved observation window for diagnostic A/B responses.

This recomputes a DFT from real retained samples; it performs no field solve,
interpolation or tail extrapolation. The original full-window response remains.
"""
import argparse
import json
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--run',required=True)
p.add_argument('--duration-ns',type=float,default=8)
args=p.parse_args();folder=Path(args.run)
result=json.loads((folder/'response.json').read_text())
frequency=np.array(result['frequency_Hz']);stop=args.duration_ns*1e-9
windows={}
def dft(name):
    trace=np.loadtxt(folder/name,comments='%')
    if trace[-1,0]<stop:
        raise RuntimeError('Recording does not cover the requested common window.')
    trace=trace[trace[:,0]<=stop]
    t,v=trace.T
    windows[name]={'samples':len(t),'lastSample_s':float(t[-1]),'sampleInterval_s':float(t[1]-t[0])}
    return 2*(t[1]-t[0])*(np.exp(-2j*np.pi*frequency[:,None]*t[None,:])@v)
voltage=np.array([dft(f'port_ut_{n}') for n in range(1,7)])
current=np.array([dft(f'port_it_{n}') for n in range(1,7)])
cm=np.array([(dft(f'cm_1_{pair}_0')+dft(f'cm_1_{pair}_1'))/2 for pair in [0,1]])
vin=voltage[2];diff=voltage[3:5]
hd=diff/vin;hc=cm/vin
incident=(voltage+100*current)/2;reflected=(voltage-100*current)/2
scolumn=reflected/incident[2]
encode=lambda a:{'real':a.real.tolist(),'imag':a.imag.tolist()}
result.update(Hdiff=encode(hd),Hcommon=encode(hc),Vin=encode(vin))
result['metrics']={'peakHdiff':abs(hd).max(axis=1).tolist(),
    'peakHdiffFrequency_Hz':frequency[abs(hd).argmax(axis=1)].tolist(),
    'maxOutgoingOverIncidentPortPower':float((abs(scolumn)**2).sum(axis=0).max()),
    'minimumInputSpectrumMagnitude':float(abs(vin).min())}
result['postprocessing']={'operation':'DFT of the same recorded samples cut at a shared observation time. No additional solve.',
    'requestedObservationEnd_s':stop,'traceWindows':windows,
    'originalResponse':'full-window-response.json',
    'note':'Original full-window samples and responses are retained. This is not a claim of time or energy convergence.'}
np.savez_compressed(folder/'aligned-window-response.npz',frequency_Hz=frequency,Vin=vin,
    Vdiff=diff,Vcommon=cm,Hdiff=hd,Hcommon=hc,portVoltage=voltage,portCurrent=current,Scolumn=scolumn)
(folder/'aligned-window-response.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'id':folder.name,'postprocessing':result['postprocessing']['operation'],
    'requestedEnd_s':stop,'voltageWindow':windows['port_ut_3'],'metrics':result['metrics']}))
