"""Finite queue for this requested follow-up, with live saved progress.

No recurring schedule. Stops on solver/connection/transmission failure. It
retains raw results but does not publish a scientific verdict automatically.
"""
import argparse,ctypes,json,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
from status_io import write_json_atomic
p=argparse.ArgumentParser();p.add_argument('--atlas',required=True);p.add_argument('--runs',required=True);p.add_argument('--install',required=True);p.add_argument('--wait-pid',type=int,required=True);p.add_argument('--include-common',action='store_true');a=p.parse_args()
atlas=Path(a.atlas).resolve();root=Path(a.runs).resolve();scripts=atlas/'scripts'/'porta_emc'
status=atlas/'reports'/'porta-test-plan'/'data'/'connected-progress.json'
state={'startedAtUTC':datetime.now(timezone.utc).isoformat(),'stage':'waiting_first_case','current':'test01-same-coarse','queue':[],'finished':[],'publication':'Raw calculations only; scientific review and report publication are separate.'}
queue=[(f'test01-{w}-{m}',[sys.executable,'-u',str(scripts/'run_cable_screening.py'),'--install',a.install,'--spec',str(atlas/'reports/porta-test-plan/data/cable-spec.json'),'--out',str(root/f'test01-{w}-{m}'),'--wiring',w,'--cell',str(cell),'--dx','.4','--threads','4','--max-time-ns','12.5']) for w,m,cell in [('mixed','coarse',.2),('same','fine',.16),('mixed','fine',.16)]]
if a.include_common:
    queue += [(f'test02-{bond}',[sys.executable,'-u',str(scripts/'run_common_mode.py'),'--prepared',str(root/f'test02-preflight-{bond}'),'--out',str(root/f'test02-{bond}'),'--install',a.install,'--threads','4']) for bond in ['floating','near','both']]
state['queue']=[name for name,_ in queue]
def update():
    write_json_atomic(root/'finite-batch.json',state)
    published=subprocess.run([sys.executable,str(scripts/'connected_status.py'),'--runs',str(root),'--out',str(status)],stdout=subprocess.DEVNULL,check=False)
    if published.returncode:print('STATUS_UPDATE_DEFERRED: solver queue continues; retry at next update.',flush=True)
def transmission(name):
    data=json.loads((root/name/'response.json').read_text());assert data['solverRun']
    if data['test']=='01':
        value=data['metrics']['powerThroughMagnitudeAt100MHz']
        assert .05<value<10, f'{name}: gross power-through diagnostic requires review: {value}'
        state.setdefault('powerThroughChecks',{})[name]={'magnitudeAt100MHz':value,'purpose':'Broad diagnostic for absent/exploding power transmission; not a cable performance specification.'}
    state['finished'].append(name)
update()
try:
    kernel=ctypes.windll.kernel32;kernel.OpenProcess.restype=ctypes.c_void_p
    kernel.WaitForSingleObject.argtypes=[ctypes.c_void_p,ctypes.c_ulong];kernel.CloseHandle.argtypes=[ctypes.c_void_p]
    handle=kernel.OpenProcess(0x100000|0x1000,False,a.wait_pid)
    assert handle,'First solver process is unavailable; inspect before resuming.'
    deadline=time.monotonic()+24*3600
    while kernel.WaitForSingleObject(handle,0)==258:
        assert time.monotonic()<deadline,'Finite queue exceeded 24-hour bound.'
        update();time.sleep(20)
    kernel.CloseHandle(handle)
    transmission('test01-same-coarse')
    for name,command in queue:
        state.update(stage='calculating',current=name);state['queue'].remove(name);update()
        with (root/'logs'/f'{name}.log').open('w') as log:
            job=subprocess.Popen(command,cwd=atlas,stdout=log,stderr=subprocess.STDOUT)
            state['childPID']=job.pid
            while job.poll() is None:update();time.sleep(20)
            assert job.returncode==0,f'{name} exited {job.returncode}'
        transmission(name);update()
    state.update(stage='raw_calculations_complete',current=None,childPID=None);update()
except Exception as error:
    state.update(stage='needs_review',error=str(error));update();raise
