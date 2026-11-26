import * as THREE from "three";

const palette = {
  power: 0xef5447,
  return: 0x485463,
  data: 0xf0e5b0,
  camera: 0x5cdef1,
  usb: 0x7198ef,
  plug: 0xd4ddd7,
  splice: 0xf1a74f,
  fuse: 0xdd5954,
};

export async function loadWiring(url, cadHash) {
  try {
    const response = await fetch(`${url}?rev=${cadHash}`, { cache: "no-cache" });
    if (!response.ok) throw Error(`Wiring metadata · ${response.status}`);
    const data = await response.json();
    if (data.cad_sha256 !== cadHash) throw Error("CAD and wiring have different revisions");
    if (!Array.isArray(data.blocks) || !Array.isArray(data.routes)) throw Error("Incomplete wiring metadata");
    return { ...data, available: true };
  } catch (error) {
    console.warn("Wiring layer unavailable", error);
    return { available: false, blocks: [], routes: [] };
  }
}

export function routePoints(route, matrixFor) {
  const points = route.points.map(([x, y, z, motion = "fixed", next, blend]) => {
    const point = new THREE.Vector3(x, y, z);
    const transformed = point.clone().applyMatrix4(matrixFor(motion));
    return next ? transformed.lerp(point.applyMatrix4(matrixFor(next)), blend) : transformed;
  });
  if (route.sampled) return points;
  const samples = [points[0]];
  const line = (from, to) => {
    const count = Math.max(1, Math.ceil(from.distanceTo(to) / 4));
    for (let i = 1; i <= count; i++) samples.push(from.clone().lerp(to, i / count));
  };
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1], corner = points[i], next = points[i + 1];
    const distance = Math.min(previous.distanceTo(corner) * .4, next.distanceTo(corner) * .4, route.fillet || 7);
    const start = corner.clone().lerp(previous, distance / Math.max(.001, previous.distanceTo(corner)));
    const end = corner.clone().lerp(next, distance / Math.max(.001, next.distanceTo(corner)));
    line(samples[samples.length - 1], start);
    const curve = new THREE.QuadraticBezierCurve3(start, corner, end);
    for (let j = 1; j <= 5; j++) samples.push(curve.getPoint(j / 5));
  }
  line(samples[samples.length - 1], points[points.length - 1]);
  return samples;
}

const sides = 8;
const circle = Array.from({ length: sides }, (_, i) => {
  const angle = i * 2 * Math.PI / sides;
  return [Math.cos(angle), Math.sin(angle)];
});

export function updateTube(node, samples, radius) {
  const points = samples.filter((point, i) => i === 0 || point.distanceToSquared(samples[i - 1]) > 1e-8);
  const count = points.length * sides;
  if (node.geometry.getAttribute("position")?.count !== count) {
    node.geometry.dispose();
    const geometry = new THREE.BufferGeometry();
    for (const name of ["position", "normal"]) {
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(new Float32Array(3 * count), 3).setUsage(THREE.DynamicDrawUsage));
    }
    const indices = [];
    for (let i = 0; i < points.length - 1; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * sides + j;
        const b = i * sides + (j + 1) % sides;
        indices.push(a, b, a + sides, b, b + sides, a + sides);
      }
    }
    geometry.setIndex(indices);
    node.geometry = geometry;
  }
  const { position, normal } = node.geometry.attributes;
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  const outward = new THREE.Vector3();
  for (const [i, point] of points.entries()) {
    tangent.subVectors(points[Math.min(i + 1, points.length - 1)], points[Math.max(i - 1, 0)]).normalize();
    if (i === 0 || Math.abs(side.dot(tangent)) > .98) side.set(Math.abs(tangent.x) < .8 ? 1 : 0, Math.abs(tangent.x) < .8 ? 0 : 1, 0);
    side.addScaledVector(tangent, -side.dot(tangent)).normalize();
    up.crossVectors(tangent, side);
    for (const [j, [x, y]] of circle.entries()) {
      outward.copy(side).multiplyScalar(x).addScaledVector(up, y);
      normal.setXYZ(i * sides + j, outward.x, outward.y, outward.z);
      position.setXYZ(i * sides + j, point.x + radius * outward.x, point.y + radius * outward.y, point.z + radius * outward.z);
    }
  }
  normal.needsUpdate = position.needsUpdate = true;
  node.geometry.computeBoundingSphere();
}

export class WiringModel {
  constructor(data, scene, connectors = new Map()) {
    this.routes = data.routes.map(route => {
      const material = this.material(route.kind);
      const node = new THREE.Mesh(new THREE.BufferGeometry(), material);
      scene.add(node);
      return { ...route, node, material, moving: route.points.some(point => point.length > 3) };
    });
    this.blocks = data.blocks.map(block => {
      const replacement = connectors.get(block.id);
      const node = replacement || new THREE.Group();
      const base = new THREE.Matrix4();
      if (replacement) {
        scene.add(node);
        return { ...block, node, base };
      }
      const material = this.material(block.kind);
      node.add(new THREE.Mesh(new THREE.BoxGeometry(...block.size), material));
      if (block.kind === "splice" && block.levers) {
        const lever = new THREE.Mesh(new THREE.BoxGeometry(block.size[0] * .55, block.size[1] * .53, .5),
          this.material("fuse"));
        lever.position.z = (block.size[2] + .5) / 2;
        node.add(lever);
      }
      scene.add(node);
      return { ...block, node, material, base: base.makeTranslation(...block.center) };
    });
    this.entries = [...this.routes, ...this.blocks];
    const tube = kind => {
      const node = new THREE.Mesh(new THREE.BufferGeometry(), this.material(kind));
      scene.add(node);
      return node;
    };
    this.eaton = data.eaton && { data: data.eaton, node: tube("camera") };
    this.service = data.service && {
      data: data.service,
      nodes: new Map(Object.keys(data.service.paths).map(id => [id, tube(id === "A4W8" ? "power" : "return")])),
    };
    this.visible = false;
  }

  material(kind) {
    return new THREE.MeshStandardMaterial({ color: palette[kind], emissive: palette[kind], emissiveIntensity: .16, roughness: .76 });
  }

  show(visible, baseOnly = false, openView = true) {
    this.visible = visible;
    this.baseOnly = baseOnly;
    for (const entry of this.entries) entry.node.visible = visible && (!baseOnly || entry.baseOnly);
    if (this.eaton) this.eaton.node.visible = visible || openView;
    if (this.service) for (const node of this.service.nodes.values()) node.visible = visible || openView;
  }

  draw(matrixFor, pose, serviceProgress = 0) {
    if (pose && this.eaton?.node.visible) {
      const { node, data } = this.eaton;
      const points = eatonPoints(data, pose, matrixFor("pan"));
      const top = this.baseOnly ? points.findIndex((point, index) => index > 1 && point.z > -24) : -1;
      updateTube(node, top > 1 ? points.slice(0, top) : points, 1.4);
    }
    if (this.service) {
      const { nodes, data } = this.service;
      for (const [id, node] of nodes) {
        if (node.visible) updateTube(node, interpolatePath(data.paths[id], serviceProgress), data.diameter / 2);
      }
    }
    if (!this.visible) return;
    for (const route of this.routes) {
      if (!route.node.visible || (route.ready && !route.moving)) continue;
      updateTube(route.node, routePoints(route, matrixFor), route.diameter / 2);
      route.ready = true;
    }
    for (const block of this.blocks) {
      block.node.matrixAutoUpdate = false;
      block.node.matrix.multiplyMatrices(matrixFor(block.motion || "fixed"), block.base);
      block.node.matrixWorldNeedsUpdate = true;
    }
  }
}

function interpolatePath(paths, progress) {
  const interval = Math.max(0, Math.min(1, progress)) * (paths.length - 1);
  const low = Math.floor(interval);
  const high = Math.min(paths.length - 1, low + 1);
  return paths[low].map((xyz, index) => new THREE.Vector3(...xyz)
    .lerp(new THREE.Vector3(...paths[high][index]), interval - low));
}

export function eatonPoints(data, pose, pan) {
  const blend = (value, [low, high]) => (value - low) / (high - low);
  const lower = interpolatePath(data.lower_yaw, blend(pose.neckYaw, data.yaw_range));
  const upper = interpolatePath(data.upper_pitch, blend(pose.neckPitch, data.pitch_range))
    .map(point => point.applyMatrix4(pan));
  lower[lower.length - 1].copy(upper[0]);
  const fixed = data.fixed.map(xyz => new THREE.Vector3(...xyz));
  const route = [...fixed, ...lower.slice(1), ...upper.slice(1)];
  const length = route.slice(1).reduce((sum, point, index) => sum + point.distanceTo(route[index]), 0);
  const radius = data.return_radius_mm;
  const anchor = fixed[0];
  const top = anchor.clone().add(new THREE.Vector3(0, 0, 2 * radius));
  const tangentY = anchor.y + (data.cut_mm - length - Math.PI * radius) / 2;
  const back = Array.from({ length: 49 }, (_, index) => {
    const angle = Math.PI * index / 48;
    return new THREE.Vector3(top.x, tangentY + radius * Math.sin(angle), top.z + radius * (Math.cos(angle) - 1));
  });
  return [top, ...back, ...route];
}
