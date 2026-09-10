(()=>{
 'use strict';
 const data=window.RF_DATA,root=document.querySelector('#rf-study');
 if(!data||!root)return;
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
 const metricInfo={sdd11_db:['차동 반사 · Sdd11','dB · 낮을수록 반사 성분이 작음'],scd21_db:['차동 → 공통 변환 · Scd21','dB · 낮을수록 변환 성분이 작음'],insertion_loss_db:['삽입손실 · −Sdd21(dB)','dB · 0에 가까울수록 전달이 큼']};
 const colors=['#577c96','#cf752d','#197d71'];
 const reviewTargets=data.validation.predeclared_review_targets;
 const keys={sdd11_db:'sdd11',scd21_db:'scd21',insertion_loss_db:'sdd21'};
 const shortNames={sdd11_db:'Sdd11',scd21_db:'Scd21',insertion_loss_db:'삽입손실'};
 let pair='A',metric='sdd11_db',index=99,showGrid=false;
 const ns='http://www.w3.org/2000/svg';
 function element(tag,attrs={},text){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;}
 function fmt(v,digits=1){return v.toFixed(digits)+' dB';}
 function selectFrequency(value){index=Math.max(0,Math.min(data.frequency_mhz.length-1,Math.round(Number(value)||100)-1));render();}
 function sensitivity(c,m){
  const r=c.pairs[pair],key=keys[m],targetKey=m==='insertion_loss_db'?'insertion_loss':key;
  const grid=Math.abs(r[m][index]-r.comparison_grid[m][index]),tail=r.last5_window_db_delta[key][index];
  const gridLimit=reviewTargets.mesh_review_targets_db[targetKey],tailLimit=reviewTargets.time_window_last_5_percent_review_targets_db[targetKey];
  return {grid,tail,gridLimit,tailLimit,flag:grid>gridLimit||tail>tailLimit};
 }
 function render(){
  const f=data.frequency_mhz[index],selected=window.__routingReview?.snapshot().phase??2;
  $('#rf-frequency').value=f;$('#rf-frequency-number').value=f;$('#rf-frequency-label').textContent=f+' MHz';
  $('#rf-pair-label').textContent=pair+' 페어';$('#rf-chart-title').textContent=metricInfo[metric][0];$('#rf-axis-hint').textContent=metricInfo[metric][1];
  all('[data-rf-pair]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rfPair===pair)));
  all('[data-rf-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rfMetric===metric)));
  const sensitive=[];
  for(const rowMetric of Object.keys(metricInfo)){
   const values=data.cases.map(c=>c.pairs[pair][rowMetric][index]),scores=values.map(v=>rowMetric==='insertion_loss_db'?Math.abs(v):v),best=Math.min(...scores);
   const otherScores=data.cases.map(c=>{const v=c.pairs[pair].comparison_grid[rowMetric][index];return rowMetric==='insertion_loss_db'?Math.abs(v):v}),otherBest=Math.min(...otherScores);
   all('[data-rf-value="'+rowMetric+'"]').forEach((cell,i)=>{
    const number=document.createElement('span'),unit=document.createElement('span');number.className='rf-number';unit.className='rf-unit';
    number.textContent=values[i].toFixed(rowMetric==='insertion_loss_db'?3:1);unit.textContent=' dB';cell.replaceChildren(number,unit);
    const check=sensitivity(data.cases[i],rowMetric);
    cell.classList.toggle('rf-smallest',!check.flag&&Math.abs(scores[i]-best)<1e-9&&Math.abs(otherScores[i]-otherBest)<1e-9);
    cell.classList.toggle('rf-sensitive',check.flag);
    const digits=rowMetric==='insertion_loss_db'?4:2;
    const description=`${i+1}안 ${shortNames[rowMetric]} · 격자 변경 ${check.grid.toFixed(digits)} dB (검토 목표 ${check.gridLimit} dB), 주격자 응답 끝 5% 포함 여부 ${check.tail.toFixed(digits)} dB (검토 목표 ${check.tailLimit} dB)`;
    cell.title=description;
    if(check.flag)sensitive.push(description);
   });
  }
  $('#rf-sensitivity').hidden=sensitive.length===0;
  $('#rf-sensitivity summary').textContent='† 수치 민감도 확인 · '+sensitive.length+'개 값';
  const note=$('#rf-sensitivity div');note.replaceChildren();
  for(const description of sensitive){const p=document.createElement('p');p.textContent=description;note.append(p);}
  if(sensitive.length){const p=document.createElement('p');p.textContent='† 값은 반복 계산 검토 목표를 넘었습니다. 그래프와 표에는 실제 추출값을 유지했으며, 이 항목의 절대값은 수렴한 확정값으로 해석하지 않습니다. 검토 목표는 통신 합격선과 별개입니다.';note.append(p);}
  all('[data-rf-row]').forEach(row=>row.classList.toggle('rf-active-row',row.dataset.rfRow===metric));
  all('[data-rf-case]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.rfCase===selected)));
  const svg=$('#rf-chart'),width=svg.clientWidth,height=width<600?270:350;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.height=height+'px';svg.replaceChildren();
  svg.append(element('title',{},pair+' 페어, '+metricInfo[metric][0]+', 세 CAD의 1~150 MHz 계산값'));
  const box={x:width<600?49:60,y:18,w:width-(width<600?65:82),h:height-60};
  const ranges=data.cases.flatMap(c=>Object.values(c.pairs).flatMap(p=>[...p[metric],...(showGrid?(p.comparison_grid?.[metric]||[]):[])]));
  let lo,hi,tick;
  if(metric==='insertion_loss_db'){
   const min=Math.min(0,...ranges),max=Math.max(.01,...ranges),span=max-min;
   tick=Math.pow(10,Math.floor(Math.log10(span)));if(span/tick>7)tick*=2;
   lo=Math.floor(min/tick)*tick;hi=Math.ceil(max/tick)*tick;if(hi===lo)hi+=tick;
  }else{tick=10;lo=Math.floor(Math.max(-180,Math.min(...ranges))/10)*10;hi=Math.ceil(Math.max(...ranges)/10)*10;if(hi===lo)hi+=10;if((hi-lo)/tick>8)tick=20;}
  const X=f=>box.x+(f-1)/149*box.w,Y=v=>box.y+(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo)*box.h;
  for(let v=lo;v<=hi+tick/100;v+=tick){svg.append(element('line',{x1:box.x,y1:Y(v),x2:box.x+box.w,y2:Y(v),class:'rf-gridline'}));svg.append(element('text',{x:box.x-9,y:Y(v)+4,'text-anchor':'end',class:'rf-axis'},metric==='insertion_loss_db'?v.toFixed(Math.max(0,-Math.floor(Math.log10(tick)))):Math.round(v)));}
  for(const f of (width<600?[1,50,100,150]:[1,25,50,75,100,125,150]))svg.append(element('text',{x:X(f),y:box.y+box.h+22,'text-anchor':'middle',class:'rf-axis'},String(f)));
  svg.append(element('text',{x:box.x+box.w,y:height-5,'text-anchor':'end',class:'rf-axis'},'MHz'));
  data.cases.forEach((c,i)=>{
   const r=c.pairs[pair],makePath=values=>values.map((v,k)=>(k?'L':'M')+X(data.frequency_mhz[k]).toFixed(2)+','+Y(v).toFixed(2)).join('');
   if(showGrid&&r.comparison_grid)svg.append(element('path',{d:makePath(r.comparison_grid[metric]),stroke:colors[i],class:'rf-curve rf-comparison-curve'}));
   svg.append(element('path',{d:makePath(r[metric]),stroke:colors[i],'stroke-width':i===selected?3.2:1.8,class:'rf-curve'}));
   svg.append(element('circle',{cx:X(f),cy:Y(r[metric][index]),r:i===selected?5:3.5,fill:colors[i],stroke:'white','stroke-width':1.5}));
  });
  svg.append(element('line',{x1:X(f),y1:box.y,x2:X(f),y2:box.y+box.h,class:'rf-cursor'}));
  const receiver=element('rect',{x:box.x,y:box.y,width:box.w,height:box.h,fill:'transparent',class:'rf-chart-hit'});
  receiver.addEventListener('pointerdown',e=>{const rect=svg.getBoundingClientRect();selectFrequency(1+(e.clientX-rect.left-box.x)/box.w*149);});svg.append(receiver);
  const differences=data.cases.map(c=>c.pairs[pair].comparison_grid?Math.abs(c.pairs[pair][metric][index]-c.pairs[pair].comparison_grid[metric][index]):null);
  $('#rf-grid-delta').textContent=differences.every(v=>v!==null)?'현재 주파수의 격자 변경 차이 · '+differences.map((v,i)=>(i+1)+'안 '+v.toFixed(metric==='insertion_loss_db'?3:2)+' dB').join(' / '):'격자 비교 기록 없음';
  window.__balunRF={ready:true,snapshot:()=>({pair,metric,frequency_mhz:data.frequency_mhz[index],threeCases:data.cases.length,showGrid})};
 }
 $('#rf-frequency').addEventListener('input',e=>selectFrequency(e.target.value));$('#rf-frequency-number').addEventListener('change',e=>selectFrequency(e.target.value));
 all('[data-rf-metric]').forEach(b=>b.addEventListener('click',()=>{metric=b.dataset.rfMetric;render();}));
 all('[data-rf-pair]').forEach(b=>b.addEventListener('click',()=>{pair=b.dataset.rfPair;document.querySelector('[data-pair="'+pair+'"]').click();render();}));
 all('[data-rf-case]').forEach(b=>b.addEventListener('click',()=>document.querySelector('[data-phase="'+b.dataset.rfCase+'"]').click()));
 $('#rf-grid-comparison').addEventListener('change',e=>{showGrid=e.target.checked;render();});
 document.addEventListener('click',e=>{const button=e.target.closest('[data-phase],[data-select-phase],[data-pair]');if(!button)return;if(button.dataset.pair&&button.dataset.pair!=='all')pair=button.dataset.pair;render();});
 new ResizeObserver(render).observe($('#rf-chart'));render();
})();
