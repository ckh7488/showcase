"""Check the saved CSXCAD input records used by the two real cable runs."""
import argparse
import hashlib
import json
from pathlib import Path

p=argparse.ArgumentParser();p.add_argument('--runs',required=True)
args=p.parse_args();root=Path(args.runs)
read=lambda p:json.loads(p.read_text())
names=['test01-same-coarse','test01-mixed-coarse']
models=[read(root/name/'model.json') for name in names]
a,b=models
same=lambda key:a['input'][key]==b['input'][key]
checks={
    'eightConductorsEach':len(a['wires'])==len(b['wires'])==8,
    'cableInteriorIdentical':all(x['cablePoints']==y['cablePoints'] for x,y in zip(a['wires'],b['wires'])),
    'ethernetGeometryIdentical':all(a['wires'][i]['points']==b['wires'][i]['points'] for i in range(4)),
    'sourceAndLoadPortsIdentical':a['ports']==b['ports'],
    'referencePlateIdentical':a['referencePlate']==b['referencePlate'],
    'meshIdentical':read(root/names[0]/'mesh.json')==read(root/names[1]/'mesh.json'),
    'sourceMaterialsAndBoundariesIdentical':all(same(key) for key in ['length_mm','pitch_mm','height_mm','shield','copperRadius_mm','insulationRadius_mm','epsilon_r_PP','epsilon_r_TPE','boundary','airMargin_mm','excitation','EndCriteria','NrTS']),
    'currentPowerAssignment':[w['group'] for w in a['wires'][4:]]==['plus','plus','zero','zero'],
    'alternatePowerAssignment':[w['group'] for w in b['wires'][4:]]==['plus','zero','plus','zero'],
    'powerFixtureGeometryDoesChange':any(a['wires'][i]['points']!=b['wires'][i]['points'] for i in range(4,8))}
result={'checks':checks,'passed':all(checks.values()),
    'note':'Power-bus assignment and its fanout connections differ. Therefore the comparison includes the fixture, not only the cable interior. Thread counts differ for scheduling, not as a physical model parameter.',
    'models':[{'id':name,'model_sha256':hashlib.sha256((root/name/'model.json').read_bytes()).hexdigest()} for name in names]}
(root/'ab-input-check.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result))
if not result['passed']:
    raise SystemExit(1)
