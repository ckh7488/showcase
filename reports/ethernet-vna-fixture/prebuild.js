(() => {
  'use strict';
  const data = window.ETHERNET_PREBUILD;
  if (!data) return;
  const $ = selector => document.querySelector(selector);
  const all = selector => [...document.querySelectorAll(selector)];
  const names = {com_old: '배선 유지안', com_front: '전면 재배선안'};
  const colors = {com_old: '#197d71', com_front: '#cf752d'};
  const info = {
    sdd11: {title: '되돌아온 차동 성분 · Sdd11', subtitle: 'RJ45 B페어로 들어간 차동 신호 중 입력으로 돌아온 성분', noun: '반사'},
    scd21: {title: '차동 → 공통모드 변환 · Scd21', subtitle: '발룬 패드에서 P/N 두 선에 같은 방향으로 나타난 성분', noun: '공통모드 변환'},
    coupling: {title: '다른 페어로 전달된 성분 · 차동 누화', subtitle: 'B → A/C/D의 RJ45 쪽·발룬 쪽 여섯 경로 중 주파수별 최댓값', noun: '차동 누화'}
  };
  let caseId = 'com_old', metric = 'sdd11', index = 99;
  let spread = true, focused = false;
  let scene, camera, renderer, controls, copperGroup, anchors;
  const fmt = value => value.toFixed(1).replace('-', '−');
  const activeValues = () => data.curves[caseId];

  function couplingPath() {
    let winner = {key: 'fext_dd_C', value: -Infinity};
    for (const pair of ['A', 'C', 'D']) for (const end of ['next', 'fext']) {
      const key = `${end}_dd${pair === 'A' ? '' : '_' + pair}`;
      const value = activeValues()[key][index];
      if (value > winner.value) winner = {key, value, pair, end};
    }
    return winner;
  }

  function update() {
    const f = index + 1, values = activeValues(), coupled = couplingPath();
    $('#frequency').value = f;
    $('#frequency-label').textContent = f + ' MHz';
    $('#result-frequency').textContent = f;
    $('#result-case').textContent = names[caseId] + ' · B페어';
    $('#model-case').textContent = names[caseId];
    for (const key of ['sdd11', 'scd21', 'coupling']) $('#value-' + key).textContent = fmt(values[key][index]);
    const percent = 100 * Math.pow(10, values.sdd11[index] / 10);
    $('#reflection-power').textContent = '입사 전력의 ' + (percent < .0001 ? percent.toExponential(2) : percent.toFixed(4)) + '%';
    $('#coupling-path').textContent = `B → ${coupled.pair} · ${coupled.end === 'next' ? 'RJ45 쪽' : '발룬 쪽'}`;
    $('#chart-title').textContent = info[metric].title;
    $('#chart-subtitle').textContent = info[metric].subtitle;
    const retained = data.curves.com_old[metric][index], rerouted = data.curves.com_front[metric][index];
    const smaller = retained < rerouted ? '배선 유지안' : '전면 재배선안';
    $('#comparison-note').textContent = `${f} MHz의 ${info[metric].noun}는 배선 유지안 ${fmt(retained)} dB, 전면 재배선안 ${fmt(rerouted)} dB다. ${smaller}이 ${Math.abs(retained - rerouted).toFixed(1)} dB 작다.`;
    $('#model-caption').textContent = caseId === 'com_old'
      ? '기존 네 페어의 배선을 살린 안이다. B페어만 뒷면을 거치며 P와 N에 신호 비아가 하나씩 있다.'
      : '커넥터를 모두 앞면에 놓고 네 페어를 다시 배선한 비교안이다. A/C/D에 신호 비아가 2개씩, B에 4개 있다.';
    all('[data-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === caseId)));
    all('[data-metric]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.metric === metric)));
    chart();
    if (renderer) {
      const signature = caseId + ':' + metric + ':' + spread + ':' + (metric === 'coupling' ? coupled.pair + coupled.end : '');
      if (signature !== copperGroup?.userData.signature) buildCopper(signature);
      render();
    }
  }

  function chart() {
    const svg = $('#rf-chart'), w = svg.clientWidth || 600, h = svg.clientHeight || 260;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    function add(tag, attrs, text) {
      const e = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
      if (text !== undefined) e.textContent = text;
      svg.append(e); return e;
    }
    const pad = {l: w < 400 ? 39 : 49, r: 18, t: 27, b: 33};
    const values = [...data.curves.com_old[metric], ...data.curves.com_front[metric]];
    let low = Math.floor(Math.min(...values) / 10) * 10;
    let high = Math.ceil(Math.max(...values) / 10) * 10;
    if (high === low) high += 10;
    const x = f => pad.l + (f - 1) / 149 * (w - pad.l - pad.r);
    const y = v => pad.t + (high - v) / (high - low) * (h - pad.t - pad.b);
    add('title', {}, `${info[metric].title}。배선 유지안과 전면 재배선안의 1–150 MHz 계산값`);
    add('text', {x: pad.l - 7, y: 13, class: 'chart-axis', 'text-anchor': 'end'}, 'dB');
    for (let v = low; v <= high; v += high - low > 70 ? 20 : 10) {
      add('line', {x1: pad.l, x2: w - pad.r, y1: y(v), y2: y(v), class: 'chart-grid'});
      add('text', {x: pad.l - 8, y: y(v) + 3, class: 'chart-axis', 'text-anchor': 'end'}, String(v).replace('-', '−'));
    }
    for (const f of (w < 500 ? [1, 50, 100, 150] : [1, 25, 50, 75, 100, 125, 150])) {
      add('text', {x: x(f), y: h - 13, class: 'chart-axis', 'text-anchor': f === 150 ? 'end' : 'middle'}, String(f));
    }
    add('text', {x: w - pad.r, y: h - 1, class: 'chart-axis', 'text-anchor': 'end'}, 'MHz');
    add('line', {x1: x(index + 1), x2: x(index + 1), y1: pad.t, y2: h - pad.b, class: 'chart-cursor'});
    for (const id of ['com_front', 'com_old']) {
      const points = data.curves[id][metric];
      const path = points.map((v, i) => (i ? 'L' : 'M') + x(i + 1).toFixed(2) + ',' + y(v).toFixed(2)).join('');
      add('path', {d: path, class: 'chart-line', stroke: colors[id], 'stroke-width': id === caseId ? 2.7 : 1.7, opacity: id === caseId ? 1 : .75});
      add('circle', {cx: x(index + 1), cy: y(points[index]), r: id === caseId ? 4.5 : 3.5, fill: colors[id], stroke: 'white', 'stroke-width': 1.5});
    }
    const hit = add('rect', {x: pad.l, y: pad.t, width: w - pad.l - pad.r, height: h - pad.t - pad.b, fill: 'transparent', cursor: 'crosshair'});
    hit.addEventListener('pointerdown', event => {
      const r = svg.getBoundingClientRect();
      index = Math.max(0, Math.min(149, Math.round((event.clientX - r.left - pad.l) / (w - pad.l - pad.r) * 149)));
      update();
    });
  }

  const heights = () => spread
    ? {'F.Cu': 5.5, 'In1.Cu': 1.85, 'In2.Cu': -1.85, 'B.Cu': -5.5}
    : {'F.Cu': .7931, 'In1.Cu': .5477, 'In2.Cu': -.5477, 'B.Cu': -.7931};
  const point = (xy, layer) => new THREE.Vector3(xy[0] - 40, heights()[layer], 37 - xy[1]);
  const pairOf = net => /^\/PAIR_([ABCD])_[PN]$/.exec(net)?.[1];
  function material(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity === 1});
  }
  function style(net) {
    const pair = pairOf(net), target = metric === 'coupling' ? couplingPath().pair : null;
    if (pair === 'B') return {color: net.endsWith('_P') ? 0x66d9c0 : 0xedaa65, opacity: 1};
    if (pair && pair === target) return {color: 0xbba7ff, opacity: .95};
    if (pair) return {color: 0x769491, opacity: .35};
    return {color: 0xbba7ff, opacity: .23};
  }
  function polygon(poly, layer, mat, drill) {
    const outer = poly.outer.map(p => new THREE.Vector2(p[0], p[1]));
    const holes = (poly.holes || []).map(h => h.map(p => new THREE.Vector2(p[0], p[1])));
    if (drill?.radius > 0 && !holes.length) {
      holes.push(Array.from({length: 20}, (_, i) => new THREE.Vector2(
        drill.xy[0] + drill.radius * Math.cos(i * Math.PI / 10),
        drill.xy[1] + drill.radius * Math.sin(i * Math.PI / 10))));
    }
    const faces = THREE.ShapeUtils.triangulateShape(outer, holes), coords = [];
    const vertices = outer.concat(...holes);
    for (const face of faces) for (const i of face) {
      const v = vertices[i]; coords.push(v.x - 40, heights()[layer], 37 - v.y);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    geo.computeVertexNormals();
    copperGroup.add(new THREE.Mesh(geo, mat));
  }
  function track(t, mat) {
    const a = t.start, b = t.end, dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (!length) return;
    const nx = -dy / length * t.width / 2, ny = dx / length * t.width / 2;
    polygon({outer: [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]]}, t.layer, mat);
  }
  function barrel(xy, radius, mat) {
    const h = heights();
    const geo = new THREE.CylinderGeometry(radius, radius, h['F.Cu'] - h['B.Cu'], 16, 1, true);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(point(xy, 'F.Cu')); mesh.position.y = 0;
    copperGroup.add(mesh);
  }
  function portCenter(ref, pair) {
    const ports = data.models[caseId].port_geometry.filter(p => p.ref === ref && pairOf(p.net) === pair);
    const xy = [0, 1].map(i => ports.reduce((sum, p) => sum + p.stop[i], 0) / ports.length);
    return point(xy, ports[0]?.signal_layer || 'F.Cu');
  }
  function marker(position, color) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, .09, 5, 32), material(color));
    mesh.rotation.x = Math.PI / 2; mesh.position.copy(position); mesh.position.y += .09;
    copperGroup.add(mesh);
  }
  function disposeGroup(group) {
    group.traverse(child => {child.geometry?.dispose(); if (child.material) child.material.dispose();});
    scene.remove(group);
  }
  function buildCopper(signature) {
    if (copperGroup) disposeGroup(copperGroup);
    copperGroup = new THREE.Group(); copperGroup.userData.signature = signature; scene.add(copperGroup);
    const m = data.models[caseId], h = heights();
    const planeMaterial = material(0xbba7ff, spread ? .105 : .055);
    for (const zone of m.zones) for (const poly of zone.polygons) polygon(poly, zone.layer, planeMaterial);
    for (const layer of ['F.Cu', 'In1.Cu', 'In2.Cu', 'B.Cu']) {
      const points = [[0, 0], [80, 0], [80, 74], [0, 74], [0, 0]].map(xy => point(xy, layer));
      const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color: 0x78968f, transparent: true, opacity: .34}));
      copperGroup.add(outline);
    }
    for (const t of m.tracks) {
      const s = style(t.net); track(t, material(s.color, s.opacity));
    }
    for (const pad of m.pads) {
      const s = style(pad.net), mat = material(s.color, s.opacity);
      for (const layer of pad.layers) {
        if (!(layer in h)) continue;
        for (const poly of pad.polygons) polygon(poly, layer, mat, {xy: pad.xy, radius: pad.drill[0] / 2});
      }
      if (pad.drill[0] > 0 && !pad.npth) barrel(pad.xy, pad.drill[0] / 2 + .025, mat);
    }
    for (const via of m.vias) {
      const s = style(via.net); barrel(via.xy, via.drill / 2 + .025, material(s.color, s.opacity));
    }
    const input = portCenter('J1', 'B'), output = portCenter('J2', 'B');
    const bVias = m.vias.filter(v => pairOf(v.net) === 'B');
    const coupled = couplingPath();
    const resultAnchor = metric === 'coupling' ? portCenter(coupled.end === 'next' ? 'J1' : 'J2', coupled.pair) : output;
    $('#output-tag').textContent = metric === 'coupling'
      ? `${coupled.pair}페어 · ${coupled.end === 'next' ? 'RJ45 쪽' : '발룬 쪽'}`
      : 'T2 · 발룬 패드';
    anchors = {input, output: resultAnchor,
      viaP: bVias.find(v => v.net.endsWith('_P')),
      viaN: bVias.find(v => v.net.endsWith('_N'))};
    if (metric === 'sdd11') marker(input, 0x66d9c0);
    else if (metric === 'scd21') marker(output, 0x66d9c0);
    else {
      const p = couplingPath(); marker(input, 0x66d9c0);
      marker(portCenter(p.end === 'next' ? 'J1' : 'J2', p.pair), 0xbba7ff);
    }
    $('#layer-state').textContent = spread ? '층 펼침 · 두께 확대' : '실제 적층 간격 · 약 1.6 mm';
    $('#spread-layers').textContent = spread ? '층 모으기' : '층 펼치기';
    $('#spread-layers').setAttribute('aria-pressed', String(spread));
  }
  function placeTag(selector, position) {
    if (!position) return;
    const p = position.clone().project(camera), host = $('#model');
    const label = $(selector), w = host.clientWidth, h = host.clientHeight;
    label.hidden = p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1;
    label.style.left = Math.max(64, Math.min(w - 64, (p.x + 1) * .5 * w)) + 'px';
    label.style.top = Math.max(62, Math.min(h - 42, (1 - p.y) * .5 * h)) + 'px';
  }
  function render() {
    if (!renderer) return;
    renderer.render(scene, camera);
    placeTag('#input-tag', anchors?.input);
    placeTag('#output-tag', anchors?.output);
    for (const [key, selector] of [['viaP', '#via-p-tag'], ['viaN', '#via-n-tag']]) {
      if (focused && caseId === 'com_old' && anchors?.[key]) placeTag(selector, point(anchors[key].xy, 'B.Cu'));
      else $(selector).hidden = true;
    }
  }
  function fit() {
    const box = new THREE.Box3();
    if (focused) {
      for (const t of data.models[caseId].tracks) if (pairOf(t.net) === 'B') {
        box.expandByPoint(point(t.start, 'F.Cu')); box.expandByPoint(point(t.end, 'B.Cu'));
      }
      box.expandByScalar(3);
    } else {
      box.setFromPoints([point([0, 0], 'F.Cu'), point([80, 74], 'B.Cu')]);
    }
    const target = box.getCenter(new THREE.Vector3()), corners = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    const direction = new THREE.Vector3(.4, 1.15, .78).normalize();
    let distance = focused ? 38 : 115;
    for (let n = 0; n < 30; n++) {
      camera.position.copy(target).add(direction.clone().multiplyScalar(distance));
      camera.lookAt(target); camera.updateMatrixWorld(true);
      if (corners.every(c => {const p = c.clone().project(camera); return Math.abs(p.x) < .89 && Math.abs(p.y) < .86;})) break;
      distance *= 1.075;
    }
    controls.target.copy(target); controls.update(); render();
  }
  function init3D() {
    try {
      const host = $('#model');
      scene = new THREE.Scene(); scene.background = new THREE.Color(0x172e33);
      renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.outputEncoding = THREE.sRGBEncoding;
      host.append(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      camera = new THREE.PerspectiveCamera(42, 1, .1, 1200);
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = false; controls.minDistance = 28; controls.maxDistance = 360;
      controls.maxPolarAngle = Math.PI * .94; controls.addEventListener('change', render);
      const resize = () => {
        renderer.setSize(host.clientWidth, host.clientHeight);
        camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix(); fit();
      };
      new ResizeObserver(resize).observe(host);
      resize();
      host.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home') {fit(); return;}
        const offset = camera.position.clone().sub(controls.target);
        if (event.key === '+' || event.key === '=') offset.multiplyScalar(.85);
        else if (event.key === '-') offset.multiplyScalar(1.15);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), event.key === 'ArrowLeft' ? -.12 : .12);
        else {
          const axis = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
          offset.applyAxisAngle(axis, event.key === 'ArrowUp' ? -.12 : .12);
        }
        offset.clampLength(controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset); controls.update(); render();
      });
    } catch (error) {
      console.error('PCB 3D initialization:', error);
      renderer = null; $('#model-fallback').hidden = false;
      $('#input-tag').hidden = true; $('#output-tag').hidden = true;
      all('.model-tools button').forEach(button => button.disabled = true);
    }
  }

  all('[data-case]').forEach(button => button.addEventListener('click', () => {caseId = button.dataset.case; update(); if (renderer && focused) fit();}));
  all('[data-metric]').forEach(button => button.addEventListener('click', () => {metric = button.dataset.metric; update();}));
  $('#frequency').addEventListener('input', event => {index = +event.target.value - 1; update();});
  $('#spread-layers').addEventListener('click', () => {spread = !spread; update();});
  $('#top-view').addEventListener('click', () => {
    focused = !focused; $('#top-view').setAttribute('aria-pressed', String(focused)); $('#top-view').textContent = focused ? '전체 보기' : 'B페어 확대'; fit();
  });
  $('#reset-view').addEventListener('click', () => {focused = false; $('#top-view').setAttribute('aria-pressed', 'false'); $('#top-view').textContent = 'B페어 확대'; fit();});
  new ResizeObserver(chart).observe($('#rf-chart'));
  init3D(); update();
  window.__ethernetPrebuild = {snapshot: () => ({caseId, metric, frequency_mhz: index + 1, spread,
    has3D: !!renderer, camera: camera?.position.toArray(), numbers: Object.fromEntries(['sdd11', 'scd21', 'coupling'].map(k => [k, activeValues()[k][index]])),
    modelTracks: data.models[caseId].tracks.length, modelVias: data.models[caseId].vias.filter(v => pairOf(v.net)).length})};
})();
