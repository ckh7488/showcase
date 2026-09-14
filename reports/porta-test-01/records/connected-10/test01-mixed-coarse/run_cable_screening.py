"""TEST 01 openEMS cable coupon, with explicit drawing facts and assumptions.

Coordinate system: cable along x, table-normal z; millimetres. The source is
between the two power buses, not between either bus and the reference plate.
No cleanup/removal and no result synthesis from the explanatory Three.js scene.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import time

p=argparse.ArgumentParser()
p.add_argument('--install',required=True)
p.add_argument('--out',required=True)
p.add_argument('--spec',required=True)
p.add_argument('--wiring',choices=['same','mixed'],default='same')
p.add_argument('--length',type=float,default=120)
p.add_argument('--pitch',type=float,default=24)
p.add_argument('--cell',type=float,default=.2)
p.add_argument('--dx',type=float,default=.4)
p.add_argument('--epsilon',type=float,default=2.2)
p.add_argument('--height',type=float,default=20)
p.add_argument('--margin',type=float,default=40)
p.add_argument('--end',type=float,default=1e-5)
p.add_argument('--threads',type=int,default=1)
p.add_argument('--max-steps',type=int,default=160000)
p.add_argument('--max-time-ns',type=float,default=16)
p.add_argument('--wire-chunk',type=int,default=4)
p.add_argument('--setup-only',action='store_true')
p.add_argument('--geometry-only',action='store_true',help='Write and audit geometry without native setup or fields.')
args=p.parse_args()
os.environ['OPENEMS_INSTALL_PATH']=str(Path(args.install).resolve())
import numpy as np
from scipy.spatial import cKDTree
from CSXCAD import ContinuousStructure
from openEMS import openEMS
from openEMS.ports import UI_data

spec=json.loads(Path(args.spec).read_text(encoding='utf-8'))
out=Path(args.out).resolve()
out.mkdir(parents=True,exist_ok=False)
for filename in ['run_cable_screening.py','check_pec_connections.py']:
    shutil.copy2(Path(__file__).parent/filename,out/filename)
L,H=args.length,args.height
half=L/2
radius=spec['derived']['equalAreaSolidDiameter_mm']/2
ins_r=spec['drawingFacts']['insulation']['outerDiameter_mm']/2
centers=np.array([[-1.02,-1.02],[-1.02,1.02],[1.02,-1.02],[1.02,1.02]])
shield_r,shield_width=2.6,.2
fdtd=openEMS(NrTS=args.max_steps,EndCriteria=args.end)
fdtd.SetMaxTime(args.max_time_ns*1e-9)
# A shorter broadband pulse covers the requested 10-200 MHz output band.
# Its spectrum is recorded and every output is normalized by actual input V.
fdtd.SetGaussExcite(0,500e6)
fdtd.SetBoundaryCond(['PML_8']*6)
csx=ContinuousStructure()
fdtd.SetCSX(csx)
grid=csx.GetGrid()
grid.SetDeltaUnit(1e-3)
grid.AddLine('x',np.round(np.linspace(-half-20.8,half+20.8,int(round((L+41.6)/args.dx))+1),9))
grid.AddLine('x',[-half-20.4,-half-19.6,half+19.6,half+20.4])
grid.AddLine('x',[-half-24,half+24,-half-24-args.margin,half+24+args.margin])
grid.SmoothMeshLines('x',4,1.4)
grid.AddLine('y',np.round(np.linspace(-7.2,7.2,int(round(14.4/args.cell))+1),9))
grid.AddLine('y',[-26,26,-26-args.margin,26+args.margin])
grid.SmoothMeshLines('y',4,1.4)
grid.AddLine('z',np.round(np.linspace(H-4,H+8,int(round(12/args.cell))+1),9))
grid.AddLine('z',[0,-args.margin,H+8+args.margin])
grid.SmoothMeshLines('z',4,1.4)
plate=csx.AddMetal('finite_reference_plate')
plate.AddBox([-half-24,-26,0],[half+24,26,0],priority=20)
jacket=csx.AddMaterial('TPE_assumed_epsilon_2p5',epsilon=2.5)
jacket.AddCylinder([-half,0,H],[half,0,H],
                   radius=spec['drawingFacts']['jacket']['outerDiameter_mm']/2,priority=1)
core=csx.AddMaterial('air_core',epsilon=1)
core.AddCylinder([-half,0,H],[half,0,H],radius=shield_r,priority=2)
shield=csx.AddMetal('floating_equivalent_PEC_shield')
shield.AddCylindricalShell([-half,0,H],[half,0,H],radius=shield_r,
                           shell_width=shield_width,priority=8)
insulation=csx.AddMaterial('PP_assumed_epsilon',epsilon=args.epsilon)
wires=[]
for pair in range(4):
    for leg in range(2):
        x=np.linspace(-half,half,int(np.ceil(L/1.0))+1)
        phase=(x+half)/args.pitch*2*np.pi+leg*np.pi
        points=np.column_stack([x,centers[pair,0]+ins_r*np.sin(phase),
                                 H+centers[pair,1]+ins_r*np.cos(phase)])
        group=f'signal_{pair}_{leg}' if pair<2 else ('plus' if
            (pair==2 if args.wiring=='same' else leg==0) else 'zero')
        terminals=[]
        leads=[]
        for side,endpoint in [(-1,points[0]),(1,points[-1])]:
            xf=side*(half+20)
            if pair<2:
                terminal=np.array([xf,-4 if pair==0 else 4,H+(.8 if leg==0 else -.8)])
                way=np.array([endpoint,terminal])
            else:
                terminal=np.array([xf,-2.4 if group=='plus' else 2.4,H+4])
                way=np.array([endpoint,[side*(half+4),6,endpoint[2]],
                    [side*(half+12),6,endpoint[2]+6],terminal])
            leads.append(way)
            terminals.append(terminal.tolist())
        full=np.vstack([leads[0][:0:-1],points,leads[1][1:]])
        copper=csx.AddMetal(f'wire_{pair}_{leg}_{group}')
        # A union of overlapping consecutive polyline chunks is the same wire,
        # but tighter primitive bounding boxes accelerate material assignment.
        chunk=args.wire_chunk or len(full)
        for k in range(0,len(full)-1,chunk):
            segment=full[k:k+chunk+1].T.tolist()
            copper.AddWire(segment,radius=radius,priority=10)
            insulation.AddWire(segment,radius=ins_r,priority=5)
        wires.append({'pair':pair,'leg':leg,'group':group,'points':full.tolist(),
            'cablePoints':points.tolist(),'terminals':terminals})

# Detect accidental shorts in the continuous centerline geometry before solving.
# Sampling distance is <= 0.1 mm; reported center clearance is conservative to
# within that sampling interval and is compared with two conductor radii.
def dense(poly):
    q=np.array(poly)
    return np.vstack([np.linspace(a,b,max(2,int(np.ceil(np.linalg.norm(b-a)/.08))+1))
                      for a,b in zip(q[:-1],q[1:])])
clouds=[dense(w['points']) for w in wires]
clearances=[]
for i in range(8):
    for j in range(i+1,8):
        if wires[i]['group']==wires[j]['group']:
            continue
        distances,indices=cKDTree(clouds[i]).query(clouds[j])
        at=int(np.argmin(distances))
        distance=float(distances[at])
        clearances.append({'wires':[i,j],'centerDistance_mm':distance,
                           'metalGap_mm':distance-2*radius})
        if distance < 2*radius+.08:
            raise RuntimeError(f'Unintended metal proximity: {i},{j}, center distance {distance}, points {clouds[i][indices[at]]}, {clouds[j][at]}')

ports=[]
port_defs=[]
cm_names=[]
for side in [-1,1]:
    xf=side*(half+20)
    for pair,y in enumerate([-4,4]):
        start=[xf-.4,y,H+.8]
        stop=[xf+.4,y,H-.8]
        nr=len(ports)+1
        ports.append(fdtd.AddLumpedPort(nr,100,start,stop,'z',excite=0,priority=15))
        port_defs.append({'number':nr,'role':'ethernet','pair':pair,
                         'end':'near' if side<0 else 'far','start':start,'stop':stop,'R':100})
        names=[]
        for leg,z in enumerate([H+.8,H-.8]):
            name=f'cm_{side}_{pair}_{leg}'
            probe=csx.AddProbe(name,p_type=0,weight=-1)
            probe.AddBox([xf,y,z],[xf,y,0])
            names.append(name)
        cm_names.append(names)
    start=[xf-.4,-2.4,H+4]
    stop=[xf+.4,2.4,H+4]
    nr=len(ports)+1
    ports.append(fdtd.AddLumpedPort(nr,100,start,stop,'y',excite=1 if side<0 else 0,priority=15))
    port_defs.append({'number':nr,'role':'power','end':'near' if side<0 else 'far',
                     'start':start,'stop':stop,'R':100,'excite':side<0})
mesh={a:grid.GetLines(a).tolist() for a in ['x','y','z']}
meta={'test':'01','solver':'openEMS','solverRun':False,'wiring':args.wiring,
    'versions':{k:importlib.metadata.version(k) for k in ['openEMS','CSXCAD','numpy']},
    'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'cableDrawing_sha256':spec['source']['sha256'],
    'units':'mm','length_mm':L,'pitch_mm':args.pitch,'height_mm':H,
    'curveSegmentMaxAxial_mm':1.0,'wireChunkSegments':args.wire_chunk,'copperRadius_mm':radius,'insulationRadius_mm':ins_r,'pairCenters_yz_mm':centers.tolist(),
    'shield':{'radius_mm':shield_r,'width_mm':shield_width,'endBonds':[False,False],
              'model':'single floating PEC shell approximating foil plus braid'},
    'epsilon_r_PP':args.epsilon,'epsilon_r_TPE':2.5,
    'lossModel':'PEC conductors/shield; dielectric loss set to zero. Not a cable insertion-loss model.',
    'fixture':'20 mm fanout each end; ports are test loads, not actual M12/RJ45/PHY.',
    'boundary':['PML_8']*6,'airMargin_mm':args.margin,
    'EndCriteria':args.end,'NrTS':args.max_steps,'numThreads':args.threads,
    'maximumPhysicalTime_ns':args.max_time_ns,
    'assessmentPurpose':'Screening: compare dominant outputs and wiring effects across observation times and meshes, not a fixed percent accuracy certification.',
    'excitation':{'f0_Hz':0,'fc_Hz':500e6,'reason':'Broad pulse; extract 10-200 MHz from measured input/output.'},
    'meshLines':{a:len(v) for a,v in mesh.items()},
    'cells':int(np.prod([len(v)-1 for v in mesh.values()])),
    'minCell_mm':{a:float(np.diff(v).min()) for a,v in mesh.items()},
    'ports':port_defs,'centerlineClearances':clearances,
    'assumptions':['Equal pair pitches and fixed relative phases/centers; not measured cable lay.',
      'PP/TPE permittivity assumed; nylon wrap, Mylar dielectric and finite braid transfer impedance omitted.',
      'Same interior geometry for A/B; necessary power-bus connections in the 20 mm fixture change with assignment.',
      'Common-mode voltage uses explicit vertical paths to the finite reference plate.',
      'No actual noise waveform, transformer, PHY, motor, 20 m link or CRC model.']}
(out/'input.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
(out/'mesh.json').write_text(json.dumps(mesh),encoding='utf-8')
(out/'model.json').write_text(json.dumps({'input':meta,'wires':wires,'ports':port_defs,
    'referencePlate':{'start':[-half-24,-26,0],'stop':[half+24,26,0]}}),encoding='utf-8')
csx.Write2XML(str(out/'geometry.xml'))
print('INPUT',json.dumps({k:meta[k] for k in ['wiring','length_mm','meshLines','cells','minCell_mm']}),flush=True)

# A connected CAD centerline can become disconnected PEC edges on a coarse
# Yee grid. Reject that electrical topology before spending time on fields.
from check_pec_connections import audit
connection=audit(out)
(out/'pec-connection-audit.json').write_text(json.dumps(connection,indent=2),encoding='utf-8')
terminal_groups={}
for wire,components in zip(wires,connection['terminalComponentsWithCaps']):
    assert components[0] is not None and components[0]==components[1], 'PEC wire is disconnected on this mesh; see pec-connection-audit.json'
    terminal_groups.setdefault(wire['group'],set()).update(components)
assert all(len(group)==1 for group in terminal_groups.values()), 'Parallel power conductors do not join their intended bus'
assert len({next(iter(group)) for group in terminal_groups.values()})==len(terminal_groups), 'Different nets are shorted on this mesh'
print('PEC_CONNECTIVITY: all 8 wires connect to the intended 6 electrical nets.',flush=True)
if args.geometry_only:
    print('GEOMETRY_ONLY: no native setup or time-domain simulation.',flush=True)
    raise SystemExit(0)
t0=time.perf_counter()
fdtd.Run(str(out),cleanup=False,numThreads=args.threads,verbose=1,setup_only=args.setup_only)
if args.setup_only:
    print('SETUP_ONLY: no time-domain simulation.',flush=True)
    raise SystemExit(0)
elapsed=time.perf_counter()-t0
frequency=np.linspace(10e6,200e6,191)
for port in ports:
    port.CalcPort(str(out),frequency)
vin=ports[2].uf_tot
assert np.isfinite(vin).all() and np.all(abs(vin)>1e-30)
diff=np.array([ports[3].uf_tot,ports[4].uf_tot])
common=[]
for names in cm_names[2:]:
    data=UI_data(names,str(out),frequency)
    common.append((data.ui_f_val[0]+data.ui_f_val[1])/2)
common=np.array(common)
Hdiff=diff/vin
Hcommon=common/vin
Scolumn=np.array([p.uf_ref/ports[2].uf_inc for p in ports])
outgoing_power=np.sum(abs(Scolumn)**2,axis=0)
assert np.isfinite(Hdiff).all() and np.isfinite(Hcommon).all()
np.savez_compressed(out/'response.npz',frequency_Hz=frequency,Vin=vin,Vdiff=diff,
    Vcommon=common,Hdiff=Hdiff,Hcommon=Hcommon,
    portVoltage=np.array([p.uf_tot for p in ports]),
    portCurrent=np.array([p.if_tot for p in ports]),Scolumn=Scolumn)
encode=lambda a:{'real':a.real.tolist(),'imag':a.imag.tolist()}
result={'test':'01','solverRun':True,'wiring':args.wiring,'elapsed_s':elapsed,'input':meta,
    'frequency_Hz':frequency.tolist(),'Hdiff':encode(Hdiff),'Hcommon':encode(Hcommon),
    'Vin':encode(vin),'metrics':{'peakHdiff':np.max(abs(Hdiff),axis=1).tolist(),
      'peakHdiffFrequency_Hz':frequency[np.argmax(abs(Hdiff),axis=1)].tolist(),
      'maxOutgoingOverIncidentPortPower':float(outgoing_power.max()),
      'minimumInputSpectrumMagnitude':float(abs(vin).min())},
    'validation':'Run completed; requires mesh, termination, geometry and boundary checks before a physical conclusion.'}
result['metrics']['powerThroughMagnitudeAt100MHz']=float(abs(ports[5].uf_tot[90]/vin[90]))
result['metrics']['inputReflectionMagnitudeAt100MHz']=float(abs(Scolumn[2,90]))
result['metrics']['powerInputImpedanceAt100MHz_ohm']={'real':float((vin[90]/ports[2].if_tot[90]).real),'imag':float((vin[90]/ports[2].if_tot[90]).imag)}
(out/'response.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('RESULT',json.dumps(result['metrics']),'elapsed_s',elapsed,flush=True)
