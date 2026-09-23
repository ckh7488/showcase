"""Generate the four per-board tables and CSV/JS from the reviewed BOM JSON."""
from pathlib import Path
import csv, hashlib, html, io, json

ROOT=Path(__file__).resolve().parents[1]
P=ROOT/'reports/ethernet-vna-fixture'
d=json.loads((P/'bom.json').read_text(encoding='utf-8'))
assert d['schema_version']==1 and d['quantity_basis']=='one_assembled_pcb'
assert [m['id'] for m in d['modules']]==['common','llc','m12','molex']
source=json.loads((P/'sources.json').read_text(encoding='utf-8'))
for f in source['files']:
 if f['path'] in {p for m in d['modules'] for p in m['source_paths']}:
  assert hashlib.sha256((ROOT.parent/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
# Read the current native BOM to check the fitted parts of the common board.
with (ROOT.parent/'balun/balun_eth_rj45/balun_eth_rj45_bom.csv').open(encoding='utf-8',newline='') as f:
 fitted={}
 for r in csv.DictReader(f):
  if not r['DNP']:fitted[r['MPN']]=fitted.get(r['MPN'],0)+int(r['QUANTITY'])
assert fitted=={d['parts'][l['part_id']]['mpn']:l['quantity_per_board'] for l in d['modules'][0]['lines'] if d['parts'][l['part_id']]['mpn']}
e=html.escape
columns=['module_id','module_name','revision','part_id','name','mpn','refdes','quantity_per_board','unit']
all_rows=[];cards=[]
for m in d['modules']:
 rows=[];trs=[]
 assert len({l['part_id'] for l in m['lines']})==len(m['lines'])
 for line in m['lines']:
  part=d['parts'][line['part_id']];q=line['quantity_per_board']
  assert type(q) is int and q>0 and len(line['refs'])==q
  rows.append([m['id'],m['name'],m['revision'],line['part_id'],part['name'],part.get('mpn') or '',','.join(line['refs']),q,part['unit']])
  spec=part.get('mpn') or part['revision']
  trs.append(f'<tr><td>{e(" / ".join(line["refs"]))}</td><td>{e(part["name"])}<small>{e(spec)}</small></td><td>{q} {e(part["unit"])}</td></tr>')
 def write_csv(name,values):
  s=io.StringIO(newline='');w=csv.writer(s);w.writerow(columns);w.writerows(values)
  (P/name).write_text(s.getvalue(),encoding='utf-8-sig',newline='')
 write_csv(f'bom-{m["id"]}.csv',rows);all_rows.extend(rows)
 notes=''.join(f'<li>{e(" / ".join(n["refs"]))+": " if n["refs"] else ""}{e(n["rule"])}</li>' for n in m['assembly_conditions'])
 recovery='<p class="caption">LLC 커넥터는 회수품 사용 계획입니다. 실장 필요량은 1개이며 실제 보유량은 별도 확인합니다.</p>' if m['id']=='llc' else ''
 cards.append(f'<article class="bom-card" id="bom-{m["id"]}" data-module="{m["id"]}"><div class="section-heading"><h3>{e(m["name"])}</h3><a href="bom-{m["id"]}.csv" download>1장 BOM CSV</a></div><p class="caption">{e(m["revision"])} · {e(m["role"])}</p><div class="table-wrap"><table><thead><tr><th>Ref</th><th>부품 / 규격</th><th>1장당</th></tr></thead><tbody>{"".join(trs)}</tbody></table></div>{recovery}<details><summary>기본 조립 조건</summary><ul>{notes}</ul></details></article>')
write_csv('bom-per-board.csv',all_rows)
(P/'bom-data.js').write_text('window.FIXTURE_BOM='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
start='<!--PER_BOARD_BOM_START-->';end='<!--PER_BOARD_BOM_END-->'
file=P/'index.html';text=file.read_text(encoding='utf-8');assert text.count(start)==text.count(end)==1
a=text.index(start)+len(start);b=text.index(end)
text=text[:a]+'\n<div class="bom-cards">'+''.join(cards)+'</div>\n'+text[b:]
file.write_text(text,encoding='utf-8')
print(json.dumps({'modules':len(cards),'per_board_lines':len(all_rows),'common_fitted_mpn_checked':fitted,'data_js_csv_html_generated':True}))
