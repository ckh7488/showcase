/* Display saved openEMS results. Controls never launch or interpolate a solve. */
(async()=>{
 'use strict';
 const base='records/screening-openems-01/',resp=await fetch(base+'manifest.json',{cache:'no-store'});
 if(!resp.ok)throw Error('실행 결과를 불러오지 못했습니다.');
 const data=await resp.json(),section=document.createElement('section');section.id='run-results';
 section.innerHTML=`<div class="section-head"><div><p class="eyebrow">OPENEMS · SCREENING REVIEW</p><h2>격자와 시간을 바꿔도 판단이 유지되는가</h2></div><a href="${base}manifest.json">조건·비교·원본 기록 ↗</a></div>
 <p>TEST 00 기준 선로와 TEST 01의 짧은 케이블을 실제로 계산했습니다. 아래 조작은 <strong>저장된 계산값</strong>을 선택합니다. 실험실의 오류를 재현한 결과는 아닙니다.</p>
 <p id="sim-verdict" class="caution"></p><ul id="sim-findings"></ul>
 <div class="sim-layout"><div><div class="toolbar"><button id="sim-same" aria-pressed="true">현재 +/+ · 0/0</button><button id="sim-mixed" aria-pressed="false">변경 +/0 · +/0</button><button id="sim-overview">전체 보기</button><button id="sim-input">입력 확대</button><button id="sim-output">관측 확대</button></div>
 <div class="stage-wrap"><div id="sim-scene" class="stage" tabindex="0" aria-label="실제 계산에 입력한 케이블 형상. 방향키 회전, 더하기·빼기 확대, Home 초기화"></div><div id="sim-labels" class="labels"></div><p class="stage-badge">CSXCAD 입력 도체 · 길이 방향 0.4배 · 색은 선의 구분</p></div>
 <div class="toolbar"><label><input id="sim-shield" type="checkbox" checked> 등가 실드 표시</label><label><input id="sim-mesh" type="checkbox"> 케이블 중앙 · 실제 격자의 일부</label></div>
 <p class="small muted">120 mm 케이블 + 양끝 20 mm 시험 연결부. 입력은 전원 + 묶음과 0 묶음 사이, 관측은 선택한 끝의 Ethernet 두 선 사이입니다. 8선 모두 계산에 포함했습니다. 작은 사각형은 100 Ω 시험 종단이며 실제 SMPS나 PHY의 부하값을 뜻하지 않습니다.</p><p class="small muted">절연체 바깥지름 1.016 mm와 외피 바깥지름 6.731 mm는 도면에서 가져왔습니다. <strong>네 쌍의 피치가 모두 24 mm이고 단면에서 사각형으로 놓인다는 조건은 가정</strong>입니다.</p><p class="small muted">포일과 편조는 하나의 부유 완전도체 실드로 근사했습니다. 내부 PP 절연체와 TPE 외피는 화면에서 생략했으며 계산에는 가정한 유전율로 포함했습니다.</p></div>
 <div class="sim-numbers"><div class="toolbar"><button id="sim-pair0" aria-pressed="true">Ethernet 쌍 1</button><button id="sim-pair1" aria-pressed="false">Ethernet 쌍 2</button></div>
 <label>관측 위치 <select id="sim-end"><option value="far">잡음 입력의 반대쪽 끝</option><option value="near">잡음 입력 쪽 끝</option></select></label>
 <button id="sim-largest">양끝 네 관측점 중 가장 큰 값 보기</button>
 <div class="toolbar"><button id="sim-diff" aria-pressed="true">두 선 사이 전압</button><button id="sim-common" aria-pressed="false">두 선의 평균 전압</button></div><p id="sim-observation" class="small muted"></p>
 <label>계산 격자 <select id="sim-level"><option value="fine">세분화 · 645만 셀</option><option value="coarse">기존 · 250만 셀</option></select></label>
 <label>사용한 관측 기록 <select id="sim-window"><option value="8">처음 8 ns</option><option value="12">처음 12 ns</option><option value="15.5" selected>처음 15.5 ns</option></select></label>
 <label><input type="checkbox" id="sim-compare-grid" checked> 다른 격자의 결과도 점선으로 겹치기</label>
 <label class="sim-frequency">계산된 주파수 <input id="sim-frequency" type="range" min="0" max="190" step="1" value="90"><output id="sim-frequency-out">100 MHz</output></label>
 <p class="small muted">10–200 MHz의 실제 계산 지점입니다. 네 실행을 최대 16 ns까지 계산하고, 공통으로 확보된 8·12·15.5 ns까지의 기록을 각각 비교합니다. 기록 사이를 보간하거나 미계산 구간을 예측하지 않습니다.</p>
 <div class="metric"><h4>입력 잡음 1 V당 · 현재 배선</h4><div id="sim-value-same" class="sim-value"></div><p id="sim-db-same"></p></div>
 <div class="metric"><h4>입력 잡음 1 V당 · 변경 배선</h4><div id="sim-value-mixed" class="sim-value"></div><p id="sim-db-mixed"></p></div>
 <p id="sim-point-validation" class="small"></p><p id="sim-runtime" class="small muted"></p><p class="small"><a id="sim-csv" download>선택 배선의 계산값 CSV ↓</a> · <a id="sim-input-record">형상·조건 기록 ↗</a></p></div></div>
 <div class="sim-chart-wrap"><svg id="sim-chart" viewBox="0 0 900 300" role="img" aria-label="현재 배선과 변경 배선의 주파수별 잡음 전달 비교"></svg></div>
 <p id="sim-chart-caption" class="small muted"></p>
 <details><summary>시간을 늘렸을 때 달라진 출력과 잔류 에너지</summary><p>이번 목적은 잡음 경로와 개선 방향을 찾는 것입니다. 종료 에너지 비율만으로 합격·불합격을 정하지 않고, 관측 시간을 늘렸을 때 관심 출력이 얼마나 달라지는지 함께 봅니다. 원래 −50 dB 목표의 달성 여부는 실행 기록에 보존했습니다.</p><div class="sim-chart-wrap"><svg id="sim-energy" viewBox="0 0 900 240" role="img" aria-label="16 ns까지 기록한 잔류 에너지 지표"></svg></div><p class="small muted">선택한 격자의 실제 실행 로그입니다. 에너지는 근사 지표이며 전압 오차율이 아닙니다. 입력은 약 5.73 ns에서 끝납니다.</p><p id="sim-tail-check" class="small"></p></details>
 <details><summary>TEST 00과 TEST 01에서 확인한 것 / 남은 것</summary><div id="sim-quality"></div><p>현재 케이블 모델은 쌍별 피치·배열·PP 유전율을 가정하며, 구리·실드는 완전도체로 두었습니다. 포일·편조의 실제 접촉과 손실, 실제 SMPS·트랜스·PHY 종단은 들어 있지 않습니다. 시험 지그의 전원 묶음 연결도 배선에 따라 바뀌므로, 지그에서 생긴 결합과 케이블 내부의 결합을 추가로 분리해 확인해야 합니다.</p></details>`;
 document.getElementById('experiment').before(section);
 document.querySelector('.pill').textContent='TEST 00·01 실행 · 가정·검증 상태 포함';
 const $=id=>document.getElementById(id),T=window.THREE;
 let pair=0,wiring='same',level='fine',windowNs='15.5',observationEnd='far',index=90,mode='diff',model,root,shield,slice,buildTicket=0,labels=[],geometryCaseId;
 const runs=Object.fromEntries(data.cableRuns.map(r=>[r.id,r]));
 if(!runs['test01-same-fine']||!runs['test01-mixed-fine']){level='coarse';$('sim-level').value='coarse';$('sim-level').querySelector('[value=fine]').disabled=true;}
 const outputKey=()=> (mode==='diff'?'Hdiff':'Hcommon')+(observationEnd==='near'?'Near':'');
 const run=(w,l=level)=>{const r=runs['test01-'+w+'-'+l];return r?{...r,...r.windows[windowNs]}:null;},mag=(r,p,i)=>Math.hypot(r[outputKey()].real[p][i],r[outputKey()].imag[p][i]);
 const available=()=>['same','mixed'].filter(w=>run(w));
 $('sim-mixed').disabled=!runs['test01-mixed-coarse'];
 const db=v=>20*Math.log10(Math.max(v,1e-15));
 const unit=v=>v>=.001?(v*1000).toPrecision(3)+' mV':(v*1e6).toPrecision(3)+' μV';
 const fmt=v=>Number(v).toFixed(3),models=new Map(),meshes=new Map();
 const color=n=>getComputedStyle(document.documentElement).getPropertyValue('--sc-'+n).trim();
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(color('stage'));
 const el=$('sim-scene');el.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.05,1000),controls=new T.OrbitControls(camera,renderer.domElement);
 scene.add(new T.HemisphereLight(0xffffff,0x334444,.8));const light=new T.DirectionalLight(0xffffff,.6);light.position.set(40,70,60);scene.add(light);
 const vector=p=>new T.Vector3(p[0]*.4,p[2],p[1]);
 const material=(c,opacity=1)=>new T.MeshStandardMaterial({color:c,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide,roughness:.65});
 function box(start,stop,c,opacity=1){const a=vector(start),b=vector(stop),size=b.clone().sub(a);const o=new T.Mesh(new T.BoxGeometry(Math.max(Math.abs(size.x),.15),Math.max(Math.abs(size.y),.15),Math.max(Math.abs(size.z),.15)),material(c,opacity));o.position.copy(a.add(b).multiplyScalar(.5));root.add(o);return o;}
 function render(){renderer.render(scene,camera);for(const l of labels){const p=l.position.clone().project(camera);l.button.hidden=Math.abs(p.z)>1||Math.abs(p.x)>1||Math.abs(p.y)>1;const x=(p.x*.5+.5)*el.clientWidth,y=(-p.y*.5+.5)*el.clientHeight;l.button.style.left=Math.max(5,Math.min(el.clientWidth-l.button.offsetWidth-5,x+6))+'px';l.button.style.top=Math.max(43,Math.min(el.clientHeight-l.button.offsetHeight-5,y+l.offset))+'px';}}
 function fit(target,dist){controls.target.copy(target||new T.Vector3(0,12,0));camera.position.copy(controls.target).add(new T.Vector3(.3,.8,1.2).normalize().multiplyScalar((dist||140)/Math.min(camera.aspect,1)));controls.update();render();}
 async function build(){
  const ticket=++buildTicket,id=run(wiring).id;
  if(!models.has(id))models.set(id,await(await fetch(base+id+'/model.json')).json());
  if(!meshes.has(id))meshes.set(id,await(await fetch(base+id+'/mesh.json')).json());
  if(ticket!==buildTicket)return;
  model=models.get(id);
  if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  root=new T.Group();scene.add(root);
  for(const w of model.wires){const path=new T.CurvePath();for(let i=1;i<w.points.length;i++)path.add(new T.LineCurve3(vector(w.points[i-1]),vector(w.points[i])));
   const c=w.pair<2?(w.pair===pair?color('tx'):color('phy')):w.group==='plus'?color('rx'):color('line');
   const o=new T.Mesh(new T.TubeGeometry(path,Math.max(120,w.points.length*2),model.input.copperRadius_mm,6,false),material(c));root.add(o);}
  const L=model.input.length_mm,H=model.input.height_mm;
  shield=new T.Mesh(new T.CylinderGeometry(model.input.shield.radius_mm,model.input.shield.radius_mm,L*.4,40,1,true),material(color('line'),.16));shield.rotation.z=Math.PI/2;shield.position.y=H;shield.visible=$('sim-shield').checked;root.add(shield);
  box(model.referencePlate.start,model.referencePlate.stop,color('ground'),.25);
  for(const p of model.ports)box(p.start,p.stop,p.role==='power'?color('rx'):p.pair===pair?color('tx'):color('phy'));
  if(mode==='common'){
   const p=model.ports.find(p=>p.role==='ethernet'&&p.pair===pair&&p.end===observationEnd),x=(p.start[0]+p.stop[0])/2,y=p.start[1];
   for(const z of [p.start[2],p.stop[2]]){const line=new T.Line(new T.BufferGeometry().setFromPoints([vector([x,y,z]),vector([x,y,0])]),new T.LineDashedMaterial({color:color('tx'),dashSize:.65,gapSize:.35}));line.computeLineDistances();root.add(line);}
  }
  labels=[];$('sim-labels').replaceChildren();
  for(const item of [{p:model.ports.find(p=>p.role==='power'&&p.end==='near'),text:'입력: + 묶음 ↔ 0 묶음',role:'source',offset:-32},{p:model.ports.find(p=>p.role==='ethernet'&&p.pair===pair&&p.end===observationEnd),text:'관측: '+(observationEnd==='near'?'입력 쪽':'반대쪽')+' 쌍 '+(pair+1),role:'probe',offset:8}]){
   const position=vector(item.p.start).add(vector(item.p.stop)).multiplyScalar(.5),button=document.createElement('button');button.type='button';button.textContent=item.text;button.dataset.role=item.role;button.onclick=()=>fit(position,30);$('sim-labels').append(button);labels.push({button,position,offset:item.offset});
  }
  const mesh=meshes.get(id),verts=[];
  for(const y of mesh.y.filter(v=>Math.abs(v)<5))verts.push(0,H-4,y,0,H+4,y);
  for(const z of mesh.z.filter(v=>Math.abs(v-H)<4))verts.push(0,z,-5,0,z,5);
  slice=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(verts,3)),new T.LineBasicMaterial({color:color('ground'),transparent:true,opacity:.6}));slice.visible=$('sim-mesh').checked;root.add(slice);
  geometryCaseId=id;
  fit();
 }
 function chart(){
  const width=900,height=300,left=75,right=25,top=20,bottom=48;
  const levels=$('sim-compare-grid').checked?[level,level==='fine'?'coarse':'fine']:[level];
  const all=levels.flatMap(l=>available().flatMap(w=>run(w,l).frequency_Hz.map((_,i)=>db(mag(run(w,l),pair,i)))));
  const ymin=Math.max(-150,Math.floor(Math.min(...all)/10)*10),ymax=Math.ceil(Math.max(...all)/10)*10+10;
  const x=i=>left+i/190*(width-left-right),y=v=>top+(ymax-Math.max(v,ymin))/(ymax-ymin)*(height-top-bottom);
  let svg='';
  for(let j=0;j<=4;j++){const v=ymin+j*(ymax-ymin)/4,yy=y(v);svg+=`<line x1="${left}" x2="${width-right}" y1="${yy}" y2="${yy}" stroke="${color('line')}"/><text x="${left-10}" y="${yy+4}" text-anchor="end">${v.toFixed(0)} dB</text>`;}
  for(const f of [10,50,100,150,200])svg+=`<text x="${x(f-10)}" y="${height-18}" text-anchor="middle">${f} MHz</text>`;
  for(const l of levels.slice().reverse())for(const w of available()){const c=w==='same'?color('focus'):color('accent'),pts=run(w,l).frequency_Hz.map((_,i)=>`${x(i)},${y(db(mag(run(w,l),pair,i)))}`).join(' ');svg+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="${l===level?2.4:1.8}" stroke-dasharray="${l===level?'0':'6 4'}" opacity="${l===level?1:.65}"/>`;if(l===level)svg+=`<circle cx="${x(index)}" cy="${y(db(mag(run(w,l),pair,index)))}" r="5" fill="${c}"/>`;}
  svg+=`<line x1="${x(index)}" x2="${x(index)}" y1="${top}" y2="${height-bottom}" stroke="${color('muted')}" stroke-dasharray="4 4"/><text x="${left+12}" y="${top+15}" fill="${color('focus')}">현재 배선</text>${run('mixed')?`<text x="${left+100}" y="${top+15}" fill="${color('accent')}">변경 배선</text>`:''}`;
  $('sim-chart').innerHTML=svg;
 }
 function energyChart(){
  const availableRuns=data.cableRuns.filter(r=>r.id.endsWith('-'+level)&&r.energyProgress),start=5.5,end=16,left=75,right=25,top=20,bottom=42,width=900,height=240;
  const x=t=>left+(t-start)/(end-start)*(width-left-right),y=db=>top+(-25-db)/30*(height-top-bottom);
  let svg='';
  for(const db of [-30,-40,-50]){svg+=`<line x1="${left}" x2="${width-right}" y1="${y(db)}" y2="${y(db)}" stroke="${color(db===-50?'focus':'line')}" stroke-dasharray="${db===-50?'5 4':'0'}"/><text x="${left-10}" y="${y(db)+4}" text-anchor="end">${db} dB</text>`;}
  for(const t of [6,8,10,12,14,16])svg+=`<text x="${x(t)}" y="${height-15}" text-anchor="middle">${t} ns</text>`;
  for(const r of availableRuns){const e=r.energyProgress,points=e.time_s.map((t,i)=>({t:t*1e9,v:e.relativeToLoggedPeak_dB[i]})).filter(p=>p.t>=e.sourceEnd_s*1e9);svg+=`<polyline points="${points.map(p=>`${x(p.t)},${y(p.v)}`).join(' ')}" fill="none" stroke="${color(r.wiring==='same'?'focus':'accent')}" stroke-width="2.4"/>`;}
  svg+=`<text x="${width-right-5}" y="${y(-50)-8}" text-anchor="end">원래 종료 목표</text><text x="${left+12}" y="${top+14}" fill="${color('focus')}">현재 배선</text>${availableRuns.length>1?`<text x="${left+100}" y="${top+14}" fill="${color('accent')}">변경 배선</text>`:''}`;
  $('sim-energy').innerHTML=svg;
  const key=outputKey();
  $('sim-tail-check').textContent=availableRuns.map(r=>{const c=data.screening.timeComparisons[r.id][key]['8_to_15.5ns'][pair];return `${r.wiring==='same'?'현재':'변경'} 배선 · 쌍 ${pair+1}: 기록을 8→15.5 ns로 늘렸을 때, 100 MHz 출력 ${unit(c.at100MHz.before_VperV)}→${unit(c.at100MHz.after_VperV)}. 10–200 MHz 전체에서 진폭의 최대 차이 ${unit(c.maxAbsoluteMagnitudeChange_VperV)} / 입력 1 V.`;}).join(' ');
 }
 function update(){
  $('sim-frequency-out').textContent=(run(wiring).frequency_Hz[index]/1e6)+' MHz';
  for(const w of ['same','mixed']){const r=run(w),v=r?mag(r,pair,index):null;$('sim-value-'+w).textContent=r?unit(v):'결과 대기';$('sim-db-'+w).textContent=r?db(v).toFixed(2)+' dB(V/V) · 입력 1 V로 정규화':'완료된 계산값이 아직 없습니다.';$('sim-'+w).setAttribute('aria-pressed',String(wiring===w));}
  for(const n of [0,1])$('sim-pair'+n).setAttribute('aria-pressed',String(pair===n));
  for(const m of ['diff','common'])$('sim-'+m).setAttribute('aria-pressed',String(mode===m));
  $('sim-observation').textContent=(observationEnd==='near'?'잡음 입력 쪽 끝 · ':'잡음 입력의 반대쪽 끝 · ')+(mode==='diff'?'차동전압: Ethernet 두 선 사이에 생긴 전압입니다.':'공통모드 전압: 시험판을 기준으로 읽은 두 선 전압의 평균입니다. 점선은 실제 전압 관측 경로입니다. 입력은 계속 전원 +/0 사이의 잡음이며 TEST 02를 새로 실행한 결과가 아닙니다.');
  $('sim-chart-caption').textContent=`세로축: Ethernet ${mode==='diff'?'차동전압':'공통모드 전압'} / 실제 전원 입력전압, dB(V/V). 실선은 선택한 ${level==='fine'?'세분화':'기존'} 격자, 점선은 다른 격자입니다. ${windowNs} ns까지의 기록을 사용했습니다. 선택값은 실제 계산 지점의 값입니다.`;
  const vc=mag(run(wiring,'coarse'),pair,index),vf=mag(run(wiring,'fine'),pair,index);
  $('sim-point-validation').textContent=`선택 배선·쌍의 격자 비교: 기존 ${unit(vc)} → 세분화 ${unit(vf)} / 입력 1 V. 진폭 비 ${(vf/vc).toPrecision(3)}배. 작은 차이 자체보다 큰 잡음과 배선 효과가 유지되는지 봅니다.`;
  const r=run(wiring);$('sim-runtime').textContent=`${r.input.cells.toLocaleString()}개 격자 셀 · 계산 ${(r.elapsed_s/60).toFixed(1)}분 · 종료 에너지 ${r.termination.lastReportedEnergy_dB} dB`;
  $('sim-csv').href=base+r.id+'/transfer.csv';$('sim-input-record').href=base+r.id+'/input.json';
  if(!r.portPowerCheck.passed)$('sim-point-validation').textContent+=' 포트 전력 일관성에 별도 확인이 필요한 실행입니다.';
  chart();energyChart();
 }
 $('sim-verdict').textContent=data.summary?.verdict||'두 격자와 세 관측 길이의 실제 계산값을 비교합니다.';
 for(const text of data.summary?.findings||[]){const li=document.createElement('li');li.textContent=text;$('sim-findings').append(li);}
 const q=data.referenceChecks;
 $('sim-quality').textContent=`TEST 00: 10–200 MHz의 기준 선로 비교를 마무리했습니다. 같은 기준면에서 격자 변경 차이 최대 ${fmt(q.targetBandCheck.maxMagnitudeDifference_dB)} dB / ${fmt(q.targetBandCheck.maxPhaseDifference_deg)}°. 별도 0.5–6 GHz 대역의 위상 비교는 기존 기준에 미달했으며, 이번 마무리 범위는 10–200 MHz입니다. TEST 01: 두 배선 × 두 격자를 실제 계산하고 8·12·15.5 ns 기록을 비교했습니다. 포트 전력 일관성 ${data.cableRuns.every(r=>r.portPowerCheck.passed)?'확인':'추가 점검 필요'}. 3 dB 정도의 진폭 변화와 2배 정도의 큰 배선 효과를 탐색용 참고선으로 사용하며, 제품 내성 기준이나 정밀도 보증으로 쓰지 않습니다.`;
 for(const w of ['same','mixed'])$('sim-'+w).onclick=()=>{wiring=w;update();build();};
 for(const n of [0,1])$('sim-pair'+n).onclick=()=>{pair=n;update();build();};
 for(const m of ['diff','common'])$('sim-'+m).onclick=()=>{mode=m;update();build();};
 $('sim-level').onchange=()=>{level=$('sim-level').value;update();build();};
 $('sim-window').onchange=()=>{windowNs=$('sim-window').value;update();};
 $('sim-end').onchange=()=>{observationEnd=$('sim-end').value;update();build();};
 $('sim-largest').onclick=()=>{
  const r=run(wiring),values=[];
  for(const end of ['near','far'])for(const p of [0,1]){const key=(mode==='diff'?'Hdiff':'Hcommon')+(end==='near'?'Near':'');values.push({end,p,value:Math.hypot(r[key].real[p][index],r[key].imag[p][index])});}
  const best=values.sort((a,b)=>b.value-a.value)[0];observationEnd=best.end;pair=best.p;$('sim-end').value=observationEnd;update();build();
 };
 $('sim-compare-grid').onchange=chart;
 $('sim-frequency').oninput=()=>{index=+$('sim-frequency').value;update();};
 $('sim-shield').onchange=()=>{shield.visible=$('sim-shield').checked;render();};$('sim-mesh').onchange=()=>{slice.visible=$('sim-mesh').checked;render();};
 $('sim-overview').onclick=()=>fit();$('sim-input').onclick=()=>{const p=model.ports.find(p=>p.role==='power'&&p.end==='near');fit(vector(p.start),30);};$('sim-output').onclick=()=>{const p=model.ports.find(p=>p.role==='ethernet'&&p.pair===pair&&p.end===observationEnd);fit(vector(p.start),25);};
 controls.addEventListener('change',render);
 new ResizeObserver(()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();fit();}).observe(el);
 el.addEventListener('keydown',e=>{if(e.key==='Home'){fit();e.preventDefault();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.12);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.12);else if(['+','='].includes(e.key))s.radius*=.85;else if(e.key==='-')s.radius*=1.15;else return;e.preventDefault();camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
 energyChart();update();await build();
 if(location.hash==='#run-results')section.scrollIntoView({block:'start',behavior:'instant'});
 window.__simulationResults={ready:true,data,snapshot:()=>({pair,wiring,level,windowNs,observationEnd,index,mode,frequency_Hz:run(wiring).frequency_Hz[index],caseId:run(wiring).id,geometryCaseId,shield:shield.visible,mesh:slice.visible,wireCount:model.wires.length,portCount:model.ports.length,camera:camera.position.toArray(),target:controls.target.toArray(),solverLaunchedInBrowser:false})};
})().catch(e=>{console.error(e);});
