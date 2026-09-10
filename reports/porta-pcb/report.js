/* Explore existing 100 MHz results. These controls do not run an EM solver. */
(() => {
  const rows = [...document.querySelectorAll('.result-row')];
  let selected = rows.find(row => row.getAttribute('aria-pressed') === 'true') || rows[0];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function choose(row, moveViewer = true) {
    selected = row;
    for (const other of rows) other.setAttribute('aria-pressed', String(other === row));
    // Missing results stay missing: Number('') would incorrectly show 0 dB.
    const rawDb = row.dataset.rl;
    const db = rawDb !== undefined && rawDb.trim() !== '' ? Number(rawDb) : NaN;
    const available = Number.isFinite(db);
    const rawMargin = row.dataset.margin;
    const margin = rawMargin !== undefined && rawMargin.trim() !== '' ? Number(rawMargin) : db - 16;
    const marginLabel = document.querySelector('#result-margin');
    document.querySelector('#result-name').textContent = row.dataset.title;
    document.querySelector('#result-value').textContent = available ? db.toFixed(2) : '—';
    document.querySelector('#result-unit').hidden = !available;
    marginLabel.textContent = !available ? (row.dataset.status || '정밀값 미확인') :
      margin < 0 ? Math.abs(margin).toFixed(2) + ' dB 부족' :
      margin === 0 ? '16 dB 기준과 같음' : '+' + margin.toFixed(2) + ' dB 여유';
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
      if (target) target.textContent = Number.isFinite(value) ? value.toFixed(digits) + unit : '—';
    }
    document.querySelector('#result-note').textContent = row.dataset.note;
    if (moveViewer) window.__pcbViewer?.select({segment:row.dataset.segment, pair:row.dataset.pair});
  }
  rows.forEach(row => row.addEventListener('click', () => choose(row)));
  // Historical PHY values remain in the folded record, with their own geometry links.
  document.querySelectorAll('.record-view').forEach(button => button.addEventListener('click', () => {
    window.__pcbViewer?.select({segment:button.dataset.segment, pair:button.dataset.pair});
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
  // Initialize reading without moving the reader's initial 3D view.
  choose(selected, false);

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
