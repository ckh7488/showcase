
(() => {
const data=window.ETHERNET_SMA_PREDICTION.geometry;
const $=id=>document.getElementById('latest-'+id);
  const modes = [
    {name:'개방 입력 반사', channel:'B', sma:'J3', metric:'S11', key:'open_b_s11', route:'SMA J3 → 발룬 T2 → B페어 → 개방 RJ45 3·6번'},
    {name:'개방 채널 간 결합', channel:'CD', sma:'J5 → J4', metric:'S21', key:'open_d_to_c_s21', route:'SMA J5 / D 구동 → SMA J4 / C 응답 · RJ45 외부 개방'},
    {name:'100 Ω 부하 입력 정합', channel:'A', sma:'J2', metric:'S11', key:'matched_a_s11', route:'SMA J2 → 발룬 T1 → A페어 → RJ45 1·2번의 99.9 Ω 부하'},
    {name:'두 채널 루프백 전달', channel:'CD', sma:'J5 → J4', metric:'S21', key:'loopback_d_to_c_s21', route:'SMA J5 / D → RJ45 7↔4 · 8↔5 → C / SMA J4'}
  ];
  const colors = {A:0xc87238, B:0x157d71, C:0x3575ba, D:0x905f9e};
  let mode = 0, spread = true, model, renderer, camera, scene, controls;
  function pair(net) { return /\/D([ABCD])_/.exec(net)?.[1] || /Net-\(J([2345])-/.exec(net)?.[1]?.replace(/[2345]/, n=>'ABCD'[Number(n)-2]); }
  const layers = ['F.Cu','In1.Cu','In2.Cu','B.Cu'];
  let tags=[];
  function level(layer) { return spread ? [8,2.3,-2.3,-8][layers.indexOf(layer)] : -data.layers[layer]*8; }
  function shape(poly) {
    const result = new THREE.Shape();
    poly.outer.forEach(([x,y], i) => result[i?'lineTo':'moveTo'](x-40,37-y));
    for (const hole of poly.holes) {
      const path = new THREE.Path();
      hole.forEach(([x,y],i)=>path[i?'lineTo':'moveTo'](x-40,37-y));
      result.holes.push(path);
    }
    return result;
  }
  function build() {
    if (model) { scene.remove(model); model.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();}); }
    model = new THREE.Group(); model.userData.signature=mode+':'+spread; scene.add(model);
    for (const layer of layers) {
      const inner = layer.startsWith('In');
      for (const p of data.copper[layer]) {
        const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape(p)),new THREE.MeshBasicMaterial({color:inner?0x81978b:0xa69a75,side:THREE.DoubleSide,transparent:true,opacity:inner?.20:.46,depthWrite:false}));
        mesh.position.z = level(layer); model.add(mesh);
      }
      const points=[[-40,-37],[40,-37],[40,37],[-40,37],[-40,-37]].map(([x,y])=>new THREE.Vector3(x,y,level(layer)));
      model.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x85998d,transparent:true,opacity:.5})));
    }
    for (const t of data.tracks) {
      const ch = pair(t.net); if (!ch) continue;
      const selected = modes[mode].channel.includes(ch);
      const curve = new THREE.LineCurve3(new THREE.Vector3(t.start[0]-40,37-t.start[1],level(t.layer)+.06),new THREE.Vector3(t.end[0]-40,37-t.end[1],level(t.layer)+.06));
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve,1,t.width/2,6,false),new THREE.MeshBasicMaterial({color:colors[ch],transparent:true,opacity:selected?1:.17}));
      model.add(mesh);
    }
    for (const v of data.vias) {
      const ch = pair(v.net); if (!ch) continue;
      const z0=level('F.Cu'),z1=level('B.Cu');
      const mesh=new THREE.Mesh(new THREE.CylinderGeometry(v.drill/2+.025,v.drill/2+.025,z0-z1,8),new THREE.MeshStandardMaterial({color:colors[ch]}));
      mesh.rotation.x=Math.PI/2; mesh.position.set(v.xy[0]-40,37-v.xy[1],(z0+z1)/2); model.add(mesh);
    }
    for (const p of data.ports) {
      const ch = pair(p.net), selected=ch&&modes[mode].channel.includes(ch);
      const marker=new THREE.Mesh(new THREE.SphereGeometry(selected?.55:.30,10,8),new THREE.MeshBasicMaterial({color:selected?colors[ch]:0x708084}));
      marker.position.set(p.stop[0]-40,37-p.stop[1],level(p.signal_layer)+.2);model.add(marker);
    }
    $('layer-status').textContent=spread?'4층 펼침 · 높이 확대':'층 모음 · 두께 8배';
    tags.forEach(tag=>tag.element.remove());tags=[];
    const addTag=(text,point)=>{const element=document.createElement('span');element.className='model-label';element.textContent=text;$('model').append(element);tags.push({element,point});};
    const anchor=name=>{const p=data.ports.find(p=>p.name===name);return new THREE.Vector3(p.stop[0]-40,37-p.stop[1],level(p.signal_layer)+.8);};
    if(mode===0||mode===2){const ch=mode===0?'B':'A',i=mode===0?2:1;addTag('SMA '+(mode===0?'J3':'J2'),anchor('SMA_'+ch));addTag('발룬 T'+i+' 접속단자',anchor('T'+i+'_4'));addTag(mode===0?'RJ45 3·6 개방':'RJ45 1·2 부하',anchor(mode===0?'RJ_3':'RJ_1'));}
    else {addTag('SMA J5 입력',anchor('SMA_D'));addTag('SMA J4 응답',anchor('SMA_C'));addTag(mode===1?'RJ45 외부 개방':'RJ45 7↔4 · 8↔5',anchor('RJ_7'));}
    render();
  }
  function render() { if(!renderer)return;renderer.render(scene,camera);const host=$('model');for(const tag of tags){const p=tag.point.clone().project(camera);tag.element.style.left=Math.max(5,Math.min(host.clientWidth-tag.element.offsetWidth-5,(p.x+1)*host.clientWidth/2+7))+'px';tag.element.style.top=Math.max(25,Math.min(host.clientHeight-24,(-p.y+1)*host.clientHeight/2-18))+'px';} }
  function fit() { const scale=Math.max(1,1.15/camera.aspect);camera.position.set(83*scale,-98*scale,109*scale);controls.target.set(0,0,0);controls.update();render(); }
  function init() {
    const host=$('model');scene=new THREE.Scene();scene.background=new THREE.Color('#f4f7f5');
    camera=new THREE.PerspectiveCamera(35,1,.1,1000);camera.up.set(0,0,1);
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff,0x747e78,1.5));
    const light=new THREE.DirectionalLight(0xffffff,.8);light.position.set(30,-50,100);scene.add(light);
    controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.addEventListener('change',render);
    new ResizeObserver(()=>{let r=host.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();fit();}).observe(host);
    host.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','+','-'].includes(event.key)){event.preventDefault();if(event.key==='Home')fit();else{const offset=camera.position.clone().sub(controls.target);if(event.key==='+'||event.key==='-')offset.multiplyScalar(event.key==='+'?.9:1.1);else offset.applyAxisAngle(new THREE.Vector3(0,0,1),event.key==='ArrowLeft'||event.key==='ArrowUp'?.15:-.15);camera.position.copy(controls.target).add(offset);controls.update();render();}}});
    fit();build();
  }

const indexes={reflection:0,coupling:1,matched:2,loopback:3};
window.addEventListener('ethernet-test-change',event=>{mode=indexes[event.detail.test];$('current-case').textContent=modes[mode].name;if(renderer)build();});
$('spread').addEventListener('click',()=>{spread=!spread;$('spread').textContent=spread?'층 모으기':'층 펼치기';$('spread').setAttribute('aria-pressed',String(spread));build();});
$('reset').addEventListener('click',fit);
try{init();}catch(error){$('model').textContent='3D 보기를 열지 못했습니다.';console.error(error);}
})();
