import { Matrix4 } from "three";

export const tickDeg = 360 / 4096;
export const axes = {
  neckYaw:   { label: "좌우", lower: -640 * tickDeg, upper: 640 * tickDeg, rate: 42 },
  neckPitch: { label: "상하", lower: -149 * tickDeg, upper: 30 * tickDeg, rate: 24 },
  eyeYaw:    { label: "좌우", lower: -162 * tickDeg, upper: 162 * tickDeg, rate: 128 },
  eyePitch:  { label: "상하", lower: -83 * tickDeg, upper: 83 * tickDeg, rate: 90 },
  blink:     { label: "눈꺼풀", lower: 0, upper: 90, rate: 900 },
  jaw:       { label: "턱 열림", lower: 0, upper: 62 * tickDeg, rate: 190 }
};
export const jawPivot = [0, -9, 92];
export const neutral = Object.freeze(Object.fromEntries(Object.keys(axes).map(key => [key, 0])));
const rad = Math.PI / 180;
export const clamp = (value, lower, upper) => Math.min(upper, Math.max(lower, value));
export const ease = x => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const toPose = (part, value) => clamp(value, axes[part].lower, axes[part].upper);

export function advancePose(pose, target, dt) {
  const next = {};
  for (const [key, axis] of Object.entries(axes)) {
    const goal = toPose(key, target[key]);
    const step = axis.rate * dt;
    next[key] = Math.abs(goal - pose[key]) <= step ? goal : pose[key] + Math.sign(goal - pose[key]) * step;
  }
  return next;
}

export const blinkDuration = 1.20;
export const blinkIntervals = Object.freeze([4.7, 7.8, 5.6, 9.2, 6.4]);
const blinkPeriod = blinkIntervals.reduce((total, interval) => total + interval, 0);
export function blinkAt(time) {
  if (time < 0 || time >= blinkDuration) return 0;
  if (time < .54) return 90 * ease(time / .54);
  if (time < .66) return 90;
  return 90 * (1 - ease((time - .66) / .54));
}

export function scheduledBlink(elapsed, first = 1.15) {
  if (elapsed < first) return 0;
  let time = (elapsed - first) % blinkPeriod;
  for (const interval of blinkIntervals) {
    if (time < interval) return blinkAt(time);
    time -= interval;
  }
  return 0;
}

export const clackDuration = .68;
export function clackAt(time) {
  if (time < 0 || time >= clackDuration) return 0;
  const cycle = clackDuration / 2;
  const phase = time % cycle;
  const peak = (time < cycle ? 31 : 62) * tickDeg;
  if (phase < .10) return peak * ease(phase / .10);
  if (phase < .14) return peak;
  return peak * (1 - ease((phase - .14) / .16));
}

export function demonstration(time) {
  const t = time % 9;
  const travel = ease(t / .65) * (1 - ease((t - 5.75) / 1.05));
  return {
    neckYaw: travel * 31 * Math.sin(t * Math.PI / 3.4),
    neckPitch: travel * (-4 + 5.8 * Math.sin(t * Math.PI / 3.4 + .4)),
    eyeYaw: travel * 13 * Math.sin(t * Math.PI / 3.4 + .82),
    eyePitch: travel * 5 * Math.sin(t * Math.PI / 3.4 + 1.5),
    blink: scheduledBlink(time),
    jaw: clackAt(t - 7.43),
  };
}

export class TargetFollower {
  constructor() { this.filtered = [0, 0]; }

  reset() { this.filtered = [0, 0]; }

  goals(target, pose, dt) {
    if (!target) return pose;
    const blend = 1 - Math.exp(-dt / .08);
    this.filtered[0] += blend * (target.yaw - pose.neckYaw - this.filtered[0]);
    this.filtered[1] += blend * (target.pitch - pose.neckPitch - this.filtered[1]);
    const [yaw, pitch] = this.filtered;
    const deadband = v => Math.abs(v) < 2.4 ? 0 : v - Math.sign(v) * 2.4;
    return {
      eyeYaw: yaw, eyePitch: pitch, blink: 0, jaw: 0,
      neckYaw: pose.neckYaw + .85 * deadband(yaw),
      neckPitch: pose.neckPitch + .78 * deadband(pitch),
    };
  }
}

function pivot(axis, degrees, x, y, z) {
  const rotate = new Matrix4();
  if (axis === "x") rotate.makeRotationX(degrees * rad);
  else rotate.makeRotationZ(degrees * rad);
  return new Matrix4().makeTranslation(x, y, z)
    .multiply(rotate).multiply(new Matrix4().makeTranslation(-x, -y, -z));
}

export function motionMatrix(kind, pose, drop = 0, rig = {}) {
  const result = new Matrix4();
  if (kind === "fixed") return result;
  if (kind === "hatch") return result.makeTranslation(0, 0, -clamp(drop, 0, 30));
  const eyePitch = rig.eye_pitch ?? rig;
  const yawRig = rig.eye_yaw ?? {};
  const lidsRig = rig.blink ?? {};
  const pan = pivot("z", -pose.neckYaw, 0, 0, 0);
  const head = pivot("x", pose.neckPitch, 0, 0, 112);
  if (kind === "pan") return pan;
  if (kind === "pitch_link" && rig.pitch_stop?.link) {
    const { pan_pin_mm: a, head_pin_mm: b } = rig.pitch_stop.link;
    const movedY = head.elements[5] * b[1] + head.elements[9] * b[2] + head.elements[13];
    const movedZ = head.elements[6] * b[1] + head.elements[10] * b[2] + head.elements[14];
    const [y0, z0, y1, z1] = [b[1] - a[1], b[2] - a[2], movedY - a[1], movedZ - a[2]];
    const angle = Math.atan2(y0 * z1 - z0 * y1, y0 * y1 + z0 * z1) / rad;
    return pan.multiply(pivot("x", angle, ...a));
  }
  if (kind === "jaw") result.premultiply(pivot("x", rig.jaw_pivot_mm ? (rig.jaw_closed_deg ?? 0) + toPose("jaw", pose.jaw) : clamp(pose.jaw, 0, 13), ...(rig.jaw_pivot_mm ?? jawPivot)));
  const yaw = -pose.eyeYaw;
  const pitch = pose.eyePitch;
  const blink = pose.blink;
  const eyeX = { look1: -34, look2: 34, look_horn: -5.8 };
  if (kind in eyeX) {
    const center = kind === "look_horn" ? yawRig.pivot_mm ?? [-5.8, -35.5, 113] : [eyeX[kind], -39, 119];
    result.premultiply(pivot("z", yaw, ...center));
  } else if (kind === "look_link") {
    const radius = yawRig.radius_mm ?? 13.5;
    result.premultiply(new Matrix4().makeTranslation(-radius * Math.sin(yaw * rad), radius * (Math.cos(yaw * rad) - 1), 0));
  }
  if (kind === "tilt_horn") {
    result.premultiply(pivot("x", pitch, ...(eyePitch.servo_axis_mm ?? [58.65, 10, 151])));
  } else if (kind === "tilt_link") {
    const start = (eyePitch.phase_deg ?? 0) * rad;
    const end = start + pitch * rad;
    const radius = eyePitch.crank_radius_mm ?? 10;
    result.premultiply(new Matrix4().makeTranslation(
      0, radius * (Math.cos(end) - Math.cos(start)), radius * (Math.sin(end) - Math.sin(start))));
  } else if (kind === "tilt" || kind === "look_link" || kind in eyeX) {
    result.premultiply(pivot("x", pitch, ...(eyePitch.cradle_axis_mm ?? [0, -39, 119])));
  }
  const eyePivot = eyePitch.cradle_axis_mm ?? [0, -39, 119];
  const lids = { lid1: eyePivot, lid2: eyePivot,
    blink_motor_horn: [0, ...(lidsRig.servo_yz_mm ?? [-14, 170])],
    blink_shaft_crank: [0, ...(lidsRig.shaft_yz_mm ?? [-24, 154])],
  };
  if (kind in lids) {
    result.premultiply(pivot("x", blink, ...lids[kind]));
  } else if (kind === "blink_lid_link" || kind === "blink_drive_link") {
    const radius = kind === "blink_lid_link" ? lidsRig.lid_radius_mm ?? 11.5 : lidsRig.radius_mm ?? 8.25;
    const phase = (lidsRig.phase_deg ?? -56) * rad;
    const end = phase + blink * rad;
    result.premultiply(new Matrix4().makeTranslation(0, radius * (Math.cos(end) - Math.cos(phase)), radius * (Math.sin(end) - Math.sin(phase))));
  }
  return result.premultiply(head).premultiply(pan);
}
