"""Record the bounded, coarse-grid A/B review without finalizing TEST 01."""
import hashlib
import json
from pathlib import Path
import numpy as np

ROOT = Path('reports/porta-test-01/records/connected-10')
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
d = read(ROOT / 'manifest.json')
cases = {c['id']: c for c in d['cases']}
a, b = [cases['test01-' + w + '-coarse'] for w in ['same', 'mixed']]
decode = lambda r, k: np.array(r[k]['real']) + 1j * np.array(r[k]['imag'])
rows, hashes_checked = [], 0
for c in [a, b]:
    for f in c['files']:
        assert sha(ROOT / c['id'] / f['file']) == f['sha256']
        hashes_checked += 1

for ns in ['8', '10', '12']:
    for key in ['HdiffNear', 'Hdiff', 'HcommonNear', 'Hcommon']:
        for pair in range(2):
            x, y = [abs(decode(c['windows'][ns], key)[pair]) for c in [a, b]]
            ratio = y / x
            rows.append(dict(window_ns=int(ns), output=key, pair=pair + 1,
                at100MHz_mVperV=[float(x[90]*1000), float(y[90]*1000)],
                ratioAt100MHz=float(ratio[90]),
                ratioRange=[float(ratio.min()), float(ratio.max())],
                mixedLowerFrequencyCount=int(np.sum(y < x)), frequencyCount=len(x),
                bandPeak_mVperV=[float(x.max()*1000), float(y.max()*1000)]))

# These are observed directions at all stored points, not accuracy tolerances.
assert all(r['mixedLowerFrequencyCount'] == (0 if 'diff' in r['output'] else 191) for r in rows)
sources = [{ 'id': c['id'], 'analysis_sha256': sha(ROOT/c['id']/'analysis.json'),
    'solverResponse_sha256': sha(ROOT/c['id']/'response.json'),
    'solverSource_sha256': c['input']['script_sha256'] } for c in [a, b]]
review = dict(revision='first-wiring-comparison-11', scientificVerdictComplete=False,
    status='coarse_comparison_reviewed_fine_grid_pending', sources=sources,
    evidenceHashesChecked=hashes_checked, independentScalarOutputsChecked=144,
    scope='120 mm coupon plus 20 mm fanout at each end; both Ethernet pairs and both ends; 10–200 MHz stored 1 MHz points.',
    normalization='Each output divided by the actual differential power-input voltage in that case and observation window.',
    observed='Mixed +/0 pairs have larger differential pickup and smaller common-mode pickup at all 191 stored frequencies, all four outputs, and each 8/10/12 ns window.',
    interpretation='Power pairing changes the mode of coupled noise in this coupon/fixture. It is not an overall improvement, nor evidence that the real cable should keep its current wiring.',
    acceptedForThisInterimFinding='Time-window changes do not reverse the observed coarse A/B direction. Small differential features and their exact frequency rankings remain time-sensitive; no universal percent or residual-energy pass rule is applied.',
    unresolved=['Fine-grid comparisons of both wiring assignments are running/queued.',
        'Changed power-bus fanout is included. Cable-only versus fanout contribution has not been separated.',
        'Equal assumed pair pitches/phases, PEC shield, and 100 ohm test loads do not establish a real 20 m Ethernet or CRC outcome.'],
    comparisons=rows)
(ROOT/'wiring-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(review=review['status'],hashesChecked=hashes_checked,comparisonRows=len(rows))))
