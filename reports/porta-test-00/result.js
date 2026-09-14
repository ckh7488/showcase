/* Only saved samples and the corresponding solver mesh are displayed. */
(async()=>{
 'use strict';
 const $=id=>document.getElementById(id),response=await fetch('data/results.json');
 if(!response.ok)throw Error('계산 자료를 읽지 못했습니다.');
 const data=await response.json(),css=getComputedStyle(document.documentElement),color=n=>css.getPropertyValue('--sc-'+n).trim();
 let mesh='base',index=9,quantity='magnitude',zoom=false;
 const curves=data.curves,refs={base:data.references.find(r=>r.id==='test00-straight-base'),fine:data.references.find(r=>r.id==='test00-straight-fine')};
 const svg=$('response-chart'),NS='http://www.w3.org/2000/svg';
 const add=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
 function chart(){
  svg.replaceChildren();const width=Math.max(320,svg.clientWidth),right=width-16;
  svg.setAttribute('viewBox','0 0 '+width+' 340');
  const key=quantity==='magnitude'?'transmissionMagnitude_dB':'transmissionPhase_deg',unit=quantity==='magnitude'?'dB':'°';
  const values=curves.flatMap(c=>c[key]),lo=Math.min(...values),hi=Math.max(...values),pad=(hi-lo)*.16||.01;
  const xmin=10,xmax=200,ymin=lo-pad,ymax=hi+pad,X=f=>66+(f/1e6-xmin)/(xmax-xmin)*(right-66),Y=v=>280-(v-ymin)/(ymax-ymin)*238;
  for(let j=0;j<5;j++){const v=ymin+(ymax-ymin)*j/4,y=Y(v);add('line',{x1:66,y1:y,x2:right,y2:y,stroke:color('line')});add('text',{x:57,y:y+4,'text-anchor':'end'},v.toFixed(quantity==='magnitude'?3:1));}
  for(const f of[10,50,100,150,200])add('text',{x:X(f*1e6),y:309,'text-anchor':'middle'},f);
  add('text',{x:66,y:23},quantity==='magnitude'?'S21 · 전달 크기 (dB)':'S21 · 전달 위상 (°)');add('text',{x:right,y:333,'text-anchor':'end'},'MHz');
  for(let c=0;c<2;c++){
   const curve=curves[c],selected=(c===0?'base':'fine')===mesh,col=color(c?'phy':'accent');
   // Lines are visual guides between saved points, never new numerical samples.
   add('polyline',{points:curve.frequency_Hz.map((f,i)=>X(f)+','+Y(curve[key][i])).join(' '),fill:'none',stroke:col,'stroke-width':selected?2.5:1.2,'stroke-dasharray':c?'5 4':'none',opacity:selected?1:.7});
   curve.frequency_Hz.forEach((f,i)=>{const x=X(f),y=Y(curve[key][i]),r=i===index?6:3;const dot=c?add('rect',{x:x-r,y:y-r,width:r*2,height:r*2,transform:'rotate(45 '+x+' '+y+')',fill:col}):add('circle',{cx:x,cy:y,r,fill:col});dot.style.cursor='pointer';dot.addEventListener('click',()=>{index=i;$('frequency').value=i;chart();});dot.appendChild(document.createElementNS(NS,'title')).textContent=(f/1e6).toFixed(3)+' MHz / '+curve[key][i].toFixed(6)+' '+unit;});
  }
  const f=curves[0].frequency_Hz[index],a=curves[0][key][index],b=curves[1][key][index];
  $('frequency-value').textContent=(f/1e6).toFixed(3)+' MHz';
  $('point-values').innerHTML='<div><span>기본 격자</span><strong>'+a.toFixed(4)+' '+unit+'</strong></div><div><span>세분화 격자</span><strong>'+b.toFixed(4)+' '+unit+'</strong></div><div><span>두 값의 차이</span><strong>'+Math.abs(b-a).toFixed(4)+' '+unit+'</strong></div>';
 }
 const T=window.THREE,el=$('reference-scene'),renderer=new T.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(color('stage'));el.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.01,1000),controls=new T.OrbitControls(camera,renderer.domElement);
 controls.enableDamping=false;scene.add(new T.AmbientLight(0xffffff,.8));const light=new T.DirectionalLight(0xffffff,.7);light.position.set(20,80,60);scene.add(light);
 let group,gridGroup;
 const vec=(x,y,z)=>new T.Vector3(x,z,-y);
 function render(){renderer.render(scene,camera);}
 function fit(){controls.target.set(0,0,-(zoom?0:6));camera.position.copy(controls.target).add(new T.Vector3(25,55,75).normalize().multiplyScalar((zoom?14:175)/Math.min(camera.aspect,1)));controls.update();render();}
 function build(){
  if(group){scene.remove(group);group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  group=new T.Group();scene.add(group);gridGroup=new T.Group();group.add(gridGroup);
  function box(size,position,col,opacity=1){const m=new T.Mesh(new T.BoxGeometry(...size),new T.MeshLambertMaterial({color:col,transparent:opacity<1,opacity}));m.position.copy(position);group.add(m);}
  box([100,.254,30],vec(0,6,.127),color('phy'),.3);
  box([100,.015,.6],vec(0,0,.265),color('tx'));
  box([100,.012,30],vec(0,6,-.015),color('ground'),.16);
  const m=refs[mesh].mesh,lines=[];
  for(const x of m.x)lines.push(...vec(x/1000,-9,.29).toArray(),...vec(x/1000,21,.29).toArray());
  for(const y of m.y)lines.push(...vec(-50,y/1000,.29).toArray(),...vec(50,y/1000,.29).toArray());
  gridGroup.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lines,3)),new T.LineBasicMaterial({color:color('stage-ink'),transparent:true,opacity:.21})));
  gridGroup.visible=$('grid').checked;
  const c=refs[mesh].input;
  $('mesh-caption').textContent=(mesh==='base'?'기본':'세분화')+' · '+c.cells.toLocaleString()+' 셀 · 최소 XY 간격 '+(c.minCell_um.x/1000).toFixed(4)+' mm. 청록: 신호 선로 / 아래 면: 기준 도체.';
  for(const k of['base','fine'])$('mesh-'+k).setAttribute('aria-pressed',String(k===mesh));
  fit();chart();
 }
 for(const k of['base','fine'])$('mesh-'+k).onclick=()=>{mesh=k;build();};
 $('quantity').onchange=()=>{quantity=$('quantity').value;chart();};
 $('frequency').oninput=()=>{index=+$('frequency').value;chart();};
 $('grid').onchange=()=>{gridGroup.visible=$('grid').checked;render();};
 $('overview').onclick=()=>{zoom=false;fit();};$('closeup').onclick=()=>{zoom=true;fit();};
 controls.addEventListener('change',render);
 new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}).observe(el);
 new ResizeObserver(chart).observe(svg);
 el.addEventListener('keydown',e=>{if(e.key==='Home'){zoom=false;fit();e.preventDefault();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.15;else if(e.key==='ArrowRight')s.theta+=.15;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.15);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.15);else if(e.key==='+'||e.key==='=')s.radius*=.85;else if(e.key==='-')s.radius/= .85;else return;camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();render();e.preventDefault();});
 for(const r of data.references){const p=document.createElement('p'),name=r.input.shape==='notch'?'스텁 예제':r.id.endsWith('fine')?'균일 선로 · 세분화':'균일 선로 · 기본';p.innerHTML='<strong>'+name+'</strong> · 마지막 에너지 '+r.termination.lastReportedEnergy_dB+' dB · <a href="records/'+r.id+'/geometry.xml">모델</a> · <a href="records/'+r.id+'/solver.log">계산 로그</a> · <a href="records/'+r.id+'/reference-aligned.npz">기준면 정렬 응답</a>';$('evidence-links').append(p);}
 build();window.__test00={ready:true,data,snapshot:()=>({mesh,index,quantity,gridVisible:gridGroup.visible,camera:camera.position.toArray(),cells:refs[mesh].input.cells})};
})().catch(e=>{const el=document.getElementById('load-error');el.hidden=false;el.textContent='자료 표시를 완료하지 못했습니다: '+e.message;console.error(e);});
