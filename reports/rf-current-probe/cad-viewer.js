"use strict";
// The fixture is the saved FreeCAD/KiCad tessellation, in original millimetres.
// Only external cables, mating connectors and calibration standards are illustrative.
(() => {
  const T = THREE;
  const V = a => new T.Vector3(...a);
  const style = getComputedStyle(document.documentElement);
  const token = name => style.getPropertyValue(name).trim();
  const colors = {p1:token("--sc-accent"), p2:token("--sc-phy"), load:token("--sc-focus"),
    ink:token("--sc-ink"), stage:token("--sc-stage"), sig:"#e5af4d", ret:"#66d9c0"};
  const anchors = {input:[0,0,-35.05], output:[0,0,47.75], probe:[0,-41,15.95]};
  const moving = new Set(["Head_MovingTray","Head_MovingKeeper","Head_MovingCore","Head_LatchNut"]);
  const openOmissions = new Set(["Head_BackingPads","Head_RadialPads","Head_FrontPads","Head_KeeperScrews","Head_KeeperNuts","Head_LatchScrew"]);
  const signalParts = new Set(["Frame_SIG","InputCup","OutputCup","InputJumper","OutputJumper"]);
  const returnParts = new Set(["Frame_RET_L","Frame_RET_R","Input_GND","Output_GND"]);
  const isPCB = name => /^(Frame|InputPCB|OutputPCB|Input_GND|Output_GND|SMA|InputCup|OutputCup|InputJumper|OutputJumper)/.test(name);

  async function loadModel() {
    const [manifestResponse, binaryResponse] = await Promise.all([
      fetch("assets/fixture-cad.json?v=20260917-cad1"), fetch("assets/fixture-cad.bin?v=20260917-cad1")]);
    if (!manifestResponse.ok || !binaryResponse.ok) throw new Error("CAD 모델 파일을 불러오지 못했습니다.");
    const manifest = await manifestResponse.json(), buffer = await binaryResponse.arrayBuffer();
    return manifest.parts.map(p => {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(new Float32Array(buffer,p.vertex_offset,p.vertex_count*3),3));
      geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer,p.index_offset,p.index_count),1));
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      return {...p,geometry};
    });
  }

  class CADViewer {
    constructor(host, parts, kind) {
      this.host=host; this.kind=kind; this.mode="open"; this.path="all"; this.step=0;
      this.standard="thru"; this.standardPort=1; this.labels=[]; this.parts=new Map();
      this.scene=new T.Scene(); this.scene.background=new T.Color(colors.stage);
      this.camera=new T.OrthographicCamera(-150,150,110,-110,.1,2500);
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      this.renderer.outputEncoding=T.sRGBEncoding;
      this.renderer.domElement.tabIndex=0;
      this.renderer.domElement.setAttribute("aria-label",kind==="structure" ? "PCB 교정지그 원본 CAD. 방향키로 회전, 더하기 빼기로 확대, Home으로 초기화" : "현재 교정 단계의 실제 CAD 연결 배치. 방향키로 회전, 더하기 빼기로 확대, Home으로 초기화");
      this.renderer.domElement.setAttribute("role","img");
      host.prepend(this.renderer.domElement);
      this.overlay=document.createElement("div"); this.overlay.className="cad-labels"; host.append(this.overlay);
      this.lines=document.createElementNS("http://www.w3.org/2000/svg","svg");
      this.lines.setAttribute("class","cad-leaders"); this.lines.setAttribute("aria-hidden","true"); host.append(this.lines);
      this.scene.add(new T.HemisphereLight(0xffffff,0x5c6e72,.65));
      for(const [position,intensity] of [[[80,170,160],.95],[[-160,40,-90],.3]]) {
        const light=new T.DirectionalLight(0xffffff,intensity); light.position.copy(V(position)); this.scene.add(light);
      }
      this.fixture=new T.Group(); this.scene.add(this.fixture);
      for(const p of parts) {
        const metal=/SMA|Screw|Nut|Pin|Cup|Winding|Jumper/.test(p.name);
        const material=new T.MeshStandardMaterial({color:p.color,roughness:metal?.37:.78,metalness:metal?.45:.04,side:T.DoubleSide,flatShading:true});
        material.color.convertSRGBToLinear();
        const mesh=new T.Mesh(p.geometry,material); mesh.name=p.name;
        mesh.userData.baseColor=p.color; this.parts.set(p.name,mesh); this.fixture.add(mesh);
      }
      this.accessories=new T.Group(); this.scene.add(this.accessories);
      this.controls=new T.OrbitControls(this.camera,this.renderer.domElement);
      this.controls.enableDamping=false; this.controls.enablePan=true;
      this.controls.minZoom=.5; this.controls.maxZoom=5;
      this.controls.addEventListener("change",()=>this.render());
      this.renderer.domElement.addEventListener("keydown",event=>this.key(event));
      host.querySelector(".cad-loading")?.remove();
      this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(host);
      this.update(); this.reset(); this.resize(); host.dataset.ready="true";
    }

    clearAccessories() {
      this.accessories.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
      this.accessories.clear(); this.labels=[]; this.overlay.replaceChildren();this.lines.replaceChildren();
    }
    cylinder(origin,direction,start,length,radius,color,sides=32) {
      const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,sides),
        new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),metalness:.5,roughness:.35}));
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),V(direction));
      mesh.position.copy(V(origin).addScaledVector(V(direction),start+length/2));
      this.accessories.add(mesh); return mesh;
    }
    plug(origin,direction,color) {
      this.cylinder(origin,direction,0,7,4.4,"#bdc5cb",6);
      this.cylinder(origin,direction,7,6,3.4,"#8e9da4");
      this.cylinder(origin,direction,13,9,2.6,color);
    }
    cable(origin,direction,bends,color,name) {
      this.plug(origin,direction,color);
      const start=V(origin).addScaledVector(V(direction),20);
      const points=[start,...bends.map(V)];
      const curve=new T.CatmullRomCurve3(points,false,"centripetal");
      const mesh=new T.Mesh(new T.TubeGeometry(curve,64,2,10,false),
        new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.8})); mesh.name=name;this.accessories.add(mesh);
    }
    load(origin,direction,standard="50 Ω") {
      this.cylinder(origin,direction,0,6,4.5,"#bdc5cb",6);
      this.cylinder(origin,direction,6,13,4,standard==="50 Ω"?colors.load:"#d3ba72");
      this.cylinder(origin,direction,19,1.5,4.15,"#bdc5cb");
    }
    label(text,point,offset=[0,-35],type="") {
      const el=document.createElement("span"); el.className=`cad-label ${type}`;el.textContent=text;this.overlay.append(el);
      const line=document.createElementNS("http://www.w3.org/2000/svg","line");this.lines.append(line);
      const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");dot.setAttribute("r","3");this.lines.append(dot);
      this.labels.push({el,line,dot,point:V(point),offset});
    }
    structureLabels() {
      if(this.path==="signal") {
        this.label("중앙 SIG · 코어 안",[0,.8,6.35],[0,-48],"sig");
        this.label("SMA 중심 → 연결선",[0,.8,-16.5],[-92,-27],"sig");
      } else if(this.path==="return") {
        this.label("바깥 귀환 레일",[-55,1,6],[-25,-38],"ret");
        this.label("바깥 귀환 레일",[55,1,6],[35,-25],"ret");
        this.label("EndPanel · SMA 외피",[35,8,36.85],[35,46],"ret");
      } else {
        this.label("Frame PCB · 2개의 창",[48,.5,6.35],[66,-55]);
        this.label("EndPanel PCB",[-45,7,36.85],[-65,8]);
        this.label("IN",anchors.input,[-48,-12]);this.label("OUT",anchors.output,[45,20]);
        if(this.mode!=="pcb") this.label(this.mode==="open"?"집게 · 90° 열림":"집게 · 닫힘",this.mode==="open"?[-60,48,7]:[0,32,7],[-28,-35]);
      }
    }
    calibration() {
      const s=this.step;
      this.fixture.visible=s!==0;
      if(s===0) { this.solT(); return; }
      this.cable(anchors.input,[0,0,-1],[[0,0,-66],[-90,-5,-83],[-128,-23,-34],[-133,-40,68]],colors.p1,"P1-to-IN");
      this.label("P1 → IN",anchors.input,[-82,-26],"p1");
      this.label("VNA P1 쪽",[-133,-40,68],[-9,28],"p1");
      if(s<3) {
        this.cable(anchors.output,[0,0,1],[[0,0,81],[83,-9,112],[134,-30,64]],colors.p2,"OUT-to-P2");
        this.label("OUT → P2",anchors.output,[92,-20],"p2");
      } else {
        this.cable(anchors.probe,[0,0,1],[[0,-41,48],[73,-42,88],[134,-30,64]],colors.p2,"Probe-to-P2");
        this.load(anchors.output,[0,0,1]);
        this.label("OUT · 50 Ω 부하",[0,0,61],[93,-30],"load");
        this.label("프로브 출력 → P2",anchors.probe,[5,55],"p2");
      }
      this.label("VNA P2 쪽",[134,-30,64],[17,28],"p2");
      if(s===2) {
        this.load(anchors.probe,[0,0,1]);
        this.label("프로브 출력 · 50 Ω",[0,-41,30],[-2,55],"load");
      }
      if(s===1) this.label("중앙 SIG · 헤드 없음",[0,0,6],[7,-63],"sig");
      else this.label("중앙 SIG만 집게 안으로",[0,20,6],[-32,-67],"sig");
    }
    solT() {
      const thru=this.standard==="thru";
      const a=thru?[-6,0,0]:[-30,8,0], b=thru?[6,0,0]:[35,-15,15];
      this.cable(a,[-1,0,0],[[-60,0,0],[-95,-10,40],[-110,-15,70]],colors.p1,"P1-calibration-end");
      this.cable(b,[1,0,0],[[65,-15,15],[95,-12,40],[110,-15,70]],colors.p2,"P2-calibration-end");
      this.label("VNA P1 쪽",[-110,-15,70],[0,24],"p1");
      this.label("VNA P2 쪽",[110,-15,70],[0,24],"p2");
      if(thru) {
        this.cylinder([-6,0,0],[1,0,0],0,12,3.8,"#d3ba72");
        this.label("Thru · 두 케이블 끝 연결",[0,0,0],[0,-54]);
      } else {
        const onP1=this.standardPort===1, p=onP1?a:b, direction=onP1?[1,0,0]:[-1,0,0];
        const name={open:"Open",short:"Short",load:"Load"}[this.standard];
        this.load(p,direction,name);
        this.label(`${name} 표준 · P${this.standardPort} 끝`,V(p).addScaledVector(V(direction),12).toArray(),[0,-58],"load");
        this.label(`P${onP1?2:1} 끝 · 대기`,onP1?b:a,[35,38]);
      }
      this.host.dataset.activeStandard=this.standard;this.host.dataset.activePort=String(this.standardPort);
    }
    update() {
      this.clearAccessories();
      for(const [name,mesh] of this.parts) {
        mesh.position.set(0,0,0); mesh.rotation.set(0,0,0);mesh.visible=true;
        mesh.material.color.set(mesh.userData.baseColor).convertSRGBToLinear();mesh.material.opacity=1;mesh.material.transparent=false;mesh.material.depthWrite=true;
        if(this.kind==="structure") {
          if(this.mode==="pcb" || this.path!=="all") mesh.visible=isPCB(name);
          else if(this.mode==="open") {
            if(moving.has(name)){mesh.rotation.z=Math.PI/2;mesh.position.set(-40,40,0);}
            if(openOmissions.has(name))mesh.visible=false;
          }
          if(this.path!=="all") {
            const active=(this.path==="signal"?signalParts:returnParts).has(name);
            mesh.material.color.set(active?(this.path==="signal"?colors.sig:colors.ret):"#52656a").convertSRGBToLinear();
            if(!active){mesh.material.transparent=true;mesh.material.opacity=.27;mesh.material.depthWrite=false;}
          }
        } else if(this.step===1 && (name.startsWith("Head_")||name.startsWith("BenchPCB")))mesh.visible=false;
      }
      if(this.kind==="structure")this.structureLabels(); else this.calibration();
      this.host.dataset.activeStep=String(this.step);this.host.dataset.mode=this.mode;this.host.dataset.activePath=this.path;
      if(this.kind==="calibration") {
        this.host.dataset.p2=["standard","output","output","probe"][this.step];
        this.host.dataset.load=["standard","none","probe","output"][this.step];
      }
      this.render();
    }
    setStep(step) {const changed=(step===0)!==(this.step===0);this.step=step;this.update();if(changed)this.reset();}
    setMode(mode) {this.mode=mode;this.path="all";this.update();this.reset();}
    setPath(path) {this.path=path;this.update();this.reset();}
    setStandard(standard,port) {this.standard=standard;this.standardPort=port;this.update();}
    reset(view="overview") {
      const calibration=this.kind==="calibration", empty=calibration&&this.step===0;
      const pcb=this.kind==="structure"&&(this.mode==="pcb"||this.path!=="all");
      const opened=this.kind==="structure"&&this.mode==="open"&&this.path==="all";
      const target=empty?[0,-4,18]:pcb?[0,0,7]:opened?[0,5,12]:[0,-19,12];
      this.controls.target.copy(V(target));
      this.camera.up.set(0,1,0);
      const vector=view==="top"?[0,300,.01]:view==="front"?[0,45,320]:[205,170,270];
      this.camera.position.copy(V(target).add(V(vector)));
      this.span=empty?165:calibration?220:pcb?145:opened?245:200;
      this.camera.zoom=1;this.controls.update();this.resize();
    }
    zoom(factor) {this.camera.zoom=Math.min(5,Math.max(.5,this.camera.zoom*factor));this.camera.updateProjectionMatrix();this.render();}
    key(event) {
      if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault();const offset=this.camera.position.clone().sub(this.controls.target), s=new T.Spherical().setFromVector3(offset);
        if(event.key==="ArrowLeft")s.theta-=.12;if(event.key==="ArrowRight")s.theta+=.12;
        if(event.key==="ArrowUp")s.phi-=.12;if(event.key==="ArrowDown")s.phi+=.12;s.makeSafe();
        this.camera.position.copy(this.controls.target).add(new T.Vector3().setFromSpherical(s));this.controls.update();
      } else if(["+","=","-","Home"].includes(event.key)) {event.preventDefault();event.key==="Home"?this.reset():this.zoom(event.key==="-"?1/1.2:1.2);}
    }
    resize() {
      const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;
      this.renderer.setSize(w,h);const aspect=w/h;
      // Keep the entire assembly and both cable ends inside narrow phone views.
      const minWidth=this.kind==="calibration"?340:210;
      const height=Math.max(this.span||200,minWidth/aspect);
      this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;
      this.camera.top=height/2;this.camera.bottom=-height/2;
      this.camera.updateProjectionMatrix();this.render();
    }
    render() {
      this.renderer.render(this.scene,this.camera);
      const w=this.host.clientWidth,h=this.host.clientHeight;
      const placed=[];
      for(const label of this.labels) {
        const p=label.point.clone().project(this.camera), x=(p.x+1)*w/2, y=(1-p.y)*h/2;
        const half=label.el.offsetWidth/2+5;
        const narrow=w<480;
        let lx=Math.max(half,Math.min(w-half,x+label.offset[0]*(narrow?.48:1)));
        let ly=Math.max(18,Math.min(h-23,y+label.offset[1]*(narrow?.8:1)));
        const boxHeight=label.el.offsetHeight+7;
        const preferred=ly;
        for(const shift of [0,-1,1,-2,2,-3,3]) {
          const trial=Math.max(22,Math.min(h-23,preferred+shift*boxHeight));
          if(!placed.some(b=>Math.abs(lx-b.x)<half+b.half && Math.abs(trial-b.y)<(boxHeight+b.height)/2)) {ly=trial;break;}
        }
        placed.push({x:lx,y:ly,half,height:boxHeight});
        label.el.style.left=`${lx}px`;label.el.style.top=`${ly}px`;
        const outside=p.z>1||p.z< -1||x<0||x>w||y<0||y>h;
        label.el.hidden=outside;label.line.style.display=outside?"none":"";label.dot.style.display=outside?"none":"";
        for(const [a,v] of Object.entries({x1:x,y1:y,x2:lx,y2:ly}))label.line.setAttribute(a,v);
        label.dot.setAttribute("cx",x);label.dot.setAttribute("cy",y);
      }
    }
  }

  window.rfcpViewers={};
  const model=loadModel();
  async function init(host) {
    try {
      const kind=host.dataset.viewer, viewer=new CADViewer(host,await model,kind);window.rfcpViewers[kind]=viewer;
      document.querySelectorAll(`[data-for="${kind}"]`).forEach(button=>button.addEventListener("click",()=>{
        if(button.dataset.camera)viewer.reset(button.dataset.camera);
        if(button.dataset.zoom)viewer.zoom(Number(button.dataset.zoom));
      }));
      if(kind==="structure") {
        document.querySelectorAll("[data-assembly]").forEach(button=>button.addEventListener("click",()=>{
          document.querySelectorAll("[data-assembly]").forEach(b=>b.setAttribute("aria-pressed",String(b===button)));
          viewer.setMode(button.dataset.assembly);
          document.querySelector('[data-path="all"]').click();
        }));
      } else {
        viewer.setStep(Number(document.querySelector('[data-step][aria-pressed="true"]').dataset.step));
        const updateStandards=()=>{
          const standard=document.querySelector('[data-standard][aria-pressed="true"]').dataset.standard;
          const port=Number(document.querySelector('[data-standard-port][aria-pressed="true"]').dataset.standardPort);
          document.querySelector(".standard-ports").hidden=standard==="thru";
          document.getElementById("standard-note").textContent=standard==="thru"?"Thru를 두 케이블 끝 사이에 연결합니다. 실제 키트의 성별·지연값을 교정 설정에 반영합니다.":`P${port} 케이블 끝에 선택한 표준 한 개를 연결합니다. 각 포트에서 Open → Short → Load를 순서대로 측정합니다.`;
          viewer.setStandard(standard,port);
        };
        for(const selector of ["[data-standard]","[data-standard-port]"])document.querySelectorAll(selector).forEach(button=>button.addEventListener("click",()=>{
          document.querySelectorAll(selector).forEach(b=>b.setAttribute("aria-pressed",String(b===button)));updateStandards();
        }));
        updateStandards();
      }
    } catch(error) {
      host.dataset.ready="error";
      const notice=host.querySelector(".cad-loading");if(notice)notice.textContent="3D를 불러오지 못했습니다. 아래 원본 CAD 이미지와 단계별 연결 설명을 확인하세요.";
      console.error(error);
    }
  }
  document.querySelectorAll("[data-viewer]").forEach(init);
})();
