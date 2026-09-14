"""Package genuine time/mesh comparisons for susceptibility screening.

Keep the invalid first-run diagnostic records unchanged; never use them as a
connected-cable baseline. Both new meshes must pass the electrical net audit. Recompute only DFTs of saved
probe samples, using common physical cutoffs without resampling or extrapolation.
The assessment describes material changes in outputs, not certified accuracy.
"""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import shutil
import numpy as np

P = argparse.ArgumentParser()
P.add_argument('--runs', required=True)
P.add_argument('--initial', required=True)
P.add_argument('--out', required=True)
args = P.parse_args()
runs, initial, out = map(Path, [args.runs, args.initial, args.out])
out.mkdir(parents=True, exist_ok=True)
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
encode = lambda a: {'real': a.real.tolist(), 'imag': a.imag.tolist()}
decode = lambda r, k: np.array(r[k]['real']) + 1j*np.array(r[k]['imag'])
WINDOWS = [8, 10, 12]
OUTPUTS = ['Hdiff','Hcommon','HdiffNear','HcommonNear']
GUIDE = {
    'purpose': 'Locate consequential coupling and prioritize changes; not a 1% or 0.1% accuracy certification.',
    'observationCutoffs_ns': WINDOWS,
    'maximumSolverTime_ns': 12.5,
    'materialMagnitudeChange_dB': 3,
    'largeWiringEffect_amplitudeRatio': 2,
    'prominentBandFractionOfChannelPeak': 0.1,
    'meaning': '3 dB flags an appreciable magnitude change. A factor of two identifies a clear wiring effect or a dominant pair. These are screening guides, not immunity limits or certified error bounds. All curves and absolute changes are retained.',
}


def response_at(folder, original, stop_ns):
    freq = np.array(original['frequency_Hz'])
    meta = {}
    def dft(name):
        a = np.loadtxt(folder/name, comments='%')
        stop = stop_ns*1e-9
        assert a[-1, 0] >= stop, (folder.name, name, a[-1, 0], stop)
        a = a[a[:, 0] <= stop]
        t, v = a.T
        meta[name] = {'samples': len(t), 'lastSample_s': float(t[-1]),
                      'sampleInterval_s': float(t[1]-t[0])}
        return 2*(t[1]-t[0])*(np.exp(-2j*np.pi*freq[:, None]*t[None, :])@v)
    v = np.array([dft(f'port_ut_{n}') for n in range(1, 7)])
    i = np.array([dft(f'port_it_{n}') for n in range(1, 7)])
    cm = np.array([(dft(f'cm_1_{p}_0')+dft(f'cm_1_{p}_1'))/2 for p in [0, 1]])
    cm_near = np.array([(dft(f'cm_-1_{p}_0')+dft(f'cm_-1_{p}_1'))/2 for p in [0, 1]])
    vin = v[2]
    assert np.isfinite(vin).all() and np.all(abs(vin)>1e-30)
    hd, hc = v[3:5]/vin, cm/vin
    inc, ref = (v+100*i)/2, (v-100*i)/2
    sc = ref/inc[2]
    arrays = dict(frequency_Hz=freq, Vin=vin, Hpower=v[5]/vin, Vdiff=v[3:5], Vcommon=cm,
                  Hdiff=hd, Hcommon=hc, HdiffNear=v[:2]/vin, HcommonNear=cm_near/vin,
                  portVoltage=v, portCurrent=i, Scolumn=sc)
    record = {k: encode(arrays[k]) for k in OUTPUTS+['Vin','Hpower']}
    record.update(frequency_Hz=freq.tolist(),
        metrics={'peakHdiff': abs(hd).max(axis=1).tolist(),
            'peakHdiffFrequency_Hz': freq[abs(hd).argmax(axis=1)].tolist(),
            'maxOutgoingOverIncidentPortPower': float((abs(sc)**2).sum(axis=0).max()),
            'minimumInputSpectrumMagnitude': float(abs(vin).min()),
            'powerThroughAt10MHz_VperV': float(abs(v[5,0]/vin[0])),
            'powerThroughAt100MHz_VperV': float(abs(v[5,90]/vin[90])),
            'inputReflectionMagnitudeAt100MHz': float(abs(sc[2,90]))},
        postprocessing={'operation': 'DFT of retained samples up to a common physical cutoff; no interpolation or extrapolation.',
            'requestedObservationEnd_s': stop_ns*1e-9, 'traceWindows': meta,
            'note': 'Time steps and probe sample times can differ between meshes. Each DFT uses its own actual times.'})
    return record, arrays


def comparison(a, b, key):
    h0, h1 = decode(a, key), decode(b, key)
    f = np.array(a['frequency_Hz'])
    result = []
    for pair in [0, 1]:
        x, y = abs(h0[pair]), abs(h1[pair])
        peak = max(x.max(), y.max())
        mask = np.maximum(x, y) >= peak*GUIDE['prominentBandFractionOfChannelPeak']
        dd = abs(20*np.log10(np.maximum(y, 1e-30)/np.maximum(x, 1e-30)))
        result.append({'pair': pair+1,
            'peakBefore_VperV': float(x.max()), 'peakAfter_VperV': float(y.max()),
            'peakBefore_Hz': float(f[x.argmax()]), 'peakAfter_Hz': float(f[y.argmax()]),
            'maxAbsoluteMagnitudeChange_VperV': float(abs(y-x).max()),
            'maxComplexChange_VperV': float(abs(h1[pair]-h0[pair]).max()),
            'maxMagnitudeChangeProminentBand_dB': float(dd[mask].max()),
            'frequenciesAbove3dB_Hz': f[mask & (dd>GUIDE['materialMagnitudeChange_dB'])].tolist(),
            'at100MHz': {'before_VperV': float(x[90]), 'after_VperV': float(y[90])}})
    return result


manifest0 = read(initial/'manifest.json')
references = manifest0['references']
for r in references:
    shutil.copytree(initial/r['id'], out/r['id'], dirs_exist_ok=True)
for name in ['run_reference.py', 'COPYING-openEMS.txt']:
    shutil.copy2(initial/name, out/name)
for name in ['run_cable_screening.py', 'check_pec_connections.py', 'publish_connected.py']:
    shutil.copy2(Path(__file__).parent/name, out/name)

records = []
models = {}
for wiring in ['same', 'mixed']:
    for level in ['coarse', 'fine']:
        name = f'test01-{wiring}-{level}'
        src, dst = runs/name, out/name
        dst.mkdir(exist_ok=True)
        original = read(src/'response.json')
        assert original['solverRun'] is True
        assert original['input']['script_sha256'] == sha(out/'run_cable_screening.py')
        assert sha(src/'run_cable_screening.py')==original['input']['script_sha256']
        windows = {}
        evidence = []
        for ns in WINDOWS:
            record, arrays = response_at(src, original, ns)
            key = str(ns)
            np.savez_compressed(dst/f'window-{key}ns.npz', **arrays)
            windows[key] = record
        r = {**original, **windows[str(WINDOWS[-1])], 'id': name,
             'windows': windows, 'runnerFile': 'run_cable_screening.py'}
        log = (runs/'logs'/f'{name}.log').read_text(encoding='utf-8')
        assert not re.search(r'(?<![A-Za-z0-9_])[A-Za-z]:[\\/]|/Users/|/home/', log)
        energies = re.findall(r'Energy:.*?\(\s*(-?[\d.]+)dB\)', log)
        iterations = re.findall(r'Time for (\d+) iterations', log)
        assert energies and iterations, f'Incomplete solver log: {name}'
        final = float(energies[-1])
        r['termination'] = {'lastReportedEnergy_dB': final,
            'iterations': int(iterations[-1]), 'criterion': original['input']['EndCriteria'],
            'energyCriterionConfirmed': bool(final <= 10*np.log10(original['input']['EndCriteria'])+.05),
            'reason': 'energy_criterion' if final <= -49.95 else 'predeclared_12p5ns_observation_limit',
            'note': 'The original energy target is recorded separately from the screening comparison.'}
        dt = float(re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)', log)[-1])
        rows = re.findall(r'Timestep:\s*(\d+).*?Energy:\s*~?([\d.eE+-]+)', log)
        pulse = int(re.findall(r'Excitation signal length is:\s*(\d+) timesteps', log)[-1])
        peak = max(float(e) for _, e in rows)
        r['energyProgress'] = {'time_s': [int(n)*dt for n, e in rows],
            'relativeToLoggedPeak_dB': [float(10*np.log10(float(e)/peak)) for n, e in rows],
            'sourceEnd_s': pulse*dt,
            'description': 'Approximate energy indicator from actual progress logs, not an independent energy integral.'}
        r['portPowerCheck'] = {'maximumRatio': r['metrics']['maxOutgoingOverIncidentPortPower'],
            'passed': r['metrics']['maxOutgoingOverIncidentPortPower'] <= 1.01,
            'scope': 'Necessary port consistency only; not full radiation/loss balance.'}
        files = ['input.json', 'model.json', 'mesh.json', 'geometry.xml', 'openEMS.xml', 'pec-connection-audit.json', 'run_cable_screening.py', 'check_pec_connections.py']
        files += sorted(p.name for p in src.iterdir() if p.name.startswith(('port_ut_', 'port_it_', 'cm_')) and p.is_file())
        for filename in files:
            if (src/filename).exists():
                shutil.copy2(src/filename, dst/filename)
        shutil.copy2(src/'response.json', dst/'full-window-response.json')
        shutil.copy2(src/'response.npz', dst/'full-window-response.npz')
        shutil.copy2(dst/f'window-{WINDOWS[-1]}ns.npz', dst/'response.npz')
        (dst/'solver.log').write_text(log, encoding='utf-8')
        with (dst/'transfer.csv').open('w', newline='', encoding='utf-8') as stream:
            writer = csv.writer(stream)
            writer.writerow(['observation_ns', 'frequency_Hz', 'pair']+[f'{key}_{part}_VperV' for key in OUTPUTS for part in ['real','imag']])
            for ns, item in windows.items():
                for k, freq in enumerate(item['frequency_Hz']):
                    for pair in [0, 1]:
                        writer.writerow([ns, freq, pair+1, *[item[key][part][pair][k] for key in OUTPUTS for part in ['real','imag']]])
        for path in sorted(dst.iterdir()):
            if path.is_file() and path.name != 'response.json':
                evidence.append({'file': f'{name}/{path.name}', 'sha256': sha(path)})
        r['evidenceFiles'] = evidence
        (dst/'response.json').write_text(json.dumps(r, indent=2), encoding='utf-8')
        records.append(r)
        models[name] = read(src/'model.json')

byid = {r['id']: r for r in records}
checks = {}
for wiring in ['same', 'mixed']:
    coarse, fine = [models[f'test01-{wiring}-{level}'] for level in ['coarse', 'fine']]
    checks[f'{wiring}PhysicalGeometryUnchangedAcrossMeshes'] = all(coarse[k] == fine[k] for k in ['wires','ports','referencePlate'])
    old = read(initial/f'test01-{wiring}-coarse/model.json')
    checks[f'{wiring}PhysicalGeometryUnchangedFromFirstRun'] = all(coarse[k] == old[k] for k in ['wires','ports','referencePlate'])
    checks[f'{wiring}CoarseMeshCorrectedFromFirstRun'] = read(runs/f'test01-{wiring}-coarse/mesh.json') != read(initial/f'test01-{wiring}-coarse/mesh.json')
    for level in ['coarse','fine']:
        connection=read(runs/f'test01-{wiring}-{level}'/'pec-connection-audit.json')
        terminal_ids=connection['terminalComponentsWithCaps']
        checks[f'{wiring}.{level}.terminalsConnected']=all(c[0] is not None and c[0]==c[1] for c in terminal_ids)
        checks[f'{wiring}.{level}.sixElectricalNets']=len({c[0] for c in terminal_ids})==6
    for key in ['length_mm','pitch_mm','height_mm','copperRadius_mm','insulationRadius_mm','pairCenters_yz_mm','shield','epsilon_r_PP','epsilon_r_TPE','lossModel','boundary','airMargin_mm','excitation']:
        checks[f'{wiring}.{key}'] = coarse['input'][key] == fine['input'][key] == old['input'][key]
assert all(checks.values()), {k:v for k,v in checks.items() if not v}

assessment = {'guides': GUIDE, 'inputChecks': checks, 'timeComparisons': {}, 'meshComparisons': {}, 'outputs': {}}
for r in records:
    assessment['timeComparisons'][r['id']] = {key: {
        f'{a}_to_{b}ns': comparison(r['windows'][str(a)], r['windows'][str(b)], key)
        for a,b in [(8,10),(10,12),(8,12)]} for key in OUTPUTS}
    assessment['outputs'][r['id']] = {}
    for ns, item in r['windows'].items():
        assessment['outputs'][r['id']][ns] = {key: {
            'peakEachPair_VperV': abs(decode(item,key)).max(axis=1).tolist(),
            'peakEachPair_Hz': np.array(item['frequency_Hz'])[abs(decode(item,key)).argmax(axis=1)].tolist(),
            'at100MHzEachPair_VperV': abs(decode(item,key))[:,90].tolist()
        } for key in OUTPUTS}
for wiring in ['same','mixed']:
    a,b = [byid[f'test01-{wiring}-{level}'] for level in ['coarse','fine']]
    assessment['meshComparisons'][wiring] = {ns: {key: comparison(a['windows'][ns],b['windows'][ns],key)
        for key in OUTPUTS} for ns in a['windows']}
manifest = {'revision': 'connected-openems-07', 'solverRun': True,
    'status': 'screening_comparisons_completed', 'solver': manifest0['solver'],
    'referenceChecks': manifest0['referenceChecks'], 'references': references,
    'cableRuns': records, 'screening': assessment,
    'completedComparisons': {'coarseAB': True, 'bothRefinedGrids': True, 'longerObservationBothWiringsBothMeshes': True},
    'limits': manifest0['limits'],
    'initialRecords': '../initial-openems/manifest.json',
    'connectionCorrectionEvidence': '../screening-review-06/manifest.json',
    'meshScope': 'Both meshes use 0.4 mm axial spacing after the connection correction; transverse spacing 0.20 vs 0.16 mm. This comparison does not establish axial or boundary convergence.'}
review = runs/'assessment-review.json'
if review.exists():
    manifest['summary'] = read(review)
(out/'screening-guides.json').write_text(json.dumps(GUIDE, ensure_ascii=False, indent=2), encoding='utf-8')
(out/'assessment.json').write_text(json.dumps(assessment, ensure_ascii=False, indent=2), encoding='utf-8')
(out/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'status': manifest['status'], 'runs': len(records), 'inputChecks': all(checks.values()), 'windows_ns': WINDOWS}))
