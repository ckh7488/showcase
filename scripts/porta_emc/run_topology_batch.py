"""Finite TEST 01 topology queue with saved progress and automatic packaging.

Runs five connected coarse cases, refines the two best balanced candidates,
then publishes a bounded 120 mm screening result. Existing TEST 01 records are
never modified.
"""
import argparse
import ctypes
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
import time


P = argparse.ArgumentParser()
P.add_argument('--atlas', required=True)
P.add_argument('--runs', required=True)
P.add_argument('--install', required=True)
P.add_argument('--report', required=True)
P.add_argument('--wait-pid', type=int)
args = P.parse_args()

atlas = Path(args.atlas).resolve()
runs = Path(args.runs).resolve()
report = Path(args.report).resolve()
scripts = atlas/'scripts'/'porta_emc'
runner = scripts/'run_topology_screening.py'
publisher = scripts/'publish_topology_screening.py'
spec = atlas/'reports'/'porta-test-plan'/'data'/'cable-spec.json'
progress_file = report/'data'/'topology-progress.json'
runs.mkdir(parents=True, exist_ok=True)
(runs/'logs').mkdir(exist_ok=True)

CASES = [
    ('legacy-adjacent','same','adjacent','aligned'),
    ('balanced-adjacent-aligned','mixed','adjacent','aligned'),
    ('balanced-adjacent-opposed','mixed','adjacent','opposed'),
    ('balanced-diagonal-aligned','mixed','diagonal','aligned'),
    ('balanced-diagonal-opposed','mixed','diagonal','opposed'),
]

state = {
    'revision':'topology-run-01',
    'startedAtUTC':datetime.now(timezone.utc).isoformat(),
    'updatedAtUTC':None,
    'stage':'preparing',
    'current':None,
    'rows':[],
    'note':'Actual openEMS progress only. A topology verdict is published only after the declared comparisons complete.',
}
for case_id, wiring, topology, polarity in CASES:
    state['rows'].append({'id':case_id,'wiring':wiring,'topology':topology,
                          'polarity':polarity,'coarse':'queued','fine':'not_selected'})


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix+'.tmp')
    payload = json.dumps(value, ensure_ascii=False, indent=2)
    # Antivirus, browser refreshes, and indexers can briefly hold a JSON file on
    # Windows. Keep the atomic replace, but tolerate those transient locks so a
    # long solver run is not orphaned by a progress-only write failure.
    last_error = None
    for attempt in range(20):
        try:
            temp.write_text(payload, encoding='utf-8')
            temp.replace(path)
            return
        except PermissionError as error:
            last_error = error
            time.sleep(0.25 * (attempt + 1))
    raise last_error


def update(**changes):
    state.update(changes)
    state['updatedAtUTC'] = datetime.now(timezone.utc).isoformat()
    atomic_json(progress_file, state)
    atomic_json(runs/'batch-progress.json', state)


def row(case_id):
    return next(item for item in state['rows'] if item['id']==case_id)


def wait_for_process(pid):
    if not pid:
        return
    kernel = ctypes.windll.kernel32
    kernel.OpenProcess.restype = ctypes.c_void_p
    kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    handle = kernel.OpenProcess(0x100000|0x1000, False, pid)
    if not handle:
        return
    update(stage='waiting_for_existing_solver', current=None)
    while kernel.WaitForSingleObject(handle, 0) == 258:
        time.sleep(20)
        update()
    kernel.CloseHandle(handle)


def parse_log(log_path):
    if not log_path.exists():
        return {}
    text = log_path.read_text(encoding='utf-8', errors='replace')
    matches = re.findall(r'Timestep:\s*(\d+).*?Speed:\s*([\d.]+)\s*MC/s', text)
    if not matches:
        return {}
    step, speed = matches[-1]
    return {'lastTimestep':int(step),'lastSpeed_MC_per_s':float(speed)}


def run_case(case_id, wiring, topology, polarity, level):
    destination = runs/f'{case_id}-{level}'
    result = destination/'response.json'
    item = row(case_id)
    if result.exists():
        item[level] = 'complete'
        update()
        return
    if destination.exists():
        raise RuntimeError(f'Incomplete output directory requires review: {destination.name}')
    item[level] = 'running'
    update(stage=f'calculating_{level}', current=case_id)
    cell = '.2' if level=='coarse' else '.16'
    command = [sys.executable,'-u',str(runner),'--install',args.install,
               '--spec',str(spec),'--out',str(destination),'--wiring',wiring,
               '--topology',topology,'--power-polarity',polarity,
               '--cell',cell,'--dx','.4','--threads','4','--max-time-ns','12.5']
    log_path = runs/'logs'/f'{case_id}-{level}.log'
    with log_path.open('w', encoding='utf-8') as log:
        process = subprocess.Popen(command, cwd=atlas, stdout=log,
                                   stderr=subprocess.STDOUT)
        state['childPID'] = process.pid
        while process.poll() is None:
            time.sleep(20)
            item.update(parse_log(log_path))
            update()
        if process.returncode != 0:
            raise RuntimeError(f'{case_id}-{level} exited {process.returncode}')
    response = json.loads(result.read_text(encoding='utf-8'))
    if not response.get('solverRun'):
        raise RuntimeError(f'{case_id}-{level} did not save a solver result')
    item[level] = 'complete'
    item['powerThroughAt100MHz'] = response['metrics']['powerThroughMagnitudeAt100MHz']
    update(childPID=None)


def publish(stage):
    update(stage=f'publishing_{stage}', current=None)
    subprocess.run([sys.executable,str(publisher),'--runs',str(runs),
                    '--report',str(report),'--stage',stage], cwd=atlas, check=True)


update()
try:
    wait_for_process(args.wait_pid)
    for case in CASES:
        run_case(*case, 'coarse')
    publish('coarse')
    selection = json.loads((runs/'selection.json').read_text(encoding='utf-8'))
    selected = set(selection['topTwo'])
    for case_id, wiring, topology, polarity in CASES:
        if case_id in selected:
            row(case_id)['fine'] = 'queued'
        elif row(case_id)['fine'] == 'not_selected':
            row(case_id)['fine'] = 'not_selected_after_coarse'
    update(stage='refinement_queued', current=None)
    for case in CASES:
        if case[0] in selected:
            run_case(*case, 'fine')
    publish('final')
    final = json.loads((runs/'selection.json').read_text(encoding='utf-8'))
    update(stage='complete', current=None, childPID=None,
           winner=final['winner'], completedAtUTC=datetime.now(timezone.utc).isoformat())
except Exception as error:
    update(stage='needs_review', error=str(error), childPID=None)
    raise
