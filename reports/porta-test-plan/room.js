(() => {
  const $=id=>document.getElementById(id),el=$('room-scene'),labelsEl=$('room-labels'),error=$('room-error');
  try{
    const T=THREE,css=getComputedStyle(document.documentElement),color=k=>new T.Color(css.getPropertyValue(k).trim());
    const colors={metal:color('--sc-muted'),dark:color('--sc-stage'),black:color('--sc-ink'),pcb:color('--sc-accent'),pcb2:color('--sc-phy'),power:color('--sc-focus'),ethernet:color('--sc-tx'),signal:color('--sc-ground')};
    const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputEncoding=T.sRGBEncoding;el.append(renderer.domElement);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.2,20000),controls=new T.OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=50;controls.maxDistance=11000;
    scene.add(new T.HemisphereLight(0xffffff,colors.dark,.9));const sun=new T.DirectionalLight(0xffffff,.85);sun.position.set(900,2000,1200);scene.add(sun);
    const assembly=new T.Group(),external=new T.Group(),shell=new T.Group(),baseGroup=new T.Group(),cutShell=new T.Group(),mechanics=new T.Group(),wireGroup=new T.Group(),roomWires=new T.Group();scene.add(assembly,external);assembly.add(shell,baseGroup,cutShell,mechanics,wireGroup);external.add(roomWires);
    const mat=(c,opts={})=>new T.MeshStandardMaterial({color:c,roughness:.6,metalness:.12,...opts}),metal=mat(colors.metal,{metalness:.6}),black=mat(colors.black),plastic=mat(color('--sc-line')),gold=mat(color('--sc-focus'),{metalness:.55});
    const selectable=[],labels=[];let view='room',explode=0,focusKey=null;
    function tag(o,key,text){o.userData={key,text};selectable.push(o);return o;}
    function box(g,x,y,z,w,h,d,m){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;}
    function cyl(g,x,y,z,r,h,m,r2=r){const o=new T.Mesh(new T.CylinderGeometry(r2,r,h,48),m);o.position.set(x,y,z);g.add(o);return o;}
    function tube(g,points,r,c,segs=60){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const o=new T.Mesh(new T.TubeGeometry(curve,segs,r,8,false),mat(c));g.add(o);return o;}
    function label(text,parent,xyz,modes,priority=1){const e=document.createElement('span');e.textContent=text;labelsEl.append(e);labels.push({el:e,parent,point:new T.Vector3(...xyz),modes,priority});}
    function ring(g,y,outer,inner,h,m){const s=new T.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(hole);const o=new T.Mesh(new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:40}),m);o.rotation.x=-Math.PI/2;o.position.y=y;g.add(o);return o;}
    const built=buildAtlasSensor({T,assembly,shell,baseGroup,cutShell,mechanics,wireGroup,mat,metal,black,plastic,gold,colors,data:BOARD_COMPONENTS,tag,box,cyl,tube,label,ring});
    // All room coordinates below are display-only. They do not enter model-inputs.json.
    const tableTop=727.5;
    const sensorBottom=new T.Box3().setFromObject(assembly).min.y;
    assembly.position.set(800,tableTop-sensorBottom,130);
    const table=box(external,1010,710,-40,1020,35,700,metal);
    tag(table,'table','철제 테스트 테이블 · 센서와 SMPS를 함께 올려놓음. 별도 접지선은 없으며 실제 접촉저항·테이블 치수는 미확인입니다. 아노다이징 센서를 이상적인 절연체 또는 접지 단락으로 확정하지 않습니다.');
    for(const x of [550,1470])for(const z of [-340,260])box(external,x,350,z,35,700,35,metal);
    const floor=box(external,0,-12,0,3100,20,1900,mat(color('--sc-muted'),{transparent:true,opacity:.18}));tag(floor,'floor','바닥 · 재질/높이/주변 도체 미확인. 화면의 크기는 표시용이며 PEC 접지면으로 확정하지 않습니다.');
    box(external,0,420,-940,3100,850,15,mat(color('--sc-muted'),{transparent:true,opacity:.1}));
    const desk=box(external,-900,710,-120,900,35,600,mat(color('--sc-phy'),{transparent:true,opacity:.45}));tag(desk,'floor','책상 · PC가 위에 있다는 점만 확인. 재질·치수·접지는 미확인입니다.');for(const x of [-1280,-520])for(const z of [-360,100])box(external,x,350,z,28,700,28,metal);
    const pc=box(external,-1090,790,15,310,125,235,black);tag(pc,'pc','러기드 PC · 책상 위. 외형/치수는 개념 표현, NIC·전원 공급 방식·PE 연결은 미확인입니다.');for(let i=0;i<10;i++)box(external,-1220+i*28,856,15,7,10,220,metal);const lanPort=box(external,-926,785,65,17,27,36,plastic);tag(lanPort,'pc','PC LAN 포트 · 상용 랜선이 직결됩니다. 내부 PHY/마그네틱 모델은 미확보입니다.');
    const mon=box(external,-710,1010,-230,410,255,28,black);box(external,-710,1010,-210,374,218,5,mat(color('--sc-accent'),{emissive:color('--sc-accent'),emissiveIntensity:.15}));box(external,-710,800,-230,35,180,30,metal);box(external,-710,738,-200,190,12,140,black);tag(mon,'monitor','모니터 · PC와 같은 멀티탭, HDMI로 PC 연결. 외형/치수와 접지 방식은 미확인입니다.');
    const dongle=box(external,-1090,786,139,18,12,32,plastic);tag(dongle,'dongle','마우스·키보드 공용 무선 동글. 그림의 장착 포트는 표시용입니다.');
    const oa=box(external,-1200,330,-923,90,95,18,plastic),ob=box(external,1220,330,-923,90,95,18,plastic);tag(oa,'oa','아웃렛 A · 220 VAC · PC와 모니터 공급. 실제 벽면 위치는 미확인입니다.');tag(ob,'ob','아웃렛 B · 같은 방의 다른 콘센트. A와의 분기/PE 관계는 미확인입니다.');
    const sa=box(external,-1230,30,-610,260,42,70,plastic),sb=box(external,1200,30,-610,260,42,70,plastic);tag(sa,'sa','멀티탭 A · PC + 모니터. 바닥 위치와 방향은 표시용입니다.');tag(sb,'sb','멀티탭 B · SMPS. 실제 위치는 미확인입니다.');for(const x of [-1310,-1230,-1150,1120,1200,1280])cyl(external,x,52,-610,16,2,black);
    // Manufacturer envelope: 215 x 115 x 30 mm. Vents and terminals are display approximations.
    const smps=box(external,1250,tableTop+15,-230,215,30,115,metal);
    tag(smps,'smps','MEAN WELL LRS-350-24 · 215 × 115 × 30 mm (제조사). L/N/FG에 전원 코드 3선 연결 확인. 제조사 FG↔외함 연속성 자료가 있으며 테이블과의 실제 접촉은 미확인입니다. V−와 FG는 자동으로 묶지 않습니다.');
    for(let i=0;i<12;i++)box(external,1160+i*16,tableTop+30.5,-230,5,1,85,black);
    box(external,1140,tableTop+12,-230,12,15,107,plastic);
    for(let i=0;i<9;i++)cyl(external,1138,tableTop+21,-278+i*12,3.3,2,gold);
    tube(roomWires,[[-1200,330,-910],[-1260,160,-780],[-1360,30,-670],[-1360,30,-610]],5,colors.metal);tube(roomWires,[[1220,330,-910],[1250,160,-780],[1350,30,-670],[1330,30,-610]],5,colors.metal);
    tube(roomWires,[[-1160,45,-610],[-1110,60,-490],[-1090,500,-330],[-1120,740,-110]],5,colors.power);tube(roomWires,[[-1230,45,-610],[-800,50,-500],[-690,400,-350],[-710,900,-230]],5,colors.power);tube(roomWires,[[1200,45,-610],[1210,300,-480],[1170,tableTop+20,-360],[1135,tableTop+16,-274]],5,colors.power);
    tube(roomWires,[[-1000,790,-100],[-900,760,-160],[-790,780,-260],[-710,900,-230]],4,colors.signal);
    // All eight conductors share the long cable. The far-end breakout is physically near the SMPS; it has no active device.
    const breakoutGroup=new T.Group();roomWires.add(breakoutGroup);breakoutGroup.position.set(1775,700,-510);
    const coupler=box(breakoutGroup,-680,45,360,58,28,26,plastic);tag(coupler,'coupler','수동 RJ45 암–암 커플러 · 분기된 Ethernet 네 선과 상용 랜선을 연결합니다. 위치·외형은 표시용입니다.');
    const plug=box(breakoutGroup,-637,45,360,28,22,22,plastic);tag(plug,'plug','플라스틱 RJ45 · Ethernet 두 꼬임쌍 연결. 편조는 미접속입니다.');
    tube(roomWires,[[-925,785,65],[-850,700,170],[-760,45,460],[400,45,680],[960,400,380],[1065,745,-150]],4,colors.ethernet);
    function shownPair(x0,x1,y,z,c,key,description){
      for(let side=0;side<2;side++){
        const pts=[];for(let i=0;i<=160;i++){const u=i/160,a=u*Math.PI*2*5+side*Math.PI;const spread=.3+.7*Math.min(1,u*4);pts.push([x0+(x1-x0)*u,47+(y-47)*spread+2*Math.sin(a),368+(z-368)*spread+2*Math.cos(a)]);}
        const wire=tube(breakoutGroup,pts,1.2,c,180);tag(wire,key,description+' 꼬임 피치·선경·색·단면 배열은 표시용입니다.');
      }
    }
    shownPair(-416,-620,47,355,colors.ethernet,'cable','Ethernet 꼬임쌍 1. ');
    shownPair(-416,-620,42,365,color('--sc-phy'),'cable','Ethernet 꼬임쌍 2. ');
    shownPair(-416,-553,55,381,colors.power,'breakout','전원 꼬임쌍 3: +24 V / +24 V. ');
    shownPair(-416,-553,40,382,color('--sc-line'),'breakout','전원 꼬임쌍 4: 0 V / 0 V. ');
    // Short open-ended braid sleeve illustrates its presence, not measured mesh or coverage.
    const braid=new T.Mesh(new T.CylinderGeometry(13,13,34,18,6,true),mat(color('--sc-line'),{wireframe:true}));braid.rotation.z=Math.PI/2;braid.position.set(-432,47,368);breakoutGroup.add(braid);tag(braid,'braid','편조 실드 · PC 쪽과 센서 쪽 모두 미접속. 이 확대부는 구조 설명이며 실물의 탈피 길이·편조 피복률이 아닙니다.');
    for(let i=0;i<4;i++){
      const isPlus=i<2,dy=(i%2)*4-2,z0=isPlus?381:382,y0=isPlus?55:40;
      const lead=tube(roomWires,[[1222,700+y0,z0-510+(i%2?-2:2)],[1200,tableTop+25+dy,-120+i*4],[1160,tableTop+20+dy,-160],[1135,tableTop+16,-230+(isPlus?30:-8)+(i%2)*8]],1.7,isPlus?colors.power:color('--sc-line'),180);
      tag(lead,'breakout',isPlus?'SMPS +V → SMPS 근처 분기: +24 V 두 선. 분기선 길이/공간 배열 미확정.':'SMPS −V → SMPS 근처 분기: 0 V 두 선. 분기선 길이/공간 배열 미확정.');
    }
    const points=[[1360,747,-142],[1460,747,90],[1545,660,280],[1440,160,440],[700,35,410],[-380,28,320]];
    for(let i=0;i<=900;i++){const a=Math.PI+Math.PI*2*10*i/900;points.push([-90+(260+8*i/900)*Math.cos(a),18+40*i/900,280+(260+8*i/900)*Math.sin(a)]);}
    points.push([230,30,350],[520,30,360],[700,350,310],[779,assembly.position.y-22,169]);
    const coil=tube(roomWires,points,5.7,color('--sc-line'),1200);tag(coil,'cable','20 m 복합 케이블 · Ethernet 2쌍 + (+24 V/+24 V) 1쌍 + (0 V/0 V) 1쌍. 양끝 미접속 편조 실드. 실제 코일 지름·횟수·케이블 외경은 미확정이며 이 표시 곡선을 solver 입력으로 쓰지 않습니다.');
    label('아웃렛 A → 멀티탭 A',external,[-1200,390,-900],['room']);
    label('아웃렛 B → 멀티탭 B',external,[1230,390,-900],['room']);
    label('러기드 PC · 책상 위',external,[-1100,930,60],['room']);
    label('모니터 · HDMI',external,[-670,1190,-230],['room']);
    label('SMPS 근처 분기 · Ethernet / 전원',breakoutGroup,[-640,110,370],['room']);
    label('20 m · 8선 함께 · 바닥 코일',external,[-80,100,320],['room']);
    label('LRS-350-24 · L/N/FG 연결',external,[1230,810,-230],['room']);
    label('센서 · 철제 테이블 위',assembly,[100,440,0],['room']);
    label('같은 철제 테이블 · 접촉 미확인',external,[1100,750,200],['room']);
    label('긴 상용 랜선 → PC',roomWires,[180,70,650],['room']);
    label('RJ45 → 수동 암–암 → PC',breakoutGroup,[-725,55,360],['breakout']);
    label('Ethernet · 두 꼬임쌍',breakoutGroup,[-590,85,350],['breakout']);
    label('+24 V / +24 V 꼬임쌍',breakoutGroup,[-560,68,390],['breakout']);
    label('0 V / 0 V 꼬임쌍',breakoutGroup,[-550,22,400],['breakout']);
    label('편조 끝 · 미접속',breakoutGroup,[-440,80,365],['breakout']);
    label('20 m 공통 외피 → M12',breakoutGroup,[-420,32,350],['breakout']);
    const visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
    function fit(objects,dir,padding=1.12){scene.updateMatrixWorld(true);const bounds=new T.Box3();for(const o of objects)bounds.expandByObject(o);const center=bounds.getCenter(new T.Vector3()),d=dir.clone().normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),d).normalize(),up=new T.Vector3().crossVectors(d,right).normalize(),tan=Math.tan(T.MathUtils.degToRad(camera.fov/2));let dist=0;for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){const v=new T.Vector3(x,y,z).sub(center),front=v.dot(d);dist=Math.max(dist,Math.abs(v.dot(right))/(tan*camera.aspect)+front,Math.abs(v.dot(up))/tan+front);}controls.target.copy(center);camera.position.copy(center).addScaledVector(d,dist*padding);camera.lookAt(center);controls.update();}
    function setView(next){focusKey=null;view=next;external.visible=next==='room'||next==='breakout';assembly.visible=next!=='breakout';mechanics.visible=next!=='boards';baseGroup.visible=next!=='boards';shell.visible=(next==='room'||next==='sensor')&&$('room-shell').checked;cutShell.visible=next==='inside'&&explode===0;$('room-shell').disabled=next==='boards'||next==='breakout';if(next==='inside')$('room-shell').checked=false;built.setLayout(next,explode);for(const b of document.querySelectorAll('[data-room]'))b.setAttribute('aria-pressed',String(b.dataset.room===next));$('room-badge').textContent=next==='room'?'배치 개념도 · 분기선 길이·거리·코일 치수 미확정':next==='breakout'?'사용자 확인: 4개 꼬임쌍 · 피치·색·편조 끝 형상은 표시용':next==='boards'?'KiCad 부품 XY · 몸체 높이/하네스 근사':next==='inside'?'PPT 기구 순서 + 현재 2단 PCB · 기계 치수 일부 근사':'ATLAS 조립 형상 · 접촉면/재질 미확정';if(next==='breakout')fit([breakoutGroup],new T.Vector3(.15,1,1),1.22);else if(next==='room')fit([external,assembly],new T.Vector3(.27,.55,1));else if(next==='boards')fit([built.motorBoard,built.controlBoard],new T.Vector3(.75,1,.8),1.22);else fit([assembly],new T.Vector3(.6,.35,1),1.16);draw();}
    function draw(){
      renderer.render(scene,camera);const w=el.clientWidth,h=el.clientHeight,placed=[],candidates=[];
      for(const l of labels){
        l.el.hidden=true;
        if(!l.modes.includes(view)||!visible(l.parent))continue;
        if(focusKey&&!({smps:/^LRS-|^SMPS 근처 분기/,pc:/^러기드 PC|^모니터/,table:/^같은 철제|^센서 ·|^LRS-/}[focusKey]?.test(l.el.textContent)))continue;
        if(w<500&&view==='room'&&!/^(러기드 PC|20 m|LRS-350-24|센서 ·)/.test(l.el.textContent))continue;
        const p=l.parent.localToWorld(l.point.clone()).project(camera);
        if(p.z>1||p.z< -1)continue;candidates.push({l,p});
      }
      // Keep label order consistent with the projected geometry when avoiding collisions.
      candidates.sort((a,b)=>b.p.y-a.p.y);
      for(const {l,p} of candidates){
        l.el.hidden=false;const ew=l.el.offsetWidth,eh=l.el.offsetHeight;
        let x=Math.max(5,Math.min(w-ew-5,(p.x+1)*w/2)),y=Math.max(38,Math.min(h-eh-5,(1-p.y)*h/2));
        for(let j=0;j<12&&placed.some(r=>x<r.x+r.w&&x+ew>r.x&&y<r.y+r.h&&y+eh>r.y);j++)y=Math.min(h-eh-5,y+eh+3);
        l.el.style.left=x+'px';l.el.style.top=y+'px';placed.push({x,y,w:ew,h:eh});
      }
    }
    function resize(){if(!el.clientWidth||!el.clientHeight)return;renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();setView(view);}new ResizeObserver(resize).observe(el);controls.addEventListener('change',draw);
    for(const b of document.querySelectorAll('[data-room]'))b.onclick=()=>setView(b.dataset.room);$('room-reset').onclick=()=>setView(view);$('room-fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('room-wrap').requestFullscreen?.();};
    $('room-shell').onchange=()=>{shell.visible=$('room-shell').checked;cutShell.visible=!shell.visible&&view==='inside'&&explode===0;draw();};$('room-explode').oninput=()=>{explode=Number($('room-explode').value);$('room-gap').textContent=explode+'%';built.setLayout(view,explode);if(explode){shell.visible=false;cutShell.visible=false;$('room-shell').checked=false;}setView(view);};$('room-cables').onchange=()=>{roomWires.visible=$('room-cables').checked;draw();};
    let down;renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(selectable.filter(visible))[0];if(hit){$('room-detail').textContent=hit.object.userData.text.replace('約','약');const mapping={Control_board:'lan',Motor_board:'power',encoder_interposer_rs422:'mcu',shell:'chassis',slip:'slip',gear:'motor',encoder:'mcu'};window.selectSetupNode?.(mapping[hit.object.userData.key]||hit.object.userData.key);}});
    el.addEventListener('keydown',e=>{const offset=camera.position.clone().sub(controls.target),s=new T.Spherical().setFromVector3(offset);if(e.key==='Home'){e.preventDefault();setView(view);return;}if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.15,s.phi-.12);else if(e.key==='ArrowDown')s.phi=Math.min(Math.PI-.15,s.phi+.12);else if(['+','='].includes(e.key))s.radius*=.88;else if(e.key==='-')s.radius*=1.12;else return;e.preventDefault();camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(s));controls.update();draw();});
    error.hidden=true;resize();window.__labRoom={ready:true,selectView:setView,focusPart:key=>{setView("room");focusKey=key;const items=selectable.filter(o=>o.userData.key===key);if(items.length){fit(items,new T.Vector3(.3,.65,1),1.4);draw();}},snapshot:()=>({view,focusKey,explode,shell:shell.visible,parts:selectable.length,compositeCable:true,breakoutNearSmps:true,branchLeadRelativeLengths:{power:"short",commercialEthernet:"long"},pairs:["Ethernet 1","Ethernet 2","+24V/+24V","0V/0V"],shieldEndBonds:[false,false],sensorAndSmpsOnSteelTable:true,smpsDimensionsMm:[215,115,30],camera:camera.position.toArray(),displayOnly:true})};
  }catch(e){error.textContent='3D 표시 오류: '+e.message;console.error(e);}
})();
