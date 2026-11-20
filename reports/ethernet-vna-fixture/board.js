
"use strict";
(() => {
const $ = id => document.getElementById(id);

// 발룬 보드의 4페어. PCB 넷(/DA_P … /DD_N, Net-(J2-In) … Net-(J5-In))과 같은 순서다.
const pairs = {
  A: {sma:'J2', balun:'T1', pins:[1,2]},
  B: {sma:'J3', balun:'T2', pins:[3,6]},
  C: {sma:'J4', balun:'T3', pins:[4,5]},
  D: {sma:'J5', balun:'T4', pins:[7,8]}
};
let pair = 'A', enlarged = false;

// 연결 흐름도 조각: 상자와 케이블(선).
const node = (title, sub, cls = '') => `<div class="node ${cls}"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
const link = label => `<div class="link"><span>${label}</span></div>`;

function connection() {
  const p = pairs[pair];
  const balun = node('발룬 보드', `SMA ${p.sma} → RJ45`);
  $('connection').innerHTML = [
    node('VNA', 'Port 1', 'end'), link('SMA 케이블'), balun, link(''),
    node('이더넷 케이블', `페어 ${pair} (${p.pins[0]}, ${p.pins[1]}번 선)`, 'dut'),
    link(''), balun, link('SMA 케이블'), node('VNA', 'Port 2', 'end')
  ].join('');
  $('pairSummary').innerHTML = `<b>페어 ${pair}</b>는 양쪽 보드 모두 SMA <b>${p.sma}</b>에 VNA 케이블을 꽂습니다. 신호는 발룬(${p.balun})을 거쳐 RJ45 <b>${p.pins[0]}번(+), ${p.pins[1]}번(−)</b>으로 나갑니다.`;
  $('pairRows').innerHTML = Object.entries(pairs).map(([k, v]) =>
    `<tr${k === pair ? ' class="on"' : ''}><td>${k}</td><td>${v.sma}</td><td>${v.balun}</td><td>${v.pins.join(' / ')}</td></tr>`).join('');
  document.querySelectorAll('[data-pair]').forEach(e => e.setAttribute('aria-pressed', String(e.dataset.pair === pair)));
}

function pairOf(net) {
  const m = net.match(/\/(?:PAIR_|D)([ABCD])_/);
  if (m) return m[1];
  const n = net.match(/Net-\(J([2-5])-In\)/);
  return n ? 'ABCD'[Number(n[1]) - 2] : '';
}
function board() {
  const b = window.FIXTURE_BOARDS.boards.common, hl = $('onlyPair').checked ? pair : 'all', layer = $('layer').value;
  const [x0, y0, x1, y1] = b.bounds, ns = 'http://www.w3.org/2000/svg', svg = $('pcb');
  svg.replaceChildren();
  let box = [x0 - 3, y0 - 4, x1 - x0 + 6, y1 - y0 + 8];
  if (enlarged) {
    const target = b.parts.find(p => p.ref === 'J1');
    box = [target.xy[0] - 14, target.xy[1] - 11, 28, 22];
  }
  svg.setAttribute('viewBox', box.join(' '));
  const add = (tag, attrs, txt) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (txt !== undefined) e.textContent = txt;
    svg.append(e);
    return e;
  };
  add('rect', {x:x0, y:y0, width:x1-x0, height:y1-y0, fill:'none', stroke:'var(--sc-muted)', 'stroke-width':.16});
  for (const s of b.segments) {
    if (layer !== 'all' && s.layer !== layer) continue;
    const match = hl === 'all' || pairOf(s.net) === hl;
    add('line', {x1:s.start[0], y1:s.start[1], x2:s.end[0], y2:s.end[1], stroke:s.layer === 'F.Cu' ? 'var(--sc-tx)' : 'var(--sc-rx)', 'stroke-width':s.width, 'stroke-linecap':'round', opacity:match ? 1 : .13});
  }
  for (const p of b.pads) {
    const match = hl === 'all' || pairOf(p.net) === hl;
    const c = add('circle', {cx:p.xy[0], cy:p.xy[1], r:Math.min(p.size[0], p.size[1]) * .25, fill:pairOf(p.net) ? 'var(--sc-stage-ink)' : 'var(--sc-ground)', opacity:match ? .9 : .18});
    const title = document.createElementNS(ns, 'title');
    title.textContent = `${p.ref}.${p.pin || '기구'} · ${p.net || 'NC / mounting'}`;
    c.append(title);
    if ($('pinLabels').checked && p.ref.startsWith('J') && p.pin && match)
      add('text', {x:p.xy[0] + .65, y:p.xy[1] - .65, fill:'var(--sc-stage-ink)', 'font-size':1.35, 'paint-order':'stroke', stroke:'var(--sc-stage)', 'stroke-width':.35}, p.pin);
  }
  for (const p of b.parts.filter(p => /^[JT][0-9]+$/.test(p.ref))) {
    const mine = hl === 'all' || p.ref === 'J1' || p.ref === pairs[hl].sma || p.ref === pairs[hl].balun;
    add('text', {x:p.xy[0], y:p.xy[1] - 4, fill:'var(--sc-stage-ink)', 'font-size':mine && hl !== 'all' ? 2.1 : 1.65, 'font-weight':mine && hl !== 'all' ? 700 : 400, 'text-anchor':'middle', opacity:mine ? 1 : .35}, p.ref);
  }
  $('zoomBoard').textContent = enlarged ? '전체 보드 보기' : 'RJ45 쪽 확대';
}

document.querySelectorAll('[data-pair]').forEach(e => e.addEventListener('click', () => { pair = e.dataset.pair; connection(); board(); }));
['onlyPair','layer','pinLabels'].forEach(id => $(id).addEventListener('change', board));
$('zoomBoard').onclick = () => { enlarged = !enlarged; board(); };
connection(); board();
})();
