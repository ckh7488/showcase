"""Read this finite connected-model batch and update its local progress record."""
import argparse,json,re
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
from status_io import write_json_atomic
p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--out');a=p.parse_args();root=Path(a.runs);rows=[]
for wiring,level in [('same','coarse'),('mixed','coarse'),('same','fine'),('mixed','fine')]:
    name=f'test01-{wiring}-{level}';folder=root/name;log=root/'logs'/f'{name}.log';row={'id':name,'wiring':wiring,'mesh':level,'stage':'not_started'}
    if log.exists():
        text=log.read_text(encoding='utf-8');row['stage']='complete' if (folder/'response.json').exists() else 'fields' if 'Running FDTD engine' in text else 'preparing'
        if 'Traceback (most recent call last)' in text:row['stage']='error'
        dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',text);steps=re.findall(r'Timestep:\s*(\d+)',text)
        if dt and steps:row['time_ns']=float(dt[-1])*int(steps[-1])*1e9
        speed=re.findall(r'Speed:\s*([\d.]+) MC/s',text)
        if speed:row['lastSpeed_MC_per_s']=float(speed[-1])
        if (folder/'pec-connection-audit.json').exists():
            check=json.loads((folder/'pec-connection-audit.json').read_text());row['connectionsPassed']=all(c[0] is not None and c[0]==c[1] for c in check['terminalComponentsWithCaps'])
        if row.get('time_ns',0)>=6 and all((folder/name).exists() and (folder/name).stat().st_size>0 for name in ['port_ut_3','port_ut_6']):
            try:
                vin=np.loadtxt(folder/'port_ut_3',comments='%');vout=np.loadtxt(folder/'port_ut_6',comments='%');end=min(vin[-1,0],vout[-1,0])
                def dft(trace):
                    trace=trace[trace[:,0]<=end];t,v=trace.T
                    return 2*(t[1]-t[0])*sum(v*np.exp(-2j*np.pi*100e6*t))
                row['preliminaryPowerThroughAt100MHz']=float(abs(dft(vout)/dft(vin)));row['powerObservation_ns']=float(end*1e9)
            except (ValueError,OSError,IndexError):pass
    rows.append(row)
common=[]
for bond in ['floating','near','both']:
    prepared=root/f'test02-preflight-{bond}';folder=root/f'test02-{bond}';log=root/'logs'/f'test02-{bond}.log'
    row={'id':f'test02-{bond}','bond':bond,'stage':'not_started','nativePreparationComplete':(prepared/'native-check.json').exists() and (prepared/'native-far-check.json').exists()}
    if log.exists():
        text=log.read_text(encoding='utf-8');row['stage']='complete' if (folder/'response.json').exists() else 'fields' if 'Running FDTD engine' in text else 'preparing'
        if 'Traceback (most recent call last)' in text:row['stage']='error'
        dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',text);steps=re.findall(r'Timestep:\s*(\d+)',text)
        if dt and steps:row['time_ns']=float(dt[-1])*int(steps[-1])*1e9
    common.append(row)
batch=json.loads((root/'finite-batch.json').read_text()) if (root/'finite-batch.json').exists() else None
if batch:
    for row in rows+common:
        if row['stage']=='not_started' and row['id'] in batch['queue']:row['stage']='on_hold' if batch['stage']=='needs_review' else 'queued'
        if row['id'] in [f['id'] for f in batch.get('failures',[])]:row['stage']='error'
        elif batch['stage']=='needs_review' and row['id']==batch['current'] and not batch.get('running'):row['stage']='error'
data={'revision':'connected-run-07','updatedAtUTC':datetime.now(timezone.utc).isoformat(),'maximumTime_ns':12.5,'rows':rows,'commonMode':common,'batchStage':batch['stage'] if batch else None,'note':'Actual run progress only; no validated new noise comparison is implied.'}
if a.out:
    target=Path(a.out);write_json_atomic(target,data)
    # Each report owns its runtime data. Keep the historical destination working
    # for the already-running batch and mirror the status into TEST 01's page.
    for slug in ['porta-test-01','porta-test-02','porta-test-results']:
        result_target=Path(__file__).resolve().parents[2]/'reports'/slug/'data/connected-progress.json'
        if result_target.parent.exists() and result_target.resolve()!=target.resolve():
            write_json_atomic(result_target,data)
print(json.dumps(data))
