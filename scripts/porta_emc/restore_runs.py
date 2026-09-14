"""Verify every archived byte and optionally restore one case to a new folder."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile


def verify(root, row):
    archive = (root / row['archive']).resolve()
    assert archive.is_relative_to(root.resolve()), 'Archive escapes catalog directory'
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == row['archiveSHA256'], row['id']
    with zipfile.ZipFile(archive) as z:
        expected = {f['path']: f for f in row['files']}
        assert len(z.namelist()) == len(expected) and set(z.namelist()) == set(expected)
        for name, item in expected.items():
            path = PurePosixPath(name)
            assert not path.is_absolute() and '..' not in path.parts and ':' not in name and '\\' not in name
            value = z.read(name)
            assert len(value) == item['bytes'] and hashlib.sha256(value).hexdigest() == item['sha256'], name
    return archive


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parents[2] / 'simulations/porta-openems/manifest.json')
    p.add_argument('--case', help='Exact ID from manifest.json')
    p.add_argument('--out', type=Path, help='New extraction directory; never overwrites an existing path')
    a = p.parse_args()
    if bool(a.case) != bool(a.out):
        p.error('--case and --out must be supplied together')
    d = json.loads(a.manifest.read_text(encoding='utf-8'))
    for row in d['cases']:
        verify(a.manifest.parent, row)
    if a.case:
        row = next(r for r in d['cases'] if r['id'] == a.case)
        archive = verify(a.manifest.parent, row)
        a.out.mkdir(parents=True, exist_ok=False)
        with zipfile.ZipFile(archive) as z:
            for name in z.namelist():
                target = a.out / name
                assert target.resolve().is_relative_to(a.out.resolve())
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(name))
        print('Restored', row['id'], 'to', a.out)
    print('Verified', len(d['cases']), 'archives;', len(d['pending']), 'pending entries.')


if __name__ == '__main__':
    main()
