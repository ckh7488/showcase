"""Finite execution-speed trial; its truncated pulse is not coupling evidence."""
import argparse, hashlib, json, subprocess, time
from pathlib import Path
import xml.etree.ElementTree as ET

p=argparse.ArgumentParser()
p.add_argument('--source',required=True);p.add_argument('--out',required=True)
p.add_argument('--exe',required=True);p.add_argument('--engine',default='sse-compressed')
p.add_argument('--time-ns',type=float,default=1)
a=p.parse_args();src=Path(a.source);out=Path(a.out);out.mkdir(parents=True,exist_ok=False)
meta=json.loads((src/'input.json').read_text())
root=ET.Element('openEMS');fdtd=ET.SubElement(root,'FDTD',NumberOfTimesteps=str(meta['NrTS']),MaxTime=str(a.time_ns*1e-9),endCriteria=str(meta['EndCriteria']),OverSampling='4')
ET.SubElement(fdtd,'BoundaryCond',dict(zip(['xmin','xmax','ymin','ymax','zmin','zmax'],meta['boundary'])))
ET.SubElement(fdtd,'Excitation',Type='0',f0=str(meta['excitation']['f0_Hz']),fc=str(meta['excitation']['fc_Hz']))
csx=ET.parse(src/'geometry.xml').getroot();assert csx.tag=='ContinuousStructure';root.append(csx)
ET.ElementTree(root).write(out/'openEMS.xml',encoding='utf-8',xml_declaration=True)
command=[str(Path(a.exe).resolve()),'openEMS.xml',f'--engine={a.engine}','-v']
record={'purpose':'Execution speed only. Pulse is deliberately truncated; do not use as coupling evidence.','sourceGeometry_sha256':hashlib.sha256((src/'geometry.xml').read_bytes()).hexdigest(),'command':command,'time_ns':a.time_ns}
(out/'benchmark-input.json').write_text(json.dumps(record,indent=2))
t=time.perf_counter()
with (out/'solver.log').open('w') as log: result=subprocess.run(command,cwd=out,stdout=log,stderr=subprocess.STDOUT)
record.update(returncode=result.returncode,elapsed_s=time.perf_counter()-t)
(out/'benchmark-result.json').write_text(json.dumps(record,indent=2));print(json.dumps(record))
