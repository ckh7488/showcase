/* Explore existing 100 MHz results. These controls do not run an EM solver. */
(() => {
  const rows = [...document.querySelectorAll('.result-row')];
  let selected = rows.find(row => row.getAttribute('aria-pressed') === 'true') || rows[0];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function choose(row) {
    selected = row;
    for (const other of rows) other.setAttribute('aria-pressed', String(other === row));
    const db = Number(row.dataset.rl);
    const reflected = 100 * Math.pow(10, -db / 10);
    document.querySelector('#result-name').textContent = row.dataset.title;
    document.querySelector('#result-value').textContent = db.toFixed(2);
    document.querySelector('#result-margin').textContent = '+' + (db - 16).toFixed(2) + ' dB 여유';
    document.querySelector('#result-reflection').textContent = reflected.toFixed(3) + '%';
    document.querySelector('#result-note').textContent = row.dataset.note;
    window.__pcbViewer?.select({segment:row.dataset.segment, pair:row.dataset.pair});
  }
  rows.forEach(row => row.addEventListener('click', () => choose(row)));
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
  const db=Number(selected.dataset.rl);
  document.querySelector('#result-reflection').textContent=(100*Math.pow(10,-db/10)).toFixed(3)+'%';

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
