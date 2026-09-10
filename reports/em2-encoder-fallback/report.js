(() => {
  const scenarios = {
    normal: {
      a: true, b: true, aEdges: 60, bEdges: 60,
      mode: 'AB · QUADRATURE', modeDetail: '두 상의 모든 변화를 사용함',
      output: '정상 출력', outputDetail: '40,000 count/rev'
    },
    'a-loss': {
      a: false, b: true, aEdges: 0, bEdges: 60,
      mode: 'B_ONLY · FALLBACK', modeDetail: '정상 B상만 사용해 위치를 이어 감',
      output: '제한적 연속 출력', outputDetail: '고정 방향 · 36 RPM 조건'
    },
    'b-loss': {
      a: true, b: false, aEdges: 60, bEdges: 0,
      mode: 'A_ONLY · FALLBACK', modeDetail: '정상 A상만 사용해 위치를 이어 감',
      output: '제한적 연속 출력', outputDetail: '고정 방향 · 36 RPM 조건'
    },
    'both-loss': {
      a: false, b: false, aEdges: 0, bEdges: 0,
      mode: 'INVALID', modeDetail: '사용할 수 있는 상이 없음',
      output: '위치 신뢰 불가', outputDetail: 'Fallback 적용 불가'
    }
  };

  const ns = 'http://www.w3.org/2000/svg';
  const rotor = document.querySelector('#rotor-group');
  const slots = document.querySelector('#disc-slots');
  const scanLine = document.querySelector('#scan-line');
  const scanDotA = document.querySelector('#scan-dot-a');
  const scanDotB = document.querySelector('#scan-dot-b');
  const angleValue = document.querySelector('#angle-value');
  const motionToggle = document.querySelector('#motion-toggle');
  const indexSensor = document.querySelector('#index-sensor');
  const indexBeam = document.querySelector('#index-beam');
  const indexLive = document.querySelector('#index-live');
  const indexChannel = document.querySelector('#index-channel');
  const indexScanLine = document.querySelector('#index-scan-line');
  const indexScanDot = document.querySelector('#index-scan-dot');
  let activeScenario = 'normal';
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let angle = 0;
  let indexRevolution = 0;
  let lastIndexHigh = null;
  let previousTime = performance.now();

  for (let i = 0; i < 96; i += 1) {
    const mark = document.createElementNS(ns, 'rect');
    mark.setAttribute('class', 'slot');
    mark.setAttribute('x', '203.5');
    mark.setAttribute('y', '58');
    mark.setAttribute('width', '3');
    mark.setAttribute('height', '22');
    mark.setAttribute('rx', '1');
    mark.setAttribute('transform', `rotate(${i * 3.75} 205 175)`);
    slots.append(mark);
  }

  const grid = document.querySelector('.wave-grid');
  for (let x = 86; x <= 706; x += 38.75) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', 35); line.setAttribute('y2', 268);
    grid.append(line);
  }
  [70, 125, 190, 245].forEach(y => {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', 72); line.setAttribute('x2', 706);
    line.setAttribute('y1', y); line.setAttribute('y2', y);
    grid.append(line);
  });

  const stateLabels = document.querySelector('#state-labels');
  Array.from({ length: 16 }, (_, index) => ['10', '11', '01', '00'][index % 4]).forEach((code, index) => {
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('class', 'state-code');
    text.setAttribute('x', 105.375 + index * 38.75);
    text.setAttribute('y', 282);
    text.textContent = code;
    stateLabels.append(text);
  });

  function squarePath(yHigh, yLow, phaseShift, enabled) {
    const start = 86;
    const step = 77.5;
    if (!enabled) return `M${start} ${yLow}H706`;
    let high = !phaseShift;
    let d = `M${start} ${high ? yHigh : yLow}`;
    let x = start + (phaseShift ? step / 2 : step);
    while (x <= 706) {
      d += `H${x}V${high ? yLow : yHigh}`;
      high = !high;
      x += step;
    }
    d += 'H706';
    return d;
  }

  function updateScenario(name) {
    activeScenario = name;
    const state = scenarios[name];
    document.querySelectorAll('[data-scenario]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.scenario === name));
    });
    document.querySelector('#wave-a').setAttribute('d', squarePath(70, 125, false, state.a));
    document.querySelector('#wave-b').setAttribute('d', squarePath(190, 245, true, state.b));
    document.querySelector('#wave-a').classList.toggle('is-failed', !state.a);
    document.querySelector('#wave-b').classList.toggle('is-failed', !state.b);

    [['a', state.a, state.aEdges], ['b', state.b, state.bEdges]].forEach(([phase, healthy, edges]) => {
      const health = document.querySelector(`#${phase}-health`);
      const sensor = document.querySelector(`#sensor-${phase}`);
      health.classList.toggle('is-failed', !healthy);
      sensor.classList.toggle('is-failed', !healthy);
      health.querySelector('strong').textContent = healthy ? `정상 · 약 ${edges} edge` : '이상 · edge 없음';
      sensor.querySelector('.sensor-state').textContent = healthy ? '정상' : '이상';
    });

    document.querySelector('#mode-value').textContent = state.mode;
    document.querySelector('#mode-detail').textContent = state.modeDetail;
    document.querySelector('#output-value').textContent = state.output;
    document.querySelector('#output-detail').textContent = state.outputDetail;
    document.querySelector('.result-card').classList.toggle('is-failed', name === 'both-loss');

    const labels = { normal: '정상 상태', 'a-loss': 'A상 이상', 'b-loss': 'B상 이상', 'both-loss': '양쪽 이상' };
    document.querySelector('#meter-scenario').textContent = labels[name];
    [['a', state.a, state.aEdges], ['b', state.b, state.bEdges]].forEach(([phase, healthy, edges]) => {
      const meter = document.querySelector(`#meter-${phase}`);
      const percent = Math.min(100, (edges / 120) * 100);
      meter.classList.toggle('is-failed', !healthy);
      meter.querySelector('.meter-label span').textContent = `${edges} edge`;
      meter.querySelector('.meter-track b').style.left = `${percent}%`;
      meter.querySelector('.meter-track em').style.left = `${percent}%`;
      meter.querySelector('small').textContent = `상태 판정: ${healthy ? '정상' : '이상'}`;
    });

    document.querySelector('#flow-a-dot').classList.toggle('is-failed', !state.a);
    document.querySelector('#flow-b-dot').classList.toggle('is-failed', !state.b);
    const flowMode = name === 'normal' ? 'AB' : name === 'a-loss' ? 'B_ONLY' : name === 'b-loss' ? 'A_ONLY' : 'INVALID';
    document.querySelectorAll('[data-flow-mode]').forEach(node => node.classList.toggle('is-active', node.dataset.flowMode === flowMode));
    document.querySelector('#flow-mode').textContent = flowMode;
    document.querySelector('#flow-source').textContent = name === 'normal' ? '40,000 count/rev' : name === 'both-loss' ? '위치 출력 신뢰 불가' : '단일상 edge × 4 환산';
  }

  document.querySelectorAll('[data-scenario]').forEach(button => {
    button.addEventListener('click', () => updateScenario(button.dataset.scenario));
  });

  const installationViews = {
    field: {
      src: 'assets/field-installation.jpg',
      alt: '현장에 장착된 EM2와 encoder disk 전체 모습',
      title: '와셔로 높이를 맞춰 동작점을 찾음.',
      detail: '높이를 조절하면 pulse가 돌아왔지만, 언제 다시 깨끗해지거나 무너질지 예측하기 어려웠음. 와셔는 공차를 보정했을 뿐 반복 가능한 정렬 구조를 만든 것은 아니었음.'
    },
    closeup: {
      src: 'assets/optical-gap-closeup.jpg',
      alt: 'EM2 광학 센서와 encoder disk가 가까이 배치된 현장 확대 사진',
      title: '렌즈와 Disk 사이 상대 위치가 핵심',
      detail: 'Gap과 radial 위치 공차가 작아 손으로 같은 동작점을 반복해서 찾기 어려웠음. 체결과 와셔 조합이 조금만 달라져도 pulse 상태가 달라질 수 있었음.'
    }
  };

  document.querySelectorAll('[data-installation-photo]').forEach(button => {
    button.addEventListener('click', () => {
      const name = button.dataset.installationPhoto;
      const view = installationViews[name];
      document.querySelectorAll('[data-installation-photo]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const photo = document.querySelector('#installation-photo');
      photo.src = view.src;
      photo.alt = view.alt;
      photo.closest('.installation-photo-wrap').classList.toggle('is-closeup', name === 'closeup');
      document.querySelector('#installation-title').textContent = view.title;
      document.querySelector('#installation-detail').textContent = view.detail;
    });
  });

  const datasheetViews = {
    gap: {
      src: 'assets/datasheet-gap.png',
      alt: 'EM2 데이터시트의 disk alignment와 권장 gap 0.51 +0.13/-0.25 밀리미터 그림',
      source: 'DATA SHEET · DISK ALIGNMENT',
      value: '0.51 +0.13/−0.25 mm',
      detail: '대략 0.26–0.64 mm 범위임. 빨간 박스의 Gap 표기를 기준으로 확인함.'
    },
    radial: {
      src: 'assets/datasheet-radial.png',
      alt: 'EM2 데이터시트 operating condition의 radial position tolerance 플러스마이너스 0.127 밀리미터 표',
      source: 'DATA SHEET · OPERATING CONDITIONS',
      value: 'Radial position ±0.127 mm',
      detail: '미세한 체결 이동과 축 편심도 허용 범위를 소모함. 빨간 박스의 Radial position 항목을 기준으로 확인함.'
    }
  };

  document.querySelectorAll('[data-spec-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = datasheetViews[button.dataset.specView];
      document.querySelectorAll('[data-spec-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const image = document.querySelector('#datasheet-image');
      image.src = view.src;
      image.alt = view.alt;
      document.querySelector('#datasheet-source').textContent = view.source;
      document.querySelector('#datasheet-value').textContent = view.value;
      document.querySelector('#datasheet-detail').textContent = view.detail;
    });
  });

  motionToggle.addEventListener('click', () => {
    playing = !playing;
    motionToggle.setAttribute('aria-pressed', String(playing));
    motionToggle.textContent = playing ? 'Ⅱ 일시정지' : '▶ 회전 재생';
  });

  function animate(now) {
    const dt = Math.min(50, now - previousTime);
    previousTime = now;
    const previousAngle = angle;
    if (playing) angle = (angle + dt * 0.216) % 360;
    if (playing && angle < previousAngle) {
      indexRevolution += 1;
      document.querySelector('#index-revolution').textContent = `INDEX ${String(indexRevolution).padStart(2, '0')} · 기준 갱신`;
    }
    rotor.setAttribute('transform', `rotate(${angle} 205 175)`);
    angleValue.textContent = `${Math.round(angle)}°`;

    const scanX = 86 + (angle / 360) * 620;
    const aHigh = Math.floor(angle / 45) % 2 === 0;
    const bHigh = Math.floor(((angle + 22.5) % 360) / 45) % 2 === 1;
    const state = scenarios[activeScenario];
    scanLine.setAttribute('x1', scanX); scanLine.setAttribute('x2', scanX);
    scanDotA.setAttribute('cx', scanX); scanDotA.setAttribute('cy', state.a && aHigh ? 70 : 125);
    scanDotB.setAttribute('cx', scanX); scanDotB.setAttribute('cy', state.b && bHigh ? 190 : 245);

    const indexHigh = angle < 24;
    const indexScanX = 8 + (angle / 360) * 404;
    if (indexHigh !== lastIndexHigh) {
      [indexSensor, indexBeam, indexLive, indexChannel].forEach(node => node.classList.toggle('is-active', indexHigh));
      document.querySelector('#index-live-state').textContent = indexHigh ? '기준점 통과' : '다음 기준점 대기';
      document.querySelector('#index-pulse-state').textContent = indexHigh ? 'HIGH · 기준점 통과' : 'LOW · 다음 기준점 대기';
      lastIndexHigh = indexHigh;
    }
    indexScanLine.setAttribute('x1', indexScanX); indexScanLine.setAttribute('x2', indexScanX);
    indexScanDot.setAttribute('cx', indexScanX); indexScanDot.setAttribute('cy', indexHigh ? 18 : 82);
    requestAnimationFrame(animate);
  }

  updateScenario('normal');
  requestAnimationFrame(animate);
})();
