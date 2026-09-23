"use strict";
(() => {
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={
 rj45:{title:'RJ45 직접 연결',mpn:'공통 보드의 RJE591885401',pins:{A:[1,2],B:[3,6]},nc:'별도 어댑터 없음',revision:'B-SMA1'},
 llc:{title:'M12 LLC · 지그 수',mpn:'Finecables MB12MBAFF08ST-3',pins:{A:[8,2],B:[3,4]},nc:'1 / 5 / 6 / 7',revision:'B-RF1',note:'보유 motor_board 회수품 사용 계획. key 방향과 실제 DUT 암 커넥터를 대조합니다. 체결 토크는 패널에서 받습니다.'},
 m12:{title:'M12 슬립링 · 지그 암',mpn:'TE T4143012081-000',pins:{A:[4,3],B:[2,1]},nc:'5 / 6 / 7 / 8',revision:'B-TE1',note:'PG9 패널/브래킷과 PCB 간격을 실제 부품으로 확인합니다. LLC 수 보드와 핀맵이 다릅니다.'},
 molex:{title:'Molex 슬립링 · 5핀',mpn:'Molex 5055680571',pins:{A:[1,2],B:[3,4]},nc:'5',revision:'A-DRAFT · 후속 배선 반영본',note:'1.25 mm SMT입니다. 케이블 housing과 pin 1 방향, 실제 mating을 확인합니다. DUT 쪽 shield bond는 없습니다.'}
};
let selectedBoard='llc', enlarged=false, currentBom=[];
function row(name,mpn,qty,history,shared){return {name,mpn,qty,history,shared};}
function makeBom(left,right){
 const ends=[left,right],count=k=>ends.filter(x=>x===k).length,n=ends.filter(x=>x!=='rj45').length;
 const totals=Object.fromEntries(window.aggregateFixtureBom({common:2,llc:count('llc'),m12:count('m12'),molex:count('molex')}).map(p=>[p.part_id,p.quantity]));
 const qty=id=>`${totals[id]||0}${window.FIXTURE_BOM.parts[id].unit}`;
 return [
  row('공통 발룬 PCB','B-SMA1', qty('pcb_common'),'5장 · 우선 2장 조립','발룬 전용'),
  row('발룬 트랜스','ADT2-1T+',qty('transformer'),'10개 · 8 실장 + 2 예비','발룬 전용'),
  row('직각 SMA 암','SMA-J-P-H-RA-TH1',qty('sma'),'10개 · 8 실장 + 2 예비','RF의 GCT 수직 SMA와 다름'),
  row('RJ45 jack · 공통+선택 어댑터','RJE591885401',qty('rj45'),'8개 · 여러 어댑터/예비 포함','발룬·어댑터용'),
  row('LLC 어댑터 PCB','B-RF1',qty('pcb_llc'),'5장','발룬 전용'),
  row('LLC M12 수','MB12MBAFF08ST-3',qty('llc_connector'),'신규 0 · 회수품 계획','가용 회수품 수량 확인'),
  row('M12 암 어댑터 PCB','B-TE1',qty('pcb_m12'),'5장','발룬 전용'),
  row('M12 슬립링 암','T4143012081-000',qty('m12_connector'),'2개','발룬 전용'),
  row('Molex 어댑터 PCB','현행 후속 배선본',qty('pcb_molex'),'5장','발룬 전용'),
  row('Molex SMT 커넥터','5055680571',qty('molex_connector'),'5개 · 연습/예비 포함','발룬 전용'),
  row('고정 RJ45 패치 케이블','짧은 shielded patch',`${n}개`,'길이·개체 별도 준비','해당 지그에 고정'),
  row('미사용 SMA 50 Ω 로드','TE 2467938-1','6개','7개 · 통합 전체 수량','나머지 1개 RF/공유·예비'),
  row('VNA SMA 수–수 케이블','50 Ω · 개체·배치 고정','2개','보유 1 + 추가 1','RF 측정과 공용 가능'),
  row('SMA full 2-port 교정 표준','O/S/L + 정의된 THRU','1세트','보유품/모델 확인','VNA 공용'),
  row('DUT 접속면 O/S/L/T','선택 커넥터·페어용','각 접속면의 표준 취득','구체 제작물·모델 미확정','50 Ω SMA 로드와 별도'),
  row('고정 기구·체결품','브래킷·지지대·strain relief','배치별 필요량','세부 치수·수량 미확정','RF 클램프 BOM에 포함되지 않음')
 ];
}
function chain(side,key,pair){const t=types[key],port=side==='left'?1:2;return `<div class="chain"><span class="port">LIBREVNA · PORT ${port}</span><div class="node">50 Ω SMA 케이블<small>첫 SOLT의 기준면 ↓</small></div><div class="node">공통 발룬 B-SMA1<small>${pair==='A'?'J2 / T1':'J3 / T2'} · 페어 ${pair}</small></div>${key!=='rj45'?`<div class="node">고정 RJ45 패치</div><div class="node">${t.title}<small>${t.mpn}</small></div>`:'<div class="node">공통 보드 RJ45</div>'}<div class="boundary">DUT 접속면 · 두 번째 보정</div></div>`;}
function setup(){const l=$('left').value,r=$('right').value,p=$('pair').value;
 $('connection').innerHTML=chain('left',l,p)+`<div class="dut"><b>DUT</b><span>케이블 / 커넥터<br>수동 조립체</span><small>양쪽 접속면 사이<br>페어 ${p} 측정</small></div>`+chain('right',r,p);
 $('adapterCount').textContent=[l,r].filter(v=>v!=='rj45').length;
 $('pinSummary').innerHTML=[['왼쪽',l],['오른쪽',r]].map(([label,key])=>`<p><b>${label} ${types[key].title}</b> · ${p}+ = 핀 ${types[key].pins[p][0]}, ${p}− = 핀 ${types[key].pins[p][1]}${key==='rj45'?'':`<br><small>어댑터 NC: ${types[key].nc} · 전원/GND로 연결하지 않음</small>`}</p>`).join('');
 currentBom=makeBom(l,r);$('bomRows').innerHTML=currentBom.map(x=>`<tr><td>${esc(x.name)}</td><td><code>${esc(x.mpn)}</code></td><td>${esc(x.qty)}</td><td>${esc(x.history)}</td><td>${esc(x.shared)}</td></tr>`).join('');
}
function pairOf(net){const m=net.match(/\/(?:PAIR_|D)([ABCD])_/);if(m)return m[1];const n=net.match(/Net-\(J([2-5])-In\)/);return n?'ABCD'[Number(n[1])-2]:'';}
function board(){const b=window.FIXTURE_BOARDS.boards[selectedBoard],hl=$('highlight').value,layer=$('layer').value;
 const [x0,y0,x1,y1]=b.bounds,ns='http://www.w3.org/2000/svg',svg=$('pcb');svg.replaceChildren();
 let box=[x0-3,y0-4,x1-x0+6,y1-y0+8];if(enlarged){const target=b.parts.find(p=>p.ref===(selectedBoard==='common'?'J1':'J2'));box=[target.xy[0]-14,target.xy[1]-11,28,22];}
 svg.setAttribute('viewBox',box.join(' '));
 const add=(tag,attrs,txt)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(txt!==undefined)e.textContent=txt;svg.append(e);return e;};
 add('rect',{x:x0,y:y0,width:x1-x0,height:y1-y0,fill:'none',stroke:'var(--sc-muted)','stroke-width':.16});
 for(const s of b.segments){if(layer!=='all'&&s.layer!==layer)continue;const match=hl==='all'||pairOf(s.net)===hl;add('line',{x1:s.start[0],y1:s.start[1],x2:s.end[0],y2:s.end[1],stroke:s.layer==='F.Cu'?'var(--sc-tx)':'var(--sc-rx)','stroke-width':s.width,'stroke-linecap':'round',opacity:match?1:.13});}
 for(const p of b.pads){const match=hl==='all'||pairOf(p.net)===hl;const color=pairOf(p.net)?'var(--sc-stage-ink)':'var(--sc-ground)';const c=add('circle',{cx:p.xy[0],cy:p.xy[1],r:Math.min(p.size[0],p.size[1])*.25,fill:color,opacity:match?.9:.18});const title=document.createElementNS(ns,'title');title.textContent=`${p.ref}.${p.pin||'기구'} · ${p.net||'NC / mounting'}`;c.append(title);if($('pinLabels').checked&&p.ref.startsWith('J')&&p.pin&&match)add('text',{x:p.xy[0]+.65,y:p.xy[1]-.65,fill:'var(--sc-stage-ink)','font-size':1.35,'paint-order':'stroke',stroke:'var(--sc-stage)','stroke-width':.35},p.pin);}
 for(const p of b.parts.filter(p=>/^[JT][0-9]+$/.test(p.ref)))add('text',{x:p.xy[0],y:p.xy[1]-4,fill:'var(--sc-stage-ink)','font-size':1.65,'text-anchor':'middle'},p.ref);
 const t=types[selectedBoard];let info;
 if(selectedBoard==='common')info=`<h3>공통 발룬 B-SMA1</h3><p>같은 PCB 두 장을 DUT 양끝에 사용합니다. 한 장에 ADT2-1T+ 4개와 SMA 4개가 있습니다.</p><table class="pin-table"><thead><tr><th>SMA</th><th>RJ45 + / −</th><th>발룬</th></tr></thead><tbody>${['A','B','C','D'].map((p,i)=>`<tr><td>J${i+2} · ${p}</td><td>${[[1,2],[3,6],[4,5],[7,8]][i].join(' / ')}</td><td>T${i+1}</td></tr>`).join('')}</tbody></table><p class="caption">기본 RCT 전부 DNP. RSH1은 기준 Port 1 쪽만 브리지합니다. 두 보드를 바꿔 쓰거나 포트 구성을 바꿀 때 물리 보드 ID와 shield 상태를 기록합니다.</p>`;
 else info=`<h3>${t.title}</h3><p><code>${t.mpn}</code><br>${t.revision} · 66 × 40 mm</p><table class="pin-table"><thead><tr><th>신호</th><th>RJ45</th><th>DUT 단자</th></tr></thead><tbody>${[['A+',1,t.pins.A[0]],['A−',2,t.pins.A[1]],['B+',3,t.pins.B[0]],['B−',6,t.pins.B[1]]].map(a=>`<tr>${a.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table><p><b>NC: ${t.nc}</b></p><p class="caption">${t.note}</p>`;
 $('boardInfo').innerHTML=info+`<button id="zoomBoard" type="button">${enlarged?'전체 PCB 보기':'DUT 단자 확대'}</button><p class="hash">PCB SHA-256<br>${b.sha256}</p>`;
 $('zoomBoard').onclick=()=>{enlarged=!enlarged;board();};
 document.querySelectorAll('[data-board]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.board===selectedBoard)));
}
const stages=[
 ['SMA 끝에서 full 2-port SOLT','두 VNA 케이블 끝에서 알려진 50 Ω O/S/L과 정의된 THRU로 양방향 보정을 수행합니다. 독립 load/through로 재접속을 확인하고 이후 표준·DUT 취득에도 같은 보정을 활성화합니다.','저장: 장비 설정, SMA 교정 파일·ID, 검증 데이터.'],
 ['DUT 접속면에서 3 + 3 + 1','Port 1의 O/S/L 3개, Port 2의 O/S/L 3개, reciprocal thru 1개를 저장합니다. Short와 100 Ω Load는 해당 페어 두 핀 사이입니다. shell/GND로 묶지 않습니다. 한 세트의 표준을 순차 재사용해도 포트별 파일은 따로 필요합니다.','저장: p1_open/short/load.s2p, p2_open/short/load.s2p, thru.s2p. 모든 파일의 주파수 grid를 일치시킵니다.'],
 ['동일한 구성으로 DUT 취득','표준 측정 7회로 cal.npz를 만든 다음 DUT를 연결해 복소 S11/S21/S12/S22를 저장합니다. DUT 데이터는 보정계수를 구하는 입력에 넣지 않습니다. 다른 DUT에도 동일 구성의 보정을 재사용할 수 있습니다.','저장: session.json, cal.npz, dut_001.s2p, 연결 사진과 개체 ID.'],
 ['보정 결과를 독립 확인','Python으로 접속면 기준 100 Ω 결과를 내고 독립 저항/선로, 반복 체결, 모델 민감도, passivity와 reciprocity를 확인합니다. 보정에 쓴 O/S/L이 이상적인 값으로 보이는 것만으로 정확도를 입증하지 않습니다.','보존: SMA 원본과 보정된 s2p / csv / png / json. 자동 정상·불량 판정이나 TDR 위치 진단은 현재 미구현입니다.']
];
function stage(i){const s=stages[i];$('stageDetail').innerHTML=`<h3>${s[0]}</h3><p>${s[1]}</p><p><b>${s[2]}</b></p>`;document.querySelectorAll('[data-stage]').forEach(e=>e.setAttribute('aria-pressed',String(Number(e.dataset.stage)===i)));}
['left','right','pair'].forEach(id=>$(id).addEventListener('change',setup));
['highlight','layer','pinLabels'].forEach(id=>$(id).addEventListener('change',board));
document.querySelectorAll('[data-board]').forEach(e=>e.addEventListener('click',()=>{selectedBoard=e.dataset.board;enlarged=false;board();}));
document.querySelectorAll('[data-stage]').forEach(e=>e.addEventListener('click',()=>stage(Number(e.dataset.stage))));
$('resetSetup').onclick=()=>{$('left').value='llc';$('right').value='molex';$('pair').value='A';setup();};
$('downloadBom').onclick=()=>{const q=x=>'"'+String(x).replace(/"/g,'""')+'"';const csv=[['품목','규격','선택 구성 설치량','2026-09-17 구매 기록','RF 관계'],...currentBom.map(r=>[r.name,r.mpn,r.qty,r.history,r.shared])].map(r=>r.map(q).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`fixture-bom-${$('left').value}-${$('right').value}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.querySelectorAll('[data-show-board]').forEach(e=>e.addEventListener('click',()=>{selectedBoard=e.dataset.showBoard;enlarged=false;board();}));
setup();board();stage(0);
})();
