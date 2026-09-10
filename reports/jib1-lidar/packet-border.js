'use strict';
const $=id=>document.getElementById(id), rad=a=>a*Math.PI/180;
const unpack=(s,T=Float32Array)=>{const a=s instanceof Uint8Array?s:pako.inflate(Uint8Array.from(atob(s),c=>c.charCodeAt(0)));return new T(a.buffer,a.byteOffset,a.byteLength/T.BYTES_PER_ELEMENT);};
const state={caseId:'core-log4',frame:7,accum:1,view:'whole',token:0,ready:false,frameData:[]};
const cache=new Map(),pending=new Map();let syncing=false;
const views=[0,1,2].map(i=>{
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x080e16);
 const camera=new THREE.PerspectiveCamera(40,1,.03,1500);camera.up.set(0,0,1);
 const renderer=new THREE.WebGLRenderer({canvas:$('view'+i),antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 const controls=new THREE.OrbitControls(camera,renderer.domElement);controls.screenSpacePanning=true;controls.minDistance=.5;controls.maxDistance=600;
 const model=new THREE.Group(),cloud=new THREE.Group();scene.add(model,cloud);
 const parts=MODELS.map((m,j)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(unpack(m.vertices),3));g.setIndex(new THREE.BufferAttribute(unpack(m.indices,Uint32Array),1));
  const group=new THREE.Group();group.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:0x8fa9ba,transparent:true,opacity:.055,side:THREE.DoubleSide,depthWrite:false})),new THREE.LineSegments(new THREE.EdgesGeometry(g,32),new THREE.LineBasicMaterial({color:0x8fa9ba,transparent:true,opacity:.34,depthWrite:false})));model.add(group);return group;});model.visible=false;
 return {scene,camera,renderer,controls,model,cloud,parts};
});
views.forEach(v=>v.controls.addEventListener('change',()=>{if(syncing)return;syncing=true;for(const other of views){if(other===v)continue;other.camera.position.copy(v.camera.position);other.camera.quaternion.copy(v.camera.quaternion);other.camera.zoom=v.camera.zoom;other.controls.target.copy(v.controls.target);other.camera.updateProjectionMatrix();other.controls.update();}syncing=false;}));
function resize(){for(const v of views){const c=v.renderer.domElement,w=c.clientWidth,h=c.clientHeight;v.renderer.setSize(w,h,false);v.camera.aspect=w/h;v.camera.updateProjectionMatrix();}}
new ResizeObserver(resize).observe(document.querySelector('.panels'));
function setView(name){state.view=name;let target,dist;const angle=state.frameData.at(-1)?.pose[1]??55;
 if(name==='whole'){
  const subject=$('model').checked?views[0].model:views[0].cloud;subject.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(subject);if(box.isEmpty())box=new THREE.Box3().setFromObject(views[0].model);
  const size=box.getSize(new THREE.Vector3());target=box.getCenter(new THREE.Vector3());
  const d=new THREE.Vector3(1,-.60,.23).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,0,1),d).normalize(),up=new THREE.Vector3().crossVectors(d,right).normalize();
  const span=v=>(Math.abs(v.x)*size.x+Math.abs(v.y)*size.y+Math.abs(v.z)*size.z)/2;
  dist=(Math.max(span(up)/Math.tan(rad(20)),span(right)/(Math.tan(rad(20))*views[0].camera.aspect))+span(d))*1.10;
 }else if(name==='cabin'){target=new THREE.Vector3(1.6,-.3,.2);dist=15;}
 else if(name==='jib'){const a=rad(angle);target=new THREE.Vector3(0,18*Math.cos(a)-Math.sin(a),18*Math.sin(a)+Math.cos(a));dist=27;}
 else{target=new THREE.Vector3(0,0,-13);dist=42;}
 const dir=new THREE.Vector3(1,-.60,.23).normalize();syncing=true;for(const v of views){v.controls.target.copy(target);v.camera.position.copy(target).addScaledVector(dir,dist);v.controls.update();}syncing=false;
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===name));
}
function inCrane(x,y,z,angle){
 const body=Math.abs(x)<5&&y>-10&&y<4&&z>-4&&z<14,tower=Math.abs(x)<4&&y>-4&&y<4&&z>-46&&z<-3;
 const a=rad(angle),jy=y*Math.cos(a)+z*Math.sin(a),jz=-y*Math.sin(a)+z*Math.cos(a);
 return body||tower||(Math.abs(x)<4&&jy>2&&jy<59&&jz>-4&&jz<6);
}
function clearCloud(v){while(v.cloud.children.length){const q=v.cloud.children.pop();q.parent=null;q.geometry.dispose();q.material.dispose();}}
function build(){if(!state.frameData.length)return;const counts=[],stage=$('stage').value,all=$('background').checked;
 for(let i=0;i<3;i++){const v=views[i];clearCloud(v);v.parts[1].rotation.x=rad(state.frameData.at(-1).pose[1]);v.model.visible=$('model').checked;let count=0,total=0;
  for(let s=0;s<2;s++){if(!$('sensor'+s).checked)continue;const out=[];
   for(const data of state.frameData){const p=unpack(data.variants[i][stage+s]);total+=p.length/3;
    for(let k=0;k<p.length;k+=3)if(all||inCrane(p[k],p[k+1],p[k+2],data.pose[1]))out.push(p[k],p[k+1],p[k+2]);
   }
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(out),3));v.cloud.add(new THREE.Points(g,new THREE.PointsMaterial({color:s?0x63ddbd:0xff947e,size:+$('pointSize').value,sizeAttenuation:false,transparent:false})));count+=out.length/3;
  }
  counts.push(count);$('status'+i).textContent=(all?'전체 반환 영역':'크레인 주변 공통 범위')+' · '+(stage==='xyz'?'기존 XYZ 필터 적용 후':'최소 거리·공간 필터 전');
 }
 for(let i=0;i<3;i++)$('count'+i).innerHTML=counts[i].toLocaleString()+'점'+(i&&counts[0]?'<small>원래의 '+(counts[i]/counts[0]*100).toFixed(1)+'%</small>':'');
 const frames=state.frameData.map(x=>x.frame);$('message').textContent=`묶음 ${frames[0]}${frames.length>1?'~'+frames.at(-1):''} · 세 화면에 동일 구간 · C는 A보다 ${counts[0]?((1-counts[2]/counts[0])*100).toFixed(1):'0'}% 적은 점`;
 $('stageNote').textContent=stage==='xyz'?'기존 최소 거리·공간 필터까지 적용한 실제 XYZ 출력입니다. 모델은 기본적으로 숨겨 점군 자체가 얼마나 남는지 보여 줍니다.':'점 삭제 후 native 좌표 변환만 한 결과입니다. 기존 최소 거리 필터 전이므로 5m 미만 반환점도 포함됩니다. 외곽 삭제 효과를 보간 없이 보여 줍니다.';
 state.ready=true;window.borderReady={caseId:state.caseId,frame:state.frame,frames,stage,counts,all,sensors:[0,1].filter(s=>$('sensor'+s).checked),model:$('model').checked};
}
window.registerBorderFrame=(key,data)=>{cache.set(key,data);if(pending.has(key)){pending.get(key).resolve(data);pending.delete(key);}};
function getFrame(fi){
 const key=state.caseId+'-'+fi;if(cache.has(key))return Promise.resolve(cache.get(key));
 if(pending.has(key))return pending.get(key).promise;
 let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});pending.set(key,{promise,resolve,reject});
 loadPackedFrame('data/packet-border/'+state.caseId+'-f'+fi+'.bin')
 .then(data=>window.registerBorderFrame(key,data)).catch(error=>{pending.delete(key);reject(error);});
 return promise;
}
async function load(){const token=++state.token;state.ready=false;window.borderReady=null;$('frameNo').textContent=state.frame+' / 29';$('message').textContent='실제 점군을 불러오는 중…';
 try{const indices=Array.from({length:Math.min(state.accum,state.frame+1)},(_,j)=>state.frame-Math.min(state.accum,state.frame+1)+1+j);const list=await Promise.all(indices.map(getFrame));if(token!==state.token)return;
  state.frameData=list;build();if(!window.borderInitialized){setView('whole');window.borderInitialized=true;}
  const keep=new Set(indices.map(i=>state.caseId+'-'+i));for(const key of cache.keys())if(!keep.has(key))cache.delete(key);
 }catch(e){if(token===state.token)$('message').textContent=e.message;console.error(e);}
}
$('case').onchange=()=>{state.caseId=$('case').value;load();};$('frame').onchange=()=>{state.frame=+$('frame').value;load();};$('frame').oninput=()=>$('frameNo').textContent=$('frame').value+' / 29';$('accum').onchange=()=>{state.accum=+$('accum').value;load();};
for(const id of ['stage','sensor0','sensor1','background'])$(id).onchange=build;
$('model').onchange=()=>{build();if(state.view==='whole')setView('whole');};
$('pointSize').oninput=()=>{for(const v of views)for(const p of v.cloud.children)p.material.size=+$('pointSize').value;};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
window.borderTest={views,state,setView,load,inCrane};resize();load();function tick(){requestAnimationFrame(tick);for(const v of views)v.renderer.render(v.scene,v.camera);}tick();
