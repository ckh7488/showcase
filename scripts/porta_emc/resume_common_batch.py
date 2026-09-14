"""Adopt the existing TEST02 solver, then finish its two remaining cases once."""
import argparse
import ctypes
import json
import msvcrt
import os
from pathlib import Path
import subprocess
import sys
import time
from datetime import datetime,timezone
from status_io import write_json_atomic

p=argparse.ArgumentParser()
p.add_argument('--atlas',required=True);p.add_argument('--runs',required=True)
p.add_argument('--install',required=True);p.add_argument('--attach-pid',required=True,type=int)
a=p.parse_args();atlas=Path(a.atlas).resolve();root=Path(a.runs).resolve()
scripts=atlas/'scripts/porta_emc';state=json.loads((root/'finite-batch.json').read_text())
assert state['current']=='test02-floating'
assert state['queue']==['test02-near','test02-both']
assert set(state['finished'])=={f'test01-{w}-{m}' for w in ['same','mixed'] for m in ['coarse','fine']}

# A process-held lock prevents concurrent recovery controllers.
lock=(root/'.common-queue.lock').open('a+b');lock.seek(0);lock.write(b'0');lock.flush();lock.seek(0)
msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
kernel=ctypes.windll.kernel32;kernel.OpenProcess.restype=ctypes.c_void_p
kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_ulong]
kernel.CloseHandle.argtypes=[ctypes.c_void_p]
handle=None
if not (root/'test02-floating/response.json').exists():
    info=subprocess.run(['powershell','-NoProfile','-Command',f'Get-CimInstance Win32_Process -Filter "ProcessId={a.attach_pid}" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
    info=json.loads(info.stdout);command=info['CommandLine'].lower()
    assert 'run_common_mode.py' in command and str(root/'test02-floating').lower() in command
    handle=kernel.OpenProcess(0x100000|0x1000,False,a.attach_pid)
    assert handle,'Existing solver ended or is unavailable; inspect before retrying.'
state.setdefault('recoveryHistory',[]).append(dict(atUTC=datetime.now(timezone.utc).isoformat(),
    priorError=state.pop('error',None),action='Adopt existing floating solver; resume near/both once. Status-file sharing failure did not stop fields.'))
state.update(stage='calculating',childPID=a.attach_pid,controllerPID=os.getpid())
deadline=time.monotonic()+24*3600

def update():
    write_json_atomic(root/'finite-batch.json',state)
    result=subprocess.run([sys.executable,str(scripts/'connected_status.py'),'--runs',str(root),
        '--out',str(atlas/'reports/porta-test-plan/data/connected-progress.json')],stdout=subprocess.DEVNULL,check=False)
    if result.returncode:print('STATUS_UPDATE_DEFERRED: active solver/finite queue preserved.',flush=True)

def finished(name):
    result=json.loads((root/name/'response.json').read_text())
    assert result['test']=='02' and result['solverRun'] is True
    assert 'RESULT' in (root/'logs'/f'{name}.log').read_text(encoding='utf-8')
    assert name not in state['finished']
    state['finished'].append(name)

try:
    update()
    if handle:
        while kernel.WaitForSingleObject(handle,0)==258:
            assert time.monotonic()<deadline,'Finite recovery queue exceeded 24 hours.'
            update();time.sleep(20)
        kernel.CloseHandle(handle);handle=None
    finished('test02-floating');update()
    for name in ['test02-near','test02-both']:
        assert not (root/name).exists(),'Existing case folder: inspect instead of starting a duplicate.'
        bond=name.removeprefix('test02-')
        state.update(stage='calculating',current=name,childPID=None)
        state['queue'].remove(name);update()
        with (root/'logs'/f'{name}.log').open('x') as log:
            job=subprocess.Popen([sys.executable,'-u',str(scripts/'run_common_mode.py'),
                '--prepared',str(root/f'test02-preflight-{bond}'),'--out',str(root/name),
                '--install',a.install,'--threads','4'],cwd=atlas,stdout=log,stderr=subprocess.STDOUT)
            state['childPID']=job.pid
            while job.poll() is None:
                assert time.monotonic()<deadline,'Finite recovery queue exceeded 24 hours.'
                update();time.sleep(20)
            assert job.returncode==0,f'{name} exited {job.returncode}'
        finished(name);update()
    state.update(stage='raw_calculations_complete',current=None,childPID=None);update()
except Exception as error:
    state.update(stage='needs_review',error=str(error));update();raise
finally:
    if handle:kernel.CloseHandle(handle)
    lock.close()
