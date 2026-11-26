import { axes, neutral, clamp, tickDeg, blinkAt, blinkDuration, scheduledBlink, clackAt, clackDuration, advancePose, demonstration, TargetFollower } from "./motion.js";
import { AssemblyViewer } from "./viewer.js";

const at = id => document.getElementById(id);
const viewButtons = [...document.querySelectorAll("[data-view]")];
const cameraButtons = [...document.querySelectorAll("[data-camera]")];
const parts = [...document.querySelectorAll("[data-part]")];
const modeButtons = [at("manual-mode"), at("track-mode")];
const manualPanel = at("manual-controls");
const trackPanel = at("track-controls");
const targetPad = at("target-pad");
const demo = at("play-demo");
const hatch = at("hatch-toggle");
const upright = at("viewer");
const status = at("model-status");
const loader = at("model-loading");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let pose = { ...neutral };
let desired = { ...neutral };
let mode = "manual";
let mount = "assembled";
let demoStart = null;
let target = null;
let trackingSince = null;
let autoStart = null;
let hatchOpen = false;
let serviceProgress = 0;
let found = false;
let scene;
const tracker = new TargetFollower();
const ranges = new Map();
const gestures = [
  { key: "blink", input: at("axis-blink"), output: at("value-blink"), button: at("blink-once"),
    sample: blinkAt, duration: blinkDuration, scale: .9, unit: "%", started: null },
  { key: "jaw", input: at("axis-jaw"), output: at("value-jaw"), button: at("jaw-clack"),
    sample: clackAt, duration: clackDuration, scale: tickDeg, started: null, centering: false, readyAt: null },
];

function makeAxis(key, group, container) {
  const axis = axes[key];
  const row = document.createElement("div");
  row.className = "axis";
  const axisId = "axis-" + key;
  row.innerHTML = `<div class="axis-title"><label for="${axisId}">${axis.label}</label><output for="${axisId}">0°</output></div>
    <div class="axis-line"><input id="${axisId}" type="range" min="${Math.round(axis.lower / tickDeg)}" max="${Math.round(axis.upper / tickDeg)}" value="0" aria-label="${group} ${axis.label}"></div>`;
  const input = row.querySelector("input");
  ranges.set(key, { input, output: row.querySelector("output") });
  input.addEventListener("input", () => {
    stopDemo();
    stopGestures();
    desired[key] = Number(input.value) * tickDeg;
    updateReadouts(desired, false);
  });
  container.append(row);
}

for (const [label, keys] of [["목", ["neckYaw", "neckPitch"]], ["눈", ["eyeYaw", "eyePitch"]]]) {
  const group = document.createElement("fieldset");
  group.className = "axis-group";
  group.setAttribute("aria-label", label);
  const title = document.createElement("h3");
  title.textContent = label;
  group.append(title);
  for (const key of keys) makeAxis(key, label, group);
  at("axis-controls").append(group);
}

function degree(v) {
  const n = Number(v.toFixed(2));
  return (n > 0 ? "+" : "") + n + "°";
}

function updateReadouts(value, setInputs) {
  for (const [key, { input, output }] of ranges) {
    if (setInputs) input.value = Math.round(value[key] / tickDeg);
    const axis = axes[key];
    input.style.setProperty("--range-percent", `${100 * (Number(input.value) * tickDeg - axis.lower) / (axis.upper - axis.lower)}%`);
    output.value = degree(value[key]);
    input.setAttribute("aria-valuetext", output.value);
  }
  for (const { key, input, output, scale, unit } of gestures) {
    const rounded = Math.round(clamp(value[key] / scale, 0, Number(input.max)));
    if (setInputs) input.value = rounded;
    output.value = key === "jaw" ? `${(rounded * tickDeg).toFixed(2)}° · ${rounded}틱` : rounded + unit;
    input.setAttribute("aria-valuetext", output.value);
    input.style.setProperty("--range-percent", `${100 * Number(input.value) / Number(input.max)}%`);
  }
}
updateReadouts(pose, true);

function stopDemo() {
  if (demoStart !== null) {
    demoStart = null;
    demo.setAttribute("aria-pressed", "false");
    demo.querySelector("span").textContent = "구동 시연";
    desired = { ...pose };
  }
}

for (const gesture of gestures) {
  gesture.input.addEventListener("input", () => {
    stopDemo();
    stopGestures();
    desired[gesture.key] = Number(gesture.input.value) * gesture.scale;
    updateReadouts(desired, false);
  });
  gesture.button.addEventListener("click", () => {
    if (mode !== "manual") changeMode("manual");
    stopDemo();
    stopGestures();
    if (gesture.key === "jaw") {
      desired = { ...desired, neckYaw: 0, neckPitch: 0, jaw: 0 };
      gesture.centering = true;
    } else {
      gesture.started = performance.now();
    }
  });
}

function stopGestures() {
  for (const gesture of gestures) {
    gesture.started = null;
    gesture.centering = false;
    gesture.readyAt = null;
  }
}

demo.addEventListener("click", () => {
  if (demoStart !== null) {
    stopDemo();
    updateReadouts(pose, true);
  } else {
    stopGestures();
    demoStart = performance.now();
    demo.setAttribute("aria-pressed", "true");
    demo.querySelector("span").textContent = "시연 멈추기";
  }
});

function pressed(buttons, active) {
  for (const x of buttons) x.setAttribute("aria-pressed", String(x === active));
}

function defaultCaption() {
  const names = {
    assembled: ["조립 상태", "아이보리 외장 · 차콜 받침"],
    mechanism: ["내부 기구", "안구와 눈꺼풀 링크 · 목 구동부"],
    electronics: ["전장 배치", "서보 허브 A5 · OpenRB-150 · J2 정비 커넥터"],
    wiring: ["배선·체결", "전원·신호·USB · 체결품과 함께 구동 검토"],
  };
  const message = names[mount];
  setCaption(message[0], hatchOpen ? "J2 분리 · 덮개 30 mm 하강" : message[1]);
}

function setCaption(title, detail) {
  at("view-caption-title").textContent = title;
  at("view-caption-sub").textContent = detail;
}

function updateHatch() {
  at("wiring-review").hidden = mount !== "wiring";
  hatch.setAttribute("aria-pressed", String(hatchOpen));
  hatch.querySelector("span").textContent = hatchOpen ? "받침 덮개 닫기" : "받침 덮개 열기";
}

for (const button of viewButtons) {
  button.addEventListener("click", () => {
    mount = button.dataset.view;
    if (mount !== "electronics") hatchOpen = false;
    updateHatch();
    pressed(viewButtons, button);
    pressed(parts, null);
    pressed(cameraButtons, cameraButtons[1]);
    scene?.changeView(mount);
    defaultCaption();
  });
}

at("show-yaw-studs").addEventListener("click", () => {
  changeMode("manual");
  stopDemo();
  stopGestures();
  desired = { ...neutral, neckYaw: 36 };
  updateReadouts(desired, true);
  scene?.inspectYawStuds();
  setCaption("회전판 아래 볼트", "B25 받침과 목 좌우축 체결");
  upright.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
});

for (const button of cameraButtons) {
  button.addEventListener("click", () => {
    pressed(cameraButtons, button);
    pressed(parts, null);
    scene?.setPreset(button.dataset.camera);
    defaultCaption();
  });
}

for (const button of parts) {
  button.addEventListener("click", () => {
    if (!scene) return;
    const part = scene.inspect(button.dataset.part);
    mount = part.view;
    if (mount !== "electronics") hatchOpen = false;
    updateHatch();
    pressed(parts, button);
    pressed(viewButtons, viewButtons.find(b => b.dataset.view === mount));
    pressed(cameraButtons, null);
    setCaption(part.title, part.subtitle);
    if (innerWidth < 860) upright.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  });
}

hatch.addEventListener("click", () => {
  hatchOpen = !hatchOpen;
  mount = "electronics";
  pressed(viewButtons, viewButtons[2]);
  pressed(cameraButtons, null);
  pressed(parts, null);
  updateHatch();
  scene?.serviceView(hatchOpen);
  defaultCaption();
});

at("reset-pose").addEventListener("click", () => {
  stopDemo();
  stopGestures();
  hideTarget();
  pose = { ...neutral };
  desired = { ...neutral };
  updateReadouts(pose, true);
});

function changeMode(next) {
  mode = next;
  stopDemo();
  stopGestures();
  hideTarget();
  desired = { ...pose };
  pressed(modeButtons, next === "manual" ? modeButtons[0] : modeButtons[1]);
  manualPanel.hidden = next !== "manual";
  trackPanel.hidden = next !== "track";
  updateReadouts(pose, true);
}
modeButtons[0].addEventListener("click", () => changeMode("manual"));
modeButtons[1].addEventListener("click", () => changeMode("track"));

function stopAuto() {
  autoStart = null;
  at("auto-target").setAttribute("aria-pressed", "false");
  at("auto-target").textContent = "표적 자동 이동";
}

function placeTarget(x, y) {
  const u = clamp(x, .04, .96), v = clamp(y, .04, .96);
  if (!target) {
    tracker.reset();
    trackingSince = performance.now();
  }
  target = { x: u, y: v, yaw: (u - .5) * 106, pitch: (v - .5) * 32 };
  const dot = at("target-dot");
  dot.hidden = false;
  dot.style.left = `${u * 100}%`;
  dot.style.top = `${v * 100}%`;
  const label = at("track-state");
  label.dataset.active = "true";
  label.lastChild.textContent = " 추적 중";
  at("target-help").hidden = true;
  at("lose-target").disabled = false;
  at("target-values").textContent = `${degree(target.yaw)}  /  ${degree(target.pitch)}`;
}

function hideTarget() {
  stopAuto();
  target = null;
  trackingSince = null;
  tracker.reset();
  at("target-dot").hidden = true;
  const label = at("track-state");
  label.dataset.active = "false";
  label.lastChild.textContent = " 자세 유지";
  at("target-help").hidden = false;
  at("lose-target").disabled = true;
  at("target-values").textContent = "표적 대기";
}

function pointerTarget(event) {
  const bounds = targetPad.getBoundingClientRect();
  placeTarget((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
}
targetPad.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  stopAuto();
  targetPad.setPointerCapture(event.pointerId);
  pointerTarget(event);
});
targetPad.addEventListener("pointermove", event => {
  if (targetPad.hasPointerCapture(event.pointerId)) pointerTarget(event);
});
targetPad.addEventListener("keydown", event => {
  const delta = { ArrowLeft: [-.055, 0], ArrowRight: [.055, 0], ArrowUp: [0, -.055], ArrowDown: [0, .055] };
  if (event.key === "Escape") hideTarget();
  if (!(event.key in delta)) return;
  event.preventDefault();
  stopAuto();
  const [dx, dy] = delta[event.key];
  placeTarget((target?.x ?? .5) + dx, (target?.y ?? .5) + dy);
});
at("lose-target").addEventListener("click", hideTarget);
at("auto-target").addEventListener("click", event => {
  if (autoStart !== null) {
    stopAuto();
  } else {
    autoStart = performance.now();
    event.currentTarget.setAttribute("aria-pressed", "true");
    event.currentTarget.textContent = "자동 이동 멈추기";
  }
});

at("expand-view").addEventListener("click", async () => {
  if (document.fullscreenElement === upright) {
    await document.exitFullscreen();
    return;
  }
  if (upright.classList.contains("expanded")) {
    upright.classList.remove("expanded");
    return;
  }
  try {
    await upright.requestFullscreen();
  } catch {
    upright.classList.add("expanded");
  }
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") upright.classList.remove("expanded");
});
const dialog = at("tracking-video");
at("video-open").addEventListener("click", () => {
  dialog.showModal();
});
at("video-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => dialog.querySelector("video").pause());

let previous = performance.now();
function animate(now) {
  const dt = clamp((now - previous) / 1000, 0, .2);
  previous = now;
  let command = desired;
  let animated = demoStart !== null;
  if (mode === "track") {
    if (autoStart !== null) {
      const t = (now - autoStart) / 1000;
      placeTarget(.5 + .37 * Math.sin(t * .87), .5 + .24 * Math.sin(t * 1.06 + .6));
    }
    command = target ? tracker.goals(target, pose, dt) : { ...pose, blink: 0 };
    if (trackingSince !== null) command.blink = scheduledBlink((now - trackingSince) / 1000, 2.4);
  } else if (animated) {
    desired = demonstration((now - demoStart) / 1000);
    command = desired;
  }
  for (const gesture of gestures) {
    if (gesture.centering) {
      animated = true;
      if (Math.abs(pose.neckYaw) > .5 || Math.abs(pose.neckPitch) > .5) continue;
      gesture.readyAt ??= now + 240;
      if (now < gesture.readyAt) continue;
      gesture.centering = false;
      gesture.started = now;
    }
    if (gesture.started === null) continue;
    const time = (now - gesture.started) / 1000;
    command[gesture.key] = gesture.sample(time);
    if (time >= gesture.duration) gesture.started = null;
    animated = true;
  }
  if (mode === "manual" && animated) updateReadouts(command, true);
  pose = advancePose(pose, command, dt);
  const goal = hatchOpen ? 1 : 0;
  serviceProgress = reduceMotion ? goal : clamp(serviceProgress + Math.sign(goal - serviceProgress) * Math.min(Math.abs(goal - serviceProgress), dt * .8), 0, 1);
  scene?.draw(pose, serviceProgress, now);
  requestAnimationFrame(animate);
}

async function start() {
  try {
    scene = new AssemblyViewer(at("view-canvas"), at("part-anchor"), setCaption);
    requestAnimationFrame(animate);
    await scene.load();
    found = true;
    loader.hidden = true;
    at("view-canvas").dataset.ready = "true";
    if (!scene.wiringAvailable) {
      const warning = document.createElement("p");
      warning.textContent = "배선 데이터를 불러오지 못했습니다.";
      warning.setAttribute("role", "status");
      at("view-stage").after(warning);
    }
    if (location.search === "?view=wiring") viewButtons.find(b => b.dataset.view === "wiring").click();
    const current = viewButtons.find(b => b.getAttribute("aria-pressed") === "true");
    if (current?.dataset.view !== "assembled") scene.visibility();
  } catch (error) {
    console.error("R5 B25 viewer could not load:", error);
    loader.classList.add("failed");
    loader.querySelector(".loader").hidden = true;
    status.textContent = /WebGL/.test(error.message) ?
      "이 브라우저에서 WebGL을 시작할 수 없습니다." : "3D 모델 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.";
    at("view-stage").classList.add("fallback-poster");
    if (!found && scene) scene.renderer.domElement.hidden = true;
  }
}
start();
