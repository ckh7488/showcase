"""Only newly exposed sequence gaps: reinforced PCB holder and catalogue-shaft insertion."""
from pathlib import Path
import FreeCAD as A,Part
import json,hashlib
R=Path(__file__).resolve().parents[3];O=Path(__file__).resolve().parent;V=A.Vector
P=R/'mechanical/assembly_A14_DRAFT/RFCP_A14_Integrated_DRAFT.FCStd'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
sources={str(p.relative_to(R)):sha(p) for p in [P,Path(__file__)]}
d=A.openDocument(str(P));S={o.Name:o.Shape.copy() for o in d.Objects if hasattr(o,'Shape')}
def mv(s,v):q=s.copy();q.translate(V(*v));return q
def vol(a,b):return a.common(b).Volume if a.BoundBox.intersect(b.BoundBox) else 0.
def bad(q,obs):return [dict(part=n,volume_mm3=v) for n,s in obs.items() if (v:=vol(q,s))>1e-4]
pcb=[];keys=[(0,(0,0,0),0),(.25,(0,0,0),0),(.5,(0,0,0),-30),(.65,(0,-1.6,0),-30),(1,(0,-1.6,40),-30)]
obs={n:s for n,s in S.items() if n.startswith(('LowerCenter','LowerArm','LowerJoint')) or n in ['FixedCore','PCBNuts']}
for i in range(61):
 t=i/60
 j=next((j for j in range(1,len(keys)) if keys[j][0]>=t),len(keys)-1);a,b=keys[j-1],keys[j];f=(t-a[0])/(b[0]-a[0]);angle=a[2]+(b[2]-a[2])*f;v=[x+(y-x)*f for x,y in zip(a[1],b[1])]
 for name in ['PCB','SMAEnvelope']:
  q=S[name].copy();q.rotate(V(0,-36,5.55),V(1,0,0),angle);q.translate(V(*v));pcb.append(dict(t=t,part=name,angle_deg=angle,offset_mm=v,collisions=bad(q,obs)))
k=1;prefix='Cable1_';moving=[prefix+x for x in ['LeadStud','HandKnob','TopJamNut','TopWasher']]
future=[prefix+x for x in ['TopBridgeJaw','BridgeNut1','BridgeNut2','BridgeScrew1','BridgeScrew2']]
obs={n:s for n,s in S.items() if n.startswith(prefix) and n not in moving+future}
shaft=[]
for travel in range(0,141,2):
 for n in moving:shaft.append(dict(upward_offset_mm=travel,part=n,collisions=bad(mv(S[n],[0,travel,0]),obs)))
loading=[]
for n in ['Cable1_DriveNut','Cable1_LeadLockNut','Cable1_ThrustWasher']:
 others={k:s for k,s in obs.items() if k!=n}
 # Nut/washer load in the bare module before the stud crosses their bores.
 for travel in range(0,51,2):loading.append(dict(part=n,front_offset_mm=travel,collisions=bad(mv(S[n],[0,0,travel]),others)))
result=dict(classification='CALCULATED_NOMINAL_SEQUENCE_ADDITIONS_NOT_THREAD_OR_HAND_SIMULATION',sources=sources,
 reinforced_holder_PCB_tilt=pcb,catalogue_shaft_preassembly_vertical_insertion=shaft,lower_hardware_front_loading_before_shaft=loading,
 assembly_conditions=['Probe lower split joints assembled first; lower keeper, M2 screws and flexible winding ends absent during PCB tilt. Core and rear PCB nuts remain.',
 'Catalogue knob/stud/top jamnut joined outside clamp first; top washer placed on shaft. Lower washer, lower nyloc and drive nut positioned before the shaft crosses their bores.',
 'Bare Cable1 module with top bridge, bridge screws and bridge nuts absent. Cable2 is identical geometry translated along Z; hand/support access is not simulated.',
 'Nut holes deliberately modeled as thread-clearance bores. Shaft translation is an envelope of a screwed insertion, not permission to push through engaged threads.'],
 limitations=['The actual winding leads must remain free during PCB insertion; lead flexure/soldering/hand tools are not modeled.',
 'Actual F09 drive nut, F11 lower washer and F12 shoulder fasteners remain subject to catalogue dimension selection and physical fit.',
 'Finite discrete CAD positions exclude printed errors, friction, clamp force, hands and thread engagement.'])
result['pass_scoped']=all(not x['collisions'] for group in [pcb,shaft,loading] for x in group)
result['sources_unchanged']=all(sha(R/n)==h for n,h in sources.items())
(O/'sequence_checks.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS',result['pass_scoped'],'PCB',len(pcb),'SHAFT',len(shaft),'LOADING',len(loading),flush=True)
for name,rows in [('PCB',pcb),('SHAFT',shaft),('LOADING',loading)]:
 for x in rows:
  if x['collisions']:print(name,x,flush=True)
