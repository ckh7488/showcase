import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clamp, ease, jawPivot, motionMatrix } from "./motion.js";
import { WiringModel } from "./wiring.js";

const V = (...coords) => new THREE.Vector3(...coords);
const views = {
  assembled: {
    front: [[0, -488, 112], [0, -4, 61]],
    oblique: [[188, -465, 178], [0, -4, 57]],
    back: [[90, 480, 162], [0, 4, 60]],
    bottom: [[147, -330, -191], [0, 7, -6]],
  },
  electronics: {
    front: [[0, -251, 150], [0, 10, -70]],
    oblique: [[141, -158, 186], [0, 14, -70]],
    back: [[76, 240, 132], [0, 22, -70]],
    bottom: [[113, 232, -160], [0, 24, -79]],
  }
};
const closeups = {
  eyes: { view: "mechanism", position: [58, -220, 228], center: [0, -27, 151], anchor: [0, -24, 154], motion: "head", title: "눈꺼풀 구동", subtitle: "가운데 링크가 가로축을 돌리고 양끝 링크가 두 눈꺼풀을 움직입니다." },
  camera: { view: "assembled", position: [52, -260, 114], center: [0, -40, 103], anchor: [0, -67, 91], motion: "head", title: "코 카메라", subtitle: "U20CAM-1080P-S1 · 렌즈 약 2 mm 안쪽" },
  neck: { view: "mechanism", position: [146, 253, 138], center: [0, 27, 110], anchor: [21, 39, 122], motion: "pan", title: "목 구동부", subtitle: "XL430 두 축 · 상하 스트로크 제한판" },
  jaw: { view: "mechanism", position: [-170, -224, 132], center: [0, -24, 75], anchor: [-47, ...jawPivot.slice(1)], motion: "head", title: "턱 힌지", subtitle: "XL330 직결 · 62틱(5.45°) 열림" },
  hub: { view: "electronics", position: [113, 189, 110], center: [0, 70, -68], anchor: [0, 65, -69], motion: "hatch", title: "서보 허브 A5", subtitle: "5 V 눈·턱 · 12 V 목 · 뒤쪽 정비 분리" }
};
const blinkParts = new Map();
const partLabel = (ids, title, detail) => {
  for (const id of ids) blinkParts.set(id, { title, detail });
};
partLabel(["Part045"], "눈꺼풀 모터", "ID3 · XL330-M077-T");
partLabel(["Part046"], "모터 장착판", "PETG 출력 · 두께 2.7 mm");
partLabel(["Part047"], "모터 혼", "PETG 출력 · 두께 3.1 mm");
partLabel(["Part048"], "눈꺼풀 공용 가로축", "강철 환봉 · Ø4 × 112 mm");
partLabel(["Part050", "Part052"], "가로축 베어링", "구매품 · MR104ZZ 4 × 10 × 4 mm");
partLabel(["Part053", "Part054", "Part055"], "가로축 크랭크", "PETG 출력 · 공용 M2×8 나사와 일반 너트로 축 고정");
partLabel(["Part056"], "가운데 구동 링크", "PETG 출력 · 두께 2.6 mm · 밀고 당기는 막대");
partLabel(["Part057", "Part060"], "좌우 눈꺼풀 링크", "PETG 출력 · 각 두께 2.6 mm");
partLabel(["Part058", "Part059", "Part061", "Part062"], "눈꺼풀 힌지핀", "강철 핀 · Ø2 × 8 mm · 눈꺼풀마다 좌우 한 개");
partLabel(["Part063"], "모터와 베어링 받침", "두 가로축 베어링과 ID3 장착판을 지지");
partLabel(["Part076", "Part077"], "눈꺼풀 힌지 받침", "PETG 출력 · 눈꺼풀 양쪽 핀을 지지");
partLabel(["Part078", "Part079"], "눈꺼풀", "PETG 출력 · 곡면 두께 1.48 mm");
partLabel(["Part029", "Part033"], "안구", "PETG 출력 · Ø28 mm");
partLabel(["Part030", "Part031", "Part034", "Part035"], "안구 도색 위치", "표면 색상 표시 · 흰 안구에 도색");
partLabel(["BlinkCollarLeft", "BlinkCollarRight"], "가로축 간격통", "PETG 출력 · 베어링과 가운데 크랭크 사이");

function light(scene, color, strength, position) {
  const beam = new THREE.DirectionalLight(color, strength);
  beam.position.set(...position);
  beam.target.position.set(0, 0, 65);
  scene.add(beam, beam.target);
  return beam;
}

export class AssemblyViewer {
  constructor(host, anchor, showPart) {
    this.host = host;
    this.anchor = anchor;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 2, 2200);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(...views.assembled.oblique[0]);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65));
    this.renderer.setClearAlpha(0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.domElement.setAttribute("aria-label", "R5 B25 조립 3D 모델");
    this.host.appendChild(this.renderer.domElement);
    const canvas = this.renderer.domElement;
    let down;
    canvas.addEventListener("pointerdown", event => { down = [event.clientX, event.clientY]; });
    canvas.addEventListener("pointerup", event => {
      if (event.button !== 0 || !down ||
          Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5) return;
      const label = this.pickBlinkPart(event.clientX, event.clientY);
      if (label) showPart(label.title, label.detail);
    });
    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(...views.assembled.oblique[1]);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = .074;
    this.orbit.minDistance = 110;
    this.orbit.maxDistance = 1050;
    this.orbit.update();
    this.orbit.addEventListener("change", () => { this.dirty = true; });
    this.orbit.addEventListener("start", () => { this.flight = null; });
    this.scene.add(new THREE.HemisphereLight(0xcbdce5, 0x555047, 1.18));
    const key = light(this.scene, 0xffe3c2, 2.85, [-194, -248, 395]);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -174;
    key.shadow.camera.right = 174;
    key.shadow.camera.top = 198;
    key.shadow.camera.bottom = -198;
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 790;
    key.shadow.bias = -.00028;
    key.shadow.normalBias = .52;
    key.shadow.radius = 3;
    light(this.scene, 0xcce4ff, 1.08, [270, -176, 200]);
    light(this.scene, 0xd4e6f1, 1.84, [108, 239, 304]);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500),
      new THREE.ShadowMaterial({ color: 0x05090b, opacity: .34 }));
    this.floor.position.z = -83.5;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid = new THREE.GridHelper(960, 32, 0x4f6067, 0x50646b);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.z = -83.25;
    this.grid.material.transparent = true;
    this.grid.material.opacity = .105;
    this.scene.add(this.grid);
    this.parts = [];
    this.mode = "assembled";
    this.preset = "oblique";
    this.detail = null;
    this.drop = 0;
    this.poseHash = "";
    this.dirty = true;
    this.keepShadows = true;
    this.resize = new ResizeObserver(() => this.updateSize());
    this.resize.observe(host);
    this.updateSize();
    this.portrait = this.host.clientWidth < 525;
    if (this.portrait) this.point(views.assembled.oblique, false);
  }

  updateSize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.dirty = true;
  }

  pickBlinkPart(x, y) {
    if (this.detail !== closeups.eyes) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(2 * (x - rect.left) / rect.width - 1, 1 - 2 * (y - rect.top) / rect.height);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(pointer, this.camera);
    const nodes = this.parts.filter(item => item.node.visible);
    let object = ray.intersectObjects(nodes.map(item => item.node), true)[0]?.object;
    while (object) {
      const part = nodes.find(item => item.node === object);
      if (part) return blinkParts.get(part.info.cad_id);
      object = object.parent;
    }
  }

  async load() {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const embedded = globalThis.b25DemoAssets;
    const base = "./assets/b25-motion/";
    const data = embedded?.metadata ?? await fetch(base + "assembly.json", { cache: "no-cache" }).then(response => {
      if (!response.ok) throw Error("Assembly metadata");
      return response.json();
    });
    if (data.revision !== "B25" || data.board !== "A5") throw Error("B25 A5 metadata is required");
    this.rig = data.rig;
    this.service = data.wiring.service;
    const model = embedded?.glb
      ? await loader.parseAsync(Uint8Array.from(atob(embedded.glb), value => value.charCodeAt(0)).buffer, "")
      : await loader.loadAsync(`${base}assembly.glb?rev=${data.cad_sha256}`);
    this.wiringAvailable = Boolean(data.wiring.eaton && this.service);
    this.wiring = new WiringModel(data.wiring, this.scene);
    const wiringFades = new Set(["Part000", "Part001", "Part002", "Part073", "Part074", "Part019"]);
    this.scene.add(model.scene);
    model.scene.updateMatrixWorld(true);
    for (const info of data.parts) {
      const node = model.scene.getObjectByName(info.name);
      if (!node) throw Error("Missing CAD part " + info.name);
      info.wiringFade = wiringFades.has(info.cad_id) || info.shell || info.cover;
      node.updateMatrix();
      const materials = [];
      node.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.castShadow = info.finish !== "steel" && info.finish !== "brass";
        mesh.receiveShadow = false;
        if (info.wiringFade) mesh.material = mesh.material.clone();
        if (Array.isArray(mesh.material)) materials.push(...mesh.material);
        else materials.push(mesh.material);
      });
      this.parts.push({ node, info, base: node.matrix.clone(), materials });
      node.matrixAutoUpdate = false;
    }
    this.poseHash = "";
    this.visibility();
  }

  changeView(mode) {
    this.mode = mode;
    this.detail = null;
    this.preset = "oblique";
    this.visibility();
    this.point(this.cameraPair("oblique"));
  }

  visibility() {
    this.wiring?.show(this.mode === "electronics" || this.mode === "wiring", this.mode === "electronics", !this.detail);
    this.poseHash = "";
    for (const item of this.parts) {
      const { node, info, materials } = item;
      const jawCloseup = this.detail === closeups.jaw && info.motion === "jaw" && info.shell;
      const inside = this.detail === closeups.eyes ?
        blinkParts.has(info.cad_id) || /^(lid|blink)/.test(info.motion) :
        !info.shell || jawCloseup;
      node.visible = this.mode === "assembled" || this.mode === "wiring" || (this.mode === "mechanism" && inside) ||
        (this.mode === "electronics" && ["fixed", "hatch", "service_plug"].includes(info.motion) && !info.cover);
      if (info.wiringFade) {
        const wired = this.mode === "wiring";
        const ghost = wired || jawCloseup || (info.cad_id === "Part000" && this.mode === "electronics" && this.drop > .75);
        for (const material of materials) {
          if (material.transparent !== ghost) {
            material.transparent = ghost;
            material.depthWrite = !ghost;
            material.needsUpdate = true;
          }
          material.opacity = wired ? .15 : jawCloseup ? .51 : ghost ? .34 : 1;
        }
      }
    }
    const seeUnder = this.preset === "bottom" || (this.mode === "electronics" && this.drop > .75);
    this.floor.visible = !seeUnder;
    this.grid.visible = !seeUnder;
    this.dirty = true;
    this.keepShadows = true;
  }

  cameraPair(name) {
    return views[this.mode === "electronics" ? "electronics" : "assembled"][name];
  }

  setPreset(name) {
    this.preset = name;
    this.detail = null;
    this.visibility();
    this.point(this.cameraPair(name));
  }

  serviceView(open) {
    this.mode = "electronics";
    this.detail = null;
    this.preset = "oblique";
    this.visibility();
    this.point(open ? [[152, 226, -110], [4, 24, -78]] : this.cameraPair("oblique"));
  }

  inspect(part) {
    this.detail = closeups[part];
    this.mode = this.detail.view;
    this.preset = "oblique";
    this.visibility();
    this.point([this.detail.position, this.detail.center]);
    return this.detail;
  }

  inspectYawStuds() {
    this.point([[68, 112, 28], [-9, 21, -45]]);
  }

  point(pair, animate = true) {
    const target = V(...pair[1]);
    const next = V(...pair[0]).sub(target);
    const aspectZoom = Math.max(1, .90 / this.camera.aspect);
    next.multiplyScalar(aspectZoom);
    if (!animate) {
      this.orbit.target.copy(target);
      this.camera.position.copy(next.add(target));
      this.orbit.update();
      this.dirty = true;
      return;
    }
    const current = this.camera.position.clone().sub(this.orbit.target);
    this.flight = {
      from: this.orbit.target.clone(), target, fromRay: current.clone().normalize(),
      turn: new THREE.Quaternion().setFromUnitVectors(current.clone().normalize(), next.clone().normalize()),
      a: current.length(), b: next.length(), start: performance.now(),
    };
  }

  updateCamera(now) {
    if (this.flight) {
      const f = this.flight;
      const w = ease((now - f.start) / 425);
      const ray = f.fromRay.clone().applyQuaternion(new THREE.Quaternion().slerp(f.turn, w));
      this.orbit.target.lerpVectors(f.from, f.target, w);
      this.camera.position.copy(ray.multiplyScalar(THREE.MathUtils.lerp(f.a, f.b, w)).add(this.orbit.target));
      if (w === 1) this.flight = null;
    }
    this.orbit.update();
  }

  draw(pose, serviceProgress, now) {
    this.updateCamera(now);
    const drop = 30 * clamp(2 * serviceProgress - 1, 0, 1);
    const hash = Object.values(pose).map(x => x.toFixed(3)).concat(serviceProgress.toFixed(4)).join();
    if (this.poseHash !== hash) {
      if ((this.drop > .75) !== (drop > .75)) {
        this.drop = drop;
        this.visibility();
      }
      this.drop = drop;
      const byMotion = new Map();
      const matrixFor = motion => {
        if (!byMotion.has(motion)) {
          const matrix = motion === "service_plug" ? new THREE.Matrix4().makeTranslation(
            0, -this.service.withdrawal_mm * clamp(4 * serviceProgress, 0, 1),
            -drop - this.service.parking_mm * clamp(4 * serviceProgress - 1, 0, 1),
          ) : motionMatrix(motion, pose, drop, this.rig);
          byMotion.set(motion, matrix);
        }
        return byMotion.get(motion);
      };
      for (const item of this.parts) {
        item.node.matrix.multiplyMatrices(matrixFor(item.info.motion), item.base);
        item.node.matrixWorldNeedsUpdate = true;
      }
      this.wiring?.draw(matrixFor, pose, serviceProgress);
      this.poseHash = hash;
      this.dirty = true;
      this.keepShadows = true;
    }
    if (!this.dirty) return;

    if (this.detail && this.detail !== closeups.eyes && this.parts.length) {
      this.camera.updateMatrixWorld();
      const point = V(...this.detail.anchor).applyMatrix4(motionMatrix(this.detail.motion, pose, drop, this.rig)).project(this.camera);
      this.anchor.hidden = point.z < -1 || point.z > 1 || Math.abs(point.x) > .76 || Math.abs(point.y) > .89;
      if (!this.anchor.hidden) {
        this.anchor.style.left = `${(point.x + 1) * 50}%`;
        this.anchor.style.top = `${(1 - point.y) * 50}%`;
        this.anchor.querySelector("b").textContent = this.detail.title;
      }
    } else {
      this.anchor.hidden = true;
    }
    this.renderer.shadowMap.needsUpdate = this.keepShadows && this.floor.visible && this.mode !== "wiring";
    this.renderer.render(this.scene, this.camera);
    this.keepShadows = false;
    this.dirty = false;
  }
}
