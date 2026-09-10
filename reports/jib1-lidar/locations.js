'use strict';
const $=id=>document.getElementById(id);
const fmt=(v,n=3)=>Number.isFinite(v)?v.toFixed(n):'—';
const colors={body:0xe8b967,jib:0xec84b6,sensors:[0xff8d79,0x69dcb0]};
const state={case:'overview',log:4,frame:7,target:0,after:false,view:'whole',direction:'oblique',sequence:0,loaded:null};
const events=[{log:2,frame:7,distance:.90,time:'13:47:37'},{log:4,frame:19,distance:.91,time:'13:53:49'},{log:4,frame:20,distance:.84,time:'13:53:50'}];
const target=()=>ORIGIN.targets[state.target];
const log=()=>DATA.logs.find(l=>l.id===state.log);
const frame=()=>log().frames[state.frame];
const pose=()=>frame().modes[0].pose[1];
const rad=d=>THREE.MathUtils.degToRad(d);
const rx=(p,d)=>new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(1,0,0),rad(d));
const inflate=(str,Type=Float32Array)=>{const b=str instanceof Uint8Array?str:pako.inflate(Uint8Array.from(atob(str),c=>c.charCodeAt(0)));return new Type(b.buffer,b.byteOffset,b.byteLength/Type.BYTES_PER_ELEMENT);};
const originPoints=inflate(ORIGIN.points),stride=ORIGIN.columns.length;
const cabin=DATA.roi.y_jib1_body_cabin.trim().split(/\s+/).map(Number);
const bodyROI=[-9,8,-12,6,-5,14],jibROI=[-2.5,2.5,16,22,-2,4];
const inside=(x,y,z,b)=>x>=b[0]&&x<=b[1]&&y>=b[2]&&y<=b[3]&&z>=b[4]&&z<=b[5];
const scene=new THREE.Scene();scene.background=new THREE.Color(0x080e16);
const camera=new THREE.PerspectiveCamera(40,1,.02,1500);camera.up.set(0,0,1);
const miniCamera=new THREE.PerspectiveCamera(40,1,.1,1500);miniCamera.up.set(0,0,1);
const renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const miniRenderer=new THREE.WebGLRenderer({canvas:$('miniCanvas'),antialias:true,alpha:true});miniRenderer.setPixelRatio(Math.min(devicePixelRatio,2));
const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.16;controls.screenSpacePanning=true;controls.minDistance=.5;controls.maxDistance=600;
scene.add(new THREE.HemisphereLight(0xd6edff,0x34465a,1.15));
const light=new THREE.DirectionalLight(0xffffff,.8);light.position.set(60,30,100);scene.add(light);
const modelGroup=new THREE.Group(),cloudGroup=new THREE.Group(),regionGroup=new THREE.Group(),markerGroup=new THREE.Group(),ghostGroup=new THREE.Group();
scene.add(modelGroup,cloudGroup,regionGroup,markerGroup,ghostGroup);
// All OBJ triangles are drawn. Neither cameras nor ROI controls clip the model.
const modelObjects=MODELS.map((m,i)=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(inflate(m.vertices),3));g.setIndex(new THREE.BufferAttribute(inflate(m.indices,Uint32Array),1));g.computeVertexNormals();
 const group=new THREE.Group();group.name=m.part;
 group.add(new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:[0xb5c5d0,0x99bace,0x829baa][i],transparent:true,opacity:+$('opacity').value,side:THREE.DoubleSide,depthWrite:false})));
 group.add(new THREE.LineSegments(new THREE.EdgesGeometry(g,32),new THREE.LineBasicMaterial({color:0xa6c9df,transparent:true,opacity:.44})));
 modelGroup.add(group);return group;
});
const ghost=new THREE.LineSegments(modelObjects[1].children[1].geometry,new THREE.LineBasicMaterial({color:0xe9b1ce,transparent:true,opacity:.3}));ghostGroup.add(ghost);ghostGroup.visible=false;
function box(b,color){const g=new THREE.BoxGeometry(b[1]-b[0],b[3]-b[2],b[5]-b[4]);const o=new THREE.LineSegments(new THREE.EdgesGeometry(g),new THREE.LineBasicMaterial({color,transparent:true,opacity:.85}));g.dispose();o.position.set((b[0]+b[1])/2,(b[2]+b[3])/2,(b[4]+b[5])/2);return o;}
const bodyBox=box(cabin,colors.body),jibBox=box([-1.6,1.6,17,21,-1.2,3.2],colors.jib),jibRegion=new THREE.Group();jibRegion.add(jibBox);regionGroup.add(bodyBox,jibRegion);
const bodyAnchor=bodyBox.position.clone();let jibAnchor=new THREE.Vector3(),selectedPoint=null,bodyCandidate=null;
const cache=new Map(),pending=new Map();
window.registerFrame=(key,data)=>{cache.set(key,data);while(cache.size>4)cache.delete(cache.keys().next().value);if(pending.has(key)){pending.get(key).resolve(data);pending.delete(key);}};
function getFrame(key){
 if(cache.has(key))return Promise.resolve(cache.get(key));
 if(pending.has(key))return pending.get(key).promise;
 let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
 pending.set(key,{promise,resolve,reject});
 loadPackedFrame(`data/${key}.bin`).then(data=>window.registerFrame(key,data)).catch(error=>{pending.delete(key);reject(error);});
 return promise;
}
function raw(sensor){const d=state.loaded;d.decoded??={};return d.decoded[sensor]??=inflate(d['raw'+sensor]);}
function clear(group){while(group.children.length){const o=group.children[0];group.remove(o);o.traverse(c=>{c.geometry?.dispose();c.material?.dispose();});}}
function points(a,color,size=2){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a instanceof Float32Array?a:new Float32Array(a),3));return new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,transparent:true,opacity:.88}));}
function updateModels(){
 modelObjects[1].rotation.x=rad(pose()+(state.case==='jib'&&state.after?ORIGIN.delta:0));
 const a=rad(frame().modes[0].pose[2]);modelObjects[2].rotation.z=a;modelObjects[2].position.set(-.38*Math.sin(a),-.38+.38*Math.cos(a),0);
 ghost.rotation.x=rad(pose());ghostGroup.visible=state.case==='jib'&&state.after&&$('ghost').checked;
 jibRegion.rotation.x=rad(pose());jibAnchor=rx([0,19,1],pose());scene.updateMatrixWorld(true);
}
function buildCloud(){if(!state.loaded)return;clear(cloudGroup);const roi=$('cloudScope').value==='regions',mode=state.case==='jib'?$('jibCloud').value:'batch';let n=0;
 for(let s=0;s<2;s++){
  if(!$('sensor'+(s+1)).checked)continue;const out=[];
  if(mode==='all'||mode==='packet'){
   // These retained source records are a JIB neighbourhood, not a whole packet dump.
   const t=target(),c=Math.cos(rad(t.jib_pose)),q=Math.sin(rad(t.jib_pose));
   for(let i=0;i<originPoints.length;i+=stride){if(originPoints[i+3]!==s)continue;if(mode==='packet'&&(s!==t.source[3]||originPoints[i+4]!==t.source[4]))continue;
    const x=originPoints[i],y=originPoints[i+1],z=originPoints[i+2];out.push(x,c*y-q*z,q*y+c*z);
   }
  }else{
   const a=raw(s),c=Math.cos(rad(pose())),q=Math.sin(rad(pose()));
   for(let i=0;i<a.length;i+=3){const x=a[i],y=a[i+1],z=a[i+2];if(roi&&!inside(x,y,z,bodyROI)&&!inside(x,c*y+q*z,-q*y+c*z,jibROI))continue;out.push(x,y,z);}
  }
  if(out.length){const p=points(out,colors.sensors[s],state.view==='whole'?1.7:2.3);p.userData.sensor=s+1;cloudGroup.add(p);n+=out.length/3;}
 }
 cloudGroup.visible=$('showCloud').checked;
 $('cloudScope').disabled=mode!=='batch';
 $('count').textContent=`${n.toLocaleString()}점 · ${mode==='all'?'30개 묶음 / 각 묶음 지브 자세로 정렬':mode==='packet'?'선택 원본 패킷의 지브 주변 점':roi?'선택 묶음 / BODY·JIB 주변':'선택 묶음 전체'} · 모델 전체 유지`;
 window.locationsCloudCount=n;
}
function marker(p,q,color){const dot=points(new Float32Array(p.toArray()),color,11);dot.material.depthTest=false;dot.renderOrder=12;markerGroup.add(dot);
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([p,q]),new THREE.LineBasicMaterial({color,depthTest:false}));line.renderOrder=11;markerGroup.add(line);
 const end=points(new Float32Array(q.toArray()),0xffffff,5);end.material.depthTest=false;end.renderOrder=12;markerGroup.add(end);
}
function drawMarkers(){clear(markerGroup);selectedPoint=null;
 if(state.case==='body'&&bodyCandidate){selectedPoint=new THREE.Vector3(...bodyCandidate.point);marker(selectedPoint,new THREE.Vector3(...bodyCandidate.model),colors.body);$('pointLabel').textContent=`재현 BODY 후보 ${fmt(bodyCandidate.distance)}m · 현장 점 미확정`;$('pointLabel').style.borderColor='#e8b967';}
 if(state.case==='jib'){const t=target();selectedPoint=new THREE.Vector3(...t.source.slice(0,3));marker(selectedPoint,rx(state.after?t.after_nearest_display:t.model_nearest_mesh,t.jib_pose),colors.jib);$('pointLabel').textContent=`${t.name} · 모델 면까지 ${fmt(state.after?t.after_distance_mesh:t.model_distance_exact_mesh)}m`;$('pointLabel').style.borderColor='#ec84b6';}
}
function table(id,rows){$(id).innerHTML=rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('');}
function updateText(){
 for(const c of ['overview','body','jib']){$(c+'Panel').hidden=state.case!==c;$(c+'Case').classList.toggle('active',state.case===c);}
 $('sceneTitle').textContent=state.view==='whole'?'크레인 전체 · BODY / JIB / TOWER':state.case==='body'?'운전석 주변 · BODY':state.case==='jib'?'지브 하부 골조 · JIB':'선택 부위';
 $('sceneSubtitle').textContent=`로그 ${state.log} · 묶음 ${state.frame} · JIB 모델 ${fmt(pose()+(state.case==='jib'&&state.after?ORIGIN.delta:0))}° · Z축 위 / 단위 m`;
 $('dataInfo').textContent=`${log().file}, 묶음 ${state.frame}. 현장 JSON을 적용한 원본 점과 실제 Models/Y JIB1의 BODY·JIB·TOWER OBJ를 사용합니다. 운전석 범위는 재현 Distance의 cabin 박스입니다. 지브 표시는 길이 약 19m의 하부 골조입니다. 누적 모드만 각 묶음의 기존 지브 자세를 기준으로 정렬합니다.`;
 const e=events[+$('bodyEvent').value];$('fieldDistance').textContent=`${fmt(e.distance,2)} m · BODY`;
 $('bodyDistance').textContent=bodyCandidate?`${fmt(bodyCandidate.distance)} m`:'후보 없음';
 $('bodyStatus').textContent=bodyCandidate?`label ${bodyCandidate.label} · ${[0,1].includes(bodyCandidate.label)?'경보 계산 포함':'예외로 경보 제외'}`:'';
 if(bodyCandidate)table('bodyInfo',[['원본 묶음 (근사 대응)',`로그 ${state.log} / ${state.frame}`],['물체 XYZ',bodyCandidate.point.map(v=>fmt(v,2)).join(', ')],['직선거리',`${fmt(bodyCandidate.lineDistance)} m`],['반경 30cm / 센서 1·2',bodyCandidate.rawNear30cm.join(' / ')+'점']]);
 const t=target();$('targetRegion').textContent=t.region;
 $('distBefore').textContent=fmt(t.model_distance_exact_mesh)+' m';$('distAfter').textContent=fmt(t.after_distance_mesh)+' m';
 $('angleInfo').textContent=`기존 ${fmt(t.jib_pose)}° → 진단 ${fmt(t.jib_pose+ORIGIN.delta)}° (${fmt(ORIGIN.delta)}°). 운영 설정을 바꾼 값이 아닙니다.`;
 table('sourceInfo',[['로그 / 원본 묶음',`4 / ${t.source[6]}`],['센서 / 패킷 / 신호',`${t.source[3]+1} / ${t.source[4]} / ${t.source[5]}`],['수직 채널',t.source[14]],['센서 측정거리',fmt(t.source[10])+' m'],['세계 XYZ',t.source.slice(0,3).map(v=>fmt(v,2)).join(', ')],['지브 길이 방향 위치',fmt(t.local_xyz[1],2)+' m']]);
 $('before').classList.toggle('active',!state.after);$('after').classList.toggle('active',state.after);
 $('whole').classList.toggle('active',state.view==='whole');$('focus').classList.toggle('active',state.view!=='whole');
}
const direction=()=>state.direction==='side'?new THREE.Vector3(1,.001,.05):state.direction==='top'?new THREE.Vector3(.001,-.001,1):new THREE.Vector3(1,-.65,.28).normalize();
function modelBounds(){scene.updateMatrixWorld(true);return new THREE.Box3().setFromObject(modelGroup);}
// Fit every corner of the full model bounds; aspect ratio can be narrow in the inset.
function fit(cam,bounds,dir,padding=1.15){const center=bounds.getCenter(new THREE.Vector3()),corners=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])corners.push(new THREE.Vector3(x,y,z).sub(center));
 const d=dir.clone().normalize(),right=new THREE.Vector3().crossVectors(cam.up,d).normalize(),up=new THREE.Vector3().crossVectors(d,right).normalize(),tan=Math.tan(rad(cam.fov/2));let distance=1;
 for(const v of corners)distance=Math.max(distance,v.dot(d)+padding*Math.max(Math.abs(v.dot(up))/tan,Math.abs(v.dot(right))/(tan*cam.aspect)));
 cam.position.copy(center).addScaledVector(d,distance);cam.lookAt(center);cam.updateMatrixWorld(true);return center;
}
function fitMini(){const el=$('miniCanvas'),w=el.clientWidth||185,h=el.clientHeight||194;miniRenderer.setSize(w,h,false);miniCamera.aspect=w/h;miniCamera.updateProjectionMatrix();fit(miniCamera,modelBounds(),new THREE.Vector3(1,-.65,.18),1.12);}
function viewWhole(){state.view='whole';$('mini').style.display='none';controls.target.copy(fit(camera,modelBounds(),direction(),1.17));controls.update();updateText();}
function focus(tight=false){if(state.case==='overview'){selectCase('body',true);return;}state.view=tight?'point':'region';$('mini').style.display='block';let center,bounds;
 if(tight&&selectedPoint){center=selectedPoint.clone();bounds=new THREE.Box3().setFromCenterAndSize(center,new THREE.Vector3(5.5,5.5,5.5));}
 else if(state.case==='body')bounds=new THREE.Box3(new THREE.Vector3(-8,-10,-4),new THREE.Vector3(5,4,13));
 else {bounds=new THREE.Box3();for(const x of [-2,2])for(const y of [15,23])for(const z of [-2,4])bounds.expandByPoint(rx([x,y,z],pose()));}
 controls.target.copy(fit(camera,bounds,direction(),1.15));controls.update();fitMini();updateText();
}
async function selectCase(c,zoom=false){state.case=c;if(c==='body'){const e=events[+$('bodyEvent').value];state.log=e.log;state.frame=e.frame;}else{state.log=4;state.frame=c==='jib'?target().source[6]:7;}
 const token=++state.sequence;window.locationsReady=false;$('loading').hidden=false;$('loading').textContent='실제 점군을 불러오는 중…';
 try{const d=await getFrame(frame().key);if(token!==state.sequence)return;state.loaded=d;
  bodyCandidate=frame().modes[0].distances.filter(d=>d.part===0).sort((a,b)=>a.distance-b.distance)[0]||null;
  updateModels();buildCloud();drawMarkers();updateText();if(zoom)focus();else viewWhole();fitMini();$('loading').hidden=true;window.locationsReady=true;
 }catch(e){if(token===state.sequence)$('loading').textContent=e.message;console.error(e);}
}
function pointScreen(p){const r=p.clone().project(camera);return {x:(r.x*.5+.5)*$('viewport').clientWidth,y:(-.5*r.y+.5)*$('viewport').clientHeight,visible:r.z>-1&&r.z<1&&Math.abs(r.x)<1&&Math.abs(r.y)<1};}
function layoutLabels(){const v=$('viewport'),w=v.clientWidth,h=v.clientHeight,show=state.view==='whole'&&$('showRegions').checked;
 for(const name of ['body','jib']){const label=$(name+'Label'),line=$(name+'Leader');label.hidden=!show;line.style.display=show?'':'none';if(!show)continue;const p=pointScreen(name==='body'?bodyAnchor:jibAnchor);label.hidden=!p.visible;line.style.display=p.visible?'':'none';
  const lw=label.offsetWidth||210,lh=label.offsetHeight||90;let x=name==='body'?p.x-lw-42:p.x+42,y=name==='body'?p.y+16:p.y-lh-15;x=Math.min(w-lw-12,Math.max(12,x));y=Math.min(h-lh-60,Math.max(105,y));label.style.left=x+'px';label.style.top=y+'px';
  line.setAttribute('x1',p.x);line.setAttribute('y1',p.y);line.setAttribute('x2',name==='body'?x+lw:x);line.setAttribute('y2',y+lh/2);
 }
 const label=$('pointLabel');label.hidden=!selectedPoint||state.view==='whole';if(selectedPoint&&state.view!=='whole'){const p=pointScreen(selectedPoint);label.hidden=!p.visible;if(p.visible){label.style.left=Math.min(w-label.offsetWidth-12,Math.max(12,p.x+15))+'px';label.style.top=Math.min(h-70,Math.max(90,p.y+12))+'px';}}
}
for(const c of ['overview','body','jib'])$(c+'Case').onclick=()=>selectCase(c,c!=='overview');
for(const c of ['body','jib']){for(const suffix of ['Card','Label'])$(c+suffix).onclick=()=>selectCase(c,true);}
$('bodyEvent').onchange=()=>selectCase('body',true);
$('target').onchange=()=>{state.target=+$('target').value;selectCase('jib',true);};
for(const id of ['before','after'])$(id).onclick=()=>{state.after=id==='after';updateModels();drawMarkers();updateText();fitMini();};
$('whole').onclick=viewWhole;$('mini').onclick=viewWhole;$('focus').onclick=()=>focus();$('bodyPointFocus').onclick=()=>focus(true);$('jibPointFocus').onclick=()=>focus(true);
for(const d of ['side','oblique','top'])$(d).onclick=()=>{state.direction=d;if(state.view==='whole')viewWhole();else focus(state.view==='point');};
for(const id of ['sensor1','sensor2','cloudScope','jibCloud'])$(id).onchange=buildCloud;
$('showCloud').onchange=()=>{cloudGroup.visible=$('showCloud').checked;};$('showRegions').onchange=()=>{regionGroup.visible=$('showRegions').checked;};$('ghost').onchange=updateModels;
$('opacity').oninput=()=>modelGroup.traverse(o=>{if(o.isMesh)o.material.opacity=+$('opacity').value;});
function resize(){const v=$('viewport');renderer.setSize(v.clientWidth,v.clientHeight,false);camera.aspect=v.clientWidth/v.clientHeight;camera.updateProjectionMatrix();if(state.loaded){if(state.view==='whole')viewWhole();fitMini();}}
new ResizeObserver(resize).observe($('viewport'));resize();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);if(state.view!=='whole')miniRenderer.render(scene,miniCamera);layoutLabels();}
window.locationsTest={state,scene,camera,miniCamera,controls,modelObjects,cloudGroup,modelGroup,markerGroup,selectCase,viewWhole,focus,modelBounds,get candidate(){return bodyCandidate;},get selectedPoint(){return selectedPoint;}};
animate();selectCase('overview');
