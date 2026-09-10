'use strict';
const $ = id => document.getElementById(id);
const PARTS=['BODY','JIB','TOWER'];
const LABELS={0:'경보 대상',1:'HOOK',10:'예외 ROI',11:'부위 예외',12:'부위 전용',13:'삼각 예외',14:'범위 밖'};
const C={sensor:[0xff8d79,0x69dcb0],model:0x8cacbe,amber:0xefb860,pink:0xff769f};
const state={log:2,frame:7,mode:0,view:'cabin',stage:'xyz',candidate:null,playing:false,sequence:0,loaded:null};
const cache=new Map(), pending=new Map();
const fmt=(n,k=2)=>Number.isFinite(n)?n.toFixed(k):'—';
const tm=s=>`${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
const logData=()=>DATA.logs.find(l=>l.id===state.log);
const frameData=()=>logData().frames[state.frame];
const modeData=()=>frameData().modes[state.mode];
const alarm=d=>[0,1].includes(d.label)&&d.distance<1;
const accepted=d=>[0,1].includes(d.label);
const cabin=DATA.roi.y_jib1_body_cabin.trim().split(/\s+/).map(Number);
const inner=DATA.roi.y_jib1_body_inner.trim().split(/\s+/).map(Number);
const inside=(p,b)=>p.every((v,i)=>v>=b[2*i]&&v<=b[2*i+1]);
const inflate=(str,Type=Float32Array)=>{const b=str instanceof Uint8Array?str:pako.inflate(Uint8Array.from(atob(str),c=>c.charCodeAt(0)));return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);};
window.registerFrame=(key,data)=>{cache.set(key,data);while(cache.size>5){let first=cache.keys().next().value;if(first===frameData().key){const v=cache.get(first);cache.delete(first);cache.set(first,v);}else cache.delete(first);}if(pending.has(key)){pending.get(key).resolve(data);pending.delete(key);}};
function getFrame(key){
 if(cache.has(key))return Promise.resolve(cache.get(key));
 if(pending.has(key))return pending.get(key).promise;
 let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
 pending.set(key,{promise,resolve,reject});
 loadPackedFrame(`data/${key}.bin`).then(data=>window.registerFrame(key,data)).catch(error=>{pending.delete(key);reject(error);});
 return promise;
}

// Geometry stays in the software's XYZ coordinates; Z is up, metres are unchanged.
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080d14);
const camera=new THREE.PerspectiveCamera(43,1,.03,1200);camera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.minDistance=.2;controls.maxDistance=500;controls.screenSpacePanning=true;
scene.add(new THREE.HemisphereLight(0xc8e8ff,0x283343,1));const sunlight=new THREE.DirectionalLight(0xffffff,.8);sunlight.position.set(50,30,100);scene.add(sunlight);
const cloudGroup=new THREE.Group(), modelGroup=new THREE.Group(), bboxGroup=new THREE.Group(), distanceGroup=new THREE.Group();scene.add(cloudGroup,modelGroup,bboxGroup,distanceGroup);
const grid=new THREE.GridHelper(200,100,0x385163,0x1c2a39);grid.rotation.x=Math.PI/2;grid.position.z=-3;grid.material.transparent=true;grid.material.opacity=.33;scene.add(grid);
const axes=new THREE.AxesHelper(2);scene.add(axes);
let clipPlanes=[],selectedWorld=null,pointObjects=[],candidateMeshes=[],modelObjects=[];
function disposeGroup(group){while(group.children.length){const x=group.children[0];group.remove(x);x.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}}
function points(array,color,size,colors){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(array,3));if(colors)g.setAttribute('color',new THREE.BufferAttribute(colors,3));const m=new THREE.PointsMaterial({color:colors?0xffffff:color,size,sizeAttenuation:false,vertexColors:!!colors,transparent:true,opacity:.9,clippingPlanes:clipPlanes});const p=new THREE.Points(g,m);return p;}
function setClip(){let b;
 if(state.view==='cabin')b=[-9,8,-12,7,-6,16];
 else if(state.view==='jib')b=[-6,6,4,36,4,55];
 else if(state.view==='candidate'&&state.candidate){const p=state.candidate.point;b=p.flatMap(v=>[v-3,v+3]);}
 clipPlanes=$('clip').checked&&b?[new THREE.Plane(new THREE.Vector3(1,0,0),-b[0]),new THREE.Plane(new THREE.Vector3(-1,0,0),b[1]),new THREE.Plane(new THREE.Vector3(0,1,0),-b[2]),new THREE.Plane(new THREE.Vector3(0,-1,0),b[3]),new THREE.Plane(new THREE.Vector3(0,0,1),-b[4]),new THREE.Plane(new THREE.Vector3(0,0,-1),b[5])]:[];
 for(const root of [cloudGroup,bboxGroup,distanceGroup])root.traverse(o=>{if(o.material){o.material.clippingPlanes=clipPlanes;o.material.needsUpdate=true;}});
 grid.visible=state.view==='whole';
}
function buildModels(){disposeGroup(modelGroup);modelObjects=[];const style=$('modelStyle').value;
 for(const [i,m] of MODELS.entries()){
  const group=new THREE.Group();
  if(style==='mesh'){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(inflate(m.vertices),3));g.setIndex(new THREE.BufferAttribute(inflate(m.indices,Uint32Array),1));g.computeVertexNormals();
   const mesh=new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:C.model,transparent:true,opacity:+$('opacity').value,side:THREE.DoubleSide,depthWrite:false,clippingPlanes:clipPlanes}));group.add(mesh);
   const edge=new THREE.LineSegments(new THREE.EdgesGeometry(g,32),new THREE.LineBasicMaterial({color:0x84a9c2,transparent:true,opacity:.25,clippingPlanes:clipPlanes}));group.add(edge);
  }else group.add(points(inflate(m[style==='pcd'?'points':style]),0xa3bdd0,style==='pcd'?1.3:3));
  group.traverse(o=>{if(o.material)o.material.clippingPlanes=[];});
  modelGroup.add(group);modelObjects.push(group);
 }
 updateModels();
}
function updateModels(){const p=modeData().pose;modelObjects[0].rotation.set(0,0,0);modelObjects[1].rotation.x=THREE.MathUtils.degToRad(p[1]);modelObjects[2].rotation.z=THREE.MathUtils.degToRad(p[2]); // Tower rotates about (0,-.38,0); replay angle is zero.
 const r=THREE.MathUtils.degToRad(p[2]);modelObjects[2].position.set(-.38*Math.sin(r),-.38+.38*Math.cos(r),0);modelGroup.visible=$('model').checked;
}
function box(b,color){const g=new THREE.BoxGeometry(b[1]-b[0],b[3]-b[2],b[5]-b[4]);const edges=new THREE.EdgesGeometry(g);g.dispose();const o=new THREE.LineSegments(edges,new THREE.LineDashedMaterial({color,dashSize:.35,gapSize:.16,transparent:true,opacity:.8,clippingPlanes:clipPlanes}));o.position.set((b[0]+b[1])/2,(b[2]+b[3])/2,(b[4]+b[5])/2);o.computeLineDistances();return o;}
function buildBoxes(){disposeGroup(bboxGroup);if($('bbox').checked)bboxGroup.add(box(cabin,C.amber));if($('innerBbox').checked)bboxGroup.add(box(inner,0x8f9fe3));}
function rawArray(data,name,Type=Float32Array){data._decoded??={};return data._decoded[name]??=(inflate(data[name],Type));}
function buildCloud(){if(!state.loaded)return;disposeGroup(cloudGroup);pointObjects=[];const size=+$('pointSize').value;const data=state.loaded;state.stage=$('stage').value;
 if(state.stage==='cluster'){
  const a=rawArray(data,`cluster${state.mode}`),labels=rawArray(data,`labels${state.mode}`,Int8Array),colors=new Float32Array(a.length);const palette={0:0xffb86a,1:0xda83ed,2:0x68b2c6,3:0x535f70,4:0xa18bd1,'-1':0x384a5d};const pc={};for(const [k,v] of Object.entries(palette))pc[k]=new THREE.Color(v);
  for(let i=0;i<labels.length;i++){const c=pc[labels[i]]||pc[-1];colors[3*i]=c.r;colors[3*i+1]=c.g;colors[3*i+2]=c.b;}
  const p=points(a,0xffffff,size,colors);p.userData={stage:'Cluster',labels};cloudGroup.add(p);pointObjects.push(p);
 }else for(const s of [0,1]){if(!$(`sensor${s}`).checked)continue;const key=state.stage==='raw'?`raw${s}`:`xyz${state.mode}s${s}`;const a=rawArray(data,key);const p=points(a,C.sensor[s],size);p.userData={stage:state.stage==='raw'?'원본 변환':'InterfaceRotor',sensor:s+1};cloudGroup.add(p);pointObjects.push(p);}
 $('sensor0').disabled=$('sensor1').disabled=state.stage==='cluster';
 let n=pointObjects.reduce((acc,p)=>acc+p.geometry.attributes.position.count,0);
 $('pointCounts').textContent=`${n.toLocaleString()}점 · 간소화 없음${$('clip').checked&&state.view!=='whole'?' · 화면에서 주변부 잘라 보기':''}`;
 $('legend').innerHTML=state.stage==='cluster'?'<span><i class="dot" style="background:#ffb86a"></i>물체</span><span><i class="dot" style="background:#68b2c6"></i>자기 구조</span><span><i class="dot" style="background:#a18bd1"></i>예외</span><span><i class="dot" style="background:#384a5d"></i>미배정</span>':'<span><i class="dot coral"></i>센서 1</span><span><i class="dot green"></i>센서 2</span><span><i class="dot" style="background:#8cacbe"></i>크레인 모델</span>';
 $('legend').innerHTML+='<span><i class="dot amber"></i>예외 / 제외 후보</span><span><i class="dot pink"></i>1m 미만 경보 후보</span>';
}
function sphere(p,r,color){const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true,opacity:.95,clippingPlanes:clipPlanes}));o.position.fromArray(p);o.renderOrder=10;return o;}
function drawDistances(){disposeGroup(distanceGroup);candidateMeshes=[];selectedWorld=null;const list=modeData().distances;
 for(const d of list){if($('part').value!=='all'&&d.part!==+$('part').value)continue;const selected=state.candidate?.id===d.id,color=alarm(d)?C.pink:accepted(d)?0xc8e6ef:C.amber;
  const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...d.point),new THREE.Vector3(...d.model)]),new THREE.LineBasicMaterial({color,transparent:true,opacity:selected?1:.35,depthTest:false,clippingPlanes:clipPlanes}));line.renderOrder=8;distanceGroup.add(line);
  const dot=sphere(d.point,selected?.11:.055,color);dot.userData={candidateId:d.id};distanceGroup.add(dot);candidateMeshes.push(dot);
  if(selected){distanceGroup.add(sphere(d.model,.075,0xe3f1fa));selectedWorld=new THREE.Vector3(...d.point);const ring=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(.3,16,8)),new THREE.LineBasicMaterial({color,transparent:true,opacity:.15,clippingPlanes:clipPlanes}));ring.position.copy(selectedWorld);distanceGroup.add(ring);}
 }
 $('markerLabel').hidden=!selectedWorld;if(state.candidate){const d=state.candidate;$('markerLabel').textContent=`${PARTS[d.part]} ${fmt(d.distance,3)}m · ${LABELS[d.label]??d.label}`;$('markerLabel').style.borderColor=alarm(d)?'#ff769f':'#b89565';$('markerLabel').style.color=alarm(d)?'#ff9dba':'#f1c782';}
}
function chooseCandidate(id,focus=false){const list=modeData().distances;state.candidate=list.find(d=>d.id===id)||null;drawDistances();renderCandidateList();renderDetails();if(focus&&state.candidate)focusCandidate();}
function autoChoose(){const part=$('part').value;const list=modeData().distances.filter(d=>part==='all'||d.part===+part);const previous=state.candidate;
 let pick=previous&&list.find(d=>d.part===previous.part&&d.cluster===previous.cluster);
 if(!pick)pick=list.sort((a,b)=>Number(alarm(b))-Number(alarm(a))||a.distance-b.distance)[0];state.candidate=pick||null;
}
function renderCandidateList(){const list=modeData().distances.filter(d=>$('part').value==='all'||d.part===+$('part').value).sort((a,b)=>a.distance-b.distance);$('candidateCount').textContent=`${list.length}개`;$('candidates').innerHTML=list.length?list.map(d=>`<button class="candidate ${alarm(d)?'danger ':''}${d.id===state.candidate?.id?'active':''}" data-id="${d.id}"><span><b>${fmt(d.distance,3)} m</b><small>${PARTS[d.part]} · 물체 ID ${d.cluster}</small></span><span>${LABELS[d.label]??`label ${d.label}`}</span></button>`).join(''):'<div class="empty">이 묶음에는 해당 부위의 출력 후보가 없습니다.</div>';
 for(const b of $('candidates').querySelectorAll('button'))b.onclick=()=>chooseCandidate(+b.dataset.id,true);
}
function renderDetails(){const d=state.candidate;if(!d){$('details').innerHTML='';return;}const inCab=inside(d.point,cabin),inInner=inside(d.point,inner);const count=d.rawNear30cm.reduce((a,b)=>a+b,0);
 $('details').innerHTML=`<h3>${PARTS[d.part]} · ${accepted(d)?'경보 계산에 포함':'경보에서 제외'}된 후보</h3><button class="focus-button" id="focusCandidate">이 점을 중심으로 확대 ↗</button><dl><dt>출력 거리 (추적 평균)</dt><dd>${fmt(d.distance,4)} m</dd><dt>두 좌표의 직선거리</dt><dd>${fmt(d.lineDistance,4)} m</dd><dt>물체 점이 운전석 박스 안?</dt><dd>${inCab?'안':'밖'}</dd><dt>물체 점이 BODY 내부 박스 안?</dt><dd>${inInner?'안':'밖'}</dd><dt>반경 30cm 원본 점</dt><dd>${count}개</dd><dt>센서 1 / 센서 2</dt><dd>${d.rawNear30cm[0]} / ${d.rawNear30cm[1]}</dd></dl><div class="coord">물체 ● [${d.point.map(x=>fmt(x,4)).join(', ')}]<br>모델 ○ [${d.model.map(x=>fmt(x,4)).join(', ')}]</div><div class="explain">${count===0?'이 묶음의 원본에는 표시된 물체 좌표 반경 30cm 안의 점이 없습니다. 출력에는 과거 후보가 남을 수 있습니다.':'원본 점 개수는 현재 묶음의 좌표 변환 결과에서 셌습니다. 가까운 점이 있다고 추적 후보 갱신까지 됐다는 뜻은 아닙니다.'}</div><div class="small subtle">박스 판정은 선의 <b>물체 쪽 끝점</b> 기준입니다. 표시값은 추적 평균이라 선 길이와 다를 수 있습니다.</div>`;
 $('focusCandidate').onclick=focusCandidate;
}
function focusCandidate(){if(!state.candidate)return;state.view='candidate';setClip();const p=new THREE.Vector3(...state.candidate.point);controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(4.8,5.8,3.2));camera.lookAt(p);controls.update();updateSceneTitle();drawDistances();}
function preset(view,move=true){state.view=view;document.querySelectorAll('#presets button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='cabin')$('part').value='0';if(view==='jib')$('part').value='1';if(view==='whole')$('part').value='all';setClip();if(move){let p,t;if(view==='cabin'){p=[20,24,14];t=[0,-2,3];}else if(view==='jib'){p=[28,41,27];t=[0,14,22];}else{p=[88,113,55];t=[0,10,1];}camera.position.fromArray(p);controls.target.fromArray(t);camera.lookAt(controls.target);controls.update();}autoChoose();drawDistances();renderCandidateList();renderDetails();updateSceneTitle();buildCloud();}
function updateSceneTitle(){const names={cabin:'운전석 / BODY 주변',jib:'지브 주변',whole:'전체 점군',candidate:'선택한 거리 후보 주변'};$('sceneTitle').textContent=names[state.view];$('sceneSubtitle').textContent=`${PARTS[1]} 자세 ${fmt(modeData().pose[1],3)}° · 좌표 단위 m · Z축 위쪽`;
 document.querySelectorAll('#presets button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));}
function renderLogs(){const ids=new Set(DATA.alarms.filter(e=>e.distance<1&&e.log).map(e=>e.log));$('logs').innerHTML=DATA.logs.map(l=>`<button class="log ${l.id===state.log?'active':''}" data-log="${l.id}"><div class="logline"><b><span class="number">0${l.id}</span> ${tm(l.start)}</b>${ids.has(l.id)?'<span class="badge">현장 &lt;1m</span>':''}</div><div class="logmeta">${l.frames.some(f=>f.modes[0].distances.some(alarm))?'재현 JIB &lt;1m · 10개 묶음':'재현 경보 후보 &lt;1m 없음'}</div></button>`).join('');for(const b of $('logs').querySelectorAll('button'))b.onclick=()=>navigate(+b.dataset.log,0,'cabin');}
function groupedEvents(){const all=DATA.alarms.filter(e=>e.distance<1&&($('showUncovered').checked||e.log));const groups=[];for(const e of all){const last=groups.at(-1);if(last&&last.end+1===e.seconds&&last.type===e.type&&last.distance===e.distance&&last.log===e.log)last.end=e.seconds;else groups.push({...e,end:e.seconds});}return groups;}
function renderEvents(){$('events').innerHTML=groupedEvents().map((e,i)=>`<button class="event ${e.log?'':'uncovered'}" data-i="${i}"><span><b>${fmt(e.distance)}m · ${e.type.includes('BODY')?'BODY':'JIB'}</b><small>${e.time}${e.end!==e.seconds?'–'+tm(e.end):''}</small></span><small>${e.log?`로그 ${e.log} ↗`:'로그 없음'}</small></button>`).join('');for(const b of $('events').querySelectorAll('button'))b.onclick=()=>{const e=groupedEvents()[+b.dataset.i];if(e.log)navigate(e.log,e.frame,'cabin');else showModal('이 시각의 원본 로그가 없습니다',`<p>${e.time}의 ${fmt(e.distance)}m ${e.type} 기록은 TXT에 있습니다. 제공된 7개 로그가 이 시각을 포함하지 않아 해당 점군으로 이동할 수 없습니다.</p>`);};}
function renderTimeline(){const l=logData();$('ticks').innerHTML=l.frames.map((f,i)=>`<button class="${i===state.frame?'active ':''}${DATA.alarms.some(e=>e.log===state.log&&e.frame===i&&e.distance<1)?'field ':''}${f.modes[state.mode].distances.some(alarm)?'alarm':''}" title="묶음 ${i} · 파일명 기준 ${tm(f.seconds)} 근사" data-f="${i}">${i}</button>`).join('');for(const b of $('ticks').querySelectorAll('button'))b.onclick=()=>navigate(state.log,+b.dataset.f);$('frame').value=state.frame;$('frameText').textContent=`묶음 ${state.frame} / 29`;$('approxTime').textContent=`파일명 기준 약 ${tm(frameData().seconds)}`;}
function renderEvidence(){const events=DATA.alarms.filter(e=>e.log===state.log&&e.frame===state.frame);const field=events.sort((a,b)=>a.distance-b.distance)[0];$('fieldValue').textContent=field?`${fmt(field.distance)} m · ${field.type.includes('BODY')?'BODY':'JIB'}`:'겹치는 기록 없음';$('fieldValue').style.fontSize=field?'21px':'15px';$('fieldNote').textContent=field?`${field.time} · 좌표 미기록 / 묶음 대응은 근사`:'TXT와 파일명 시각을 기준으로 비교';const ds=modeData().distances.filter(accepted).sort((a,b)=>a.distance-b.distance);$('replayValue').textContent=ds.length?`${fmt(ds[0].distance,3)} m · ${PARTS[ds[0].part]}`:'출력 후보 없음';$('replayValue').style.color=ds.length&&alarm(ds[0])?'#ff92b3':'#c1d7e9';$('replayNote').textContent=`패치 ${state.mode?'ON':'OFF'} · 부위 예외 등으로 제외된 값은 미포함`;
}
async function navigate(log,frame,view){state.log=log;state.frame=Math.max(0,Math.min(29,frame));state.mode=+$('mode').value;const token=++state.sequence;$('loading').hidden=false;$('loading').textContent='점군을 불러오는 중…';$('markerLabel').hidden=true;$('pickInfo').hidden=true;try{const data=await getFrame(frameData().key);if(token!==state.sequence)return;state.loaded=data;autoChoose();updateModels();buildCloud();buildBoxes();if(view)preset(view);else{setClip();drawDistances();renderCandidateList();renderDetails();updateSceneTitle();}renderLogs();renderTimeline();renderEvidence();$('loading').hidden=true;window.viewerReady=true;window.viewerFrame={log:state.log,frame:state.frame,mode:state.mode,points:pointObjects.reduce((a,p)=>a+p.geometry.attributes.position.count,0)};}catch(e){$('loading').textContent=e.message;console.error(e);}}
function showModal(title,html){$('modalTitle').textContent=title;$('modalBody').innerHTML=html;$('modal').showModal();}
function showOverview(){showModal('7개 로그 · 전체 210개 묶음',`<p>주황색 윗선: 현장 TXT의 1m 미만 기록을 파일명 시각으로 근사 대응. 분홍색 칸: 재현 결과의 1m 미만 경보 후보. 칸을 누르면 3D로 이동합니다.</p>${DATA.logs.map(l=>`<div class="overview-row"><span>0${l.id} ${tm(l.start)}</span>${l.frames.map((f,i)=>`<button class="${DATA.alarms.some(e=>e.log===l.id&&e.frame===i&&e.distance<1)?'field ':''}${f.modes[state.mode].distances.some(alarm)?'alarm':''}" data-l="${l.id}" data-f="${i}">${i}</button>`).join('')}</div>`).join('')}<p>운전석 BODY 현장 알람과 재현 JIB 0.89m는 같은 사건으로 확인되지 않았습니다. 패치 ON/OFF 모두 재현 JIB 0.89m가 남습니다.</p>`);for(const b of $('modalBody').querySelectorAll('button[data-l]'))b.onclick=()=>{$('modal').close();navigate(+b.dataset.l,+b.dataset.f,'cabin');};}
function showHelp(){showModal('실제 데이터와 표시 기준',`<p><b>7개 로그의 전체 210개 묶음</b>을 담았습니다. 원본 좌표 변환, InterfaceRotor OFF/ON 처리 결과, Cluster 분류 결과, Distance 출력 좌표를 모두 선택해 볼 수 있습니다. 점군을 간소화하거나 보간하지 않았습니다.</p><p><b>원본 변환</b>은 현장 JSON의 extrinsic과 기록된 엔코더 각도를 적용한 좌표입니다. 프로그램의 최소 거리 기준에 맞춰 센서 측정거리 5m 미만과 비유한 좌표는 제외했습니다. 이 화면에서 선택 부위를 자르는 기능은 표시 범위만 바꿉니다.</p><p><b>두 시각은 근사 대응입니다.</b> 로그의 센서 시계는 현장 PC 시계와 다릅니다. 파일명 시각에 묶음 번호를 더해 TXT와 나란히 보여주지만 정확히 같은 순간이라는 뜻은 아닙니다. 재현 결과의 인위적인 발행 시각을 현장 시각으로 사용하지 않았습니다.</p><p><b>현장 BODY 0.84/0.86/0.90m의 XYZ가 없습니다.</b> 따라서 화면에 실제 현장 오탐 위치라고 임의의 점을 만들지 않았습니다. 3D 거리 선은 저장된 재현 결과의 물체·모델 좌표입니다. 개인 이름이 포함된 현장 사진은 공개본에서 제외했습니다.</p><p><b>예외 박스</b>는 재현 당시 DistanceProcessor.json의 BODY cabin / inner 설정입니다. 박스 내부 판정은 물체 끝점을 기준으로 보여줍니다. 거리 label 11은 '부위 예외'이며 박스 외 다른 부위 예외에 의한 제외도 존재합니다.</p><p><b>모델</b>은 실제 Models/Y JIB1의 OBJ와 PCD입니다. 지브는 각 묶음의 저장된 추정 자세로 회전합니다. 0.3m/0.5m voxel 표시도 원본 PCD로부터 계산했습니다. 전체 보기의 격자는 z=−3m의 참고면이며 실제 지면이 아닙니다.</p><p><b>재현의 한계</b>: 당시 현장의 downstream 실행파일·설정을 모두 확보한 재현이 아닙니다. 0.89m JIB 재현을 현장 BODY 경보의 원인으로 단정할 수 없습니다.</p><p>자료 출처<br><code>${DATA.source}</code></p><p>크레인 모델과 제외 박스는 시각화용으로만 읽으며 운영 코드·JSON·실행파일을 수정하지 않습니다.</p>`);}

$('closeModal').onclick=()=>$('modal').close();$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').close();};$('overviewBtn').onclick=showOverview;$('helpBtn').onclick=showHelp;
$('showUncovered').onchange=renderEvents;
for(const b of document.querySelectorAll('#presets button'))b.onclick=()=>preset(b.dataset.view);
$('incidentBtn').onclick=async()=>{await navigate(4,8,'jib');const d=modeData().distances.find(alarm);if(d)chooseCandidate(d.id,true);};
$('resetBtn').onclick=()=>preset(state.view==='candidate'?(state.candidate?.part===1?'jib':'cabin'):state.view);
$('sideBtn').onclick=()=>{const d=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(d,.001,.001));controls.update();};
$('topBtn').onclick=()=>{const d=camera.position.distanceTo(controls.target);camera.position.copy(controls.target).add(new THREE.Vector3(0,-.001,d));controls.update();};
$('stage').onchange=()=>{buildCloud();};$('mode').onchange=()=>navigate(state.log,state.frame);
for(const s of [0,1])$(`sensor${s}`).onchange=buildCloud;
$('part').onchange=()=>{state.candidate=null;autoChoose();drawDistances();renderCandidateList();renderDetails();};
$('model').onchange=updateModels;$('modelStyle').onchange=buildModels;$('opacity').oninput=()=>{modelGroup.traverse(o=>{if(o.isMesh)o.material.opacity=+$('opacity').value;});};
$('bbox').onchange=buildBoxes;$('innerBbox').onchange=buildBoxes;$('clip').onchange=()=>{setClip();buildCloud();};$('pointSize').oninput=()=>{pointObjects.forEach(p=>p.material.size=+$('pointSize').value);};
$('frame').oninput=()=>navigate(state.log,+$('frame').value);$('prev').onclick=()=>navigate(state.log,state.frame-1);$('next').onclick=()=>navigate(state.log,state.frame+1);
let timer;function stopPlay(){state.playing=false;clearTimeout(timer);$('play').textContent='▶ 재생';}async function playStep(){if(!state.playing)return;if(state.frame>=29){stopPlay();return;}await navigate(state.log,state.frame+1);if(state.playing)timer=setTimeout(playStep,+$('speed').value);}$('play').onclick=()=>{if(state.playing){stopPlay();return;}state.playing=true;$('play').textContent='❚❚ 정지';timer=setTimeout(playStep,200);};
document.addEventListener('keydown',e=>{if($('modal').open||['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowLeft'){e.preventDefault();navigate(state.log,state.frame-1);}if(e.key==='ArrowRight'){e.preventDefault();navigate(state.log,state.frame+1);}if(e.code==='Space'){e.preventDefault();$('play').click();}});
const raycaster=new THREE.Raycaster();function cast(e){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);}
renderer.domElement.addEventListener('dblclick',e=>{cast(e);raycaster.params.Points.threshold=Math.max(.025,camera.position.distanceTo(controls.target)*.002);const hits=raycaster.intersectObjects(pointObjects).filter(h=>clipPlanes.every(p=>p.distanceToPoint(h.point)>=0));if(!hits.length)return;const h=hits[0],p=h.object.geometry.attributes.position;const a=[p.getX(h.index),p.getY(h.index),p.getZ(h.index)];const s=h.object.userData;$('pickInfo').hidden=false;$('pickInfo').innerHTML=`${s.stage}${s.sensor?' · 센서 '+s.sensor:''}<br>XYZ [${a.map(x=>fmt(x,4)).join(', ')}] m<br>운전석 박스 ${inside(a,cabin)?'안':'밖'}`;});
let mouseDown;renderer.domElement.addEventListener('pointerdown',e=>{mouseDown=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!mouseDown||Math.hypot(e.clientX-mouseDown[0],e.clientY-mouseDown[1])>4)return;cast(e);const hit=raycaster.intersectObjects(candidateMeshes)[0];if(hit&&clipPlanes.every(p=>p.distanceToPoint(hit.object.position)>=0))chooseCandidate(hit.object.userData.candidateId);});
const resize=new ResizeObserver(()=>{const el=$('viewport');renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();});resize.observe($('viewport'));
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);if(selectedWorld){const p=selectedWorld.clone().project(camera);const el=$('viewport'),label=$('markerLabel');const visible=p.z>-1&&p.z<1&&Math.abs(p.x)<.94&&Math.abs(p.y)<.95&&clipPlanes.every(q=>q.distanceToPoint(selectedWorld)>=0);label.hidden=!visible;if(visible){label.style.left=`${Math.min(el.clientWidth-label.offsetWidth-8,Math.max(8,(p.x*.5+.5)*el.clientWidth+13))}px`;label.style.top=`${Math.max(8,(-p.y*.5+.5)*el.clientHeight-26)}px`;}}}
buildModels();buildBoxes();renderLogs();renderEvents();preset('cabin');animate();navigate(2,7,'cabin');
// Read-only debug surface for repeatable browser QA; no filesystem/network mutation.
window.viewerTest={state,navigate,preset,scene,camera,renderer,controls,get pointObjects(){return pointObjects;},get candidate(){return state.candidate;},DATA};
