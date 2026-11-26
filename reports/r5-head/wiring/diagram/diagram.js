import { harnesses } from "./connections.js";
import { wires } from "./wires.js";

const circuits = {
  control: "제어 통신",
  power5: "5 V 전원",
  power12: "12 V 전원",
  motors: "모터 결선",
  usb: "USB",
};
const colors = { 빨강: "red", 검정: "black", 흰색: "white", 초록: "green" };
const parts = {
  "xt30pw-m": "AMASS XT30PW-M · 기판",
  "xt30u-f": "AMASS XT30U-F · 전선",
  "xt30u-m": "AMASS XT30U-M · 전선",
  "xt60u-f": "AMASS XT60U-F · 전선",
  "xt60u-m": "AMASS XT60U-M · 전선",
  "xt60e-f": "AMASS XT60E-F · 패널",
  "wago-221-412": "WAGO 221-412 · 2구",
  "wago-221-413": "WAGO 221-413 · 3구",
  "littelfuse-0fhm": "Littelfuse MINI FHM · 홀더 제품군",
  "phr-2": "JST PHR-2 · 전선",
  "phr-3": "JST PHR-3 · 전선",
  "ehr-3": "JST EHR-3 · 전선",
  "b2b-ph-k-s": "JST B2B-PH-K-S · 기판",
  "b3b-ph-k-s": "JST B3B-PH-K-S · 기판",
  "b3b-eh-a": "JST B3B-EH-A · 기판",
  "openrb-eh": "ROBOTIS OpenRB-150 · 기판",
  "usb-a": "USB-A · 플러그 예시",
  "usb-c": "USB-C · 플러그 예시",
  "u20cam-board": "U20CAM-1080P-S1 기판 · 키 플러그는 사진 밖",
};
const joinParts = {
  "A5 J1 패드": "xt30pw-m", "A5 J2 패드": "xt30pw-m", "A5 J3": "b2b-ph-k-s",
  "A5 J4": "b3b-ph-k-s", "A5 J5": "b3b-ph-k-s", "A5 J6": "b3b-ph-k-s",
  "A5 J7": "b3b-eh-a", "A5 J8": "b3b-eh-a", "OpenRB EH": "openrb-eh",
  "받침 5 V IN": "xt30u-f", "5 V 어댑터 플러그": "xt30u-m", "받침 12 V IN": "xt60u-f",
  "12 V SERVICE 고정": "xt60u-m", "12 V SERVICE 가동": "xt60e-f",
};
const crimpParts = {
  "phr-2": "SPH-002T-P0.5S",
  "phr-3": "SPH-002T-P0.5S",
  "ehr-3": "SEH-001T-P0.6",
};
const branchWires = {
  "+5 V 분기": "W1 · W3 · W5",
  "5 V GND 분기": "W2 · W4 · W28",
  "DATA 분기": "W12 · W21 · W30",
  "+12 V 분기": "W6 · W35",
  "12 V GND 분기": "W7 · W36",
};

const list = document.querySelector("#harnesses");
const aside = document.querySelector("#inspector");
const title = document.querySelector("#inspector-title");
const inspectorBody = document.querySelector("#inspector-body");
const groups = new Map();
const cards = new Map();
const mobile = window.matchMedia("(max-width: 820px)");
let activeCircuit = "all";
let active = null;
let returnTo = null;

function node(tag, name, content) {
  const result = document.createElement(tag);
  if (name) result.className = name;
  if (content != null) result.textContent = content;
  return result;
}

function action(name, label, description, callback) {
  const button = node("button", name, label);
  button.type = "button";
  button.setAttribute("aria-label", description);
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", () => callback(button));
  return button;
}

const endpoint = end => end.part === "xt30u-f" && /^A5 J[12]/.test(end.label)
  ? `XT30U-F ${end.pin === "2" ? "+" : "−"} 컵 → ${end.label} ${end.pin}`
  : `${end.label} · ${end.pin}`;
const wireColor = row => row.color ?? wires[row.wire]?.color;

function makeCard(harness) {
  const card = node("article", "harness");
  card.id = harness.id;
  const heading = node("div", "harness-head");
  heading.append(node("h3", "", harness.title), node("span", "count", harness.count));
  card.append(heading);
  const contactRows = harness.rows.map((row, index) => {
    const line = node("div", "wire-row");
    const pinButton = (end, side) => {
      if (!end) return node("span");
      const pin = action(`pin${row.wire ? "" : " unused"}`, null,
        `${endpoint(end)} ${row.signal}`,
        button => select(harness, index, side, button));
      pin.append(node("span", "number", end.pin), node("span", "name", end.label));
      return pin;
    };
    const wire = action("wire", null, `${row.wire ?? "미사용 핀"} ${row.signal} 연결 상세`,
      button => select(harness, index, "", button));
    if (row.wire) wire.append(node("span", `stripe ${colors[wireColor(row)] ?? ""}`));
    else wire.append(node("span", "cross", "×"));
    wire.append(node("span", "", [row.wire, row.signal].filter(Boolean).join(" · ")));
    line.append(pinButton(row.from, "from"), wire, pinButton(row.to, "to"));
    card.append(line);
    return line;
  });
  cards.set(harness.id, { card, contactRows });
  return card;
}

function put(label, value, container) {
  const group = node("div");
  group.append(node("dt", "", label), node("dd", "", value));
  container.append(group);
}

function fabricationNotes(row) {
  const entry = wires[row.wire];
  if (!entry) return row.detail;
  const notes = [];
  if (/^W(6|7|35|36)$/.test(row.wire)) {
    notes.push("EcoWire 6718 또는 동급(외경 ≤3.03 mm, 허용 굽힘 반경 ≤15.6 mm)을 씁니다. 노출 경로에 WAGO 탈피 11 mm와 XT60 단자까지의 실측 삽입분을 더해 재단합니다.");
    if (row.wire === "W35" || row.wire === "W36") {
      notes.push("CAD 시작점과 컵 사이의 절연 구간도 실측해 더합니다.");
    }
  } else if (/^W[89]$/.test(row.wire)) {
    notes.push("EcoWire 6715 또는 동급(외경 1.65–1.75 mm, 허용 굽힘 반경 ≤8.8 mm)을 씁니다. 노출 경로에 양쪽 XT60·XT30 컵의 실측 삽입분을 더해 재단합니다.");
  } else if (row.from.part?.startsWith("wago-") || row.to.part?.startsWith("wago-")) {
    notes.push("WAGO 쪽 피복을 11 mm 벗기고 끝까지 넣은 뒤 당겨 확인합니다.");
  }
  const terminals = [row.from.part, row.to.part].filter(part => Object.hasOwn(crimpParts, part));
  if (terminals.length) {
    notes.push(`압착 단자 ${[...new Set(terminals.map(part => crimpParts[part]))].join(" / ")}`);
  }
  if ([row.from.part, row.to.part].some(part => part?.startsWith("xt"))) {
    notes.push("XT의 +·− 몸체 각인에 맞춰 납땜하고 컵을 각각 절연합니다.");
  }
  if (row.wire === "W5" || row.wire === "W29") {
    notes.push("퓨즈 홀더의 해당 순정 리드에 납땜하고 열수축합니다.");
  }
  const branch = [row.from, row.to].find(end => end.part?.startsWith("wago-"));
  if (branch) notes.push(`${branch.label} 한 블록에는 ${branchWires[branch.label]}을 꽂습니다. 같은 블록 안에서 구멍 순서는 자유입니다.`);
  return notes.join(" ");
}

function showParts(ends) {
  const images = node("div", "images");
  const used = new Set();
  for (const end of ends) {
    if (!end || !end.part) continue;
    for (const part of [end.part, joinParts[end.label]]) {
      if (!part || used.has(part)) continue;
      used.add(part);
      const figure = node("figure");
      const imageLink = node("a");
      const imagePath = `images/${part}.webp`;
      imageLink.href = imagePath;
      imageLink.setAttribute("aria-label", `${parts[part]} 사진 확대`);
      const image = node("img");
      image.src = imagePath;
      image.alt = parts[part];
      imageLink.append(image);
      figure.append(imageLink, node("figcaption", "", parts[part]));
      images.append(figure);
    }
  }
  return images;
}

function showTable(harness, index) {
  const table = node("table");
  const head = table.createTHead().insertRow();
  for (const label of ["선", "신호 · 색", "재단"]) {
    const th = node("th", "", label);
    th.scope = "col";
    head.append(th);
  }
  const body = table.createTBody();
  for (const [i, row] of harness.rows.entries()) {
    const line = body.insertRow();
    if (i === index) line.classList.add("selected");
    const entry = wires[row.wire];
    const id = row.wire ?? "×";
    const signal = [row.signal, wireColor(row)].filter(Boolean).join(" · ");
    const cut = entry?.cut ?? "—";
    for (const value of [id, signal, /^\d+$/.test(cut) ? `${cut} mm` : cut]) {
      line.insertCell().textContent = value;
    }
  }
  return table;
}

function showDetails(harness, index, side) {
  const row = harness.rows[index];
  const entry = wires[row.wire];
  const sideLabel = side ? endpoint(row[side]) : "선 제작 상세";
  document.querySelector("#inspector-label").textContent = sideLabel;
  title.textContent = [row.wire ?? "×", row.signal].join(" · ");
  document.querySelector("#inspector-group").textContent = `${harness.title} · ${harness.count}`;
  inspectorBody.replaceChildren();
  const route = node("div", "connection");
  route.append(node("span", "", endpoint(row.from)), node("b", "", row.to ? "↔" : "×"),
    node("span", "", row.to ? endpoint(row.to) : "연결 없음"));
  inspectorBody.append(route);
  if (entry) {
    const values = node("dl", "fabrication");
    const measure = /^\d+$/.test(entry.cut) ? `${entry.cut} mm` : entry.cut;
    put("선 색 / 표식", wireColor(row) || "완제품", values);
    put("굵기 / 규격", entry.gauge, values);
    put("재단 / 구입", measure, values);
    inspectorBody.append(values);
    if (entry.cut === "가조립에서 결정") {
      inspectorBody.append(node("p", "procedure", `CAD 노출 경로 ${entry.path} mm`));
    }
  }
  const photos = showParts(side === "to" ? [row.to, row.from] : [row.from, row.to]);
  if (photos.childElementCount) {
    inspectorBody.append(node("h3", "inspector-section", "커넥터"), photos);
  }
  const notes = fabricationNotes(row);
  if (notes) inspectorBody.append(node("p", "procedure", notes));
  inspectorBody.append(node("p", "procedure", harness.note || "선 양쪽 끝에 W 번호를 표시하고, 결합 전에 도통과 인접 핀 단락을 확인합니다."));
  inspectorBody.append(node("h3", "inspector-section", "이 하네스의 재단 목록"), showTable(harness, index));
  aside.scrollTop = 0;
}

function select(harness, index, side = "", clicked = null) {
  if (active) {
    active.card.classList.remove("active");
    active.line.classList.remove("selected");
    returnTo.setAttribute("aria-pressed", "false");
  }
  const { card, contactRows } = cards.get(harness.id);
  const line = contactRows[index];
  card.classList.add("active");
  line.classList.add("selected");
  active = { harness, card, line };
  returnTo = clicked ?? line.querySelector(".wire");
  returnTo.setAttribute("aria-pressed", "true");
  showDetails(harness, index, side);
  if (clicked) {
    const row = harness.rows[index];
    history.replaceState(null, "", `#${row.wire === "W31" ? `W31-${row.from.pin}` : row.wire ?? "unused"}`);
    if (mobile.matches) {
      aside.scrollIntoView({ block: "start" });
      title.focus({ preventScroll: true });
    }
  }
}

const filterButtons = [...document.querySelectorAll("[data-filter]")];
function filter(circuit) {
  activeCircuit = circuit;
  filterButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === circuit)));
  for (const [name, group] of groups) group.hidden = circuit !== "all" && circuit !== name;
  if (circuit !== "all" && active.harness.circuit !== circuit) {
    select(harnesses.find(harness => harness.circuit === circuit), 0);
  }
}

function fromHash() {
  const key = location.hash.slice(1);
  if (!key || key === "ground") return;
  for (const harness of harnesses) {
    const index = harness.rows.findIndex(row =>
      key === (row.wire ?? "unused") || (row.wire === "W31" && key === `W31-${row.from.pin}`));
    if (index === -1) continue;
    if (activeCircuit !== "all" && activeCircuit !== harness.circuit) filter(harness.circuit);
    select(harness, index);
    (mobile.matches ? aside : cards.get(harness.id).card).scrollIntoView({ block: "start" });
    return;
  }
}

for (const [name, heading] of Object.entries(circuits)) {
  const group = node("section", "harness-group");
  group.append(node("h2", "", heading));
  groups.set(name, group);
  list.append(group);
}
for (const harness of harnesses) groups.get(harness.circuit).append(makeCard(harness));

filterButtons.forEach(button => button.addEventListener("click", () => {
  filter(button.dataset.filter);
  history.replaceState(null, "", location.pathname + location.search);
}));
document.querySelector("#back-to-wire").addEventListener("click", () => {
  returnTo.focus({ preventScroll: true });
  returnTo.scrollIntoView({ block: "center" });
});
select(harnesses[0], 0);
window.addEventListener("hashchange", fromHash);
fromHash();
