"""Adopt the running floating case and execute TEST02 with at most two solvers."""
import argparse,ctypes,json,msvcrt,os,subprocess,sys,time
from pathlib import Path
from datetime import datetime,timezone,timedelta
from status_io import write_json_atomic

p=argparse.ArgumentParser()
p.add_argument('--atlas',required=True);p.add_argument('--runs',required=True)
p.add_argument('--install',required=True);p.add_argument('--attach-pid',type=int,required=True)
a=p.parse_args();atlas=Path(a.atlas).resolve();root=Path(a.runs).resolve();scripts=atlas/'scripts/porta_emc'
state=json.loads((root/'finite-batch.json').read_text())
assert state['current']=='test02-floating' and state['queue']==['test02-near','test02-both']
assert all((root/name/'response.json').exists() for name in state['finished'])
assert all(not (root/name).exists() for name in state['queue'])
lock=(root/'.common-queue.lock').open('r+b');msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
kernel=ctypes.windll.kernel32;kernel.OpenProcess.restype=ctypes.c_void_p
kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_ulong];kernel.CloseHandle.argtypes=[ctypes.c_void_p]
info=subprocess.run(['powershell','-NoProfile','-Command',f'Get-CimInstance Win32_Process -Filter "ProcessId={a.attach_pid}" | Select-Object CommandLine | ConvertTo-Json -Compress'],capture_output=True,text=True,check=True)
command=json.loads(info.stdout)['CommandLine'].lower()
assert 'run_common_mode.py' in command and str(root/'test02-floating').lower() in command
handle=kernel.OpenProcess(0x100000|0x1000,False,a.attach_pid);assert handle
active={'test02-floating':dict(pid=a.attach_pid,handle=handle,job=None,log=None,threads=4)}
state.update(stage='calculating',controllerPID=os.getpid(),concurrency=2,failures=[],
    requestedReviewByUTC=(datetime.now(timezone.utc)+timedelta(hours=10)).isoformat(),
    schedulingNote='Two independent solvers maximum. Existing floating run keeps 4 threads; near and both use 2 each. No existing fields restarted.')
state.setdefault('recoveryHistory',[]).append(dict(atUTC=datetime.now(timezone.utc).isoformat(),
    action='User requested parallel simulations within CPU capacity; adopt floating and schedule near/both in one additional slot.'))
deadline=time.monotonic()+24*3600

def update():
    state['running']=[dict(id=name,pid=job['pid'],threads=job['threads']) for name,job in active.items()]
    state['current']=next(iter(active),None);state['childPID']=next(iter(active.values()))['pid'] if active else None
    write_json_atomic(root/'finite-batch.json',state)
    result=subprocess.run([sys.executable,str(scripts/'connected_status.py'),'--runs',str(root),
        '--out',str(atlas/'reports/porta-test-plan/data/connected-progress.json')],stdout=subprocess.DEVNULL,check=False)
    if result.returncode:print('STATUS_UPDATE_DEFERRED: solver scheduling continues.',flush=True)

def launch(name):
    assert not (root/name).exists(), 'Existing case folder; refusing a duplicate.'
    bond=name.removeprefix('test02-');log=(root/'logs'/f'{name}.log').open('x')
    job=subprocess.Popen([sys.executable,'-u',str(scripts/'run_common_mode.py'),
        '--prepared',str(root/f'test02-preflight-{bond}'),'--out',str(root/name),
        '--install',a.install,'--threads','2'],cwd=atlas,stdout=log,stderr=subprocess.STDOUT)
    active[name]=dict(pid=job.pid,handle=None,job=job,log=log,threads=2)
    state['queue'].remove(name)
    print('STARTED',name,'pid',job.pid,'threads 2',flush=True)

try:
    update()
    while active or (state['queue'] and not state['failures']):
        assert time.monotonic()<deadline,'Finite parallel queue exceeded 24 hours.'
        for name,job in list(active.items()):
            done=job['job'].poll() is not None if job['job'] else kernel.WaitForSingleObject(job['handle'],0)!=258
            if not done:continue
            if job['handle']:kernel.CloseHandle(job['handle'])
            if job['log']:job['log'].close()
            del active[name]
            try:
                if job['job']:assert job['job'].returncode==0,f'Exit code {job["job"].returncode}'
                response=json.loads((root/name/'response.json').read_text())
                assert response['test']=='02' and response['solverRun'] is True
                assert 'RESULT' in (root/'logs'/f'{name}.log').read_text(encoding='utf-8')
                assert name not in state['finished'];state['finished'].append(name)
                print('COMPLETED',name,flush=True)
            except Exception as error:
                state['failures'].append(dict(id=name,error=str(error)))
                state['stage']='needs_review'
        while len(active)<2 and state['queue'] and not state['failures']:
            launch(state['queue'][0])
        update()
        if active:time.sleep(20)
    state['stage']='needs_review' if state['failures'] else 'raw_calculations_complete';update()
except Exception as error:
    state.update(stage='needs_review',error=str(error));update();raise
finally:
    for job in active.values():
        if job['handle']:kernel.CloseHandle(job['handle'])
        if job['log']:job['log'].close()
    lock.close()
