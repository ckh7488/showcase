/* Saved probe DFTs linked to the actual solver's model; no fresh solve. */
(async()=>{
 'use strict';const $=id=>document.getElementById(id);const [shieldData,shieldDrive,timeData,meshData,meshDrive]=await Promise.all(['records/common-14/manifest.json','records/common-14/drive-reference.json','records/time-18/time-review.json','records/mesh-20/manifest.json','records/mesh-20/drive-reference.json'].map(async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error('결과 자료 없음');return r.json();}));let data=shieldData,driveData=shieldDrive,base='records/common-14/',reviewMode='shield';if(!data.cases.length)return;
 let active=Math.max(0,data.cases.findIndex(c=>c.input.shieldBondCase==='both')),windowKey='12',mode='common',channel=1,index=90,other=data.cases.length>1?'0':'',reference='loaded',model,modelId='',gridData,root,shield,mesh,markers=[],sourceMarkers=[],bondMeshes=[],ticket=0,inputMode='common';
 const css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue('--sc-'+n).trim(),colors=['accent','focus','phy','ground'].map(col),names=['입력 쪽 · 쌍 1','입력 쪽 · 쌍 2','반대쪽 · 쌍 1','반대쪽 · 쌍 2'];
 const name=c=>({floating:'양끝 미접속',near:'입력 쪽 접속',both:'양쪽 접속'}[c.input.shieldBondCase])+(reviewMode==='mesh'?' · '+c.input.minCell_mm.y.toFixed(2)+' mm':'');
 const scale=()=>mode==='common'?1:1000,unit=()=>mode==='common'?'V':'mV',formatted=(v,n=3)=>(v*scale()).toFixed(n)+' '+unit();
 const record=()=>data.cases[active],key=ch=>(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':'');
 const factor=(c,w,k)=>{const z=driveData.cases[c.id].windows[w].VinOverDrive;return reference==='loaded'?1:Math.hypot(z.real[k],z.imag[k]);};
 const referenceName=()=>reference==='loaded'?'실제 평균 입력':'잡음원 환산 전압';
 const val=(c,w,ch,k)=>{const z=c.windows[w][key(ch)],p=ch%2;return Math.hypot(z.real[p][k],z.imag[p][k])*factor(c,w,k);};
 const current=()=>val(record(),windowKey,channel,index);
 const inputAbs=k=>{const z=record().windows[windowKey][k];return Math.hypot(z.real[index],z.imag[index]);};
 const syncTimeHash=()=>{for(const id of['long-time-review','mesh-review'])if(location.hash==='#'+id)$(id).open=true;};window.addEventListener('hashchange',syncTimeHash);syncTimeHash();
 function timeReadout(){
  $('time-selection').textContent='입력 쪽만 접속 · 기본 격자 0.20 mm · '+names[channel]+' · '+(record().frequency_Hz[index]/1e6).toFixed(0)+' MHz · '+referenceName()+' 1 V당';
  const body=$('time-values-table').querySelector('tbody');body.replaceChildren();
  for(const [ns,w]of Object.entries(timeData.windows)){
   const values=reference==='loaded'?w:w.drive,p=channel%2,suffix=channel<2?'Near':'';
   const cm=values['Hcommon'+suffix],dm=values['Hdiff'+suffix],tr=document.createElement('tr');
   for(const value of[ns+' ns',Math.hypot(cm.real[p][index],cm.imag[p][index]).toFixed(3)+' V',(1000*Math.hypot(dm.real[p][index],dm.imag[p][index])).toFixed(3)+' mV']){const td=document.createElement('td');td.textContent=value;tr.append(td);}
   body.append(tr);
  }
 }
 function meshReadout(){
  $('mesh-selection').textContent='미접속·한쪽 접속 · '+windowKey+' ns · '+names[channel]+' · '+(record().frequency_Hz[index]/1e6).toFixed(0)+' MHz · '+referenceName()+' 1 V당';
  const body=$('mesh-values-table').querySelector('tbody');body.replaceChildren();
  for(const c of meshData.cases){
   const w=reference==='loaded'?c.windows[windowKey]:meshDrive.cases[c.id].windows[windowKey],p=channel%2,suffix=channel<2?'Near':'',cm=w['Hcommon'+suffix],dm=w['Hdiff'+suffix],tr=document.createElement('tr');
   for(const value of[(c.input.shieldBondCase==='near'?'한쪽':'미접속')+' · '+c.input.minCell_mm.y.toFixed(2)+' mm',Math.hypot(cm.real[p][index],cm.imag[p][index]).toFixed(3)+' V',(1000*Math.hypot(dm.real[p][index],dm.imag[p][index])).toFixed(3)+' mV']){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);
  }
 }
 function inputReadout(){
  const c=record(),w=c.windows[windowKey],d=c.inputDiagnostics;
  $('input-peak').textContent=(d.peakCommonInput_V*1000).toFixed(3)+' mV';
  $('input-residual').textContent=(inputAbs('inputDM_over_CM')*100).toFixed(3)+'%';
  $('input-bus-residual').textContent=(inputAbs('inputBusDM_over_CM')*100).toFixed(3)+'%';
  $('input-source-points').textContent=(c.frequency_Hz[index]/1e6).toFixed(0)+' MHz · 입력 + 묶음 / 평균: '+inputAbs('sourcePort7_over_CM').toFixed(4)+' V/V · 입력 0 V 묶음 / 평균: '+inputAbs('sourcePort8_over_CM').toFixed(4)+' V/V';
  $('input-spectrum').textContent='해당 기록의 실제 평균 입력 푸리에 성분 크기: '+inputAbs('Vin').toExponential(4)+' V·s. 이 입력으로 출력의 전달비를 계산합니다.';
  $('input-verified').textContent=d.independentScalarOutputs+'개 입력 값을 원본 파형에서 별도로 재계산해 대조했습니다.';
  const currents=w.HshieldCurrent,labels=c.input.shieldBonds.map((b,i)=>(b.end==='near'?'입력 쪽':'반대쪽')+' 스트랩: '+(Math.hypot(currents.real[i][index],currents.imag[i][index])*1000*factor(c,windowKey,index)).toFixed(3)+' mA / '+referenceName()+' 1 V');
  $('bond-values').textContent=labels.length?labels.join(' · '):'실드 존재 · 접속 스트랩 없음';
  inputChart();
 }
 function inputChart(){
  const plot=$('input-chart'),d=record().inputDiagnostics,points=d.time_ns.flatMap((t,i)=>t<=+windowKey?[[t,inputMode==='common'?d.Vcm_V[i]:d.V7_V[i]-d.V8_V[i]]]:[]);
  const peak=Math.max(...points.map(p=>Math.abs(p[1]))),factor=peak<.001?1e6:1000,units=factor===1e6?'µV':'mV',limit=Math.max(peak*factor*1.15,1e-9);
  const X=t=>65+t/(+windowKey)*555,Y=v=>110-v*factor/limit*75;
  plot.replaceChildren();const add=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;plot.append(e);};
  for(const n of[-1,0,1]){const y=110-n*75;add('line',{x1:65,y1:y,x2:620,y2:y,stroke:col('line')});add('text',{x:55,y:y+4,'text-anchor':'end'},(n*limit).toFixed(1));}
  for(const t of[0,4,8,10,12].filter(t=>t<=+windowKey))add('text',{x:X(t),y:212,'text-anchor':'middle'},t);
  add('polyline',{points:points.map(([t,v])=>X(t)+','+Y(v)).join(' '),fill:'none',stroke:col('accent'),'stroke-width':1.8});
  add('text',{x:65,y:18},(inputMode==='common'?'실제 평균 입력':'두 입력원의 실제 차이')+' · '+units);add('text',{x:620,y:228,'text-anchor':'end'},'ns');
  for(const m of['common','diff'])$('input-'+m).setAttribute('aria-pressed',String(inputMode===m));
 }
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
  const max=Math.max(...series.flatMap(s=>s.c.frequency_Hz.map((_,i)=>val(s.c,windowKey,s.ch,i)*scale())))*1.12;
  const X=f=>55+(f/1e6-10)/190*(right-55),Y=v=>250-v/max*215;
  for(let j=0;j<5;j++){const v=max*j/4,y=Y(v);add('line',{x1:55,y1:y,x2:right,y2:y,stroke:col('line')});add('text',{x:47,y:y+4,'text-anchor':'end'},v.toFixed(max>10?0:max>1?1:3));}
  for(const f of[10,50,100,150,200])add('text',{x:X(f*1e6),y:274,'text-anchor':'middle'},f);
  add('text',{x:55,y:19},unit()+' / '+referenceName()+' 1 V');add('text',{x:right,y:296,'text-anchor':'end'},'MHz');
  for(const s of series){
   const points=s.c.frequency_Hz.map((f,i)=>[X(f),Y(val(s.c,windowKey,s.ch,i)*scale())]);
   add('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:s.color,'stroke-width':other!==''||s.ch===channel?2.5:1.2,'stroke-dasharray':s.dash?'6 4':'none',opacity:other!==''||s.ch===channel?1:.55});
   const dot=points[index];add('circle',{cx:dot[0],cy:dot[1],r:4,fill:s.color});
  }
  svg.onclick=e=>{const rect=svg.getBoundingClientRect(),x=(e.clientX-rect.left)*width/rect.width;index=Math.max(0,Math.min(190,Math.round((x-55)/(right-55)*190)));$('frequency').value=index;update();};
  $('chart-key').textContent=other!==''?'실선: '+name(record())+' / 점선: '+name(data.cases[+other])+' · '+names[channel]:'네 관측점의 저장 응답 · 굵은 선이 선택한 관측점';
 }
 function update(){
  const c=record(),f=c.frequency_Hz[index];$('frequency-value').textContent=(f/1e6).toFixed(0)+' MHz';
  $('coupling-value').textContent=formatted(current());
  $('selected-probe').textContent=names[channel]+' · '+(mode==='diff'?'두 선 사이 전압':'두 선의 평균 전압');
  $('coupling-units').textContent='해당 주파수의 '+referenceName()+' 1 V당';
  $('reference-note').textContent=reference==='loaded'?'실제 전원 묶음의 평균 전압을 1 V로 맞춘 전달비입니다. 이 전압이 작은 주파수에서는 비율이 커질 수 있습니다.':'두 50 Ω 잡음원의 환산 전압을 1 V로 맞췄습니다. 같은 잡음원 세기에서 조건별 출력이 얼마나 달라지는지 봅니다.';
  const comparison=$('comparison-value');comparison.hidden=other==='';
  if(other!==''){const value=val(data.cases[+other],windowKey,channel,index);comparison.textContent=name(data.cases[+other])+': '+formatted(value)+' · 선택 조건의 '+(value/current()).toFixed(2)+'배';}
  const judgment=$('channel-judgment');judgment.hidden=false;judgment.textContent=reviewMode==='mesh'?'두 격자 모두 100 MHz에서 한쪽 접속의 평균 전압 감소·차동 증가가 유지됐습니다. 작은 차이나 세부 봉우리의 우열은 채택하지 않았습니다.':f>150e6?'전달비의 큰 봉우리와 실제 출력 증가는 구분합니다. 입력 기준을 바꿔 비교할 수 있으며, 기본 격자의 긴 관측 비교는 아래에 있습니다.':mode==='diff'?'기본 격자에서는 100 MHz의 세 관측 시간 모두 두 접속 조건의 차동 출력이 미접속보다 큽니다.':'기본 격자에서는 100 MHz의 세 관측 시간 모두 두 접속 조건의 평균 전압이 미접속보다 작습니다.';
  $('channel-buttons').replaceChildren();
  names.forEach((n,ch)=>{const b=document.createElement('button');b.setAttribute('aria-pressed',String(ch===channel));b.style.setProperty('--channel-color',colors[ch]);b.textContent=n+' · '+formatted(val(c,windowKey,ch,index),mode==='common'?3:2);b.onclick=()=>{channel=ch;update();highlight();};$('channel-buttons').append(b);});
  const timeValues=Object.keys(c.windows).map(w=>w+' ns: '+formatted(val(c,w,channel,index)));
  $('time-values').textContent=names[channel]+' / '+(f/1e6).toFixed(0)+' MHz — '+timeValues.join(' → ');
  $('energy-record').textContent='입력 펄스 종료 '+c.sourceEnd_ns.toFixed(2)+' ns · 전체 기록 '+c.recordEnd_ns.toFixed(2)+' ns · 마지막 에너지 '+c.lastReportedEnergy_dB.toFixed(2)+' dB. '+(c.energyCriterionMet?'설정한 에너지 종료 기준 충족.':'설정한 에너지 목표에는 미달했으며, 출력의 시간 비교와 별도로 기록합니다.');
  $('case-file').href=base+c.id+'/analysis.json';$('case-csv').href=base+c.id+'/transfer.csv';
  $('case-checks').textContent=c.numericalVerification.independentScalarOutputs+'개 출력 값을 원본 파형에서 별도로 재계산해 대조했습니다. 완료 기록 '+data.cases.length+'/'+data.expectedCases.length+'개.';
  $('mode-diff').setAttribute('aria-pressed',String(mode==='diff'));$('mode-common').setAttribute('aria-pressed',String(mode==='common'));
  for(const value of['shield','mesh'])$('review-'+value).setAttribute('aria-pressed',String(reviewMode===value));
  $('review-context').textContent=reviewMode==='shield'?'실드 세 조건 · 모두 단면 0.20 mm 격자':'격자 비교 · 미접속·한쪽 접속 × 단면 0.20 / 0.16 mm · 네 조건 완료';
  chart();inputReadout();timeReadout();meshReadout();
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
  $('geometry-caption').textContent=name(record())+' · 단면 격자 '+model.input.minCell_mm.y.toFixed(2)+' mm · 선택: '+names[channel]+' · 8선·실드 모두 포함 · 길이 방향 0.4배 표시. 흰 입력 구간은 전압원 위치이며 금속 접지선이 아닙니다.';
  render();
 }
 async function build(){
  modelId='';const run=record(),id=++ticket,[nextModel,nextGrid]=await Promise.all(['model.json','mesh.json'].map(file=>fetch(base+run.id+'/'+file).then(r=>r.json())));if(id!==ticket)return;model=nextModel;gridData=nextGrid;
  if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
  root=new T.Group();scene.add(root);markers=[];sourceMarkers=[];bondMeshes=[];
  for(const w of model.wires){const color=w.group==='plus'?col('focus'):w.group==='zero'?col('ground'):w.pair===0?col('tx'):col('rx');for(let n=1;n<w.points.length;n++)segment(w.points[n-1],w.points[n],model.input.copperRadius_mm,color);}
  const L=model.input.length_mm,H=model.input.height_mm,R=model.input.shield.radius_mm;
  shield=segment([-L/2,0,H],[L/2,0,H],R,col('stage-ink'),.1);shield.geometry.dispose();shield.geometry=new T.CylinderGeometry(R,R,L*.4,32,1,true);shield.material.side=T.DoubleSide;shield.visible=$('show-result-shield').checked;
  const a=vector(model.referencePlate.start),b=vector(model.referencePlate.stop),size=b.clone().sub(a);
  const plate=new T.Mesh(new T.BoxGeometry(Math.abs(size.x),.1,Math.abs(size.z)),new T.MeshLambertMaterial({color:col('phy'),transparent:true,opacity:.5}));plate.position.copy(a.add(b).multiplyScalar(.5));root.add(plate);
  model.ports.forEach(p=>{const point=vector(p.start).add(vector(p.stop)).multiplyScalar(.5);if(p.role==='ethernet'){const o=new T.Mesh(new T.SphereGeometry(.55,12,8),new T.MeshBasicMaterial({color:col('stage-ink')}));o.position.copy(point);root.add(o);markers.push({o,ch:(p.end==='far'?2:0)+p.pair,point});}else if(p.excite){const o=new T.Mesh(new T.SphereGeometry(.75,12,8),new T.MeshBasicMaterial({color:col('stage-ink')}));o.position.copy(point);root.add(o);}});
  for(const p of model.sourcePorts){
   segment(p.start,p.stop,.12,col('stage-ink'));
   const point=vector(p.start).add(vector(p.stop)).multiplyScalar(.5);sourceMarkers.push(point);
   const o=new T.Mesh(new T.SphereGeometry(.6,12,8),new T.MeshBasicMaterial({color:col('stage-ink')}));o.position.copy(point);root.add(o);
  }
  for(const b of model.shieldBonds){const start=vector(b.start),stop=vector(b.stop),size=stop.clone().sub(start);const o=new T.Mesh(new T.BoxGeometry(Math.abs(size.x),Math.abs(size.y),Math.abs(size.z)),new T.MeshLambertMaterial({color:col('ground')}));o.position.copy(start.add(stop).multiplyScalar(.5));o.visible=$('show-result-shield').checked;root.add(o);bondMeshes.push(o);}
  const vertices=[];for(const y of gridData.y.filter(y=>y>=-7.2&&y<=7.2))vertices.push(...vector([0,y,16]).toArray(),...vector([0,y,28]).toArray());for(const z of gridData.z.filter(z=>z>=16&&z<=28))vertices.push(...vector([0,-7.2,z]).toArray(),...vector([0,7.2,z]).toArray());
  mesh=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3)),new T.LineBasicMaterial({color:col('stage-ink'),transparent:true,opacity:.3}));mesh.visible=$('show-result-mesh').checked;root.add(mesh);modelId=run.id;highlight();fit();
 }
 $('case-select').onchange=async()=>{active=+$('case-select').value;other='';choices();update();await build();};
 $('compare-select').onchange=()=>{other=$('compare-select').value;update();};
 $('window-select').onchange=()=>{windowKey=$('window-select').value;if(other!==''&&!data.cases[+other].windows[windowKey])other='';choices();update();};
 $('frequency').oninput=()=>{index=+$('frequency').value;update();};
 $('reference-select').onchange=()=>{reference=$('reference-select').value;update();};
 for(const m of['diff','common'])$('mode-'+m).onclick=()=>{mode=m;update();highlight();};
 for(const m of['common','diff'])$('input-'+m).onclick=()=>{inputMode=m;inputChart();};
 function collection(value){reviewMode=value;data=value==='shield'?shieldData:meshData;driveData=value==='shield'?shieldDrive:meshDrive;base=value==='shield'?'records/common-14/':'records/mesh-20/';}
 async function preset(bond,m,ref='loaded',fi=90,compare='floating'){collection('shield');active=data.cases.findIndex(c=>c.input.shieldBondCase===bond);other=String(data.cases.findIndex(c=>c.input.shieldBondCase===compare));mode=m;reference=ref;channel=1;index=fi;windowKey='12';$('frequency').value=index;$('reference-select').value=reference;choices();update();if(modelId!==record().id)await build();else{highlight();fit();}}
 async function meshPreset(bond='near',against='grid',selectedMode='diff'){collection('mesh');active=data.cases.findIndex(c=>c.id==='test02-'+bond+'-fine');other=String(data.cases.findIndex(c=>c.id===(against==='bond'?'test02-floating-fine':'test02-'+bond)));mode=selectedMode;reference='drive';channel=1;index=90;windowKey='12';$('frequency').value=index;$('reference-select').value=reference;choices();update();await build();}
 $('review-shield').onclick=()=>preset('both','common');$('review-mesh').onclick=()=>meshPreset();
 $('inspect-floating-mesh').onclick=()=>{meshPreset('floating');$('comparison').scrollIntoView({behavior:'instant',block:'start'});};
 for(const m of['common','diff'])$('inspect-fine-'+m).onclick=()=>{meshPreset('near','bond',m);$('comparison').scrollIntoView({behavior:'instant',block:'start'});};
 $('inspect-mesh').onclick=()=>{meshPreset();$('comparison').scrollIntoView({behavior:'instant',block:'start'});};
 for(const m of['common','diff'])$('compare-'+m).onclick=()=>preset('near',m);
 $('compare-both').onclick=()=>preset('both','diff','loaded',90,'near');
 $('inspect-time').onclick=()=>preset('near','diff','drive',90);
 $('inspect-peak').onclick=()=>{preset('near','common','drive',163);$('comparison').scrollIntoView({behavior:'instant',block:'start'});};
 $('probe-closeup').onclick=()=>fit(markers.find(m=>m.ch===channel)?.point);$('model-overview').onclick=()=>fit();
 $('show-result-shield').onchange=()=>{shield.visible=$('show-result-shield').checked;for(const o of bondMeshes)o.visible=shield.visible;render();};$('show-result-mesh').onchange=()=>{mesh.visible=$('show-result-mesh').checked;render();};
 $('source-closeup').onclick=()=>{fit(sourceMarkers.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/sourceMarkers.length));camera.position.copy(controls.target).add(new T.Vector3(50,65,85).normalize().multiplyScalar(55/Math.min(camera.aspect||1,1)));controls.update();render();};
 controls.addEventListener('change',render);window.addEventListener('scroll',()=>requestAnimationFrame(render),{passive:true});new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))requestAnimationFrame(render);}).observe(el);new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}).observe(el);new ResizeObserver(chart).observe(svg);
 el.addEventListener('keydown',e=>{if(e.key==='Home'){fit();e.preventDefault();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.15;else if(e.key==='ArrowRight')s.theta+=.15;else if(e.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.15);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.15);else if(['+','='].includes(e.key))s.radius*=.85;else if(e.key==='-')s.radius/=.85;else return;camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();render();e.preventDefault();});
 choices();update();await build();$('coupling-error').hidden=true;window.__common={ready:true,get data(){return data},get driveData(){return driveData},snapshot:()=>({reviewMode,meshCell:model.input.minCell_mm.y,modelGridLines:{x:gridData.x.length,y:gridData.y.length,z:gridData.z.length},active,windowKey,mode,channel,index,other,reference,value:current(),comparisonValue:other===''?null:val(data.cases[+other],windowKey,channel,index),modelId,wireCount:model.wires.length,sourceCount:sourceMarkers.length,bondCount:bondMeshes.length,inputMode,inputResidual:inputAbs('inputDM_over_CM'),busResidual:inputAbs('inputBusDM_over_CM'),camera:camera.position.toArray(),target:controls.target.toArray(),quaternion:camera.quaternion.toArray(),aspect:camera.aspect,gridVisible:mesh.visible,shieldVisible:shield.visible})};
})().catch(e=>{const el=document.getElementById('coupling-error');el.hidden=false;el.textContent='저장 결과 표시 오류: '+e.message;console.error(e);});
