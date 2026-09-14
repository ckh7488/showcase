"""Package the completed review, including the failed original TEST 01 model.

No replacement coupling results are created. Native cropped PEC dumps are
geometry evidence, and deliberately stopped transients remain partial records.
"""
import argparse,hashlib,json,re,shutil
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--initial',required=True);p.add_argument('--out',required=True);a=p.parse_args()
runs,initial,out=map(Path,[a.runs,a.initial,a.out]);out.mkdir(exist_ok=True,parents=True)
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,data): (out/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def copy(src,name):
    dest=out/name;dest.parent.mkdir(exist_ok=True,parents=True);shutil.copy2(src,dest)
old=read(initial/'manifest.json')
reference=[]
for name in ['test00-straight-base','test00-straight-fine']:
    data=np.load(initial/name/'reference-aligned.npz');mask=(data['frequency_Hz']>=10e6)&(data['frequency_Hz']<=200e6)
    reference.append({'id':name,'frequency_Hz':data['frequency_Hz'][mask].tolist(),'transmissionMagnitude_dB':(20*np.log10(abs(data['transmission'][mask]))).tolist(),'transmissionPhase_deg':np.angle(data['transmission'][mask],deg=True).tolist(),'evidence':'../initial-openems/'+name+'/reference-aligned.npz','sha256':sha(initial/name/'reference-aligned.npz')})
assert reference[0]['frequency_Hz']==reference[1]['frequency_Hz']
power=[]
for wiring in ['same','mixed']:
    data=np.load(initial/f'test01-{wiring}-coarse/response.npz');v=data['portVoltage'];current=data['portCurrent'];idx=[int(np.argmin(abs(data['frequency_Hz']-f))) for f in [10e6,100e6,200e6]]
    for i in idx:
        reflection=(v[2,i]-100*current[2,i])/(v[2,i]+100*current[2,i])
        power.append({'wiring':wiring,'frequency_Hz':float(data['frequency_Hz'][i]),'farPowerOverInputVoltage':float(abs(v[5,i]/v[2,i])),'inputReflectionMagnitude':float(abs(reflection)),'interpretation':'Symptom in the invalid initial mesh, not the real cable attenuation.'})
for name in ['connectivity-same-coarse.json','connectivity-same-fine.json','connectivity-mixed-coarse.json','native-coarse-edges.json','native-fine-edges.json']:
    copy(runs/name,name)
copy(runs/'guard-verification.json','guard-verification.json')
copy(runs/'preflight-mixed-fine/pec-connection-audit.json','connectivity-mixed-fine.json')
copy(runs/'test01-same-coarse/model.json','model.json')
for level in ['coarse','fine']:
    for name in ['PEC_dump.vtp','cropped-geometry.xml']:
        copy(runs/f'native-fanout-{level}'/name,f'native-{level}/'+name)
    text=(runs/f'logs/native-fanout-{level}.log').read_text(encoding='utf-8')
    assert not re.search(r'[A-Za-z]:[/\\]|Users[/\\]',text)
    (out/f'native-{level}/setup.log').write_text(text)
partial=[]
for name in ['test01-same-coarse','test01-same-fine']:
    src=runs/name;record={'id':name,'status':'aborted_for_connection_review','usableCouplingComparison':False}
    for path in src.iterdir():
        if path.name in ['input.json','model.json','mesh.json','geometry.xml','response.json','response.npz','connection-review-stop.json','ABORT'] or path.name.startswith(('port_ut_','port_it_','cm_')):
            copy(path,'partial/'+name+'/'+path.name)
    log=(runs/'logs'/f'{name}.log').read_text(encoding='utf-8');assert not re.search(r'[A-Za-z]:[/\\]|Users[/\\]',log)
    (out/'partial'/name/'solver.log').write_text(log)
    raw=np.loadtxt(src/'port_ut_3',comments='%');record['lastVoltageSample_ns']=float(raw[-1,0]*1e9)
    record['inputPulseApproxDuration_ns']=5.73
    record['reason']='The coarse power path is disconnected. The fine run was stopped before its excitation ended. Neither is a completed longer-window comparison.'
    partial.append(record)
for name in ['check_pec_connections.py','debug_fanout.py','read_native_pec.py','publish_connection_review.py','verify_connection_review.py','run_cable_screening.py','COPYING-openEMS.txt']:
    copy(Path(__file__).parent/name,name)
save('runner-version-note.json',{
    'partialRunSourceHash':read(runs/'test01-same-coarse/input.json')['script_sha256'],
    'currentRunnerHash':sha(out/'run_cable_screening.py'),
    'note':'The maintained runner includes the new connectivity guard and differs from the source used for the stopped partial runs. Their original geometry XML, model, mesh, inputs, probes and source hash are preserved; an exact pre-guard source snapshot was not archived. The original initial-run source remains in initial-openems/run_cable.py.'})
summary={'revision':'screening-review-06','date':'2026-09-13','status':'review_complete_test01_recompute_required','purpose':'Find dominant coupling and meaningful design changes; no fixed 1% accuracy target.',
    'test00':{'status':'target_band_baseline_checked','band_Hz':[10e6,200e6],'checks':old['referenceChecks'],'curves':reference},
    'test01':{'status':'initial_coupling_interpretation_withdrawn','finding':'The original 0.8 mm axial mesh disconnects the four power wires in the fanouts. The 0.4 mm axial / 0.16 mm transverse mesh connects all eight wires. A native cropped PEC dump independently confirms the near fanout difference for current wiring.',
        'coarsePowerWiresDisconnected':4,'ethernetWiresConnected':4,'fineWiresConnected':8,'powerThroughDiagnostics':power,
        'nativeScope':'Near fanout, current wiring. Identical retained local geometry and mesh; outer domain cropped for setup-only PEC inspection. Whole-model graph audits cover both wirings and meshes.',
        'replacementTransientComplete':False,'longerWindowComparisonComplete':False,'partialRuns':partial,
        'guardAdded':'Future screening runs refuse to solve if the eight terminals do not connect to the intended six electrical nets.',
        'nextCalculation':'Use electrically connected meshes; first verify power transmission into the cable, then compare large Ethernet outputs and wiring effects across two adequate record lengths and two connected meshes.'},
    'evidence':[]}
for path in sorted(out.rglob('*')):
    if path.is_file() and path.name!='manifest.json':summary['evidence'].append({'file':path.relative_to(out).as_posix(),'sha256':sha(path)})
save('manifest.json',summary)
print(json.dumps({'files':len(summary['evidence']),'referenceTarget':old['referenceChecks']['targetBandCheck'],'test01Status':summary['test01']['status'],'partial':partial}))
