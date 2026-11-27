/* PALA720 회전 정지 진단 · interactions.
   PTS: values read from the ESCON Studio screen recording, one row per display update.
   [time s, command rpm, actual rpm (hall), motor current A] */
(function(){
"use strict";
const DATA = {"pts":[[0.0,0.0,0.0,0.0,0,0],[4.4,170.7,166.4,1.6156,0,0],[5.4,304.2,293.8,3.5157,0,0],[6.4,458.0,460.0,3.3082,0,0],[7.4,596.7,592.5,3.8889,1,0],[8.4,749.3,742.1,3.9011,1,0],[9.4,900.5,897.1,3.9652,1,0],[10.2,1037.5,1008.9,3.9947,1,0],[11.2,1194.9,1011.0,3.9948,1,0],[12.2,1330.6,1001.3,3.9936,1,0],[13.2,1486.1,1012.7,3.9985,1,0],[14.2,1620.8,969.1,3.9965,1,0],[15.0,1757.6,992.3,3.9923,1,0],[16.0,1804.0,1020.2,3.9946,1,0],[17.0,1803.9,989.9,3.999,1,0],[18.0,1804.0,1000.1,3.9986,1,0],[19.0,1803.8,1014.6,3.9937,1,0],[20.0,1803.8,1003.6,4.0001,1,0],[20.8,1803.8,996.2,3.9981,1,0],[21.8,1803.8,1059.9,3.9976,1,0],[22.8,1804.0,1021.1,3.9996,1,0],[23.8,1804.0,1010.7,4.0,1,0],[24.8,1804.0,992.6,4.0027,1,0],[25.8,1803.8,3.8,2.5,1,0],[26.6,1803.8,1.1,2.5,1,1],[27.6,1803.9,0.6,2.5,1,1],[28.6,1803.8,0.4,2.5,1,1],[29.6,1803.8,0.3,2.5,1,1],[30.6,1803.8,0.2,2.5,1,1],[31.2,1803.8,0.2,2.5,1,1]],"motion":[[3.3,43.37],[3.6,37.41],[3.9,25.96],[4.2,20.75],[4.5,16.81],[4.8,16.81],[5.1,18.85],[5.4,22.66],[5.7,22.05],[6.0,18.62],[6.3,14.39],[6.6,12.27],[6.9,13.42],[7.2,14.8],[7.5,14.76],[7.8,11.96],[8.1,10.38],[8.4,11.09],[8.7,12.78],[9.0,12.42],[9.3,11.05],[9.6,10.89],[9.9,11.66],[10.2,12.95],[10.5,13.11],[10.8,11.41],[11.1,10.81],[11.4,10.79],[11.7,12.6],[12.0,12.75],[12.3,11.75],[12.6,11.09],[12.9,11.37],[13.2,13.06],[13.5,13.42],[13.8,12.32],[14.1,11.03],[14.4,11.79],[14.7,13.05],[15.0,13.24],[15.3,11.53],[15.6,10.16],[15.9,10.03],[16.2,11.01],[16.5,12.08],[16.8,12.23],[17.1,10.58],[17.4,10.18],[17.7,10.95],[18.0,12.55],[18.3,12.54],[18.6,11.14],[18.9,9.74],[19.2,7.21],[19.5,4.5],[19.8,2.25],[20.1,2.34],[20.4,5.42],[20.7,8.29],[21.0,10.33],[21.3,14.48],[21.6,16.68]]};
const PTS = DATA.pts.map(p => p.slice(0, 4));
const MOTION = DATA.motion;           // [video time s, frame-to-frame change]
const CURLIM_T = 7.2;                 // "Current Limitation" lamp turns on
const STALL_T = 25.8;                 // current drops to 2.5 A (I2t), speed -> 0
const TMAX = 31.2, FRAMES = 31;       // sprite: frame k shows t = k + 0.5 s
const NS = "http://www.w3.org/2000/svg";
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const C = {
  ink: cssVar("--sc-ink"), muted: cssVar("--sc-muted"), line: cssVar("--sc-line"),
  accent: cssVar("--sc-accent"), focus: cssVar("--sc-focus"), rx: cssVar("--sc-rx"), surface: cssVar("--sc-surface")
};
function el(tag, attrs, parent){ const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function txt(parent, x, y, s, attrs){ const t = el("text", Object.assign({x, y, "font-size": 12, fill: C.muted, "font-family": "ui-monospace, Consolas, monospace"}, attrs || {}), parent); t.textContent = s; return t; }
const KR = "Malgun Gothic, system-ui, sans-serif";

function valueAt(t){ let r = PTS[0]; for (const p of PTS){ if (p[0] <= t) r = p; else break; } return r; }
function interp(t, i){
  if (t <= 4.2) return 0;
  for (let k = 1; k < PTS.length; k++){
    if (PTS[k][0] >= t){ const a = PTS[k-1], b = PTS[k]; const f = (t - a[0]) / ((b[0] - a[0]) || 1); return a[i] + (b[i] - a[i]) * f; }
  }
  return PTS[PTS.length - 1][i];
}
function series(i){ const out = [[0, 0], [4.2, 0]]; PTS.forEach(p => { if (p[0] > 0) out.push([p[0], p[i]]); }); return out; }

/* ---------- ESCON charts ---------- */
const X0 = 46, X1 = 626;
const xs = t => X0 + (X1 - X0) * t / TMAX;
function bands(svg, top, bottom){
  el("rect", {x: xs(CURLIM_T), y: top, width: xs(STALL_T) - xs(CURLIM_T), height: bottom - top, fill: C.rx, "fill-opacity": .16}, svg);
  el("rect", {x: xs(STALL_T), y: top, width: xs(TMAX) - xs(STALL_T), height: bottom - top, fill: C.focus, "fill-opacity": .13}, svg);
}
function drawChart(svg, cfg){
  const {top, bottom, ymax, ticks, lines, refs} = cfg;
  const ys = v => bottom - (bottom - top) * v / ymax;
  bands(svg, top, bottom);
  ticks.forEach(v => { el("line", {x1: X0, x2: X1, y1: ys(v), y2: ys(v), stroke: C.line}, svg); txt(svg, X0 - 6, ys(v) + 4, v.toLocaleString(), {"text-anchor": "end"}); });
  el("line", {x1: X0, x2: X1, y1: bottom, y2: bottom, stroke: C.muted}, svg);
  (refs || []).forEach(r => { el("line", {x1: X0, x2: X1, y1: ys(r.v), y2: ys(r.v), stroke: C.muted, "stroke-dasharray": "3 3"}, svg); txt(svg, r.x, ys(r.v) - 5, r.label, {"text-anchor": "end", "font-family": KR}); });
  lines.forEach(L => {
    const d = L.pts.map((p, k) => (k ? "L" : "M") + xs(p[0]).toFixed(1) + "," + ys(p[1]).toFixed(1)).join(" ");
    el("path", {d, fill: "none", stroke: L.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-dasharray": L.dash || "none"}, svg);
  });
  [5, 10, 15, 20, 25, 30].forEach(t => txt(svg, xs(t), bottom + 16, t + " s", {"text-anchor": "middle"}));
  const cross = el("line", {y1: top, y2: bottom, stroke: C.ink, "stroke-opacity": .5}, svg);
  const dots = lines.map(L => el("circle", {r: 4.5, fill: L.color, stroke: C.surface, "stroke-width": 2}, svg));
  return {ys, cross, dots, lines};
}
const spdSvg = document.getElementById("speed-chart"), curSvg = document.getElementById("current-chart");
const S = drawChart(spdSvg, {top: 26, bottom: 196, ymax: 2000, ticks: [0, 500, 1000, 1500, 2000],
  lines: [{pts: series(1), color: C.muted, dash: "5 4", i: 1}, {pts: series(2), color: C.accent, i: 2}]});
txt(spdSvg, xs(16.4), 18, "최고 전류에 막힌 구간", {"text-anchor": "middle", "font-family": KR});
txt(spdSvg, xs(28.5), 18, "정지", {"text-anchor": "middle", fill: C.focus, "font-family": KR, "font-weight": 700});
txt(spdSvg, xs(13), S.ys(1804) - 8, "명령 1,800", {"text-anchor": "middle"});
txt(spdSvg, xs(13), S.ys(1010) + 18, "실제 ≈1,000", {"text-anchor": "middle", fill: C.accent});
const I = drawChart(curSvg, {top: 14, bottom: 156, ymax: 4.5, ticks: [0, 1, 2, 3, 4],
  refs: [{v: 2.5, label: "연속 허용 2.5 A", x: xs(24.6)}],
  lines: [{pts: series(3), color: C.accent, i: 3}]});
txt(curSvg, xs(16), I.ys(4.0) + 18, "4.0 A 고정", {"text-anchor": "middle", fill: C.ink});

const slider = document.getElementById("t"), tval = document.getElementById("tval");
const frame = document.getElementById("frame"), frameLabel = document.getElementById("frame-label"), nowEl = document.getElementById("now");
let curT = 20;
function setT(t, fromSlider){
  t = Math.max(0, Math.min(TMAX, t)); curT = t;
  if (!fromSlider) slider.value = t.toFixed(1);
  tval.textContent = t.toFixed(1) + " s";
  const v = valueAt(t);
  const spd = v[2] < 10 ? v[2].toFixed(1) : Math.round(v[2]).toLocaleString();
  let state = '<span class="state">명령 대기</span>';
  if (t >= 4.4) state = '<span class="state ok">명령 따라가는 중</span>';
  if (t >= CURLIM_T) state = '<span class="state limit">전류 제한 · 최고치</span>';
  if (t >= STALL_T) state = '<span class="state stall">과열 보호 → 정지</span>';
  nowEl.innerHTML = `<span>전류 <b>${v[3].toFixed(2)} A</b></span><span>속도 <b>${spd} rpm</b> / 명령 <b>${Math.round(v[1]).toLocaleString()}</b></span>${state}`;
  const k = Math.min(FRAMES - 1, Math.floor(t));
  frame.style.transform = `translateY(${-(k / FRAMES) * 100}%)`;
  frameLabel.textContent = "녹화 " + (k + 0.5).toFixed(1) + " s 화면";
  [S, I].forEach(G => {
    const x = xs(t); G.cross.setAttribute("x1", x); G.cross.setAttribute("x2", x);
    G.lines.forEach((L, j) => { G.dots[j].setAttribute("cx", x); G.dots[j].setAttribute("cy", G.ys(interp(t, L.i))); });
  });
}
function hover(svg, tip, e, html){
  const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * 640;
  const t = Math.max(0, Math.min(TMAX, (px - X0) / (X1 - X0) * TMAX)); setT(t);
  tip.innerHTML = html(t, valueAt(t)); tip.style.opacity = 1;
  const left = e.clientX - r.left + 16;
  tip.style.left = Math.min(r.width - tip.offsetWidth, Math.max(0, left)) + "px"; tip.style.top = "36px";
}
spdSvg.addEventListener("pointermove", e => hover(spdSvg, document.getElementById("tip1"), e, (t, v) => `${t.toFixed(1)} s<br>명령 ${Math.round(v[1])} rpm<br>실제 ${v[2] < 10 ? v[2].toFixed(1) : Math.round(v[2])} rpm`));
curSvg.addEventListener("pointermove", e => hover(curSvg, document.getElementById("tip2"), e, (t, v) => `${t.toFixed(1)} s<br>전류 ${v[3].toFixed(2)} A`));
spdSvg.addEventListener("pointerleave", () => document.getElementById("tip1").style.opacity = 0);
curSvg.addEventListener("pointerleave", () => document.getElementById("tip2").style.opacity = 0);
slider.addEventListener("input", () => setT(parseFloat(slider.value), true));
let timer = null; const playBtn = document.getElementById("play");
function stopPlay(){ clearInterval(timer); timer = null; playBtn.textContent = "▶ 재생"; }
playBtn.addEventListener("click", () => {
  if (timer){ stopPlay(); return; }
  let t = parseFloat(slider.value); if (t >= TMAX - 0.2) t = 0;
  playBtn.textContent = "■ 멈춤";
  timer = setInterval(() => { t += 0.3; setT(t); if (t >= TMAX) stopPlay(); }, 100);
});
setT(20);

/* ---------- motion chart (reproduction video) ---------- */
(function(){
  const s = document.getElementById("motion-chart"); const x0 = 40, x1 = 510, top = 24, bot = 166, T0 = 3, T1 = 22, M = 25;
  const X = t => x0 + (x1 - x0) * (t - T0) / (T1 - T0), Y = v => bot - (bot - top) * v / M;
  el("rect", {x: X(21), y: top, width: X(22) - X(21), height: bot - top, fill: C.line, "fill-opacity": .5}, s);
  [0, 10, 20].forEach(v => { el("line", {x1: x0, x2: x1, y1: Y(v), y2: Y(v), stroke: C.line}, s); txt(s, x0 - 6, Y(v) + 4, v, {"text-anchor": "end"}); });
  [4, 8, 12, 16, 20].forEach(t => txt(s, X(t), bot + 16, t + " s", {"text-anchor": "middle"}));
  el("path", {d: MOTION.map((p, k) => (k ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join(" "), fill: "none", stroke: C.accent, "stroke-width": 2}, s);
  el("line", {x1: X(19.5), x2: X(19.5), y1: top, y2: bot, stroke: C.focus, "stroke-dasharray": "3 3"}, s);
  txt(s, X(19.5) - 4, top + 10, "19.5 s 정지", {"text-anchor": "end", fill: C.focus, "font-family": KR, "font-weight": 700});
  txt(s, x1, top - 8, "카메라 이동", {"text-anchor": "end", "font-family": KR, "font-size": 11});
})();

/* ---------- reproduction video ---------- */
(function(){
  const v = document.getElementById("fault-video"), fill = document.getElementById("vfill"), stop = document.getElementById("vstop");
  const place = () => { stop.style.left = (19.5 / (v.duration || 21.9) * 100) + "%"; };
  place(); v.addEventListener("loadedmetadata", place);
  v.addEventListener("timeupdate", () => { fill.style.width = (v.currentTime / (v.duration || 21.9) * 100) + "%"; });
  document.getElementById("vjump").addEventListener("click", () => { v.currentTime = 16; v.play().catch(() => {}); });
  document.getElementById("vstart").addEventListener("click", () => { v.currentTime = 0; v.play().catch(() => {}); });
})();

/* ---------- teardown photo viewer ---------- */
const PHOTOS = {
  hd1:    {src: "assets/photo-hd1.jpg",    label: "HARMONIC DRIVE", meta: "각인 \"…580977-1 JAPAN\" · 매우 뻑뻑", alt: "하우징 안쪽에 드러난 하모닉 드라이브"},
  hd2:    {src: "assets/photo-hd2.jpg",    label: "HARMONIC DRIVE", meta: "다른 각도", alt: "하모닉 드라이브를 다른 각도에서 본 모습"},
  parts:  {src: "assets/photo-parts.jpg",  label: "PARTS",          meta: "모터 · 베어링 · 엔코더 · 플레이트 · 부드러움", alt: "분해한 부품: maxon EC 플랫 모터, 베어링, 엔코더 보드, 마운트 플레이트"},
  bottom: {src: "assets/photo-bottom.jpg", label: "BOTTOM",         meta: "중공축 케이블 · 이상 없음", alt: "하부 커버를 연 모습, 중앙 중공축으로 케이블이 지나감"}
};
function showPhoto(key){
  const p = PHOTOS[key]; if (!p) return;
  const img = document.getElementById("pv-img"); img.src = p.src; img.alt = p.alt;
  document.getElementById("pv-zoom").dataset.full = p.src;
  document.getElementById("pv-label").textContent = p.label;
  document.getElementById("pv-meta").textContent = p.meta;
  document.querySelectorAll("[data-photo]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.photo === key)));
}
document.querySelectorAll("[data-photo]").forEach(b => b.addEventListener("click", () => showPhoto(b.dataset.photo)));

/* ---------- lightbox ---------- */
const lb = document.getElementById("lightbox"), lbBody = document.getElementById("lb-body");
let lastFocus = null;
function openLB(node){ lastFocus = document.activeElement; lbBody.replaceChildren(node); lb.hidden = false; document.getElementById("lb-close").focus(); }
function closeLB(){ lb.hidden = true; lbBody.replaceChildren(); if (lastFocus) lastFocus.focus(); }
document.querySelectorAll(".zoom").forEach(b => b.addEventListener("click", () => {
  const im = new Image(); im.src = b.dataset.full; im.alt = (b.querySelector("img") || {}).alt || ""; openLB(im);
}));
document.getElementById("screen").addEventListener("click", () => {
  const k = Math.min(FRAMES - 1, Math.floor(curT));
  const cv = document.createElement("canvas"); cv.width = 830; cv.height = 420;
  cv.setAttribute("aria-label", "녹화 " + (k + 0.5) + " s의 ESCON 화면");
  cv.getContext("2d").drawImage(frame, 0, k * 420, 830, 420, 0, 0, 830, 420);
  cv.style.width = "min(96vw, 1400px)"; cv.style.height = "auto";
  openLB(cv);
});
document.getElementById("lb-close").addEventListener("click", closeLB);
lb.addEventListener("click", e => { if (e.target === lb) closeLB(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !lb.hidden) closeLB(); });
})();
