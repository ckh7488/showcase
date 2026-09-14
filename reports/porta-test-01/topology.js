/* TEST 01: saved openEMS topology results only; this page never runs a solver. */
(async()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const css=getComputedStyle(document.documentElement);
  const color=name=>css.getPropertyValue('--sc-'+name).trim();
  const NS='http://www.w3.org/2000/svg';
  const definitions=[
    {id:'legacy-adjacent',label:'현재 배선',short:'+/+ · 0/0',topology:'adjacent',polarity:'aligned',wiring:'same',description:'전원 + 두 선과 0 V 두 선이 각각 한 꼬임쌍이며, 전원 두 쌍이 Ethernet 두 쌍 옆에 놓입니다.'},
    {id:'balanced-adjacent-aligned',label:'인접 · 같은 방향',short:'+ / 0 · 인접 · 정렬',topology:'adjacent',polarity:'aligned',wiring:'mixed',description:'두 전원쌍을 모두 +/0 V로 만들고, 전원쌍을 한쪽에 나란히 둡니다. 두 쌍의 + 선 방향은 같습니다.'},
    {id:'balanced-adjacent-opposed',label:'인접 · 반대 방향',short:'+ / 0 · 인접 · 한 쌍 반전',topology:'adjacent',polarity:'opposed',wiring:'mixed',description:'인접 배치를 유지하되 두 번째 전원쌍의 +와 0 V 위치를 뒤집어 두 전원쌍의 장 방향을 반대로 둡니다.'},
    {id:'balanced-diagonal-aligned',label:'대각 · 같은 방향',short:'+ / 0 · 대각 · 정렬',topology:'diagonal',polarity:'aligned',wiring:'mixed',description:'두 전원쌍을 대각선에 놓아 각 Ethernet쌍이 두 전원쌍에서 같은 중심 거리를 갖게 합니다.'},
    {id:'balanced-diagonal-opposed',label:'대각 · 반대 방향',short:'+ / 0 · 대각 · 한 쌍 반전',topology:'diagonal',polarity:'opposed',wiring:'mixed',description:'대각 배치에 두 번째 전원쌍의 극성 방향 반전을 더한 가장 대칭적인 후보입니다.'},
  ];
  const channelNames=['입력 쪽 · Ethernet 1','입력 쪽 · Ethernet 2','반대쪽 · Ethernet 1','반대쪽 · Ethernet 2'];
  const stageLabels={
    preparing:'준비 중',waiting_for_existing_solver:'진행 중인 계산 종료 대기',calculating_coarse:'기본 격자 계산 중',publishing_coarse:'기본 격자 정리 중',refinement_queued:'세분화 후보 확정',calculating_fine:'세분화 격자 계산 중',publishing_final:'최종 비교 정리 중',complete:'토폴로지 선별 완료',needs_review:'계산 검토 필요'
  };
  let progress=null,results=null,historical={},selected='legacy-adjacent',mode='differential',channel=1,frequencyIndex=90;
  let sceneState=null,modelTicket=0;

  async function getJson(path,optional=false){
    const response=await fetch(path,{cache:'no-store'});
    if(!response.ok){if(optional)return null;throw Error(path+' '+response.status);}
    return response.json();
  }

  function magnitudes(value){
    return value.real.map((row,p)=>row.map((real,i)=>Math.hypot(real,value.imag[p][i])));
  }

  function combineRecords(record){
    const curves={};let worstDiff={mVperV:-1};
    for(const windowKey of Object.keys(record.windows)){
      const window=record.windows[windowKey];
      const diff=[...magnitudes(window.HdiffNear),...magnitudes(window.Hdiff)];
      const common=[...magnitudes(window.HcommonNear),...magnitudes(window.Hcommon)];
      const combined=common.map((row,ch)=>row.map((cm,i)=>Math.sqrt(2*cm*cm+.5*diff[ch][i]*diff[ch][i])));
      diff.forEach((row,ch)=>row.forEach((value,i)=>{if(value*1000>worstDiff.mVperV)worstDiff={mVperV:value*1000,frequency_Hz:record.frequency_Hz[i],channel:['near-pair-1','near-pair-2','far-pair-1','far-pair-2'][ch],channelLabel:channelNames[ch],window_ns:+windowKey};}));
      if(windowKey==='12')curves.value={frequency_Hz:record.frequency_Hz,differential_mVperV:diff.map(r=>r.map(v=>v*1000)),common_mVperV:common.map(r=>r.map(v=>v*1000)),combined_mVperV:combined.map(r=>r.map(v=>v*1000))};
    }
    return {curve12ns:curves.value,worst:{differential:worstDiff},source:'historical'};
  }

  async function loadHistorical(){
    const paths={
      'legacy-adjacent':'records/connected-10/test01-same-coarse/analysis.json',
      'balanced-adjacent-aligned':'records/connected-10/test01-mixed-coarse/analysis.json'
    };
    const entries=await Promise.all(Object.entries(paths).map(async([id,path])=>[id,combineRecords(await getJson(path))]));
    historical=Object.fromEntries(entries);
  }

  function resultCase(id){
    const computed=results?.cases?.find(item=>item.id===id);
    return computed?{...computed,source:'topology'}:historical[id]||null;
  }

  function progressRow(id){return progress?.rows?.find(item=>item.id===id);}
  function definition(id=selected){return definitions.find(item=>item.id===id);}

  function miniSvg(def){
    const roles=def.topology==='diagonal'?['P','E','E','P']:['E','E','P','P'];
    const points=[[15,35],[15,15],[43,35],[43,15]];
    return `<svg viewBox="0 0 58 50" aria-hidden="true">${points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="9" fill="${roles[i]==='P'?color('accent-soft'):color('page')}" stroke="${roles[i]==='P'?color('accent'):color('phy')}"/><text x="${p[0]}" y="${p[1]+3}" text-anchor="middle" font-size="8" fill="${color('ink')}">${roles[i]}</text>`).join('')}</svg>`;
  }

  function stateText(def){
    const row=progressRow(def.id),computed=results?.cases?.some(item=>item.id===def.id);
    if(computed)return row?.fine==='complete'?'기본+세분화':'기본 완료';
    if(row?.coarse==='running')return '계산 중';
    if(row?.coarse==='complete')return '정리 중';
    if(historical[def.id])return '기존 값';
    return '대기';
  }

  function renderCandidates(){
    $('candidate-list').replaceChildren();
    for(const def of definitions){
      const button=document.createElement('button');button.className='candidate';button.type='button';button.dataset.id=def.id;
      button.setAttribute('aria-pressed',String(def.id===selected));
      button.innerHTML=miniSvg(def)+`<span><b>${def.label}</b><small>${def.short}</small></span><span class="candidate-state">${stateText(def)}</span>`;
      button.onclick=()=>{selected=def.id;render();};
      $('candidate-list').append(button);
    }
  }

  function svgNode(svg,tag,attrs,text){
    const node=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));if(text!==undefined)node.textContent=text;svg.append(node);return node;
  }

  function renderCrossSection(){
    const svg=$('cross-section'),def=definition();svg.replaceChildren();
    svgNode(svg,'circle',{cx:180,cy:160,r:132,fill:color('surface'),stroke:color('line'),'stroke-width':2});
    const slots=[[125,205],[125,115],[235,205],[235,115]];
    const powerSlots=def.topology==='diagonal'?[0,3]:[2,3],ethernetSlots=[0,1,2,3].filter(i=>!powerSlots.includes(i));
    let e=0,p=0;
    for(let slot=0;slot<4;slot++){
      const [x,y]=slots[slot],isPower=powerSlots.includes(slot),logical=isPower?p++:e++;
      svgNode(svg,'circle',{cx:x,cy:y,r:39,fill:isPower?color('accent-soft'):color('page'),stroke:isPower?color('accent'):color('phy'),'stroke-width':2});
      let legs=['',''];
      if(!isPower)legs=['E','E'];
      else if(def.wiring==='same')legs=logical===0?['+','+']:['0','0'];
      else {const plusLeg=def.polarity==='opposed'&&logical===1?1:0;legs=plusLeg===0?['+','0']:['0','+'];}
      [[x-13,y],[x+13,y]].forEach((point,leg)=>{
        const label=legs[leg],fill=!isPower?(logical===0?color('tx'):color('rx')):label==='+'?color('focus'):color('ground');
        svgNode(svg,'circle',{cx:point[0],cy:point[1],r:10,fill,stroke:color('surface'),'stroke-width':2});
        svgNode(svg,'text',{x:point[0],y:point[1]+4,'text-anchor':'middle','font-size':10,'font-weight':800,fill:color('ink')},label);
      });
      svgNode(svg,'text',{x,y:y+57,'text-anchor':'middle','font-size':12,'font-weight':700,fill:color('ink')},isPower?`전원 ${logical+1}`:`Ethernet ${logical+1}`);
    }
    svgNode(svg,'text',{x:180,y:307,'text-anchor':'middle','font-size':12,fill:color('muted')},def.topology==='diagonal'?'전원쌍과 Ethernet쌍이 대각으로 교차':'Ethernet 두 쌍과 전원 두 쌍이 나란히 인접');
  }

  function renderComputed(){
    const item=resultCase(selected),def=definition();
    $('selected-kicker').textContent=def.wiring==='same'?'기준 배선':'후보 토폴로지';
    $('selected-title').textContent=def.label;$('selected-description').textContent=def.description;
    const selectedRow=progressRow(selected);
    $('selected-badge').textContent=item?(item.source==='historical'?'기존 연결부 결과':selectedRow?.fine==='complete'?'기본 곡선 · 정밀 확인 완료':'기본 격자 결과'):'계산 대기';
    $('computed-result').hidden=!item;$('empty-result').hidden=!!item;
    if(!item)return;
    const modeKey=mode+'_mVperV',curve=item.curve12ns;
    $('channel-bar').replaceChildren();channelNames.forEach((name,index)=>{const button=document.createElement('button');button.type='button';button.textContent=name;button.setAttribute('aria-pressed',String(index===channel));button.onclick=()=>{channel=index;renderComputed();};$('channel-bar').append(button);});
    document.querySelectorAll('.mode-bar button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    const values=curve[modeKey][channel],baseline=resultCase('legacy-adjacent');
    drawChart(curve.frequency_Hz,values,baseline?.curve12ns?.[modeKey]?.[channel],item.source);
    const value=values[frequencyIndex],base=baseline?.curve12ns?.[modeKey]?.[channel]?.[frequencyIndex];
    $('frequency').value=frequencyIndex;$('frequency-output').textContent=(curve.frequency_Hz[frequencyIndex]/1e6).toFixed(0)+' MHz';
    $('selected-value').textContent=value.toFixed(3)+' mV/V';
    $('baseline-value').textContent=base===undefined?'—':selected==='legacy-adjacent'?'기준값':(value/base).toFixed(2)+'배';
    $('worst-value').textContent=item.worst?.differential?.mVperV?.toFixed(2)+' mV/V';
  }

  function drawChart(frequencies,values,baseline,source){
    const svg=$('result-chart');svg.replaceChildren();const left=58,right=660,top=24,bottom=270;
    const all=[...values,...(baseline||[])].filter(v=>v>0),min=Math.max(.001,Math.min(...all)*.7),max=Math.max(...all)*1.35;
    const logMin=Math.log10(min),logMax=Math.log10(max);
    const x=i=>left+i/(frequencies.length-1)*(right-left),y=v=>bottom-(Math.log10(Math.max(v,min))-logMin)/(logMax-logMin)*(bottom-top);
    for(let tick=0;tick<5;tick++){
      const value=10**(logMin+(logMax-logMin)*tick/4),py=y(value);
      svgNode(svg,'line',{x1:left,y1:py,x2:right,y2:py,stroke:color('line')});
      svgNode(svg,'text',{x:left-8,y:py+4,'text-anchor':'end','font-size':11,fill:color('muted')},value<1?value.toFixed(2):value.toFixed(1));
    }
    [10,50,100,150,200].forEach(mhz=>{const px=left+(mhz-10)/190*(right-left);svgNode(svg,'text',{x:px,y:294,'text-anchor':'middle','font-size':11,fill:color('muted')},mhz);});
    svgNode(svg,'text',{x:left,y:15,'font-size':11,fill:color('muted')},'mV / 입력 1 V · 로그 축');
    svgNode(svg,'text',{x:right,y:313,'text-anchor':'end','font-size':11,fill:color('muted')},'MHz');
    if(baseline&&selected!=='legacy-adjacent')svgNode(svg,'polyline',{points:baseline.map((v,i)=>`${x(i)},${y(v)}`).join(' '),fill:'none',stroke:color('muted'),'stroke-width':1.6,'stroke-dasharray':'6 5'});
    svgNode(svg,'polyline',{points:values.map((v,i)=>`${x(i)},${y(v)}`).join(' '),fill:'none',stroke:color('accent'),'stroke-width':2.6});
    svgNode(svg,'line',{x1:x(frequencyIndex),y1:top,x2:x(frequencyIndex),y2:bottom,stroke:color('focus'),'stroke-width':1});
    svgNode(svg,'circle',{cx:x(frequencyIndex),cy:y(values[frequencyIndex]),r:4.5,fill:color('focus')});
    if(source==='historical')svgNode(svg,'text',{x:right,y:15,'text-anchor':'end','font-size':11,fill:color('muted')},'기존 연결부 데이터');
    svg.onclick=event=>{const rect=svg.getBoundingClientRect(),px=(event.clientX-rect.left)*680/rect.width;frequencyIndex=Math.max(0,Math.min(190,Math.round((px-left)/(right-left)*190)));renderComputed();};
  }

  function renderRanking(){
    if(!results?.coarseRanking?.length){$('ranking').innerHTML='<p class="muted">계산 결과를 기다리고 있습니다.</p>';return;}
    const winner=results.winner;
    $('ranking-note').textContent=results.topologyScreeningComplete?`+/0 후보 중 ${winner.label}을 선택 · 상위 두 후보의 정밀 격자 확인 완료`:`기본 격자 잠정 1위: ${winner.label} · 상위 두 후보 세분화 중`;
    const rows=results.coarseRanking.map(item=>`<tr><td class="${item.id===winner.id?'winner':''}">${item.rank}</td><td><b>${item.label}</b></td><td>${item.worstDifferential_mVperV.toFixed(2)}</td><td>${item.worstCombined_mVperV.toFixed(2)}</td><td>${item.worstCommon_mVperV.toFixed(2)}</td></tr>`).join('');
    const current=results.cases.find(item=>item.id==='legacy-adjacent'),choice=results.cases.find(item=>item.id===winner.id);
    const direct=current&&choice?` 같은 기본 격자에서 현재 배선의 최악 차동은 ${current.worst.differential.mVperV.toFixed(2)} mV/V, 선택 후보는 ${choice.worst.differential.mVperV.toFixed(2)} mV/V입니다.`:'';
    $('ranking').innerHTML=`<table><thead><tr><th>순위</th><th>+/0 후보</th><th>최악 차동 mV/V</th><th>최악 전체 크기 mV/V</th><th>최악 공통모드 mV/V</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">순위는 +/0 전원쌍 네 후보에만 적용합니다.${direct}</p>`;
  }

  function renderConclusion(){
    const section=$('screening-result');
    if(!results?.topologyScreeningComplete){section.hidden=true;return;}
    const winner=results.winner,current=results.cases.find(item=>item.id==='legacy-adjacent'),choice=results.cases.find(item=>item.id===winner.id);
    if(!current||!choice){section.hidden=true;return;}
    const diffRatio=choice.worst.differential.mVperV/current.worst.differential.mVperV;
    const commonDrop=(1-choice.worst.common.mVperV/current.worst.common.mVperV)*100;
    const combinedDrop=(1-choice.worst.combined.mVperV/current.worst.combined.mVperV)*100;
    section.hidden=false;
    $('screening-title').textContent=`+/0 후보 중 ${winner.label}`;
    $('screening-conclusion').textContent=`이 배치는 +/0 후보 가운데 차동 최악값이 가장 작았습니다. 다만 현재 +/+ · 0/0 배선보다 차동은 ${diffRatio.toFixed(2)}배 컸고, 대신 공통모드와 두 선 전체 크기는 각각 ${commonDrop.toFixed(1)}%, ${combinedDrop.toFixed(1)}% 낮았습니다.`;
    $('screening-current').textContent=`${current.worst.differential.mVperV.toFixed(2)} mV/V`;
    $('screening-choice').textContent=`${choice.worst.differential.mVperV.toFixed(2)} mV/V`;
    $('screening-choice').className=diffRatio>1?'up':'down';
    $('screening-diff-note').textContent=`현재보다 ${diffRatio.toFixed(2)}배 · 기본 격자끼리 비교`;
    const fine=winner.fineWorstDifferential_mVperV;
    $('screening-fine').textContent=Number.isFinite(fine)?`${fine.toFixed(2)} mV/V`:'—';
    $('screening-total-note').textContent=Number.isFinite(fine)?`기본 격자 대비 ${Math.abs((fine/choice.worst.differential.mVperV-1)*100).toFixed(1)}% 차이`:'상위 두 후보 재확인';
  }

  function renderProgress(){
    const stage=progress?.stage||'preparing',label=stageLabels[stage]||stage;
    $('status-title').textContent=label;$('status-dot').classList.toggle('running',!['complete','needs_review'].includes(stage));
    $('status-detail').textContent=stage==='complete'?`+/0 선택 후보: ${progress.winner?.label||progress.winner?.id}`:stage==='needs_review'?'저장된 계산을 확인해야 다음 단계로 갈 수 있습니다.':progress?.current?`${definition(progress.current)?.label||progress.current} 계산 중`:'기존 결과를 보존하고 별도 토폴로지 묶음으로 계산합니다.';
    $('status-time').textContent=progress?.updatedAtUTC?`최근 기록 ${new Date(progress.updatedAtUTC).toLocaleString('ko-KR')}`:'실행 기록을 확인하는 중입니다.';
    $('progress-grid').replaceChildren();
    for(const def of definitions){
      const row=progressRow(def.id)||{},coarse=row.coarse||'queued',fine=row.fine||'not_selected';
      const percent=fine==='complete'?100:fine==='running'?82:coarse==='complete'?60:coarse==='running'?30:0;
      const state=fine==='complete'?'세분화 완료':fine==='running'?'세분화 중':coarse==='complete'?(fine==='queued'?'세분화 대기':'기본 완료'):coarse==='running'?'기본 계산 중':'대기';
      const article=document.createElement('article');article.className='progress-item';article.innerHTML=`<b>${def.label}</b><span>${state}${row.lastTimestep?` · ${row.lastTimestep.toLocaleString()} step`:''}</span><div class="progress-meter"><i style="width:${percent}%"></i></div>`;$('progress-grid').append(article);
    }
  }

  function modelPath(){
    const item=results?.cases?.find(row=>row.id===selected);if(item)return item.model;
    if(selected==='legacy-adjacent')return 'records/connected-10/test01-same-coarse/model.json';
    if(selected==='balanced-adjacent-aligned')return 'records/connected-10/test01-mixed-coarse/model.json';
    return null;
  }

  function initScene(){
    if(!window.THREE)return null;
    const T=window.THREE,host=$('model-stage'),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(color('stage'));host.append(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,1000),controls=new T.OrbitControls(camera,renderer.domElement);scene.add(new T.AmbientLight(0xffffff,.85));const light=new T.DirectionalLight(0xffffff,.7);light.position.set(30,55,70);scene.add(light);
    const state={T,host,renderer,scene,camera,controls,root:null,model:null};
    controls.addEventListener('change',()=>renderer.render(scene,camera));
    new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}).observe(host);
    host.addEventListener('keydown',event=>{const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(event.key==='Home'){fitModel();event.preventDefault();return;}if(event.key==='ArrowLeft')s.theta-=.15;else if(event.key==='ArrowRight')s.theta+=.15;else if(event.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.15);else if(event.key==='ArrowDown')s.phi=Math.min(Math.PI-.1,s.phi+.15);else return;camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();event.preventDefault();});
    return state;
  }

  function vector(point){return new sceneState.T.Vector3(point[0]*.42,point[2]-20,-point[1]);}
  function segment(a,b,radius,material){const T=sceneState.T,v=vector(a),w=vector(b),delta=w.clone().sub(v),mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,delta.length(),7),material);mesh.position.copy(v.add(w).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());sceneState.root.add(mesh);}
  function fitModel(){if(!sceneState)return;sceneState.controls.target.set(0,0,0);sceneState.camera.position.set(64,58,86);sceneState.controls.update();sceneState.renderer.render(sceneState.scene,sceneState.camera);}
  async function loadModel(){
    if(!sceneState)return;const path=modelPath(),key=path+'|'+$('show-fanout').checked,ticket=++modelTicket,T=sceneState.T;
    if(sceneState.modelKey===key)return;sceneState.modelKey=key;
    if(sceneState.root){sceneState.scene.remove(sceneState.root);sceneState.root.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});sceneState.root=null;}
    if(!path){sceneState.renderer.render(sceneState.scene,sceneState.camera);return;}
    const model=await getJson(path,true);if(ticket!==modelTicket)return;if(!model){sceneState.modelKey=null;return;}sceneState.model=model;sceneState.root=new T.Group();sceneState.scene.add(sceneState.root);
    const mats={plus:new T.MeshLambertMaterial({color:color('focus')}),zero:new T.MeshLambertMaterial({color:color('ground')}),e0:new T.MeshLambertMaterial({color:color('tx')}),e1:new T.MeshLambertMaterial({color:color('rx')})};
    for(const wire of model.wires){const points=$('show-fanout').checked?wire.points:(wire.cablePoints||wire.points),material=wire.group==='plus'?mats.plus:wire.group==='zero'?mats.zero:wire.pair===0?mats.e0:mats.e1;for(let i=1;i<points.length;i++)segment(points[i-1],points[i],model.input.copperRadius_mm,material);}
    const shieldMat=new T.MeshLambertMaterial({color:color('stage-ink'),transparent:true,opacity:.09});segment([-model.input.length_mm/2,0,model.input.height_mm],[model.input.length_mm/2,0,model.input.height_mm],model.input.shield.radius_mm,shieldMat);fitModel();
  }

  function render(){renderCandidates();renderCrossSection();renderComputed();renderConclusion();renderRanking();renderProgress();loadModel();}

  document.querySelectorAll('.mode-bar button').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;renderComputed();});
  $('frequency').oninput=()=>{frequencyIndex=+$('frequency').value;renderComputed();};
  $('show-fanout').onchange=loadModel;$('model-reset').onclick=fitModel;
  sceneState=initScene();

  await Promise.all([loadHistorical(),(async()=>{progress=await getJson('data/topology-progress.json',true);results=await getJson('data/topology-results.json',true);})()]);
  if(results?.winner?.id)selected=results.winner.id;
  render();

  setInterval(async()=>{
    const [nextProgress,nextResults]=await Promise.all([getJson('data/topology-progress.json',true),getJson('data/topology-results.json',true)]);
    if(nextProgress)progress=nextProgress;if(nextResults)results=nextResults;render();
  },30000);
})().catch(error=>{console.error(error);const detail=document.getElementById('status-detail');if(detail)detail.textContent='저장된 결과를 표시하지 못했습니다: '+error.message;});
