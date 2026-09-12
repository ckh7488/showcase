(()=>{'use strict';
const $=id=>document.getElementById(id),all=s=>Array.from(document.querySelectorAll(s));
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={stage:0,path:'rf',model:0,lab:0,paused:true,inside:true};
// All visible lesson text is Korean. The stages below define the instructional model.
const stages=[
 {category:'조건이 없으면 그 경로를 제외',title:'외부 케이블이 없으면, 그 유입 경로는 제외한다.',observe:'배터리·PCB만 있다. 충전선·통신선·접지선도 외부로 나가지 않는 조건이다.',retain:'외부 RF의 직접 결합, 사람이 만지는 부분의 ESD, 존재하는 내부 스위칭 회로.',omit:'외부 케이블을 통한 전도 RF. 단, 사용 중 또는 서비스 중 선을 연결하면 다시 포함한다.',reason:'IEC 61000-4-6은 RF를 결합시킬 외부 도선·케이블이 없는 장비를 적용 범위에서 제외한다. 모든 EMC 시험이 면제되는 것은 아니다.',source:'https://webstore.iec.ch/en/publication/65586',next:'케이블을 붙여보기 →',paths:[['rf','직접 RF'],['local','PCB의 국소 루프']]},
 {category:'큰 외부 도체가 추가된다',title:'케이블과 귀환 구조가 함께 결합 경로가 된다.',observe:'외부로 나가는 20 m 도체와 원격 장비가 생겼다. PCB만 있던 때보다 구조가 커졌다.',retain:'케이블의 공통모드 유입과 귀환 경로. 신호 두 선에 같은 방향으로 생긴 전류도 별도로 본다.',omit:'보드의 입력 민감도만 비교한다면 케이블 세부 형상은 경계 입력으로 대체할 수 있다.',reason:'길이만으로 최악이 확정되지는 않는다. 주파수·배치·실드·원격 종단이 결합량을 바꾼다. 다만 외부에 노출된 큰 도체이므로 먼저 검토할 근거가 충분하다.',source:'https://learnemc.com/introduction-to-imbalance-difference-modeling',next:'금속 함체를 씌워보기 →',paths:[['cable','케이블 공통모드'],['signal','신호의 왕복'],['return','돌아오는 경로']]},
 {category:'경계 처리가 차폐를 좌우한다',title:'금속 벽을 추가해도, 관통 경로는 남는다.',observe:'PCB는 금속 안에 있지만 케이블은 벽을 관통한다. 뚜껑의 접합부도 있다.',retain:'관통부의 실드·필터·기준 연결, 그리고 접합부를 통한 결합. 벽과 케이블을 분리해 본다.',omit:'첫 RF 검토에서는 두꺼운 금속 벽의 세부 두께·내부 조직을 PEC로 단순화한다. 틈까지 없애지는 않는다.',reason:'LearnEMC는 차폐함의 Cable Penetrations에서 케이블-함체 경계의 중요성을 설명한다. 이 투시도는 내부를 보기 위한 표현이며 실제 틈이나 투과율을 나타내지 않는다.',source:'https://learnemc.com/practical-em-shielding',next:'커넥터 안을 확대하기 →',paths:[['cable','케이블 유입'],['wall','외벽·접합부 RF'],['shield','실드의 귀환']]},
 {category:'이제 피해 회로의 전압을 본다',title:'둘이 같이 흔들려도, 경계가 다르면 차이가 생긴다.',observe:'커넥터에서 PCB로 넘어가는 두 선은 주변 금속·전원·기준면을 다르게 만날 수 있다.',retain:'두 선의 결합 차이와 공통모드 종단. 그리고 피해 회로가 쓰는 0 V 경로의 임피던스.',omit:'지금 목적이 국소 CM→DM 변환 비교라면 원격 20 m의 형상은 입력·소스 임피던스로 대신한다.',reason:'눈으로는 “양쪽 선의 환경이 같은가?”를 먼저 본다. 수치로는 같은 외란을 넣었을 때 두 선 사이에 남는 전압을 비교한다. 바로 아래 RC 실험에서 확인할 수 있다.',source:'https://learnemc.com/electric-field-coupling',next:'아래 계산 실험으로 →',paths:[['imbalance','두 선의 차이'],['shared','공유 0 V 경로']]}
];
const hotText={
 pcb:'PCB · 배선만 보지 말고 신호의 귀환 기준과 피해 회로가 비교하는 두 점을 함께 남긴다.',
 phy:'피해 회로 · MDI 차동 성분 외에도 전원·리셋·기준 전위 변화가 통신에 영향을 줄 수 있다.',
 cable:'20 m 케이블 · 길이는 화면에서 줄여 그렸다. 커넥터 입력을 정해 두면 국소 보드 모델에서는 이 길이를 생략할 수 있다.',
 reference:'주변 귀환 · 노이즈 전류는 원격 장비·주변 도체·정전용량 등의 경로로 닫힌다. 반드시 대지 접지선이 있어야 하는 것은 아니다.',
 connector:'커넥터 경계 · 신호선뿐 아니라 실드, 24 V, 0 V와 기준 도체의 관계가 남아야 한다.',
 seam:'접합부 · 종이가 안 들어가는 방수 틈이어도 전기적 접합은 별개다. 틈을 통해 유입되는 크기는 아직 계산하지 않았다.',
 shield:'실드 · 실드가 있는 케이블의 예다. 낮은 인덕턴스의 함체 접속이 의도한 귀환을 만든다. 실제 센서 결선은 확인이 필요하다.',
 asym:'비대칭 · 한쪽에 가까운 도체, 종단 차이, 접합 구조의 차이는 CM→DM 변환 후보다. 아래 실험에서는 ΔC로 표현한다.',
 shared:'공유 0 V · 먼 구리 경로라도 공통으로 사용하는 임피던스에서 전압이 생기면 피해 회로의 기준이 달라질 수 있다.'
};
function renderStage(){
 const s=stages[state.stage];
 all('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.stage===state.stage)));
 $('stage-category').textContent=s.category;$('stage-title').textContent=s.title;
 for(const k of ['observe','retain','omit'])$(k).textContent=s[k];
 $('stage-reason').innerHTML=s.reason+' <a class="source-link" href="'+s.source+'" target="_blank" rel="noopener">근거 ↗</a>';
 $('next-stage').textContent=s.next;$('inside').hidden=state.stage<2;
 $('path-picker').innerHTML=s.paths.map(([id,label])=>'<button data-path="'+id+'" aria-pressed="'+(id===state.path)+'">'+label+'</button>').join('');
 all('[data-path]').forEach(b=>b.addEventListener('click',()=>{state.path=b.dataset.path;renderStage();rebuildScene(false)}));
 if(state.path==='return')$('stage-reason').innerHTML='청록색은 귀환 경로의 예다. 주변 물체로의 정전용량을 통한 변위전류도 루프에 포함되며, 실제 분포는 배치와 주파수에 따라 달라진다. <a class="source-link" href="https://learnemc.com/introduction-to-emc" target="_blank" rel="noopener">결합 경로 근거 ↗</a>';
 if(state.path==='shield')$('stage-reason').innerHTML='실드가 있는 케이블에서 실드 전류가 함체로 이어지는 경로를 표시했다. 내부 유입이 0이라는 계산 결과가 아니다. 실드-함체 접속과 내부 선의 결합은 함께 검토한다. <a class="source-link" href="https://learnemc.com/practical-em-shielding" target="_blank" rel="noopener">실드 연결 근거 ↗</a>';
 if(state.path==='wall')$('stage-reason').innerHTML='외부 RF는 금속 표면의 전류와 접합부 주변의 장을 만든다. 분홍색 접합부 경로는 검토할 후보이며, “이만큼 새어 들어온다”는 수치 표현이 아니다. <a class="source-link" href="https://learnemc.com/practical-em-shielding" target="_blank" rel="noopener">접합부 근거 ↗</a>';
 if(state.path==='shared')$('stage-reason').textContent=hotText.shared;
 if(state.path==='signal')$('stage-reason').innerHTML='정상적인 신호의 왕복 전류는 서로 가까운 두 도체에서 반대 방향으로 흐른다. 공통모드는 그 가까운 귀환으로 상쇄되지 않는 성분이다. 파란색은 이 비교를 위한 정상 신호 경로다. <a class="source-link" href="https://learnemc.com/introduction-to-imbalance-difference-modeling" target="_blank" rel="noopener">LearnEMC Point #1 ↗</a>';
}
function setStage(n){state.stage=n;state.path=stages[n].paths[0][0];renderStage();rebuildScene(true)}
all('[data-stage]').forEach(b=>b.addEventListener('click',()=>setStage(+b.dataset.stage)));
$('next-stage').addEventListener('click',()=>state.stage<3?setStage(state.stage+1):$('experiment').scrollIntoView({behavior:reduced?'auto':'smooth'}));

// Self-contained 3D illustration. These paths are authored, NOT solved fields.
let renderer,world,camera,group,labels=[],particles=[],waveObjects=[],seamMesh;
let yaw=-.35,pitch=.64,distance=12,target,sceneReady=false,last=0,phase=0,sceneVisible=true;
const C={board:0x267e6b,trace:0x81b3cf,chip:0x10191f,metal:0x899da7,cm:0xf2bb5b,ret:0x7cdec9,dm:0xf284b3,dim:0x587482,signal:0x87b9ff};
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function mesh(geo,color,position,opacity=1){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.15,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity>=1}));m.position.copy(position);group.add(m);return m}
function box(w,h,d,x,y,z,color,opacity=1){return mesh(new THREE.BoxGeometry(w,h,d),color,V(x,y,z),opacity)}
function tube(points,color,r=.025,opacity=1){const curve=new THREE.CatmullRomCurve3(points.map(p=>V(...p)));const m=mesh(new THREE.TubeGeometry(curve,80,r,7,false),color,V(0,0,0),opacity);return {m,curve}}
function polyline(points,color,width=1,dashed=false){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>V(...p)));const mat=dashed?new THREE.LineDashedMaterial({color,dashSize:.11,gapSize:.07,transparent:true,opacity:.85}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.9});const line=new THREE.Line(geo,mat);line.computeLineDistances();group.add(line);return line}
function route(points,color,count=7,dashed=false){const t=dashed?{curve:new THREE.CatmullRomCurve3(points.map(p=>V(...p)))}:tube(points,color,.018,.68);if(dashed)polyline(t.curve.getPoints(70).map(p=>[p.x,p.y,p.z]),color,1,true);for(let i=0;i<count;i++){const p=mesh(new THREE.SphereGeometry(.045,9,7),color,V(0,0,0));p.position.copy(t.curve.getPoint(i/count));p.material.emissive.setHex(color);p.material.emissiveIntensity=.2;particles.push({mesh:p,curve:t.curve,offset:i/count})}return t}
function label(text,pos,kind='default',hot=''){const b=document.createElement(hot?'button':'span');b.className='scene-label';b.textContent=text;b.dataset.kind=kind;if(hot)b.addEventListener('click',()=>{$('stage-reason').textContent=hotText[hot]||''});$('scene-labels').appendChild(b);labels.push({element:b,pos:V(...pos)})}
function arrow(a,b,color){const dir=V(...b).sub(V(...a));const ar=new THREE.ArrowHelper(dir.clone().normalize(),V(...a),dir.length(),color,.15,.085);group.add(ar)}
function board(x=1.35){
 box(2.9,.08,1.85,x,.15,0,C.board);box(2.72,.012,1.66,x,.106,0,0x396d68);
 for(let z of [-.33,-.17]){tube([[-.32,.22,z],[.2,.22,z],[.65,.22,z-.15],[1.8,.22,z-.15]],C.signal,.025)}
 box(.62,.14,.59,x+.54,.29,-.3,C.chip);
 box(.43,.16,.38,x-.45,.3,-.36,0x344e59);
 box(.45,.1,.28,x+.4,.25,.52,0xa4aa99);
 for(let i=0;i<8;i++){box(.07,.035,.12,x+.3+i*.067,.3,.045,0xaabcc1);box(.07,.035,.12,x+.3+i*.067,.3,-.655,0xaabcc1)}
 for(let i=0;i<5;i++)box(.13,.07,.075,x-.8+i*.29,.23,.6,i%2?0xb2a078:0x465a62);
 for(const dx of [-1.23,1.23])for(const dz of [-.71,.71])mesh(new THREE.CylinderGeometry(.055,.055,.085,14),0xbdc6c6,V(x+dx,.17,dz));
}
function cable(){
 const c=tube([[-5.2,.24,.15],[-4.2,.16,.12],[-3.4,.12,0],[-2.4,.2,0],[-1.5,.28,0],[-.32,.27,0]],0x374d5b,.13);
 // The two visible inner conductors illustrate a mode, not the complete M12 pinout.
 for(let z of [-.18,.02])tube([[-5.2,.27,z],[-4.2,.2,z],[-3.4,.18,z],[-2.4,.27,z],[-.3,.3,z]],0x8397a1,.026);
 box(.9,.47,.8,-5.45,.25,.06,0x5b717d);
 const conn=mesh(new THREE.CylinderGeometry(.26,.26,.5,24),0xc0bca5,V(-.4,.3,0));conn.rotation.z=Math.PI/2;
 for(let x of [-.58,-.42,-.26]){const ring=mesh(new THREE.TorusGeometry(.265,.018,6,24),0x788d96,V(x,.3,0));ring.rotation.y=Math.PI/2;}
}
function enclosure(){
 const op=state.inside?.18:.86;
 mesh(new THREE.CylinderGeometry(1.91,1.91,1.42,64,1,true),C.metal,V(1.35,.64,0),op);
 mesh(new THREE.CylinderGeometry(1.91,1.91,.08,64),0x7a939a,V(1.35,-.095,0),.58);
 const lid=mesh(new THREE.CylinderGeometry(1.91,1.91,.08,64),0xb0bfc3,V(1.35,state.inside?1.89:1.39,0),state.inside?.12:.86);
 seamMesh=mesh(new THREE.TorusGeometry(1.91,.022,6,64),state.path==='wall'?C.dm:0xc4d2d5,V(1.35,1.31,0),.9);seamMesh.rotation.x=Math.PI/2;
 // Mechanical gap in drawing is deliberately exaggerated for visibility.
 if(state.inside){polyline([[-.56,1.35,0],[-.56,1.86,0]],C.dim,1,true);polyline([[3.26,1.35,0],[3.26,1.86,0]],C.dim,1,true)}
}
function incident(){
 for(let j=0;j<3;j++){
 const x=-1.5-j*.8,pts=[[x,-.1,-1.1],[x,1.5,-1.1],[x,1.5,1.1],[x,-.1,1.1],[x,-.1,-1.1]];
 const l=polyline(pts,C.cm);waveObjects.push({mesh:l,base:x,offset:j*.32});
 for(let z of [-.65,.15,.8])arrow([x,.1,z],[x,1.05,z],C.cm);
 }
 arrow([-3.3,1.7,.1],[-1.35,1.7,.1],C.cm);
}
function rebuildScene(reset=true){
 if(!sceneReady){updateFallback();return}
  setViewAvailable(true);$('fallback').style.display='none';
 if(group){world.remove(group);group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(x=>x.dispose())}})}
 group=new THREE.Group();world.add(group);particles=[];waveObjects=[];labels=[];$('scene-labels').replaceChildren();
 board();if(state.stage>=1)cable();else{
 box(.74,.38,.39,.23,.4,.6,0x71826e);box(.21,.39,.4,-.2,.4,.6,0xb99456);
 tube([[-.27,.6,.6],[-.41,.35,.6],[-.4,.23,.28]],0xe2b063,.023);label('교체형 배터리',[.25,.98,.77],'default','pcb');
 }
 if(state.stage>=2)enclosure();
 if(state.stage===0){
  if(state.path==='rf'){incident();label('외부 RF',[-1.93,2.09,.25],'cm');route([[.1,.3,-.2],[.75,.31,-.46],[1.85,.31,-.45]],C.cm,5);route([[1.8,.14,-.5],[1.5,.07,.4],[.35,.07,.4],[.1,.2,-.2]],C.ret,5);}
  else{route([[.2,.31,.2],[.6,.31,-.47],[1.85,.31,-.47],[1.85,.07,-.47],[.3,.07,.2],[.2,.31,.2]],C.ret,9);label('신호와 가까운 귀환',[.7,.8,-.6],'return');}
  label('PCB',[2.55,.26,.78],'default','pcb');label('피해 회로',[2.13,.76,-.51],'dm','phy');
 }else if(state.stage===1){
  if(state.path==='signal'){
   route([[-5.15,.36,-.2],[-3,.23,-.2],[-1.4,.38,-.2],[.2,.34,-.24],[1.8,.35,-.46]],C.signal,12);
   route([[1.8,.35,-.25],[.2,.34,-.04],[-1.4,.38,0],[-3,.23,0],[-5.15,.36,0]],C.signal,12);
   arrow([-3.8,.42,-.2],[-2.5,.42,-.2],C.signal);arrow([-2.5,.42,.04],[-3.8,.42,.04],C.signal);
   label('가까운 두 선으로 왕복',[-2.7,.75,.25],'default');
  }else{
   for(const z of [-.2,.03])route([[-5.15,.36,z],[-4.1,.28,z],[-3,.23,z],[-1.4,.38,z],[.2,.34,z],[1.8,.35,z-.26]],C.cm,10);
   route([[1.9,.25,-.45],[2.5,.15,.6],[1.8,-.38,1.7],[-1.5,-.42,1.9],[-4.5,-.35,1.5],[-5.45,.2,.46]],C.ret,state.path==='return'?14:8,true);
   label('20 m · 길이 축약',[-3.12,.73,0],'cm','cable');label('주변을 통한 귀환',[-1.7,-.2,2.05],'return','reference');
  }
  label('원격 장비',[-5.3,.9,0],'default','reference');label('M12',[-.48,.91,-.15],'default','connector');label('PHY',[2.02,.84,-.49],'dm','phy');
 }else if(state.stage===2){
  label('20 m · 축약',[-3.5,.73,0],'cm','cable');label('M12 경계',[-.55,.83,.3],'cm','connector');label('원형 접합부',[2.6,1.54,1.0],'dm','seam');
  if(state.path==='wall'){
   incident();route([[-.4,.6,-1.],[.1,.7,-1.75],[1.35,.9,-1.92],[2.65,1.25,-1.3],[3.1,1.3,.35]],C.cm,9);
   route([[3.1,1.31,.5],[2.72,1.2,.25],[2.32,.6,-.2],[1.9,.33,-.46]],C.dm,6,true);
   label('틈 경로는 별도 검토',[1.75,2.27,-.1],'dm','seam');
  }else if(state.path==='shield'){
   route([[-5.1,.4,.07],[-3.8,.3,.07],[-2.4,.34,.07],[-.62,.48,.05],[-.55,.55,.5],[.18,.46,1.5],[1.5,.3,1.86],[2.2,.15,1.64]],C.cm,14);
   route([[2.2,.15,1.64],[2.1,-.3,2.1],[-1.5,-.4,2.2],[-4.9,-.4,1.4],[-5.44,.2,.45]],C.ret,9,true);
   label('실드 → 함체',[.25,.85,1.55],'return','shield');
  }else{
   route([[-5.1,.38,-.1],[-3.6,.27,-.1],[-1.4,.35,-.1],[.2,.34,-.14],[1.8,.35,-.46]],C.cm,12);
   route([[1.9,.25,-.45],[2.5,.05,.7],[1.7,-.28,1.88],[-1.8,-.4,2.15],[-5.4,.1,.45]],C.ret,10,true);
   label('내부 회로',[1.9,.81,-.45],'dm','phy');
  }
 }else{
  box(.27,.37,.58,.62,.45,-.81,0xbda277);
  for(let z of [-.34,-.17])route([[-1.5,.39,z],[-.45,.4,z],[.3,.29,z],[.75,.3,z-.15],[1.85,.33,z-.15]],C.cm,8);
  if(state.path==='shared'){
   route([[-.4,.17,.36],[.25,.18,.47],[.9,.18,.5],[1.85,.18,.47]],C.ret,8);
   box(.72,.025,.17,1.0,.205,.5,0xc59248);
   label('공유 0 V 임피던스',[1.1,.71,.92],'return','shared');
   route([[1.84,.19,.47],[1.9,.31,.1],[1.9,.38,-.2]],C.dm,4);
  }else{
   route([[.45,.33,-.46],[.64,.64,-.81],[.75,.32,-.33]],C.dm,5,true);
   route([[1.72,.38,-.49],[1.92,.43,-.33],[1.74,.38,-.26]],C.dm,4);
   label('한쪽 주변이 다르다',[.62,.97,-.91],'dm','asym');
  }
  label('커넥터',[-.58,.82,.19],'default','connector');label('칩이 보는 두 점',[2.2,.89,-.41],'dm','phy');
 }
 $('scene-note').textContent=state.stage>=2?'투시·분해 표현 / 길이·틈 과장 · 점은 교류의 한 순간 경로 표시':'개념도 / 길이·속도·전류 세기 비례 아님 · 점은 경로 표시';
 if(reset){yaw=-.36;pitch=.7;distance=state.stage===0?7.5:state.stage===3?7.6:12.4;target=state.stage===0?V(.25,.4,0):state.stage===3?V(.82,.55,0):V(-1.15,.48,0)}
 fitScene();drawScene();
}
function setViewAvailable(available){
 all('[data-camera],#reset-view,#motion').forEach(button=>button.disabled=!available);
 $('inside').hidden=!available||state.stage<2;
 $('scene-instructions').hidden=!available;
}
function updateFallback(){
 if(sceneReady)return;
 $('fallback').style.display='block';
 $('fallback-title').textContent=stages[state.stage].title;
 const visible={battery:state.stage===0,cable:state.stage===1||state.stage===2,enclosure:state.stage===2};
 all('[data-fallback-base]').forEach(node=>node.toggleAttribute('hidden',!visible[node.dataset.fallbackBase]));
 all('[data-fallback-path]').forEach(node=>node.toggleAttribute('hidden',!node.dataset.fallbackPath.split(' ').includes(state.path)));
 setViewAvailable(false);
}
function adjustView(action){
 if(!sceneReady)return;
 if(action==='left')yaw-=.18;
 if(action==='right')yaw+=.18;
 if(action==='up')pitch=Math.min(1.25,pitch+.1);
 if(action==='down')pitch=Math.max(.25,pitch-.1);
 if(action==='in')distance=Math.max(4,distance*.88);
 if(action==='out')distance=Math.min(20,distance/ .88);
 drawScene();
}
all('[data-camera]').forEach(button=>button.addEventListener('click',()=>adjustView(button.dataset.camera)));
function cameraPose(){camera.position.set(target.x+distance*Math.sin(yaw)*Math.cos(pitch),target.y+distance*Math.sin(pitch),target.z+distance*Math.cos(yaw)*Math.cos(pitch));camera.lookAt(target)}
function fitScene(){if(!sceneReady)return;const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.fov=r.width<600?54:39;camera.updateProjectionMatrix();cameraPose();}
function drawScene(){if(!sceneReady)return;cameraPose();renderer.render(world,camera);const rect=$('scene').getBoundingClientRect(),placed=[];const candidates=labels.map(l=>{const p=l.pos.clone().project(camera);return {l,p,x:(p.x*.5+.5)*rect.width,y:(-p.y*.5+.5)*rect.height}}).sort((a,b)=>a.y-b.y);
 for(const {l,p,x:rawX,y:rawY} of candidates){const half=l.element.offsetWidth/2+5,x=Math.max(half,Math.min(rect.width-half,rawX)),desired=Math.max(32,Math.min(rect.height-52,rawY)),h=l.element.offsetHeight+6;let y=desired;
  for(const dy of [0,-h,h,-2*h,2*h,-3*h,3*h]){const candidate=Math.max(32,Math.min(rect.height-52,desired+dy));if(!placed.some(r=>Math.abs(x-r.x)<half+r.half&&Math.abs(candidate-r.y)<(h+r.h)/2)){y=candidate;break}}
  placed.push({x,y,half,h});l.element.style.left=x+'px';l.element.style.top=y+'px';l.element.style.visibility=(p.z>1||p.z< -1)?'hidden':'visible';
 }}
function initScene(){try{
 if(!window.THREE)throw Error('Three.js is unavailable');
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x15232d);renderer.outputColorSpace=THREE.SRGBColorSpace;
 $('scene').prepend(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','센서 구조 3D 개념도');renderer.domElement.setAttribute('aria-describedby','scene-instructions');world=new THREE.Scene();world.add(new THREE.AmbientLight(0xc4d3df,2.1));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-3,7,5);world.add(sun);const fill=new THREE.DirectionalLight(0x77bccc,1);fill.position.set(3,2,-4);world.add(fill);camera=new THREE.PerspectiveCamera(39,1,.1,70);target=V(0,.3,0);sceneReady=true;
 const grid=new THREE.GridHelper(24,24,0x334a56,0x253b48);grid.position.y=-.52;world.add(grid);
 renderer.domElement.addEventListener('keydown',e=>{
   const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down','+':'in','=':'in','-':'out','_':'out'};
   if(keys[e.key]){e.preventDefault();adjustView(keys[e.key])}
   if(e.key==='Home'){e.preventDefault();rebuildScene(true)}
  });
  let drag=null;
 renderer.domElement.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;drag={x:e.clientX,y:e.clientY,yaw,pitch};renderer.domElement.setPointerCapture(e.pointerId);$('scene').classList.add('dragging')});
 renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw=drag.yaw+(e.clientX-drag.x)*.006;pitch=Math.max(.25,Math.min(1.25,drag.pitch+(e.clientY-drag.y)*.003));drawScene()});
 const end=()=>{drag=null;$('scene').classList.remove('dragging')};renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointercancel',end);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();sceneReady=false;renderer.domElement.hidden=true;updateFallback()});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{sceneReady=true;renderer.domElement.hidden=false;rebuildScene(true)});
 new ResizeObserver(()=>{fitScene();drawScene()}).observe($('scene'));
 new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting},{threshold:0}).observe($('scene'));
 rebuildScene(true);
 function frame(t){requestAnimationFrame(frame);if(!sceneReady||!sceneVisible||document.hidden||state.paused)return;if(t-last<32)return;const dt=Math.min((t-last)/1000,.07);last=t;phase=(phase+dt*.15)%1;for(const p of particles)p.mesh.position.copy(p.curve.getPoint((phase+p.offset)%1));for(const w of waveObjects)w.mesh.material.opacity=.22+.5*(.5+.5*Math.sin(t*.003+w.offset*5));drawScene()}
 requestAnimationFrame(frame);
}catch(e){window.__sceneError=String(e);sceneReady=false;updateFallback()}}
$('reset-view').addEventListener('click',()=>rebuildScene(true));
$('inside').addEventListener('click',()=>{state.inside=!state.inside;$('inside').setAttribute('aria-pressed',String(state.inside));rebuildScene(false)});
function motionLabel(){$('motion').textContent=state.paused?'움직임 재생':'움직임 멈춤';$('motion').setAttribute('aria-pressed',String(state.paused))}
$('motion').addEventListener('click',()=>{state.paused=!state.paused;motionLabel()});motionLabel();

// The model boundary is the choice being taught, not an executable solver UI.
const models=[
 {title:'외부 장이 케이블에 얼마나 결합할까?',input:'입사장 E(f), 방향·편파',keep:'케이블의 큰 구조 + 원격 종단 + 함체/주변 기준',output:'커넥터 면의 선별 V(f), I(f), 공통모드 성분',omit:'PCB 내부의 작은 배선은 적절한 종단으로 대체',warning:'입력 크기 자체가 질문이므로, 20 m의 영향은 등가 전송선·공통모드 구조 등의 형태로 남아야 한다. 작은 커넥터 모델만으로 현장 수신량을 알아낼 수는 없다.'},
 {title:'같은 노이즈를 받으면 어느 보드가 덜 흔들릴까?',input:'커넥터 경계의 정규화 CM 입력 + 정의한 Zs(f)',keep:'신호선·실드·0 V·기준 도체 + 국소 PCB/종단',output:'Vdm / Vcm, 전원·기준 전위의 변화',omit:'원격 케이블 상세는 경계 입력과 소스 임피던스로 대체',warning:'예를 들어 1 V RMS는 비교용 정규화 값이다. 특정 IEC 시험 레벨이나 현장에서 20 m 케이블이 만드는 전압이라는 뜻이 아니다. 차동 100 Ω만으로 공통모드 종단이 정해지지 않는다.'},
 {title:'함체가 실제로 어떤 경로를 바꿀까?',input:'같은 입사장 E(f) + 같은 케이블 종단',keep:'PEC 벽 + 접합부/관통부 + PCB 기준 도체와 피해 지점',output:'같은 피해 지점의 전압/전류 전달함수 비교',omit:'벽의 미세 재료 구조; RF에서 영향이 작은 기구 디테일',warning:'함체 없는 결과가 언제나 최악은 아니다. 공진·접합·귀환 경로가 바뀌므로 같은 관측점에서 비교한다. 접합 조건 스윕은 민감도 조사이며 자동으로 최악 조건을 보장하지 않는다.'}
];
function modelSVG(n){
 if(innerWidth<=680)return modelMobile(n);
 const start='<svg class="diagram model-svg" viewBox="0 0 560 330" role="img" aria-label="'+models[n].title+'"><defs><marker id="model-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#c48321"/></marker></defs>';
 if(n===0)return start+'<rect x="16" y="128" width="90" height="84" rx="12" class="node"/><text x="61" y="160" text-anchor="middle">원격</text><text x="61" y="185" text-anchor="middle">종단</text><rect x="358" y="110" width="175" height="139" rx="22" class="node"/><rect x="394" y="153" width="104" height="63" rx="4" fill="#b2d1c5"/><text x="446" y="190" text-anchor="middle">피해 종단</text><path d="M106 167H392" class="orange" marker-end="url(#model-arr)"/><text x="232" y="198" text-anchor="middle">케이블 구조</text><path d="M446 249V290H62V212" class="teal" stroke-dasharray="7 5"/><text x="267" y="319" text-anchor="middle" class="sub">주변 도체 · 원격 장비를 통한 귀환</text><path d="M158 55L191 126M228 55L261 126M298 55L331 126" class="orange" marker-end="url(#model-arr)"/><text x="221" y="35" text-anchor="middle">외부 RF</text><path d="M369 92V250" class="pink" stroke-dasharray="5 4"/><text x="450" y="79" text-anchor="middle">입력 경계에서 V, I</text></svg>';
 if(n===1)return start+'<rect x="18" y="101" width="157" height="131" rx="13" class="node"/><text x="97" y="134" text-anchor="middle">CM 입력</text><text x="97" y="167" text-anchor="middle">+ Zs(f)</text><text x="97" y="202" text-anchor="middle" class="sub">선별 포트 / 기준</text><path d="M175 131H297M175 162H297M175 205H297" class="orange"/><text x="240" y="112" text-anchor="middle" class="sub">커넥터 면</text><path d="M265 77V248" class="pink" stroke-dasharray="5 4"/><rect x="297" y="89" width="240" height="159" rx="12" class="node"/><text x="417" y="125" text-anchor="middle">국소 PCB + 종단</text><path d="M315 150H510M315 172H510M315 216H510" class="wire"/><text x="415" y="199" text-anchor="middle" class="sub">P / N / 0 V / 실드</text><path d="M96 232V288H420V248" class="teal"/><text x="265" y="317" text-anchor="middle" class="sub">기준 도체와 귀환을 함께 정의</text></svg>';
 return start+'<path d="M37 90L133 112M37 148H133M37 206L133 184" class="orange" marker-end="url(#model-arr)"/><text x="75" y="61" text-anchor="middle">외부 RF</text><rect x="149" y="55" width="334" height="221" rx="43" fill="#e4ebe8" stroke="#81968e" stroke-width="3"/><path d="M158 110H474" class="pink" stroke-dasharray="7 5"/><text x="316" y="94" text-anchor="middle">접합 조건</text><rect x="256" y="153" width="141" height="76" rx="6" fill="#a9cec1"/><text x="327" y="197" text-anchor="middle">PCB / 관측점</text><path d="M42 235H257" class="orange"/><circle cx="158" cy="235" r="13" fill="#f7d6a0" stroke="#ad8129"/><text x="168" y="317" text-anchor="middle" class="sub">관통부와 케이블 종단 유지</text><text x="402" y="306" text-anchor="middle" class="sub">금속 벽: PEC</text></svg>';
}
function modelMobile(n){
 const s='<svg class="diagram model-svg" viewBox="0 0 360 325" role="img" aria-label="'+models[n].title+'">';
 if(n===0)return s+'<rect x="10" y="134" width="76" height="80" rx="10" class="node"/><text x="48" y="164" text-anchor="middle">원격</text><text x="48" y="191" text-anchor="middle">종단</text><rect x="233" y="115" width="117" height="133" rx="20" class="node"/><text x="292" y="168" text-anchor="middle">센서</text><text x="292" y="197" text-anchor="middle">종단</text><path d="M86 174H248" class="orange"/><text x="159" y="154" text-anchor="middle">케이블</text><path d="M293 248V283H48V214" class="teal" stroke-dasharray="6 4"/><text x="180" y="315" text-anchor="middle">주변을 통한 귀환</text><text x="165" y="39" text-anchor="middle">외부 RF</text><path d="M111 68L129 115M156 68L174 115M200 68L218 115" class="orange"/><path d="M233 95V259" class="pink" stroke-dasharray="5 4"/><text x="287" y="82" text-anchor="middle">V, I 관측</text></svg>';
 if(n===1)return s+'<rect x="10" y="89" width="118" height="139" rx="12" class="node"/><text x="69" y="125" text-anchor="middle">CM 입력</text><text x="69" y="157" text-anchor="middle">+ Zs(f)</text><text x="69" y="196" text-anchor="middle">선별 포트</text><path d="M128 116H211M128 157H211M128 204H211" class="orange"/><path d="M174 59V252" class="pink" stroke-dasharray="5 4"/><text x="174" y="34" text-anchor="middle">커넥터 경계에서 단순화</text><rect x="211" y="89" width="139" height="139" rx="12" class="node"/><text x="280" y="127" text-anchor="middle">국소 PCB</text><text x="280" y="159" text-anchor="middle">+ 종단</text><text x="280" y="196" text-anchor="middle">Vdm 관측</text><path d="M70 228V282H282V228" class="teal"/><text x="180" y="314" text-anchor="middle">기준 도체 · 귀환 유지</text></svg>';
 return s+'<rect x="66" y="47" width="281" height="218" rx="38" class="node"/><path d="M75 106H338" class="pink" stroke-dasharray="6 4"/><text x="207" y="86" text-anchor="middle">접합 조건을 바꾼다</text><rect x="157" y="149" width="129" height="73" rx="7" fill="#a9cec1"/><text x="221" y="178" text-anchor="middle">PCB</text><text x="221" y="203" text-anchor="middle">같은 관측점</text><path d="M8 99H65M8 139H65M8 179H65M8 237H157" class="orange"/><circle cx="72" cy="237" r="11" fill="#e7ba7b"/><text x="40" y="28">외부 RF</text><text x="180" y="299" text-anchor="middle">PEC 벽 + 관통부 + 종단</text></svg>';
}
function setModel(n){state.model=n;all('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.model===n)));const m=models[n];$('model-diagram').innerHTML=modelSVG(n);$('model-copy').innerHTML='<h3>'+m.title+'</h3>'+[['입력',m.input],['남기는 구조',m.keep],['읽는 결과',m.output],['생략 가능한 것',m.omit]].map(([a,b])=>'<div class="field"><b>'+a+'</b><span>'+b+'</span></div>').join('');$('model-warning').textContent=m.warning}
all('[data-model]').forEach(b=>b.addEventListener('click',()=>setModel(+b.dataset.model)));

// Numerical experiments: exact solutions of the displayed lumped linear circuits.
function rc(fMHz,deltaPF){const w=2*Math.PI*fMHz*1e6,R=50;const calc=c=>{const a=w*R*c*1e-12;return {re:a*a/(1+a*a),im:a/(1+a*a)}};const a=calc(2),b=calc(2+deltaPF),d={re:a.re-b.re,im:a.im-b.im};return {a,b,d,rms:Math.hypot(d.re,d.im)}}
function ground(fMHz,lNH){return .1*Math.hypot(.05,2*Math.PI*fMHz*1e6*lNH*1e-9)}
function setupCanvas(id){const canvas=$(id),rect=canvas.getBoundingClientRect();if(!rect.width)return null;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const c=canvas.getContext('2d');c.scale(dpr,dpr);return {c,w:rect.width,h:rect.height}}
function plotLine(c,pts,color,width=2){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function drawRC(){const q=setupCanvas('rc-plot');if(!q)return;const {c,w,h}=q,m=rc(+$('frequency').value,+$('delta').value);c.clearRect(0,0,w,h);c.font='12px system-ui';c.fillStyle='#52636a';const x0=51,x1=w-14,top=32,bottom=h-30,half=(bottom-top)/2,centers=[top+half*.5,top+half*1.5];
 for(let k=0;k<2;k++){const y=centers[k];c.strokeStyle='#d5ddda';c.lineWidth=1;c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();c.fillStyle='#52636a';c.fillText(k?'0 mV':'0 V',4,y+4);c.fillText(k?'100 mV':'0.4 V',0,y-half*.37);}
 c.fillStyle='#266dd3';c.fillText('V₁',x0,14);c.fillStyle='#a87514';c.fillText('V₂',x0+35,14);c.fillStyle='#b13676';c.fillText('V₁ − V₂',x0+73,14);
 function line(ph,k,max,color){const p=[];for(let i=0;i<=240;i++){const a=i/240*Math.PI*4,v=Math.SQRT2*(ph.re*Math.cos(a)-ph.im*Math.sin(a));p.push([x0+i/240*(x1-x0),centers[k]-v/max*(half*.38)])}plotLine(c,p,color,2)}
 line(m.a,0,.4,'#266dd3');line(m.b,0,.4,'#b78623');line(m.d,1,.1,'#b13676');c.fillStyle='#52636a';c.textAlign='center';c.fillText('0',x0,h-10);c.fillText('1 주기',x0+(x1-x0)/2,h-10);c.textAlign='right';c.fillText('2 주기',x1,h-10);c.textAlign='left';}
function renderRC(){const f=+$('frequency').value,d=+$('delta').value,m=rc(f,d);$('delta-out').textContent=d.toFixed(2)+' pF';$('freq-out').textContent=f+' MHz';$('c2-label').textContent='C₂ = '+(2+d).toFixed(2)+' pF';$('dm-result').textContent=(m.rms*1000).toFixed(2)+' mV';$('rc-meaning').textContent=d===0?'이 이상적인 대칭 회로에서는 차동 성분이 0이다. 두 선이 함께 흔들리는 성분은 여전히 남는다.':'같은 노이즈원이 두 선을 다르게 흔들어, 두 선 사이에 차이가 남는다. ΔC를 줄이면 이 모델의 차동 성분도 줄어든다.';drawRC()}
function drawGround(){const q=setupCanvas('ground-plot');if(!q)return;const {c,w,h}=q;c.clearRect(0,0,w,h);const x0=53,x1=w-18,y0=h-40,y1=27,yMax=3.3;const py=v=>y0-v/yMax*(y0-y1),px=f=>x0+f/100*(x1-x0);c.font='12px system-ui';c.fillStyle='#52636a';for(let v of [0,1,2,3]){c.strokeStyle='#d5ddda';c.beginPath();c.moveTo(x0,py(v));c.lineTo(x1,py(v));c.stroke();c.fillText(v+' V',9,py(v)+4)}
 for(let f of [0,50,100]){c.textAlign=f===100?'right':f===0?'left':'center';c.fillText(String(f),px(f),y0+20)}c.textAlign='right';c.fillText('MHz',x1,h-3);c.textAlign='left';c.fillText('RMS',7,15);
 const l=+$('inductance').value;for(const [ln,col]of [[2,'#79998d'],[l,'#b13676']]){const pts=[];for(let f=0;f<=100;f++)pts.push([px(f),py(ground(f,ln))]);plotLine(c,pts,col,ln===l?2.7:1.7)}
const f=+$('ground-frequency').value;c.setLineDash([3,3]);plotLine(c,[[px(f),y0],[px(f),py(ground(f,l))]],'#82918a',1);c.setLineDash([]);c.fillStyle='#b13676';c.beginPath();c.arc(px(f),py(ground(f,l)),4,0,Math.PI*2);c.fill();c.fillStyle='#b13676';c.fillText(l+' nH',x0+5,15);c.fillStyle='#557166';c.fillText('2 nH 비교',x0+86,15);}
function renderGround(){const f=+$('ground-frequency').value,l=+$('inductance').value,v=ground(f,l);$('l-out').textContent=l+' nH';$('gf-out').textContent=f+' MHz';$('ground-result').textContent=v<1?(v*1000).toFixed(1)+' mV':v.toFixed(3)+' V';drawGround()}
function setLab(n){state.lab=n;all('[data-lab]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.lab===n)));$('lab-0').hidden=n!==0;$('lab-1').hidden=n!==1;if(n===0)renderRC();else renderGround()}
all('[data-lab]').forEach(b=>b.addEventListener('click',()=>setLab(+b.dataset.lab)));
for(let id of ['delta','frequency'])$(id).addEventListener('input',renderRC);for(let id of ['inductance','ground-frequency'])$(id).addEventListener('input',renderGround);
$('balanced').addEventListener('click',()=>{$('delta').value=0;renderRC()});$('asymmetric').addEventListener('click',()=>{$('delta').value=.6;renderRC()});$('low-l').addEventListener('click',()=>{$('inductance').value=2;renderGround()});$('high-l').addEventListener('click',()=>{$('inductance').value=20;renderGround()});
new ResizeObserver(()=>{drawRC();drawGround()}).observe($('lab-0'));new ResizeObserver(drawGround).observe($('lab-1'));
const desktopCircuits=all('.lab-vis > svg').map(x=>x.outerHTML);
let narrow=null;
function responsiveCircuits(){const small=innerWidth<=680;if(narrow===small)return;narrow=small;
 const diagrams=all('.lab-vis > svg');
 if(!small){diagrams.forEach((d,i)=>d.outerHTML=desktopCircuits[i]);}
 else{
  diagrams[0].outerHTML='<svg class="diagram" viewBox="0 0 360 315" role="img" aria-label="같은 전압원이 C1과 C2를 거쳐 각각 50옴 부하로 결합하는 두 가지 경로"><path d="M70 93V12H290V93M180 12V27M180 78V275M70 107V196M290 107V196M70 230V275H290V230" class="wire"/><circle cx="180" cy="53" r="25" fill="#f0f3ef" stroke="#718189" stroke-width="2"/><text x="180" y="59" text-anchor="middle">Vs</text><text x="214" y="47">1 V</text><text x="214" y="71">RMS</text><path d="M50 93H90M50 107H90M270 93H310M270 107H310" class="orange"/><text x="70" y="73" text-anchor="middle">C₁ = 2 pF</text><text id="c2-label" x="290" y="73" text-anchor="middle">C₂ = 2.2 pF</text><rect x="59" y="196" width="22" height="34" fill="#fff" stroke="#718189" stroke-width="2"/><rect x="279" y="196" width="22" height="34" fill="#fff" stroke="#718189" stroke-width="2"/><text x="101" y="220">50 Ω</text><text x="260" y="220" text-anchor="end">50 Ω</text><circle cx="70" cy="152" r="5" fill="#266dd3"/><circle cx="290" cy="152" r="5" fill="#b78623"/><text x="94" y="156">V₁</text><text x="266" y="156" text-anchor="end">V₂</text><text x="180" y="305" text-anchor="middle">공통 기준 도체</text></svg>';
  diagrams[1].outerHTML='<svg class="diagram" viewBox="0 0 360 315" role="img" aria-label="100 mA RMS 전류가 공유 경로에 전압을 만드는 회로"><rect x="22" y="14" width="316" height="79" rx="13" class="node"/><text x="180" y="46" text-anchor="middle">닫힌 외란 루프</text><text x="180" y="77" text-anchor="middle">전류 100 mA RMS 가정</text><path d="M65 93V207H129M232 207H297V93" class="teal"/><rect x="129" y="180" width="103" height="54" rx="9" fill="#fff0d7" stroke="#c8a162"/><text x="180" y="204" text-anchor="middle">공유 경로</text><text x="180" y="226" text-anchor="middle">R + jωL</text><text x="65" y="157" text-anchor="middle">기준 A</text><text x="297" y="157" text-anchor="middle">기준 B</text><circle cx="65" cy="207" r="5" fill="#117a64"/><circle cx="297" cy="207" r="5" fill="#117a64"/><path d="M65 207V268H297V207" class="pink"/><text x="180" y="303" text-anchor="middle">두 점의 전압 차이 ΔV</text></svg>';
 }
 setModel(state.model);renderRC();renderGround();
}
window.addEventListener('resize',responsiveCircuits);
window.addEventListener('beforeprint',()=>{$('lab-0').hidden=false;$('lab-1').hidden=false;renderRC();renderGround()});
window.addEventListener('afterprint',()=>{setLab(state.lab);requestAnimationFrame(()=>{renderRC();renderGround()})});
renderStage();setModel(0);responsiveCircuits();renderRC();renderGround();initScene();
window.__emcLesson={state,rc,ground,setStage,setModel,setLab,sceneReady:()=>sceneReady,renderRC,renderGround};
})();
