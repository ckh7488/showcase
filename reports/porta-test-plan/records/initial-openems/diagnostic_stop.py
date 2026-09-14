"""Apply a recorded diagnostic observation limit to this task's running cases.

The official ABORT-file interface flushes probe data and allows postprocessing.
This never reports the configured EndCriteria as satisfied merely because of a
diagnostic stop. It does not kill a process or touch another run directory.
"""
import argparse
from datetime import datetime,timezone
import json
from pathlib import Path
import re
import time

p=argparse.ArgumentParser()
p.add_argument('--runs',required=True)
p.add_argument('--duration-ns',type=float,default=8)
args=p.parse_args()
root=Path(args.runs).resolve()
ids=['test01-same-coarse','test01-mixed-coarse']
pending=set(ids)
while pending:
    for name in list(pending):
        folder=(root/name).resolve()
        if folder.parent!=root:
            raise RuntimeError('Run directory escaped the named task root.')
        if (folder/'response.json').exists():
            pending.remove(name)
            continue
        log=(root/'logs'/f'{name}.log').read_text(encoding='utf-8')
        delta=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',log)
        steps=re.findall(r'Timestep:\s*(\d+)',log)
        if not delta or not steps:
            continue
        duration=float(delta[-1])*int(steps[-1])
        if duration<args.duration_ns*1e-9:
            continue
        note={'operation':'Controlled stop through the official ABORT file, with probe-data flushing.',
            'reason':'First diagnostic window: slow residual-energy decay; inspect saved transfer and tail sensitivity before a longer field run.',
            'requestedDuration_s':args.duration_ns*1e-9,
            'lastObservedTime_s':duration,'lastObservedIteration':int(steps[-1]),
            'timeUTC':datetime.now(timezone.utc).isoformat(),
            'EndCriteriaWaived':False,
            'convergenceStatus':'Configured energy criterion must still be assessed; manual stop is not convergence.',
            'source':'https://wiki.openems.de/index.php/Frequently_Asked_Questions.html'}
        (folder/'diagnostic-stop.json').write_text(json.dumps(note,indent=2),encoding='utf-8')
        (folder/'ABORT').touch(exist_ok=False)
        print(json.dumps({'id':name,**note}),flush=True)
        pending.remove(name)
    if pending:
        time.sleep(10)
