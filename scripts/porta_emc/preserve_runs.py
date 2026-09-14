"""Archive completed runs without modifying them; keep a portable SHA256 catalog."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

REPO = Path(__file__).resolve().parents[2]
DEST = REPO / 'simulations' / 'porta-openems'
READ = lambda p: json.loads(p.read_text(encoding='utf-8'))
SHA = lambda b: hashlib.sha256(b).hexdigest()


def pack(root, name, family, destination):
    source = root / name
    response = READ(source / 'response.json')
    assert response.get('solverRun') is True, name
    log = root / 'logs' / (name + '.log')
    assert re.search(r'Time for \d+ iterations', log.read_text(encoding='utf-8')), name
    members = {}
    def include(directory, prefix):
        for path in sorted(directory.rglob('*')):
            if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc':
                members[prefix + '/' + path.relative_to(directory).as_posix()] = path.read_bytes()
    include(source, 'case')
    members['case/solver.log'] = log.read_bytes()
    if family == 'reference':
        runner = REPO / 'reports/porta-test-plan/records/initial-openems/run_reference.py'
        assert SHA(runner.read_bytes()) == READ(source / 'input.json')['script_sha256']
        members['case/run_reference.py'] = runner.read_bytes()
    if family == 'connected' and name.startswith('test02-'):
        prepared = root / name.replace('test02-', 'test02-preflight-', 1)
        assert prepared.is_dir(), prepared.name
        include(prepared, 'preparation')
        assert members['case/geometry.xml'] == members['preparation/geometry.xml']
    meta = READ(source / 'input.json')
    runner = ('run_reference.py' if family == 'reference' else
              'run_topology_screening.py' if family == 'topology' else
              'run_common_mode.py' if name.startswith('test02-') else 'run_cable_screening.py')
    assert SHA(members['case/' + runner]) == meta.get('runner_sha256', meta['script_sha256'])
    members['inputs/cable-spec.json'] = (REPO / 'reports/porta-test-plan/data/cable-spec.json').read_bytes()
    members['LICENSE-openEMS.txt'] = (REPO / 'scripts/porta_emc/COPYING-openEMS.txt').read_bytes()
    file_index = [{'path': key, 'bytes': len(value), 'sha256': SHA(value)} for key, value in sorted(members.items())]
    digest = SHA(json.dumps(file_index, sort_keys=True).encode())
    relative = 'archives/' + family + '--' + name + '--' + digest[:12] + '.zip'
    archive = destination / relative
    archive.parent.mkdir(parents=True, exist_ok=True)
    if not archive.exists():
        with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
            for key, value in sorted(members.items()):
                info = zipfile.ZipInfo(key, date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                z.writestr(info, value)
    with zipfile.ZipFile(archive) as z:
        assert sorted(z.namelist()) == sorted(members)
        for entry in file_index:
            assert SHA(z.read(entry['path'])) == entry['sha256']
    # Detect changes during copying. Completed outputs must be immutable here.
    for key, value in members.items():
        if key.startswith('case/') and key not in ['case/solver.log', 'case/run_reference.py']:
            assert (source / key.removeprefix('case/')).read_bytes() == value
    return {'id': family + '/' + name, 'test': meta['test'], 'archive': relative,
            'archiveSHA256': SHA(archive.read_bytes()), 'archiveBytes': archive.stat().st_size,
            'contentSHA256': digest, 'files': file_index, 'completedCalculation': True,
            'scientificAcceptance': 'See the separate report verdict; calculation completion is not acceptance.',
            'versions': meta['versions'], 'caseRoot': 'case', 'runner': 'case/' + runner}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connected', required=True)
    parser.add_argument('--reference')
    parser.add_argument('--topology')
    parser.add_argument('--out', type=Path, default=DEST)
    args = parser.parse_args()
    expected = {'reference': ['test00-notch-base', 'test00-straight-base', 'test00-straight-fine'],
                'connected': [f'test01-{w}-{m}' for w in ['same', 'mixed'] for m in ['coarse', 'fine']] +
                ['test02-floating', 'test02-near', 'test02-both', 'test02-near-long', 'test02-near-fine', 'test02-floating-fine']}
    rows, pending = [], []
    for family in ['reference', 'connected', 'topology']:
        value = getattr(args, family)
        if not value:
            continue
        root = Path(value).resolve()
        names = expected.get(family)
        if family == 'topology':
            progress = READ(root / 'batch-progress.json')
            names = [r['id'] + '-' + level for r in progress['rows'] for level in ['coarse', 'fine']
                     if not r[level].startswith('not_selected')]
            if progress['stage'] != 'complete':
                pending.append({'id': 'topology/queue', 'status': 'Selection or execution remains active; refresh before handoff.'})
        for name in names:
            if not (root / name / 'response.json').exists():
                pending.append({'id': family + '/' + name, 'status': 'No completed response; no archive created.'})
                continue
            rows.append(pack(root, name, family, args.out))
    args.out.mkdir(parents=True, exist_ok=True)
    manifest = {'schema': 1, 'purpose': 'Move exact models, raw probes and saved results to another computer.',
                'allRequestedCalculationsArchived': not pending, 'pending': pending, 'cases': rows,
                'note': 'Per-run archives are immutable. This catalog is refreshed after more runs complete. Scientific verdicts live in the reports.'}
    (args.out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'archived': len(rows), 'pending': len(pending), 'archiveBytes': sum(r['archiveBytes'] for r in rows)}))


if __name__ == '__main__':
    main()
