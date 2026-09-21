"""Read-only guide object/sequence contract; does not build or edit the Site."""
from pathlib import Path
import sys,json,hashlib,subprocess,shutil
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;P=R/'viewer_A05'
sys.path.insert(0,str(P))
from current_guide_steps import make_steps
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[P/'current_guide_steps.py',P/'guide_motion.js',P/'guide_bom.py',R/'mechanical/assembly_A14_DRAFT/mesh.json',P/'guide_sources/geometry_supplements_a14.json',Path(__file__)]
sources={str(p.relative_to(R)):sha(p) for p in paths}
mesh=json.loads((paths[3]).read_text());mesh.pop('CalibrationNuts');sup=json.loads(paths[4].read_text());sup.pop('_sources');mesh.update(sup)
steps=make_steps(mesh);ids=[s['id'] for s in steps];get=lambda n:next(s for s in steps if s['id']==n)
errors=[]
for s in steps:
 names=s['rest']+s['active']+list(s['moves']);missing=[n for n in names if n not in mesh]
 if missing:errors.append(dict(step=s['id'],missing=missing))
 if not set(s['moves']).issubset(s['active']):errors.append(dict(step=s['id'],moving_nonactive=True))
 if set(s['rest'])&set(s['active']):errors.append(dict(step=s['id'],duplicate_rest_active=True))
checks={}
checks['unique_ids']=len(ids)==len(set(ids))
for a,b in [('L00A','L00B'),('L00B','H03'),('U00A','U00B'),('U00B','H09'),('B00A','B00B'),('B00B','B01'),('C04A','C04B'),('C04B','C05'),('C05','C06'),('C06','C07'),('H12A','H13')]:checks[a+'_before_'+b]=ids.index(a)<ids.index(b)
checks['lower_rear_path']=all(get('L00A')['moves'][n]['vector']==[0,0,-60] for n in ['LowerArmLeft','LowerArmRight'])
checks['upper_rear_path']=get('U00A')['moves']['UpperRightFree']['vector']==[0,0,-50]
checks['base_center_up_path']=get('B00A')['moves']['BaseCenter']['vector']==[0,60,0]
expected=[[0,[0,0,0],0],[.25,[0,0,0],0],[.5,[0,0,0],-45],[.65,[0,-4,0],-45],[1,[0,-4,40],-45]]
checks['pcb_selected_keys']=all(get('H05')['moves'][n]['keys']==expected for n in ['PCB','SMAEnvelope'])
checks['jam_nut_and_parked_knob_separate']=get('C04A')['moves']['Cable1_HandKnob']['vector'][1]>=65
for step,i in [('B05',2),('B07',4)]:
 keys=get(step)['moves'][f'MountScrew{i}']['keys'];checks[step+'_selected_lift_side']=any(k[1]==[0,25,0] for k in keys) and any(k[1]==[-35,25,0] for k in keys)
checks['lower_spanner_X_text']='(+X)' in ' '.join(get('C07')['action'])
unit=['HeadHandScrews','HeadClosureKnobs','HeadClosureJamNuts','HeadClosureWashers']
checks['head_unit_same_regular_lift']=all(get('H14')['moves'][n]['vector']==[0,75,0] for n in unit)
node=shutil.which('node');motion=[]
if node:
 code="const fs=require('fs');const d=JSON.parse(fs.readFileSync(0,'utf8'));const m=require(d.path);const o=[];for(const s of d.steps)for(const t of [0,.15,.3,.31,1])o.push({step:s.id,t,states:d.unit.map(n=>({name:n,...m.state(s,n,t)}))});process.stdout.write(JSON.stringify(o));"
 call=subprocess.run([node,'-e',code],input=json.dumps(dict(path=str(P/'guide_motion.js'),steps=[get('Q01'),get('Q04')],unit=unit)),capture_output=True,text=True,check=True)
 motion=json.loads(call.stdout)
 checks['head_unit_same_special_lift_and_hiding']=all(all(s['pos']==r['states'][0]['pos'] and s['visible']==r['states'][0]['visible'] for s in r['states']) for r in motion)
else:checks['head_unit_same_special_lift_and_hiding']=False
hardware_coverage={}
for prefix,step in [('LowerJoint','L00B'),('UpperJoint','U00B'),('BaseJoint','B00B')]:
 needed={n for n in mesh if n.startswith(prefix)};active=set(get(step)['active']);hardware_coverage[prefix]=dict(required_count=len(needed),missing=sorted(needed-active));checks[prefix+'_coverage']=needed.issubset(active)
result=dict(classification='READ_ONLY_GUIDE_OBJECT_AND_SEQUENCE_CONTRACT_NOT_FULL_ANIMATION_COLLISION_TEST',sources=sources,step_count=len(steps),checks=checks,object_errors=errors,joint_hardware=hardware_coverage,actual_JS_head_unit_motion=motion,
 limits=['This checks object mapping, selected validated directions and step order, not all44animations at every position.',
 'Historical guide mesh/renders and first-article mechanical/RF acceptance are outside this static contract.'])
result['pass_scoped']=all(checks.values()) and not errors
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'guide_contract.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'STEPS',len(steps),'FAILS',[n for n,v in checks.items() if not v],errors)
