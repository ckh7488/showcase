/* Interactive explanatory geometry. No field solve or response interpolation. */
(() => {
  'use strict';
  const T=window.THREE, $=id=>document.getElementById(id), el=$('experiment-scene');
  const style=getComputedStyle(document.documentElement), col=n=>style.getPropertyValue('--sc-'+n).trim();
  const labelLines=document.createElementNS('http://www.w3.org/2000/svg','svg');labelLines.setAttribute('width','100%');labelLines.setAttribute('height','100%');labelLines.setAttribute('aria-hidden','true');labelLines.style.cssText='position:absolute;inset:0;pointer-events:none';$('trial-labels').prepend(labelLines);
  try {
    const renderer=new T.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6)); renderer.setClearColor(col('stage'));
    el.append(renderer.domElement);
    const scene=new T.Scene(), camera=new T.PerspectiveCamera(37,1,.05,3000);
    scene.add(new T.HemisphereLight(0xffffff,0x334444,1.2));
    const light=new T.DirectionalLight(0xffffff,.9);light.position.set(30,80,70);scene.add(light);
    const controls=new T.OrbitControls(camera,renderer.domElement); controls.enableDamping=false;controls.minDistance=3;controls.maxDistance=1800;
    let root, domain, grid, sleeve, points=[], pins=[], ends=[], kind='dm', params={...TEST_PLAN.defaults}, stub=true, visibleShield=true, visibleGrid=false, activeRole='all', currentCase='power', bondCount=0;
    const v=p=>new T.Vector3(...p);
    const mat=(color,opacity=1)=>new T.MeshStandardMaterial({color,roughness:.65,metalness:.1,transparent:opacity<1,opacity,depthWrite:opacity===1,side:T.DoubleSide});
    function box(g,p,size,color,opacity=1){const o=new T.Mesh(new T.BoxGeometry(...size),mat(color,opacity));o.position.copy(v(p));g.add(o);return o;}
    function line(g,ps,color,r=.15){const path=new T.CatmullRomCurve3(ps.map(v));const m=new T.Mesh(new T.TubeGeometry(path,Math.max(12,ps.length*2),r,7,false),mat(color));g.add(m);return m;}
    function wire(g,ps,color,r=.26){return line(g,ps,color,r);}
    function text(g,s,p,w=13,color=col('stage-ink')){const c=document.createElement('canvas');c.width=768;c.height=96;const x=c.getContext('2d');x.font='600 42px "Malgun Gothic", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle=color;x.fillText(s,384,48);const tx=new T.CanvasTexture(c);const m=new T.SpriteMaterial({map:tx,transparent:true,depthTest:false});const o=new T.Sprite(m);o.position.copy(v(p));o.scale.set(w,w/8,1);g.add(o);return o;}
    function resistor(g,a,b,title){line(g,[a,b],col('ground'),.13);const mid=v(a).add(v(b)).multiplyScalar(.5);const o=box(g,mid.toArray(),[1.1,1.1,2],col('phy'));o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),v(b).sub(v(a)).normalize());if(title)text(g,title,mid.clone().add(new T.Vector3(0,2,0)).toArray(),12);}
    function arrow(a,b,color){const start=v(a),d=v(b).sub(start),o=new T.ArrowHelper(d.clone().normalize(),start,d.length(),color,2,.85);root.add(o);}
    function marker(role,name,p,detail,id=role){const color=col(role==='source'?'rx':role==='probe'?'tx':'ground');const o=new T.Mesh(new T.SphereGeometry(1.05,16,10),mat(color));o.position.copy(v(p));root.add(o);const target=v(p).clone();const button=document.createElement('button');button.textContent=name;button.dataset.role=role;button.dataset.point=id;button.title=detail;button.onclick=()=>{focus(id);window.dispatchEvent(new CustomEvent('planner:point',{detail:{role,text:detail}}));};$('trial-labels').append(button);const leader=document.createElementNS('http://www.w3.org/2000/svg','line');leader.setAttribute('stroke',color);leader.setAttribute('stroke-width','1');leader.setAttribute('stroke-dasharray','3 3');leader.setAttribute('opacity','.75');labelLines.append(leader);points.push({role,id,name,target,button,detail,object:o,leader});}
    function dispose(){if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of [].concat(o.material)){m.map?.dispose();m.dispose();}}});}for(const p of points){p.button.remove();p.leader.remove();}points=[];pins=[];ends=[];root=new T.Group();scene.add(root);bondCount=0;}
    function boundary(size,center){const g=new T.BoxGeometry(...size),edges=new T.EdgesGeometry(g);g.dispose();domain=new T.LineSegments(edges,new T.LineBasicMaterial({color:col('line'),transparent:true,opacity:.18}));domain.position.copy(v(center));root.add(domain);grid=new T.GridHelper(size[0],14,col('ground'),col('muted'));grid.position.set(...center);grid.position.y=1;grid.visible=visibleGrid;root.add(grid);}
    function coupon(){
      const half=params.length*.2,h=params.height, L=params.length, pitch=params.pitch, dims=CABLE_SPEC.displayModel;
      // Display x is compressed to 0.4; the exported physical dimensions are unscaled.
      const pairCenters=dims.pairCenters_yz_mm;
      const palette=[col('tx'),col('phy'),col('rx'),col('line')];
      sleeve=new T.Group();sleeve.visible=visibleShield;root.add(sleeve);
      const skin=new T.Mesh(new T.CylinderGeometry(dims.foilRadius_mm,dims.foilRadius_mm,half*2,40,1,true),mat(col('line'),.24));skin.rotation.z=Math.PI/2;skin.position.y=h;skin.name='aluminum-mylar-foil';sleeve.add(skin);
      for(const x of [-half,half]){const rim=new T.Mesh(new T.TorusGeometry(dims.braidRadius_mm,.08,6,48),mat(col('line')));rim.rotation.y=Math.PI/2;rim.position.set(x,h,0);sleeve.add(rim);}
      const jacket=new T.Mesh(new T.CylinderGeometry(dims.jacketRadius_mm,dims.jacketRadius_mm,half*.28,40,1,true),mat(col('accent'),.35));jacket.rotation.z=Math.PI/2;jacket.position.set(half*.86,h,0);jacket.name='TPE-jacket-cutaway';root.add(jacket);
      // Braid texture is a visual identifier; the proposed EM model remains an equivalent shell.
      for(const hand of[-1,1])for(let strand=0;strand<6;strand++){const ps=[];for(let i=0;i<=160;i++){const a=hand*i/160*Math.PI*8+strand*Math.PI/3;ps.push(new T.Vector3(-half+2*half*i/160,h+dims.braidRadius_mm*Math.cos(a),dims.braidRadius_mm*Math.sin(a)));}sleeve.add(new T.Line(new T.BufferGeometry().setFromPoints(ps),new T.LineBasicMaterial({color:col('stage-ink'),transparent:true,opacity:.78})));}
      for(let pair=0;pair<4;pair++)for(let leg=0;leg<2;leg++){
        const ps=[],N=Math.ceil(L/pitch*40);
        const polarity=pair<2?'signal':params.wiring==='same'?(pair===2?'+':'0'):(leg===0?'+':'0');
        const color=pair<2?palette[pair]:col(polarity==='+'?'rx':'line');
        for(let i=0;i<=N;i++){const a=(i/N*L/pitch)*Math.PI*2+leg*Math.PI;ps.push([-half+2*half*i/N,h+pairCenters[pair][0]+dims.pairHelixRadius_mm*Math.cos(a),pairCenters[pair][1]+dims.pairHelixRadius_mm*Math.sin(a)]);}
        const path=new T.CatmullRomCurve3(ps.map(v));
        const insulation=new T.Mesh(new T.TubeGeometry(path,N,dims.insulationRadius_mm,8,false),mat(color,.46));root.add(insulation);
        const copper=new T.Mesh(new T.TubeGeometry(path,N,dims.conductorRadius_mm,8,false),mat(color));root.add(copper);
        const endpoint={pair,leg,polarity,near:ps[0],far:ps[N],color};ends.push(endpoint);
      }
      box(root,[0,-.5,0],[2*half+40,1,52],col('ground'),.35);
      text(root,'FINITE TEST REFERENCE', [0,1,20],50,col('ground'));
      // Differential fixtures bridge the two signal conductors, never ground each leg by default.
      for(const pair of [0,1])for(const side of ['near','far']){
        const list=ends.filter(e=>e.pair===pair),x=(side==='near'?-1:1)*(half+7),z=pair===0?-9:9;
        const a=[x,h+3,z-2],b=[x,h+3,z+2];
        wire(root,[list[0][side],a],list[0].color,.2);wire(root,[list[1][side],b],list[1].color,.2);resistor(root,a,b,side==='far'?'100 Ω diff':'');
        if(params.cmCap>0)for(const p of[a,b]){line(root,[p,[p[0],h*.5+.3,p[2]]],col('ground'),.1);line(root,[[p[0],h*.5-.3,p[2]],[p[0],0,p[2]]],col('ground'),.1);box(root,[p[0],h*.5-.3,p[2]],[1.7,.15,1.7],col('ground'));box(root,[p[0],h*.5+.3,p[2]],[1.7,.15,1.7],col('ground'));}
      }
      const a=[-half-12,h+8,-4],b=[-half-12,h+8,4],af=[half+13,h+8,-4],bf=[half+13,h+8,4];
      for(const end of ends.filter(e=>e.pair>=2)){wire(root,[end.near,end.polarity==='+'?a:b],end.color,.2);wire(root,[end.far,end.polarity==='+'?af:bf],end.color,.2);}
      resistor(root,af,bf,'100 Ω load');
      if(kind==='dm'){
        line(root,[a,b],col('rx'),.22);box(root,[-half-12,h+8,0],[2.7,3.3,3.3],col('rx'));text(root,'AC / 100 Ω',[-half-13,h+13,0],24,col('rx'));
        arrow([-half+7,h+8,-4],[-half+17,h+8,-4],col('rx'));arrow([-half+17,h+8,4],[-half+7,h+8,4],col('line'));
      }else{
        for(const p of[a,b]){line(root,[p,[p[0],0,p[2]]],col('rx'),.2);box(root,[p[0],h*.55,p[2]],[2.3,3.2,2.3],col('rx'));arrow([-half+6,h+8,p[2]],[-half+17,h+8,p[2]],col('rx'));}
        text(root,'IN PHASE / 2 × 50 Ω',[-half-10,h+14,0],34,col('rx'));
      }
      const bondXs=params.shield==='floating'?[]:params.shield==='near'?[-half]:[-half,half];
      for(const x of bondXs){wire(root,[[x,h,-dims.braidRadius_mm],[x-3,h*.5,-12],[x-3,0,-12]],col('ground'),.32);bondCount++;}
      text(root,params.wiring==='same'?'P3 +/+    P4 0/0':'P3 +/0    P4 +/0',[0,h+9,0],35,col('rx'));
      if(kind==='dm'){
        marker('source','① 전원 + / 0 V 사이',a,'이 점은 + 두 선이 모인 단자에 붙어 있습니다. 주황색 시험 소스는 여기와 0 V 묶음 단자 사이에 연결됩니다. 공중의 RF 발생원이 아닙니다.');
      }else{
        marker('source','①-A + 두 선에 연결',a,'+ 두 선이 모인 실제 그림의 접속점입니다. 이 묶음과 아래 시험판 사이의 주황색 AC 소스가 잡음을 넣습니다. ①-B와 같은 위상으로 구동하며 두 묶음을 서로 단락하지 않습니다.','source-plus');
        marker('source','①-B 0 V 두 선에 연결',b,'0 V 두 선이 모인 실제 그림의 접속점입니다. 이 묶음과 아래 시험판 사이에 두 번째 AC 소스가 연결됩니다. ①-A와 같은 위상으로 구동합니다.','source-zero');
      }
      marker('probe','②-A Ethernet 쌍 1',[half+7,h+5,-9],'Ethernet 쌍 1의 두 선 사이 잡음 전압을 별도로 읽습니다. 쌍 2도 동시에 관측하며 두 쌍을 서로 단락하지 않습니다. A/B는 관측점 이름이며 실제 TX/RX 핀 배정은 아직 미확정입니다.','probe-a');
      marker('probe','②-B Ethernet 쌍 2',[half+7,h+5,9],'Ethernet 쌍 2의 두 선 사이 잡음 전압을 별도로 읽습니다. 쌍 1의 결과를 복제하지 않습니다. 두 쌍 모두 각 끝에 100 Ω 차동 시험 종단을 둡니다.','probe-b');
      marker('shield','포일 + 편조 · '+({floating:'양끝 미접속',near:'분기 끝 접속',both:'양끝 접속'}[params.shield]),[0,h+dims.braidRadius_mm,0],'도면의 실드는 안쪽 알루미늄/Mylar 포일과 바깥 주석도금 구리 편조 두 층입니다. 매끈한 반투명 면과 은색 망으로 구분했습니다. 편조 피복률 규격은 최소 85%이며 화면의 망 간격은 설명용입니다. 실제 포일-편조 접촉은 미확인이고 단일 등가 실드는 초기 근사입니다.');
      marker('reference',kind==='dm'?'③ 0 V 두 선으로 리턴':'③ 두 소스의 리턴 → 시험판',kind==='dm'?b:[b[0],0,b[2]],kind==='dm'?'입력 리턴은 0 V 두 선입니다. 아래 시험판은 Vcm 관측 기준이며 0 V와의 의도적인 단락은 없습니다.':'보라색 점은 두 번째 소스의 아래 단자와 시험판이 만나는 지점입니다. 첫 번째 소스의 아래 단자도 같은 시험판에 연결됩니다. 건물 접지나 실제 테이블 접촉으로 대체하지 않습니다.');
      boundary([half*2+42,h+30,56],[0,(h+30)/2,0]);
      $('trial-badge').textContent=`${params.length} mm 시험편 · 도면 기반 단면 근사 / 피치 가정 · 길이 0.4배 표시`;
    }
    function reference(){
      const h=.254;box(root,[0,0,0],[100,.09,40],col('ground'),.65);box(root,[0,h/2,0],[100,h,40],col('phy'),.55);box(root,[0,h+.035,0],[100,.07,.6],col('rx'));
      if(stub)box(root,[0,h+.035,6],[.6,.07,12],col('rx'));
      text(root,'100 mm / w = 0.6 mm', [0,4,-8],50);text(root,'εr 3.66 / h = 0.254 mm',[0,1,20],55,col('ground'));
      if(stub)text(root,'OPEN STUB 12 mm',[0,2,13],28,col('rx'));
      marker('source','① 포트 1',[-40,2,0],'공식 예제의 포트 1. 소스·측정면과 전파 방향을 원본 예제대로 재현하는 것이 첫 실행입니다.');
      marker('probe','② 포트 2',[40,2,0],'공식 예제의 반사·전달을 확인한 뒤 스텁 없는 선로를 검증합니다. 마커는 설명 위치이며 정확한 포트 상자는 원본 코드에서 정합니다.');
      marker('reference','③ 아래 기준 도체',[0,1,-14],'마이크로스트립 유전체 아래의 금속면. 포트의 기준 도체이며 센서 GND를 뜻하지 않습니다.');
      boundary([116,22,50],[0,10,0]);sleeve=null;
      $('trial-badge').textContent='공식 MSL 예제 구조 · 스텁 ON/OFF는 형상 비교 · 계산 결과 없음';
    }
    function render(){if(!el.clientWidth||!root)return;for(const p of points)if(p.role==='shield')p.object.visible=visibleShield;renderer.render(scene,camera);const w=el.clientWidth,h=el.clientHeight,placed=[];const candidates=points.map(p=>({p,q:p.target.clone().project(camera)})).sort((a,b)=>b.q.y-a.q.y);
      for(const {p,q} of candidates){p.object.visible=p.role!=='shield'||visibleShield;p.button.hidden=!p.object.visible||q.z< -1||q.z>1;p.leader.style.display=p.button.hidden||Math.abs(q.x)>1||Math.abs(q.y)>1?'none':'';if(p.button.hidden)continue;const ew=p.button.offsetWidth,eh=p.button.offsetHeight;let x=Math.max(6,Math.min(w-ew-6,(q.x+1)*w/2-ew/2)),y=Math.max(42,Math.min(h-eh-8,(1-q.y)*h/2-eh-8));for(let n=0;n<12&&placed.some(r=>x<r.x+r.w+5&&x+ew+5>r.x&&y<r.y+r.h+3&&y+eh+3>r.y);n++)y=Math.min(h-eh-8,y+eh+5);const ax=(q.x+1)*w/2,ay=(1-q.y)*h/2;p.leader.setAttribute('x1',ax);p.leader.setAttribute('y1',ay);p.leader.setAttribute('x2',Math.max(x,Math.min(x+ew,ax)));p.leader.setAttribute('y2',Math.max(y,Math.min(y+eh,ay)));p.button.style.left=x+'px';p.button.style.top=y+'px';p.button.setAttribute('aria-pressed',String(activeRole===p.id||(activeRole==='probe'&&p.role==='probe')));placed.push({x,y,w:ew,h:eh});}
    }
    function reset(){activeRole='all';const half=kind==='reference'?58:params.length*.2+22,center=new T.Vector3(0,kind==='reference'?0:params.height*.55,0),dir=new T.Vector3(.48,.85,1.35).normalize();const radius=Math.max(half*1.24/(Math.tan(camera.fov*Math.PI/360)*camera.aspect), (kind==='reference'?42:params.height+25)/Math.tan(camera.fov*Math.PI/360));controls.target.copy(center);camera.position.copy(center).addScaledVector(dir,radius);controls.update();render();}
    function focus(role){activeRole=role;if(role==='all'){reset();return;}const selected=points.filter(p=>p.id===role||p.role===role);if(!selected.length)return;const target=selected.reduce((s,p)=>s.add(p.target),new T.Vector3()).multiplyScalar(1/selected.length);const cmSource=kind==='cm'&&selected[0].role==='source';if(cmSource)target.y=(params.height+8)/2;controls.target.copy(target);const dist=(cmSource?(params.height+12)*1.9:selected.length>1?46:kind==='reference'?28:Math.max(22,params.height*.8))/Math.min(camera.aspect,1);camera.position.copy(target).add(new T.Vector3(selected[0].role==='probe'?.8:-.7,.7,1).normalize().multiplyScalar(dist));controls.update();render();}
    function build(fit=true){dispose();if(kind==='reference')reference();else coupon();if(fit)reset();else render();$('trial-error').hidden=true;}
    function resize(){if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();reset();}
    new ResizeObserver(resize).observe(el);controls.addEventListener('change',render);
    el.addEventListener('keydown',e=>{if(e.key==='Home'){e.preventDefault();reset();return;}const s=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.12,s.phi-.12);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.12,s.phi+.12);else if(['+','='].includes(e.key))s.radius*=.86;else if(e.key==='-')s.radius*=1.14;else return;e.preventDefault();camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();});
    window.__trialScene={ready:true,setCase(test,p){kind=test.kind;currentCase=test.id;params={...p};visibleShield=true;build();resize();},setParams(p){params={...p};build(false);},setStub(value){stub=value;build(false);},setShieldVisible(value){visibleShield=value;if(sleeve)sleeve.visible=value;render();},setGridVisible(value){visibleGrid=value;grid.visible=value;render();},focus,reset,snapshot:()=>({ready:true,caseId:currentCase,kind,params:{...params},wireCount:ends.length,powerPairs:[2,3].map(i=>ends.filter(e=>e.pair===i).map(e=>e.polarity)),bondCount,shieldPresentInPlan:kind!=='reference',shieldVisible:visibleShield,gridVisible:visibleGrid,stub,role:activeRole,markers:points.map(p=>({id:p.id,role:p.role,name:p.name})),camera:camera.position.toArray(),solverRun:false,results:[]})};
    build();resize();
  }catch(e){$('trial-error').textContent='3D 표시 오류: '+e.message;console.error(e);}
})();
