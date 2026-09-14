"""Copy reviewed ATLAS geometry into the self-contained lab configuration report."""
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'reports/porta-pcb'
OUT = ROOT / 'reports/porta-lab-setup'
OUT.mkdir(exist_ok=True)
for folder in ('vendor', 'assets', 'data'):
    (OUT / folder).mkdir(exist_ok=True)
files = ['geometry.js', 'phy-geometry.js', 'ground-vias.js', 'inner-copper.js', 'viewer.js',
         'vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/LICENSE-three.txt',
         'assets/image65.png', 'assets/image82.jpg']
provenance = []
for name in files:
    # The local viewer has reviewed accessibility adaptations; preserve it on rerun.
    if name != 'viewer.js' or not (OUT / name).exists():
        shutil.copy2(SRC / name, OUT / name)
    provenance.append({'source': 'reports/porta-pcb/' + name,
                       'copy': name, 'sha256': hashlib.sha256((OUT/name).read_bytes()).hexdigest()})
assembly = (SRC / 'assembly.html').read_text(encoding='utf-8')
data = json.loads(re.search(r'const data=(.*?);\s*\n', assembly).group(1))
(OUT/'data/board-components.js').write_text('const BOARD_COMPONENTS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
provenance.append({'source':'reports/porta-pcb/assembly.html', 'copy':'data/board-components.js',
                   'source_sha256':hashlib.sha256((SRC/'assembly.html').read_bytes()).hexdigest(),
                   'scope':'Embedded KiCad-derived board outlines, part XY and pad/track data. Part body heights and mechanical positions are approximate.'})
(OUT/'data/provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Reuse source-derived mechanical construction, not its old cabinet/cable scene.
body = assembly[assembly.index('// Source drawing:'):assembly.index('// Solve actual 20,000 mm')]
# Old model's external elbow belongs to the old wiring configuration.
body = re.sub(r'const elbow=cyl\(external,.*?\n', '', body)
body = body.replace("['whole','inside']", "['sensor','inside']")
body = body.replace("['whole']", "['sensor']")
if not (OUT/'data/sensor-construction.js').exists():
    (OUT/'data/sensor-construction.js').write_text('/* Adapted mechanical illustration from ATLAS; not a solver mesh. */\nfunction buildAtlasSensor(ctx) {\nconst {T,assembly,shell,baseGroup,cutShell,mechanics,wireGroup,mat,metal,black,plastic,gold,colors,data,tag,box,cyl,tube,label,ring}=ctx;\nlet view="inside", explode=0;\n'+body+'\nreturn {motorBoard,controlBoard,mechanics,shell,cutShell,baseGroup,fork,wireGroup,wires,setLayout(next,amount){view=next;explode=amount;controlBoard.position.y=38.534+amount*.8;mechanics.position.y=amount*.8;wires();}};\n}\n', encoding='utf-8')
print('Prepared',len(files),'copied assets and embedded sensor geometry.')
