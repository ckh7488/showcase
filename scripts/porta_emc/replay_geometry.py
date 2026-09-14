"""Load an archived model and optionally rerun its fields into a new directory.

This does not replace the original response or produce a new scientific verdict.
The default checks the saved model without running an additional simulation.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import time

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--case', type=Path, required=True, help='Restored case directory containing geometry.xml and input.json')
p.add_argument('--install', type=Path, help='openEMS native installation, if needed by the local Python package')
p.add_argument('--run', action='store_true', help='Actually run the field solver; otherwise load and check only')
p.add_argument('--out', type=Path, help='New output folder, required with --run')
p.add_argument('--threads', type=int, default=4)
a = p.parse_args()
if a.run and not a.out:
    p.error('--run requires --out')
if a.threads < 1:
    p.error('--threads must be positive')
if a.install:
    os.environ['OPENEMS_INSTALL_PATH'] = str(a.install.resolve())
from CSXCAD import ContinuousStructure
from openEMS import openEMS

meta = json.loads((a.case / 'input.json').read_text(encoding='utf-8'))
c = ContinuousStructure()
assert not c.ReadFromXML(str((a.case / 'geometry.xml').resolve()))
f = openEMS(NrTS=meta['NrTS'], EndCriteria=meta['EndCriteria'])
f.SetCSX(c)
f.SetBoundaryCond(meta['boundary'])
if meta['test'] == '00':
    f.SetGaussExcite(3.5e9, 3.5e9)
else:
    assert meta['excitation']['f0_Hz'] == 0 and meta['excitation']['fc_Hz'] == 500e6
    f.SetGaussExcite(0, 500e6)
    f.SetMaxTime(meta['maximumPhysicalTime_ns'] * 1e-9)
lines = {axis: len(c.GetGrid().GetLines(axis)) for axis in 'xyz'}
assert lines == meta['meshLines'], (lines, meta['meshLines'])
record = {'test': meta['test'], 'modelLoaded': True, 'fieldSolveExecuted': False, 'meshLines': lines,
          'originalInputSHA256': hashlib.sha256((a.case / 'input.json').read_bytes()).hexdigest(),
          'originalGeometrySHA256': hashlib.sha256((a.case / 'geometry.xml').read_bytes()).hexdigest(),
          'note': 'Raw geometry replay; use the preserved original postprocessing for the relevant output definitions.'}
if a.run:
    a.out.mkdir(parents=True, exist_ok=False)
    for name in ['input.json', 'geometry.xml', 'mesh.json']:
        shutil.copy2(a.case / name, a.out / name)
    start = time.perf_counter()
    f.Run(str(a.out.resolve()), cleanup=False, numThreads=a.threads, verbose=1)
    record.update(fieldSolveExecuted=True, elapsed_s=time.perf_counter() - start)
    (a.out / 'raw-replay.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
print(json.dumps(record))
