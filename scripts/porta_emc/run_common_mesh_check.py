"""Finite matched near/floating mesh check, one four-thread solve at a time."""
import argparse,hashlib,json,msvcrt,os,re,subprocess,sys,time
from datetime import datetime,timezone
from pathlib import Path
from status_io import write_json_atomic

p=argparse.ArgumentParser();p.add_argument('--atlas',required=True);p.add_argument('--runs',required=True);p.add_argument('--install',required=True);a=p.parse_args()
atlas=Path(a.atlas).resolve();root=Path(a.runs).resolve();scripts=atlas/'scripts/porta_emc'
read=lambda p:json.loads(p.read_text(encoding='utf-8'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
lockpath=root/'.common-mesh-queue.lock'
if not lockpath.exists():lockpath.write_bytes(b'0')
lock=lockpath.open('r+b');msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
names=['near','floating']
assert all(not (root/f'test02-{bond}-fine').exists() and not (root/f'test02-preflight-{bond}-fine').exists() for bond in names),'Existing mesh check; refuse duplicate.'
base=root/'test01-same-fine';coarse=read(root/'test01-same-coarse/model.json');fine=read(base/'model.json')
assert {k:v for k,v in coarse.items() if k!='input'}=={k:v for k,v in fine.items() if k!='input'}
assert {k for k in coarse['input'] if coarse['input'][k]!=fine['input'][k]}=={'meshLines','cells','minCell_mm'}
state=dict(controllerPID=os.getpid(),stage='preparing',queue=names.copy(),finished=[],numThreads=4,
    maximumPhysicalTime_ns=12.5,meshComparison={'transverse_mm':[.20,.16],'axial_mm':[.4,.4]},
    reason='Check the large floating-versus-near CM/DM change on a matched finer transverse grid. Small near/both advantages are not being ranked.',
    startedAtUTC=datetime.now(timezone.utc).isoformat(),baseSourceHashes={n:sha(base/n) for n in ['geometry.xml','model.json','mesh.json','pec-connection-audit.json']})
def update(**values):
    state.update(values,updatedAtUTC=datetime.now(timezone.utc).isoformat())
    write_json_atomic(root/'mesh-check-batch.json',state)
    write_json_atomic(atlas/'reports/porta-test-02/data/mesh-check-progress.json',state)
def run(command,logpath,stage):
    with logpath.open('x') as log:
        job=subprocess.Popen([sys.executable,'-u',*map(str,command)],cwd=atlas,stdout=log,stderr=subprocess.STDOUT)
        update(stage=stage,childPID=job.pid,time_ns=None)
        while job.poll() is None:
            time.sleep(20)
            text=logpath.read_text(encoding='utf-8');dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',text);steps=re.findall(r'Timestep:\s*(\d+)',text)
            update(**({'time_ns':float(dt[-1])*int(steps[-1])*1e9} if dt and steps else {}))
        assert job.returncode==0,f'{logpath.name}: exit {job.returncode}'
try:
    update()
    for bond in names:
        prepared=root/f'test02-preflight-{bond}-fine';out=root/f'test02-{bond}-fine'
        update(current=bond,stage='preparing')
        run([scripts/'prepare_common_mode.py','--base',base,'--out',prepared,'--install',a.install,'--bond',bond,'--native-near-check'],root/'logs'/f'test02-prepare-{bond}-fine.log','preparing')
        run([scripts/'check_common_far.py','--prepared',prepared,'--install',a.install],root/'logs'/f'test02-check-far-{bond}-fine.log','checking_connections')
        old=read(root/f'test02-preflight-{bond}/model.json');new=read(prepared/'model.json')
        assert {k:v for k,v in old.items() if k!='input'}=={k:v for k,v in new.items() if k!='input'}
        changed=[k for k in old['input'] if old['input'][k]!=new['input'][k]]
        assert set(changed)<= {'meshLines','cells','minCell_mm','baseGeometry_sha256','script_sha256'}
        proof=dict(coarseGeometrySHA256=sha(root/f'test02-preflight-{bond}/geometry.xml'),fineGeometrySHA256=sha(prepared/'geometry.xml'),changedMetadata=changed,modelGeometryUnchanged=True)
        write_json_atomic(prepared/'mesh-comparison-preflight.json',proof)
        state['queue'].remove(bond);update(stage='calculating')
        run([scripts/'run_common_mode.py','--prepared',prepared,'--out',out,'--install',a.install,'--threads','4'],root/'logs'/f'test02-{bond}-fine.log','calculating')
        assert read(out/'response.json')['solverRun'] is True
        state['finished'].append(bond);print('COMPLETED',bond,flush=True);update()
    update(stage='raw_complete',current=None,childPID=None)
except Exception as error:
    update(stage='needs_review',error=str(error));raise
finally:
    lock.close()
