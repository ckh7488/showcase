import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { cameraViews, fastenerViews, partColor, partGroups } from "./catalog.js";

const byId = id => document.getElementById(id);
const tabButtons = [...document.querySelectorAll("[data-tab]")];
const captions = {
  power: "12 V 공급과 정비 플러그", hub: "A5 허브와 5 V 정비 루프",
  camera: "Eaton 경로 · 목 중립", fasteners: "B25 체결품",
};
const fastenerDetails = {
  keeper: "기판 J2의 XT30U-F를 작업대에서 결합합니다. J1 쪽 두 곳은 M3×8, J2 잠금쇠를 지나는 두 곳은 M3×12로 체결합니다. 일반 M3 너트를 재사용합니다.",
  inlet: "외부 공급 XT60U-M의 성형 홈 양쪽을 가이드와 덮개에 걸고, 두 M3×12와 M3 인서트로 덮개를 고정합니다.",
  socket: "뒤쪽 XT60E-F는 M3×30 두 개, 평와셔 네 개, 일반 M3 너트 두 개로 고정합니다. 너트에는 5.5 mm 스패너를 씁니다.",
  hatch: "하부 덮개를 정비할 때는 받침을 지지합니다. 덮개 나사를 끝까지 빼도 양쪽 포획부에 너트가 남습니다.",
  rear: "뒤 외장 29의 왼쪽은 M3×18, 오른쪽은 M3×16입니다. 일반 M3 너트를 프레임 슬롯에 먼저 넣습니다.",
  jaw: "양쪽 M3×12와 뒤쪽 M3×40으로 조립합니다. 뒤쪽 나사는 뒤 외장을 달기 전에 접근합니다.",
};
const initialTab = new URLSearchParams(location.search).get("view");
const state = { tab: Object.hasOwn(partGroups, initialTab) ? initialTab : "power", serviceIndex: 0,
  hatchDrop: 0, cameraView: "overview", fastenerView: "keeper", context: true };
const scenery = new Set(["Part000", "Part002", "CableSaddle", "CableGate", "Part029", "HubHolder",
  "Part007", "Part010", "Part011", "Part024", "Jaw_30_moving_jaw", "Jaw_36_left_jaw_servo_stay", "Jaw_37_right_jaw_bearing_stay"]);
const sceneLabels = {
  power: [
    ["InputXT60Mate", "공급 XT60", [-10, -22]], ["A4XT60ExternalSocket", "정비 소켓", [-12, 26]],
    ["A4WagoPositive", "WAGO", [0, 20]], ["A4J2LeverKeeper", "내부 J2", [-5, -22]],
  ],
  hub: [["HubBodyJ1", "J1 · 5 V", [0, -27]], ["HubBodyJ2", "J2 · 12 V", [30, 12]]],
  camera: [["CameraEatonHeadTie", "코 고정점", [42, -19]], ["EatonRearStationarySplice", "후면 고정 구간", [30, 13]]],
  fasteners: [["HubBolt2", "J1 쪽 · M3×8", [0, -18]], ["HubBolt4", "J2 쪽 · M3×12", [0, -18]]],
};
const posColor = 0xff805c;
const gndColor = 0x8babfa;

async function fetchFile(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response;
}

function displayPressed(selector, key, value) {
  document.querySelectorAll(selector).forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset[key] === String(value))));
}

function displayPanel() {
  for (const button of tabButtons) {
    const selected = button.dataset.tab === state.tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    byId(`panel-${button.dataset.tab}`).hidden = !selected;
  }
  byId("scene-caption").textContent = captions[state.tab];
  byId("hatch-value").textContent = `${state.hatchDrop} mm`;
  displayPressed("[data-drop]", "drop", state.hatchDrop);
  displayPressed("[data-camera]", "camera", state.cameraView);
  displayPressed("[data-fastener]", "fastener", state.fastenerView);
  byId("fastener-detail").textContent = fastenerDetails[state.fastenerView];
}

function drawScene(data) {
  const host = byId("scene");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x122a34);
  const camera = new THREE.PerspectiveCamera(43, 1, .3, 2500);
  camera.up.set(0, 0, 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.domElement.setAttribute("aria-label", "B25 실제 CAD 부품과 정비 배선 3D 보기");
  host.append(renderer.domElement);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.minDistance = 13;
  orbit.maxDistance = 1400;
  const hemisphere = new THREE.HemisphereLight(0xeaf6ff, 0x708274, 2.15);
  const light = new THREE.DirectionalLight(0xffe6ce, 2.35);
  light.position.set(195, 155, 220);
  scene.add(hemisphere, light);
  const partMeshes = new Map();
  const annotations = new Map(Object.values(sceneLabels).flat().map(([id, label]) => {
    const node = document.createElement("span");
    node.textContent = label;
    node.hidden = true;
    byId("scene-labels").append(node);
    return [id, node];
  }));
  const projected = new THREE.Vector3();
  function render() {
    renderer.render(scene, camera);
    for (const node of annotations.values()) node.hidden = true;
    for (const [id, , offset] of sceneLabels[state.tab] ?? []) {
      const mesh = partMeshes.get(id);
      if (!mesh?.visible) continue;
      projected.copy(mesh.userData.center).add(mesh.position).project(camera);
      const x = (projected.x + 1) * host.clientWidth / 2 + offset[0];
      const y = (1 - projected.y) * host.clientHeight / 2 + offset[1];
      if (x < 56 || x > host.clientWidth - 56 || y < 49 || y > host.clientHeight - 50 || projected.z > 1 || projected.z < -1) continue;
      const node = annotations.get(id);
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.hidden = false;
    }
  }
  orbit.addEventListener("change", render);
  const resize = new ResizeObserver(() => {
    if (!host.clientWidth || !host.clientHeight) return;
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    render();
  });
  resize.observe(host);

  const meshLoads = new Map();
  const stl = new STLLoader();
  function loadPart(id) {
    if (meshLoads.has(id)) return meshLoads.get(id);
    const result = fetchFile(`./assets/${id}.stlz`).then(async response => {
      const raw = await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
      const mesh = new THREE.Mesh(stl.parse(raw), new THREE.MeshStandardMaterial({ color: partColor(id), roughness: .68 }));
      mesh.geometry.computeBoundingBox();
      mesh.userData.center = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());
      mesh.name = id;
      mesh.visible = false;
      partMeshes.set(id, mesh);
      scene.add(mesh);
    }).catch(error => {
      meshLoads.delete(id);
      throw error;
    });
    meshLoads.set(id, result);
    return result;
  }

  const wires = new THREE.Group();
  scene.add(wires);
  const wireMaterial = [posColor, gndColor].map(color => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: .34, roughness: .57,
  }));
  const wireIds = ["A4W8", "A4W9", "J1+", "J1-"];
  const wireActors = Object.fromEntries(wireIds.map((id, index) => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), wireMaterial[index % 2]);
    mesh.name = id;
    mesh.visible = false;
    wires.add(mesh);
    return [id, mesh];
  }));
  function placeWire(id, points, radius) {
    const mesh = wireActors[id];
    mesh.geometry.dispose();
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    mesh.geometry = new THREE.TubeGeometry(curve, Math.max(100, points.length * 2), radius, 7, false);
    mesh.visible = true;
  }

  const stages = {
    mated: 0,
    withdrawn: data.service.findLastIndex(row => row.phase === "withdrawal"),
    parked: data.service.findIndex(row => row.phase === "hatch"),
    open: data.service.length - 1,
  };
  const powerPose = byId("service-pose");
  powerPose.max = data.service.length - 1;
  for (const button of document.querySelectorAll("[data-stage]")) button.dataset.pose = stages[button.dataset.stage];

  function currentView() {
    switch (state.tab) {
      case "camera": return cameraViews[state.cameraView];
      case "fasteners": return fastenerViews[state.fastenerView];
      case "hub": return { target: [0, 89, -77], eye: [123, 101, 130] };
      default: return { target: [12, 133, -84], eye: [220, 155, 177] };
    }
  }
  function frameView() {
    const { target, eye } = currentView();
    orbit.target.set(...target);
    const narrow = Math.max(0, 1.25 - host.clientWidth / host.clientHeight);
    camera.position.copy(orbit.target).addScaledVector(new THREE.Vector3(...eye), 1 + narrow * .45);
    orbit.update();
    render();
  }
  function positionParts() {
    const power = state.tab === "power";
    const hub = state.tab === "hub";
    const fastener = state.tab === "fasteners";
    const step = data.service[state.serviceIndex];
    const drop = power ? step.drop : hub ? state.hatchDrop : 0;
    const visible = new Set(fastener ? fastenerViews[state.fastenerView].parts : partGroups[state.tab]);
    for (const [id, mesh] of partMeshes) {
      const ghost = scenery.has(id);
      mesh.visible = visible.has(id) && (state.context || !ghost);
      mesh.position.set(0, 0, data.motion[id] === "hatch" ? -drop : 0);
      if (id === "A4XT60ExternalMate" && power) mesh.position.set(0, -step.withdrawal, -step.parking - drop);
      mesh.material.transparent = ghost;
      mesh.material.opacity = ghost ? (fastener ? .31 : .24) : 1;
      mesh.material.depthWrite = !ghost;
    }
    for (const mesh of Object.values(wireActors)) mesh.visible = false;
    if (power) {
      placeWire("A4W8", step.wires.A4W8, .875);
      placeWire("A4W9", step.wires.A4W9, .875);
    }
    if (hub) {
      const pair = data.power[drop];
      placeWire("J1+", pair["J1+"], 1.0285);
      placeWire("J1-", pair["J1-"], 1.0285);
    }
    const label = step.drop ? `덮개 ${step.drop} mm` : step.parking ? `아래 대기 ${step.parking} mm` :
      step.withdrawal ? `플러그 ${step.withdrawal} mm 빼기` : "연결";
    byId("service-value").textContent = label;
    powerPose.setAttribute("aria-valuetext", label);
    byId("hatch-pose").setAttribute("aria-valuetext", `${state.hatchDrop} mm`);
    document.querySelectorAll("[data-stage]").forEach(button =>
      button.setAttribute("aria-pressed", String(Number(button.dataset.pose) === state.serviceIndex)));
    render();
  }

  let pending = 0;
  async function loadView() {
    const request = ++pending;
    const ids = state.tab === "fasteners" ? fastenerViews[state.fastenerView].parts : partGroups[state.tab];
    const status = byId("scene-status");
    status.textContent = "현재 B25 형상을 불러오는 중";
    status.hidden = false;
    for (const mesh of partMeshes.values()) mesh.visible = false;
    for (const mesh of Object.values(wireActors)) mesh.visible = false;
    try {
      await Promise.all(ids.map(loadPart));
      if (request !== pending) return;
      positionParts();
      frameView();
      status.hidden = true;
    } catch (error) {
      if (request !== pending) return;
      status.textContent = "3D 모델을 열 수 없습니다. 페이지를 다시 불러오거나 아래 조립 자료를 확인하세요.";
      console.error(error);
    }
  }
  return { update: positionParts, reset: frameView, load: loadView };
}

let scene;
function selectTab(tab) {
  state.tab = tab;
  displayPanel();
  const url = new URL(location.href);
  url.searchParams.set("view", tab);
  history.replaceState(null, "", url);
  scene?.load();
}
for (const [index, button] of tabButtons.entries()) {
  button.addEventListener("click", () => selectTab(button.dataset.tab));
  button.addEventListener("keydown", event => {
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: tabButtons.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabButtons[(next + tabButtons.length) % tabButtons.length];
    selectTab(target.dataset.tab);
    target.focus();
  });
}
function setService(index) {
  state.serviceIndex = index;
  byId("service-pose").value = index;
  scene?.update();
}
function setDrop(drop) {
  state.hatchDrop = drop;
  byId("hatch-pose").value = drop;
  displayPanel();
  scene?.update();
}
byId("reset-view").addEventListener("click", () => scene?.reset());
byId("show-context").addEventListener("change", event => {
  state.context = event.target.checked;
  scene?.update();
});
byId("service-pose").addEventListener("input", event => setService(Number(event.target.value)));
byId("hatch-pose").addEventListener("input", event => setDrop(Number(event.target.value)));
document.querySelectorAll("[data-stage]").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.pose !== undefined) setService(Number(button.dataset.pose));
}));
document.querySelectorAll("[data-drop]").forEach(button => button.addEventListener("click", () => setDrop(Number(button.dataset.drop))));
document.querySelectorAll("[data-camera]").forEach(button => button.addEventListener("click", () => {
  state.cameraView = button.dataset.camera;
  displayPanel();
  scene?.reset();
}));
document.querySelectorAll("[data-fastener]").forEach(button => button.addEventListener("click", () => {
  state.fastenerView = button.dataset.fastener;
  displayPanel();
  scene?.load();
}));
displayPanel();
try {
  const data = await (await fetchFile("./assets/poses.json")).json();
  byId("source-revision").textContent = `조립 CAD ${data.cad.slice(0, 12)} · 모델 좌표 mm`;
  byId("service-pose").value = state.serviceIndex;
  scene = drawScene(data);
  await scene.load();
} catch (error) {
  byId("scene-status").textContent = "3D 모델을 열 수 없습니다. 아래 조립 자료에서 연결 위치를 확인할 수 있습니다.";
  console.error(error);
}
