"""One finite longer-record check, after the existing both-bond solve finishes."""
import argparse,ctypes,hashlib,json,msvcrt,os,shutil,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
from status_io import write_json_atomic

p=argparse.ArgumentParser();p.add_argument('--atlas',required=True);p.add_argument('--runs',required=True)
p.add_argument('--install',required=True);p.add_argument('--wait-pid',type=int,required=True)
p.add_argument('--maximum-ns',type=float,default=25);a=p.parse_args()
atlas=Path(a.atlas).resolve();root=Path(a.runs).resolve();scripts=atlas/'scripts/porta_emc'
assert 12.5<a.maximum_ns<=25
source=root/'test02-preflight-near';prepared=root/'test02-preflight-near-long';out=root/'test02-near-long'
lockpath=root/'.common-time-queue.lock'
if not lockpath.exists():lockpath.write_bytes(b'0')
lock=lockpath.open('r+b');msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
assert not prepared.exists() and not out.exists(), 'Time check already prepared or running; refusing duplicate.'
state=dict(controllerPID=os.getpid(),case='test02-near-long',stage='waiting_for_existing_both',
    waitPID=a.wait_pid,maximumPhysicalTime_ns=a.maximum_ns,numThreads=4,
    reason='Near-bond upper-band peaks and source imbalance change materially between8/10/12ns. Extend the same geometry before interpreting those peaks.',
    startedAtUTC=datetime.now(timezone.utc).isoformat())
def update(**values):
    state.update(values,updatedAtUTC=datetime.now(timezone.utc).isoformat());write_json_atomic(root/'time-check-batch.json',state)
    report=atlas/'reports/porta-test-02/data/time-check-progress.json';write_json_atomic(report,state)
kernel=ctypes.windll.kernel32;kernel.OpenProcess.restype=ctypes.c_void_p
kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_ulong];kernel.CloseHandle.argtypes=[ctypes.c_void_p]
handle=None
try:
    info=subprocess.run(['powershell','-NoProfile','-Command',f'Get-CimInstance Win32_Process -Filter "ProcessId={a.wait_pid}" | Select-Object CommandLine | ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
    if info.stdout.strip():
        command=json.loads(info.stdout)['CommandLine'].lower()
        assert 'run_common_mode.py' in command and str(root/'test02-both').lower() in command
        handle=kernel.OpenProcess(0x100000|0x1000,False,a.wait_pid);assert handle
    update();deadline=time.monotonic()+3*3600
    while handle and kernel.WaitForSingleObject(handle,0)==258:
        assert time.monotonic()<deadline,'Existing both-bond solve did not finish within3h.'
        time.sleep(20)
    if handle:kernel.CloseHandle(handle);handle=None
    finished=json.loads((root/'test02-both/response.json').read_text());assert finished['solverRun'] is True
    prepared.mkdir();pins={}
    names=['input.json','model.json','mesh.json','geometry.xml','native-check.json','native-far-check.json','prepare_common_mode.py','read_native_pec.py']
    for name in names:
        shutil.copy2(source/name,prepared/name);pins[name]=hashlib.sha256((source/name).read_bytes()).hexdigest()
    meta=json.loads((prepared/'input.json').read_text());meta['maximumPhysicalTime_ns']=a.maximum_ns
    meta['timeReview']={'baseCase':'test02-near','unchangedPreparedFilesSHA256':pins,'changedParameter':'maximumPhysicalTime_ns','before_ns':12.5,'after_ns':a.maximum_ns}
    (prepared/'input.json').write_text(json.dumps(meta,indent=2))
    model=json.loads((prepared/'model.json').read_text());model['input']=meta;(prepared/'model.json').write_text(json.dumps(model))
    logpath=root/'logs/test02-near-long.log'
    with logpath.open('x') as log:
        job=subprocess.Popen([sys.executable,'-u',str(scripts/'run_common_mode.py'),'--prepared',str(prepared),'--out',str(out),'--install',a.install,'--threads','4'],cwd=atlas,stdout=log,stderr=subprocess.STDOUT)
        update(stage='calculating',childPID=job.pid);print('STARTED',state['case'],job.pid,flush=True)
        deadline=time.monotonic()+12*3600
        while job.poll() is None:
            assert time.monotonic()<deadline,'Longer-record calculation exceeded12h; inspect live solver before action.'
            time.sleep(20)
            import re
            text=logpath.read_text(encoding='utf-8');dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',text);steps=re.findall(r'Timestep:\s*(\d+)',text)
            update(**({'time_ns':float(dt[-1])*int(steps[-1])*1e9} if dt and steps else {}))
        assert job.returncode==0,f'Solver exit {job.returncode}'
    result=json.loads((out/'response.json').read_text());assert result['solverRun'] is True
    update(stage='raw_complete');print('COMPLETED',state['case'],flush=True)
except Exception as error:
    update(stage='needs_review',error=str(error));raise
finally:
    if handle:kernel.CloseHandle(handle)
    lock.close()
