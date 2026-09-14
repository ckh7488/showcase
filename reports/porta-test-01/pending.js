/* Configuration comparison and saved execution state, separate from reviewed findings. */
(()=>{
 'use strict';const $=id=>document.getElementById(id),svg=$('wiring-diagram'),NS='http://www.w3.org/2000/svg',css=getComputedStyle(document.documentElement),col=n=>css.getPropertyValue('--sc-'+n).trim();
 let wiring='same';
 function draw(){
  svg.replaceChildren();const narrow=svg.clientWidth<500;svg.setAttribute('viewBox',narrow?'0 0 340 340':'0 0 620 275');
  const add=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);return e;};
  const pairs=wiring==='same'?[['+24 V','+24 V'],['0 V','0 V']]:[['+24 V','0 V'],['+24 V','0 V']];
  [['전원 쌍 A',pairs[0]],['전원 쌍 B',pairs[1]],['Ethernet 쌍 A',['신호 +','신호 −']],['Ethernet 쌍 B',['신호 +','신호 −']]].forEach(([label,roles],i)=>{
   const y=narrow?49+i*80:38+i*61,c=col(i<2?'focus':'accent');add('text',{x:8,y:narrow?y-24:y+5},label);
   for(let k=0;k<2;k++){
    const sign=k?1:-1,points=[];for(let j=0;j<=120;j++){const x=narrow?16+j*1.77:150+j*2.35,py=y+sign*9*Math.cos(j/120*Math.PI*6);points.push([x,py]);}
    add('polyline',{points:points.map(p=>p.join(',')).join(' '),stroke:c,'stroke-width':k?2:3,fill:'none','stroke-dasharray':k?'5 3':'none'});
    add('circle',{cx:narrow?228.4:432,cy:y+sign*9,r:3.5,fill:c});
    add('text',{x:narrow?247:449,y:y+sign*12+5},roles[k]);
   }
  });
  for(const k of['same','mixed'])$('wiring-'+k).setAttribute('aria-pressed',String(k===wiring));
  $('wiring-title').innerHTML=wiring==='same'?'+끼리 한 쌍,<br>0 V끼리 한 쌍.':'+와 0 V를<br>각 쌍에 함께.';
  $('wiring-note').textContent=wiring==='same'?'실제로 사용한 전원 배정입니다.':'전원 두 쌍의 배정을 바꾼 비교 조건입니다. Ethernet 두 쌍은 그대로입니다.';
  svg.setAttribute('aria-label',(wiring==='same'?'현재 배선: 전원 +/+와 0/0':'비교 배선: 전원 +/0과 +/0')+', Ethernet 두 쌍은 동일');
 }
 for(const k of['same','mixed'])$('wiring-'+k).onclick=()=>{wiring=k;draw();};
 async function progress(){
  try{
   const r=await fetch('data/connected-progress.json',{cache:'no-store'});if(!r.ok)throw Error('상태 자료 없음');const data=await r.json();
   const labels={not_started:'미시작',queued:'순서 대기',on_hold:'검토 대기',preparing:'준비 연산',fields:'시간 계산 중',complete:'계산 기록 확보',error:'검토 필요'};
   $('run-grid').replaceChildren();
   for(const row of data.rows){const div=document.createElement('div');div.className='run-card'+(['preparing','fields'].includes(row.stage)?' active':'');const small=document.createElement('small');small.textContent=(row.wiring==='same'?'현재':'비교')+' 배선 · '+(row.mesh==='coarse'?'기본':'세분화')+' 격자';const strong=document.createElement('strong');strong.textContent=labels[row.stage]||'확인 필요';const span=document.createElement('span');span.textContent=row.time_ns!==undefined?'관측 '+row.time_ns.toFixed(2)+' ns':'—';div.append(small,strong,span);$('run-grid').append(div);}
   $('progress-time').textContent='마지막 저장 · '+new Date(data.updatedAtUTC).toLocaleString('ko-KR');
   window.__test01.progress=data;
  }catch(e){$('progress-time').textContent='저장 상태를 불러오지 못했습니다.';}
 }
 new ResizeObserver(draw).observe(svg);
 draw();window.__test01={ready:true,snapshot:()=>({wiring}),progress:null};progress();setInterval(progress,30000);
})();
