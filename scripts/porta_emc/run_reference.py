"""TEST 00: execute and record the official openEMS microstrip reference.

Geometry/port recipe adapted from Thorsten Liebig's MSL_NotchFilter.py,
distributed with openEMS 0.0.36 (2016-2023). Source and changes are recorded.
This runner never removes or silently reuses an existing run directory.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import time

p = argparse.ArgumentParser()
p.add_argument('--install', required=True)
p.add_argument('--out', required=True)
p.add_argument('--shape', choices=['notch', 'straight'], default='notch')
p.add_argument('--refinement', type=float, default=1)
p.add_argument('--end', type=float, default=1e-5)
p.add_argument('--threads', type=int, default=4)
p.add_argument('--reverse', action='store_true')
p.add_argument('--margin', type=float, default=1)
args = p.parse_args()
os.environ['OPENEMS_INSTALL_PATH'] = str(Path(args.install).resolve())
import numpy as np
from CSXCAD import ContinuousStructure
from openEMS import openEMS
from openEMS.physical_constants import C0

out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=False)
fdtd = openEMS(NrTS=200000, EndCriteria=args.end)
fdtd.SetGaussExcite(3.5e9, 3.5e9)
bc = ['PML_8', 'PML_8', 'MUR', 'MUR', 'PEC', 'MUR']
fdtd.SetBoundaryCond(bc)
csx = ContinuousStructure()
fdtd.SetCSX(csx)
grid = csx.GetGrid()
grid.SetDeltaUnit(1e-6)
half, width, thick, er, stub = 50000, 600, 254, 3.66, 12000
base_resolution = C0 / (7e9*np.sqrt(er)) / 1e-6 / 50
res = base_resolution / args.refinement
edge = np.array([2*res/3, -res/3])/4
for axis in ['x', 'y']:
    grid.AddLine(axis, 0)
    grid.AddLine(axis, width/2+edge)
    grid.AddLine(axis, -width/2-edge)
    grid.SmoothMeshLines(axis, res/4)
grid.AddLine('x', [-half, half])
grid.SmoothMeshLines('x', res)
grid.AddLine('y', [-15*width*args.margin, (15*width+stub)*args.margin])
grid.AddLine('y', (width/2+stub)+edge)
grid.SmoothMeshLines('y', res)
grid.AddLine('z', np.linspace(0, thick, int(round(4*args.refinement))+1))
grid.AddLine('z', 3000*args.margin)
grid.SmoothMeshLines('z', res)
substrate = csx.AddMaterial('reference_substrate', epsilon=er)
substrate.AddBox([-half, -15*width*args.margin, 0],
                 [half, (15*width+stub)*args.margin, thick])
metal = csx.AddMetal('PEC')
ports = []
for i, sign in enumerate([-1, 1]):
    excited = (i == 1) if args.reverse else (i == 0)
    ports.append(fdtd.AddMSLPort(i+1, metal,
        [sign*half, -width/2, thick], [0, width/2, 0], 'x', 'z',
        excite=-1 if excited else 0,
        FeedShift=10*base_resolution,
        MeasPlaneShift=half/3, priority=10))
if args.shape == 'notch':
    metal.AddBox([-width/2, width/2, thick],
                 [width/2, width/2+stub, thick], priority=10)
lines = {a: grid.GetLines(a).tolist() for a in ['x', 'y', 'z']}
meta = {'test': '00', 'shape': args.shape, 'solver': 'openEMS',
    'versions': {k: importlib.metadata.version(k) for k in ['openEMS','CSXCAD','numpy']},
    'source': 'https://docs.openems.de/python/openEMS/Tutorials/MSL_NotchFilter.html',
    'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'geometry': {'units':'um','length':2*half,'width':width,'substrateThickness':thick,
                 'epsilon_r':er,'stubLength':stub if args.shape=='notch' else 0},
    'changes': ['Explicit timestep cap/end criterion and numerical output; no plotting GUI.',
                'Uniform-line, refinement, reverse-source and margin variants are explicit.',
                'FeedShift fixed at original baseline distance across refinements.'],
    'refinement':args.refinement, 'margin':args.margin, 'reverse':args.reverse,
    'boundary':bc, 'EndCriteria':args.end, 'NrTS':200000,
    'numThreads':args.threads, 'meshLines':{a:len(v) for a,v in lines.items()},
    'cells':int(np.prod([len(v)-1 for v in lines.values()])),
    'minCell_um':{a:float(np.diff(v).min()) for a,v in lines.items()},
    'referenceImpedance_ohm':50, 'solverRun':False}
(out/'input.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
(out/'mesh.json').write_text(json.dumps(lines),encoding='utf-8')
csx.Write2XML(str(out/'geometry.xml'))
print('INPUT', json.dumps(meta), flush=True)
t0=time.perf_counter()
fdtd.Run(str(out),cleanup=False,numThreads=args.threads,verbose=1)
elapsed=time.perf_counter()-t0
freq=np.linspace(1e6,7e9,701)
for port in ports:
    port.CalcPort(str(out),freq,ref_impedance=50)
source=1 if args.reverse else 0
dest=1-source
reflection=ports[source].uf_ref/ports[source].uf_inc
transmission=ports[dest].uf_ref/ports[source].uf_inc
power=np.abs(reflection)**2+np.abs(transmission)**2
assert np.isfinite(reflection).all() and np.isfinite(transmission).all()
np.savez_compressed(out/'response.npz',frequency_Hz=freq,reflection=reflection,
    transmission=transmission,source_incident=ports[source].uf_inc,
    port1_voltage=ports[0].uf_tot,port2_voltage=ports[1].uf_tot)
band=(freq>=.5e9)&(freq<=6e9)
resdata={'test':'00','solverRun':True,'elapsed_s':elapsed,'input':meta,
    'frequency_Hz':freq.tolist(),
    'reflection':{'real':reflection.real.tolist(),'imag':reflection.imag.tolist()},
    'transmission':{'real':transmission.real.tolist(),'imag':transmission.imag.tolist()},
    'metrics':{'assessmentBand_Hz':[.5e9,6e9],
      'maxOutgoingOverIncidentPower':float(power[band].max()),
      'minimumTransmission_dB':float((20*np.log10(np.maximum(abs(transmission[band]),1e-30))).min()),
      'notchFrequency_Hz':float(freq[band][np.argmin(abs(transmission[band]))])},
    'validation':'Run completed; convergence, energy termination and geometry checks are evaluated separately.'}
(out/'response.json').write_text(json.dumps(resdata,indent=2),encoding='utf-8')
print('RESULT',json.dumps(resdata['metrics']), 'elapsed_s',elapsed,flush=True)
