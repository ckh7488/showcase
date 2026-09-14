"""Package completed solver evidence for the portable ATLAS report."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import re
import shutil
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--runs',required=True)
p.add_argument('--out',required=True)
p.add_argument('--allow-partial',action='store_true')
args=p.parse_args()
runs=Path(args.runs)
out=Path(args.out)
out.mkdir(parents=True,exist_ok=True)
refs=['test00-notch-base','test00-straight-base','test00-straight-fine']
coupons=['test01-same-coarse','test01-mixed-coarse','test01-same-fine','test01-mixed-fine']
if args.allow_partial:
    coupons=[n for n in coupons if (runs/n/'response.json').exists()]
    if 'test01-same-coarse' not in coupons:
        raise RuntimeError('The current-wiring field run must be complete before a partial result is shown.')
read=lambda p:json.loads(p.read_text(encoding='utf-8'))
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def terminated(text,criterion):
    energy=re.findall(r'Energy:.*?\(\s*(-?[\d.]+)dB\)',text)
    final_db=float(energy[-1]) if energy else None
    it=re.findall(r'Time for (\d+) iterations',text)
    return {'lastReportedEnergy_dB':final_db,
        'iterations':int(it[-1]) if it else None,
        'criterion':criterion,
        'energyCriterionConfirmed':bool(final_db is not None and final_db<=10*np.log10(criterion)+.05),
        'note':'Energy read from the final progress report; timestep-cap completion alone does not pass.'}
records={}
for name in refs+coupons:
    src=runs/name
    aligned=(src/'aligned-window-response.json').exists()
    result=read(src/('aligned-window-response.json' if aligned else 'response.json'))
    log=runs/'logs'/f'{name}.log'
    result['termination']=terminated(log.read_text(encoding='utf-8'),result['input']['EndCriteria'])
    result['id']=name
    result['evidenceFiles']=[]
    dst=out/name
    dst.mkdir(exist_ok=True)
    filenames=['input.json','response.npz','reference-aligned.npz','reference-alignment.json','mesh.json','model.json','geometry.xml','openEMS.xml','time-window-check.json','diagnostic-stop.json']
    filenames+=sorted(p.name for p in src.iterdir() if p.name.startswith(('port_ut_','port_it_','cm_')) and p.is_file())
    for filename in filenames:
        if (src/filename).exists():
            if aligned and filename=='response.npz':
                shutil.copy2(src/filename,dst/'full-window-response.npz')
                result['evidenceFiles'].append({'file':f'{name}/full-window-response.npz','sha256':digest(dst/'full-window-response.npz')})
                shutil.copy2(src/'aligned-window-response.npz',dst/filename)
                result['evidenceFiles'].append({'file':f'{name}/{filename}','sha256':digest(dst/filename)})
                continue
            shutil.copy2(src/filename,dst/filename)
            result['evidenceFiles'].append({'file':f'{name}/{filename}','sha256':digest(dst/filename)})
    if aligned:
        shutil.copy2(src/'response.json',dst/'full-window-response.json')
        result['evidenceFiles'].append({'file':f'{name}/full-window-response.json','sha256':digest(dst/'full-window-response.json')})
    # Logs contain scientific runtime output only; no machine paths in runner prints.
    logtext=log.read_text(encoding='utf-8')
    if re.search(r'(?<![A-Za-z0-9_])[A-Za-z]:[\\/]|/Users/|/home/',logtext):
        raise RuntimeError('Local filesystem path found in solver log; inspect before publishing.')
    (dst/'solver.log').write_text(logtext,encoding='utf-8')
    result['evidenceFiles'].append({'file':f'{name}/solver.log','sha256':digest(dst/'solver.log')})
    dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',logtext)
    erows=re.findall(r'Timestep:\s*(\d+).*?Energy:\s*~?([\d.eE+-]+)',logtext)
    pulse=re.findall(r'Excitation signal length is:\s*(\d+) timesteps',logtext)
    if dt and erows:
        peak=max(float(energy) for _,energy in erows)
        result['energyProgress']={'time_s':[int(step)*float(dt[-1]) for step,_ in erows],
            'relativeToLoggedPeak_dB':[float(10*np.log10(float(energy)/peak)) for _,energy in erows],
            'sourceEnd_s':int(pulse[-1])*float(dt[-1]) if pulse else None,
            'description':'Approximate energy from solver progress lines, renormalized to the largest logged value. Not an independently integrated energy balance.'}
    if result['test']=='01':
        result['diagnosticStop']=read(src/'diagnostic-stop.json') if (src/'diagnostic-stop.json').exists() else None
        result['termination']['reason']='controlled_diagnostic_stop' if result['diagnosticStop'] else ('energy_criterion' if result['termination']['energyCriterionConfirmed'] else 'criterion_not_confirmed')
        result['timeWindowCheck']=read(src/'time-window-check.json') if (src/'time-window-check.json').exists() else {'status':'not_run'}
        power_ratio=result['metrics']['maxOutgoingOverIncidentPortPower']
        result['portPowerCheck']={'maximumRatio':power_ratio,'maximumAllowedRatio':1.01,
            'passed':bool(np.isfinite(power_ratio) and power_ratio<=1.01),
            'scope':'Necessary port consistency check only; excludes an independent full radiation/loss balance.'}
        traces={}
        for filename in filenames:
            if filename.startswith(('port_ut_','port_it_','cm_')):
                trace=np.loadtxt(src/filename,comments='%')
                traces[filename]={'time_s':trace[:,0].tolist(),'value':trace[:,1].tolist(),
                    'unit':'A' if filename.startswith('port_it_') else 'V'}
        (dst/'time-traces.json').write_text(json.dumps(traces,separators=(',',':')),encoding='utf-8')
        result['evidenceFiles'].append({'file':f'{name}/time-traces.json','sha256':digest(dst/'time-traces.json')})
        with (dst/'transfer.csv').open('w',newline='',encoding='utf-8') as stream:
            writer=csv.writer(stream)
            writer.writerow(['frequency_Hz','pair','Hdiff_real_V_per_V','Hdiff_imag_V_per_V','Hdiff_magnitude_V_per_V','Hdiff_dB_V_per_V','Hcommon_real_V_per_V','Hcommon_imag_V_per_V'])
            for k,freq in enumerate(result['frequency_Hz']):
                for pair in range(2):
                    hd=complex(result['Hdiff']['real'][pair][k],result['Hdiff']['imag'][pair][k])
                    writer.writerow([freq,pair+1,hd.real,hd.imag,abs(hd),20*np.log10(max(abs(hd),1e-30)),result['Hcommon']['real'][pair][k],result['Hcommon']['imag'][pair][k]])
        result['evidenceFiles'].append({'file':f'{name}/transfer.csv','sha256':digest(dst/'transfer.csv')})
    (dst/'response.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    records[name]=result

def values(r,key):
    return np.array(r[key]['real'])+1j*np.array(r[key]['imag'])
base=records['test00-straight-base']
fine=records['test00-straight-fine']
f=np.array(base['frequency_Hz'])
band=(f>=.5e9)&(f<=6e9)
tb,tf=values(base,'transmission'),values(fine,'transmission')
db_error=np.abs(20*np.log10(abs(tf[band]))-20*np.log10(abs(tb[band])))
phase_error=np.abs(np.angle(tf[band]/tb[band],deg=True))
reference_checks={'band_Hz':[.5e9,6e9],
    'uniformLineMagnitudeDifferenceMax_dB':float(db_error.max()),
    'uniformLinePhaseDifferenceMax_deg':float(phase_error.max()),
    'maxOutgoingOverIncidentPower':max(records[n]['metrics']['maxOutgoingOverIncidentPower'] for n in refs),
    'thresholds':{'magnitude_dB':.15,'phase_deg':5,'maxPowerRatio':1.01},
    'energyCriteriaConfirmed':all(records[n]['termination']['energyCriterionConfirmed'] for n in refs),
    'scope':'Official notch example, uniform-line comparison and spatial refinement. Not an EMC validation of the cable.',
    'unperformed':['full radiation/loss power balance','independent boundary and port-position sweep','reverse-source reciprocity run']}
reference_checks['passed']=bool(db_error.max()<=.15 and phase_error.max()<=5 and
    reference_checks['maxOutgoingOverIncidentPower']<=1.01 and reference_checks['energyCriteriaConfirmed'])
alignment=read(runs/'reference-alignment.json')
reference_checks['referencePlaneAligned']=alignment
reference_checks['targetBandCheck']=dict(alignment['bands']['target'])
target_power=[]
for name in refs:
    reference=np.load(runs/name/'reference-aligned.npz')
    mask=(reference['frequency_Hz']>=10e6)&(reference['frequency_Hz']<=200e6)
    target_power.append(float(np.max(abs(reference['reflection'][mask])**2+abs(reference['transmission'][mask])**2)))
reference_checks['targetBandCheck']['maxOutgoingOverIncidentPower']=max(target_power)
reference_checks['targetBandCheck']['passed']=bool(
    alignment['bands']['target']['passMagnitudeAndPhase'] and
    reference_checks['energyCriteriaConfirmed'] and max(target_power)<=1.01)
reference_checks['scopeNote']='The initial microwave-band phase check failed. Separately, the 10-200 MHz target band passes the same magnitude/phase thresholds after aligning reference planes. No broadband convergence claim.'
convergence={}
for wiring in ['same','mixed']:
    if f'test01-{wiring}-fine' not in records or f'test01-{wiring}-coarse' not in records:
        convergence[wiring]={'status':'not_run','passed':None,
            'passAtFrequency':None,'uncertaintyIndicator':None,
            'note':'No same-length refined-grid result is available. Convergence is not evaluated.'}
        continue
    a=records[f'test01-{wiring}-coarse']; b=records[f'test01-{wiring}-fine']
    assert a['frequency_Hz']==b['frequency_Hz']
    hc,hf=values(a,'Hdiff'),values(b,'Hdiff')
    delta=abs(hf-hc)
    tolerance=np.maximum(.05*abs(hf),1e-5)
    passed=delta<=tolerance
    phase=np.abs(np.angle(hf/np.where(abs(hc)>1e-30,hc,1e-30),deg=True))
    resolved=(abs(hf)>1e-4)&(abs(hc)>1e-4)
    phase_pass=(phase<=5)|~resolved
    all_ok=bool(np.all(passed&phase_pass))
    convergence[wiring]={'status':'evaluated','passed':all_ok,
        'magnitudeComplexDifferenceMax':np.max(delta,axis=1).tolist(),
        'passFractionEachPair':np.mean(passed&phase_pass,axis=1).tolist(),
        'passAtFrequency':(passed&phase_pass).tolist(),
        'uncertaintyIndicator':delta.tolist(),
        'definition':'|Hfine-Hcoarse| <= max(0.05|Hfine|,1e-5); phase <=5 degrees only if both magnitudes >1e-4.',
        'note':'Two-grid change indicator, not a certified error bound; geometry and unknown material/pitch sensitivities remain.'}
manifest={'revision':'initial-openems-01','date':'2026-09-13','solverRun':True,
    'status':'diagnostic_unconverged' if any(not records[n]['termination']['energyCriterionConfirmed'] for n in coupons) else 'preliminary_numeric_results',
    'solver':{'name':'openEMS','version':'0.0.36','CSXCAD':'0.6.3',
       'release':'https://github.com/thliebig/openEMS-Project/releases/tag/v0.0.36',
       'archiveSHA256':'e0d62b1176c0897ad18876b45667de877d7d3b58b37c0be95545f9b988896059'},
    'referenceChecks':reference_checks,'cableConvergence':convergence,
    'abInputCheck':read(runs/'ab-input-check.json'),
    'references':[records[n] for n in refs],'cableRuns':[records[n] for n in coupons],
    'completedComparisons':{'coarseAB':all(f'test01-{w}-coarse' in records for w in ['same','mixed']),'bothRefinedGrids':all(f'test01-{w}-fine' in records for w in ['same','mixed'])},
    'limits':['Short 120 mm coupon with assumed equal 24 mm pitches and fixed pair positions.',
      'PEC equivalent shield and lossless dielectric approximations; actual foil-braid contact not modeled.',
      'The 20 mm test fanout changes with power-bus assignment and is part of the measured coupling.',
      'No measured disturbance, real transformer/PHY load, 20 m system or CRC failure prediction.',
      'Neither numerical convergence nor an A/B difference alone identifies the laboratory fault cause.']}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
for name in ['run_reference.py','run_cable.py','align_reference.py','align_observation_window.py','check_time_windows.py','check_ab_inputs.py','diagnostic_stop.py','COPYING-openEMS.txt','README.md']:
    shutil.copy2(Path(__file__).parent/name,out/name)
print(json.dumps({'reference':reference_checks,'cableConvergence':{k:v['passed'] for k,v in convergence.items()}}))
