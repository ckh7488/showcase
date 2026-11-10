(() => {
  "use strict";

  const { scene, frame } = window.lidarTimingDemoData;
  const get = id => document.getElementById(id);
  const count = new Intl.NumberFormat("ko-KR");
  const radar = { background: "#172e33", grid: "#29434a", reference: "#647d82", aligned: "#9fe0c7", offset: "#ff9d68", missing: "#f3ce78" };

  function decode(value, ArrayType) {
    return new ArrayType(Uint8Array.from(atob(value), character => character.charCodeAt(0)).buffer);
  }

  const aligned = decode(scene.aligned, Float32Array);
  const recorded = decode(scene.recorded, Float32Array);
  const reference = decode(scene.reference, Int16Array);
  const projection = scene.view;

  function project(points, radians = 0) {
    const result = new Float32Array(points.length / 3 * 2);
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    for (let source = 0, target = 0; source < points.length; source += 3, target += 2) {
      const x = cosine * points[source] - sine * points[source + 1];
      const y = sine * points[source] + cosine * points[source + 1];
      const z = points[source + 2];
      for (let axis = 0; axis < 2; axis++) {
        const [u, v, w] = projection[axis];
        result[target + axis] = x * u + y * v + z * w;
      }
    }
    return result;
  }

  const alignedXY = project(aligned);
  const recordedXY = project(recorded);
  const focal = points => points.subarray(scene.focus * 2, scene.focus * 2 + 2);
  const focusStart = scene.focus * 3;
  const recordedDisplacement = Math.hypot(...recorded.subarray(focusStart, focusStart + 3).map((value, index) => value - aligned[focusStart + index]));
  get("recorded-displacement").textContent = `${recordedDisplacement.toFixed(2)} m`;

  function canvasView(canvas, extent, tick) {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return null;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * pixelRatio);
    const pixelsHigh = Math.round(height * pixelRatio);
    if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
      canvas.width = pixelsWide;
      canvas.height = pixelsHigh;
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const [xmin, xmax, ymin, ymax] = extent;
    const scale = Math.min((width - 28) / (xmax - xmin), (height - 26) / (ymax - ymin));
    const x = value => width / 2 + (value - (xmin + xmax) / 2) * scale;
    const y = value => height / 2 - (value - (ymin + ymax) / 2) * scale;

    ctx.fillStyle = radar.background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = radar.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = Math.ceil(xmin / tick) * tick; i <= xmax; i += tick) {
      ctx.moveTo(x(i), y(ymin));
      ctx.lineTo(x(i), y(ymax));
    }
    for (let i = Math.ceil(ymin / tick) * tick; i <= ymax; i += tick) {
      ctx.moveTo(x(xmin), y(i));
      ctx.lineTo(x(xmax), y(i));
    }
    ctx.stroke();
    return { ctx, x, y, scale, width, height };
  }

  function drawPoints(view, points, color, size, factor = 1) {
    view.ctx.fillStyle = color;
    for (let i = 0; i < points.length; i += 2) {
      view.ctx.fillRect(view.x(points[i] * factor) - size / 2, view.y(points[i + 1] * factor) - size / 2, size, size);
    }
  }

  function line(view, from, to, color, dashed = false) {
    const { ctx, x, y } = view;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    ctx.setLineDash(dashed ? [5, 5] : []);
    ctx.beginPath();
    ctx.moveTo(x(from[0]), y(from[1]));
    ctx.lineTo(x(to[0]), y(to[1]));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function mark(view, point, color, filled) {
    const { ctx, x, y } = view;
    ctx.beginPath();
    ctx.arc(x(point[0]), y(point[1]), 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = filled ? color : radar.background;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.fill();
    ctx.stroke();
  }

  function sensorMarker(view) {
    const { ctx, x, y } = view;
    ctx.save();
    ctx.translate(x(0), y(0));
    ctx.fillStyle = "#536971";
    ctx.beginPath();
    ctx.ellipse(0, 8, 13, 5, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#afbdbe";
    ctx.fillRect(-10, -15, 20, 22);
    ctx.fillStyle = "#233239";
    ctx.fillRect(-10, -9, 20, 9);
    ctx.fillStyle = "#62ad9d";
    ctx.fillRect(-10, -7, 20, 2);
    for (let fin = -8; fin <= 8; fin += 4) {
      ctx.fillStyle = "#697a80";
      ctx.fillRect(fin, -15, 2, 6);
    }
    ctx.strokeStyle = "#c6d7d9";
    ctx.strokeRect(-10, -15, 20, 22);
    ctx.fillStyle = "#e1eeee";
    ctx.font = "700 11px Malgun Gothic, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OS1-32", 0, 26);
    ctx.restore();
  }

  function scaleMark(view, meters) {
    const { ctx, scale, height } = view;
    ctx.strokeStyle = "#c6d7d9";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(16, height - 13);
    ctx.lineTo(16 + meters * scale, height - 13);
    ctx.stroke();
    ctx.fillStyle = "#e1eeee";
    ctx.font = "11px Malgun Gothic, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${meters} m`, 16, height - 17);
  }

  function paintScene(canvas, packet, { showAligned = false, color = radar.offset, displacement = null } = {}) {
    const view = canvasView(canvas, scene.bounds, 5);
    if (!view) return;
    drawPoints(view, reference, radar.reference, 1.35, .01);
    const anchor = focal(alignedXY);
    const moved = packet && focal(packet);
    const showAnchor = showAligned || (moved && displacement !== 0);
    if (showAnchor) line(view, [0, 0], anchor, showAligned ? "#529884" : "#7b999a", !showAligned);
    if (showAligned) drawPoints(view, alignedXY, radar.aligned, 2.8);
    if (moved) {
      line(view, [0, 0], moved, displacement === 0 ? "#529884" : "#c2825f", true);
      drawPoints(view, packet, color, 2.8);
      if (displacement !== null && displacement >= .1) {
        line(view, anchor, moved, "#e0efeb");
        const { ctx, x, y } = view;
        ctx.fillStyle = "#e0efeb";
        ctx.font = "700 12px Malgun Gothic, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`${displacement.toFixed(2)} m`, x(Math.min(anchor[0], moved[0])) - 9, (y(anchor[1]) + y(moved[1])) / 2 + 4);
      }
      mark(view, moved, color, true);
    }
    if (showAnchor) mark(view, anchor, radar.aligned, showAligned);
    sensorMarker(view);
    scaleMark(view, 5);
  }

  const offset = get("timing-offset");
  const filter = get("demo-filter");
  const recordedMs = scene.recordedMs.toFixed(1);
  const presets = Array.from(document.querySelectorAll("[data-time-preset]"), button => ({
    button,
    value: button.dataset.timePreset === "recorded" ? recordedMs : button.dataset.timePreset,
  }));
  offset.value = recordedMs;

  function renderDemo() {
    const ms = Number(offset.value);
    const radians = -scene.rpm * 2 * Math.PI / 60 * ms / 1000;
    const moved = 2 * scene.radiusM * Math.sin(Math.abs(radians) / 2);
    const rejected = filter.checked && Math.abs(ms) > 5;
    const signed = `${ms > 0 ? "+" : ""}${ms.toFixed(1)} ms`;
    get("timing-offset-value").textContent = signed;
    offset.setAttribute("aria-valuetext", signed);
    get("demo-angle").textContent = `${(Math.abs(radians) * 180 / Math.PI).toFixed(2)}°`;
    get("demo-displacement").textContent = `${moved.toFixed(2)} m`;
    get("demo-displacement-label").textContent = rejected ? "필터를 끄면 이동할 거리" : "예시 점 이동";
    get("demo-status").textContent = rejected ? "이 패킷의 점 계산 생략 · 원본 기록은 저장" : `이 패킷에서 점 ${count.format(aligned.length / 3)}개 표시`;
    get("demo-status").dataset.rejected = String(rejected);
    get("demo-basis-key").hidden = rejected || ms === 0;
    const shiftKey = get("demo-shift-key");
    shiftKey.hidden = rejected;
    shiftKey.className = ms === 0 ? "retained" : "omitted";
    shiftKey.textContent = ms === 0 ? "청록 · 기준 위치와 겹친 점" : "주황 · 시각 차이로 밀린 점";
    for (const { button, value } of presets) button.setAttribute("aria-pressed", String(Number(value) === ms));
    paintScene(get("timing-simulator"), rejected ? null : project(aligned, radians), {
      color: ms === 0 ? radar.aligned : radar.offset,
      displacement: moved,
    });
  }

  let demoUpdate = 0;
  function scheduleDemo() {
    if (!demoUpdate) demoUpdate = requestAnimationFrame(() => {
      demoUpdate = 0;
      renderDemo();
    });
  }
  offset.addEventListener("input", scheduleDemo);
  filter.addEventListener("change", scheduleDemo);
  for (const { button, value } of presets) {
    button.addEventListener("click", () => {
      offset.value = value;
      scheduleDemo();
    });
  }

  const packetStrip = get("frame-packet-strip");
  for (const index of frame.skipped) {
    const marker = document.createElement("span");
    marker.style.left = `${index / frame.packetsPerSensor * 100}%`;
    marker.style.width = `${100 / frame.packetsPerSensor}%`;
    packetStrip.append(marker);
  }
  get("frame-packet-count").textContent = count.format(frame.packetsPerSensor);
  get("frame-skipped-count").textContent = count.format(frame.skipped.length);

  const frameCache = new Map();
  function renderFrame() {
    const key = document.querySelector('input[name="timing-frame-stage"]:checked').value;
    const stage = frame.stages[key];
    if (!frameCache.has(key)) frameCache.set(key, [stage.off, stage.on, stage.offOnly].map(points => decode(points, Int16Array)));
    const plotted = frameCache.get(key);
    for (const [index, mode] of ["off", "on"].entries()) {
      const view = canvasView(get(`timing-frame-${mode}`), frame.bounds, 20);
      if (view) {
        drawPoints(view, plotted[index], radar.aligned, 1.35, .01);
        if (mode === "off") drawPoints(view, plotted[2], radar.missing, 1.6, .01);
        scaleMark(view, 20);
      }
      get(`frame-${mode}-count`).textContent = count.format(stage.counts[index]);
    }
    const coverage = (100 * stage.common / stage.cells[0]).toFixed(1);
    get("frame-coverage").textContent = `${coverage}%`;
    get("frame-cells").textContent = `${count.format(stage.common)} / ${count.format(stage.cells[0])}칸`;
  }

  get("timing-frame-stages").addEventListener("change", renderFrame);
  function renderAll() {
    paintScene(get("timing-recorded-scene"), recordedXY, { showAligned: true, displacement: recordedDisplacement });
    renderDemo();
    renderFrame();
  }
  window.addEventListener("resize", renderAll);
  renderAll();
})();
