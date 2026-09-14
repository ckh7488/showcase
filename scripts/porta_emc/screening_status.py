"""Read this finite simulation batch's progress; do not change any run."""
import argparse
import json
from pathlib import Path
import re

def collect(root):
    rows=[]
    for name in ['test01-same-coarse','test01-same-fine','test01-mixed-coarse','test01-mixed-fine']:
        log=root/'logs'/f'{name}.log'
        row={'id':name}
        if not log.exists():
            row['stage']='cancelled' if (root/'batch-review.json').exists() else 'queued'
        else:
            text=log.read_text(encoding='utf-8')
            row['stage']='complete' if (root/name/'response.json').exists() else 'fields' if 'Running FDTD engine' in text else 'preparing'
            dt=re.findall(r'FDTD timestep(?: is)?:\s*([\d.eE+-]+)',text)
            steps=re.findall(r'Timestep:\s*(\d+)',text)
            if dt and steps:
                row['observed_ns']=round(float(dt[-1])*int(steps[-1])*1e9,3)
            speeds=re.findall(r'Speed:\s*([\d.]+) MC/s',text)
            if speeds:row['last_MC_per_s']=float(speeds[-1])
            if 'Traceback (most recent call last)' in text:row['stage']='error'
            if (root/name/'connection-review-stop.json').exists():row['stage']='stopped_for_review'
        rows.append(row)
    return rows

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--runs',required=True)
    print(json.dumps(collect(Path(p.parse_args().runs))))
