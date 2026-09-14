/* Saved probe DFTs linked to the actual solver's model; no fresh solve. */
(async()=>{
 'use strict';const $=id=>document.getElementById(id),base='records/connected-10/',r=await fetch(base+'manifest.json',{cache:'no-store'});if(!r.ok)throw Error('결과 자료 없음');const data=await r.json();if(!data.cases.length)return;
 const caseIndex=id=>data.cases.findIndex(c=>c.id===id),sameFine=caseIndex('test01-same-fine'),mixedFine=caseIndex('test01-mixed-fine');
 let active=sameFine,windowKey='12',mode='diff',channel=1,index=90,other=String(mixedFine),model,modelId='',gridData,root,shield,mesh,markers=[],ticket=0;
 const css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue('--sc-'+n).trim(),colors=['accent','focus','phy','ground'].map(col),names=['입력 쪽 · 쌍 1','입력 쪽 · 쌍 2','반대쪽 · 쌍 1','반대쪽 · 쌍 2'];
 const name=c=>(c.id.includes('-same-')?'현재 배선':'비교 배선')+' · '+(c.id.endsWith('-fine')?'세분화':'기본')+' 격자';
 const record=()=>data.cases[active],key=ch=>(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':'');
 const val=(c,w,ch,k)=>{const z=c.windows[w][key(ch)],p=ch%2;return Math.hypot(z.real[p][k],z.imag[p][k]);};
 const current=()=>val(record(),windowKey,channel,index);
 const NS='http://www.w3.org/2000/svg',svg=$('coupling-chart');
 function add(tag,attrs,text){const el=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;svg.append(el);return el;}
 function choices(){
  for(const [id,blank]of[['case-select',false],['compare-select',true]]){
   const select=$(id);select.replaceChildren();if(blank)select.append(new Option('겹쳐 비교 안 함',''));
   data.cases.forEach((c,i)=>{if(blank&&i===active)return;const o=new Option(name(c),String(i));if(blank&&!c.windows[windowKey])o.disabled=true;select.append(o);});
  }
  $('case-select').value=active;$('case-select').disabled=data.cases.length<2;$('compare-select').value=other;$('compare-select').disabled=data.cases.length<2;
  $('window-select').replaceChildren();for(const w of Object.keys(record().windows))$('window-select').append(new Option('처음 '+w+' ns',w));
  if(!record().windows[windowKey])windowKey=Object.keys(record().windows).at(-1);$('window-select').value=windowKey;
 }
 function chart(){
  if(!record().windows[windowKey])return;
  svg.replaceChildren();const width=Math.max(320,svg.clientWidth),right=width-15;svg.setAttribute('viewBox','0 0 '+width+' 300');
  const series=other!==''?[{c:record(),ch:channel,label:name(record()),color:colors[channel]},{c:data.cases[+other],ch:channel,label:name(data.cases[+other]),color:col('ink'),dash:true}]:names.map((label,ch)=>({c:record(),ch,label,color:colors[ch]}));
  const max=Math.max(...series.flatMap(s=>s.c.frequency_Hz.map((_,i)=>val(s.c,windowKey,s.ch,i)*1000)))*1.12;
  const X=f=>55+(f/1e6-10)/190*(right-55),Y=v=>250-v/max*215;
  for(let j=0;j<5;j++){const v=max*j/4,y=Y(v);add('line',{x1:55,y1:y,x2:right,y2:y,stroke:col('line')});add('text',{x:47,y:y+4,'text-anchor':'end'},v.toFixed(max>10?0:1));}
  for(const f of[10,50,100,150,200])add('text',{x:X(f*1e6),y:274,'text-anchor':'middle'},f);
  add('text',{x:55,y:19},'mV / 입력 1 V');add('text',{x:right,y:296,'text-anchor':'end'},'MHz');
  for(const s of series){
   const points=s.c.frequency_Hz.map((f,i)=>[X(f),Y(val(s.c,windowKey,s.ch,i)*1000)]);
   add('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:s.color,'stroke-width':other!==''||s.ch===channel?2.5:1.2,'stroke-dasharray':s.dash?'6 4':'none',opacity:other!==''||s.ch===channel?1:.55});
   const dot=points[index];add('circle',{cx:dot[0],cy:dot[1],r:4,fill:s.color});
  }
  svg.onclick=e=>{const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)*width/rect.width;index=Math.max(0,Math.min(190,Math.round((x-55)/(right-55)*190)));$('frequency').value=index;update();};
  $('chart-key').textContent=other!==''?'실선: '+name(record())+' / 점선: '+name(data.cases[+other])+' · '+names[channel]:'네 관측점의 저장 응답 · 굵은 선이 선택한 관측점';
 }
 function update(){
  const c=record(),f=c.frequency_Hz[index];$('frequency-value').textContent=(f/1e6).toFixed(0)+' MHz';
  $('coupling-value').textContent=(current()*1000).toFixed(3)+' mV';
  $('selected-probe').textContent=names[channel]+' · '+(mode==='diff'?'두 선 사이 전압':'두 선의 평균 전압');
  $('coupling-units').textContent='해당 주파수의 실제 입력 전압으로 나눈 비율 · 입력 잡음 1 V당';
  const comparison=$('comparison-value');comparison.hidden=other==='';
  if(other!==''){const value=val(data.cases[+other],windowKey,channel,index);comparison.textContent=name(data.cases[+other])+': '+(value*1000).toFixed(3)+' mV · 선택 조건의 '+(value/current()).toFixed(2)+'배';}
  const judgment=$('channel-judgment');judgment.hidden=mode!=='diff'||channel!==3;judgment.textContent='이 관측점의 배선 효과는 격자에 따라 달라집니다. 배선 우열은 불명으로 남깁니다.';
  $('channel-buttons').replaceChildren();
  names.forEach((n,ch)=>{const b=document.createElement('button');b.setAttribute('aria-pressed',String(ch===channel));b.style.setProperty('--channel-color',colors[ch]);b.textContent=n+' · '+(val(c,windowKey,ch,index)*1000).toFixed(2)+' mV';b.onclick=()=>{channel=ch;update();highlight();};$('channel-buttons').append(b);});
  const timeValues=Object.keys(c.windows).map(w=>w+' ns: '+(val(c,w,channel,index)*1000).toFixed(3)+' mV');
  $('time-values').textContent=names[channel]+' / '+(f/1e6).toFixed(0)+' MHz — '+timeValues.join(' → ');
  $('energy-record').textContent='입력 펄스 종료 '+c.sourceEnd_ns.toFixed(2)+' ns · 전체 기록 '+c.recordEnd_ns.toFixed(2)+' ns · 마지막 에너지 '+c.lastReportedEnergy_dB.toFixed(2)+' dB. '+(c.energyCriterionMet?'설정한 에너지 종료 기준 충족.':'설정한 에너지 목표에는 미달했으며, 출력의 시간 비교와 별도로 기록합니다.');
  $('case-file').href=base+c.id+'/analysis.json';$('case-csv').href=base+c.id+'/transfer.csv';
  $('case-checks').textContent=c.numericalVerification.independentScalarOutputs+'개 출력 값을 원본 파형에서 별도로 재계산해 대조했습니다. 완료 기록 '+data.cases.length+'/'+data.expectedCases.length+'개.';
  $('mode-diff').setAttribute('aria-pressed',String(mode==='diff'));$('mode-common').setAttribute('aria-pressed',String(mode==='common'));
  chart();
 }
 const T=window.THREE,el=$('coupling-scene'),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(col('stage'));el.append(renderer.domElement);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(40,1,.05,1000),controls=new T.OrbitControls(camera,renderer.domElement);
 scene.add(new T.AmbientLight(0xffffff,.8));const light=new T.DirectionalLight(0xffffff,.8);light.position.set(20,60,70);scene.add(light);
 const vector=p=>new T.Vector3(p[0]*.4,p[2]-20,-p[1]);
 function render(){renderer.render(scene,camera);}
 function fit(point=null){controls.target.copy(point||new T.Vector3(0,-5,0));camera.position.copy(controls.target).add(new T.Vector3(50,65,85).normalize().multiplyScalar((point?27:140)/Math.min(camera.aspect||1,1)));controls.update();render();}
 function segment(a,b,radius,color,opacity=1){const v=vector(a),w=vector(b),delta=w.clone().sub(v),o=new T.Mesh(new T.CylinderGeometry(radius,radius,delta.length(),7),new T.MeshLambertMaterial({color,transparent:opacity<1,opacity}));o.position.copy(v.add(w).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());root.add(o);return o;}
 function highlight(){
  for(const m of markers){const selected=m.ch===channel;m.o.material.color.set(selected?col('focus'):col('stage-ink'));m.o.scale.setScalar(selected?1.5:.8);}
  $('geometry-caption').textContent=name(record())+' · 단면 격자 '+model.input.minCell_mm.y.toFixed(2)+' mm · 선택: '+names[channel]+' · 8선 모두 포함 · 길이 방향 0.4배 표시. 색은 선 구분이며 전자기장 분포가 아닙니다.';
  render();
 }
 async function build(){
  const run=record(),id=++ticket,[nextModel,nextGrid]=await Promise.all(['model.json','mesh.json'].map(file=>fetch(base+run.id+'/'+file).then(r=>r.json())));if(id!==ticket)return;model=nextModel;gridData=nextGrid;
  if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  root=new T.Group();scene.add(root);markers=[];
  for(const w of model.wires){const color=w.group==='plus'?col('focus'):w.group==='zero'?col('ground'):w.pair===0?col('tx'):col('rx');for(let n=1;n<w.points.length;n++)segment(w.points[n-1],w.points[n],model.input.copperRadius_mm,color);}
  const L=model.input.length_mm,H=model.input.height_mm,R=model.input.shield.radius_mm;
  shield=segment([-L/2,0,H],[L/2,0,H],R,col('stage-ink'),.1);shield.visible=$('show-result-shield').checked;
  const a=vector(model.referencePlate.start),b=vector(model.referencePlate.stop),size=b.clone().sub(a);
  const plate=new T.Mesh(new T.BoxGeometry(Math.abs(size.x),.1,Math.abs(size.z)),new T.MeshLambertMaterial({color:col('phy'),transparent:true,opacity:.5}));plate.position.copy(a.add(b).multiplyScalar(.5));root.add(plate);
  model.ports.forEach(p=>{const point=vector(p.start).add(vector(p.stop)).multiplyScalar(.5);if(p.role==='ethernet'){const o=new T.Mesh(new T.SphereGeometry(.55,12,8),new T.MeshBasicMaterial({color:col('stage-ink')}));o.position.copy(point);root.add(o);markers.push({o,ch:(p.end==='far'?2:0)+p.pair,point});}else if(p.excite){const o=new T.Mesh(new T.SphereGeometry(.75,12,8),new T.MeshBasicMaterial({color:col('stage-ink')}));o.position.copy(point);root.add(o);}});
  const vertices=[];for(const y of gridData.y.filter(y=>y>=-7.2&&y<=7.2))vertices.push(...vector([0,y,16]).toArray(),...vector([0,y,28]).toArray());for(const z of gridData.z.filter(z=>z>=16&&z<=28))vertices.push(...vector([0,-7.2,z]).toArray(),...vector([0,7.2,z]).toArray());
  mesh=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),new T.LineBasicMaterial({color:col('stage-ink'),transparent:true,opacity:.3}));mesh.visible=$('show-result-mesh').checked;root.add(mesh);modelId=run.id;highlight();fit();
 }
 $('case-select').onchange=async()=>{active=+$('case-select').value;other='';choices();update();await build();};
 $('compare-select').onchange=()=>{other=$('compare-select').value;update();};
 $('window-select').onchange=()=>{windowKey=$('window-select').value;if(other!==''&&!data.cases[+other].windows[windowKey])other='';choices();update();};
 for(const m of ['diff','common'])$('show-'+m+'-finding').onclick=async()=>{active=sameFine;other=String(mixedFine);windowKey='12';mode=m;channel=1;index=90;$('frequency').value=index;choices();update();await build();$('comparison').scrollIntoView({block:'start'});};
 $('show-mesh-finding').onclick=async()=>{active=data.cases.findIndex(c=>c.id==='test01-same-coarse');other=String(data.cases.findIndex(c=>c.id==='test01-same-fine'));windowKey='12';mode='diff';channel=1;index=190;$('frequency').value=index;$('show-result-mesh').checked=true;choices();update();await build();$('comparison').scrollIntoView({block:'start'});};
 $('show-mixed-mesh').onclick=async()=>{active=caseIndex('test01-mixed-coarse');other=String(mixedFine);windowKey='12';mode='diff';channel=1;index=190;$('frequency').value=index;$('show-result-mesh').checked=true;choices();update();await build();$('comparison').scrollIntoView({block:'start'});};
 $('frequency').oninput=()=>{index=+$('frequency').value;update();};
 for(const m of['diff','common'])$('mode-'+m).onclick=()=>{mode=m;update();highlight();};
 $('probe-closeup').onclick=()=>fit(markers.find(m=>m.ch===channel)?.point);$('model-overview').onclick=()=>fit();
 $('show-result-shield').onchange=()=>{shield.visible=$('show-result-shield').checked;render();};$('show-result-mesh').onchange=()=>{mesh.visible=$('show-result-mesh').checked;render();};
 controls.addEventListener('change',render);window.addEventListener('scroll',()=>requestAnimationFrame(render),{passive:true});new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))requestAnimationFrame(render);}).observe(el);new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}).observe(el);new ResizeObserver(chart).observe(svg);
 el.addEventListener('keydown',e=>{if(e.key==='Home'){fit();e.preventDefault();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.15;else if(e.key==='ArrowRight')s.theta+=.15;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.15);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.15);else if(['+','='].includes(e.key))s.radius*=.85;else if(e.key==='-')s.radius/=.85;else return;camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();render();e.preventDefault();});
 choices();update();await build();$('coupling-error').hidden=true;window.__coupling={ready:true,data,snapshot:()=>({active,windowKey,mode,channel,index,other,value:current(),comparisonValue:other===''?null:val(data.cases[+other],windowKey,channel,index),modelId,wireCount:model.wires.length,camera:camera.position.toArray(),target:controls.target.toArray(),quaternion:camera.quaternion.toArray(),aspect:camera.aspect,gridVisible:mesh.visible,shieldVisible:shield.visible})};
})().catch(e=>{const el=document.getElementById('coupling-error');el.hidden=false;el.textContent='저장 결과 표시 오류: '+e.message;console.error(e);});
