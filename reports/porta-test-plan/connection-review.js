/* Inspect saved native PEC edges. No field solution is run in this page. */
window.initConnectionReview=async function(initialSection){
 'use strict';
 const base='records/screening-review-06/',get=async name=>{const r=await fetch(base+name);if(!r.ok)throw Error(name);return r.json();};
 const [data,coarse,fine,model]=await Promise.all([get('manifest.json'),get('native-coarse-edges.json'),get('native-fine-edges.json'),get('model.json')]);
 initialSection.id='initial-results';
 const history=document.createElement('details');history.id='initial-records';
 history.innerHTML='<summary>이전 TEST 01 숫자와 3D 기록 열기 · 배선 판단용 해석 철회</summary>';
 initialSection.before(history);history.append(initialSection);
 const section=document.createElement('section');section.id='run-results';
 section.innerHTML=`<div class="section-head"><div><p class="eyebrow">SCREENING REVIEW 06 · 2026.09.13</p><h2>작은 오차보다 먼저 발견한 연결 문제</h2></div><a href="${base}manifest.json">검토 결과·근거 ↗</a></div>
 <p>큰 잡음이 나타나는 곳과 배선 변경 효과가 유지되는지 확인했습니다. <strong>TEST 00은 관심 대역의 기준 검사 완료. TEST 01의 기존 잡음값은 전원선 연결 오류 때문에 해석을 철회합니다.</strong></p>
 <div class="scope-grid"><div><h3>TEST 00 · 기준 검사 완료</h3><p>10–200 MHz에서 격자를 바꾸어도 선로 전달 크기 차이는 최대 <strong>0.0097 dB</strong>, 위상 차이는 <strong>1.06°</strong>였습니다. 이번 탐색을 위한 기준 검사에서는 큰 변화가 없었습니다.</p><p class="small muted">기존 3개 실행 모두 종료 에너지 목표에 도달. 이 결과를 케이블 모델의 검증이나 0.5–6 GHz 전체 대역의 수렴으로 확대하지 않습니다.</p></div><div><h3>TEST 01 · 첫 결과 사용 중단</h3><p>첫 격자에서 양끝 시험 연결부의 <strong>전원선 4개가 계산상 끊어져</strong> 있었습니다. Ethernet 4선은 연결돼 있었습니다. 잡음이 의도한 전원 경로로 들어가는 시험이 아니었습니다.</p><p class="small muted">입력 CAD 그림은 이어져 보입니다. 아래는 openEMS가 실제로 만든 계산 도체를 별도로 내보내 확인한 것입니다. 실물 케이블의 단선이라는 뜻이 아닙니다.</p></div></div>
 <h3>입력부를 확대해 두 격자 비교하기</h3>
 <div class="toolbar"><button id="pec-coarse" aria-pressed="true">첫 격자 · 전원 단절</button><button id="pec-fine" aria-pressed="false">세분화 격자 · 연결</button><label>도체 <select id="pec-wire"><option value="4">+24 V · 선 1</option><option value="5">+24 V · 선 2</option><option value="6">0 V · 선 1</option><option value="7">0 V · 선 2</option><option value="0">Ethernet 1 · 선 A</option><option value="1">Ethernet 1 · 선 B</option><option value="2">Ethernet 2 · 선 A</option><option value="3">Ethernet 2 · 선 B</option></select></label></div>
 <p id="pec-status" class="caution" aria-live="polite"></p>
 <div class="stage-wrap"><div id="pec-scene" class="stage" tabindex="0" aria-label="실제 계산 도체의 연결 검사. 방향키 회전, 더하기 빼기 확대, Home 전체 보기"></div><div class="labels" id="pec-labels"></div><p class="stage-badge">실제 PEC 격자 도체 · 왼쪽 시험 연결부 · 길이 비율 유지</p></div>
 <div class="toolbar"><label><input type="checkbox" id="pec-cad" checked> 입력 CAD 중심선 겹치기</label><button id="pec-overview">연결부 전체</button><button id="pec-close">포트 근처 확대</button></div>
 <p class="small"><span class="pec-connected">● 입력 포트와 이어진 도체</span> · <span class="pec-separated">● 입력 포트와 분리된 도체</span> · 회색 점선: 입력 CAD 중심선. 색은 잡음의 세기가 아니라 전기적 연결 상태입니다.</p>
 <p id="pec-mesh-info" class="small muted"></p>
 <details><summary>어떻게 교차 확인했는가</summary><p>① 전체 케이블의 실제 격자에서 도체 연결을 추적했습니다. ② 현재 배선의 왼쪽 시험 연결부를 같은 국부 형상·격자로 잘라 openEMS의 준비 연산을 실행하고 <strong>PEC_dump.vtp</strong>를 내보냈습니다. ③ 그 파일의 실제 선분과 연결 성분을 위에 표시했습니다. 두 검사에서 전원선 단절과 세분화 후 연결이 일치했습니다.</p><p>잘라낸 영역은 바깥 경계가 바뀐 연결 확인용 모델이며, 새로운 잡음 전달 결과가 아닙니다. 전체 모델 연결 검사는 현재·변경 배선 모두에서 수행했습니다. 세분화 격자에서 포트가 의도한 여섯 전기망으로 연결되는지 확인했으며, 이 사실만으로 출력 크기의 격자 검증이 끝난 것은 아닙니다.</p><p><a id="pec-native" href="${base}native-coarse/PEC_dump.vtp">선택 격자의 실제 도체 파일 ↓</a> · <a id="pec-audit" href="${base}connectivity-same-coarse.json">전체 케이블 연결 검사 ↗</a> · <a href="${base}connectivity-mixed-fine.json">변경 배선의 세분화 연결 검사 ↗</a></p></details>
 <h3>잔류 에너지와 추가 시간 검사의 결론</h3><p>작은 잔류 에너지 수치 자체로 결과를 버린 것이 아닙니다. 이번에는 <strong>잡음을 넣는 경로가 끊겨 있다는 문제가 먼저 확인</strong>됐습니다. 이 상태로 시간을 늘리면 연결 오류가 있는 모델을 더 오래 계산하게 됩니다.</p><p>추가 실행은 연결 검토를 위해 중단했습니다. 기존 격자는 약 4.50 ns, 세분화 격자는 약 1.25 ns까지 전압 기록이 남았으며 입력 펄스 종료 약 5.73 ns보다 짧습니다. 따라서 <strong>새로운 긴 시간 비교나 배선별 잡음 순위는 아직 확보하지 않았습니다.</strong></p>
 <div class="table-scroll"><table><thead><tr><th>이번에 확정한 것</th><th>판정</th></tr></thead><tbody><tr><td>TEST 00 관심 대역의 기준 선로</td><td>탐색용 기준 검사 완료</td></tr><tr><td>TEST 01 첫 격자의 전원 경로</td><td>단절 확인 · 기존 결합값의 물리적 해석 철회</td></tr><tr><td>TEST 01 세분화 격자의 도체 연결</td><td>현재·변경 배선 모두 연결 확인</td></tr><tr><td>연결된 두 격자와 두 관측 시간의 잡음 비교</td><td>재계산 필요 · 아직 완료되지 않음</td></tr></tbody></table></div>
 <p>다음 계산에는 <strong>도체 연결이 틀리면 실행을 시작하지 않는 검사</strong>를 추가했습니다. 연결된 모델에서 전원 입력이 케이블 반대쪽으로 전달되는지 먼저 확인하고, 그다음 Ethernet의 큰 출력과 배선 변경 효과를 비교해야 합니다.</p>
 <details id="ref-comparison"><summary>TEST 00의 저장된 두 격자 곡선 비교</summary><div class="sim-chart-wrap"><svg id="ref-chart" viewBox="0 0 900 270" role="img" aria-label="10에서 200 MHz 기준 선로의 두 격자 전달 크기"></svg></div><p class="small muted">같은 물리적 기준면으로 재처리한 실제 기록입니다. 곡선은 저장된 주파수 지점을 잇습니다. <a href="records/initial-openems/manifest.json">최초 실행과 대역별 검증 기록 ↗</a></p></details>`;
 history.before(section);
 const $=id=>document.getElementById(id),T=window.THREE,color=n=>getComputedStyle(document.documentElement).getPropertyValue('--sc-'+n).trim();
 let level='coarse',wire=4,root,guide,shownEdges=0,labels=[];
 const sets={coarse,fine},el=$('pec-scene'),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(color('stage'));el.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.01,1000),controls=new T.OrbitControls(camera,renderer.domElement);
 scene.add(new T.HemisphereLight(0xffffff,0x444444,1));
 const vec=p=>new T.Vector3(p[0]+70,p[2]-23,p[1]);
 function render(){renderer.render(scene,camera);for(const l of labels){const p=l.point.clone().project(camera),x=(p.x*.5+.5)*el.clientWidth,y=(-p.y*.5+.5)*el.clientHeight;l.button.hidden=Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1;l.button.style.left=Math.max(5,Math.min(el.clientWidth-l.button.offsetWidth-5,x))+'px';l.button.style.top=Math.max(40,Math.min(el.clientHeight-l.button.offsetHeight-5,y))+'px';}}
 function fit(close=false){const w=model.wires[wire],p=w.points[0],q=w.points[1];controls.target.copy(close?vec(p).lerp(vec(q),.2):new T.Vector3(0,.5,1.5));camera.position.copy(controls.target).add(new T.Vector3(8,15,26).normalize().multiplyScalar((close?9:34)/Math.min(camera.aspect||1,1)));controls.update();render();}
 function distance2(p,a,b){let t=0,d=0;for(let k=0;k<3;k++){t+=(p[k]-a[k])*(b[k]-a[k]);d+=(b[k]-a[k])**2;}t=Math.max(0,Math.min(1,t/d));return p.reduce((s,v,k)=>s+(v-a[k]-t*(b[k]-a[k]))**2,0);}
 function build(){
  if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}root=new T.Group();scene.add(root);
  const data=sets[level],w=model.wires[wire],check=data.wireChecks[wire],points=w.points.filter(p=>p[0]<=-58),vertices=[[],[]];
  for(const [a,b] of data.edges){const p=data.nodes[a],q=data.nodes[b],mid=p.map((v,k)=>(v+q[k])/2);let d=Infinity;for(let i=1;i<points.length;i++)d=Math.min(d,distance2(mid,points[i-1],points[i]));if(d>(model.input.copperRadius_mm+1e-5)**2)continue;const j=data.component[a]===check.portComponent?0:1;vertices[j].push(...vec(p).toArray(),...vec(q).toArray());}
  shownEdges=(vertices[0].length+vertices[1].length)/6;
  for(let j=0;j<2;j++)root.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices[j],3)),new T.LineBasicMaterial({color:color(j?'rx':'accent')})));
  guide=new T.Line(new T.BufferGeometry().setFromPoints(points.map(vec)),new T.LineDashedMaterial({color:color('stage-ink'),dashSize:.24,gapSize:.18,transparent:true,opacity:.65,depthTest:false}));guide.computeLineDistances();guide.visible=$('pec-cad').checked;root.add(guide);
  $('pec-labels').replaceChildren();labels=[];
  for(const [name,p] of [['입력 포트',check.portNearestNode_mm],['케이블 본체 시작',check.cableNearestNode_mm]]){const point=vec(p),o=new T.Mesh(new T.SphereGeometry(.19,12,8),new T.MeshBasicMaterial({color:color('focus')}));o.position.copy(point);root.add(o);const button=document.createElement('button');button.textContent=name;button.type='button';button.onclick=()=>{controls.target.copy(point);camera.position.copy(point).add(new T.Vector3(3,5,8));controls.update();};$('pec-labels').append(button);labels.push({button,point});}
  for(const l of ['coarse','fine'])$('pec-'+l).setAttribute('aria-pressed',String(l===level));
  $('pec-status').textContent=check.connectedPortToCable?'선택 도체는 입력 포트에서 케이블 본체까지 이어져 있습니다.':'선택 도체는 입력 포트에서 케이블 본체까지 이어지지 않습니다. 주황색 부분은 포트와 분리돼 있습니다.';
  $('pec-mesh-info').textContent=(level==='coarse'?'첫 격자: 길이 방향 기본 0.8 mm · 단면 0.20 mm.':'세분화 격자: 길이 방향 0.4 mm · 단면 0.16 mm.')+' 선택 도체에 해당하는 실제 격자 선분 '+shownEdges.toLocaleString()+'개를 표시합니다. 실드와 다른 도체는 연결부를 보기 위해 화면에서 제외했습니다.';
  $('pec-native').href=base+'native-'+level+'/PEC_dump.vtp';$('pec-audit').href=base+'connectivity-same-'+level+'.json';fit();
 }
 for(const l of ['coarse','fine'])$('pec-'+l).onclick=()=>{level=l;build();};$('pec-wire').onchange=()=>{wire=+$('pec-wire').value;build();};$('pec-cad').onchange=()=>{guide.visible=$('pec-cad').checked;render();};$('pec-overview').onclick=()=>fit();$('pec-close').onclick=()=>fit(true);
 controls.addEventListener('change',render);new ResizeObserver(()=>{const width=el.clientWidth,height=el.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();fit();}).observe(el);
 el.addEventListener('keydown',e=>{if(e.key==='Home'){fit();e.preventDefault();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.12);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.12);else if(['+','='].includes(e.key))s.radius*=.85;else if(e.key==='-')s.radius*=1.15;else return;e.preventDefault();camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
 const curves=data.test00.curves,all=curves.flatMap(c=>c.transmissionMagnitude_dB),min=Math.floor(Math.min(...all)*100)/100-.01,max=Math.ceil(Math.max(...all)*100)/100+.01,x=f=>75+(f/1e6-10)/190*800,y=v=>20+(max-v)/(max-min)*200;
 let svg='';for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;svg+=`<line x1="75" x2="875" y1="${y(v)}" y2="${y(v)}" stroke="${color('line')}"/><text x="65" y="${y(v)+4}" text-anchor="end">${v.toFixed(2)} dB</text>`;}for(const f of [10,50,100,150,200])svg+=`<text x="${x(f*1e6)}" y="250" text-anchor="middle">${f} MHz</text>`;curves.forEach((c,i)=>{svg+=`<polyline points="${c.frequency_Hz.map((f,j)=>`${x(f)},${y(c.transmissionMagnitude_dB[j])}`).join(' ')}" fill="none" stroke="${color(i?'accent':'focus')}" stroke-width="2.5" ${i?'stroke-dasharray="6 4"':''}/><text x="${95+i*180}" y="35" fill="${color(i?'accent':'focus')}">${i?'세분화 격자':'기준 격자'}</text>`;});$('ref-chart').innerHTML=svg;
 build();document.querySelector('.pill').textContent='TEST 00 기준 확인 · TEST 01 연결 오류 확인';
 window.__connectionReview={ready:true,data,snapshot:()=>({level,wire,connected:sets[level].wireChecks[wire].connectedPortToCable,shownEdges,cad:guide.visible,camera:camera.position.toArray(),solverLaunchedInBrowser:false,replacementTransientComplete:false})};
};
