(function () {
  "use strict";

  const canvas = document.getElementById("splash-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W = 0;
  let H = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuildScene();
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---- Scene state ----
  let stars = [];
  let trees = []; // {x, scale, layer (0..2), tint}
  let leaves = [];
  let fireflies = [];
  let hayBits = [];
  let petals = [];

  // Chinchilla bouncing path
  const chin = {
    x: 0,
    y: 0,
    baseY: 0,
    t: Math.random() * Math.PI * 2,
    dir: 1,
    blink: 0,
    blinkTimer: 60,
    earWobble: 0,
  };

  function rebuildScene() {
    stars = [];
    for (let i = 0; i < 80; i += 1) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.55, r: rand(0.4, 1.6), tw: Math.random() * Math.PI * 2 });
    }

    trees = [];
    const treeCounts = [10, 14, 18];
    const layerScales = [1.0, 0.7, 0.45];
    for (let layer = 0; layer < 3; layer += 1) {
      const count = treeCounts[layer];
      for (let i = 0; i < count; i += 1) {
        trees.push({
          x: rand(-50, W + 50),
          layer,
          scale: layerScales[layer] * rand(0.85, 1.25),
          tint: rand(0.85, 1.1),
        });
      }
    }

    leaves = [];
    for (let i = 0; i < 28; i += 1) {
      leaves.push(makeLeaf(true));
    }

    fireflies = [];
    for (let i = 0; i < 22; i += 1) {
      fireflies.push({
        x: Math.random() * W,
        y: rand(H * 0.3, H),
        r: rand(1.2, 2.6),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.005, 0.012),
        drift: rand(-0.25, 0.25),
      });
    }

    hayBits = [];
    for (let i = 0; i < 14; i += 1) {
      hayBits.push({
        x: Math.random() * W,
        y: Math.random() * H,
        a: Math.random() * Math.PI * 2,
        spin: rand(-0.01, 0.01),
        speed: rand(0.15, 0.35),
        size: rand(4, 8),
      });
    }

    petals = [];
    for (let i = 0; i < 16; i += 1) {
      petals.push(makePetal(true));
    }

    chin.baseY = H * 0.68;
    chin.x = W * 0.5;
    chin.y = chin.baseY;
  }

  function makeLeaf(initial) {
    return {
      x: initial ? Math.random() * W : rand(-40, W + 40),
      y: initial ? Math.random() * H : -30,
      vx: rand(-0.6, 0.6),
      vy: rand(0.4, 1.1),
      r: rand(5, 11),
      rot: Math.random() * Math.PI * 2,
      vr: rand(-0.04, 0.04),
      hue: rand(20, 70), // amber-green range
      sway: Math.random() * Math.PI * 2,
      swaySpeed: rand(0.01, 0.03),
    };
  }

  function makePetal(initial) {
    return {
      x: initial ? Math.random() * W : rand(-40, W + 40),
      y: initial ? Math.random() * H : -20,
      vx: rand(-0.4, 0.4),
      vy: rand(0.2, 0.6),
      r: rand(2.5, 4.5),
      alpha: rand(0.4, 0.9),
      tone: Math.random() < 0.5 ? "#ffd5e0" : "#fff1c8",
    };
  }

  // ---- Drawing helpers ----
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b0f2a");
    g.addColorStop(0.35, "#1c2455");
    g.addColorStop(0.7, "#2b3a72");
    g.addColorStop(1, "#3d2a55");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Distant glow
    const glow = ctx.createRadialGradient(W * 0.75, H * 0.25, 10, W * 0.75, H * 0.25, Math.max(W, H) * 0.55);
    glow.addColorStop(0, "rgba(255, 220, 150, 0.35)");
    glow.addColorStop(1, "rgba(255, 220, 150, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const glow2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 10, W * 0.15, H * 0.85, Math.max(W, H) * 0.6);
    glow2.addColorStop(0, "rgba(120, 180, 255, 0.18)");
    glow2.addColorStop(1, "rgba(120, 180, 255, 0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);
  }

  function drawStars(t) {
    for (const s of stars) {
      const a = 0.4 + Math.sin(t * 0.002 + s.tw) * 0.35;
      ctx.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMoon() {
    const cx = W * 0.78;
    const cy = H * 0.2;
    const r = Math.min(W, H) * 0.07;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
    grad.addColorStop(0, "rgba(255,240,200,0.85)");
    grad.addColorStop(0.3, "rgba(255,230,180,0.35)");
    grad.addColorStop(1, "rgba(255,230,180,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff5d8";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.arc(cx + r * 0.25, cy - r * 0.15, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTrees(t) {
    // Far parallax: only x drifts slowly using time
    const order = [...trees].sort((a, b) => a.layer - b.layer);
    for (const tr of order) {
      const layer = tr.layer;
      const drift = (t * 0.005 * (layer === 0 ? 1 : layer === 1 ? 1.8 : 2.6)) % (W + 200);
      let x = tr.x + drift;
      while (x > W + 80) x -= W + 200;
      while (x < -120) x += W + 200;

      const baseY = H * (0.62 + layer * 0.08);
      const heightBase = (layer === 0 ? 280 : layer === 1 ? 200 : 140) * tr.scale;
      drawPineTree(x, baseY, heightBase, tr.scale, layer, tr.tint);
    }
  }

  function drawPineTree(x, y, h, scale, layer, tint) {
    const trunkW = 8 * scale;
    const trunkColor = layer === 0 ? "#1a0e08" : layer === 1 ? "#2a1810" : "#3a2418";
    ctx.fillStyle = trunkColor;
    ctx.fillRect(x - trunkW / 2, y - h * 0.25, trunkW, h * 0.3);

    const greenBase = layer === 0 ? 70 : layer === 1 ? 95 : 120;
    const g = Math.floor(greenBase * tint);
    const r = Math.floor(20 * tint);
    const b = Math.floor(60 * tint);
    const color = "rgb(" + r + "," + g + "," + b + ")";

    const layers = 5;
    for (let i = 0; i < layers; i += 1) {
      const ly = y - h * 0.18 - i * h * 0.16;
      const lw = (h * 0.4) * (1 - i * 0.13);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - lw, ly + h * 0.05);
      ctx.lineTo(x + lw, ly + h * 0.05);
      ctx.lineTo(x, ly - h * 0.18);
      ctx.closePath();
      ctx.fill();
    }

    // Faint highlight on the right
    ctx.fillStyle = "rgba(255,255,255," + (0.06 - layer * 0.015).toFixed(2) + ")";
    for (let i = 0; i < layers; i += 1) {
      const ly = y - h * 0.18 - i * h * 0.16;
      const lw = (h * 0.4) * (1 - i * 0.13);
      ctx.beginPath();
      ctx.moveTo(x, ly - h * 0.18);
      ctx.lineTo(x + lw, ly + h * 0.05);
      ctx.lineTo(x + lw * 0.3, ly + h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawGround() {
    const g = ctx.createLinearGradient(0, H * 0.78, 0, H);
    g.addColorStop(0, "rgba(20, 18, 30, 0)");
    g.addColorStop(1, "rgba(8, 8, 18, 0.85)");
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  }

  function drawPlatformUnder(x, y, w) {
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(x - w / 2, y, w, 14);
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = "#2c8a3c";
    ctx.fillRect(x - w / 2, y - 4, w, 5);
    ctx.fillStyle = "#46b04a";
    for (let i = 0; i < w; i += 6) {
      ctx.fillRect(x - w / 2 + i + (i % 12 === 0 ? 1 : 0), y - 6, 2, 3);
    }
  }

  function drawChinchilla(cx, cy, scale, t) {
    const sx = 1 - Math.sin(chin.t) * 0.04;
    const sy = 1 + Math.sin(chin.t) * 0.06;
    const facing = chin.dir;
    const wobble = Math.sin(t * 0.006);
    const tailSway = Math.sin(t * 0.004) * 4;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.scale(facing * sx, sy);

    ctx.fillStyle = "#7d756c";
    ctx.beginPath();
    ctx.ellipse(-19, -2 + tailSway, 14, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9c948c";
    ctx.beginPath();
    ctx.ellipse(-21, -5 + tailSway, 11, 10, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c0b6ad";
    for (let i = 0; i < 9; i += 1) {
      const a = -1.5 + i * 0.32;
      const rx = -21 + Math.cos(a) * 12;
      const ry = -5 + tailSway + Math.sin(a) * 11;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#e4dacf";
    ctx.beginPath();
    ctx.ellipse(-28, -9 + tailSway, 6, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(80,70,60,0.35)";
    ctx.beginPath();
    ctx.ellipse(-21, -7 + tailSway, 9, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#857d75";
    ctx.beginPath();
    ctx.ellipse(0, 12, 19, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a89e96";
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI * (1 + i / 8);
      const rx = Math.cos(a) * 18;
      const ry = 9 + Math.sin(a) * 14;
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#b8aea6";
    ctx.beginPath();
    ctx.ellipse(0, 9, 17, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#efe8e2";
    ctx.beginPath();
    ctx.ellipse(0, 13, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#4a3024";
    ctx.beginPath();
    ctx.ellipse(-5, 21, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 21, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(-5, 20, 1, 0, Math.PI * 2);
    ctx.arc(5, 20, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a89e96";
    ctx.beginPath();
    ctx.ellipse(-4.5, 11, 3, 4.8, 0.2, 0, Math.PI * 2);
    ctx.ellipse(4.5, 11, 3, 4.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0b6ad";
    ctx.beginPath();
    ctx.ellipse(-4.5, 9, 2, 3, 0.2, 0, Math.PI * 2);
    ctx.ellipse(4.5, 9, 2, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3024";
    ctx.beginPath();
    ctx.arc(-4.5, 15, 2.2, 0, Math.PI * 2);
    ctx.arc(4.5, 15, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1610";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-6, 14.5); ctx.lineTo(-6, 16.5);
    ctx.moveTo(-4.5, 14.5); ctx.lineTo(-4.5, 16.7);
    ctx.moveTo(-3, 14.5); ctx.lineTo(-3, 16.5);
    ctx.moveTo(6, 14.5); ctx.lineTo(6, 16.5);
    ctx.moveTo(4.5, 14.5); ctx.lineTo(4.5, 16.7);
    ctx.moveTo(3, 14.5); ctx.lineTo(3, 16.5);
    ctx.stroke();

    ctx.save();
    ctx.translate(-7, -13);
    ctx.rotate(-0.35 - wobble * 0.4);
    ctx.fillStyle = "#857d75";
    ctx.beginPath();
    ctx.ellipse(0, -12, 6, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a89e96";
    ctx.beginPath();
    ctx.ellipse(0.5, -12, 4, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c69088";
    ctx.beginPath();
    ctx.ellipse(0.5, -11, 2.4, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(6, -13);
    ctx.rotate(0.2 + wobble * 0.55);
    ctx.fillStyle = "#a89e96";
    ctx.beginPath();
    ctx.ellipse(0, -14, 7, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c0b6ad";
    ctx.beginPath();
    ctx.ellipse(-0.5, -14, 5, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0bcb2";
    ctx.beginPath();
    ctx.ellipse(0, -12, 3.8, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(160,90,80,0.55)";
    ctx.beginPath();
    ctx.ellipse(0.6, -9, 1.6, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#9a928a";
    ctx.beginPath();
    ctx.ellipse(0, -1, 15, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#b8aea6";
    ctx.beginPath();
    ctx.ellipse(0, -2, 14, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#cfc6be";
    ctx.beginPath();
    ctx.ellipse(0, 1, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a89e96";
    ctx.beginPath();
    ctx.arc(-13, 2, 4.5, 0, Math.PI * 2);
    ctx.arc(13, 2, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#c0b6ad";
    ctx.beginPath();
    ctx.arc(-12, 1, 2.8, 0, Math.PI * 2);
    ctx.arc(12, 1, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ece4dc";
    ctx.beginPath();
    ctx.ellipse(0, 5, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const blink = chin.blink > 0;
    if (!blink) {
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(6, -2, 3.0, 4.4, 0, 0, Math.PI * 2);
      ctx.ellipse(-6, -2, 3.0, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(6.9, -3.4, 1.15, 0, Math.PI * 2);
      ctx.arc(-5.1, -3.4, 1.15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#101010";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(3, -2); ctx.lineTo(7, -2);
      ctx.moveTo(-3, -2); ctx.lineTo(-7, -2);
      ctx.stroke();
    }

    ctx.fillStyle = "#d06868";
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.lineTo(-1.8, 5);
    ctx.lineTo(1.8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(-0.5, 3.6, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 5.4);
    ctx.lineTo(0, 6.6);
    ctx.moveTo(0, 6.6);
    ctx.quadraticCurveTo(-1.8, 7.6, -2.8, 7.2);
    ctx.moveTo(0, 6.6);
    ctx.quadraticCurveTo(1.8, 7.6, 2.8, 7.2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-0.7, 6.9, 1.4, 1.5);

    ctx.strokeStyle = "rgba(40,35,30,0.8)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(2.5, 3.5); ctx.quadraticCurveTo(12, 0, 22, -1);
    ctx.moveTo(2.5, 4.5); ctx.quadraticCurveTo(12, 4, 22, 4);
    ctx.moveTo(2.5, 5.5); ctx.quadraticCurveTo(11, 7, 20, 9);
    ctx.moveTo(2.5, 6.2); ctx.quadraticCurveTo(9, 9, 16, 12);
    ctx.moveTo(-2.5, 3.5); ctx.quadraticCurveTo(-12, 0, -22, -1);
    ctx.moveTo(-2.5, 4.5); ctx.quadraticCurveTo(-12, 4, -22, 4);
    ctx.moveTo(-2.5, 5.5); ctx.quadraticCurveTo(-11, 7, -20, 9);
    ctx.moveTo(-2.5, 6.2); ctx.quadraticCurveTo(-9, 9, -16, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(230,150,150,0.5)";
    ctx.beginPath();
    ctx.ellipse(9, 4, 2.8, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(-9, 4, 2.8, 1.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  function drawLeaves() {
    for (const l of leaves) {
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot);
      const color = "hsl(" + l.hue + ", 70%, 55%)";
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, l.r, l.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(-l.r * 0.05, -l.r * 0.4, l.r * 0.1, l.r * 0.8);
      ctx.restore();
    }
  }

  function drawHayBits(t) {
    for (const h of hayBits) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.a);
      ctx.fillStyle = "rgba(240, 200, 110, 0.85)";
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(-h.size / 2 + i * 1.5, -1, 1.2, h.size);
      }
      ctx.fillStyle = "rgba(255, 230, 160, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPetals() {
    for (const p of petals) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.tone;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFireflies(t) {
    for (const f of fireflies) {
      const a = 0.4 + Math.sin(t * 0.01 + f.phase) * 0.6;
      const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 8);
      glow.addColorStop(0, "rgba(255, 240, 150, " + (a * 0.85).toFixed(2) + ")");
      glow.addColorStop(1, "rgba(255, 240, 150, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 220, " + a.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- Updates ----
  function update(t) {
    // Chinchilla bouncing
    chin.t += 0.06;
    chin.x += chin.dir * 0.4;
    if (chin.x > W * 0.7) chin.dir = -1;
    if (chin.x < W * 0.3) chin.dir = 1;
    chin.y = chin.baseY - Math.abs(Math.sin(chin.t)) * 36;
    chin.blinkTimer -= 1;
    if (chin.blink > 0) chin.blink -= 1;
    if (chin.blinkTimer <= 0) {
      chin.blink = 8;
      chin.blinkTimer = 100 + Math.random() * 180;
    }

    for (const l of leaves) {
      l.sway += l.swaySpeed;
      l.x += l.vx + Math.sin(l.sway) * 0.6;
      l.y += l.vy;
      l.rot += l.vr;
      if (l.y > H + 40 || l.x < -40 || l.x > W + 40) {
        Object.assign(l, makeLeaf(false));
      }
    }

    for (const f of fireflies) {
      f.x += Math.sin(t * 0.001 + f.phase) * 0.4 + f.drift * 0.3;
      f.y += Math.cos(t * 0.0008 + f.phase) * 0.3;
      if (f.x < -10) f.x = W + 10;
      if (f.x > W + 10) f.x = -10;
      if (f.y < H * 0.2) f.y = H;
      if (f.y > H + 10) f.y = H * 0.2;
    }

    for (const h of hayBits) {
      h.y -= h.speed;
      h.a += h.spin;
      if (h.y < -20) {
        h.y = H + 20;
        h.x = Math.random() * W;
      }
    }

    for (const p of petals) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > H + 10 || p.x < -10 || p.x > W + 10) Object.assign(p, makePetal(false));
    }
  }

  // ---- Main loop ----
  function frame(t) {
    update(t);
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawStars(t);
    drawMoon();

    // Back trees (layer 2 first)
    drawTrees(t);

    drawFireflies(t);
    drawPetals();

    // Platform + chinchilla in midground
    const platX = chin.x;
    const platY = chin.baseY + 37;
    drawPlatformUnder(platX, platY, 140);
    const heightAbove = Math.max(0, platY - chin.y);
    const shadowScale = Math.max(0.35, 1 - heightAbove / 90);
    ctx.fillStyle = "rgba(0,0,0," + (0.35 * shadowScale).toFixed(2) + ")";
    ctx.beginPath();
    ctx.ellipse(platX, platY - 4, 42 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    drawChinchilla(chin.x, chin.y, 1.7, t);

    drawHayBits(t);
    drawLeaves();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();