"""Publish status atomically despite a brief Windows reader holding the file."""
import json
import os
from pathlib import Path
import time

def write_json_atomic(target, data):
    target = Path(target)
    temporary = target.with_name('.'+target.name+'.'+str(os.getpid())+'.pending')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    for attempt in range(9):
        try:
            temporary.replace(target)
            return
        except PermissionError:
            if attempt == 8:
                raise
            time.sleep(min(.1*2**attempt,.8))
