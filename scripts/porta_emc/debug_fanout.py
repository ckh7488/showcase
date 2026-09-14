"""Native setup-only PEC dump of the saved cable's left fanout.

Mesh lines and objects are unchanged inside this cropped debugging region.
No field solution or coupling response is produced.
"""
import argparse,os,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--run',required=True);p.add_argument('--out',required=True);p.add_argument('--install',required=True);a=p.parse_args()
os.environ['OPENEMS_INSTALL_PATH']=a.install
from CSXCAD import ContinuousStructure
from openEMS import openEMS
import numpy as np
root=Path(a.run);out=Path(a.out);out.mkdir(exist_ok=False)
c=ContinuousStructure();error=c.ReadFromXML(str(root/'geometry.xml'));print('ReadFromXML:',repr(error),flush=True)
g=c.GetGrid();limits=[(-81,-58),(-4.8,7.2),(17.6,28.8)]
for k,(lo,hi) in enumerate(limits):
    lines=g.GetLines(k);lines=lines[(lines>=lo)&(lines<=hi)];g.ClearLines(k);g.AddLine(k,lines)
f=openEMS(NrTS=1,EndCriteria=1e-5);f.SetCSX(c);f.SetGaussExcite(0,500e6);f.SetBoundaryCond(['PMC']*6)
c.Write2XML(str(out/'cropped-geometry.xml'))
f.Run(str(out),cleanup=False,numThreads=2,setup_only=True,debug_pec=True,verbose=1)
print('NATIVE SETUP ONLY: no transient response.',flush=True)
