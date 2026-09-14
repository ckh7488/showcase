"""Reprocess saved reference V/I samples at identical physical reference planes.

No solver execution. Both the original and aligned complex responses are kept.
"""
import argparse
import os
import json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--install',required=True);p.add_argument('--runs',required=True)
args=p.parse_args();os.environ['OPENEMS_INSTALL_PATH']=args.install
import numpy as np
from CSXCAD import ContinuousStructure
from openEMS import openEMS
rows=[]
for name in ['test00-notch-base','test00-straight-base','test00-straight-fine']:
    folder=Path(args.runs)/name
    raw=np.load(folder/'response.npz')
    mesh=json.loads((folder/'mesh.json').read_text())
    csx=ContinuousStructure();grid=csx.GetGrid();grid.SetDeltaUnit(1e-6)
    for a in ['x','y','z']:grid.AddLine(a,mesh[a])
    fdtd=openEMS();fdtd.SetCSX(csx);metal=csx.AddMetal('postprocess_dummy')
    ports=[]
    for i,sign in enumerate([-1,1]):
        port=fdtd.AddMSLPort(i+1,metal,[sign*50000,-300,254],[0,300,0],'x','z',MeasPlaneShift=50000/3)
        port.CalcPort(str(folder),raw['frequency_Hz'],ref_impedance=50,ref_plane_shift=50000/3)
        ports.append(port)
    reflection=ports[0].uf_ref/ports[0].uf_inc
    transmission=ports[1].uf_ref/ports[0].uf_inc
    np.savez_compressed(folder/'reference-aligned.npz',frequency_Hz=raw['frequency_Hz'],
        reflection=reflection,transmission=transmission,beta=ports[0].beta)
    row={'id':name,'nominalReferencePlanes_um':[-100000/3,100000/3],
        'sampledReferencePlanes_um':[-50000+ports[0].measplane_shift,50000-ports[1].measplane_shift],
        'operation':'openEMS CalcPort ref_plane_shift = 50000/3 um at both ports; no rerun.',
        'responseFile':name+'/reference-aligned.npz'}
    (folder/'reference-alignment.json').write_text(json.dumps(row,indent=2))
    rows.append(row)
a=np.load(Path(args.runs)/'test00-straight-base/reference-aligned.npz')
b=np.load(Path(args.runs)/'test00-straight-fine/reference-aligned.npz')
comparison={'referencePlanes':rows,'bands':{}}
for label,lo,hi in [('target',10e6,200e6),('microwave',.5e9,6e9)]:
    m=(a['frequency_Hz']>=lo)&(a['frequency_Hz']<=hi)
    dmag=abs(20*np.log10(abs(b['transmission'][m])/abs(a['transmission'][m])))
    dphase=abs(np.angle(b['transmission'][m]/a['transmission'][m],deg=True))
    comparison['bands'][label]={'band_Hz':[lo,hi],
       'maxMagnitudeDifference_dB':float(dmag.max()),'maxPhaseDifference_deg':float(dphase.max()),
       'passMagnitudeAndPhase':bool(dmag.max()<=.15 and dphase.max()<=5)}
(Path(args.runs)/'reference-alignment.json').write_text(json.dumps(comparison,indent=2))
print(json.dumps(comparison['bands']))
