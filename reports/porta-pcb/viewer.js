/* Gerber-derived signal geometry and prepared FEM inner copper. No field map. */
(() => {
  const message = document.getElementById('viewer-error');
  try {
    const el = document.getElementById('scene');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .1, 1500);
    const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .11;
    controls.minDistance = 6;
    controls.maxDistance = 320;
    const root = new THREE.Group(); scene.add(root);
    const boards = {}, signalObjects = [], groundObjects = [], copperGroups = [], contacts = [];
    const colors = {'Eth_TX+':0x66d9c0,'Eth_TX-':0x269c9e,'Eth_RX+':0xffbd75,'Eth_RX-':0xd98143,'TXA+':0x66d9c0,'TXA-':0x269c9e,'RXA+':0xffbd75,'RXA-':0xd98143};
    const zLayers = {F_Cu:.028,In1_Cu:.184,In2_Cu:1.35,B_Cu:1.506};
    let separated = false, mode = 'rx', inView = true, segment = 'cable', pairFocus = 'both';

    function xy(board, p) {
      return [p[0] + (board==='Motor_board'?4.98:0)-130,
              p[1] + (board==='Motor_board'?-12.44:0)+110];
    }
    function shape(poly, transform = p=>p) {
      const outer = poly.outer.map(p=>new THREE.Vector2(...transform(p)));
      const s = new THREE.Shape(outer);
      for (const ring of poly.holes || []) s.holes.push(new THREE.Path(ring.map(p=>new THREE.Vector2(...transform(p)))));
      return s;
    }
    function flat(parent, poly, z, color, opacity, transform, pair, section='cable') {
      const geo = new THREE.ShapeGeometry(shape(poly, transform));
      const mat = new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false});
      const mesh = new THREE.Mesh(geo, mat); mesh.position.z = z; parent.add(mesh);
      if (pair) {mesh.userData.pair=pair;mesh.userData.segment=section;signalObjects.push(mesh);mesh.renderOrder=2;}
      return mesh;
    }
    function barrel(parent, p, radius, color, opacity, near) {
      const ring = new THREE.Shape(); ring.absarc(0,0,radius+.025,0,Math.PI*2,false);
      const bore = new THREE.Path(); bore.absarc(0,0,radius,0,Math.PI*2,true);ring.holes.push(bore);
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(ring,{depth:1.534,bevelEnabled:false,curveSegments:8}),
        new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false}));
      mesh.position.set(...p,0); parent.add(mesh); mesh.userData.near = near;
      return mesh;
    }
    function label(parent, text, x,y,z, color='#deeee6',width=22) {
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=100;
      const c=canvas.getContext('2d');c.fillStyle='rgba(19,44,48,.94)';c.fillRect(0,0,640,100);
      c.strokeStyle='rgba(159,200,178,.35)';c.strokeRect(1,1,638,98);
      c.font='600 39px Arial';c.textAlign='center';c.fillStyle=color;c.fillText(text,320,65);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,transparent:true}));
      sp.position.set(x,y,z);sp.scale.set(width,width*100/640,1);sp.renderOrder=9;parent.add(sp);return sp;
    }

    for (const [bn,b] of Object.entries(GEO)) {
      const group = new THREE.Group();group.position.z=bn==='Motor_board'?16.534:0;root.add(group);boards[bn]=group;
      const substrate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape({outer:b.outline},p=>xy(bn,p)),{depth:1.534,bevelEnabled:false,curveSegments:4}),
        new THREE.MeshBasicMaterial({color:bn==='Motor_board'?0x508d79:0x829cbe,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));
      group.add(substrate);
      const outline = b.outline.map(p=>new THREE.Vector3(...xy(bn,p),.77));
      const boundary=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outline),new THREE.LineBasicMaterial({color:bn==='Motor_board'?0x6dba9d:0x9eb4d1,transparent:true,opacity:.5}));group.add(boundary);
      for (const [net,layers] of Object.entries(b.nets)) for (const [layer,polys] of Object.entries(layers))
        for (const p of polys) flat(group,p,zLayers[layer],colors[net],net.includes('RX')?1:.65,q=>xy(bn,q),net.includes('RX')?'rx':'tx');
      for (const h of b.holes) {
        const p=xy(bn,[h.x,h.y]);
        const net=(h.nets||[]).find(n=>colors[n]);
        const via=barrel(group,p,h.diameter/2,colors[net]||0xc89a68,.95,false);
        if(net){via.userData.pair=net.includes('RX')?'rx':'tx';via.userData.segment='cable';signalObjects.push(via);}
      }
      for (const h of GROUND_VIAS[bn] || []) {
        const via=barrel(group,xy(bn,[h.x,h.y]),h.diameter/2,0xbba7ff,.82,h.near_rx);
        via.userData.board=bn;
        via.userData.nearPhy=bn==='Control_board'&&PHY_GEOMETRY.ground_near_xy.some(p=>Math.hypot(p[0]-h.x,p[1]-h.y)<1e-6);
        groundObjects.push(via);
      }
      const innerGroup = new THREE.Group();innerGroup.visible=false;group.add(innerGroup);copperGroups.push(innerGroup);
      for(const layer of Object.values(INNER_COPPER[bn]||{})) for(const poly of layer.polygons)
        flat(innerGroup,poly,layer.z-group.position.z,0x8eab9b,.19,p=>p);
    }
    for(const [net,layers] of Object.entries(PHY_GEOMETRY.nets))for(const [layer,polys]of Object.entries(layers))
      for(const p of polys)flat(boards.Control_board,p,zLayers[layer],colors[net],1,q=>xy('Control_board',q),net.includes('RX')?'rx':'tx','phy');
    for(const h of PHY_GEOMETRY.holes){
      const net=h.nets.find(n=>Object.hasOwn(PHY_GEOMETRY.nets,n));
      const via=barrel(boards.Control_board,xy('Control_board',[h.x,h.y]),h.diameter/2,colors[net],1,false);
      via.userData.pair=net.includes('RX')?'rx':'tx';via.userData.segment='phy';signalObjects.push(via);
    }
    for(const p of MODEL.connector) {
      const net=p.control_net,isSignal=Boolean(colors[net]);
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(.205,.30,15),new THREE.MeshBasicMaterial({color:colors[net]||0xa8c1b5,transparent:true,opacity:isSignal?1:.25}));
      mesh.position.set(...p.xy,9.034);root.add(mesh);contacts.push(mesh);
      if(isSignal){mesh.userData.pair=net.includes('RX')?'rx':'tx';mesh.userData.segment='cable';signalObjects.push(mesh);}
    }
    const controlLabel=label(boards.Control_board,'Control / T2',14,-10,-2.8,'#cfdeed',19);
    label(boards.Motor_board,'Motor / M12',-3,-27,4.7,'#c5e7d6',16);
    const molexLabel=label(root,'Molex 64',-17,8,9,'#ceddd5',16);
    const phyLabels=[label(boards.Control_board,'T2 / PHY side',7,-6,2.8,'#cfdeed',14),label(boards.Control_board,'LAN9354 / U6',24,15,3,'#cfdeed',14)];

    const bounds = new THREE.Box3();
    for (const [bn,b] of Object.entries(GEO)) for(const p of b.outline) {
      const z=boards[bn].position.z;
      bounds.expandByPoint(new THREE.Vector3(...xy(bn,p),z));
      bounds.expandByPoint(new THREE.Vector3(...xy(bn,p),z+1.534));
    }
    const basicBounds = bounds.clone();
    function frameBox(box,direction,padding=1.10) {
      const center=box.getCenter(new THREE.Vector3()),dir=direction.clone().normalize();
      const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),dir).normalize();
      const up=new THREE.Vector3().crossVectors(dir,right).normalize();
      const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
      let distance=0;
      for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
        const v=new THREE.Vector3(x,y,z).sub(center),front=v.dot(dir);
        distance=Math.max(distance,Math.abs(v.dot(right))/(tan*camera.aspect)+front,Math.abs(v.dot(up))/tan+front);
      }
      camera.up.set(0,1,0);controls.target.copy(center);camera.position.copy(center).addScaledVector(dir,distance*padding);controls.update();
    }
    function setView(next) {
      mode=next;root.updateMatrixWorld(true);
      const box=basicBounds.clone();box.max.z+=separated?18:0;
      if(segment==='phy'){
        const phyBox=new THREE.Box3();
        for(const o of signalObjects)if(o.userData.segment==='phy'&&(next!=='rx'||pairFocus==='both'||o.userData.pair===pairFocus))phyBox.expandByObject(o);
        phyBox.expandByScalar(4);frameBox(phyBox,next==='side'?new THREE.Vector3(18,-32,12):new THREE.Vector3(10,-12,40),1.15);
      }else if(next==='rx') {
        const rxBox=new THREE.Box3();
        for(const o of signalObjects)if(o.userData.segment==='cable'&&(pairFocus==='both'||o.userData.pair===pairFocus))rxBox.expandByObject(o);
        rxBox.expandByScalar(2);frameBox(rxBox,new THREE.Vector3(23,-36,58),1.10);
      } else frameBox(box,next==='side'?new THREE.Vector3(85,-45,20):new THREE.Vector3(30,-46,57));
      for(const id of ['all','rx','side'])document.getElementById('view-'+id).classList.toggle('active',id===next);
      for(const o of signalObjects){o.visible=o.userData.segment===segment;o.material.opacity=pairFocus==='both'?.9:(o.userData.pair===pairFocus?1:.12);}
    }
    function setPair(next){
      pairFocus=next;
      for(const button of document.querySelectorAll('.pair-buttons [data-pair]'))button.setAttribute('aria-pressed',String(button.dataset.pair===next));
      document.getElementById('view-rx').textContent=next==='both'?'신호선 확대':next.toUpperCase()+' 확대';
      setView('rx');
    }
    function setGround() {
      const m=document.getElementById('ground-mode').value;
      for(const o of groundObjects)o.visible=(segment!=='phy'||o.userData.board==='Control_board')&&(m==='all'||(m==='near'&&(segment==='phy'?o.userData.nearPhy:o.userData.near)));
    }
    function setSegment(next){
      segment=next;boards.Motor_board.visible=next==='cable';
      for(const c of contacts)c.visible=next==='cable';
      controlLabel.visible=next==='cable';molexLabel.visible=next==='cable';for(const l of phyLabels)l.visible=next==='phy';
      document.getElementById('explode').disabled=next==='phy';
      document.getElementById('segment-cable').setAttribute('aria-pressed',String(next==='cable'));
      document.getElementById('segment-phy').setAttribute('aria-pressed',String(next==='phy'));
      document.getElementById('scene-badge').textContent=next==='phy'?'Control PCB · T2 PHY측 패드 ↔ LAN9354 패드':(separated?'분리 보기 · 표시 간격 확대':'결합 간격 15 mm');
      document.getElementById('pcb-route').innerHTML=next==='phy'?'<span>T2 PHY측 패드</span><i>↔</i><span>Control PCB TX / RX 배선</span><i>↔</i><span>LAN9354 패드</span>':'<span>T2 케이블측</span><i>→</i><span>Control PCB</span><i>→</i><span>Molex 64핀</span><i>→</i><span>Motor PCB</span><i>→</i><span>M12 PCB 패드</span>';
      setGround();setView(next==='phy'?'all':'rx');
    }
    document.getElementById('segment-cable').onclick=()=>setSegment('cable');document.getElementById('segment-phy').onclick=()=>setSegment('phy');
    for(const button of document.querySelectorAll('.pair-buttons [data-pair]'))button.onclick=()=>setPair(button.dataset.pair);
    setGround();document.getElementById('ground-mode').onchange=setGround;
    for(const v of ['all','rx','side'])document.getElementById('view-'+v).onclick=()=>setView(v);
    document.getElementById('explode').onclick=()=>{
      separated=!separated;
      boards.Motor_board.position.z=16.534+(separated?18:0);
      for(const c of contacts){c.scale.z=(15+(separated?18:0))/15;c.position.z=9.034+(separated?9:0);}
      molexLabel.position.z=9+(separated?9:0);
      document.getElementById('explode').setAttribute('aria-pressed',String(separated));
      document.getElementById('scene-badge').textContent=separated?'분리 보기 · 표시 간격 확대':'결합 간격 15 mm';
      setView(mode);
    };
    document.getElementById('inner-toggle').onchange=e=>{for(const g of copperGroups)g.visible=e.target.checked;};
    function resize(){renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();setView(mode);}
    new ResizeObserver(resize).observe(el);resize();setSegment('cable');
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{rootMargin:'100px'}).observe(el);
    function frame(){requestAnimationFrame(frame);if(inView){controls.update();renderer.render(scene,camera);}}
    frame();message.hidden=true;message.style.display='none';
    window.__pcbViewer={ready:true,select:({segment:nextSegment,pair})=>{if(['cable','phy'].includes(nextSegment))setSegment(nextSegment);if(['both','rx','tx'].includes(pair))setPair(pair);},snapshot:()=>({mode,segment,pair:pairFocus,separated,inner:document.getElementById('inner-toggle').checked,
      groundMode:document.getElementById('ground-mode').value,groundTotal:groundObjects.length,
      groundVisible:groundObjects.filter(g=>g.visible).length,camera:camera.position.toArray(),
      copperGroups:copperGroups.length,signalObjects:signalObjects.length})};
  } catch(error) {message.textContent='3D 표시 오류: '+error.message;console.error(error);}
})();
