(()=>{
'use strict';
const $=id=>document.getElementById(id);
const inputs=['has-cable','has-metal','has-drive','has-dc','has-magnetic'];
const presetValues={battery:[false,false,false,false,false],wired:[true,false,false,true,false],pala:[true,true,true,true,true]};
function row(a,b,c){return '<tr><td>'+a+'</td><td>'+b+'</td><td>'+c+'</td></tr>';}
function updateScope(){
 const [c,m,d,p,h]=inputs.map(id=>$(id).checked);
 const rows=[];
 rows.push(row('외부 RF',m?'함체 포함 검토':'PCB·배선 직접 결합 검토',m?'금속 벽의 미세 모델은 줄이되 접합·관통부와 귀환 경로는 유지':'기본 RF 차폐 이득을 가정하지 않음. PCB와 대표 내부 배선이 수신 구조'));
 rows.push(row('케이블 전도 RF·과도 외란',c?'주요 검토 항목':'외부 도선 경로는 기본 범위 제외',c?'접속부의 CM·DM·실드 경로를 구분. EFT·서지는 환경·포트 조건에 따라 적용':'충전·디버그·접지선이 연결되면 다시 포함. RF와 ESD는 별도'));
 rows.push(row('외부 전원 변동',p?'DC 입력에서 검토':'외부 DC 입력 항목 제외',p?'입력 과도·저하와 로컬 전원 전달을 회로 모델로 확인':'배터리 내부 저항·잔량·내부 부하 변동은 별도의 전원 설계 항목'));
 rows.push(row('내부 스위칭 결합',d?'주요 발생원으로 검토':'해당 전력부 발생원 제외',d?'전압 노드·전류 루프·공유 리턴을 남김. 외함은 내부 결합을 자동 제거하지 않음':'디지털 클록·센서 자체의 동작 전류까지 없다는 뜻은 아님'));
 rows.push(row('ESD',m?'접촉 표면·함체 전류 경로 검토':'접근 가능한 입력·표면 검토',m?'함체에 방전해도 전류의 귀환·장 결합이 회로에 영향 가능':'외부 도선이 없어도 작업자·인접 물체의 방전 가능. 플라스틱은 ESD에서 무함체와 다름'));
 rows.push(row('저주파 자기장',h?'민감 소자와 위치를 별도 검토':'기본 우선순위를 낮춤',h?'홀·자기 센서 등과 발생원 거리를 봄. 단순 PEC RF 해석으로 대체하지 않음':'민감 소자·큰 피해 루프·강한 근접 발생원이 새로 생기면 다시 포함'));
 $('scope-results').innerHTML=rows.join('');
 for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(presetValues[b.dataset.preset].every((v,i)=>v===$(inputs[i]).checked)));
}
for(const id of inputs)$(id).addEventListener('change',()=>{if(id==='has-dc'&&$('has-dc').checked)$('has-cable').checked=true;if(id==='has-cable'&&!$('has-cable').checked)$('has-dc').checked=false;updateScope();});
for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>{presetValues[b.dataset.preset].forEach((v,i)=>$(inputs[i]).checked=v);updateScope();});
function response(x){return [x*x/(1+x*x),x/(1+x*x)];}
function updateRC(){const f=Number($('freq-control').value),delta=Number($('delta-control').value);const a=response(2*Math.PI*f*1e6*50*2e-12);const b=response(2*Math.PI*f*1e6*50*(2+delta)*1e-12);const mv=Math.hypot(a[0]-b[0],a[1]-b[1])*1000;$('freq-label').textContent=f+' MHz';$('delta-label').textContent=delta.toFixed(2)+' pF';$('cap2-label').textContent='C₂ = '+(2+delta).toFixed(2)+' pF';$('vd-value').textContent=mv.toFixed(2);$('rc-interpretation').textContent=delta===0?'대칭 조건: 이 이상 모델의 차동 잡음은 0. 두 입력의 공통 전압까지 0이라는 뜻은 아님.':'동일한 외란원이라도 두 결합 경로의 차이로 DM 잡음 발생. PHY 고장 판정값은 아님.';}
$('freq-control').addEventListener('input',updateRC);$('delta-control').addEventListener('input',updateRC);$('print-report').addEventListener('click',()=>window.print());updateScope();updateRC();
})();
