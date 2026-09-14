"""Finite local progress record for this batch. No external monitoring or jobs."""
import argparse
from datetime import datetime,timezone
import json
from pathlib import Path
import time
from screening_status import collect

p=argparse.ArgumentParser();p.add_argument('--runs',required=True);p.add_argument('--out',required=True)
args=p.parse_args();root=Path(args.runs);out=Path(args.out)
deadline=time.monotonic()+48*3600
while time.monotonic()<deadline:
    rows=collect(root)
    complete=all(r['stage']=='complete' and r.get('observed_ns',0)>=15.5 for r in rows)
    data={'updatedAtUTC':datetime.now(timezone.utc).isoformat(),'maximumObservation_ns':16,
          'scope':'Latest retained log entries, not a screening verdict. Existing results stay unchanged until review.',
          'rows':rows,'allRecordsAvailable':complete}
    tmp=out.with_suffix('.tmp')
    tmp.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
    tmp.replace(out)
    if complete or any(r['stage'] in ['error','stopped_for_review','cancelled'] for r in rows):
        break
    time.sleep(30)
