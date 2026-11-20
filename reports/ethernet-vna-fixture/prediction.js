(() => {
  const data=window.ETHERNET_SMA_PREDICTION;if(!data)return;
  const modes={reflection:{label:'개방 입력 반사',symbol:'S11',connection:'SMA J3 / B · RJ45 외부 개방'},coupling:{label:'D→C 결합 (개방)',symbol:'S21',connection:'SMA J5 / D → J4 / C · RJ45 외부 개방'},matched:{label:'100 Ω 부하 정합',symbol:'S11',connection:'SMA J2 / A · RJ45 1–2번에 99.9 Ω 부하'},loopback:{label:'D→C 루프백 전달',symbol:'S21',connection:'SMA J5 / D → J4 / C · RJ45 7↔4 · 8↔5'}};
  let selected='reflection';
  let index=data.frequency_mhz.reduce((best,f,i)=>Math.abs(f-100)<Math.abs(data.frequency_mhz[best]-100)?i:best,0);
  modes.reflection.loads='나머지 SMA J2·J4·J5에 각각 50 Ω';
  modes.coupling.loads='나머지 SMA J2·J3에 각각 50 Ω';
  modes.matched.loads='나머지 SMA J3·J4·J5에 각각 50 Ω';
  modes.loopback.loads='나머지 SMA J2·J3에 각각 50 Ω · 루프백 선에 100 Ω 저항 없음';
  const fmt=(v,n=1)=>v.toFixed(n).replace('-','−');
  const frequencyText=()=>Number(data.frequency_mhz[index].toFixed(6))+' MHz';
  function sample(test){const curve=data.curves[test],re=curve.real[index],im=curve.imag[index];return {db:20*Math.log10(Math.hypot(re,im)),phase:Math.atan2(im,re)*180/Math.PI,resolved:curve.resolved[index]};}
  function draw(panel,test){
    const curve=data.curves[test],mode=modes[test],current=sample(test),frequency=data.frequency_mhz[index],$=selector=>panel.querySelector(selector);
    $('[data-prediction-title]').textContent=mode.label+' · '+mode.symbol;
    $('[data-prediction-connection]').textContent=mode.connection;
    $('[data-prediction-loads]').textContent=mode.loads;
    $('[data-prediction-value]').textContent=fmt(current.db);$('[data-prediction-phase]').textContent='위상 '+fmt(current.phase)+'°';
    $('[data-prediction-frequency]').textContent=frequencyText();$('[data-prediction-output]').textContent=frequencyText();$('[data-prediction-slider]').value=index;$('[data-prediction-slider]').setAttribute('aria-valuetext',frequencyText());
    $('[data-prediction-window]').textContent=current.resolved?'':'전체 기록 대비 3 ns·4 ns 절단 결과의 복소 차이가 명목 진폭의 10%를 넘습니다.';
    $('[data-prediction-window]').hidden=current.resolved;
    const svg=$('.prediction-chart'),width=svg.clientWidth||800,height=svg.clientHeight||245,pad={left:48,right:16,top:20,bottom:35};svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
    const values=[...curve.low,...curve.high],minimum=Math.min(...values),maximum=Math.max(...values);
    let step=test==='coupling'?20:minimum<-10?10:1;
    let low=Math.floor(minimum/step)*step,high=Math.max(0,Math.ceil(maximum/step)*step);if(high===low)low-=step;
    const x=f=>pad.left+(f-1)/199*(width-pad.left-pad.right),y=value=>pad.top+(high-value)/(high-low)*(height-pad.top-pad.bottom);
    const ns='http://www.w3.org/2000/svg';
    function add(tag,attrs,text){const element=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attrs))element.setAttribute(key,value);if(text!==undefined)element.textContent=text;svg.append(element);return element;}
    add('title',{},mode.label+' 사전 예측, 1–200 MHz, SMA 50 Ω 기준');
    for(let value=low;value<=high+.001;value+=step){add('line',{x1:pad.left,x2:width-pad.right,y1:y(value),y2:y(value),class:'prediction-grid'});add('text',{x:pad.left-8,y:y(value)+3,'text-anchor':'end',class:'prediction-axis'},fmt(value,0));}
    for(const f of (width<450?[1,100,200]:[1,50,100,150,200]))add('text',{x:x(f),y:height-12,'text-anchor':f===1?'start':f===200?'end':'middle',class:'prediction-axis'},String(f));
    add('text',{x:pad.left,y:12,class:'prediction-axis'},'dB');add('text',{x:width-pad.right,y:height-1,'text-anchor':'end',class:'prediction-axis'},'MHz');
    const pathFor=values=>values.map((value,i)=>(i?'L':'M')+x(data.frequency_mhz[i]).toFixed(2)+','+y(Math.max(low,Math.min(high,value))).toFixed(2)).join('');
    const band=pathFor(curve.high)+curve.low.map((_,j)=>{const i=curve.low.length-1-j;return 'L'+x(data.frequency_mhz[i]).toFixed(2)+','+y(curve.low[i]).toFixed(2);}).join('')+'Z';
    add('path',{d:band,fill:'#b9c9bf',opacity:.32});
    const showDifference=test==='coupling'&&Math.max(...curve.difference_db)>=low;
    $('.prediction-difference-key').hidden=!showDifference;
    if(showDifference){let drawing=false;const path=curve.difference_db.map((value,i)=>{if(value<low){drawing=false;return '';}const command=drawing?'L':'M';drawing=true;return command+x(data.frequency_mhz[i]).toFixed(2)+','+y(Math.min(high,value)).toFixed(2);}).join('');add('path',{d:path,fill:'none',stroke:'#9b7a56','stroke-width':1,'stroke-dasharray':'4 4'});}
    add('path',{d:pathFor(curve.db),fill:'none',stroke:'#197d71','stroke-width':2.2});
    add('line',{x1:x(frequency),x2:x(frequency),y1:pad.top,y2:height-pad.bottom,class:'prediction-cursor'});
    add('circle',{cx:x(frequency),cy:y(current.db),r:4,fill:'#197d71',stroke:'white','stroke-width':1.5});
    const hit=add('rect',{x:pad.left,y:pad.top,width:width-pad.left-pad.right,height:height-pad.top-pad.bottom,fill:'transparent',cursor:'crosshair'});
    hit.addEventListener('pointerdown',event=>{const rect=svg.getBoundingClientRect();index=Math.max(0,Math.min(data.frequency_mhz.length-1,Math.round((event.clientX-rect.left-pad.left)/(width-pad.left-pad.right)*(data.frequency_mhz.length-1))));update();});
  }
  function update(){draw(document.querySelector('[data-prediction-suite]'),selected);}
  document.querySelector('[data-prediction-slider]').addEventListener('input',event=>{index=Number(event.target.value);update();});
  document.querySelectorAll('[data-prediction-choose]').forEach(button=>button.addEventListener('click',()=>{
    selected=button.dataset.predictionChoose;
    document.querySelectorAll('[data-prediction-choose]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
    window.dispatchEvent(new CustomEvent('ethernet-test-change',{detail:{test:selected}}));update();
  }));
  window.addEventListener('resize',update);update();
  window.__ethernetPrediction={snapshot:()=>({selected,index,frequency_mhz:data.frequency_mhz[index],sample:sample(selected),classification:data.classification})};
})();
