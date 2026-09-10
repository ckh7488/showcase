"""Losslessly publish existing registerFrame/registerBorderFrame data as binary assets.

Usage: python scripts/pack_lidar_frames.py SOURCE_DATA_DIR REPORT_DATA_DIR
Requires NumPy only while exporting; the published site needs no server code.
XYZ tuples are interned per frame. Byte-plane compression and ordered indices
preserve every float32 bit, point order, duplicate point, and label.
"""
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import struct
import sys
import zlib
import numpy as np


def pack(source, destination):
    text = source.read_text(encoding='utf-8')
    data = json.loads(text[text.index(',') + 1:text.rindex(')')])
    arrays, extras, checks = [], [], []
    cursor = 0

    def encode(obj, key=''):
        nonlocal cursor
        if isinstance(obj, dict):
            return {k: encode(v, k) for k, v in obj.items()}
        if isinstance(obj, list):
            return [encode(v, key) for v in obj]
        if isinstance(obj, str) and len(obj) > 500:
            raw = zlib.decompress(base64.b64decode(obj, validate=True))
            if key.startswith(('raw', 'xyz', 'cluster')):
                assert len(raw) % 12 == 0
                ref = {'$points': [cursor, len(raw) // 12]}
                cursor += len(raw) // 12
                arrays.append(raw)
            else:
                ref = {'$bytes': len(extras)}
                extras.append(raw)
            checks.append((ref, raw))
            return ref
        return obj

    metadata = encode(data)
    pool, indices = np.unique(np.frombuffer(b''.join(arrays), dtype='V12'), return_inverse=True)
    pool_bytes = pool.tobytes()
    index_bytes = indices.astype('<u4').tobytes()

    def planes(raw, width):
        return np.frombuffer(raw, dtype='u1').reshape(-1, width).T.copy().tobytes()

    blobs = [zlib.compress(planes(pool_bytes, 12), 6), zlib.compress(planes(index_bytes, 4), 6)]
    blobs.extend(zlib.compress(raw, 6) for raw in extras)
    header = json.dumps({'version': 1, 'lengths': list(map(len, blobs)), 'data': metadata},
                        ensure_ascii=False, separators=(',', ':')).encode()
    packed = struct.pack('<I', len(header)) + header + b''.join(blobs)

    # Independently unpack the serialized representation, including byte ordering.
    header_len = struct.unpack_from('<I', packed)[0]
    decoded_header = json.loads(packed[4:4 + header_len])
    offset, decoded = 4 + header_len, []
    for size in decoded_header['lengths']:
        decoded.append(zlib.decompress(packed[offset:offset + size])); offset += size
    assert offset == len(packed)
    restored_pool = np.frombuffer(decoded[0], dtype='u1').reshape(12, -1).T.copy().tobytes()
    restored_indices = np.frombuffer(decoded[1], dtype='u1').reshape(4, -1).T.copy().tobytes()
    restored_pool = np.frombuffer(restored_pool, dtype='V12')
    restored_indices = np.frombuffer(restored_indices, dtype='<u4')
    for ref, original in checks:
        if '$points' in ref:
            start, count = ref['$points']
            restored = restored_pool[restored_indices[start:start + count]].tobytes()
        else:
            restored = decoded[ref['$bytes'] + 2]
        assert restored == original, f'Round-trip mismatch: {source.name}'

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(packed)
    return {'file': destination.name, 'source_bytes': source.stat().st_size,
            'packed_bytes': len(packed), 'arrays_verified': len(checks),
            'sha256': hashlib.sha256(packed).hexdigest()}


def main():
    source, destination = map(Path, sys.argv[1:])
    sources = sorted(source.glob('l*f*.js')) + sorted((source / 'packet-border').glob('*-f*.js'))
    tasks = [(path, (destination / path.relative_to(source)).with_suffix('.bin')) for path in sources]
    with ThreadPoolExecutor(max_workers=4) as executor:
        records = []
        for i, result in enumerate(executor.map(lambda task: pack(*task), tasks), 1):
            records.append(result)
            if i % 25 == 0:
                print(f'{i}/{len(tasks)} frames packed and byte-verified', flush=True)
    report = {'frames': len(records), 'source_bytes': sum(r['source_bytes'] for r in records),
              'packed_bytes': sum(r['packed_bytes'] for r in records),
              'arrays_verified': sum(r['arrays_verified'] for r in records), 'files': records}
    (destination / 'packing-audit.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in report.items() if k != 'files'}), flush=True)


if __name__ == '__main__':
    main()
