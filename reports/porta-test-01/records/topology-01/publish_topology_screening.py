"""Publish TEST 01 topology screening without changing earlier TEST 01 records.

The ranking is deliberately narrow: minimum worst stored Ethernet differential
voltage in the tested 120 mm coupon-plus-fixture candidates. Common-mode and a
two-conductor voltage norm are retained beside it; no real-link verdict is made.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import shutil

import numpy as np


P = argparse.ArgumentParser()
P.add_argument('--runs', required=True)
P.add_argument('--report', required=True)
P.add_argument('--stage', choices=['coarse', 'final'], required=True)
args = P.parse_args()
runs = Path(args.runs).resolve()
report = Path(args.report).resolve()
records = report/'records'/'topology-01'
data_file = report/'data'/'topology-results.json'
records.mkdir(parents=True, exist_ok=True)
data_file.parent.mkdir(parents=True, exist_ok=True)

WINDOWS = [8, 10, 12]
FREQUENCIES = np.linspace(10e6, 200e6, 191)
CASES = [
    {'id':'legacy-adjacent','label':'현재 배선','short':'+/+ · 0/0','wiring':'same','topology':'adjacent','polarity':'aligned','candidate':False},
    {'id':'balanced-adjacent-aligned','label':'인접 · 같은 방향','short':'+/0 · 인접 · 정렬','wiring':'mixed','topology':'adjacent','polarity':'aligned','candidate':True},
    {'id':'balanced-adjacent-opposed','label':'인접 · 반대 방향','short':'+/0 · 인접 · 한 쌍 반전','wiring':'mixed','topology':'adjacent','polarity':'opposed','candidate':True},
    {'id':'balanced-diagonal-aligned','label':'대각 · 같은 방향','short':'+/0 · 대각 · 정렬','wiring':'mixed','topology':'diagonal','polarity':'aligned','candidate':True},
    {'id':'balanced-diagonal-opposed','label':'대각 · 반대 방향','short':'+/0 · 대각 · 한 쌍 반전','wiring':'mixed','topology':'diagonal','polarity':'opposed','candidate':True},
]
CHANNELS = [
    ('near-pair-1','입력 쪽 · Ethernet 1','HdiffNear','HcommonNear',0),
    ('near-pair-2','입력 쪽 · Ethernet 2','HdiffNear','HcommonNear',1),
    ('far-pair-1','반대쪽 · Ethernet 1','Hdiff','Hcommon',0),
    ('far-pair-2','반대쪽 · Ethernet 2','Hdiff','Hcommon',1),
]


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(array):
    return {'real': array.real.tolist(), 'imag': array.imag.tolist()}


def decode(record, key):
    return np.array(record[key]['real']) + 1j*np.array(record[key]['imag'])


def atomic_json(path, value):
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)


def response_at(folder, original, stop_ns):
    freq = np.array(original['frequency_Hz'])
    assert np.array_equal(freq, FREQUENCIES)
    trace_meta = {}

    def dft(name):
        trace = np.loadtxt(folder/name, comments='%')
        stop = stop_ns*1e-9
        assert trace[-1, 0] >= stop, (folder.name, name, trace[-1, 0], stop)
        trace = trace[trace[:, 0] <= stop]
        t, value = trace.T
        trace_meta[name] = {'samples':len(t),'lastSample_s':float(t[-1]),
                            'sampleInterval_s':float(t[1]-t[0])}
        return 2*(t[1]-t[0])*(np.exp(-2j*np.pi*freq[:,None]*t[None,:])@value)

    voltage = np.array([dft(f'port_ut_{n}') for n in range(1,7)])
    current = np.array([dft(f'port_it_{n}') for n in range(1,7)])
    cm_far = np.array([(dft(f'cm_1_{p}_0')+dft(f'cm_1_{p}_1'))/2 for p in [0,1]])
    cm_near = np.array([(dft(f'cm_-1_{p}_0')+dft(f'cm_-1_{p}_1'))/2 for p in [0,1]])
    vin = voltage[2]
    assert np.isfinite(vin).all() and np.all(abs(vin)>1e-30)
    incident, reflected = (voltage+100*current)/2, (voltage-100*current)/2
    scolumn = reflected/incident[2]
    arrays = {
        'HdiffNear':voltage[:2]/vin,
        'HcommonNear':cm_near/vin,
        'Hdiff':voltage[3:5]/vin,
        'Hcommon':cm_far/vin,
        'Hpower':voltage[5]/vin,
        'Vin':vin,
        'Scolumn':scolumn,
    }
    return arrays, trace_meta


def stack(arrays, near_key, far_key):
    return np.vstack([arrays[near_key], arrays[far_key]])


def mode_arrays(arrays):
    differential = stack(arrays, 'HdiffNear', 'Hdiff')
    common = stack(arrays, 'HcommonNear', 'Hcommon')
    combined = np.sqrt(2*abs(common)**2 + .5*abs(differential)**2)
    return differential, common, combined


def worst_metric(mode, name):
    magnitude = abs(mode)
    flat = int(np.argmax(magnitude))
    channel, frequency = np.unravel_index(flat, magnitude.shape)
    return {
        'mode':name,
        'mVperV':float(1000*magnitude[channel,frequency]),
        'frequency_Hz':float(FREQUENCIES[frequency]),
        'channel':CHANNELS[channel][0],
        'channelLabel':CHANNELS[channel][1],
    }


def load_case(case, level):
    case_id = f"{case['id']}-{level}"
    folder = runs/case_id
    if not (folder/'response.json').exists():
        return None
    original = read(folder/'response.json')
    assert original['solverRun'] is True
    assert original['input']['topology'] == case['topology']
    assert original['input']['powerPolarity'] == case['polarity']
    assert original['input']['wiring'] == case['wiring']
    assert sha(folder/'run_topology_screening.py') == original['input']['script_sha256']
    connection = read(folder/'pec-connection-audit.json')
    terminal = connection['terminalComponentsWithCaps']
    assert all(item[0] is not None and item[0] == item[1] for item in terminal)
    assert len({item[0] for item in terminal}) == 6

    window_records = {}
    worst = {'differential':None,'common':None,'combined':None}
    max_values = {key:-1 for key in worst}
    curve = None
    for ns in WINDOWS:
        arrays, trace_meta = response_at(folder, original, ns)
        differential, common, combined = mode_arrays(arrays)
        modes = {'differential':differential,'common':common,'combined':combined}
        for key, values in modes.items():
            metric = worst_metric(values, key)
            metric['window_ns'] = ns
            if metric['mVperV'] > max_values[key]:
                max_values[key] = metric['mVperV']
                worst[key] = metric
        window_records[str(ns)] = {
            key:encode(arrays[key]) for key in ['HdiffNear','HcommonNear','Hdiff','Hcommon','Hpower','Vin']
        }
        window_records[str(ns)]['traceSummary'] = trace_meta
        if ns == 12:
            curve = {
                'frequency_Hz':FREQUENCIES.tolist(),
                'differential_mVperV':(1000*abs(differential)).tolist(),
                'common_mVperV':(1000*abs(common)).tolist(),
                'combined_mVperV':(1000*combined).tolist(),
            }

    destination = records/case_id
    destination.mkdir(parents=True, exist_ok=True)
    for filename in ['input.json','model.json','mesh.json','pec-connection-audit.json','response.json']:
        shutil.copy2(folder/filename, destination/filename if filename != 'response.json' else destination/'full-window-response.json')
    analysis = {
        'id':case_id,'candidate':case,'level':level,'windows':window_records,
        'worst':worst,'curve12ns':curve,
        'normalization':'Each Ethernet output is divided by the actual differential power-input voltage for the same case and observation window.',
        'combinedDefinition':'sqrt(2*|Vcommon|^2 + |Vdiff|^2/2), the two-conductor voltage-vector norm; not delivered noise power.',
        'rawEvidence':[
            {'file':path.name,'sha256':sha(path)} for path in sorted(folder.iterdir())
            if path.is_file() and path.name.startswith(('port_ut_','port_it_','cm_'))
        ],
    }
    atomic_json(destination/'analysis.json', analysis)
    return analysis


coarse = []
for case in CASES:
    item = load_case(case, 'coarse')
    if item:
        coarse.append(item)

if len(coarse) != len(CASES):
    missing = [case['id'] for case in CASES if not (runs/f"{case['id']}-coarse"/'response.json').exists()]
    raise RuntimeError(f'Coarse topology set is incomplete: {missing}')

ranked = sorted((item for item in coarse if item['candidate']['candidate']),
                key=lambda item:item['worst']['differential']['mVperV'])
top_two = [item['candidate']['id'] for item in ranked[:2]]
fine = []
for case in CASES:
    if case['id'] in top_two:
        item = load_case(case, 'fine')
        if item:
            fine.append(item)

fine_by_id = {item['candidate']['id']:item for item in fine}
selection_complete = args.stage == 'final' and len(fine) == 2
winner = ranked[0]
if selection_complete:
    winner = min(fine, key=lambda item:item['worst']['differential']['mVperV'])

legacy = next(item for item in coarse if item['candidate']['id']=='legacy-adjacent')
winner_coarse = next(item for item in coarse if item['candidate']['id']==winner['candidate']['id'])
penalty = legacy['worst']['differential']['mVperV']/winner_coarse['worst']['differential']['mVperV']

fine_checks = []
for item in fine:
    base = next(row for row in coarse if row['candidate']['id']==item['candidate']['id'])
    fine_checks.append({
        'id':item['candidate']['id'],
        'coarseWorstDifferential_mVperV':base['worst']['differential']['mVperV'],
        'fineWorstDifferential_mVperV':item['worst']['differential']['mVperV'],
        'ratioFineToCoarse':item['worst']['differential']['mVperV']/base['worst']['differential']['mVperV'],
    })

summary = {
    'revision':'topology-screening-01',
    'updatedAtUTC':datetime.now(timezone.utc).isoformat(),
    'status':'screening_complete' if selection_complete else 'coarse_complete_refinement_pending',
    'topologyScreeningComplete':selection_complete,
    'scientificVerdictComplete':False,
    'scope':{
        'length_mm':120,'frequency_Hz':[10e6,200e6],'windows_ns':WINDOWS,
        'candidateMeaning':'Best among the four tested +/0 topology candidates in this coupon-plus-fixture model; not a universal cable optimum.',
        'primaryMetric':'Minimum worst stored Ethernet differential-voltage magnitude across 10–200 MHz, both pairs, both ends and 8/10/12 ns records.',
        'secondaryMetrics':['Common-mode voltage magnitude','Two-conductor combined voltage-vector norm'],
    },
    'channels':[{'id':item[0],'label':item[1]} for item in CHANNELS],
    'cases':[{
        'id':item['candidate']['id'],'label':item['candidate']['label'],'short':item['candidate']['short'],
        'candidate':item['candidate']['candidate'],'topology':item['candidate']['topology'],
        'polarity':item['candidate']['polarity'],'level':'coarse','worst':item['worst'],
        'curve12ns':item['curve12ns'],'record':f"records/topology-01/{item['id']}/analysis.json",
        'model':f"records/topology-01/{item['id']}/model.json",
    } for item in coarse],
    'coarseRanking':[{
        'rank':index+1,'id':item['candidate']['id'],'label':item['candidate']['label'],
        'worstDifferential_mVperV':item['worst']['differential']['mVperV'],
        'worstCombined_mVperV':item['worst']['combined']['mVperV'],
        'worstCommon_mVperV':item['worst']['common']['mVperV'],
    } for index,item in enumerate(ranked)],
    'refinementCandidates':top_two,
    'fineChecks':fine_checks,
    'winner':{
        'id':winner['candidate']['id'],'label':winner['candidate']['label'],
        'basis':'fine_top_two' if selection_complete else 'coarse_provisional',
        'currentWorstDifferentialRatio':penalty,
        'currentWorstDifferentialChange_dB':20*np.log10(penalty),
    },
    'limits':[
        'The 20 mm fanout changes with role placement and is included in the result; cable-only and fanout contributions are not separated.',
        'All pair centers, 24 mm pitches and starting phases are fixed assumptions rather than measured cable lay.',
        'The shield is a floating PEC shell and conductor/dielectric loss is omitted.',
        'No actual 20 m link, connector, transformer, PHY, noise waveform or CRC result is modeled.',
    ],
}

atomic_json(data_file, summary)
atomic_json(runs/'selection.json', {'topTwo':top_two,'winner':summary['winner'],'stage':args.stage})
for filename in ['run_topology_screening.py','check_pec_connections.py','COPYING-openEMS.txt','publish_topology_screening.py']:
    shutil.copy2(Path(__file__).parent/filename, records/filename)
print(json.dumps({'status':summary['status'],'topTwo':top_two,'winner':summary['winner']['id']}, ensure_ascii=False))
