(() => {
  const $=id=>document.getElementById(id), svg=$('system-map'), NS='http://www.w3.org/2000/svg';
  const statuses={confirmed:'사용자 확인',reference:'ATLAS 자료',unknown:'연결 미확인',hypothesis:'결합 후보 · 미검증'};
  let selected=null, focus='all', reviews={};
  const storeKey='atlas-porta-lab-review-01';
  try{reviews=JSON.parse(localStorage.getItem(storeKey)||'{}');}catch{}
  const nodeMap=new Map(SETUP.nodes.map(n=>[n.id,n]));
  function el(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;return e;}
  svg.classList.add('system-map');
  for(const z of [{x:35,y:178,w:535,h:485,title:'컴퓨터 쪽 · 책상 위 PC / 같은 멀티탭',tx:55,ty:190},{x:950,y:330,w:700,h:715,title:'센서 내부 · 전원과 통신',tx:972,ty:352}]){
    svg.append(el('rect',{x:z.x,y:z.y,width:z.w,height:z.h,rx:16,class:'zone'}));
    svg.append(el('text',{x:z.tx,y:z.ty,class:'zone-label'},z.title));
  }
  svg.append(el('text',{x:60,y:42,class:'note'},'실선 = 확인된 외부 연결 / ATLAS 내부 연결 · 점선 = 접속 미확인 · 점점선 C1–C7 = 잡음 후보'));
  for(const [x,kind,text] of [[60,'ac','220 VAC'],[270,'dc','DC 전원'],[470,'ethernet','PortA Ethernet'],[740,'internal','내부 통신·제어'],[1030,'bond','접속 미확인'],[1290,'coupling','잡음 결합 후보']]){
    const g=el('g',{class:`edge ${kind}`});g.append(el('path',{d:`M${x} 1086h32`,class:'edge-line'}),el('text',{x:x+43,y:1091,class:'note'},text));svg.append(g);
  }
  const edgeLayer=el('g'), nodeLayer=el('g');svg.append(edgeLayer,nodeLayer);
  for(const e of SETUP.edges){
    e.label=e.label.replace('回転側','회전측').replace('分岐','분기');
    const g=el('g',{class:`edge ${e.kind} ${e.status}`,'data-edge':e.id,tabindex:0,role:'button','aria-label':`${nodeMap.get(e.a).title} ↔ ${nodeMap.get(e.b).title}: ${e.label}, ${statuses[e.status]}`});
    g.append(el('path',{d:e.d,class:'edge-halo'}),el('path',{d:e.d,class:'edge-line'}));
    if(e.lx!==undefined)g.append(el('text',{x:e.lx,y:e.ly,class:'edge-label'},e.label));
    g.addEventListener('click',()=>selectEdge(e));g.addEventListener('keydown',evt=>{if(['Enter',' '].includes(evt.key)){evt.preventDefault();selectEdge(e);}});edgeLayer.append(g);
  }
  for(const n of SETUP.nodes){
    const g=el('g',{class:`node ${n.status}`,'data-node':n.id,transform:`translate(${n.x},${n.y})`,tabindex:0,role:'button','aria-label':`${n.code} ${n.title} · ${statuses[n.status]}`});
    const titleY=n.h<=60?33:n.h<=65?36:n.h<=70?38:40;
    g.append(el('rect',{width:n.w,height:n.h,rx:8}),el('circle',{cx:n.w-13,cy:13,r:4,class:'status-dot'}),el('text',{x:13,y:n.h<=60?14:17,class:'code'},`${n.code} · ${statuses[n.status]}`),el('text',{x:13,y:titleY,class:'title'},n.title));
    const words=n.sub.split(' · ');let sub=n.sub;
    if(n.w<200&&sub.length>20&&n.h>=80){g.append(el('text',{x:13,y:62,class:'sub'},words.slice(0,2).join(' · ')),el('text',{x:13,y:80,class:'sub'},words.slice(2).join(' · ')));}
    else g.append(el('text',{x:13,y:Math.min(n.h-8,64),class:'sub'},sub));
    g.addEventListener('click',()=>selectNode(n.id));g.addEventListener('keydown',evt=>{if(['Enter',' '].includes(evt.key)){evt.preventDefault();selectNode(n.id);}});nodeLayer.append(g);
  }
  function sourceLinks(keys){$('node-sources').replaceChildren();for(const key of [...new Set(keys)]){const s=SETUP.sources[key],a=document.createElement(s.href?'a':'span');if(s.href)a.href=s.href;a.textContent=s.label;$('node-sources').append(a);}}
  function badge(status){$('node-status').replaceChildren();const s=document.createElement('span');s.className='badge '+status;s.textContent=statuses[status];$('node-status').append(s);}
  function selectNode(id){const n=nodeMap.get(id);if(!n)return;selected=id;$('node-code').textContent=n.code;$('node-title').textContent=n.title;badge(n.status);$('node-detail').textContent=n.detail;$('node-unknown').textContent='확인할 것: '+n.unknown;sourceLinks(n.sources);$('node-review').hidden=false;$('review-status').value=reviews[id]?.status||'unreviewed';$('review-note').value=reviews[id]?.note||'';$('node-pcb').hidden=!n.pcb;$('node-pcb').onclick=()=>{window.__pcbViewer?.select({segment:n.pcb,pair:'both'});$('pcb-section').scrollIntoView({behavior:'smooth'});};applyFocus();}
  function selectEdge(e){selected=null;$('node-code').textContent=e.id.toUpperCase();$('node-title').textContent=e.label;badge(e.status);$('node-detail').textContent=`${nodeMap.get(e.a).title} ↔ ${nodeMap.get(e.b).title}`;$('node-unknown').textContent=e.status==='hypothesis'?'이 선은 계산되거나 관측된 간섭이 아니라 모델에 포함할 결합 후보입니다. 크기·주파수·귀환 경로는 아직 미확정입니다.':e.status==='unknown'?'실물에서 접속 방식과 임피던스를 확인해야 합니다. 그림의 점선을 실제 단락으로 해석하지 않습니다.':'연결 관계를 나타냅니다. 배선 길이·실제 공간 경로·실드 상태는 양끝 부품의 설명에서 확인합니다.';sourceLinks([...nodeMap.get(e.a).sources,...nodeMap.get(e.b).sources]);$('node-review').hidden=true;$('node-pcb').hidden=true;applyFocus();svg.querySelector(`[data-edge="${e.id}"]`).classList.add('active');}
  function applyFocus(){let kinds=null;if(focus==='porta')kinds=['ethernet'];if(focus==='power')kinds=['ac','dc'];if(focus==='noise')kinds=['bond','coupling','dc'];const activeNodes=new Set();for(const e of SETUP.edges){const g=svg.querySelector(`[data-edge="${e.id}"]`),hidden=e.kind==='bond'&&!$('show-bonds').checked||e.kind==='coupling'&&!$('show-noise').checked;const active=!kinds||kinds.includes(e.kind);g.classList.toggle('hidden-mark',hidden);g.classList.toggle('muted-mark',!active);g.classList.toggle('active',!!selected&&(e.a===selected||e.b===selected));if(active&&!hidden){activeNodes.add(e.a);activeNodes.add(e.b);}}for(const n of SETUP.nodes){const g=svg.querySelector(`[data-node="${n.id}"]`);g.classList.toggle('muted-mark',!!kinds&&!activeNodes.has(n.id));g.classList.toggle('active',selected===n.id);}for(const b of document.querySelectorAll('[data-focus]'))b.setAttribute('aria-pressed',String(b.dataset.focus===focus));}
  for(const b of document.querySelectorAll('[data-focus]'))b.onclick=()=>{focus=b.dataset.focus;if(focus==='noise'){$('show-bonds').checked=true;$('show-noise').checked=true;}applyFocus();};
  $('show-bonds').onchange=applyFocus;$('show-noise').onchange=applyFocus;
  $('map-reset').onclick=()=>{focus='all';selected=null;applyFocus();$('node-code').textContent='구성 확인';$('node-title').textContent='부품이나 경로를 선택하세요';$('node-status').replaceChildren();$('node-detail').textContent='각 부품에서 실제 연결, ATLAS 근거, 다음 계산에 필요한 항목을 확인합니다.';$('node-unknown').textContent='';$('node-sources').replaceChildren();$('node-review').hidden=true;$('node-pcb').hidden=true;};
  $('map-zoom').onchange=()=>{svg.style.width=(Number($('map-zoom').value)*100)+'%';svg.style.minWidth=(1050*Number($('map-zoom').value))+'px';};
  function save(){if(!selected)return;reviews[selected]={status:$('review-status').value,note:$('review-note').value};try{localStorage.setItem(storeKey,JSON.stringify(reviews));}catch{}reviewSummary();}
  $('review-status').onchange=save;$('review-note').oninput=save;
  function reviewSummary(){const vals=Object.values(reviews);$('review-summary').textContent=`이 브라우저의 검토: 맞음 ${vals.filter(v=>v.status==='correct').length}개 · 수정 필요 ${vals.filter(v=>v.status==='corrected').length}개. 이는 그림 검토 기록이며 시뮬레이션 승인이나 검증 완료를 뜻하지 않습니다.`;}
  for(const [id,title,desc,node]of SETUP.unknowns){const b=document.createElement('button');b.className='unknown-item';b.innerHTML=`<span>${id}</span><div><strong>${title}</strong><p>${desc}</p></div>`;b.onclick=()=>{focus='all';selectNode(node);$('map-section').scrollIntoView({behavior:'smooth'});const n=nodeMap.get(node);const scale=svg.clientWidth/1680;$('map-scroll').scrollTo({left:Math.max(0,n.x*scale-150),top:Math.max(0,n.y*scale-120),behavior:'smooth'});};$('unknown-list').append(b);}
  function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  $('export-review').onclick=()=>download('porta-lab-review-03.json',JSON.stringify({revision:SETUP.revision,approved:false,simulation_run:false,reviewed_at:new Date().toISOString(),component_reviews:reviews},null,2),'application/json');
  $('export-svg').onclick=()=>{const clone=svg.cloneNode(true);const orig=[svg,...svg.querySelectorAll('*')],copied=[clone,...clone.querySelectorAll('*')];const props=['fill','stroke','stroke-width','stroke-dasharray','stroke-linejoin','font-family','font-size','font-weight','letter-spacing','opacity','display','paint-order'];orig.forEach((e,i)=>{const c=getComputedStyle(e);copied[i].setAttribute('style',props.map(p=>`${p}:${c.getPropertyValue(p)}`).join(';'));});clone.setAttribute('width','1680');clone.setAttribute('height','1110');clone.setAttribute('style','background:#ffffff');download('porta-lab-connections.svg',new XMLSerializer().serializeToString(clone),'image/svg+xml');};
  window.selectSetupNode=selectNode;window.__labSetup={ready:true,revision:SETUP.revision,nodes:SETUP.nodes.length,edges:SETUP.edges.length,approved:false,simulationRun:false,select:selectNode,snapshot:()=>({selected,focus,bonds:$('show-bonds').checked,noise:$('show-noise').checked,reviews})};
  applyFocus();reviewSummary();
})();
