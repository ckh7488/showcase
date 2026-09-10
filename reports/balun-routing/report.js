(()=>{
  'use strict';
  const data=window.REVIEW_DATA,$=s=>document.querySelector(s),all=s=>Array.from(document.querySelectorAll(s));
  let phaseIndex=2,pair='all',scene,renderer,camera,controls,signalGroup,topView=true,fullView=false,showGround=false;
  const decision=[
    ['두 페어의 길이를 맞추고, B는 층을 전환했다.','A/B 모두 P와 N의 중심선 길이를 맞췄습니다. N선에는 보정 우회로가 있고, B 페어는 신호 비아 두 개를 거쳐 Molex 단자로 연결됩니다.'],
    ['큰 우회로와 층 전환을 줄였다.','두 페어 모두 F.Cu에 모이고 신호 비아가 없어졌습니다. 이때 A 1.388 mm, B 1.752 mm의 길이 차이가 남았습니다.'],
    ['정리한 형상 안에서 길이 차이를 다시 줄였다.','신호 비아 0개를 유지하면서 두 페어 모두 길이 차이를 1 mm 미만으로 줄였습니다. 좁은 0.15 mm 구간도 제거했습니다. 아래 주파수 응답에서 실제 변화의 크기를 비교합니다.']
  ];
  function setPhase(n){
    phaseIndex=n;const p=data.phases[n];
    all('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.phase===n)));
    all('[data-select-phase]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.selectPhase===n)));
    all('[data-phase-col]').forEach(cell=>cell.classList.toggle('is-selected',+cell.dataset.phaseCol===n));
    for(const letter of ['A','B']){
      const lp=p.routing[letter+'_P'].length_mm,ln=p.routing[letter+'_N'].length_mm;
      $('#'+letter.toLowerCase()+'-skew').textContent=Math.abs(lp-ln)<.001?'< 0.001 mm':Math.abs(lp-ln).toFixed(3)+' mm';
      $('#'+letter.toLowerCase()+'-length').textContent='P '+lp.toFixed(3)+' / N '+ln.toFixed(3)+' mm';
    }
    $('#via-count').textContent=p.vias.length+'개';
    $('#signal-layer').textContent=[...new Set(p.tracks.map(t=>t.layer))].sort().join(' + ');
    $('#phase-caption').textContent=p.subtitle;
    $('#cad-source').href=p.source;$('#decision-title').textContent=decision[n][0];$('#decision-text').textContent=decision[n][1];
    if(scene)drawSignals();
  }
  all('[data-phase]').forEach(b=>b.addEventListener('click',()=>setPhase(+b.dataset.phase)));
  all('[data-select-phase]').forEach(b=>b.addEventListener('click',()=>setPhase(+b.dataset.selectPhase)));
  all('[data-pair]').forEach(b=>b.addEventListener('click',()=>{pair=b.dataset.pair;all('[data-pair]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(scene)drawSignals();}));
  window.__routingReview={ready:false,snapshot:()=>({phase:phaseIndex,pair,tracks:data.phases[phaseIndex].tracks.length,vias:data.phases[phaseIndex].vias.length,ground:showGround,shieldVias:window.PCB_DETAILS?.[data.phases[phaseIndex].id]?.shield_vias.length??0})};
  function point(x,y,layer){return new THREE.Vector3(x-33,layer==='B.Cu'?-.81:.81,20-y);}
  function rod(start,end,radius,material){const delta=end.clone().sub(start),mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,delta.length(),8),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
  function copperPolygon(p,z,material){
    const contour=p.outer.map(v=>new THREE.Vector2(...v)),holes=(p.holes||[]).map(h=>h.map(v=>new THREE.Vector2(...v)));
    const faces=THREE.ShapeUtils.triangulateShape(contour,holes),vertices=contour.concat(...holes),positions=[];
    for(const f of faces)for(const index of f){const v=vertices[index];positions.push(v.x-33,.7931-z,20-v.y);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    signalGroup.add(new THREE.Mesh(geometry,material));
  }
  function drawSignals(){
    if(signalGroup){scene.remove(signalGroup);signalGroup.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
    signalGroup=new THREE.Group();scene.add(signalGroup);
    const p=data.phases[phaseIndex];
    for(const t of p.tracks){
      const active=pair==='all'||t.net.includes('_'+pair+'_');
      const material=new THREE.MeshBasicMaterial({color:t.net.endsWith('_P')?0xedaa65:0x66d9c0,transparent:true,opacity:active?1:.12,depthWrite:active});
      signalGroup.add(rod(point(...t.start,t.layer),point(...t.end,t.layer),t.width/2,material));
    }
    for(const v of p.vias){const material=new THREE.MeshBasicMaterial({color:v.net.endsWith('_P')?0xedaa65:0x66d9c0,transparent:true,opacity:pair==='all'||v.net.includes('_'+pair+'_')?1:.12});signalGroup.add(rod(point(...v.at,'F.Cu'),point(...v.at,'B.Cu'),v.size/2,material));}
    const extra=window.PCB_DETAILS?.[p.id];
    if(extra){
      for(const pad of extra.pads){
        const signal=pad.net.startsWith('/PAIR_'),active=pair==='all'||pad.net.includes('_'+pair+'_');
        const padColor=signal?(pad.net.endsWith('_P')?0xedaa65:0x66d9c0):(pad.net==='/SHIELD'?0xbba7ff:0x8da0a6);
        if(!signal&&!showGround)continue;
        for(const layer of pad.layers.filter(l=>l==='F.Cu'||(showGround&&l==='B.Cu')))for(const polygon of pad.polygons){
          const material=new THREE.MeshBasicMaterial({color:padColor,side:THREE.DoubleSide,transparent:true,opacity:signal?(active ? .8 : .1):.45,depthWrite:false});
          copperPolygon(polygon,layer==='F.Cu'?-.002:1.5882,material);
        }
        if(showGround&&pad.drill[0]>0)signalGroup.add(rod(point(...pad.xy,'F.Cu'),point(...pad.xy,'B.Cu'),pad.drill[0]/2+.025,new THREE.MeshBasicMaterial({color:padColor,transparent:true,opacity:signal?(active ? .65 : .1):.45})));
      }
      if(showGround){
        for(const [layer,polygons] of Object.entries(extra.planes))for(const polygon of polygons)copperPolygon(polygon,layer==='In1.Cu'?.2454:1.3408,new THREE.MeshBasicMaterial({color:0xbba7ff,side:THREE.DoubleSide,transparent:true,opacity:.15,depthWrite:false}));
        for(const v of extra.shield_vias)signalGroup.add(rod(point(...v.xy,'F.Cu'),point(...v.xy,'B.Cu'),v.diameter/2,new THREE.MeshBasicMaterial({color:0xbba7ff,transparent:true,opacity:.8})));
      }
    }
    render();
  }
  function render(){if(renderer)renderer.render(scene,camera);}
  const points=data.phases.flatMap(p=>p.tracks.flatMap(t=>[t.start,t.end]));
  const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
  function position(){
    if(!controls)return;
    const halfWidth=fullView?33:(maxX-minX)/2,halfHeight=fullView?20:(maxY-minY)/2;
    const target=fullView?new THREE.Vector3():new THREE.Vector3((minX+maxX)/2-33,0,20-(minY+maxY)/2);
    const tan=Math.tan(camera.fov*Math.PI/360),distance=Math.max(halfHeight/tan,halfWidth/(tan*camera.aspect))*(topView?1.3:1.7);
    const direction=(topView?new THREE.Vector3(0,1,.0001):new THREE.Vector3(.4,.85,.5)).normalize();
    controls.target.copy(target);camera.position.copy(target).add(direction.multiplyScalar(distance));controls.update();render();
  }
  function initialize(){
    const host=$('#viewer');scene=new THREE.Scene();scene.background=new THREE.Color(0x172e33);
    renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','마우스로 회전·확대 가능한 PCB 신호선');
    camera=new THREE.PerspectiveCamera(42,1,.1,400);controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.minDistance=12;controls.maxDistance=120;controls.addEventListener('change',render);
    const board=new THREE.Mesh(new THREE.BoxGeometry(66,1.5862,40),new THREE.MeshBasicMaterial({color:0x5b8076,transparent:true,opacity:.16,depthWrite:false}));scene.add(board);
    const outline=new THREE.LineSegments(new THREE.EdgesGeometry(board.geometry),new THREE.LineBasicMaterial({color:0x87a499,transparent:true,opacity:.45}));scene.add(outline);
    function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();position();}
    new ResizeObserver(resize).observe(host);resize();position();drawSignals();$('#viewer-status').remove();window.__routingReview.ready=true;
    $('#top').addEventListener('click',()=>{topView=true;position();});$('#oblique').addEventListener('click',()=>{topView=false;position();});$('#reset').addEventListener('click',()=>{fullView=true;position();});$('#focus').addEventListener('click',()=>{fullView=false;position();});
    $('#ground-toggle').addEventListener('click',e=>{showGround=!showGround;e.currentTarget.setAttribute('aria-pressed',String(showGround));drawSignals();});
  }
  setPhase(2);
  try{initialize();}catch(error){$('#viewer-status').textContent='3D 화면을 열지 못했습니다. 아래 실제 길이·수치와 원본 CAD 링크를 확인하세요.';console.error(error);}
})();
