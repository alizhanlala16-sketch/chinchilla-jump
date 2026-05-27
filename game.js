(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const overlay = document.getElementById("overlay");
  const gameoverEl = document.getElementById("gameover");
  const scoreEl = document.getElementById("score");
  const heightEl = document.getElementById("height");
  const bestEl = document.getElementById("best");
  const finalScoreEl = document.getElementById("final-score");
  const finalHeightEl = document.getElementById("final-height");

  const GRAVITY = 0.55;
  const JUMP_FORCE = -11.8;
  const DOUBLE_JUMP_FORCE = -10.5;
  const MOVE_SPEED = 4.4;
  const MAX_FALL = 14;
  const PLATFORM_GAP = 82;
  const CAMERA_FOLLOW = H * 0.45;

  const FRAGILE_LIFETIME = 90;
  const FRAGILE_WARNING = 50;

  const ROCKET_DURATION = 360;
  const ROCKET_LIFT = -8.5;
  const SHIELD_DURATION = 1140;
  const SHIELD_RESCUE_INDEX = 3;
  const LASER_DURATION = 900;
  const LASER_LENGTH = 1600;
  const LASER_HALF_WIDTH = 6;

  const PLATFORM_TYPES = {
    grass: { color: "#4f7d3a", edge: "#3a5e29", breakable: false, moving: false },
    log: { color: "#7a4a2c", edge: "#5a341d", breakable: false, moving: false },
    fragile: { color: "#b89060", edge: "#8a6a40", breakable: true, moving: false },
    moving: { color: "#3d6e8a", edge: "#2a4f66", breakable: false, moving: true },
  };

  const INITIAL_Y = H - 140;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  const keys = new Set();
  let state = "menu";
  let cameraY = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem("chinchilla-best") || 0);
  let maxHeight = 0;
  let particles = [];
  let backgroundLeaves = [];

  bestEl.textContent = bestScore;

  const player = {
    x: W / 2,
    y: INITIAL_Y,
    w: 38,
    h: 36,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    squash: 1,
    blinkTimer: 0,
    jumpsLeft: 2,
    earWobble: 0,
    standingOn: null,
    lives: 3,
    invincibleTimer: 0,
    rocketTimer: 0,
    shieldTimer: 0,
    laserTimer: 0,
  };

  let platforms = [];
  let hays = [];
  let highestPlatformY = 0;
  let saws = [];
  let foxes = [];
  let knives = [];
  let lastSawSpawn = 0;
  let lastFoxSpawn = 0;
  let squirrels = [];
  let apples = [];
  let rockets = [];
  let shields = [];
  let lasers = [];

  const forestTreesFar = [];
  const forestTreesNear = [];
  for (let i = 0; i < 14; i += 1) {
    forestTreesFar.push({
      x: rand(0, W),
      y: rand(-H * 2, H * 2),
      scale: rand(0.7, 1.2),
      hue: rand(95, 130),
      shade: rand(18, 28),
    });
  }
  for (let i = 0; i < 10; i += 1) {
    forestTreesNear.push({
      x: rand(-30, W + 30),
      y: rand(-H * 2, H * 2),
      scale: rand(1.1, 1.7),
      hue: rand(95, 130),
      shade: rand(28, 42),
    });
  }
  for (let i = 0; i < 18; i += 1) {
    backgroundLeaves.push({
      x: rand(0, W),
      y: rand(-H, H),
      vx: rand(-0.4, 0.4),
      vy: rand(0.3, 0.8),
      size: rand(3, 6),
      hue: rand(60, 130),
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.04, 0.04),
    });
  }
  const skyClouds = [];
  for (let i = 0; i < 14; i += 1) {
    skyClouds.push({
      x: rand(-40, W + 40),
      y: rand(-H * 2, H * 2),
      scale: rand(0.6, 1.4),
      speed: rand(0.04, 0.12),
    });
  }
  const skyBirds = [];
  for (let i = 0; i < 6; i += 1) {
    skyBirds.push({
      x: rand(0, W),
      y: rand(-H, H),
      scale: rand(0.7, 1.4),
      flap: rand(0, Math.PI * 2),
    });
  }
  const spaceStars = [];
  for (let i = 0; i < 90; i += 1) {
    spaceStars.push({
      x: rand(0, W),
      y: rand(-H * 2, H * 2),
      r: rand(0.4, 2.0),
      tw: rand(0, Math.PI * 2),
      speed: rand(0.005, 0.02),
    });
  }
  const spaceNebulae = [];
  for (let i = 0; i < 5; i += 1) {
    spaceNebulae.push({
      x: rand(0, W),
      y: rand(-H * 2, H * 2),
      r: rand(80, 180),
      hue: rand(200, 320),
    });
  }
  const spacePlanets = [];
  for (let i = 0; i < 4; i += 1) {
    spacePlanets.push({
      x: rand(40, W - 40),
      y: rand(-H * 2, H * 2),
      r: rand(18, 42),
      hue: rand(15, 320),
      ring: Math.random() < 0.4,
    });
  }
  const alienRocks = [];
  for (let i = 0; i < 9; i += 1) {
    alienRocks.push({
      x: rand(0, W),
      y: rand(-H * 2, H * 2),
      w: rand(40, 110),
      h: rand(60, 160),
      hue: rand(260, 340),
    });
  }
  const alienMushrooms = [];
  for (let i = 0; i < 8; i += 1) {
    alienMushrooms.push({
      x: rand(0, W),
      y: rand(-H * 2, H * 2),
      h: rand(60, 130),
      capR: rand(14, 24),
      hue: rand(280, 340),
    });
  }

  const themeCycle = [
    { name: "forest", length: 790 },
    { name: "sky",    length: 10  },
    { name: "space",  length: 200 },
    { name: "alien",  length: 780 },
    { name: "sky",    length: 10  },
    { name: "space",  length: 200 },
    { name: "forest", length: 790 },
  ];
  const themeCycleTotal = themeCycle.reduce(function (s, c) { return s + c.length; }, 0);

  function getThemeBlend(h) {
    const pos = ((h % themeCycleTotal) + themeCycleTotal) % themeCycleTotal;
    let acc = 0;
    for (let i = 0; i < themeCycle.length; i += 1) {
      const seg = themeCycle[i];
      if (pos < acc + seg.length) {
        const local = pos - acc;
        const fade = Math.max(4, Math.min(seg.length * 0.4, 60));
        if (local < fade) {
          const prev = themeCycle[(i - 1 + themeCycle.length) % themeCycle.length];
          return { a: prev.name, b: seg.name, t: local / fade };
        }
        if (local > seg.length - fade) {
          const next = themeCycle[(i + 1) % themeCycle.length];
          return { a: seg.name, b: next.name, t: 1 - (seg.length - local) / fade };
        }
        return { a: seg.name, b: seg.name, t: 0 };
      }
      acc += seg.length;
    }
    return { a: "forest", b: "forest", t: 0 };
  }

  function resetGame() {
    cameraY = 0;
    score = 0;
    maxHeight = 0;
    particles = [];
    player.x = W / 2;
    player.y = INITIAL_Y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.facing = 1;
    player.squash = 1;
    player.jumpsLeft = 2;
    player.standingOn = null;
    player.lives = 3;
    player.invincibleTimer = 0;
    player.rocketTimer = 0;
    player.shieldTimer = 0;
    player.laserTimer = 0;
    platforms = [];
    hays = [];
    saws = [];
    foxes = [];
    knives = [];
    lastSawSpawn = INITIAL_Y;
    lastFoxSpawn = INITIAL_Y;
    squirrels = [];
    apples = [];
    rockets = [];
    shields = [];
    lasers = [];

    const start = {
      x: W / 2 - 80,
      y: H - 80,
      w: 160,
      h: 18,
      type: "grass",
      broken: false,
      respawnTimer: 0,
      moveDir: 1,
      moveSpeed: 1.4,
      spawnSide: "center",
      extending: false,
      extendTarget: W / 2 - 80,
      fragileTimer: 0,
      triggered: false,
      shake: 0,
    };
    platforms.push(start);

    highestPlatformY = start.y;

    for (let i = 1; i < 14; i += 1) {
      spawnPlatform(highestPlatformY - PLATFORM_GAP);
    }

    updateHud();
  }

  function pickPlatformType(heightLevel) {
    const difficulty = clamp(heightLevel / 300, 0, 1);
    const roll = Math.random();
    if (roll < 0.10 + difficulty * 0.10) return "fragile";
    if (roll < 0.22 + difficulty * 0.12) return "moving";
    if (roll < 0.50) return "log";
    return "grass";
  }

  function spawnPlatform(y) {
    const heightLevel = Math.max(0, Math.floor((INITIAL_Y - y) / 10));
    const type = pickPlatformType(heightLevel);
    const w = rand(78, 130);
    const fromLeft = Math.random() < 0.5;
    const spawnSide = fromLeft ? "left" : "right";
    const x = fromLeft ? -w * 0.35 : W - w * 0.65;
    const extendTarget = clamp(rand(30, W - w - 30), 20, W - w - 20);

    const platform = {
      x,
      y,
      w,
      h: 16,
      type,
      broken: false,
      respawnTimer: 0,
      moveDir: Math.random() < 0.5 ? -1 : 1,
      moveSpeed: rand(1.0, 2.0) + clamp(heightLevel / 600, 0, 1.5),
      spawnSide,
      extendTarget,
      extending: spawnSide !== "center",
      fragileTimer: 0,
      triggered: false,
      shake: 0,
    };

    platforms.push(platform);
    highestPlatformY = y;

    if (type !== "fragile" && Math.random() < 0.78) {
      hays.push({
        platform,
        offsetX: rand(-platform.w * 0.25, platform.w * 0.25),
        offsetY: -22,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 10,
      });
    } else if (type === "fragile" && Math.random() < 0.4) {
      hays.push({
        platform,
        offsetX: 0,
        offsetY: -22,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 10,
      });
    }

    if (type !== "fragile" && Math.random() < 0.025) {
      apples.push({
        platform,
        offsetX: rand(-platform.w * 0.2, platform.w * 0.2),
        offsetY: -22,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 11,
      });
    }

    if (type !== "fragile" && Math.random() < 0.03) {
      rockets.push({
        platform,
        offsetX: rand(-platform.w * 0.15, platform.w * 0.15),
        offsetY: -28,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 13,
      });
    }

    if (type !== "fragile" && Math.random() < 0.03) {
      shields.push({
        platform,
        offsetX: rand(-platform.w * 0.15, platform.w * 0.15),
        offsetY: -26,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 13,
      });
    }

    if (type !== "fragile" && Math.random() < 0.03) {
      lasers.push({
        platform,
        offsetX: rand(-platform.w * 0.15, platform.w * 0.15),
        offsetY: -26,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 13,
      });
    }

    if (type !== "fragile" && Math.random() < 0.08) {
      squirrels.push({
        platform,
        offsetX: rand(-platform.w * 0.25, platform.w * 0.25),
        state: "sitting",
        idleTimer: 80 + Math.random() * 280,
        targetPlatform: null,
        jumpProgress: 0,
        jumpStartX: 0,
        jumpStartY: 0,
        facing: Math.random() < 0.5 ? -1 : 1,
        animTimer: Math.random() * Math.PI * 2,
      });
    }
  }

  function ensurePlatforms() {
    while (highestPlatformY > cameraY - H) {
      spawnPlatform(highestPlatformY - rand(PLATFORM_GAP - 10, PLATFORM_GAP + 18));
    }

    platforms = platforms.filter((p) => p.y < cameraY + H + 200);
    hays = hays.filter((h) => !h.collected && h.platform.y < cameraY + H + 200);
    apples = apples.filter((a) => !a.collected && a.platform.y < cameraY + H + 200);
    rockets = rockets.filter((r) => !r.collected && r.platform.y < cameraY + H + 200);
    shields = shields.filter((s) => !s.collected && s.platform.y < cameraY + H + 200);
    lasers = lasers.filter((l) => !l.collected && l.platform.y < cameraY + H + 200);
  }

  let audioCtx = null;
  let snortBuffer = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      } catch (e) { return null; }
    }
    if (audioCtx.state === "suspended") {
      try { audioCtx.resume(); } catch (e) {}
    }
    return audioCtx;
  }
  function getSnortBuffer(actx) {
    if (snortBuffer && snortBuffer.sampleRate === actx.sampleRate) return snortBuffer;
    const len = Math.floor(actx.sampleRate * 0.18);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    snortBuffer = buf;
    return buf;
  }
  function playSnort(pitch, vol) {
    const actx = getAudioCtx();
    if (!actx) return;
    pitch = pitch || 1;
    vol = vol === undefined ? 0.22 : vol;
    const now = actx.currentTime;

    const noise = actx.createBufferSource();
    noise.buffer = getSnortBuffer(actx);

    const bp = actx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1400 * pitch, now);
    bp.frequency.exponentialRampToValueAtTime(550 * pitch, now + 0.14);
    bp.Q.value = 7;

    const hp = actx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 280;

    const gain = actx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.linearRampToValueAtTime(vol * 0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(vol * 0.6, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.16);

    noise.connect(bp);
    bp.connect(hp);
    hp.connect(gain);
    gain.connect(actx.destination);
    noise.start(now);
    noise.stop(now + 0.18);

    const osc = actx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(360 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(180 * pitch, now + 0.1);
    const og = actx.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(vol * 0.18, now + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0005, now + 0.12);
    osc.connect(og).connect(actx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  function jump() {
    if (state !== "playing") return;
    if (player.grounded) {
      player.vy = JUMP_FORCE;
      player.grounded = false;
      player.squash = 0.7;
      player.jumpsLeft = 1;
      player.earWobble = 1;
      spawnDust(player.x, player.y + player.h / 2, 8);
      playSnort(1.0, 0.22);
    } else if (player.jumpsLeft > 0) {
      player.vy = DOUBLE_JUMP_FORCE;
      player.jumpsLeft = 0;
      player.squash = 0.7;
      player.earWobble = 1;
      spawnDoubleJumpRing(player.x, player.y + 4);
      playSnort(1.35, 0.2);
    }
  }

  function spawnDust(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-2.5, 2.5),
        vy: rand(-3, -0.5),
        life: rand(18, 30),
        maxLife: 30,
        color: "rgba(220,210,190,0.85)",
        size: rand(2, 4),
      });
    }
  }

  function spawnDoubleJumpRing(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * 3.2,
        vy: Math.sin(angle) * 1.8 - 1,
        life: 24,
        maxLife: 24,
        color: "rgba(180,220,255,0.85)",
        size: rand(2.5, 4),
      });
    }
  }

  function spawnSparkles(x, y) {
    for (let i = 0; i < 12; i += 1) {
      particles.push({
        x,
        y,
        vx: rand(-3, 3),
        vy: rand(-4, 1),
        life: rand(22, 38),
        maxLife: 38,
        color: "hsl(" + rand(40, 70) + ", 95%, 65%)",
        size: rand(2, 5),
      });
    }
  }

  function spawnRespawnBurst(p) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      particles.push({
        x: cx + Math.cos(a) * (p.w / 2 - 6),
        y: cy + Math.sin(a) * 4,
        vx: Math.cos(a) * 1.2,
        vy: Math.sin(a) * 1.2 - 0.8,
        life: 35,
        maxLife: 35,
        color: "rgba(255, 220, 130, 0.95)",
        size: rand(2.2, 3.5),
      });
    }
    for (let i = 0; i < 8; i += 1) {
      particles.push({
        x: cx + rand(-p.w / 2, p.w / 2),
        y: cy + rand(-4, 4),
        vx: rand(-0.6, 0.6),
        vy: rand(-2, -0.5),
        life: 40,
        maxLife: 40,
        color: "rgba(255, 245, 200, 0.9)",
        size: 3,
      });
    }
  }

  function spawnPlatformBreak(p) {
    for (let i = 0; i < 14; i += 1) {
      particles.push({
        x: p.x + rand(0, p.w),
        y: p.y + rand(0, p.h),
        vx: rand(-3, 3),
        vy: rand(-2, 3),
        life: rand(24, 40),
        maxLife: 40,
        color: PLATFORM_TYPES[p.type].edge,
        size: rand(2.5, 5),
      });
    }
  }

  function ensureHazards() {
    if (lastSawSpawn === 0) lastSawSpawn = INITIAL_Y;
    if (lastFoxSpawn === 0) lastFoxSpawn = INITIAL_Y;

    if (highestPlatformY < lastSawSpawn - 600) {
      lastSawSpawn = highestPlatformY;
      if (Math.random() < 0.55) {
        const sawY = highestPlatformY + 250;
        const fromLeft = Math.random() < 0.5;
        saws.push({
          x: fromLeft ? 30 : W - 30,
          y: sawY,
          vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 1.5),
          r: 18,
          rotation: 0,
        });
      }
    }

    if (highestPlatformY < lastFoxSpawn - 2200) {
      lastFoxSpawn = highestPlatformY;
      if (Math.random() < 0.35) {
        const foxY = highestPlatformY + 350;
        const side = Math.random() < 0.5 ? "left" : "right";
        foxes.push({
          x: side === "left" ? 22 : W - 22,
          y: foxY,
          side,
          throwTimer: 100,
          life: 540,
        });
      }
    }

    saws = saws.filter((s) => !s.dead && s.y < cameraY + H + 200);
    foxes = foxes.filter((f) => f.y < cameraY + H + 200 && f.life > 0);
    knives = knives.filter((k) =>
      k.x > -30 && k.x < W + 30 &&
      k.y - cameraY > -30 && k.y - cameraY < H + 30
    );
  }

  function updateSaws() {
    for (const saw of saws) {
      saw.x += saw.vx;
      if (saw.x < saw.r + 4) {
        saw.x = saw.r + 4;
        saw.vx = Math.abs(saw.vx);
      }
      if (saw.x > W - saw.r - 4) {
        saw.x = W - saw.r - 4;
        saw.vx = -Math.abs(saw.vx);
      }
      saw.rotation += 0.35;
      const dx = player.x - saw.x;
      const dy = player.y - saw.y;
      if (Math.hypot(dx, dy) < saw.r + player.w * 0.35) {
        if (player.shieldTimer > 0 || player.rocketTimer > 0) {
          if (!saw.deflectCooldown || saw.deflectCooldown <= 0) {
            saw.vx = -saw.vx * 1.05;
            saw.vy = (saw.vy || 0) - 2;
            saw.deflectCooldown = 18;
            spawnShieldHit(saw.x, saw.y);
          }
        } else {
          damagePlayer();
        }
      }
      if (saw.deflectCooldown && saw.deflectCooldown > 0) saw.deflectCooldown -= 1;
    }
  }

  function updateFoxes() {
    for (const fox of foxes) {
      fox.life -= 1;
      fox.throwTimer -= 1;
      if (fox.throwTimer <= 0 && fox.life > 60) {
        let tx = player.x;
        let ty = player.y;
        if (squirrels.length > 0 && Math.random() < 0.35) {
          const candidates = [];
          for (const sq of squirrels) {
            if (sq.dead) continue;
            const sp = getSquirrelPos(sq);
            const d = Math.hypot(sp.x - fox.x, sp.y - fox.y);
            if (d < 500) candidates.push(sp);
          }
          if (candidates.length > 0) {
            const t = candidates[Math.floor(Math.random() * candidates.length)];
            tx = t.x;
            ty = t.y;
          }
        }
        const dx = tx - fox.x;
        const dy = ty - fox.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const speed = 5.5;
        knives.push({
          x: fox.x + (fox.side === "left" ? 18 : -18),
          y: fox.y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          rotation: Math.atan2(dy, dx),
        });
        fox.throwTimer = 110 + Math.random() * 60;
      }
    }
  }

  function updateSquirrels() {
    for (const sq of squirrels) {
      sq.animTimer += 0.08;
      if (sq.state === "sitting") {
        sq.idleTimer -= 1;
        if (sq.idleTimer <= 0) {
          const sx = sq.platform.x + sq.platform.w / 2 + sq.offsetX;
          const sy = sq.platform.y;
          let best = null;
          let bestDist = Infinity;
          for (const p of platforms) {
            if (p === sq.platform || p.broken || p.extending) continue;
            const px = p.x + p.w / 2;
            const dx = px - sx;
            const dy = p.y - sy;
            const dist = Math.hypot(dx, dy);
            if (dist < 220 && Math.abs(dy) < 180) {
              if (dist < bestDist || Math.random() < 0.25) {
                best = p;
                bestDist = dist;
              }
            }
          }
          if (best) {
            sq.targetPlatform = best;
            sq.jumpStartX = sx;
            sq.jumpStartY = sy;
            sq.jumpProgress = 0;
            sq.state = "jumping";
            sq.facing = (best.x + best.w / 2) > sx ? 1 : -1;
          } else {
            sq.idleTimer = 80 + Math.random() * 200;
          }
        }
      } else if (sq.state === "jumping") {
        sq.jumpProgress += 0.025;
        if (sq.jumpProgress >= 1 || !sq.targetPlatform || sq.targetPlatform.broken) {
          if (sq.targetPlatform && !sq.targetPlatform.broken) {
            sq.platform = sq.targetPlatform;
            sq.offsetX = rand(-sq.platform.w * 0.25, sq.platform.w * 0.25);
          }
          sq.state = "sitting";
          sq.idleTimer = 120 + Math.random() * 300;
        }
      }
    }
    squirrels = squirrels.filter((sq) =>
      sq.platform && !sq.platform.broken &&
      sq.platform.y < cameraY + H + 280
    );
  }
  function updateKnives() {
    for (const k of knives) {
      if (k.dead) continue;
      k.x += k.vx;
      k.y += k.vy;
      let hitSquirrel = false;
      for (const sq of squirrels) {
        if (sq.dead) continue;
        const p = getSquirrelPos(sq);
        if (Math.hypot(p.x - k.x, p.y - k.y) < 16) {
          sq.dead = true;
          k.dead = true;
          hitSquirrel = true;
          spawnFurBurst(p.x, p.y);
          break;
        }
      }
      if (hitSquirrel) continue;
      const dx = player.x - k.x;
      const dy = player.y - k.y;
      if (Math.hypot(dx, dy) < 11 + player.w * 0.3) {
        if (player.shieldTimer > 0 || player.rocketTimer > 0) {
          spawnShieldHit(k.x, k.y);
        } else {
          damagePlayer();
        }
        k.dead = true;
      }
    }
    knives = knives.filter((k) => !k.dead);
    squirrels = squirrels.filter((sq) => !sq.dead);
  }

  function updatePlatforms() {
    for (const p of platforms) {
      const prevX = p.x;
      if (p.spawnSide !== "center" && p.extending) {
        const dir = p.extendTarget > p.x ? 1 : -1;
        p.x += dir * 3.0;
        if (Math.abs(p.x - p.extendTarget) < 3.0) {
          p.x = p.extendTarget;
          p.extending = false;
        }
      }

      if (PLATFORM_TYPES[p.type].moving && !p.extending) {
        p.x += p.moveDir * p.moveSpeed;
        if (p.x < 8 || p.x + p.w > W - 8) {
          p.moveDir *= -1;
          p.x = clamp(p.x, 8, W - 8 - p.w);
        }
      }

      if (p.type === "fragile" && p.triggered && !p.broken) {
        p.fragileTimer += 1;
        const warnPhase = p.fragileTimer >= FRAGILE_WARNING;
        p.shake = warnPhase ? Math.sin(p.fragileTimer * 0.6) * 1.6 : 0;
        if (p.fragileTimer >= FRAGILE_LIFETIME) {
          p.broken = true;
          p.respawnTimer = 300;
          spawnPlatformBreak(p);
        }
      } else if (p.broken && p.respawnTimer > 0) {
        p.respawnTimer -= 1;
        if (p.respawnTimer <= 0) {
          p.broken = false;
          p.triggered = false;
          p.fragileTimer = 0;
          p.shake = 0;
          spawnRespawnBurst(p);
        }
      } else {
        p.shake *= 0.7;
      }
      p.deltaX = p.x - prevX;
    }
  }

  function updatePlayer() {
    let move = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) move -= 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) move += 1;

    player.vx = move * MOVE_SPEED;
    if (move !== 0) player.facing = move;

    if (player.standingOn && !player.standingOn.broken) {
      player.x += player.standingOn.deltaX || 0;
    }

    const rocketActive = player.rocketTimer > 0;
    if (rocketActive) {
      player.vy = ROCKET_LIFT;
      player.grounded = false;
      player.standingOn = null;
      spawnRocketTrail(player.x, player.y + player.h / 2);
    } else {
      player.vy += GRAVITY;
      player.vy = Math.min(player.vy, MAX_FALL);
    }
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < player.w / 2) {
      player.x = player.w / 2;
      player.vx = 0;
    }
    if (player.x > W - player.w / 2) {
      player.x = W - player.w / 2;
      player.vx = 0;
    }

    const wasGrounded = player.grounded;
    player.grounded = false;

    if (!rocketActive && player.vy > 0) {
      for (const p of platforms) {
        if (p.broken || p.extending) continue;

        const prevBottom = player.y + player.h / 2 - player.vy;
        const currBottom = player.y + player.h / 2;
        const withinX = player.x + player.w / 2 > p.x && player.x - player.w / 2 < p.x + p.w;

        if (withinX && prevBottom <= p.y && currBottom >= p.y) {
          player.y = p.y - player.h / 2;
          player.vy = 0;
          player.grounded = true;
          player.jumpsLeft = 2;
          player.standingOn = p;
          if (!wasGrounded) {
            player.squash = 1.18;
            spawnDust(player.x, player.y + player.h / 2, 3);
          }

          if (p.type === "fragile" && !p.triggered) {
            p.triggered = true;
          }
          break;
        }
      }
    }

    if (!player.grounded) player.standingOn = null;

    const targetCameraY = player.y - CAMERA_FOLLOW;
    if (targetCameraY < cameraY) {
      cameraY = targetCameraY;
    }

    const currentHeight = Math.max(0, Math.floor((INITIAL_Y - player.y) / 10));
    maxHeight = Math.max(maxHeight, currentHeight);

    if (player.y - cameraY > H + 60) {
      if (player.shieldTimer > 0) {
        rescueWithShield();
      } else {
        endGame();
      }
    }

    player.squash += (1 - player.squash) * 0.18;
    player.blinkTimer += 1;
    player.earWobble *= 0.9;
    if (player.invincibleTimer > 0) player.invincibleTimer -= 1;
    if (player.rocketTimer > 0) {
      player.rocketTimer -= 1;
      if (player.rocketTimer === 0) {
        player.vy = -2;
        spawnDoubleJumpRing(player.x, player.y);
      }
    }
    if (player.shieldTimer > 0) player.shieldTimer -= 1;
    if (player.laserTimer > 0) {
      player.laserTimer -= 1;
      processLaserHits();
    }
  }

  function updateHays() {
    for (const hay of hays) {
      if (hay.collected || hay.platform.broken) continue;
      hay.bob += 0.08;
      const hx = hay.platform.x + hay.platform.w / 2 + hay.offsetX;
      const hy = hay.platform.y + hay.offsetY;
      const dx = player.x - hx;
      const dy = player.y - hy;
      if (Math.hypot(dx, dy) < player.w * 0.55 + hay.r) {
        hay.collected = true;
        score += 10;
        spawnSparkles(hx, hy);
        updateHud();
      }
    }
  }

  function updateParticles() {
    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= 1;
      return p.life > 0;
    });
  }

  function updateBackgroundLeaves() {
    for (const leaf of backgroundLeaves) {
      leaf.x += leaf.vx;
      leaf.y += leaf.vy;
      leaf.rot += leaf.rotSpeed;
      if (leaf.x < -10) leaf.x = W + 10;
      if (leaf.x > W + 10) leaf.x = -10;
      if (leaf.y - cameraY > H + 20) leaf.y = cameraY - 20;
    }
  }

  function updateHud() {
    scoreEl.textContent = score;
    heightEl.textContent = maxHeight;
  }

  function endGame() {
    state = "over";
    setPlayingUi(false);
    keys.delete("ArrowLeft");
    keys.delete("ArrowRight");
    bestScore = Math.max(bestScore, score);
    localStorage.setItem("chinchilla-best", String(bestScore));
    bestEl.textContent = bestScore;
    finalScoreEl.textContent = score;
    finalHeightEl.textContent = maxHeight;
    gameoverEl.classList.remove("hidden");
    gameoverEl.classList.add("visible");
  }

  let musicStarted = false;
  let musicGain = null;
  let musicMuted = false;
  const MUSIC_VOLUME = 0.045;

  function startMusic() {
    if (musicStarted) return;
    const actx = getAudioCtx();
    if (!actx) return;
    musicStarted = true;

    musicGain = actx.createGain();
    musicGain.gain.value = 0;
    musicGain.gain.linearRampToValueAtTime(MUSIC_VOLUME, actx.currentTime + 2.0);
    musicGain.connect(actx.destination);

    const delayNode = actx.createDelay(1.0);
    delayNode.delayTime.value = 0.19;
    const feedback = actx.createGain();
    feedback.gain.value = 0.25;
    const delayMix = actx.createGain();
    delayMix.gain.value = 0.32;
    delayNode.connect(feedback);
    feedback.connect(delayNode);
    delayNode.connect(delayMix);
    delayMix.connect(musicGain);

    const progression = [
      { bass: 73.42, pad: [293.66, 369.99, 440.00] },
      { bass: 55.00, pad: [277.18, 329.63, 440.00] },
      { bass: 61.74, pad: [246.94, 293.66, 369.99] },
      { bass: 49.00, pad: [246.94, 293.66, 391.99] },
    ];

    const pads = [];
    for (let i = 0; i < 3; i += 1) {
      const o = actx.createOscillator();
      o.type = "triangle";
      o.frequency.value = progression[0].pad[i];
      const lfo = actx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 4 + i * 0.6;
      const lg = actx.createGain();
      lg.gain.value = 1.6;
      lfo.connect(lg);
      lg.connect(o.detune);
      lfo.start();
      const og = actx.createGain();
      og.gain.value = 0.05;
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;
      o.connect(lp).connect(og).connect(musicGain);
      o.start();
      pads.push(o);
    }

    function playKick(when, vel) {
      const o = actx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(140, when);
      o.frequency.exponentialRampToValueAtTime(45, when + 0.08);
      const og = actx.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(0.34 * vel, when + 0.003);
      og.gain.exponentialRampToValueAtTime(0.001, when + 0.2);
      o.connect(og).connect(musicGain);
      o.start(when);
      o.stop(when + 0.22);
    }

    function playBass(freq, when, vel) {
      const o = actx.createOscillator();
      o.type = "triangle";
      o.frequency.value = freq;
      const og = actx.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(0.22 * vel, when + 0.005);
      og.gain.exponentialRampToValueAtTime(0.002, when + 0.35);
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      o.connect(lp).connect(og).connect(musicGain);
      o.start(when);
      o.stop(when + 0.4);
    }

    function playLead(freq, when, dur, vel) {
      const o = actx.createOscillator();
      o.type = "square";
      o.frequency.value = freq;
      const og = actx.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(0.09 * vel, when + 0.005);
      og.gain.exponentialRampToValueAtTime(0.0008, when + dur);
      const lp = actx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(3200, when);
      lp.frequency.exponentialRampToValueAtTime(900, when + dur);
      o.connect(lp).connect(og).connect(musicGain);
      og.connect(delayNode);
      o.start(when);
      o.stop(when + dur + 0.05);
    }

    let hatBuf = null;
    function playHat(when, vel) {
      const actx2 = getAudioCtx();
      if (!actx2) return;
      if (!hatBuf) {
        const len = Math.floor(actx2.sampleRate * 0.07);
        hatBuf = actx2.createBuffer(1, len, actx2.sampleRate);
        const d = hatBuf.getChannelData(0);
        for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      }
      const src = actx2.createBufferSource();
      src.buffer = hatBuf;
      const hp = actx2.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 6500;
      const og = actx2.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(0.045 * vel, when + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0005, when + 0.05);
      src.connect(hp).connect(og).connect(musicGain);
      src.start(when);
    }

    const STEP_MS = 100;
    const CHORD_STEPS = 16;
    let step = 0;
    let chordIdx = 0;
    function playSnare(when, vel) {
      const actx2 = getAudioCtx();
      if (!actx2) return;
      const len = Math.floor(actx2.sampleRate * 0.12);
      const buf = actx2.createBuffer(1, len, actx2.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      const src = actx2.createBufferSource();
      src.buffer = buf;
      const bp = actx2.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 0.9;
      const og = actx2.createGain();
      og.gain.setValueAtTime(0, when);
      og.gain.linearRampToValueAtTime(0.18 * vel, when + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0005, when + 0.13);
      src.connect(bp).connect(og).connect(musicGain);
      src.start(when);

      const tone = actx2.createOscillator();
      tone.type = "triangle";
      tone.frequency.setValueAtTime(220, when);
      tone.frequency.exponentialRampToValueAtTime(120, when + 0.05);
      const tg = actx2.createGain();
      tg.gain.setValueAtTime(0.1 * vel, when);
      tg.gain.exponentialRampToValueAtTime(0.0005, when + 0.08);
      tone.connect(tg).connect(musicGain);
      tone.start(when); tone.stop(when + 0.09);
    }

    function stepFn() {
      if (!musicStarted) return;
      const actx2 = getAudioCtx();
      if (!actx2) { setTimeout(stepFn, STEP_MS); return; }
      const now = actx2.currentTime;
      const s = step % CHORD_STEPS;
      const chord = progression[chordIdx];
      const onBeat = s % 4 === 0;
      const onEighth = s % 2 === 0;

      if (onBeat) {
        playKick(now, (s === 0 || s === 8) ? 1.1 : 0.7);
      }
      if (s === 4 || s === 12) {
        playSnare(now, 1.0);
      }
      playHat(now, onBeat ? 0.7 : (s % 2 === 1 ? 0.55 : 0.9));

      if (onBeat) {
        const fifth = chord.bass * 1.4983;
        const note = (s === 0 || s === 8) ? chord.bass : (s === 4 ? fifth : chord.bass * 2);
        playBass(note, now, 1.0);
      } else if (s % 2 === 0) {
        playBass(chord.bass * 2, now, 0.55);
      }

      if (onEighth && Math.random() < 0.85) {
        const padIdx = (Math.floor(s / 2)) % chord.pad.length;
        const oct = (Math.random() < 0.35) ? 2 : 1;
        playLead(chord.pad[padIdx] * oct, now, 0.22, 1.05);
      }
      if (!onEighth && Math.random() < 0.45) {
        const padIdx = Math.floor(Math.random() * chord.pad.length);
        const oct = (Math.random() < 0.5) ? 2 : 1;
        playLead(chord.pad[padIdx] * oct, now, 0.13, 0.8);
      }

      if (s === CHORD_STEPS - 1 && Math.random() < 0.6) {
        const next = progression[(chordIdx + 1) % progression.length];
        playLead(next.pad[0] * 2, now + 0.04, 0.15, 0.7);
      }

      step += 1;
      if (step % CHORD_STEPS === 0) {
        chordIdx = (chordIdx + 1) % progression.length;
        const trans = 0.15;
        for (let i = 0; i < pads.length; i += 1) {
          pads[i].frequency.linearRampToValueAtTime(progression[chordIdx].pad[i], now + trans);
        }
      }
      setTimeout(stepFn, STEP_MS);
    }
    setTimeout(stepFn, 300);
  }

  function toggleMusic() {
    if (!musicGain) return;
    const actx = getAudioCtx();
    if (!actx) return;
    musicMuted = !musicMuted;
    musicGain.gain.cancelScheduledValues(actx.currentTime);
    musicGain.gain.linearRampToValueAtTime(musicMuted ? 0 : MUSIC_VOLUME, actx.currentTime + 0.4);
  }

  function setPlayingUi(playing) {
    document.body.classList.toggle("game-playing", playing);
    const mc = document.getElementById("mobile-controls");
    if (mc) mc.setAttribute("aria-hidden", playing ? "false" : "true");
  }

  function startGame() {
    resetGame();
    state = "playing";
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    gameoverEl.classList.remove("visible");
    gameoverEl.classList.add("hidden");
    setPlayingUi(true);
    startMusic();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, W, H);
    const bgHeight = Math.max(0, Math.floor((INITIAL_Y - cameraY) / 10));
    const blend = getThemeBlend(bgHeight);
    drawTheme(blend.a, 1);
    if (blend.t > 0 && blend.b !== blend.a) {
      drawTheme(blend.b, blend.t);
    }
    const forestWeight =
      (blend.a === "forest" ? 1 - blend.t : 0) + (blend.b === "forest" ? blend.t : 0);
    if (forestWeight > 0.05) {
      ctx.save();
      ctx.globalAlpha = forestWeight;
      drawForegroundFoliage();
      drawBackgroundLeaves();
      ctx.restore();
    }
  }

  function drawTheme(name, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    if (name === "forest") drawForestBg();
    else if (name === "sky") drawSkyBg();
    else if (name === "space") drawSpaceBg();
    else if (name === "alien") drawAlienBg();
    ctx.restore();
  }

  function drawForestBg() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#1f3a2f");
    gradient.addColorStop(0.45, "#3c6a52");
    gradient.addColorStop(1, "#7ab07a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    const mistY = H - 130;
    const mistGrad = ctx.createLinearGradient(0, mistY, 0, H);
    mistGrad.addColorStop(0, "rgba(220,235,210,0)");
    mistGrad.addColorStop(1, "rgba(220,235,210,0.25)");
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, mistY, W, 130);

    drawTreeLayer(forestTreesFar, 0.18, 22, 110, 0.55);
    drawTreeLayer(forestTreesNear, 0.42, 32, 150, 0.85);
  }

  function drawSkyBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#5fb1e6");
    g.addColorStop(0.55, "#a8d8f0");
    g.addColorStop(1, "#dfeef8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sunX = W - 70;
    const sunY = 70;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 120);
    sunGlow.addColorStop(0, "rgba(255,240,180,0.7)");
    sunGlow.addColorStop(1, "rgba(255,240,180,0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7d0";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();

    const now = performance.now() * 0.0008;
    for (const c of skyClouds) {
      const px = ((c.x + now * c.speed * 60) % (W + 200) + W + 200) % (W + 200) - 80;
      const py = ((c.y - cameraY * 0.15) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      drawCloud(px, py, c.scale);
    }

    for (const b of skyBirds) {
      const screenY = ((b.y - cameraY * 0.4) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      const flap = Math.sin(now * 6 + b.flap) * 4;
      ctx.strokeStyle = "rgba(40,40,50,0.7)";
      ctx.lineWidth = 1.4 * b.scale;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - 8 * b.scale, screenY + flap);
      ctx.quadraticCurveTo(b.x - 4 * b.scale, screenY - 3, b.x, screenY);
      ctx.quadraticCurveTo(b.x + 4 * b.scale, screenY - 3, b.x + 8 * b.scale, screenY + flap);
      ctx.stroke();
    }
  }

  function drawCloud(x, y, scale) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const r = 22 * scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y - r * 0.3, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x + r * 1.7, y, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 0.6, y + r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(180,200,220,0.35)";
    ctx.beginPath();
    ctx.ellipse(x + r * 0.7, y + r * 0.5, r * 1.3, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpaceBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#040516");
    g.addColorStop(0.6, "#0a0a2a");
    g.addColorStop(1, "#1a0d35");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (const n of spaceNebulae) {
      const screenY = ((n.y - cameraY * 0.1) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      const grad = ctx.createRadialGradient(n.x, screenY, 0, n.x, screenY, n.r);
      grad.addColorStop(0, "hsla(" + n.hue + ", 80%, 60%, 0.32)");
      grad.addColorStop(0.6, "hsla(" + n.hue + ", 80%, 50%, 0.12)");
      grad.addColorStop(1, "hsla(" + n.hue + ", 80%, 40%, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, screenY, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const now = performance.now() * 0.001;
    for (const s of spaceStars) {
      const screenY = ((s.y - cameraY * 0.05) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      const tw = 0.6 + Math.sin(now * 4 * s.speed * 100 + s.tw) * 0.4;
      ctx.fillStyle = "rgba(255,255,255," + tw.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(s.x, screenY, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of spacePlanets) {
      const screenY = ((p.y - cameraY * 0.2) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      const grad = ctx.createRadialGradient(p.x - p.r * 0.3, screenY - p.r * 0.3, p.r * 0.1, p.x, screenY, p.r);
      grad.addColorStop(0, "hsl(" + p.hue + ", 70%, 70%)");
      grad.addColorStop(0.7, "hsl(" + p.hue + ", 60%, 40%)");
      grad.addColorStop(1, "hsl(" + p.hue + ", 50%, 22%)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.r, 0, Math.PI * 2);
      ctx.fill();
      if (p.ring) {
        ctx.strokeStyle = "hsla(" + p.hue + ", 70%, 75%, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, screenY, p.r * 1.8, p.r * 0.45, 0.3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawAlienBg() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a0838");
    g.addColorStop(0.45, "#7a1c5e");
    g.addColorStop(1, "#d96ba0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const moon1Glow = ctx.createRadialGradient(80, 90, 4, 80, 90, 80);
    moon1Glow.addColorStop(0, "rgba(255,200,230,0.5)");
    moon1Glow.addColorStop(1, "rgba(255,200,230,0)");
    ctx.fillStyle = moon1Glow;
    ctx.beginPath();
    ctx.arc(80, 90, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe2f0";
    ctx.beginPath();
    ctx.arc(80, 90, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(160,80,120,0.35)";
    ctx.beginPath();
    ctx.arc(72, 86, 7, 0, Math.PI * 2);
    ctx.arc(88, 95, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff3d8";
    ctx.beginPath();
    ctx.arc(W - 90, 130, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(160,100,80,0.3)";
    ctx.beginPath();
    ctx.arc(W - 95, 128, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 40; i += 1) {
      const sx = (i * 73 + cameraY * 0.02) % W;
      const sy = ((i * 113 - cameraY * 0.05) % (H * 0.6) + H * 0.6) % (H * 0.6);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const r of alienRocks) {
      const screenY = ((r.y - cameraY * 0.25) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      ctx.fillStyle = "hsla(" + r.hue + ", 50%, 25%, 0.85)";
      ctx.beginPath();
      ctx.moveTo(r.x, screenY);
      ctx.lineTo(r.x - r.w * 0.4, screenY - r.h * 0.4);
      ctx.lineTo(r.x - r.w * 0.1, screenY - r.h);
      ctx.lineTo(r.x + r.w * 0.2, screenY - r.h * 0.7);
      ctx.lineTo(r.x + r.w * 0.5, screenY - r.h * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "hsla(" + r.hue + ", 60%, 50%, 0.4)";
      ctx.beginPath();
      ctx.moveTo(r.x, screenY);
      ctx.lineTo(r.x - r.w * 0.1, screenY - r.h);
      ctx.lineTo(r.x + r.w * 0.05, screenY - r.h * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    for (const m of alienMushrooms) {
      const screenY = ((m.y - cameraY * 0.35) % (H * 2) + H * 2) % (H * 2) - H * 0.5;
      ctx.fillStyle = "hsla(" + m.hue + ", 35%, 65%, 0.85)";
      ctx.fillRect(m.x - 3, screenY - m.h, 6, m.h);
      ctx.fillStyle = "hsla(" + m.hue + ", 70%, 55%, 0.95)";
      ctx.beginPath();
      ctx.ellipse(m.x, screenY - m.h, m.capR, m.capR * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(m.x - m.capR * 0.35, screenY - m.h - 1, 1.5, 0, Math.PI * 2);
      ctx.arc(m.x + m.capR * 0.2, screenY - m.h - 2, 1.2, 0, Math.PI * 2);
      ctx.arc(m.x + m.capR * 0.5, screenY - m.h, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawTreeLayer(trees, parallax, trunkW, treeH, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const t of trees) {
      const worldY = t.y;
      const screenY = worldY - cameraY * parallax;
      const yWrapped = ((screenY % (H * 4)) + H * 4) % (H * 4) - H;
      if (yWrapped < -treeH || yWrapped > H + treeH) continue;
      drawPineTree(t.x, yWrapped, trunkW * t.scale, treeH * t.scale, t.hue, t.shade);
    }
    ctx.restore();
  }

  function drawPineTree(x, baseY, trunkW, treeH, hue, shade) {
    const trunkH = treeH * 0.25;
    ctx.fillStyle = "hsl(28, 35%, " + (shade - 5) + "%)";
    ctx.fillRect(x - trunkW * 0.18, baseY - trunkH, trunkW * 0.36, trunkH);

    const layers = 4;
    for (let i = 0; i < layers; i += 1) {
      const t = i / (layers - 1);
      const cy = baseY - trunkH - t * treeH * 0.75;
      const cw = trunkW * (1.6 - t * 0.85);
      const ch = treeH * 0.32;
      ctx.fillStyle = "hsl(" + hue + ", 45%, " + (shade + i * 3) + "%)";
      ctx.beginPath();
      ctx.moveTo(x, cy - ch);
      ctx.lineTo(x + cw, cy);
      ctx.lineTo(x + cw * 0.7, cy);
      ctx.lineTo(x + cw * 0.4, cy + ch * 0.2);
      ctx.lineTo(x - cw * 0.4, cy + ch * 0.2);
      ctx.lineTo(x - cw * 0.7, cy);
      ctx.lineTo(x - cw, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawForegroundFoliage() {
    ctx.save();
    ctx.fillStyle = "rgba(20, 35, 25, 0.55)";
    const leftSway = Math.sin(performance.now() * 0.0008) * 4;
    const rightSway = Math.cos(performance.now() * 0.0008) * 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(40 + leftSway, 40, 30, 90);
    ctx.quadraticCurveTo(60, 140, 0, 160);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.quadraticCurveTo(W - 40 + rightSway, 50, W - 30, 110);
    ctx.quadraticCurveTo(W - 65, 160, W, 180);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawBackgroundLeaves() {
    for (const leaf of backgroundLeaves) {
      const screenY = leaf.y - cameraY * 0.6;
      ctx.save();
      ctx.translate(leaf.x, ((screenY % (H + 40)) + (H + 40)) % (H + 40) - 20);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = "hsla(" + leaf.hue + ", 60%, 55%, 0.55)";
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size, leaf.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlatforms() {
    for (const p of platforms) {
      const screenY = p.y - cameraY;
      if (screenY < -60 || screenY > H + 60) continue;

      if (p.broken) {
        if (p.respawnTimer > 0 && p.respawnTimer < 90) {
          const ghostAlpha = (1 - p.respawnTimer / 90) * 0.55;
          const pulse = 0.5 + Math.sin(p.respawnTimer * 0.5) * 0.5;
          ctx.save();
          ctx.globalAlpha = ghostAlpha * (0.55 + pulse * 0.45);
          ctx.strokeStyle = "#e8c878";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -p.respawnTimer * 0.3;
          roundRect(p.x, screenY, p.w, p.h, 6);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255, 220, 130, " + (ghostAlpha * 0.25).toFixed(2) + ")";
          roundRect(p.x + 2, screenY + 2, p.w - 4, p.h - 4, 5);
          ctx.fill();
          ctx.restore();
        }
        continue;
      }

      const cfg = PLATFORM_TYPES[p.type];
      const sx = p.shake || 0;

      ctx.save();
      ctx.translate(sx, 0);

      if (p.type === "grass") {
        ctx.fillStyle = "#5a3a22";
        roundRect(p.x, screenY + 6, p.w, p.h - 4, 5);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        roundRect(p.x, screenY, p.w, 10, 5);
        ctx.fill();
        ctx.fillStyle = "#6f9a4d";
        for (let i = 4; i < p.w - 4; i += 8) {
          ctx.beginPath();
          ctx.moveTo(p.x + i, screenY + 2);
          ctx.lineTo(p.x + i - 2, screenY - 4);
          ctx.lineTo(p.x + i + 2, screenY - 4);
          ctx.closePath();
          ctx.fill();
        }
      } else if (p.type === "log") {
        ctx.fillStyle = cfg.edge;
        roundRect(p.x, screenY, p.w, p.h, 8);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        roundRect(p.x + 2, screenY + 2, p.w - 4, p.h - 4, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(40,20,10,0.4)";
        ctx.lineWidth = 1;
        for (let i = 12; i < p.w; i += 16) {
          ctx.beginPath();
          ctx.moveTo(p.x + i, screenY + 4);
          ctx.lineTo(p.x + i, screenY + p.h - 4);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(60,30,15,0.6)";
        ctx.beginPath();
        ctx.arc(p.x + 8, screenY + p.h / 2, 3, 0, Math.PI * 2);
        ctx.arc(p.x + p.w - 8, screenY + p.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "fragile") {
        const warn = p.triggered && p.fragileTimer >= FRAGILE_WARNING;
        const flash = warn ? (Math.sin(p.fragileTimer * 0.8) * 0.5 + 0.5) : 0;
        ctx.fillStyle = cfg.edge;
        roundRect(p.x, screenY, p.w, p.h, 6);
        ctx.fill();
        const r = 184 + flash * 40;
        const g = 144 - flash * 60;
        const b = 96 - flash * 60;
        ctx.fillStyle = "rgb(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) + ")";
        roundRect(p.x + 2, screenY + 2, p.w - 4, p.h - 4, 5);
        ctx.fill();
        ctx.strokeStyle = "rgba(80,40,15," + (0.4 + (p.fragileTimer / FRAGILE_LIFETIME) * 0.5) + ")";
        ctx.lineWidth = 1.5;
        const cracks = Math.floor((p.fragileTimer / FRAGILE_LIFETIME) * 4);
        for (let i = 0; i < cracks; i += 1) {
          ctx.beginPath();
          const cx = p.x + (p.w / (cracks + 1)) * (i + 1);
          ctx.moveTo(cx, screenY + 2);
          ctx.lineTo(cx - 3, screenY + p.h / 2);
          ctx.lineTo(cx + 2, screenY + p.h - 2);
          ctx.stroke();
        }
        if (warn) {
          ctx.fillStyle = "rgba(255,80,40," + (flash * 0.4) + ")";
          ctx.fillRect(p.x, screenY, p.w, p.h);
        }
      } else if (p.type === "moving") {
        ctx.fillStyle = cfg.edge;
        roundRect(p.x, screenY, p.w, p.h, 6);
        ctx.fill();
        ctx.fillStyle = cfg.color;
        roundRect(p.x + 2, screenY + 2, p.w - 4, p.h - 4, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2 - 10, screenY + p.h / 2);
        ctx.lineTo(p.x + p.w / 2 - 4, screenY + p.h / 2 - 4);
        ctx.lineTo(p.x + p.w / 2 - 4, screenY + p.h / 2 + 4);
        ctx.closePath();
        ctx.moveTo(p.x + p.w / 2 + 10, screenY + p.h / 2);
        ctx.lineTo(p.x + p.w / 2 + 4, screenY + p.h / 2 - 4);
        ctx.lineTo(p.x + p.w / 2 + 4, screenY + p.h / 2 + 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function drawHay() {
    for (const hay of hays) {
      if (hay.collected || hay.platform.broken) continue;
      const hx = hay.platform.x + hay.platform.w / 2 + hay.offsetX;
      const hy = hay.platform.y + hay.offsetY;
      const screenY = hy - cameraY + Math.sin(hay.bob) * 3;
      if (screenY < -28 || screenY > H + 28) continue;

      const r = hay.r;

      ctx.save();
      ctx.translate(hx, screenY);

      const glowAlpha = 0.22 + Math.sin(hay.bob * 1.6) * 0.08;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.3);
      glow.addColorStop(0, "rgba(255, 220, 140, " + glowAlpha.toFixed(2) + ")");
      glow.addColorStop(1, "rgba(255, 220, 140, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.95, r * 0.95, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      const strawCount = 13;
      const baseAngle = -Math.PI / 2;
      const fan = Math.PI * 0.6;
      const tieY = r * 0.1;

      for (let i = 0; i < 5; i += 1) {
        const t = (i + 0.5) / 5;
        const ax = (t - 0.5) * r * 1.05;
        const len = r * 0.5;
        ctx.strokeStyle = "#9a6d22";
        ctx.lineWidth = 1.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ax, tieY + 1);
        ctx.lineTo(ax + (t - 0.5) * 3, tieY + len);
        ctx.stroke();

        ctx.strokeStyle = "rgba(220, 170, 80, 0.6)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(ax - 0.4, tieY + 2);
        ctx.lineTo(ax - 0.4 + (t - 0.5) * 3, tieY + len - 2);
        ctx.stroke();
      }

      ctx.lineCap = "round";
      for (let i = 0; i < strawCount; i += 1) {
        const t = i / (strawCount - 1);
        const a = baseAngle + (t - 0.5) * fan;
        const len = r * (1.1 + ((i * 13) % 5) * 0.05);
        const ex = Math.cos(a) * len;
        const ey = Math.sin(a) * len;
        const bx = Math.cos(a + Math.PI) * r * 0.18;
        const by = Math.sin(a + Math.PI) * r * 0.18 + tieY * 0.4;
        ctx.strokeStyle = "#8a5e1a";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      for (let i = 0; i < strawCount; i += 1) {
        const t = i / (strawCount - 1);
        const a = baseAngle + (t - 0.5) * fan;
        const len = r * (1.0 + ((i * 37) % 7) * 0.04);
        const ex = Math.cos(a) * len;
        const ey = Math.sin(a) * len;
        const bx = Math.cos(a + Math.PI) * r * 0.16;
        const by = Math.sin(a + Math.PI) * r * 0.16 + tieY * 0.4;
        const shade = i % 3;
        ctx.strokeStyle = shade === 0 ? "#f1c66a" : shade === 1 ? "#dca84a" : "#c89230";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      for (let i = 0; i < strawCount; i += 1) {
        const t = i / (strawCount - 1);
        const a = baseAngle + (t - 0.5) * fan;
        const len = r * (1.0 + ((i * 37) % 7) * 0.04);
        const ex = Math.cos(a) * len;
        const ey = Math.sin(a) * len;
        const seedColor = (i % 2 === 0) ? "#fff1b0" : "#ffe488";
        ctx.fillStyle = seedColor;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 1.4, 2.2, a + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const tieH = r * 0.32;
      ctx.fillStyle = "#3e2810";
      ctx.beginPath();
      ctx.ellipse(0, tieY, r * 0.82, tieH * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6e4a1c";
      ctx.beginPath();
      ctx.ellipse(0, tieY - 1.2, r * 0.78, tieH * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8e6328";
      ctx.beginPath();
      ctx.ellipse(-1, tieY - 2, r * 0.55, tieH * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(80,50,20,0.6)";
      ctx.lineWidth = 0.6;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * (r * 0.3), tieY - tieH * 0.4);
        ctx.lineTo(i * (r * 0.3) + 0.4, tieY + tieH * 0.4);
        ctx.stroke();
      }

      ctx.fillStyle = "#3a2210";
      ctx.beginPath();
      ctx.arc(r * 0.5, tieY, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6a4520";
      ctx.beginPath();
      ctx.arc(r * 0.5, tieY - 0.7, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#5a3a18";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(r * 0.55, tieY);
      ctx.quadraticCurveTo(r * 0.9, tieY + 4, r * 1.0, tieY + 9);
      ctx.moveTo(r * 0.58, tieY + 1);
      ctx.quadraticCurveTo(r * 0.8, tieY + 7, r * 0.85, tieY + 12);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,210,0.55)";
      ctx.lineWidth = 0.8;
      for (let i = 3; i < strawCount - 3; i += 2) {
        const t = i / (strawCount - 1);
        const a = baseAngle + (t - 0.5) * fan;
        const ex = Math.cos(a) * r * 0.95;
        const ey = Math.sin(a) * r * 0.95;
        const bx = Math.cos(a + Math.PI) * r * 0.08;
        const by = Math.sin(a + Math.PI) * r * 0.08;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }

      const sparkleAlpha = 0.35 + Math.sin(hay.bob * 2.4) * 0.35;
      ctx.fillStyle = "rgba(255, 240, 180, " + sparkleAlpha.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(-r * 0.85, -r * 0.55, 1.2, 0, Math.PI * 2);
      ctx.arc(r * 0.85, -r * 0.35, 0.9, 0, Math.PI * 2);
      ctx.arc(r * 0.15, -r * 1.15, 1.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawChinchilla() {
    if (player.shieldTimer === 0 && player.rocketTimer === 0 && player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 5) % 2 === 0) return;
    const screenY = player.y - cameraY;
    const sx = player.squash;
    const sy = 2 - player.squash;
    const wobble = player.earWobble;
    const t = player.blinkTimer;

    ctx.save();
    ctx.translate(player.x, screenY);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(player.facing * sx, sy);

    const tailSway = Math.sin(t * 0.06) * 4;

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

    const blink = Math.sin(t * 0.045) > 0.96;
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

  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawDoubleJumpIndicator() {
    if (state !== "playing") return;
    if (player.grounded) return;
    if (player.jumpsLeft <= 0) return;
    const screenY = player.y - cameraY - 22;
    ctx.save();
    ctx.globalAlpha = 0.65 + Math.sin(player.blinkTimer * 0.25) * 0.15;
    ctx.strokeStyle = "#b0ddff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, screenY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#b0ddff";
    ctx.font = "bold 8px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("2", player.x, screenY);
    ctx.restore();
  }

  function updateApples() {
    for (const apple of apples) {
      if (apple.collected || apple.platform.broken) continue;
      apple.bob += 0.07;
      const ax = apple.platform.x + apple.platform.w / 2 + apple.offsetX;
      const ay = apple.platform.y + apple.offsetY;
      const dx = player.x - ax;
      const dy = player.y - ay;
      if (Math.hypot(dx, dy) < player.w * 0.55 + apple.r) {
        apple.collected = true;
        if (player.lives < 3) {
          player.lives += 1;
          spawnHealBurst(ax, ay);
        } else {
          score += 50;
          spawnSparkles(ax, ay);
        }
        updateHud();
      }
    }
  }

  function spawnHealBurst(x, y) {
    for (let i = 0; i < 18; i += 1) {
      const a = (i / 18) * Math.PI * 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * 2.5,
        vy: Math.sin(a) * 2.5 - 1,
        life: rand(30, 50),
        maxLife: 50,
        color: "rgba(255,120,120,0.9)",
        size: rand(2.5, 4),
      });
    }
    for (let i = 0; i < 5; i += 1) {
      particles.push({
        x: x + rand(-8, 8),
        y: y,
        vx: rand(-0.5, 0.5),
        vy: rand(-3, -1.5),
        life: 55,
        maxLife: 55,
        color: "rgba(255,180,180,0.95)",
        size: 4.5,
      });
    }
  }

  function drawApples() {
    for (const apple of apples) {
      if (apple.collected || apple.platform.broken) continue;
      const ax = apple.platform.x + apple.platform.w / 2 + apple.offsetX;
      const ay = apple.platform.y + apple.offsetY + Math.sin(apple.bob) * 3;
      const screenY = ay - cameraY;
      if (screenY < -25 || screenY > H + 25) continue;

      ctx.save();
      ctx.translate(ax, screenY);

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 15, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a01818";
      ctx.beginPath();
      ctx.ellipse(0, 0, apple.r + 1, apple.r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d83030";
      ctx.beginPath();
      ctx.ellipse(0, 0, apple.r, apple.r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ee5050";
      ctx.beginPath();
      ctx.ellipse(-2, -1, apple.r * 0.7, apple.r * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(-apple.r * 0.35, -apple.r * 0.4, apple.r * 0.22, apple.r * 0.38, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#5a3010";
      ctx.fillRect(-1.2, -apple.r - 2, 2.4, 4);

      ctx.fillStyle = "#5a9a40";
      ctx.beginPath();
      ctx.ellipse(4, -apple.r - 0.5, 4, 2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7ab458";
      ctx.beginPath();
      ctx.ellipse(4, -apple.r - 0.5, 2.5, 1.2, -0.5, 0, Math.PI * 2);
      ctx.fill();

      const sparkAlpha = 0.5 + Math.sin(apple.bob * 2.2) * 0.3;
      ctx.fillStyle = "rgba(255,180,180," + sparkAlpha.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(0, -apple.r - 8, 1.5, 0, Math.PI * 2);
      ctx.arc(apple.r + 4, -apple.r * 0.3, 1.2, 0, Math.PI * 2);
      ctx.arc(-apple.r - 4, apple.r * 0.3, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
  function getSquirrelPos(sq) {
    if (sq.state === "jumping" && sq.targetPlatform) {
      const t = sq.jumpProgress;
      const tx = sq.targetPlatform.x + sq.targetPlatform.w / 2;
      const ty = sq.targetPlatform.y;
      const x = sq.jumpStartX + (tx - sq.jumpStartX) * t;
      const y = sq.jumpStartY + (ty - sq.jumpStartY) * t - Math.sin(t * Math.PI) * 55;
      return { x: x, y: y - 14 };
    }
    return {
      x: sq.platform.x + sq.platform.w / 2 + sq.offsetX,
      y: sq.platform.y - 14,
    };
  }

  function damagePlayer() {
    if (player.invincibleTimer > 0) return;
    if (player.shieldTimer > 0 || player.rocketTimer > 0) {
      player.invincibleTimer = 30;
      spawnShieldHit(player.x, player.y);
      return;
    }
    player.lives -= 1;
    player.invincibleTimer = 90;
    player.vy = -9;
    spawnDamageBurst(player.x, player.y);
    updateHud();
    if (player.lives <= 0) {
      endGame();
    }
  }

  function spawnShieldHit(x, y) {
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      particles.push({
        x: x + Math.cos(a) * 24,
        y: y + Math.sin(a) * 24,
        vx: Math.cos(a) * 3.4,
        vy: Math.sin(a) * 3.4,
        life: 24,
        maxLife: 24,
        color: "rgba(140,210,255,0.95)",
        size: rand(2, 3.5),
      });
    }
  }

  function spawnRocketTrail(x, y) {
    for (let i = 0; i < 2; i += 1) {
      particles.push({
        x: x + rand(-5, 5),
        y: y + rand(-2, 4),
        vx: rand(-0.8, 0.8),
        vy: rand(2.5, 4.5),
        life: rand(14, 24),
        maxLife: 24,
        color: i % 2 === 0 ? "rgba(255,180,60,0.95)" : "rgba(255,90,30,0.9)",
        size: rand(2.5, 4.5),
      });
    }
    if (Math.random() < 0.5) {
      particles.push({
        x: x + rand(-6, 6),
        y: y + rand(2, 8),
        vx: rand(-0.4, 0.4),
        vy: rand(1.2, 2.4),
        life: 28,
        maxLife: 28,
        color: "rgba(80,80,90,0.55)",
        size: rand(3, 5),
      });
    }
  }

  function rescueWithShield() {
    const above = platforms
      .filter((p) => !p.broken && !p.extending && p.y < player.y - 10)
      .sort((a, b) => b.y - a.y);
    let target = null;
    if (above.length > 0) {
      const idx = Math.min(SHIELD_RESCUE_INDEX - 1, above.length - 1);
      target = above[idx];
    }
    if (!target) {
      const any = platforms.filter((p) => !p.broken && !p.extending);
      any.sort((a, b) => a.y - b.y);
      target = any[0];
    }
    if (!target) {
      endGame();
      return;
    }
    player.x = target.x + target.w / 2;
    player.y = target.y - player.h / 2 - 4;
    player.vx = 0;
    player.vy = -4;
    player.grounded = false;
    player.standingOn = null;
    player.jumpsLeft = 2;
    player.invincibleTimer = 60;
    cameraY = Math.min(cameraY, player.y - CAMERA_FOLLOW);
    spawnRespawnBurst(target);
    for (let i = 0; i < 22; i += 1) {
      const a = (i / 22) * Math.PI * 2;
      particles.push({
        x: player.x,
        y: player.y,
        vx: Math.cos(a) * 4,
        vy: Math.sin(a) * 4 - 1,
        life: 36,
        maxLife: 36,
        color: "rgba(150,220,255,0.95)",
        size: rand(2.5, 4),
      });
    }
  }

  function spawnDamageBurst(x, y) {
    for (let i = 0; i < 22; i += 1) {
      particles.push({
        x: x,
        y: y,
        vx: rand(-5, 5),
        vy: rand(-6, 0),
        life: rand(22, 42),
        maxLife: 42,
        color: "rgba(255,80,80,0.85)",
        size: rand(2, 4.5),
      });
    }
  }

  function spawnFurBurst(x, y) {
    for (let i = 0; i < 18; i += 1) {
      particles.push({
        x: x,
        y: y,
        vx: rand(-4, 4),
        vy: rand(-5, 1),
        life: rand(30, 55),
        maxLife: 55,
        color: i % 3 === 0 ? "rgba(200,140,80,0.85)" : "rgba(160,82,45,0.85)",
        size: rand(2, 4),
      });
    }
  }

  function drawHeart(cx, cy, s, filled) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.7);
    ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.9, -s * 1.0, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.9, -s * 1.0, s * 1.3, -s * 0.1, 0, s * 0.7);
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = "#e54d4d";
      ctx.fill();
      ctx.strokeStyle = "#8a2020";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(-s * 0.35, -s * 0.45, s * 0.22, s * 0.32, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(50,20,20,0.55)";
      ctx.fill();
      ctx.strokeStyle = "rgba(200,80,80,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function updateRockets() {
    for (const r of rockets) {
      if (r.collected || r.platform.broken) continue;
      r.bob += 0.08;
      const rx = r.platform.x + r.platform.w / 2 + r.offsetX;
      const ry = r.platform.y + r.offsetY;
      const dx = player.x - rx;
      const dy = player.y - ry;
      if (Math.hypot(dx, dy) < player.w * 0.55 + r.r) {
        r.collected = true;
        player.rocketTimer = ROCKET_DURATION;
        player.invincibleTimer = Math.max(player.invincibleTimer, 30);
        score += 25;
        spawnSparkles(rx, ry);
        playSnort(1.6, 0.25);
        updateHud();
      }
    }
  }

  function updateShields() {
    for (const s of shields) {
      if (s.collected || s.platform.broken) continue;
      s.bob += 0.07;
      const sx = s.platform.x + s.platform.w / 2 + s.offsetX;
      const sy = s.platform.y + s.offsetY;
      const dx = player.x - sx;
      const dy = player.y - sy;
      if (Math.hypot(dx, dy) < player.w * 0.55 + s.r) {
        s.collected = true;
        player.shieldTimer = SHIELD_DURATION;
        score += 25;
        spawnSparkles(sx, sy);
        playSnort(0.85, 0.28);
        updateHud();
      }
    }
  }

  function drawRockets() {
    for (const r of rockets) {
      if (r.collected || r.platform.broken) continue;
      const rx = r.platform.x + r.platform.w / 2 + r.offsetX;
      const baseY = r.platform.y + r.offsetY + Math.sin(r.bob) * 3;
      const screenY = baseY - cameraY;
      if (screenY < -30 || screenY > H + 30) continue;

      ctx.save();
      ctx.translate(rx, screenY);

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 11, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const flameH = 8 + Math.sin(r.bob * 3) * 2;
      ctx.fillStyle = "rgba(255,170,40,0.85)";
      ctx.beginPath();
      ctx.moveTo(-5, 8);
      ctx.quadraticCurveTo(0, 8 + flameH + 4, 5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,240,150,0.95)";
      ctx.beginPath();
      ctx.moveTo(-3, 8);
      ctx.quadraticCurveTo(0, 8 + flameH, 3, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#dfe5ec";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(8, -12, 8, -2);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.lineTo(-8, -2);
      ctx.quadraticCurveTo(-8, -12, 0, -16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6f7a86";
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.fillStyle = "#e63a2c";
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(7, -10, 7, -3);
      ctx.lineTo(-7, -3);
      ctx.quadraticCurveTo(-7, -10, 0, -16);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#79c8ff";
      ctx.beginPath();
      ctx.arc(0, -1, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#27516e";
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(-1, -2, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e63a2c";
      ctx.beginPath();
      ctx.moveTo(-8, 4);
      ctx.lineTo(-13, 9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.moveTo(8, 4);
      ctx.lineTo(13, 9);
      ctx.lineTo(8, 9);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,235,120," + (0.5 + Math.sin(r.bob * 2) * 0.3).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(0, -22, 1.4, 0, Math.PI * 2);
      ctx.arc(10, -10, 1.2, 0, Math.PI * 2);
      ctx.arc(-10, -10, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawShields() {
    for (const s of shields) {
      if (s.collected || s.platform.broken) continue;
      const sx = s.platform.x + s.platform.w / 2 + s.offsetX;
      const baseY = s.platform.y + s.offsetY + Math.sin(s.bob) * 3;
      const screenY = baseY - cameraY;
      if (screenY < -30 || screenY > H + 30) continue;

      ctx.save();
      ctx.translate(sx, screenY);

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, "rgba(160,230,255,0.55)");
      glow.addColorStop(1, "rgba(160,230,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1f4f7a";
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.quadraticCurveTo(13, -10, 13, 0);
      ctx.quadraticCurveTo(13, 11, 0, 16);
      ctx.quadraticCurveTo(-13, 11, -13, 0);
      ctx.quadraticCurveTo(-13, -10, 0, -14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#3a8dc4";
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.quadraticCurveTo(10, -8, 10, 0);
      ctx.quadraticCurveTo(10, 9, 0, 13);
      ctx.quadraticCurveTo(-10, 9, -10, 0);
      ctx.quadraticCurveTo(-10, -8, 0, -11);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#6fc0ec";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(7, -6, 7, 0);
      ctx.quadraticCurveTo(7, 6, 0, 9);
      ctx.quadraticCurveTo(-7, 6, -7, 0);
      ctx.quadraticCurveTo(-7, -6, 0, -8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffd84a";
      ctx.font = "bold 11px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★", 0, 1);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(-4, -6, 2.2, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawShieldAura() {
    if (player.shieldTimer <= 0) return;
    const screenY = player.y - cameraY;
    const t = player.shieldTimer / SHIELD_DURATION;
    const pulse = 1 + Math.sin(player.blinkTimer * 0.18) * 0.05;
    const radius = (player.w * 0.95) * pulse;
    ctx.save();
    ctx.translate(player.x, screenY);

    const grad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, radius);
    grad.addColorStop(0, "rgba(160,220,255,0.05)");
    grad.addColorStop(0.7, "rgba(120,200,255,0.18)");
    grad.addColorStop(1, "rgba(120,200,255,0.45)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    const blink = t < 0.2 ? (0.4 + Math.sin(player.blinkTimer * 0.6) * 0.3) : 0.85;
    ctx.strokeStyle = "rgba(180,230,255," + blink.toFixed(2) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-radius * 0.25, -radius * 0.3, radius * 0.6, -0.9, -0.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRocketAura() {
    if (player.rocketTimer <= 0) return;
    const screenY = player.y - cameraY;
    ctx.save();
    ctx.translate(player.x, screenY + player.h / 2 + 2);
    const flicker = 0.85 + Math.sin(player.blinkTimer * 0.9) * 0.15;
    ctx.fillStyle = "rgba(255,170,60," + flicker.toFixed(2) + ")";
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(0, 22, 7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,235,150,0.95)";
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(0, 14, 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPowerupTimers() {
    const baseX = 20;
    const baseY = H - 56;
    let offset = 0;

    if (player.rocketTimer > 0) {
      drawPowerupIcon(baseX + offset, baseY, player.rocketTimer / ROCKET_DURATION, "rocket");
      offset += 36;
    }
    if (player.shieldTimer > 0) {
      drawPowerupIcon(baseX + offset, baseY, player.shieldTimer / SHIELD_DURATION, "shield");
      offset += 36;
    }
    if (player.laserTimer > 0) {
      drawPowerupIcon(baseX + offset, baseY, player.laserTimer / LASER_DURATION, "laser");
    }
  }

  function drawPowerupIcon(cx, cy, ratio, kind) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = kind === "rocket" ? "#ffb24a" : "#7fd0ff";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();

    if (kind === "rocket") {
      ctx.fillStyle = "#dfe5ec";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(4, -5, 4, 0);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.lineTo(-4, 0);
      ctx.quadraticCurveTo(-4, -5, 0, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e63a2c";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(3.5, -4, 3.5, -1);
      ctx.lineTo(-3.5, -1);
      ctx.quadraticCurveTo(-3.5, -4, 0, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,170,60,0.95)";
      ctx.beginPath();
      ctx.moveTo(-3, 5);
      ctx.quadraticCurveTo(0, 11, 3, 5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "shield") {
      ctx.fillStyle = "#3a8dc4";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(6, -5, 6, 0);
      ctx.quadraticCurveTo(6, 5, 0, 8);
      ctx.quadraticCurveTo(-6, 5, -6, 0);
      ctx.quadraticCurveTo(-6, -5, 0, -7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd84a";
      ctx.font = "bold 9px Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("★", 0, 1);
    } else if (kind === "laser") {
      ctx.fillStyle = "#7a7e94";
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bcc1d4";
      ctx.beginPath();
      ctx.ellipse(0, -1, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff4a5c";
      ctx.beginPath();
      ctx.arc(-3, -0.5, 1.4, 0, Math.PI * 2);
      ctx.arc(3, -0.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,80,110,0.95)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-3, -0.5); ctx.lineTo(-7, -5);
      ctx.moveTo(3, -0.5); ctx.lineTo(7, -5);
      ctx.stroke();
    }

    ctx.restore();
  }
  function updateLasers() {
    for (const l of lasers) {
      if (l.collected || l.platform.broken) continue;
      l.bob += 0.08;
      const lx = l.platform.x + l.platform.w / 2 + l.offsetX;
      const ly = l.platform.y + l.offsetY;
      const dx = player.x - lx;
      const dy = player.y - ly;
      if (Math.hypot(dx, dy) < player.w * 0.55 + l.r) {
        l.collected = true;
        player.laserTimer = LASER_DURATION;
        score += 25;
        spawnSparkles(lx, ly);
        playSnort(2.0, 0.3);
        updateHud();
      }
    }
  }

  function getLaserBeams() {
    if (player.laserTimer <= 0) return [];
    const earY = player.y - 18;
    const dx = 11;
    const ang1 = -Math.PI / 2 - 0.42;
    const ang2 = -Math.PI / 2 + 0.42;
    return [
      { x: player.x - dx, y: earY, dx: Math.cos(ang1), dy: Math.sin(ang1) },
      { x: player.x + dx, y: earY, dx: Math.cos(ang2), dy: Math.sin(ang2) },
    ];
  }

  function pointHitsBeam(b, px, py, rad) {
    const vx = px - b.x;
    const vy = py - b.y;
    const t = vx * b.dx + vy * b.dy;
    if (t < 0 || t > LASER_LENGTH) return false;
    const projX = b.x + b.dx * t;
    const projY = b.y + b.dy * t;
    const ddx = px - projX;
    const ddy = py - projY;
    const r = rad + LASER_HALF_WIDTH;
    return ddx * ddx + ddy * ddy <= r * r;
  }

  function spawnLaserBurst(x, y, color) {
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * rand(2, 5),
        vy: Math.sin(a) * rand(2, 5),
        life: rand(20, 36),
        maxLife: 36,
        color: color || "rgba(255,100,120,0.95)",
        size: rand(2, 4),
      });
    }
    for (let i = 0; i < 6; i += 1) {
      particles.push({
        x: x + rand(-5, 5),
        y: y + rand(-5, 5),
        vx: rand(-1, 1),
        vy: rand(-3, -0.5),
        life: 38,
        maxLife: 38,
        color: "rgba(255,220,180,0.9)",
        size: 3.5,
      });
    }
  }

  function processLaserHits() {
    const beams = getLaserBeams();
    if (beams.length === 0) return;

    for (const saw of saws) {
      if (saw.dead) continue;
      for (const b of beams) {
        if (pointHitsBeam(b, saw.x, saw.y, saw.r)) {
          saw.dead = true;
          spawnLaserBurst(saw.x, saw.y, "rgba(255,140,80,0.95)");
          score += 15;
          updateHud();
          break;
        }
      }
    }

    for (const k of knives) {
      if (k.dead) continue;
      for (const b of beams) {
        if (pointHitsBeam(b, k.x, k.y, 10)) {
          k.dead = true;
          spawnLaserBurst(k.x, k.y, "rgba(255,200,80,0.95)");
          score += 5;
          updateHud();
          break;
        }
      }
    }

    for (const fox of foxes) {
      if (fox.life <= 0) continue;
      for (const b of beams) {
        if (pointHitsBeam(b, fox.x, fox.y - 18, 36)) {
          fox.life = 0;
          spawnLaserBurst(fox.x, fox.y - 18, "rgba(255,120,80,0.95)");
          spawnFurBurst(fox.x, fox.y - 14);
          score += 60;
          updateHud();
          break;
        }
      }
    }

    for (const sq of squirrels) {
      if (sq.dead) continue;
      const p = getSquirrelPos(sq);
      for (const b of beams) {
        if (pointHitsBeam(b, p.x, p.y, 14)) {
          sq.dead = true;
          spawnLaserBurst(p.x, p.y, "rgba(255,180,140,0.95)");
          spawnFurBurst(p.x, p.y);
          score += 5;
          updateHud();
          break;
        }
      }
    }
  }

  function drawLasers() {
    for (const l of lasers) {
      if (l.collected || l.platform.broken) continue;
      const lx = l.platform.x + l.platform.w / 2 + l.offsetX;
      const baseY = l.platform.y + l.offsetY + Math.sin(l.bob) * 3;
      const screenY = baseY - cameraY;
      if (screenY < -30 || screenY > H + 30) continue;

      ctx.save();
      ctx.translate(lx, screenY);

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 12, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      glow.addColorStop(0, "rgba(255,120,150,0.5)");
      glow.addColorStop(1, "rgba(255,120,150,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#5a5e72";
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#8c93aa";
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#cdd4e6";
      ctx.beginPath();
      ctx.ellipse(0, -1.5, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ff4a5c";
      ctx.beginPath();
      ctx.arc(-5, -1, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd0d4";
      ctx.beginPath();
      ctx.arc(-5.7, -1.7, 0.9, 0, Math.PI * 2);
      ctx.arc(4.3, -1.7, 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#2a2e3d";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-12, -2);
      ctx.lineTo(-18, -8);
      ctx.moveTo(12, -2);
      ctx.lineTo(18, -8);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,200,210," + (0.5 + Math.sin(l.bob * 2) * 0.3).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(-18, -8, 1.6, 0, Math.PI * 2);
      ctx.arc(18, -8, 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function drawLaserBeams() {
    if (player.laserTimer <= 0) return;
    const beams = getLaserBeams();
    const t = player.laserTimer / LASER_DURATION;
    const flicker = 0.85 + Math.sin(player.blinkTimer * 0.6) * 0.15;
    const blink = t < 0.18 ? (0.45 + Math.sin(player.blinkTimer * 0.7) * 0.4) : 1.0;
    const alpha = Math.max(0, flicker * blink);

    ctx.save();
    for (const b of beams) {
      const sx = b.x - 0;
      const sy = b.y - cameraY;
      const ex = b.x + b.dx * LASER_LENGTH;
      const ey = b.y + b.dy * LASER_LENGTH - cameraY;

      const grad = ctx.createLinearGradient(sx, sy, ex, ey);
      grad.addColorStop(0, "rgba(255,80,110," + (alpha).toFixed(2) + ")");
      grad.addColorStop(0.3, "rgba(255,140,160," + (alpha).toFixed(2) + ")");
      grad.addColorStop(1, "rgba(255,180,200,0)");

      ctx.lineCap = "round";
      ctx.strokeStyle = grad;
      ctx.lineWidth = 14;
      ctx.globalAlpha = 0.35 * alpha;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.85 * alpha;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255,255,255," + (0.95 * alpha).toFixed(2) + ")";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255," + (0.9 * alpha).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,140,160," + (0.8 * alpha).toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(sx, sy, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  function drawLives() {
    const total = 3;
    const startX = 20;
    const y = H - 24;
    for (let i = 0; i < total; i += 1) {
      drawHeart(startX + i * 30, y, 10, i < player.lives);
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSaws() {
    for (const saw of saws) {
      const sy = saw.y - cameraY;
      if (sy < -saw.r * 2 || sy > H + saw.r * 2) continue;
      ctx.save();
      ctx.translate(saw.x, sy);
      ctx.fillStyle = "rgba(255,40,40,0.45)";
      for (let i = 0; i < 3; i += 1) {
        const tx = -Math.sign(saw.vx) * (i + 1) * 5;
        ctx.globalAlpha = 0.35 - i * 0.1;
        ctx.beginPath();
        ctx.arc(tx, 0, saw.r * (0.95 - i * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.rotate(saw.rotation);
      ctx.fillStyle = "#5a5a5a";
      const teeth = 14;
      ctx.beginPath();
      for (let i = 0; i < teeth; i += 1) {
        const a1 = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
        ctx.lineTo(Math.cos(a1) * (saw.r - 2), Math.sin(a1) * (saw.r - 2));
        ctx.lineTo(Math.cos(a2) * saw.r, Math.sin(a2) * saw.r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#a0a0a0";
      ctx.beginPath();
      ctx.arc(0, 0, saw.r - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cccccc";
      ctx.beginPath();
      ctx.arc(0, 0, saw.r - 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#555";
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFoxes() {
    for (const fox of foxes) {
      const sy = fox.y - cameraY;
      if (sy < -100 || sy > H + 100) continue;

      ctx.save();
      ctx.translate(fox.x, sy);
      ctx.scale(1.7, 1.7);

      const cBodyDark = "#9a4220";
      const cBodyMid = "#c5663a";
      const cBodyLight = "#e88858";
      const cEarInner = "#5a2a18";
      const cSnout = "#f5e0ce";
      const cBelly = "#fce8d8";
      const cIris = "#e8b440";

      ctx.fillStyle = "#1a0e08";
      ctx.beginPath();
      ctx.ellipse(0, 0, 48, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#2c1a0e";
      for (let i = 0; i < 18; i += 1) {
        const a = (i / 18) * Math.PI * 2;
        const r1 = 43 + ((i * 7) % 5);
        const r2 = 50 + ((i * 13) % 6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * (r1 * 0.78));
        ctx.lineTo(Math.cos(a + 0.08) * r2, Math.sin(a + 0.08) * (r2 * 0.78));
        ctx.lineTo(Math.cos(a + 0.16) * r1, Math.sin(a + 0.16) * (r1 * 0.78));
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(60,35,18,0.55)";
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, 0, 44 + i * 3, 34 + i * 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#3a261c";
      ctx.beginPath();
      ctx.ellipse(0, 0, 42, 33, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1f120a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 31, 0, 0, Math.PI * 2);
      ctx.fill();

      const holeGrad = ctx.createRadialGradient(0, 2, 3, 0, 0, 38);
      holeGrad.addColorStop(0, "#000000");
      holeGrad.addColorStop(0.6, "#0a0604");
      holeGrad.addColorStop(1, "#1a0e08");
      ctx.fillStyle = holeGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 38, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(50,30,18,0.55)";
      ctx.beginPath();
      ctx.ellipse(0, -4, 36, 9, 0, Math.PI, 0);
      ctx.fill();

      ctx.strokeStyle = "#2a1810";
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-38, -8); ctx.lineTo(-48, -17);
      ctx.moveTo(-34, -20); ctx.lineTo(-42, -30);
      ctx.moveTo(38, -8); ctx.lineTo(48, -17);
      ctx.moveTo(34, -20); ctx.lineTo(42, -30);
      ctx.moveTo(-32, 24); ctx.lineTo(-44, 31);
      ctx.moveTo(32, 24); ctx.lineTo(44, 31);
      ctx.moveTo(2, -32); ctx.lineTo(4, -42);
      ctx.moveTo(-12, 30); ctx.lineTo(-14, 38);
      ctx.moveTo(14, 30); ctx.lineTo(18, 36);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.strokeStyle = "rgba(35,22,12,0.6)";
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r1 = 30 + ((i * 11) % 5);
        const r2 = 40;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * (r1 * 0.78));
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * (r2 * 0.78));
        ctx.stroke();
      }

      ctx.fillStyle = "#2a4818";
      for (let i = -2; i <= 2; i += 1) {
        const x = i * 10 + ((i * 17) % 3);
        const y = -32 - ((i + 2) % 2) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#4a7028";
      for (let i = -2; i <= 2; i += 1) {
        const x = i * 10 + ((i * 13) % 3) - 1;
        const y = -33 - ((i + 1) % 2) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#7ca84a";
      for (let i = -2; i <= 2; i += 1) {
        const x = i * 10 + ((i * 7) % 3) + 1;
        const y = -33 - ((i + 3) % 2) * 2;
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#3a6428";
      for (let i = -2; i <= 2; i += 1) {
        const x = i * 11;
        ctx.beginPath();
        ctx.arc(x - 5, 31, 2.4, 0, Math.PI * 2);
        ctx.arc(x + 5, 32, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#3a2810";
      ctx.lineWidth = 1.0;
      ctx.lineCap = "round";
      const roots = [
        [-20, 9, 0.6],
        [-8, 14, 0.4],
        [5, 11, 0.8],
        [18, 7, 0.5],
      ];
      for (const r of roots) {
        ctx.beginPath();
        ctx.moveTo(r[0], -28);
        ctx.quadraticCurveTo(r[0] + r[2], -28 + r[1] * 0.5, r[0] + r[2] * 2, -28 + r[1]);
        ctx.stroke();
      }
      ctx.fillStyle = "#4a3818";
      for (const r of roots) {
        ctx.beginPath();
        ctx.arc(r[0] + r[2] * 2, -28 + r[1], 1.0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineCap = "butt";

      ctx.fillStyle = "#6a5040";
      ctx.beginPath();
      ctx.ellipse(-10, 26, 3.5, 2, 0.2, 0, Math.PI * 2);
      ctx.ellipse(12, 25, 2.5, 1.5, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#9a7860";
      ctx.beginPath();
      ctx.ellipse(-11, 25.5, 1.6, 0.9, 0.2, 0, Math.PI * 2);
      ctx.fill();

      const facing = fox.side === "left" ? 1 : -1;
      ctx.scale(facing, 1);

      ctx.fillStyle = cBodyMid;
      ctx.beginPath();
      ctx.ellipse(-22, 11, 11, 7, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff8f0";
      ctx.beginPath();
      ctx.ellipse(-28, 9, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cBodyDark;
      ctx.beginPath();
      ctx.ellipse(-3, 10, 19, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cBodyMid;
      ctx.beginPath();
      ctx.ellipse(-2, 8, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cBodyDark;
      for (let i = 0; i < 5; i += 1) {
        const a = -0.5 + i * 0.35;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 15 - 2, Math.sin(a) * 11 + 5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = cBelly;
      ctx.beginPath();
      ctx.ellipse(-2, 14, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cBodyDark;
      ctx.beginPath();
      ctx.ellipse(3, 19, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(-7, 20, 4.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(1, 20); ctx.lineTo(0, 22.5);
      ctx.moveTo(3, 20); ctx.lineTo(3, 22.7);
      ctx.moveTo(5, 20); ctx.lineTo(6, 22.5);
      ctx.moveTo(-9, 21); ctx.lineTo(-10, 23.3);
      ctx.moveTo(-7, 21); ctx.lineTo(-7, 23.5);
      ctx.moveTo(-5, 21); ctx.lineTo(-4, 23.3);
      ctx.stroke();

      ctx.fillStyle = cBodyLight;
      ctx.beginPath();
      ctx.ellipse(5, 4, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cBelly;
      ctx.beginPath();
      ctx.ellipse(7, 6, 7, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cBodyMid;
      ctx.beginPath();
      ctx.ellipse(10, -3, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cBodyDark;
      ctx.beginPath();
      ctx.ellipse(10, -9, 11, 5, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = cBodyLight;
      ctx.beginPath();
      ctx.ellipse(11, -1, 11, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = cBodyDark;
      ctx.beginPath();
      ctx.moveTo(2, -9); ctx.lineTo(-2, -22); ctx.lineTo(9, -11); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cEarInner;
      ctx.beginPath();
      ctx.moveTo(3, -11); ctx.lineTo(0, -19); ctx.lineTo(7, -12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cBodyMid;
      ctx.beginPath();
      ctx.moveTo(13, -9); ctx.lineTo(18, -24); ctx.lineTo(9, -11); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cBodyLight;
      ctx.beginPath();
      ctx.moveTo(14, -10); ctx.lineTo(17, -22); ctx.lineTo(11, -11); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cEarInner;
      ctx.beginPath();
      ctx.moveTo(15, -11); ctx.lineTo(16, -20); ctx.lineTo(12, -12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(17, -22, 1.3, 0, Math.PI * 2);
      ctx.arc(-2, -21, 1.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(80,40,20,0.4)";
      ctx.beginPath();
      ctx.ellipse(18, 6, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cSnout;
      ctx.beginPath();
      ctx.ellipse(19, 3, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cBodyMid;
      ctx.beginPath();
      ctx.ellipse(15, -1, 9, 3.5, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.ellipse(27, 1, 2.6, 2, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(26.2, 0.2, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(20,10,5,0.7)";
      ctx.beginPath();
      ctx.ellipse(15, -2.8, 3.6, 2.8, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -2.8, 3.4, 2.6, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(15, -3, 3.2, 2.4, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -3, 3.0, 2.3, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#7a4a14";
      ctx.beginPath();
      ctx.ellipse(15, -2.6, 2.6, 2.2, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -2.6, 2.4, 2.1, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#e8b440";
      ctx.beginPath();
      ctx.ellipse(15, -2.4, 2.0, 1.8, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -2.4, 1.9, 1.7, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a0a0a";
      ctx.beginPath();
      ctx.ellipse(15, -2.4, 0.75, 2.0, -0.12, 0, Math.PI * 2);
      ctx.ellipse(8, -2.4, 0.7, 1.9, 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(16.0, -3.6, 0.7, 0, Math.PI * 2);
      ctx.arc(9.0, -3.6, 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(40,20,10,0.8)";
      ctx.lineWidth = 1.0;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(11.4, -4.8); ctx.lineTo(18.6, -4.6);
      ctx.moveTo(4.6, -4.6); ctx.lineTo(11.0, -4.7);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.strokeStyle = cBodyDark;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(11, -7); ctx.lineTo(18, -5.5);
      ctx.moveTo(4, -6.5); ctx.lineTo(11, -6);
      ctx.stroke();
      ctx.lineCap = "butt";

      ctx.strokeStyle = "#0a0604";
      ctx.lineWidth = 1.1;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(22.5, 5.2);
      ctx.quadraticCurveTo(18.5, 7.4, 13, 6.2);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(20.5, 6.0); ctx.lineTo(20.9, 7.6); ctx.lineTo(21.3, 6.0); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(20.5, 6.0); ctx.lineTo(20.9, 7.6); ctx.lineTo(21.3, 6.0);
      ctx.stroke();

      ctx.strokeStyle = "rgba(40,20,10,0.7)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(22, 2); ctx.lineTo(32, 0);
      ctx.moveTo(22, 3.2); ctx.lineTo(32, 3);
      ctx.moveTo(22, 4.4); ctx.lineTo(32, 6);
      ctx.moveTo(15, 5); ctx.lineTo(11, 7);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = cBelly;
      ctx.beginPath();
      ctx.arc(4, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(2, 7, 2, 0, Math.PI * 2);
      ctx.arc(1, 3, 1.6, 0, Math.PI * 2);
      ctx.fill();

      if (fox.throwTimer < 30 && fox.life > 60) {
        ctx.save();
        ctx.translate(22, 9);
        ctx.rotate(-0.18);
        ctx.fillStyle = "#2a1808";
        ctx.fillRect(-2, -3.2, 12, 6.4);
        ctx.fillStyle = "#6a4828";
        ctx.fillRect(-2, -3.2, 12, 2.2);
        ctx.fillStyle = "#a87a4a";
        ctx.fillRect(-2, -3.2, 12, 0.9);
        ctx.fillStyle = "#2a1808";
        ctx.beginPath();
        ctx.arc(-2, 0, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#7a5028";
        ctx.beginPath();
        ctx.arc(-2, -0.6, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d8a428";
        ctx.beginPath();
        ctx.arc(2, 0, 0.8, 0, Math.PI * 2);
        ctx.arc(7, 0, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#6a5028";
        ctx.fillRect(10, -5.2, 2.6, 10.4);
        ctx.fillStyle = "#b8a060";
        ctx.fillRect(10, -5.2, 1.4, 10.4);
        ctx.fillStyle = "#aab0b8";
        ctx.beginPath();
        ctx.moveTo(12.6, -4.4); ctx.lineTo(30, 0); ctx.lineTo(12.6, 4.4); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#dde2e8";
        ctx.beginPath();
        ctx.moveTo(12.6, -3.0); ctx.lineTo(26, 0); ctx.lineTo(12.6, 3.0); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(70,75,85,0.7)";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(13.5, 0); ctx.lineTo(27, 0);
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(12.6, -1.6); ctx.lineTo(23, -0.2); ctx.lineTo(12.6, -0.4); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  }

  function drawSquirrels() {
    for (const sq of squirrels) {
      let x, y;
      const jumping = sq.state === "jumping";
      if (jumping) {
        const t = sq.jumpProgress;
        const tx = sq.targetPlatform.x + sq.targetPlatform.w / 2;
        const ty = sq.targetPlatform.y;
        x = sq.jumpStartX + (tx - sq.jumpStartX) * t;
        const arcH = 55;
        y = sq.jumpStartY + (ty - sq.jumpStartY) * t - Math.sin(t * Math.PI) * arcH;
      } else {
        x = sq.platform.x + sq.platform.w / 2 + sq.offsetX;
        y = sq.platform.y;
      }
      const screenY = y - cameraY;
      if (screenY < -40 || screenY > H + 40) continue;

      ctx.save();
      ctx.translate(x, screenY - 4);
      ctx.scale(sq.facing * 1.5, 1.5);

      if (jumping) {
        const ease = Math.sin(sq.jumpProgress * Math.PI);
        ctx.rotate(-ease * 0.8);
      }

      const bob = !jumping ? Math.sin(sq.animTimer) * 0.8 : 0;

      ctx.fillStyle = "#7a3a0a";
      ctx.beginPath();
      ctx.ellipse(-8, -10 + bob, 8, 11, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a0522d";
      ctx.beginPath();
      ctx.ellipse(-8, -12 + bob, 6, 9, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c47833";
      for (let i = 0; i < 6; i += 1) {
        const a = -1.1 + i * 0.32;
        ctx.beginPath();
        ctx.arc(-8 + Math.cos(a + 1.4) * 7, -12 + bob + Math.sin(a + 1.4) * 9, 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#e0a060";
      ctx.beginPath();
      ctx.ellipse(-13, -18 + bob, 3, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyH = jumping ? 8 : 7;
      ctx.fillStyle = "#6a300a";
      ctx.beginPath();
      ctx.ellipse(0, -3 + bob, 5, bodyH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a0522d";
      ctx.beginPath();
      ctx.ellipse(0, -4 + bob, 4.5, bodyH - 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c898";
      ctx.beginPath();
      ctx.ellipse(0, -2 + bob, 3, bodyH - 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6a300a";
      ctx.beginPath();
      ctx.ellipse(2, 2 + bob, 2.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!jumping) {
        ctx.fillStyle = "#5a2a08";
        ctx.beginPath();
        ctx.arc(2.5, -5 + bob, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#d4a070";
        ctx.beginPath();
        ctx.ellipse(3.5, -6.5 + bob, 1.6, 2.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5a3010";
        ctx.beginPath();
        ctx.arc(3.5, -7.6 + bob, 1.6, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#3a2010";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(3.5, -8.6 + bob);
        ctx.lineTo(3.5, -9.7 + bob);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#5a2a08";
        ctx.beginPath();
        ctx.ellipse(4, -2 + bob, 2.5, 1.6, 0.3, 0, Math.PI * 2);
        ctx.ellipse(4, -5 + bob, 2.5, 1.6, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#a0522d";
      ctx.beginPath();
      ctx.arc(2, -10 + bob, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#c47833";
      ctx.beginPath();
      ctx.arc(4, -9 + bob, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6a300a";
      ctx.beginPath();
      ctx.moveTo(0, -13 + bob);
      ctx.lineTo(-1, -17 + bob);
      ctx.lineTo(2.5, -13 + bob);
      ctx.closePath();
      ctx.moveTo(3, -13 + bob);
      ctx.lineTo(5, -17 + bob);
      ctx.lineTo(5, -13 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e8c898";
      ctx.beginPath();
      ctx.arc(-1, -17 + bob, 0.7, 0, Math.PI * 2);
      ctx.arc(5, -17 + bob, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(4, -10 + bob, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(4.4, -10.4 + bob, 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#d4a070";
      ctx.beginPath();
      ctx.ellipse(5.6, -9 + bob, 2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a1a0a";
      ctx.beginPath();
      ctx.arc(6.9, -9 + bob, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(60,40,20,0.6)";
      ctx.lineWidth = 0.4;
      ctx.beginPath();
      ctx.moveTo(6.2, -8.5 + bob); ctx.lineTo(10, -9.6 + bob);
      ctx.moveTo(6.2, -8 + bob); ctx.lineTo(10, -8 + bob);
      ctx.stroke();

      ctx.restore();
    }
  }
  function drawKnives() {
    for (const k of knives) {
      const sy = k.y - cameraY;
      if (sy < -25 || sy > H + 25) continue;
      ctx.save();
      ctx.translate(k.x, sy);
      ctx.rotate(k.rotation);

      ctx.fillStyle = "rgba(200,200,200,0.32)";
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-6, -2.4);
      ctx.lineTo(-6, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(220,220,220,0.22)";
      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(-12, -1.4);
      ctx.lineTo(-12, 1.4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#2a1808";
      ctx.beginPath();
      ctx.arc(-12, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a5028";
      ctx.beginPath();
      ctx.arc(-12, -0.5, 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#2a1808";
      ctx.fillRect(-11, -2.6, 10, 5.2);
      ctx.fillStyle = "#6a4828";
      ctx.fillRect(-11, -2.6, 10, 1.8);
      ctx.fillStyle = "#a87a4a";
      ctx.fillRect(-11, -2.6, 10, 0.8);

      ctx.fillStyle = "#d8a428";
      ctx.beginPath();
      ctx.arc(-7, 0, 0.7, 0, Math.PI * 2);
      ctx.arc(-3, 0, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#6a5028";
      ctx.fillRect(-1, -4.2, 2.2, 8.4);
      ctx.fillStyle = "#b8a060";
      ctx.fillRect(-1, -4.2, 1.2, 8.4);

      ctx.fillStyle = "#aab0b8";
      ctx.beginPath();
      ctx.moveTo(1.2, -3.6); ctx.lineTo(18, 0); ctx.lineTo(1.2, 3.6); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#dde2e8";
      ctx.beginPath();
      ctx.moveTo(1.2, -2.4); ctx.lineTo(15, 0); ctx.lineTo(1.2, 2.4); ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(70,75,85,0.7)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(2, 0); ctx.lineTo(16, 0);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(1.2, -1.4); ctx.lineTo(13, -0.2); ctx.lineTo(1.2, -0.4); ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  function render() {    drawBackground();
    drawFoxes();
    drawPlatforms();
    drawSquirrels();
    drawHay();
    drawApples();
    drawRockets();
    drawShields();
    drawLasers();
    drawSaws();
    drawKnives();
    drawParticles();
    drawRocketAura();
    drawChinchilla();
    drawShieldAura();
    drawLaserBeams();
    drawDoubleJumpIndicator();
    drawLives();
    drawPowerupTimers();
  }

  function update() {
    updateBackgroundLeaves();
    if (state !== "playing") return;
    updatePlatforms();
    updatePlayer();
    updateHays();
    updateApples();
    updateRockets();
    updateShields();
    updateLasers();
    updateSaws();
    updateFoxes();
    updateKnives();
    updateSquirrels();
    updateParticles();
    ensurePlatforms();
    ensureHazards();
    updateHud();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (e) => {
    keys.add(e.key);
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (state === "menu") startGame();
      else if (state === "over") startGame();
      else jump();
    }
    if (e.key === "m" || e.key === "M") {
      toggleMusic();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key);
  });

  function useMobileControls() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }

  function bindHold(btn, key) {
    if (!btn) return;
    const down = (e) => {
      e.preventDefault();
      btn.classList.add("pressed");
      keys.add(key);
    };
    const up = (e) => {
      e.preventDefault();
      btn.classList.remove("pressed");
      keys.delete(key);
    };
    btn.addEventListener("touchstart", down, { passive: false });
    btn.addEventListener("touchend", up, { passive: false });
    btn.addEventListener("touchcancel", up, { passive: false });
    btn.addEventListener("mousedown", down);
    btn.addEventListener("mouseup", up);
    btn.addEventListener("mouseleave", up);
  }

  const ctrlJump = document.getElementById("ctrl-jump");
  const ctrlLeft = document.getElementById("ctrl-left");
  const ctrlRight = document.getElementById("ctrl-right");

  bindHold(ctrlLeft, "ArrowLeft");
  bindHold(ctrlRight, "ArrowRight");

  if (ctrlJump) {
    const doJump = (e) => {
      e.preventDefault();
      if (state === "playing") jump();
    };
    ctrlJump.addEventListener("touchstart", doJump, { passive: false });
    ctrlJump.addEventListener("mousedown", doJump);
  }

  canvas.addEventListener("mousedown", () => {
    if (state === "menu") startGame();
    else if (state === "over") startGame();
    else if (!useMobileControls()) jump();
  });

  canvas.addEventListener("touchstart", (e) => {
    if (state === "menu" || state === "over") {
      e.preventDefault();
      startGame();
      return;
    }
    if (useMobileControls()) e.preventDefault();
  }, { passive: false });

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("restart-btn").addEventListener("click", startGame);

  resetGame();
  loop();

  function unlockAudio() { startMusic(); }
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
})();