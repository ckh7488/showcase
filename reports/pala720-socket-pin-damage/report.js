/* PALA720 모터 드라이버 소켓 파손 · page interactions (3D scene lives in viewer.js → window.VIEW). */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);

  /* ---------- photo overlay + lightbox ---------- */
  const ov = $("ov"), ovBtn = $("ov-toggle");
  ovBtn.addEventListener("click", e => {
    e.stopPropagation();
    const off = ov.classList.toggle("off");
    ovBtn.textContent = off ? "표시 켜기" : "표시 끄기";
    ovBtn.setAttribute("aria-pressed", String(!off));
  });
  const lb = $("lightbox"), lbBody = $("lb-body");
  document.querySelectorAll(".zoom[data-full]").forEach(b => b.addEventListener("click", () => {
    lbBody.innerHTML = ""; const img = new Image(); img.src = b.dataset.full; img.alt = ""; lbBody.appendChild(img);
    lb.hidden = false; $("lb-close").focus();
  }));
  const closeLb = () => { lb.hidden = true; };
  $("lb-close").addEventListener("click", closeLb);
  lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !lb.hidden) closeLb(); });

  /* ---------- pin map (from the KiCad netlist of J301) ---------- */
  const FN = {
    wire: ["f-wire", "모터 전선"], power: ["f-power", "전원 24 V"], gnd: ["f-gnd", "접지"],
    v5: ["f-v5", "센서 전원"], hall: ["f-hall", "위치센서"], un: ["f-un", "미사용"]
  };
  const PIN = {
    1: ["wire", "①", "WINDING1"], 2: ["wire", "①", "WINDING1"], 3: ["wire", "②", "WINDING2"], 4: ["wire", "②", "WINDING2"],
    5: ["wire", "③", "WINDING3"], 6: ["wire", "③", "WINDING3"], 7: ["power", "", "+24V_5A"], 8: ["power", "", "+24V_5A"],
    9: ["gnd", "", "GND"], 10: ["gnd", "", "GND"], 11: ["v5", "", "+5V_MAXON"], 12: ["un", "", "미연결"],
    13: ["hall", "①", "HALL1"], 14: ["un", "", "미연결"], 15: ["hall", "②", "HALL2"], 16: ["un", "", "미연결"],
    17: ["hall", "③", "HALL3"], 18: ["un", "", "미연결"]
  };
  function note(n) {
    const k = PIN[n][0], front = n % 2 === 1;
    if (k === "un") return "사용하지 않는 핀.";
    if (k === "hall" || k === "v5") return "앞줄에만 있는 센서 핀. 빠져서 드라이버가 모터 위치를 모름." + (n === 15 || n === 17 ? " 이 핀은 배선까지 뜯김." : "");
    const pair = front ? n + 1 : n - 1;
    return front ? `짝인 ${pair}번(뒷줄)만 남아 이 선은 핀 하나로 이어짐.` : `짝인 ${pair}번(앞줄)이 빠져 이 핀 하나로만 이어짐.`;
  }
  const grid = $("pin-grid"), info = $("pin-info");
  const rh = (t, s) => { const d = document.createElement("div"); d.className = "rh"; d.innerHTML = t + "<small>" + s + "</small>"; return d; };
  function cell(n) {
    const [k, sub] = PIN[n], front = n % 2 === 1;
    const b = document.createElement("button"); b.type = "button";
    b.className = "pin" + (k === "un" ? " unused" : front ? " out" : "");
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<b>${n}</b><span>${FN[k][1]}${sub ? " " + sub : ""}</span>`;
    b.addEventListener("click", () => select(n));
    b.dataset.n = n; return b;
  }
  grid.appendChild(rh("뒷줄", "케이스 안"));
  for (let i = 0; i < 9; i++) grid.appendChild(cell(2 + 2 * i));
  grid.appendChild(rh("앞줄", "빠짐"));
  for (let i = 0; i < 9; i++) grid.appendChild(cell(1 + 2 * i));
  function select(n) {
    grid.querySelectorAll(".pin").forEach(p => p.setAttribute("aria-pressed", String(+p.dataset.n === n)));
    const [k, sub, net] = PIN[n], front = n % 2 === 1;
    const st = front ? (n === 15 || n === 17 ? '<span class="st out">핀 빠짐 · 배선 뜯김</span>' : '<span class="st out">핀 빠짐</span>') : '<span class="st in">케이스 안</span>';
    info.innerHTML = `<b>${n}번 · ${FN[k][1]}${sub ? " " + sub : ""}</b> <span class="mono">${net}</span>${st}<br>${note(n)}`;
  }
  select(13);

  /* ---------- 3D tour ---------- */
  const STEPS = [
    { t: "이 보드가 하는 일", d: "24 V → 모듈 → 모터. 위치센서 신호는 모터 → 모듈.", view: "overview", dmg: 0, mod: 1, cs: 1 },
    { t: "모듈은 소켓 2개에 꽂힘", d: "문제는 전원·모터 소켓(18핀). 전원·모터 전선·위치센서가 모두 지나감.", view: "sockets", dmg: 0, mod: 0.35, cs: 1 },
    { t: "정상: ㄴ자 핀이 닿음", d: "핀 발은 패드에 납땜, 세운 부분은 케이스 안에서 모듈 핀에 닿음.", view: "side", dmg: 0, mod: 0.3, cs: 0.3, flow: false },
    { t: "추정: 오른쪽 끝을 들어 올림", d: "케이스는 모듈과 함께 들리고, 납땜된 앞줄 핀은 꺾이며 빠짐.", view: "pry", dmg: 0.5, mod: 0.6, cs: 1, flow: false, fault: true },
    { t: "실제: 앞줄 핀이 케이스 밖", d: "앞줄 구멍은 빔. 다시 꽂아도 닿을 금속이 없음. 뒷줄은 안에 남음.", view: "side", dmg: 1, mod: 0, cs: 0.45, flow: false, fault: true },
    { t: "오른쪽 끝: 배선까지 뜯김", d: "패드·배선이 벗겨져 핀에 매달림. 기판 자체 손상.", view: "peel", dmg: 1, mod: 0, cs: 1, flow: false, fault: true },
    { t: "결과: 모터 정지", d: "전원은 뒷줄로 일부 들어가도, 위치센서가 끊겨 드라이버가 못 돌림.", view: "result", dmg: 1, mod: 0.3, cs: 1, fault: true }
  ];
  const steps = $("steps");
  STEPS.forEach((s, i) => {
    const li = document.createElement("li"); if (s.fault) li.className = "fault";
    li.innerHTML = `<button type="button" aria-pressed="false"><span class="t"><i>${i + 1}</i>${s.t}</span><span class="d">${s.d}</span></button>`;
    li.querySelector("button").addEventListener("click", () => go(i));
    steps.appendChild(li);
  });
  const seg = document.querySelectorAll(".seg button"), dmg = $("dmg"), status = $("status");
  const ckMod = $("ck-mod"), ckCase = $("ck-case"), ckFlow = $("ck-flow"), ckLbl = $("ck-lbl"), fade = $("fade"), fadeV = $("fade-v");
  function V() { return window.VIEW; }
  function go(i) {
    const s = STEPS[i], v = V(); if (!v) return;
    steps.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    v.goView(s.view); v.setDamage(s.dmg); v.setModule(s.mod); v.setCase(s.cs); v.setFlows(s.flow !== false);
  }
  function sync() {
    const s = V().state;
    seg.forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === (s.target > 0.1 ? 1 : 0))));
    ckMod.checked = s.moduleTarget > 0; ckCase.checked = s.caseTarget < 0.9; ckFlow.checked = s.flows; ckLbl.checked = s.labels;
  }
  function init() {
    const v = V(); if (!v) return;
    seg.forEach(b => b.addEventListener("click", () => v.setDamage(+b.dataset.v)));
    dmg.addEventListener("input", () => v.setDamage(dmg.value / 100, false));
    ckMod.addEventListener("change", () => v.setModule(ckMod.checked ? 1 : 0));
    ckCase.addEventListener("change", () => v.setCase(ckCase.checked ? 0.3 : 1));
    ckFlow.addEventListener("change", () => v.setFlows(ckFlow.checked));
    ckLbl.addEventListener("change", () => v.setLabels(ckLbl.checked));
    fade.addEventListener("input", () => { v.setFade(1 - fade.value / 100); fadeV.textContent = fade.value + "%"; });
    document.querySelectorAll(".views button").forEach(b => b.addEventListener("click", () => v.goView(b.dataset.k)));
    document.addEventListener("viewstate", sync);
    document.addEventListener("damage", e => {
      dmg.value = Math.round(e.detail * 100);
      const bad = e.detail > 0.1;
      status.textContent = bad ? "모터 정지" : "모터 회전 중"; status.classList.toggle("bad", bad);
    });
    go(0);
  }
  if (window.VIEW) init(); else document.addEventListener("viewready", init);
})();
