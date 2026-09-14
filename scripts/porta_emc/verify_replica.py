"""Verify a clean checkout, restore archived models and recheck saved TEST02 results.

Run this from a freshly cloned repository. All output goes to a new directory;
the repository, source archives and saved verdicts remain unchanged.
"""
import argparse
import cmath
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

from restore_runs import verify


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--expected-commit', required=True, help='Full commit ID fetched from the remote')
    p.add_argument('--out', type=Path, required=True, help='New directory outside the checkout')
    p.add_argument('--install', type=Path, help='Native openEMS installation for this computer')
    p.add_argument('--skip-native', action='store_true', help='Only archives and numeric checks; explicitly records that models were not loaded')
    a = p.parse_args()
    root = Path(__file__).resolve().parents[2]
    git = lambda *args: subprocess.check_output(['git', '-C', str(root), *args], encoding='utf-8').strip()
    commit = git('rev-parse', 'HEAD')
    assert commit == a.expected_commit, (commit, a.expected_commit)
    assert not git('status', '--porcelain', '--untracked-files=no'), 'Tracked checkout files have changed'
    assert not a.out.resolve().is_relative_to(root), 'Keep verification output outside the checkout'
    a.out.mkdir(parents=True, exist_ok=False)
    manifest_path = root / 'simulations/porta-openems/manifest.json'
    manifest = read(manifest_path)
    assert manifest['allRequestedCalculationsArchived'] and not manifest['pending'], 'Archive is not final'
    for row in manifest['cases']:
        verify(manifest_path.parent, row)
    ids = ['reference/test00-straight-base', 'connected/test01-same-fine',
           'connected/test02-near-long', 'connected/test02-floating-fine', 'connected/test02-near-fine']
    # Include the final independent topology model when the selected case is present.
    ids += [r['id'] for r in manifest['cases'] if r['id'].endswith('/balanced-diagonal-opposed-fine')]
    restored = {}
    loaded = []
    for case_id in ids:
        row = next(r for r in manifest['cases'] if r['id'] == case_id)
        dst = a.out / case_id
        dst.mkdir(parents=True, exist_ok=False)
        with zipfile.ZipFile(verify(manifest_path.parent, row)) as z:
            for name in z.namelist():
                target = dst / name
                assert target.resolve().is_relative_to(dst.resolve())
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(name))
        restored[case_id] = dst / 'case'
        if not a.skip_native:
            command = [sys.executable, str(root / 'scripts/porta_emc/replay_geometry.py'), '--case', str(dst / 'case')]
            if a.install:
                command += ['--install', str(a.install)]
            output = subprocess.check_output(command, encoding='utf-8')
            record = json.loads(next(line for line in reversed(output.splitlines()) if line.startswith('{')))
            assert record['modelLoaded'] and not record['fieldSolveExecuted']
            loaded.append({'id': case_id, **record})

    time_path = root / 'reports/porta-test-02/records/time-18/time-review.json'
    mesh_root = root / 'reports/porta-test-02/records/mesh-20'
    time_data, mesh, drive = read(time_path), read(mesh_root / 'manifest.json'), read(mesh_root / 'drive-reference.json')
    verdict = read(mesh_root / 'screening-verdict.json')
    assert verdict['scientificVerdictComplete']
    report_hashes = 0
    for relative in ['reports/porta-test-01/records/connected-10', 'reports/porta-test-02/records/common-14',
                     'reports/porta-test-02/records/mesh-19', 'reports/porta-test-02/records/mesh-20']:
        directory = root / relative
        for case_record in read(directory / 'manifest.json')['cases']:
            for entry in case_record['files']:
                assert sha(directory / case_record['id'] / entry['file']) == entry['sha256'], (relative, case_record['id'], entry['file'])
                report_hashes += 1
    for entry in time_data['files']:
        assert sha(time_path.parent / time_data['evidenceFolder'] / entry['file']) == entry['sha256'], entry['file']
        report_hashes += 1
    pins = {'meshManifestSHA256': mesh_root / 'manifest.json', 'meshDriveSHA256': mesh_root / 'drive-reference.json',
            'meshDataReviewSHA256': mesh_root / 'mesh-data-review.json',
            'normalManifestSHA256': root / 'reports/porta-test-02/records/common-14/manifest.json',
            'timeVerdictSHA256': time_path.parent / 'time-verdict.json'}
    for key, path in pins.items():
        assert sha(path) == verdict['sourcePins'][key], key
        report_hashes += 1
    assert read(time_path.parent / 'time-verdict.json')['snapshot_sha256'] == sha(time_path)
    report_hashes += 1
    checks = []
    for name, windows in [('test02-near-long', [12, 24]), ('test02-floating-fine', [8, 10, 12]), ('test02-near-fine', [8, 10, 12])]:
        folder = restored['connected/' + name]
        cache = {}
        def spectrum(filename, ns, frequency):
            key = filename, ns, frequency
            if key not in cache:
                samples = []
                for line in (folder / filename).read_text(encoding='utf-8').splitlines():
                    if not line.strip() or line.lstrip().startswith('%'):
                        continue
                    t, y = map(float, line.split())
                    if t <= ns * 1e-9:
                        samples.append((t, y))
                dt = samples[1][0] - samples[0][0]
                cache[key] = 2 * dt * sum(y * cmath.exp(-2j * cmath.pi * frequency * t) for t, y in samples)
            return cache[key]
        if name == 'test02-near-long':
            frequency_list = time_data['frequency_Hz']
        else:
            case = next(c for c in mesh['cases'] if c['id'] == name)
            frequency_list = case['frequency_Hz']
        for ns in windows:
            for frequency in [10e6, 100e6, 175e6, 200e6]:
                index = frequency_list.index(frequency)
                scalar = lambda filename: spectrum(filename, ns, frequency)
                loaded_input = (scalar('port_ut_7') + scalar('port_ut_8')) / 2
                source = loaded_input + 25 * (scalar('port_it_7') + scalar('port_it_8'))
                for basis, denominator in [('loaded', loaded_input), ('drive', source)]:
                    if name == 'test02-near-long':
                        expected = time_data['windows'][str(ns)]
                        if basis == 'drive':
                            expected = expected['drive']
                    else:
                        expected = (case['windows'] if basis == 'loaded' else drive['cases'][name]['windows'])[str(ns)]
                    for suffix, end, port in [('Near', -1, 1), ('', 1, 4)]:
                        for pair in range(2):
                            outputs = {'Hdiff': scalar(f'port_ut_{port + pair}'),
                                       'Hcommon': (scalar(f'cm_{end}_{pair}_0') + scalar(f'cm_{end}_{pair}_1')) / 2}
                            for kind, voltage in outputs.items():
                                key = kind + suffix
                                actual = voltage / denominator
                                saved = complex(expected[key]['real'][pair][index], expected[key]['imag'][pair][index])
                                assert cmath.isclose(actual, saved, rel_tol=1e-9, abs_tol=1e-12), (name, ns, frequency, basis, key, pair, actual, saved)
                                checks.append({'case': name, 'window_ns': ns, 'frequency_Hz': frequency, 'basis': basis,
                                               'output': key, 'pair': pair + 1, 'value': {'real': actual.real, 'imag': actual.imag},
                                               'absoluteDifference': abs(actual - saved)})
    result = {'scope': 'Clean checkout archive, native model-load and independent scalar DFT verification',
              'checkedAtUTC': datetime.now(timezone.utc).isoformat(), 'commit': commit, 'origin': git('remote', 'get-url', 'origin'),
              'manifestSHA256': sha(manifest_path), 'archivesVerified': len(manifest['cases']),
              'memberHashesVerified': sum(len(r['files']) for r in manifest['cases']), 'pending': manifest['pending'],
              'reportEvidenceHashesChecked': report_hashes,
              'modelsLoadedWithNativePythonBindings': loaded, 'nativeCheckSkipped': a.skip_native, 'fieldSolveRerun': False,
              'independentRestoredOutputChecks': len(checks), 'maxAbsoluteDifference': max(c['absoluteDifference'] for c in checks),
              'sourcePins': [{'file': str(path.relative_to(root)).replace('\\', '/'), 'sha256': sha(path)} for path in
                             [time_path, mesh_root / 'manifest.json', mesh_root / 'drive-reference.json', mesh_root / 'screening-verdict.json']],
              'checks': checks}
    (a.out / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: result[k] for k in ['commit', 'archivesVerified', 'memberHashesVerified', 'independentRestoredOutputChecks', 'maxAbsoluteDifference', 'nativeCheckSkipped']}))


if __name__ == '__main__':
    main()
