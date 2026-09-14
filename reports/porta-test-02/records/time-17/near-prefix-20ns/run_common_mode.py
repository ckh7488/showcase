"""Execute one prepared TEST 02 case and retain actual voltage/current traces."""
import argparse,hashlib,json,os,shutil,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--prepared',required=True);p.add_argument('--out',required=True);p.add_argument('--install',required=True);p.add_argument('--threads',type=int,default=4);a=p.parse_args()
src=Path(a.prepared).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=False)
os.environ['OPENEMS_INSTALL_PATH']=a.install
import numpy as np
from CSXCAD import ContinuousStructure
from openEMS import openEMS
from openEMS.ports import UI_data
meta=json.loads((src/'input.json').read_text());assert meta['test']=='02'
check=json.loads((src/'native-check.json').read_text());assert check['powerBusGroupsDistinct'] and check['noWireShortToShieldOrPlate']
far=json.loads((src/'native-far-check.json').read_text());assert far['allWiresConnectToCable'] and far['powerBusGroupsDistinct'] and far['noWireShortToShieldOrPlate']
for name in ['input.json','model.json','mesh.json','geometry.xml','native-check.json','native-far-check.json','prepare_common_mode.py','read_native_pec.py']:shutil.copy2(src/name,out/name)
shutil.copy2(Path(__file__),out/Path(__file__).name)
meta.update(solverRun=False,runner_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),numThreads=a.threads)
(out/'input.json').write_text(json.dumps(meta,indent=2))
c=ContinuousStructure();assert not c.ReadFromXML(str(out/'geometry.xml'))
f=openEMS(NrTS=meta['NrTS'],EndCriteria=meta['EndCriteria']);f.SetCSX(c)
f.SetMaxTime(meta['maximumPhysicalTime_ns']*1e-9);f.SetGaussExcite(0,500e6);f.SetBoundaryCond(meta['boundary'])
t=time.perf_counter();f.Run(str(out),cleanup=False,numThreads=a.threads,verbose=1);elapsed=time.perf_counter()-t
freq=np.arange(10,201)*1e6
def dft(name):return UI_data(name,str(out),freq).ui_f_val[0]
voltage=np.array([dft(f'port_ut_{n}') for n in range(1,9)])
current=np.array([dft(f'port_it_{n}') for n in range(1,9)])
vin=(voltage[6]+voltage[7])/2;assert np.isfinite(vin).all() and np.all(abs(vin)>1e-30)
cm=np.array([(dft(f'cm_{end}_{pair}_0')+dft(f'cm_{end}_{pair}_1'))/2 for end in [-1,1] for pair in [0,1]])
bonds=np.array([dft(b['currentProbe']) for b in meta['shieldBonds']]).reshape(len(meta['shieldBonds']),len(freq))
arrays=dict(frequency_Hz=freq,VinCM=vin,inputDM=voltage[6]-voltage[7],HdiffNear=voltage[:2]/vin,Hdiff=voltage[3:5]/vin,HcommonNear=cm[:2]/vin,Hcommon=cm[2:]/vin,portVoltage=voltage,portCurrent=current,shieldCurrent=bonds,HshieldCurrent=bonds/vin)
np.savez_compressed(out/'response.npz',**arrays)
encode=lambda arr:{'real':arr.real.tolist(),'imag':arr.imag.tolist()}
record={'test':'02','solverRun':True,'elapsed_s':elapsed,'input':meta,'frequency_Hz':freq.tolist(),**{k:encode(v) for k,v in arrays.items() if k!='frequency_Hz'},'metrics':{'inputDM_over_CM_peak':float(abs(arrays['inputDM']/vin).max()),'peakEthernetDM_per_Vcm':float(max(abs(arrays['Hdiff']).max(),abs(arrays['HdiffNear']).max()))},'assessment':'Computed response only. Compare observation windows and the three shield cases before selecting a practical change.'}
(out/'response.json').write_text(json.dumps(record,indent=2));print('RESULT',json.dumps(record['metrics']),flush=True)
