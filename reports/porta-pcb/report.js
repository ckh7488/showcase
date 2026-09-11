/* Explore existing 100 MHz results. These controls do not run an EM solver. */
(() => {
  const rows = [...document.querySelectorAll('.result-row')];
  let selected = rows.find(row => row.getAttribute('aria-pressed') === 'true') || rows[0];
  const lastPair = {cable:'rx', phy:'rx'};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function stage(row) {
    return row.dataset.segment === 'phy' ? '초기 openEMS · 수렴 미검증' :
      row.dataset.note.includes('목표는 미달') ? '정밀 FEM · 수렴 목표 미달' : '정밀 FEM · 격자 비교 목표 충족';
  }
  function updateViewerReadout(segment, pair) {
    const sameSegment = rows.filter(row => row.dataset.segment === segment);
    document.getElementById('viewer-readout-name').textContent = segment === 'phy' ? '트랜스 ↔ PHY' : '트랜스 ↔ M12';
    document.getElementById('viewer-readout-stage').textContent = stage(sameSegment[0]);
    for (const button of document.querySelectorAll('[data-viewer-result]')) {
      const row = sameSegment.find(item => item.dataset.pair === button.dataset.viewerResult);
      button.querySelector('strong').textContent = Number(row.dataset.rl).toFixed(2) + ' dB';
      button.setAttribute('aria-pressed', String(pair === row.dataset.pair));
      button.setAttribute('aria-label', `${row.dataset.title}, 반사손실 ${Number(row.dataset.rl).toFixed(2)} dB. 상세 결과 선택`);
    }
    document.getElementById('result-selection-context').textContent = pair === 'both' ?
      `3D는 이 구간의 TX/RX를 함께 표시합니다. 상세 수치: ${selected.dataset.title}.` : '';
  }
  function choose(row, moveViewer = true) {
    selected = row;
    lastPair[row.dataset.segment] = row.dataset.pair;
    const initial = row.dataset.segment === 'phy';
    for (const other of rows) other.setAttribute('aria-pressed', String(other === row));
    // Missing results stay missing: Number('') would incorrectly show 0 dB.
    const rawDb = row.dataset.rl;
    const db = rawDb !== undefined && rawDb.trim() !== '' ? Number(rawDb) : NaN;
    const available = Number.isFinite(db);
    const rawMargin = row.dataset.margin;
    const margin = rawMargin !== undefined && rawMargin.trim() !== '' ? Number(rawMargin) : db - 16;
    const marginLabel = document.querySelector('#result-margin');
    document.querySelector('#result-name').textContent = row.dataset.title;
    document.querySelector('#result-stage').textContent = stage(row);
    document.querySelector('#result-stage').classList.toggle('initial', initial);
    document.querySelector('#result-value').textContent = available ? db.toFixed(2) : '—';
    document.querySelector('#result-unit').hidden = !available;
    marginLabel.textContent = !available ? (row.dataset.status || '정밀값 미확인') :
      margin < 0 ? Math.abs(margin).toFixed(2) + ' dB 부족' :
      margin === 0 ? '16 dB 기준과 같음' : '+' + margin.toFixed(2) + ' dB 여유';
    if (initial && available) marginLabel.textContent = '초기 계산상 ' + marginLabel.textContent;
    marginLabel.classList.toggle('is-short', available && margin < 0);
    marginLabel.classList.toggle('is-pending', !available);
    const rawReflected = row.dataset.reflected;
    const reflected = rawReflected !== undefined && rawReflected.trim() !== '' ?
      Number(rawReflected) : 100 * Math.pow(10, -db / 10);
    document.querySelector('#result-reflection').textContent = available && Number.isFinite(reflected) ?
      reflected.toFixed(3) + '%' : '—';
    for (const [id, key, digits, unit] of [
      ['result-il', 'il', 4, ' dB'], ['result-transmitted', 'transmitted', 3, '%']
    ]) {
      const raw = row.dataset[key];
      const value = raw !== undefined && raw.trim() !== '' ? Number(raw) : NaN;
      const target = document.getElementById(id);
      if (target) target.textContent = Number.isFinite(value) ? value.toFixed(digits) + unit : initial ? '정밀값 미확정' : '—';
    }
    document.getElementById('result-il-label').textContent = initial ? '삽입손실 · T2 → PHY' : '삽입손실 · T2 → M12';
    document.getElementById('result-evidence').href = initial ? '#phy-raw-values' : 'records/tx-recheck/summary.json';
    document.querySelector('#result-note').textContent = row.dataset.note;
    if (moveViewer) window.__pcbViewer?.select({segment:row.dataset.segment, pair:row.dataset.pair});
    const state = window.__pcbViewer?.snapshot();
    updateViewerReadout(row.dataset.segment, state?.segment === row.dataset.segment ? state.pair : row.dataset.pair);
  }
  rows.forEach(row => row.addEventListener('click', () => choose(row)));
  document.addEventListener('pcb-selection-change', ({detail}) => {
    const pair = detail.pair === 'both' ? lastPair[detail.segment] : detail.pair;
    const row = rows.find(r => r.dataset.segment === detail.segment && r.dataset.pair === pair);
    if (row) choose(row, false);
    updateViewerReadout(detail.segment, detail.pair);
  });
  document.querySelectorAll('[data-viewer-result]').forEach(button => button.addEventListener('click', () => {
    const segment = window.__pcbViewer?.snapshot().segment || selected.dataset.segment;
    choose(rows.find(row => row.dataset.segment === segment && row.dataset.pair === button.dataset.viewerResult));
  }));
  document.getElementById('result-evidence').addEventListener('click', () => {
    if (selected.dataset.segment === 'phy') document.getElementById('precision-validation').open = true;
  });
  // Geometry links in the analysis and raw record select the same numeric case.
  document.querySelectorAll('.record-view').forEach(button => button.addEventListener('click', () => {
    choose(rows.find(row => row.dataset.segment === button.dataset.segment && row.dataset.pair === button.dataset.pair));
    if (button.dataset.focus === 'signal') document.getElementById('view-rx').click();
    document.querySelector('#method').scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth'});
    document.querySelector(button.dataset.segment==='phy'?'#segment-phy':'#segment-cable').focus({preventScroll:true});
  }));
  document.querySelector('#result-to-pcb').addEventListener('click', () => {
    choose(selected);
    document.querySelector('#method').scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth'});
    document.querySelector(selected.dataset.segment==='phy'?'#segment-phy':'#segment-cable').focus({preventScroll:true});
  });
  const slider = document.querySelector('#db-slider');
  function explainDb() {
    const db = Number(slider.value);
    document.querySelector('#db-value').value = db + ' dB';
    document.querySelector('#db-percent').textContent = (100 * Math.pow(10,-db/10)).toFixed(2) + '%';
  }
  slider.addEventListener('input', explainDb);explainDb();
  // Start the readout and geometry on the same RX path.
  choose(selected);

  const shell=document.querySelector('.viewer-shell');
  const fullButton=document.querySelector('#viewer-fullscreen');
  if (!document.fullscreenEnabled) fullButton.hidden=true;
  fullButton.addEventListener('click', async()=>{
    try {if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}
    catch {fullButton.textContent='이 브라우저에서 확대 불가';}
  });
  document.addEventListener('fullscreenchange',()=>{
    fullButton.textContent=document.fullscreenElement?'닫기 · Esc':'크게 보기 ⛶';
    fullButton.setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));
  });
  const navigation=[...document.querySelectorAll('.topbar nav a')];
  const sections=navigation.map(a=>document.querySelector(a.getAttribute('href')));
  let ticking=false;
  function markSection(){
    const y=document.querySelector('.topbar').offsetHeight+110;
    let current=sections[0];
    for(const section of sections)if(section.getBoundingClientRect().top<=y)current=section;
    for(const link of navigation)link.setAttribute('aria-current',String(link.getAttribute('href')==='#'+current.id));
    ticking=false;
  }
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(markSection);}}, {passive:true});
  addEventListener('resize',markSection);
  addEventListener('hashchange',markSection);
  markSection();
})();
