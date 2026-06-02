(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const previewCanvas = document.getElementById("chinchilla-preview");
  const previewCtx = previewCanvas ? previewCanvas.getContext("2d") : null;
  let previewTimer = 0;

  const overlay = document.getElementById("overlay");
  const gameoverEl = document.getElementById("gameover");
  const scoreEl = document.getElementById("score");
  const heightEl = document.getElementById("height");
  const bestEl = document.getElementById("best");
  const finalScoreEl = document.getElementById("final-score");
  const finalHeightEl = document.getElementById("final-height");
  const gameoverTitleEl = document.getElementById("gameover-title");
  const finalModeLineEl = document.getElementById("final-mode-line");
  const levelNumEl = document.getElementById("level-num");
  const levelGoalEl = document.getElementById("level-goal");
  const hudLevelItem = document.getElementById("hud-level-item");
  const hudGoalItem = document.getElementById("hud-goal-item");

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

  const SKIN_KEY = "chinchilla-skin";
  const HAT_KEY = "chinchilla-hat";

  const CHIN_SKINS = {
    standard: {
      tailDark: "#7d756c", tailMid: "#9c948c", tailTuft: "#c0b6ad", tailTip: "#e4dacf", tailShadow: "rgba(80,70,60,0.35)",
      bodyDark: "#857d75", bodyTuft: "#a89e96", bodyMid: "#b8aea6", belly: "#efe8e2",
      legOuter: "#a89e96", legInner: "#c0b6ad",
      earL1: "#857d75", earL2: "#a89e96", earL3: "#c69088",
      earR1: "#a89e96", earR2: "#c0b6ad", earR3: "#f0bcb2", earRInner: "rgba(160,90,80,0.55)",
      headDark: "#9a928a", headMid: "#b8aea6", headLight: "#cfc6be",
      cheekOuter: "#a89e96", cheekInner: "#c0b6ad", muzzle: "#ece4dc",
      whisker: "rgba(40,35,30,0.8)", blush: "rgba(230,150,150,0.5)",
    },
    white: {
      tailDark: "#d0ccc8", tailMid: "#e2deda", tailTuft: "#eeeae6", tailTip: "#faf8f6", tailShadow: "rgba(120,110,100,0.22)",
      bodyDark: "#d8d4d0", bodyTuft: "#e6e2de", bodyMid: "#f0ece8", belly: "#faf8f6",
      legOuter: "#e0dcd8", legInner: "#ece8e4",
      earL1: "#d4d0cc", earL2: "#e4e0dc", earL3: "#f0d8d4",
      earR1: "#e0dcd8", earR2: "#ece8e4", earR3: "#f8e8e4", earRInner: "rgba(200,140,130,0.45)",
      headDark: "#dcd8d4", headMid: "#eae6e2", headLight: "#f4f0ec",
      cheekOuter: "#e0dcd8", cheekInner: "#ece8e4", muzzle: "#f8f4f0",
      whisker: "rgba(80,70,60,0.55)", blush: "rgba(240,170,170,0.45)",
    },
    black: {
      tailDark: "#181614", tailMid: "#262422", tailTuft: "#343230", tailTip: "#444240", tailShadow: "rgba(0,0,0,0.45)",
      bodyDark: "#1e1c1a", bodyTuft: "#2c2a28", bodyMid: "#3a3836", belly: "#4a4846",
      legOuter: "#2c2a28", legInner: "#3a3836",
      earL1: "#222018", earL2: "#323030", earL3: "#5a4040",
      earR1: "#2a2826", earR2: "#383634", earR3: "#6a5048", earRInner: "rgba(90,50,45,0.55)",
      headDark: "#242220", headMid: "#323030", headLight: "#424038",
      cheekOuter: "#2c2a28", cheekInner: "#3a3836", muzzle: "#504e4c",
      whisker: "rgba(200,190,180,0.35)", blush: "rgba(180,90,90,0.35)",
    },
  };

  const CHIN_HATS = { none: "none", gentleman: "gentleman", bear: "bear" };

  function loadCosmetic(key, allowed, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v && allowed[v]) return v;
    } catch (e) {}
    return fallback;
  }

  let selectedSkin = loadCosmetic(SKIN_KEY, CHIN_SKINS, "standard");
  let selectedHat = loadCosmetic(HAT_KEY, CHIN_HATS, "none");

  function getSkinPalette() {
    return CHIN_SKINS[selectedSkin] || CHIN_SKINS.standard;
  }

  function setSelectedSkin(id) {
    if (!CHIN_SKINS[id]) return;
    selectedSkin = id;
    try { localStorage.setItem(SKIN_KEY, id); } catch (e) {}
    updateCosmeticUi();
  }

  function setSelectedHat(id) {
    if (!CHIN_HATS[id]) return;
    selectedHat = id;
    try { localStorage.setItem(HAT_KEY, id); } catch (e) {}
    updateCosmeticUi();
  }

  function updateCosmeticUi() {
    document.querySelectorAll("#skin-options .cosmetic-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.skin === selectedSkin);
    });
    document.querySelectorAll("#hat-options .cosmetic-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.hat === selectedHat);
    });
    drawCosmeticPreview();
  }

  function previewLoop() {
    if (overlay && !overlay.classList.contains("hidden")) {
      previewTimer += 1;
      drawCosmeticPreview();
    }
    requestAnimationFrame(previewLoop);
  }
  if (previewCtx) requestAnimationFrame(previewLoop);

  function drawCosmeticPreview() {
    if (!previewCtx) return;
    const c = previewCtx;
    const pw = previewCanvas.width;
    const ph = previewCanvas.height;
    c.clearRect(0, 0, pw, ph);

    const grad = c.createRadialGradient(pw / 2, ph * 0.4, 8, pw / 2, ph * 0.4, pw * 0.7);
    grad.addColorStop(0, "rgba(255, 220, 150, 0.18)");
    grad.addColorStop(1, "rgba(255, 220, 150, 0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, pw, ph);

    const pal = getSkinPalette();
    const t = previewTimer;
    const wobble = Math.sin(t * 0.04) * 0.15;
    const scale = Math.min(pw / 80, ph / 80);

    c.save();
    c.translate(pw / 2, ph * 0.62);
    c.scale(scale, scale);

    c.fillStyle = "rgba(0,0,0,0.22)";
    c.beginPath();
    c.ellipse(0, 22, 22, 5, 0, 0, Math.PI * 2);
    c.fill();

    drawChinchillaBody(c, pal, t, wobble, selectedHat);

    c.restore();
  }

  function bindCosmeticButtons() {
    document.querySelectorAll("#skin-options .cosmetic-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setSelectedSkin(btn.dataset.skin); });
    });
    document.querySelectorAll("#hat-options .cosmetic-btn").forEach(function (btn) {
      btn.addEventListener("click", function () { setSelectedHat(btn.dataset.hat); });
    });
    updateCosmeticUi();
  }

  function drawGentlemanHat(c) {
    c = c || ctx;
    c.save();
    c.fillStyle = "#141414";
    c.beginPath();
    c.ellipse(0, -17, 19, 4.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#0a0a0a";
    c.fillRect(-10, -36, 20, 20);
    c.fillStyle = "#161616";
    c.fillRect(-8, -34, 16, 17);
    c.fillStyle = "#7a1515";
    c.fillRect(-9, -22, 18, 3.2);
    c.fillStyle = "#a82020";
    c.fillRect(-8, -21.5, 16, 1.2);
    c.fillStyle = "rgba(255,255,255,0.12)";
    c.fillRect(-7, -33, 2.5, 14);
    c.restore();
  }

  function drawBearHat(c) {
    c = c || ctx;
    c.save();

    c.fillStyle = "rgba(0,0,0,0.18)";
    c.beginPath();
    c.ellipse(0, -10.5, 13, 2.4, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#5a3a1c";
    c.beginPath();
    c.ellipse(0, -14, 12, 7, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#7a5028";
    c.beginPath();
    c.ellipse(-2, -15, 7, 4, -0.25, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#3a2210";
    c.fillRect(-12, -12, 24, 2.2);
    c.fillStyle = "#8a6038";
    c.fillRect(-12, -12, 24, 0.8);

    c.fillStyle = "#3a2210";
    c.beginPath();
    c.arc(-7, -17.5, 3.6, 0, Math.PI * 2);
    c.arc(7, -17.5, 3.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#5a3a1c";
    c.beginPath();
    c.arc(-7, -17.5, 2.6, 0, Math.PI * 2);
    c.arc(7, -17.5, 2.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d8a884";
    c.beginPath();
    c.arc(-7, -17.2, 1.3, 0, Math.PI * 2);
    c.arc(7, -17.2, 1.3, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#7a5028";
    c.beginPath();
    c.arc(0, -18.5, 1.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#d8a884";
    c.beginPath();
    c.arc(0.4, -19, 0.9, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = "#3a2210";
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(-3, -11.5);
    c.lineTo(3, -11.5);
    c.stroke();

    c.restore();
  }

  function drawChinchillaBody(c, pal, t, wobble, hat) {
    const tailSway = Math.sin(t * 0.06) * 4;

    c.fillStyle = pal.tailDark;
    c.beginPath();
    c.ellipse(-19, -2 + tailSway, 14, 12, -0.4, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.tailMid;
    c.beginPath();
    c.ellipse(-21, -5 + tailSway, 11, 10, -0.5, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.tailTuft;
    for (let i = 0; i < 9; i += 1) {
      const a = -1.5 + i * 0.32;
      const rx = -21 + Math.cos(a) * 12;
      const ry = -5 + tailSway + Math.sin(a) * 11;
      c.beginPath();
      c.arc(rx, ry, 4.8, 0, Math.PI * 2);
      c.fill();
    }

    c.fillStyle = pal.tailTip;
    c.beginPath();
    c.ellipse(-28, -9 + tailSway, 6, 5, -0.3, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.tailShadow;
    c.beginPath();
    c.ellipse(-21, -7 + tailSway, 9, 4, -0.5, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.bodyDark;
    c.beginPath();
    c.ellipse(0, 12, 19, 15, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.bodyTuft;
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI * (1 + i / 8);
      const rx = Math.cos(a) * 18;
      const ry = 9 + Math.sin(a) * 14;
      c.beginPath();
      c.arc(rx, ry, 4, 0, Math.PI * 2);
      c.fill();
    }

    c.fillStyle = pal.bodyMid;
    c.beginPath();
    c.ellipse(0, 9, 17, 14, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.belly;
    c.beginPath();
    c.ellipse(0, 13, 12, 10, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "#4a3024";
    c.beginPath();
    c.ellipse(-5, 21, 4, 2.8, 0, 0, Math.PI * 2);
    c.ellipse(5, 21, 4, 2.8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.2)";
    c.beginPath();
    c.arc(-5, 20, 1, 0, Math.PI * 2);
    c.arc(5, 20, 1, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.legOuter;
    c.beginPath();
    c.ellipse(-4.5, 11, 3, 4.8, 0.2, 0, Math.PI * 2);
    c.ellipse(4.5, 11, 3, 4.8, -0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.legInner;
    c.beginPath();
    c.ellipse(-4.5, 9, 2, 3, 0.2, 0, Math.PI * 2);
    c.ellipse(4.5, 9, 2, 3, -0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#4a3024";
    c.beginPath();
    c.arc(-4.5, 15, 2.2, 0, Math.PI * 2);
    c.arc(4.5, 15, 2.2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#2a1610";
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(-6, 14.5); c.lineTo(-6, 16.5);
    c.moveTo(-4.5, 14.5); c.lineTo(-4.5, 16.7);
    c.moveTo(-3, 14.5); c.lineTo(-3, 16.5);
    c.moveTo(6, 14.5); c.lineTo(6, 16.5);
    c.moveTo(4.5, 14.5); c.lineTo(4.5, 16.7);
    c.moveTo(3, 14.5); c.lineTo(3, 16.5);
    c.stroke();

    c.save();
    c.translate(-7, -13);
    c.rotate(-0.35 - wobble * 0.4);
    c.fillStyle = pal.earL1;
    c.beginPath();
    c.ellipse(0, -12, 6, 17, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.earL2;
    c.beginPath();
    c.ellipse(0.5, -12, 4, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.earL3;
    c.beginPath();
    c.ellipse(0.5, -11, 2.4, 11, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(6, -13);
    c.rotate(0.2 + wobble * 0.55);
    c.fillStyle = pal.earR1;
    c.beginPath();
    c.ellipse(0, -14, 7, 19, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.earR2;
    c.beginPath();
    c.ellipse(-0.5, -14, 5, 16, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.earR3;
    c.beginPath();
    c.ellipse(0, -12, 3.8, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = pal.earRInner;
    c.beginPath();
    c.ellipse(0.6, -9, 1.6, 9, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.fillStyle = pal.headDark;
    c.beginPath();
    c.ellipse(0, -1, 15, 14, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.headMid;
    c.beginPath();
    c.ellipse(0, -2, 14, 13, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.headLight;
    c.beginPath();
    c.ellipse(0, 1, 11, 10, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.cheekOuter;
    c.beginPath();
    c.arc(-13, 2, 4.5, 0, Math.PI * 2);
    c.arc(13, 2, 4.5, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.cheekInner;
    c.beginPath();
    c.arc(-12, 1, 2.8, 0, Math.PI * 2);
    c.arc(12, 1, 2.8, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = pal.muzzle;
    c.beginPath();
    c.ellipse(0, 5, 7, 4.5, 0, 0, Math.PI * 2);
    c.fill();

    const blink = Math.sin(t * 0.045) > 0.96;
    if (!blink) {
      c.fillStyle = "#000000";
      c.beginPath();
      c.ellipse(6, -2, 3.0, 4.4, 0, 0, Math.PI * 2);
      c.ellipse(-6, -2, 3.0, 4.4, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(6.9, -3.4, 1.15, 0, Math.PI * 2);
      c.arc(-5.1, -3.4, 1.15, 0, Math.PI * 2);
      c.fill();
    } else {
      c.strokeStyle = "#101010";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(3, -2); c.lineTo(7, -2);
      c.moveTo(-3, -2); c.lineTo(-7, -2);
      c.stroke();
    }

    c.fillStyle = "#d06868";
    c.beginPath();
    c.moveTo(0, 3);
    c.lineTo(-1.8, 5);
    c.lineTo(1.8, 5);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.beginPath();
    c.arc(-0.5, 3.6, 0.5, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = "#1a1a1a";
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(0, 5.4);
    c.lineTo(0, 6.6);
    c.moveTo(0, 6.6);
    c.quadraticCurveTo(-1.8, 7.6, -2.8, 7.2);
    c.moveTo(0, 6.6);
    c.quadraticCurveTo(1.8, 7.6, 2.8, 7.2);
    c.stroke();
    c.fillStyle = "#ffffff";
    c.fillRect(-0.7, 6.9, 1.4, 1.5);

    c.strokeStyle = pal.whisker;
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(2.5, 3.5); c.quadraticCurveTo(12, 0, 22, -1);
    c.moveTo(2.5, 4.5); c.quadraticCurveTo(12, 4, 22, 4);
    c.moveTo(2.5, 5.5); c.quadraticCurveTo(11, 7, 20, 9);
    c.moveTo(2.5, 6.2); c.quadraticCurveTo(9, 9, 16, 12);
    c.moveTo(-2.5, 3.5); c.quadraticCurveTo(-12, 0, -22, -1);
    c.moveTo(-2.5, 4.5); c.quadraticCurveTo(-12, 4, -22, 4);
    c.moveTo(-2.5, 5.5); c.quadraticCurveTo(-11, 7, -20, 9);
    c.moveTo(-2.5, 6.2); c.quadraticCurveTo(-9, 9, -16, 12);
    c.stroke();

    c.fillStyle = pal.blush;
    c.beginPath();
    c.ellipse(9, 4, 2.8, 1.6, 0, 0, Math.PI * 2);
    c.ellipse(-9, 4, 2.8, 1.6, 0, 0, Math.PI * 2);
    c.fill();

    if (hat === "gentleman") drawGentlemanHat(c);
    else if (hat === "bear") drawBearHat(c);
  }

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
  let gameMode = "arcade";
  let lastGameMode = "levels";
  let currentLevel = 1;
  let levelProgress = 1;
  let levelOrient = "vertical";
  let cameraX = 0;
  let worldWidth = W;
  let portal = null;
  let levelTransitionTimer = 0;
  let levelCameraLocked = false;
  const PORTAL_SUCK_DURATION = 90;
  const HUD_SAFE_TOP = 96;
  const HUD_SAFE_BOTTOM = 40;
  let portalSuckFrom = { x: 0, y: 0 };
  let levelBannerTimer = 0;
  let levelBannerText = "";
  const LEVEL_PROGRESS_KEY = "chinchilla-level-progress";
  const LEVEL_DEFS = [
    { orient: "horizontal", label: "Ветка вправо" },
    { orient: "vertical", label: "Лес вверх" },
    { orient: "horizontal", label: "Через лес" },
    { orient: "vertical", label: "К облакам" },
    { orient: "horizontal", label: "Дальняя ветка" },
    { orient: "vertical", label: "К вершине" },
  ];
  const BOSS_LEVEL_PERIOD = 10;
  let bossFox = null;
  let cameraY = 0;
  let score = 0;
  let bestScore = Number(localStorage.getItem("chinchilla-best") || 0);
  let maxHeight = 0;
  let particles = [];
  let backgroundLeaves = [];

  bestEl.textContent = bestScore;
  levelProgress = loadLevelProgress();

  function loadLevelProgress() {
    try {
      const n = parseInt(localStorage.getItem(LEVEL_PROGRESS_KEY) || "1", 10);
      return Math.max(1, Math.min(n, 999));
    } catch (e) { return 1; }
  }

  function saveLevelProgress(lv) {
    levelProgress = Math.max(levelProgress, lv);
    try { localStorage.setItem(LEVEL_PROGRESS_KEY, String(levelProgress)); } catch (e) {}
  }

  function isBossLevel(levelNum) {
    return levelNum % BOSS_LEVEL_PERIOD === 0;
  }

  function getLevelDef(levelNum) {
    if (isBossLevel(levelNum)) return { orient: "vertical", label: "Босс — лиса с лазерами", boss: true };
    return LEVEL_DEFS[(levelNum - 1) % LEVEL_DEFS.length];
  }

  function makePlatform(x, y, w, type) {
    return {
      x,
      y,
      w,
      h: 16,
      type: type || "grass",
      broken: false,
      respawnTimer: 0,
      moveDir: 1,
      moveSpeed: 1.4,
      spawnSide: "center",
      extending: false,
      extendTarget: x,
      fragileTimer: 0,
      triggered: false,
      shake: 0,
      deltaX: 0,
    };
  }

  function fitLevelCamera(def) {
    levelCameraLocked = false;
    if (!portal) return;
    const playTop = HUD_SAFE_TOP;
    const playBottom = H - HUD_SAFE_BOTTOM;
    const playH = playBottom - playTop;
    if (def.orient === "vertical") {
      const topY = portal.y - portal.r * 2;
      const bottomY = player.y + player.h + 12;
      const span = bottomY - topY;
      if (span <= playH) {
        levelCameraLocked = true;
        cameraY = topY - playTop;
      } else {
        cameraY = player.y - (playBottom - 120);
      }
      cameraX = 0;
      return;
    }
    cameraY = Math.max(0, player.y - CAMERA_FOLLOW + 10);
    cameraX = 0;
  }

  function addHayToPlatform(platform) {
    hays.push({
      platform,
      offsetX: rand(-platform.w * 0.25, platform.w * 0.25),
      offsetY: -18,
      collected: false,
      bob: rand(0, Math.PI * 2),
      r: 11,
    });
  }

  function addAppleToPlatform(platform) {
    apples.push({
      platform,
      offsetX: rand(-platform.w * 0.2, platform.w * 0.2),
      offsetY: -22,
      collected: false,
      bob: rand(0, Math.PI * 2),
      r: 11,
    });
  }

  function sprinkleApples(midPlatforms, levelNum) {
    if (midPlatforms.length === 0) return;
    const cleared = Math.max(0, levelProgress - 1);
    const desired = Math.min(midPlatforms.length, Math.floor(cleared / 4) + Math.floor(levelNum / 5));
    if (desired <= 0) return;
    const shuffled = midPlatforms.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < desired && i < shuffled.length; i += 1) {
      addAppleToPlatform(shuffled[i]);
    }
  }

  function addSquirrelToPlatform(platform) {
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

  function spawnLevelSaw(x, y, vx) {
    saws.push({ x, y, vx, r: 18, rotation: rand(0, Math.PI * 2) });
  }

  function spawnLevelFox(x, y, side) {
    foxes.push({
      x,
      y,
      side,
      throwTimer: 180 + Math.random() * 120,
      life: 9999,
      stationary: true,
    });
  }

  function buildBossLevel(levelNum) {
    levelOrient = "vertical";
    cameraX = 0;
    worldWidth = W;
    cameraY = 0;
    const bossIndex = Math.max(1, Math.floor(levelNum / BOSS_LEVEL_PERIOD));
    const arenaTopY = -H * 1.6;
    const arenaBottomY = H - 60;

    platforms.push(makePlatform(W / 2 - 90, arenaBottomY, 180, "grass"));

    const platformRows = 9;
    const rowGap = (arenaBottomY - (arenaTopY + 120)) / (platformRows + 1);
    let prevCenter = W / 2;
    for (let i = 1; i <= platformRows; i += 1) {
      const y = arenaBottomY - i * rowGap;
      const w = rand(90, 120);
      const minC = Math.max(w / 2 + 18, prevCenter - 150);
      const maxC = Math.min(W - w / 2 - 18, prevCenter + 150);
      const cx = rand(minC, maxC);
      platforms.push(makePlatform(cx - w / 2, y, w, i % 2 === 0 ? "log" : "grass"));
      prevCenter = cx;
    }

    const bossY = arenaTopY + 80;
    platforms.push(makePlatform(W / 2 - 90, bossY + 40, 180, "log"));
    bossFox = {
      x: W / 2,
      y: bossY,
      hp: 4 + bossIndex,
      maxHp: 4 + bossIndex,
      phase: "idle",
      phaseTimer: 90,
      aimAngle: Math.PI / 2,
      laserAngle: Math.PI / 2,
      laserPower: 0,
      shakeT: 0,
      dead: false,
      hitFlash: 0,
      bossIndex,
    };

    const portalY = arenaTopY + 6;
    portal = { x: W / 2, y: portalY, r: 38, active: false, spin: 0, pulse: 0, hidden: true };

    player.x = W / 2;
    player.y = arenaBottomY - 40;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpsLeft = 2;
    highestPlatformY = portalY;
  }

  function buildVerticalLevel(levelNum) {
    levelOrient = "vertical";
    cameraX = 0;
    worldWidth = W;
    cameraY = 0;
    const steps = 6 + (levelNum - 1) * 2;
    const startY = H - 80;
    const startPlat = makePlatform(W / 2 - 80, startY, 160, "grass");
    platforms.push(startPlat);
    let y = startY;
    let prevCenter = W / 2;
    const midPlatforms = [];
    const MAX_H_REACH = 150;
    for (let i = 1; i < steps; i += 1) {
      y -= PLATFORM_GAP + rand(-4, 4);
      const w = rand(95, 125);
      const minC = Math.max(w / 2 + 18, prevCenter - MAX_H_REACH);
      const maxC = Math.min(W - w / 2 - 18, prevCenter + MAX_H_REACH);
      const cx = rand(minC, maxC);
      const px = cx - w / 2;
      const p = makePlatform(px, y, w, i % 2 === 0 ? "log" : "grass");
      platforms.push(p);
      midPlatforms.push(p);
      prevCenter = cx;
    }
    const portalY = y - PLATFORM_GAP * 0.55;
    const portalPx = clamp(prevCenter - 72, 20, W - 144 - 20);
    platforms.push(makePlatform(portalPx, portalY, 144, "log"));
    portal = { x: portalPx + 72, y: portalY - 40, r: 36, active: true, spin: 0, pulse: 0 };
    player.x = W / 2;
    player.y = startY - 36;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpsLeft = 2;
    highestPlatformY = portalY;

    const hayChance = 0.6;
    const maxSquirrels = Math.floor(midPlatforms.length * 0.5);
    const squirrelCount = Math.min(maxSquirrels, 1 + Math.floor((levelNum - 1) * 0.5));
    const sawCount = Math.max(0, Math.floor((levelNum - 1) * 0.5));
    const foxCount = Math.max(0, Math.floor((levelNum - 3) * 0.3));

    for (const p of midPlatforms) {
      if (Math.random() < hayChance) addHayToPlatform(p);
    }
    const shuffled = midPlatforms.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < squirrelCount && i < shuffled.length; i += 1) {
      addSquirrelToPlatform(shuffled[i]);
    }
    sprinkleApples(midPlatforms, levelNum);
    const sawSpan = startY - portalY;
    for (let i = 0; i < sawCount; i += 1) {
      const sawY = startY - (i + 1.5) * (sawSpan / (sawCount + 2));
      const fromLeft = Math.random() < 0.5;
      const speed = 2.0 + Math.random() * 0.8 + levelNum * 0.1;
      spawnLevelSaw(fromLeft ? 30 : W - 30, sawY, (fromLeft ? 1 : -1) * speed);
    }
    for (let i = 0; i < foxCount; i += 1) {
      const foxY = startY - (i + 1.5) * (sawSpan / (foxCount + 2));
      const side = Math.random() < 0.5 ? "left" : "right";
      spawnLevelFox(side === "left" ? 22 : W - 22, foxY, side);
    }
  }

  function buildHorizontalLevel(levelNum) {
    levelOrient = "horizontal";
    const steps = 5 + (levelNum - 1) * 2;
    const groundY = H - 110;
    worldWidth = 160 + steps * 96 + 130;
    cameraX = 0;
    cameraY = Math.max(0, groundY - CAMERA_FOLLOW + 10);
    platforms.push(makePlatform(8, groundY, 130, "grass"));
    let x = 40;
    let prevY = groundY;
    const midPlatforms = [];
    for (let i = 1; i < steps; i += 1) {
      const w = rand(96, 130);
      const gap = rand(48, 78);
      x += w + gap;
      const dy = clamp(prevY + rand(-22, 22), groundY - 70, groundY + 30) - groundY;
      const py = groundY + dy;
      const p = makePlatform(x, py, w, i % 3 === 0 ? "log" : "grass");
      platforms.push(p);
      midPlatforms.push(p);
      prevY = py;
    }
    const finalX = x + 100;
    worldWidth = Math.max(worldWidth, finalX + 200);
    platforms.push(makePlatform(finalX, groundY, 140, "log"));
    portal = { x: finalX + 70, y: groundY - 44, r: 36, active: true, spin: 0, pulse: 0 };
    player.x = 64;
    player.y = groundY - 36;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpsLeft = 2;
    highestPlatformY = groundY - 200;

    const hayChance = 0.65;
    const maxSquirrels = Math.floor(midPlatforms.length * 0.5);
    const squirrelCount = Math.min(maxSquirrels, 1 + Math.floor((levelNum - 1) * 0.5));
    const sawCount = Math.max(0, Math.floor((levelNum - 1) * 0.5));
    const foxCount = Math.max(0, Math.floor((levelNum - 3) * 0.35));

    for (const p of midPlatforms) {
      if (Math.random() < hayChance) addHayToPlatform(p);
    }
    const shuffled = midPlatforms.slice().sort(() => Math.random() - 0.5);
    for (let i = 0; i < squirrelCount && i < shuffled.length; i += 1) {
      addSquirrelToPlatform(shuffled[i]);
    }
    sprinkleApples(midPlatforms, levelNum);
    const safeStartX = 240;
    const safeEndX = worldWidth - 160;
    for (let i = 0; i < sawCount; i += 1) {
      const sx = safeStartX + (i + 0.5) * ((safeEndX - safeStartX) / Math.max(1, sawCount));
      const sy = groundY - 80 + rand(-15, 15);
      const speed = 1.8 + Math.random() * 0.8 + levelNum * 0.1;
      saws.push({
        x: sx,
        y: sy,
        vx: (Math.random() < 0.5 ? 1 : -1) * speed,
        r: 18,
        rotation: rand(0, Math.PI * 2),
        rangeMin: Math.max(180, sx - 80),
        rangeMax: Math.min(worldWidth - 60, sx + 80),
      });
    }
    for (let i = 0; i < foxCount; i += 1) {
      const fx = 300 + (i + 1) * ((worldWidth - 420) / (foxCount + 1));
      const perchY = groundY - 150 + rand(-20, 20);
      const perchW = 70;
      const perchPlatform = makePlatform(fx - perchW / 2, perchY, perchW, "log");
      perchPlatform.isFoxPerch = true;
      platforms.push(perchPlatform);
      const side = i % 2 === 0 ? "left" : "right";
      spawnLevelFox(fx, perchY - 22, side);
      const lastFox = foxes[foxes.length - 1];
      lastFox.horizontalLevel = true;
      lastFox.throwTimer = 360 + Math.random() * 240;
    }
  }

  function initLevelWorld(levelNum) {
    currentLevel = levelNum;
    platforms = [];
    hays = [];
    saws = [];
    foxes = [];
    knives = [];
    cannons = [];
    cannonballs = [];
    squirrels = [];
    apples = [];
    rockets = [];
    shields = [];
    lasers = [];
    portal = null;
    bossFox = null;
    levelTransitionTimer = 0;
    player.standingOn = null;
    player.invincibleTimer = 0;
    player.rocketTimer = 0;
    player.shieldTimer = 0;
    player.laserTimer = 0;
    const def = getLevelDef(levelNum);
    if (def.boss) buildBossLevel(levelNum);
    else if (def.orient === "horizontal") buildHorizontalLevel(levelNum);
    else buildVerticalLevel(levelNum);
    fitLevelCamera(def);
    if (def.boss) levelBannerText = "БОСС! Запрыгни на лису сверху";
    else levelBannerText = "Уровень " + levelNum + " · " + (def.orient === "horizontal" ? "беги вправо к порталу →" : "прыгай вверх к порталу ↑");
    levelBannerTimer = 180;
    updateModeHud();
  }

  function updateModeHud() {
    const isLevels = gameMode === "levels" && state === "playing";
    if (hudLevelItem) hudLevelItem.classList.toggle("hidden", !isLevels);
    if (hudGoalItem) hudGoalItem.classList.toggle("hidden", !isLevels);
    if (isLevels) {
      if (levelNumEl) levelNumEl.textContent = currentLevel;
      if (levelGoalEl) {
        const def = getLevelDef(currentLevel);
        levelGoalEl.textContent = def.orient === "horizontal" ? "→" : "↑";
      }
    }
  }

  function portalSuckProgress() {
    if (levelTransitionTimer <= 0) return 0;
    return 1 - levelTransitionTimer / PORTAL_SUCK_DURATION;
  }

  function spawnPortalSuckParticle() {
    if (!portal) return;
    const angle = rand(0, Math.PI * 2);
    const dist = rand(portal.r * 1.4, portal.r * 3.8);
    particles.push({
      x: portal.x + Math.cos(angle) * dist,
      y: portal.y + Math.sin(angle) * dist * 0.55,
      vx: 0,
      vy: 0,
      life: rand(14, 26),
      maxLife: 26,
      color: "rgba(210,160,255,0.95)",
      size: rand(2, 4.5),
      portalSuck: true,
      portalX: portal.x,
      portalY: portal.y,
    });
  }

  function updatePortalSuckMotion() {
    if (!portal) return;
    const t = portalSuckProgress();
    const ease = t * t * t;
    const spiralR = (1 - t) * (18 + portal.r * 0.3);
    const spiralA = t * Math.PI * 5.5;
    const baseX = portalSuckFrom.x + (portal.x - portalSuckFrom.x) * ease;
    const baseY = portalSuckFrom.y + (portal.y - portalSuckFrom.y) * ease;
    player.x = baseX + Math.cos(spiralA) * spiralR;
    player.y = baseY + Math.sin(spiralA) * spiralR * 0.42;
    player.squash = Math.max(0.05, 1 - ease * 0.95);
    player.suckAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
    player.suckSpin = ease * Math.PI * 3.2 * player.facing;
    player.earWobble = ease * 3;
    portal.spin += 0.1 + ease * 0.4;
    if (levelTransitionTimer % 3 === 0) spawnPortalSuckParticle();
    if (levelTransitionTimer % 10 === 0) {
      spawnSparkles(portal.x + rand(-10, 10), portal.y + rand(-6, 6));
    }
    if (levelOrient === "horizontal") {
      const targetCameraX = player.x - W * 0.38;
      cameraX = clamp(targetCameraX, 0, Math.max(0, worldWidth - W));
    } else {
      const targetCameraY = player.y - CAMERA_FOLLOW;
      if (targetCameraY < cameraY) cameraY = targetCameraY;
    }
  }

  function onPortalReached() {
    if (!portal || !portal.active || levelTransitionTimer > 0) return;
    portal.active = false;
    portalSuckFrom.x = player.x;
    portalSuckFrom.y = player.y;
    player.suckAlpha = 1;
    player.suckSpin = 0;
    levelTransitionTimer = PORTAL_SUCK_DURATION;
    const cleared = currentLevel;
    saveLevelProgress(cleared + 1);
    score += 50;
    spawnSparkles(portal.x, portal.y);
    spawnSparkles(player.x, player.y);
    playSnort(1.4, 0.3);
    levelBannerText = "Уровень " + cleared + " пройден!";
    levelBannerTimer = 140;
    updateHud();
  }

  function updateLevelTransition() {
    if (levelTransitionTimer <= 0) return;
    levelTransitionTimer -= 1;
    if (levelTransitionTimer === 0) {
      initLevelWorld(currentLevel + 1);
    }
  }

  function checkPortalCollision() {
    if (gameMode !== "levels" || state !== "playing" || !portal || !portal.active) return;
    if (levelTransitionTimer > 0) return;
    const dx = player.x - portal.x;
    const dy = player.y - portal.y;
    if (Math.hypot(dx, dy) < portal.r + player.w * 0.28) onPortalReached();
  }

  function updateBossFox() {
    if (gameMode !== "levels") return;
    if (!bossFox || bossFox.dead) return;
    if (state !== "playing" || levelTransitionTimer > 0) return;

    if (bossFox.hitFlash > 0) bossFox.hitFlash -= 1;
    bossFox.phaseTimer -= 1;

    const targetAngle = Math.atan2(player.y - bossFox.y, player.x - bossFox.x);
    if (bossFox.phase === "idle" || bossFox.phase === "aim") {
      const diff = ((targetAngle - bossFox.aimAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      bossFox.aimAngle += diff * (bossFox.phase === "aim" ? 0.08 : 0.04);
    }

    if (bossFox.phase === "idle" && bossFox.phaseTimer <= 0) {
      bossFox.phase = "aim";
      bossFox.phaseTimer = 70;
      bossFox.laserAngle = bossFox.aimAngle;
    } else if (bossFox.phase === "aim") {
      bossFox.laserAngle = bossFox.aimAngle;
      if (bossFox.phaseTimer <= 0) {
        bossFox.phase = "fire";
        bossFox.phaseTimer = 45;
        bossFox.laserPower = 1;
        bossFox.shakeT = 1;
        playSnort(0.6, 0.4);
      }
    } else if (bossFox.phase === "fire") {
      bossFox.laserPower = 1;
      const dx = Math.cos(bossFox.laserAngle);
      const dy = Math.sin(bossFox.laserAngle);
      const beamLen = 1400;
      const px = player.x - bossFox.x;
      const py = player.y - bossFox.y;
      const t = px * dx + py * dy;
      if (t > 0 && t < beamLen) {
        const cx = bossFox.x + dx * t;
        const cy = bossFox.y + dy * t;
        const d = Math.hypot(player.x - cx, player.y - cy);
        if (d < 16 + player.w * 0.3) {
          if (player.shieldTimer <= 0 && player.rocketTimer <= 0) {
            player.lives = 0;
            spawnSparkles(player.x, player.y);
            endGame();
          } else {
            spawnShieldHit(player.x, player.y);
          }
        }
      }
      if (bossFox.phaseTimer <= 0) {
        bossFox.phase = "idle";
        bossFox.phaseTimer = 80 + Math.random() * 40;
        bossFox.laserPower = 0;
      }
    }
    if (bossFox.shakeT > 0) bossFox.shakeT *= 0.9;

    if (player.vy > 1) {
      const dx = player.x - bossFox.x;
      const dy = player.y - (bossFox.y - 30);
      if (Math.abs(dx) < 44 && dy > -12 && dy < 22) {
        bossFox.hp -= 1;
        bossFox.hitFlash = 18;
        player.vy = JUMP_FORCE * 0.95;
        spawnFurBurst(bossFox.x, bossFox.y - 20);
        spawnSparkles(bossFox.x, bossFox.y - 20);
        playSnort(1.6, 0.35);
        score += 40;
        if (bossFox.hp <= 0) {
          bossFox.dead = true;
          for (let i = 0; i < 6; i += 1) {
            spawnSparkles(bossFox.x + rand(-30, 30), bossFox.y + rand(-30, 30));
          }
          if (portal) {
            portal.hidden = false;
            portal.active = true;
          }
          score += 200;
        }
        updateHud();
      }
    }
  }

  function drawBossHpBar() {
    if (gameMode !== "levels") return;
    if (!bossFox || bossFox.dead) return;
    const barW = W * 0.7;
    const barH = 14;
    const x = (W - barW) / 2;
    const y = 18;
    ctx.save();
    ctx.fillStyle = "rgba(8,8,20,0.7)";
    roundRect(x - 4, y - 4, barW + 8, barH + 8, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(40,10,10,0.7)";
    roundRect(x, y, barW, barH, 6);
    ctx.fill();
    const ratio = Math.max(0, bossFox.hp / bossFox.maxHp);
    const grad = ctx.createLinearGradient(x, y, x + barW, y);
    grad.addColorStop(0, "#ff4040");
    grad.addColorStop(1, "#ffb030");
    ctx.fillStyle = grad;
    roundRect(x, y, barW * ratio, barH, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,180,0.8)";
    ctx.lineWidth = 1.5;
    roundRect(x, y, barW, barH, 6);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Босс-лиса · " + bossFox.hp + " / " + bossFox.maxHp, W / 2, y + barH / 2);
    ctx.restore();
  }

  function drawBossFox() {
    if (gameMode !== "levels") return;
    if (!bossFox || bossFox.dead) return;
    const sy = bossFox.y - cameraY;
    if (sy < -200 || sy > H + 200) return;
    const shake = bossFox.shakeT * 4;
    const sx = bossFox.x + (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(sx, sy);

    if (bossFox.phase === "aim") {
      const flicker = (Math.sin(bossFox.phaseTimer * 0.6) + 1) * 0.5;
      ctx.strokeStyle = "rgba(255,40,40," + (0.4 + flicker * 0.4).toFixed(2) + ")";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(Math.cos(bossFox.laserAngle) * 30, Math.sin(bossFox.laserAngle) * 30);
      ctx.lineTo(Math.cos(bossFox.laserAngle) * 1400, Math.sin(bossFox.laserAngle) * 1400);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (bossFox.phase === "fire") {
      const beamLen = 1400;
      const beamW = 18 + Math.sin(bossFox.phaseTimer * 0.8) * 6;
      ctx.save();
      ctx.rotate(bossFox.laserAngle);
      const beamGrad = ctx.createLinearGradient(0, -beamW, 0, beamW);
      beamGrad.addColorStop(0, "rgba(255,80,80,0)");
      beamGrad.addColorStop(0.5, "rgba(255,40,40,0.95)");
      beamGrad.addColorStop(1, "rgba(255,80,80,0)");
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, -beamW, beamLen, beamW * 2);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(0, -3, beamLen, 6);
      ctx.restore();
    }

    ctx.scale(2.4, 2.4);

    const tint = bossFox.hitFlash > 0 ? "rgba(255,255,255,0.8)" : null;

    ctx.fillStyle = "#1a0e08";
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2c1a0e";
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 17);
      ctx.lineTo(Math.cos(a + 0.1) * 27, Math.sin(a + 0.1) * 21);
      ctx.lineTo(Math.cos(a + 0.2) * 22, Math.sin(a + 0.2) * 17);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#9a4220";
    ctx.beginPath();
    ctx.ellipse(0, -1, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c5663a";
    ctx.beginPath();
    ctx.ellipse(0, -2, 17, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fce8d8";
    ctx.beginPath();
    ctx.ellipse(0, 3, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9a4220";
    ctx.beginPath();
    ctx.moveTo(-12, -10); ctx.lineTo(-16, -22); ctx.lineTo(-8, -14); ctx.closePath();
    ctx.moveTo(12, -10); ctx.lineTo(16, -22); ctx.lineTo(8, -14); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#5a2a18";
    ctx.beginPath();
    ctx.moveTo(-12, -11); ctx.lineTo(-14, -19); ctx.lineTo(-9, -14); ctx.closePath();
    ctx.moveTo(12, -11); ctx.lineTo(14, -19); ctx.lineTo(9, -14); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fce8d8";
    ctx.beginPath();
    ctx.ellipse(-7, -3, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -3, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff3030";
    ctx.beginPath();
    ctx.arc(-7, -3, 2.6, 0, Math.PI * 2);
    ctx.arc(7, -3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe080";
    ctx.beginPath();
    ctx.arc(-7, -3, 1.2, 0, Math.PI * 2);
    ctx.arc(7, -3, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f5e0ce";
    ctx.beginPath();
    ctx.ellipse(0, 5, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a0e08";
    ctx.beginPath();
    ctx.ellipse(0, 4.2, 1.6, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5a2a18";
    ctx.beginPath();
    ctx.arc(-4, 7, 1, 0, Math.PI * 2);
    ctx.arc(4, 7, 1, 0, Math.PI * 2);
    ctx.fill();

    if (tint) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = tint;
      ctx.fillRect(-30, -30, 60, 60);
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();
  }

  function drawPortal() {
    if (!portal || gameMode !== "levels") return;
    if (portal.hidden) return;
    const sucking = levelTransitionTimer > 0;
    const suckT = portalSuckProgress();
    portal.spin += sucking ? 0.1 + suckT * 0.35 : 0.07;
    portal.pulse = (portal.pulse || 0) + 0.06;
    const sx = portal.x;
    const sy = portal.y - cameraY;
    const pulse = sucking
      ? 1 + suckT * 0.45 + Math.sin(portal.spin * 3) * 0.12
      : 1 + Math.sin(portal.pulse) * 0.14;
    ctx.save();
    ctx.translate(sx, sy);
    const glowR = portal.r * (sucking ? 2.4 : 2.1) * pulse;
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
    if (sucking) {
      glow.addColorStop(0, "rgba(220,160,255,0.95)");
      glow.addColorStop(0.45, "rgba(140,80,220,0.55)");
      glow.addColorStop(1, "rgba(80,40,160,0)");
    } else {
      glow.addColorStop(0, portal.active ? "rgba(200,130,255,0.9)" : "rgba(120,120,120,0.4)");
      glow.addColorStop(0.5, "rgba(140,80,220,0.45)");
      glow.addColorStop(1, "rgba(80,40,160,0)");
    }
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
    if (sucking) {
      ctx.strokeStyle = "rgba(230,200,255," + (0.35 + suckT * 0.55).toFixed(2) + ")";
      ctx.lineWidth = 2;
      for (let arm = 0; arm < 5; arm += 1) {
        ctx.beginPath();
        for (let s = 0; s <= 28; s += 1) {
          const frac = s / 28;
          const r = portal.r * (1.7 - frac * 1.35) * (1 + suckT * 0.25);
          const a = portal.spin * 2.2 + arm * (Math.PI * 2 / 5) + frac * Math.PI * 1.6;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r * 0.55;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    ctx.strokeStyle = sucking
      ? "rgba(240,210,255,0.98)"
      : portal.active ? "rgba(240,200,255,0.98)" : "rgba(160,160,160,0.6)";
    ctx.lineWidth = sucking ? 4 : 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, portal.r * 0.58 * pulse, portal.r * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(120,60,200,0.35)";
    ctx.fill();
    ctx.rotate(portal.spin);
    ctx.strokeStyle = sucking ? "rgba(255,245,255,0.9)" : "rgba(255,240,255,0.9)";
    ctx.lineWidth = sucking ? 2.5 : 2;
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, -portal.r * 0.35);
      ctx.lineTo(0, -portal.r * (sucking ? 1.15 : 1.05));
      ctx.stroke();
      ctx.rotate(Math.PI / 3);
    }
    ctx.restore();
  }

  function drawPortalGuide() {
    if (gameMode !== "levels" || state !== "playing" || !portal || !portal.active) return;
    if (levelTransitionTimer > 0) return;
    const px = portal.x - cameraX;
    const py = portal.y - cameraY;
    const margin = HUD_SAFE_TOP + 8;
    const onScreen = px > margin && px < W - margin && py > margin && py < H - HUD_SAFE_BOTTOM;
    ctx.save();
    if (onScreen) {
      const bob = Math.sin((portal.pulse || 0) * 1.4) * 4;
      ctx.fillStyle = "rgba(230,200,255,0.95)";
      ctx.strokeStyle = "rgba(80,40,140,0.8)";
      ctx.lineWidth = 2;
      ctx.font = "bold 15px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const label = levelOrient === "horizontal" ? "Портал →" : "Портал ↑";
      ctx.strokeText(label, px, py - portal.r - 10 + bob);
      ctx.fillText(label, px, py - portal.r - 10 + bob);
    } else {
      const cx = clamp(px, margin + 18, W - margin - 18);
      const cy = clamp(py, margin + 18, H - HUD_SAFE_BOTTOM - 18);
      const angle = Math.atan2(py - H * 0.46, px - W * 0.5);
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(200,150,255,0.92)";
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Портал", 0, -22);
    }
    ctx.restore();
  }

  function drawLevelPortalMarker() {
    if (gameMode !== "levels" || state !== "playing" || !portal || !portal.active) return;
    if (levelTransitionTimer > 0) return;
    const px = portal.x - cameraX;
    const py = portal.y - cameraY;
    const barY = H - 24;
    const cx = W * 0.5;
    const angle = Math.atan2(py - barY, px - cx);
    const dist = Math.hypot(px - cx, py - barY);
    ctx.save();
    ctx.fillStyle = "rgba(12, 8, 28, 0.72)";
    ctx.strokeStyle = "rgba(200,150,255,0.85)";
    ctx.lineWidth = 2;
    roundRect(10, barY - 16, W - 20, 32, 12);
    ctx.fill();
    ctx.stroke();
    ctx.translate(cx, barY);
    ctx.rotate(angle);
    ctx.fillStyle = "#d8b4ff";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#f4e8ff";
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const hint = levelOrient === "horizontal"
      ? "→ беги к фиолетовому порталу"
      : (dist < 140 ? "↑ прыгай в портал" : "↑ поднимайся к порталу");
    ctx.fillText(hint, cx, barY);
    ctx.restore();
  }

  function drawLevelBanner() {
    if (levelBannerTimer <= 0) return;
    levelBannerTimer -= 1;
    const alpha = Math.min(1, levelBannerTimer / 40);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(8, 10, 24, 0.55)";
    ctx.fillRect(W * 0.12, H * 0.38, W * 0.76, 52);
    ctx.strokeStyle = "rgba(255, 224, 138, 0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(W * 0.12, H * 0.38, W * 0.76, 52);
    ctx.fillStyle = "#ffe08a";
    ctx.font = "bold 22px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(levelBannerText, W / 2, H * 0.38 + 26);
    ctx.restore();
  }

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
    suckAlpha: 1,
    suckSpin: 0,
  };

  let platforms = [];
  let hays = [];
  let highestPlatformY = 0;
  let saws = [];
  let foxes = [];
  let knives = [];
  let cannons = [];
  let cannonballs = [];
  let snake = null;
  let lastSawSpawn = 0;
  let lastFoxSpawn = 0;
  let lastCannonSpawn = 0;
  let lastSnakeSpawn = 0;
  const SNAKE_SPAWN_HEIGHT = 1200;
  const SNAKE_SEGMENT_COUNT = 16;
  const SNAKE_SEGMENT_GAP = 10;
  const SNAKE_SPEED = 1.9;
  const SNAKE_MAX_SPEED = 3.8;
  const SNAKE_HP = 5;
  const SNAKE_DESPAWN_BELOW = 1400;
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
    cameraX = 0;
    score = 0;
    maxHeight = 0;
    particles = [];
    player.lives = 3;
    player.invincibleTimer = 0;
    player.rocketTimer = 0;
    player.shieldTimer = 0;
    player.laserTimer = 0;
    levelBannerTimer = 0;
    levelBannerText = "";
    levelTransitionTimer = 0;
    portal = null;
    bossFox = null;
    snake = null;
    lastSnakeSpawn = 0;

    if (gameMode === "levels") {
      initLevelWorld(levelProgress);
      updateHud();
      return;
    }

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
    cannons = [];
    cannonballs = [];
    lastSawSpawn = INITIAL_Y;
    lastFoxSpawn = INITIAL_Y;
    lastCannonSpawn = INITIAL_Y;
    lastSnakeSpawn = INITIAL_Y;
    snake = null;
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
    updateModeHud();
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

    if (type !== "fragile" && Math.random() < 0.004) {
      rockets.push({
        platform,
        offsetX: rand(-platform.w * 0.15, platform.w * 0.15),
        offsetY: -28,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 13,
      });
    }

    if (type !== "fragile" && Math.random() < 0.005) {
      shields.push({
        platform,
        offsetX: rand(-platform.w * 0.15, platform.w * 0.15),
        offsetY: -26,
        collected: false,
        bob: rand(0, Math.PI * 2),
        r: 13,
      });
    }

    if (type !== "fragile" && Math.random() < 0.004) {
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

    if (highestPlatformY < lastFoxSpawn - 1100) {
      lastFoxSpawn = highestPlatformY;
      if (Math.random() < 0.6) {
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

    if (maxHeight >= 1000 && highestPlatformY < lastCannonSpawn - 1300) {
      lastCannonSpawn = highestPlatformY;
      if (Math.random() < 0.45) {
        const cannonY = highestPlatformY + 320;
        const side = Math.random() < 0.5 ? "left" : "right";
        cannons.push({
          x: side === "left" ? 26 : W - 26,
          y: cannonY,
          side,
          shootTimer: 150 + Math.random() * 90,
          life: 720,
          aimAngle: 0,
        });
      }
    }

    if (maxHeight >= SNAKE_SPAWN_HEIGHT && !snake) {
      if (lastSnakeSpawn === 0 || lastSnakeSpawn === INITIAL_Y) {
        spawnSnake();
        lastSnakeSpawn = highestPlatformY;
      } else if (highestPlatformY < lastSnakeSpawn - 1500) {
        spawnSnake();
        lastSnakeSpawn = highestPlatformY;
      }
    }

    saws = saws.filter((s) => !s.dead && s.y < cameraY + H + 200);
    foxes = foxes.filter((f) => f.y < cameraY + H + 200 && f.life > 0);
    cannons = cannons.filter((c) => !c.dead && c.y < cameraY + H + 200 && c.life > 0);
    cannonballs = cannonballs.filter((b) =>
      !b.dead &&
      b.x > -40 && b.x < W + 40 &&
      b.y - cameraY > -40 && b.y - cameraY < H + 40
    );
    knives = knives.filter((k) =>
      k.x > -30 && k.x < W + 30 &&
      k.y - cameraY > -30 && k.y - cameraY < H + 30
    );
  }

  function updateSaws() {
    for (const saw of saws) {
      saw.x += saw.vx;
      const left = saw.rangeMin != null ? saw.rangeMin : saw.r + 4;
      const right = saw.rangeMax != null ? saw.rangeMax : W - saw.r - 4;
      if (saw.x < left) {
        saw.x = left;
        saw.vx = Math.abs(saw.vx);
      }
      if (saw.x > right) {
        saw.x = right;
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

      if (gameMode === "levels" && !fox.dead) {
        const dxp = player.x - fox.x;
        const dyp = player.y - (fox.y - 14);
        if (Math.hypot(dxp, dyp) < 28 + player.w * 0.35) {
          fox.dead = true;
          spawnFurBurst(fox.x, fox.y - 14);
          spawnSparkles(fox.x, fox.y - 14);
          score += 20;
          if (player.vy > 0) player.vy = JUMP_FORCE * 0.7;
          playSnort(1.5, 0.25);
          continue;
        }
      }

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
        const baseDelay = 110 + Math.random() * 60;
        let multiplier = 1;
        if (fox.horizontalLevel) multiplier = 4;
        else if (fox.stationary) multiplier = 2;
        fox.throwTimer = baseDelay * multiplier;
      }
    }
    foxes = foxes.filter((f) => !f.dead);
  }

  function updateCannons() {
    for (const c of cannons) {
      if (c.dead) continue;
      c.life -= 1;
      const targetAngle = Math.atan2(player.y - c.y, player.x - c.x);
      const diff = ((targetAngle - c.aimAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      c.aimAngle += diff * 0.04;
      c.shootTimer -= 1;
      if (c.shootTimer <= 0 && c.life > 60) {
        const speed = 4.6;
        cannonballs.push({
          x: c.x + Math.cos(c.aimAngle) * 50,
          y: c.y + Math.sin(c.aimAngle) * 50,
          vx: Math.cos(c.aimAngle) * speed,
          vy: Math.sin(c.aimAngle) * speed,
          r: 16,
          spin: 0,
          dead: false,
        });
        spawnSparkles(c.x + Math.cos(c.aimAngle) * 52, c.y + Math.sin(c.aimAngle) * 52);
        c.shootTimer = 180 + Math.random() * 80;
        c.recoil = 10;
      }
      if (c.recoil) c.recoil *= 0.82;
    }
  }

  function updateCannonballs() {
    for (const b of cannonballs) {
      if (b.dead) continue;
      b.x += b.vx;
      b.y += b.vy;
      b.spin += 0.18;
      const dx = player.x - b.x;
      const dy = player.y - b.y;
      if (Math.hypot(dx, dy) < b.r + player.w * 0.32) {
        if (player.shieldTimer > 0 || player.rocketTimer > 0) {
          spawnShieldHit(b.x, b.y);
          b.dead = true;
        } else {
          spawnSparkles(b.x, b.y);
          spawnSparkles(player.x, player.y);
          b.dead = true;
          player.lives = 0;
          endGame();
        }
      }
    }
  }

  function spawnSnake() {
    const startX = clamp(player.x + rand(-120, 120), 60, W - 60);
    const startY = cameraY + H + 30;
    const segments = [];
    for (let i = 0; i < SNAKE_SEGMENT_COUNT; i += 1) {
      segments.push({ x: startX, y: startY + i * SNAKE_SEGMENT_GAP });
    }
    snake = {
      head: { x: startX, y: startY, vx: 0, vy: -SNAKE_SPEED },
      segments,
      targetPlatform: null,
      hp: SNAKE_HP,
      hitFlash: 0,
      tongueT: 0,
      slither: 0,
      dead: false,
      eatPulse: 0,
      warningTimer: 90,
    };
    levelBannerText = "Змея ползёт за тобой!";
    levelBannerTimer = 90;
  }

  function pickSnakeTargetPlatform() {
    if (!snake) return;
    const head = snake.head;
    let best = null;
    let bestScore = Infinity;
    for (const p of platforms) {
      if (p.broken || p.extending) continue;
      const px = p.x + p.w / 2;
      const py = p.y;
      if (py >= head.y - 4) continue;
      const dx = px - head.x;
      const dy = py - head.y;
      const toPlayer = Math.hypot(px - player.x, py - player.y);
      const dist = Math.hypot(dx, dy);
      if (dist > 280) continue;
      const score = dist * 0.5 + toPlayer * 0.9;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    snake.targetPlatform = best;
  }

  function updateSnake() {
    if (!snake) return;
    if (snake.dead) {
      snake.hitFlash *= 0.9;
      snake.fadeOut = (snake.fadeOut || 0) + 0.04;
      if (snake.fadeOut >= 1) snake = null;
      return;
    }

    snake.slither += 0.18;
    snake.tongueT += 0.12;
    if (snake.hitFlash > 0) snake.hitFlash -= 1;
    if (snake.eatPulse > 0) snake.eatPulse -= 1;

    const head = snake.head;

    if (!snake.targetPlatform || snake.targetPlatform.broken ||
        snake.targetPlatform.y >= head.y - 2 ||
        Math.hypot(snake.targetPlatform.x + snake.targetPlatform.w / 2 - head.x,
                   snake.targetPlatform.y - head.y) < 32) {
      pickSnakeTargetPlatform();
    }

    let tx, ty;
    if (snake.targetPlatform) {
      tx = snake.targetPlatform.x + snake.targetPlatform.w / 2;
      ty = snake.targetPlatform.y - 4;
    } else {
      tx = player.x;
      ty = player.y - 4;
    }

    const dxT = tx - head.x;
    const dyT = ty - head.y;
    const distT = Math.hypot(dxT, dyT) || 1;
    const wiggle = Math.sin(snake.slither) * 0.8;

    const behindBy = (head.y - cameraY) - H;
    let speed = SNAKE_SPEED;
    if (behindBy > 0) {
      speed = Math.min(SNAKE_MAX_SPEED, SNAKE_SPEED + behindBy / 80);
    } else if (head.y > player.y + 200) {
      speed = Math.min(SNAKE_MAX_SPEED, SNAKE_SPEED + (head.y - player.y - 200) / 120);
    }

    const desiredVx = (dxT / distT) * speed + wiggle * (-dyT / distT);
    const desiredVy = (dyT / distT) * speed + wiggle * (dxT / distT);
    head.vx += (desiredVx - head.vx) * 0.14;
    head.vy += (desiredVy - head.vy) * 0.14;
    head.x += head.vx;
    head.y += head.vy;

    if (snake.warningTimer > 0) snake.warningTimer -= 1;

    for (let i = 0; i < snake.segments.length; i += 1) {
      const seg = snake.segments[i];
      const prev = i === 0 ? head : snake.segments[i - 1];
      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > SNAKE_SEGMENT_GAP) {
        const t = (d - SNAKE_SEGMENT_GAP) / d;
        seg.x += dx * t;
        seg.y += dy * t;
      }
    }

    const headR = 14;

    for (const sq of squirrels) {
      if (sq.dead) continue;
      const p = getSquirrelPos(sq);
      if (Math.hypot(p.x - head.x, p.y - head.y) < headR + 12) {
        sq.dead = true;
        spawnFurBurst(p.x, p.y);
        spawnSparkles(p.x, p.y);
        score += 5;
        snake.eatPulse = 18;
      }
    }

    for (const saw of saws) {
      if (saw.dead) continue;
      if (Math.hypot(saw.x - head.x, saw.y - head.y) < headR + saw.r) {
        saw.dead = true;
        spawnSparkles(saw.x, saw.y);
        score += 10;
        snake.eatPulse = 18;
      }
    }

    if (player.invincibleTimer <= 0) {
      const headHit = Math.hypot(player.x - head.x, player.y - head.y) < headR + player.w * 0.32;
      let bodyHit = false;
      for (let i = 0; i < snake.segments.length; i += 1) {
        const seg = snake.segments[i];
        const r = 10 - i * 0.2;
        if (Math.hypot(player.x - seg.x, player.y - seg.y) < r + player.w * 0.3) {
          bodyHit = true;
          break;
        }
      }
      if (headHit || bodyHit) {
        if (player.rocketTimer > 0) {
          spawnShieldHit(head.x, head.y);
          head.vx = -head.vx * 1.2;
          head.vy = Math.abs(head.vy) + 2;
          damageSnake(1, head.x, head.y);
        } else if (player.shieldTimer > 0) {
          spawnShieldHit(head.x, head.y);
          head.vx = -head.vx * 1.2;
          head.vy = Math.abs(head.vy) + 2;
          snake.hitFlash = 12;
        } else {
          damagePlayer();
          const knockX = player.x - head.x;
          const knockY = player.y - head.y;
          const kd = Math.hypot(knockX, knockY) || 1;
          player.vx += (knockX / kd) * 5;
          player.vy = Math.min(player.vy, -6);
        }
      }
    }

    if (head.y > cameraY + H + SNAKE_DESPAWN_BELOW) {
      snake.dead = true;
      snake.fadeOut = 0;
    }
  }

  function damageSnake(amount, fx, fy) {
    if (!snake || snake.dead) return;
    snake.hp -= amount;
    snake.hitFlash = 18;
    spawnLaserBurst(fx, fy, "rgba(120,220,120,0.95)");
    if (snake.hp <= 0) {
      snake.dead = true;
      snake.fadeOut = 0;
      spawnFurBurst(snake.head.x, snake.head.y);
      spawnSparkles(snake.head.x, snake.head.y);
      score += 200;
      updateHud();
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
    if (gameMode === "levels" && levelTransitionTimer > 0) {
      updatePortalSuckMotion();
      player.vx = 0;
      player.vy = 0;
      player.grounded = false;
      player.standingOn = null;
      player.blinkTimer += 1;
      return;
    }

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

    if (gameMode === "levels" && levelOrient === "horizontal") {
      if (player.x < player.w / 2) {
        player.x = player.w / 2;
        player.vx = 0;
      }
      if (player.x > worldWidth - player.w / 2) {
        player.x = worldWidth - player.w / 2;
        player.vx = 0;
      }
    } else if (player.x < player.w / 2) {
      player.x = player.w / 2;
      player.vx = 0;
    } else if (player.x > W - player.w / 2) {
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

    if (gameMode === "levels" && levelOrient === "horizontal") {
      const targetCameraX = player.x - W * 0.38;
      cameraX = clamp(targetCameraX, 0, Math.max(0, worldWidth - W));
      cameraY = Math.max(0, (H - 110) - CAMERA_FOLLOW + 10);
    } else if (gameMode === "levels" && levelOrient === "vertical" && !levelCameraLocked) {
      cameraX = 0;
      const targetCameraY = player.y - (H - HUD_SAFE_BOTTOM - 120);
      if (targetCameraY < cameraY) cameraY = targetCameraY;
    } else if (gameMode !== "levels") {
      cameraX = 0;
      const targetCameraY = player.y - CAMERA_FOLLOW;
      if (targetCameraY < cameraY) cameraY = targetCameraY;
    }

    const currentHeight = Math.max(0, Math.floor((INITIAL_Y - player.y) / 10));
    maxHeight = Math.max(maxHeight, currentHeight);
    checkPortalCollision();

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
      if (p.portalSuck) {
        const dx = p.portalX - p.x;
        const dy = p.portalY - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const pull = 0.15 + (1 - p.life / p.maxLife) * 0.45;
        p.vx += (dx / dist) * pull * 5;
        p.vy += (dy / dist) * pull * 5;
        p.vx *= 0.88;
        p.vy *= 0.88;
        p.x += p.vx;
        p.y += p.vy;
        p.size *= 0.97;
        if (dist < 8) p.life = 0;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
      }
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

    const rankLine = document.getElementById("final-rank-line");
    if (gameMode === "levels") {
      if (gameoverTitleEl) gameoverTitleEl.textContent = "Не вышло!";
      if (finalModeLineEl) {
        finalModeLineEl.textContent = "Уровни · не дошла до портала (уровень " + currentLevel + ")";
        finalModeLineEl.classList.remove("hidden");
      }
      if (rankLine) rankLine.classList.add("hidden");
    } else {
      if (gameoverTitleEl) gameoverTitleEl.textContent = "Упала!";
      if (finalModeLineEl) finalModeLineEl.classList.add("hidden");
    }

    gameoverEl.classList.remove("hidden");
    gameoverEl.classList.add("visible");

    if (gameMode === "arcade") {
      const playerName = getPlayerName() || "Аноним";
      saveScoreAsync(playerName, score, maxHeight).then(function (updatedBoard) {
        updateFinalRankLine(updatedBoard, playerName, score, maxHeight);
      });
    }
    updateModeHud();
  }

  const LEADERBOARD_KEY = "chinchilla-leaderboard";
  const PLAYER_NAME_KEY = "chinchilla-player-name";
  const MAX_LEADERBOARD = 5;
  const LEADERBOARD_API = "/api/leaderboard";

  let leaderboardCache = [];
  let leaderboardOnline = false;
  let leaderboardTotalPlayers = 0;
  let leaderboardLoading = false;

  function getPlayerName() {
    try { return (localStorage.getItem(PLAYER_NAME_KEY) || "").trim(); }
    catch (e) { return ""; }
  }

  function getPlayerNameInputEl() {
    return document.getElementById("player-name-input");
  }

  function setPlayerNameValue(name) {
    const cleaned = String(name || "").trim().slice(0, 16);
    if (cleaned) {
      try { localStorage.setItem(PLAYER_NAME_KEY, cleaned); } catch (e) {}
    }
    refreshPlayerNameDisplay();
    return cleaned;
  }

  function refreshPlayerNameDisplay() {
    const name = getPlayerName();
    const overlayInp = getPlayerNameInputEl();
    const modalInp = document.getElementById("name-input");
    if (overlayInp && document.activeElement !== overlayInp) overlayInp.value = name;
    if (modalInp && document.activeElement !== modalInp) modalInp.value = name;
  }

  function commitPlayerNameFromOverlay() {
    const inp = getPlayerNameInputEl();
    const hint = document.getElementById("player-name-hint");
    if (!inp) return getPlayerName();
    const name = setPlayerNameValue(inp.value);
    if (name) {
      inp.classList.remove("name-required");
      if (hint) hint.classList.add("hidden");
    }
    return name;
  }

  function promptPlayerNameRequired() {
    const inp = getPlayerNameInputEl();
    const hint = document.getElementById("player-name-hint");
    if (inp) {
      inp.classList.add("name-required");
      try { inp.focus(); } catch (e) {}
    }
    if (hint) hint.classList.remove("hidden");
  }

  function getLeaderboardLocal() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((e) => e && typeof e.score === "number");
    } catch (e) { return []; }
  }

  function saveScoreLocal(name, sc, ht) {
    const entry = {
      name: String(name || "Аноним").slice(0, 16),
      score: sc | 0,
      height: ht | 0,
      date: Date.now(),
    };
    const list = getLeaderboardLocal().filter(function (e) {
      if (e.name !== entry.name) return true;
      if (entry.score > e.score) return false;
      if (entry.score === e.score && entry.height > e.height) return false;
      return true;
    });
    const hasBetter = list.some(function (e) {
      return e.name === entry.name && (
        e.score > entry.score ||
        (e.score === entry.score && e.height >= entry.height)
      );
    });
    if (!hasBetter) list.push(entry);
    list.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      if (b.height !== a.height) return b.height - a.height;
      return a.date - b.date;
    });
    const top = list.slice(0, MAX_LEADERBOARD);
    try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top)); } catch (e) {}
    leaderboardCache = top;
    return top;
  }

  function applyLeaderboardPayload(data) {
    if (data && Array.isArray(data.entries)) {
      leaderboardCache = data.entries;
      leaderboardTotalPlayers = data.totalPlayers | 0;
      leaderboardOnline = true;
      try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboardCache)); } catch (e) {}
      return leaderboardCache;
    }
    return null;
  }

  function fetchLeaderboardFromServer() {
    return fetch(LEADERBOARD_API, { method: "GET", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then(function (data) {
        applyLeaderboardPayload(data);
        return leaderboardCache;
      })
      .catch(function () {
        leaderboardOnline = false;
        leaderboardCache = getLeaderboardLocal();
        return leaderboardCache;
      });
  }

  function saveScoreAsync(name, sc, ht) {
    const entry = {
      name: String(name || "Аноним").slice(0, 16),
      score: sc | 0,
      height: ht | 0,
    };
    return fetch(LEADERBOARD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("post failed");
        return res.json();
      })
      .then(function (data) {
        applyLeaderboardPayload(data);
        return leaderboardCache;
      })
      .catch(function () {
        leaderboardOnline = false;
        return saveScoreLocal(entry.name, entry.score, entry.height);
      });
  }

  function updateFinalRankLine(board, playerName, sc, ht) {
    const rankLine = document.getElementById("final-rank-line");
    if (!rankLine || !board || board.length === 0) return;
    const myEntries = board
      .map(function (e, i) { return { e: e, i: i }; })
      .filter(function (x) {
        return x.e.name === playerName && x.e.score === sc && x.e.height === ht;
      });
    if (myEntries.length > 0) {
      const place = myEntries[myEntries.length - 1].i + 1;
      const totalLabel = leaderboardOnline && leaderboardTotalPlayers > 0
        ? leaderboardTotalPlayers + " игроков"
        : board.length + " в топе";
      rankLine.textContent = "Место в таблице: " + place + " из " + totalLabel;
      rankLine.classList.remove("hidden");
    } else if (placeBeyondTop(board, sc, ht)) {
      rankLine.textContent = "Результат сохранён — ниже топ-" + MAX_LEADERBOARD;
      rankLine.classList.remove("hidden");
    }
  }

  function placeBeyondTop(board, sc, ht) {
    if (board.length < MAX_LEADERBOARD) return true;
    const last = board[board.length - 1];
    if (sc > last.score) return true;
    if (sc === last.score && ht > last.height) return true;
    return false;
  }

  function setLeaderboardStatus() {
    const el = document.getElementById("leaderboard-status");
    if (!el) return;
    el.classList.remove("hidden", "lb-online", "lb-offline");
    if (leaderboardOnline) {
      el.textContent = leaderboardTotalPlayers > 0
        ? "Онлайн · игроков в базе: " + leaderboardTotalPlayers
        : "Онлайн · общая таблица";
      el.classList.add("lb-online");
    } else {
      el.textContent = "Оффлайн · показаны сохранённые на этом устройстве";
      el.classList.add("lb-offline");
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function renderLeaderboard() {
    const tbody = document.getElementById("leaderboard-body");
    if (!tbody) return;
    const list = leaderboardCache.length ? leaderboardCache : getLeaderboardLocal();
    if (leaderboardLoading) {
      tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">Загрузка...</td></tr>';
      return;
    }
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="lb-empty">Пока пусто — сыграй первую партию!</td></tr>';
      return;
    }
    tbody.innerHTML = list.slice(0, MAX_LEADERBOARD).map(function (e, i) {
      return "<tr><td>" + (i + 1) + "</td><td>" + escapeHtml(e.name) + "</td><td>" + e.score + "</td><td>" + e.height + "</td></tr>";
    }).join("");
    setLeaderboardStatus();
  }

  function showLeaderboard() {
    const m = document.getElementById("leaderboard");
    if (m) m.classList.remove("hidden");
    leaderboardLoading = true;
    renderLeaderboard();
    fetchLeaderboardFromServer().then(function () {
      leaderboardLoading = false;
      renderLeaderboard();
    });
  }

  function hideLeaderboard() {
    const m = document.getElementById("leaderboard");
    if (m) m.classList.add("hidden");
  }

  function showNamePrompt(onClose) {
    const modal = document.getElementById("name-prompt");
    const input = document.getElementById("name-input");
    const submit = document.getElementById("name-submit");
    const cancel = document.getElementById("name-cancel");
    if (!modal || !input || !submit) return;
    input.value = getPlayerName();
    modal.classList.remove("hidden");
    setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 30);

    const finish = function (saved) {
      modal.classList.add("hidden");
      cleanup();
      if (typeof onClose === "function") onClose(saved ? getPlayerName() : null);
    };
    const doSubmit = function () { setPlayerNameValue(input.value); finish(true); };
    const doCancel = function () { finish(false); };
    const onKey = function (e) {
      if (e.key === "Enter") { e.preventDefault(); doSubmit(); }
      else if (e.key === "Escape") { e.preventDefault(); doCancel(); }
    };
    function cleanup() {
      submit.removeEventListener("click", doSubmit);
      if (cancel) cancel.removeEventListener("click", doCancel);
      input.removeEventListener("keydown", onKey);
    }
    submit.addEventListener("click", doSubmit);
    if (cancel) cancel.addEventListener("click", doCancel);
    input.addEventListener("keydown", onKey);
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

  function startGame(mode) {
    if (mode !== "levels" && mode !== "arcade") return;
    lastGameMode = mode;
    if (startLevelsBtn) startLevelsBtn.classList.toggle("mode-selected", mode === "levels");
    if (startArcadeBtn) startArcadeBtn.classList.toggle("mode-selected", mode === "arcade");
    const name = commitPlayerNameFromOverlay();
    if (!name) {
      promptPlayerNameRequired();
      return;
    }
    actuallyStartGame(mode);
  }

  function actuallyStartGame(mode) {
    gameMode = mode === "levels" ? "levels" : "arcade";
    resetGame();
    state = "playing";
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    gameoverEl.classList.remove("visible");
    gameoverEl.classList.add("hidden");
    setPlayingUi(true);
    startMusic();
    updateModeHud();
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
    const sucking = gameMode === "levels" && levelTransitionTimer > 0;
    if (sucking && player.suckAlpha <= 0.02) return;
    const pal = getSkinPalette();
    const screenY = player.y - cameraY;
    const sx = player.squash;
    const sy = 2 - player.squash;
    const wobble = player.earWobble;
    const t = player.blinkTimer;

    ctx.save();
    ctx.translate(player.x, screenY);
    if (sucking) ctx.globalAlpha = player.suckAlpha;
    if (sucking) ctx.rotate(player.suckSpin);

    const shadowScale = sucking ? Math.max(0.15, player.squash) : 1;
    ctx.fillStyle = "rgba(0,0,0," + (sucking ? 0.15 * player.suckAlpha : 0.25) + ")";
    ctx.beginPath();
    ctx.ellipse(0, 22, 22 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.scale(player.facing * sx, sy);

    drawChinchillaBody(ctx, pal, t, wobble, selectedHat);

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

    for (const c of cannons) {
      if (c.dead) continue;
      for (const b of beams) {
        if (pointHitsBeam(b, c.x, c.y, 34)) {
          c.dead = true;
          spawnLaserBurst(c.x, c.y, "rgba(255,140,80,0.95)");
          score += 80;
          updateHud();
          break;
        }
      }
    }

    for (const cb of cannonballs) {
      if (cb.dead) continue;
      for (const b of beams) {
        if (pointHitsBeam(b, cb.x, cb.y, cb.r)) {
          cb.dead = true;
          spawnLaserBurst(cb.x, cb.y, "rgba(255,140,80,0.95)");
          break;
        }
      }
    }

    if (snake && !snake.dead) {
      for (const b of beams) {
        if (pointHitsBeam(b, snake.head.x, snake.head.y, 14)) {
          damageSnake(1, snake.head.x, snake.head.y);
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
  function drawSnake() {
    if (!snake) return;
    const fade = snake.dead ? Math.max(0, 1 - (snake.fadeOut || 0)) : 1;
    if (fade <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = fade;

    const segs = snake.segments;
    const head = snake.head;

    for (let i = segs.length - 1; i >= 0; i -= 1) {
      const seg = segs[i];
      const sy = seg.y - cameraY;
      if (sy < -40 || sy > H + 40) continue;
      const prev = i === 0 ? head : segs[i - 1];
      const ang = Math.atan2(prev.y - seg.y, prev.x - seg.x);
      const r = 9 - i * 0.25;
      const phase = snake.slither + i * 0.4;

      ctx.save();
      ctx.translate(seg.x, sy);
      ctx.rotate(ang);

      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(1, 2, r + 1, (r + 1) * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyDark = snake.hitFlash > 0 ? "#7ac060" : "#0f2a14";
      const bodyMid = snake.hitFlash > 0 ? "#a8df80" : "#1d4621";
      const bodyLight = snake.hitFlash > 0 ? "#cef0a0" : "#356b32";

      ctx.fillStyle = bodyDark;
      ctx.beginPath();
      ctx.ellipse(0, 0, r + 1, (r + 1) * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyMid;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bodyLight;
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.7, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      const scaleA = "rgba(8,20,8,0.75)";
      ctx.fillStyle = scaleA;
      const sCount = 3;
      for (let k = 0; k < sCount; k += 1) {
        const sx = -r * 0.55 + (r * 0.55) * k;
        ctx.beginPath();
        ctx.arc(sx, Math.sin(phase + k) * 1.2, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#8a7028";
      ctx.beginPath();
      ctx.ellipse(0, r * 0.55, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    const hsy = head.y - cameraY;
    if (hsy > -50 && hsy < H + 50) {
      const ang = Math.atan2(head.vy, head.vx || 0.001);
      ctx.save();
      ctx.translate(head.x, hsy);
      ctx.rotate(ang);

      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(2, 4, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      const headDark = snake.hitFlash > 0 ? "#7ac060" : "#0a1e0d";
      const headMid = snake.hitFlash > 0 ? "#a8df80" : "#1c4520";
      const headLight = snake.hitFlash > 0 ? "#cef0a0" : "#356a32";

      ctx.fillStyle = headDark;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = headMid;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13.5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = headLight;
      ctx.beginPath();
      ctx.ellipse(-2, -3.5, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a1208";
      ctx.beginPath();
      ctx.ellipse(7, 4, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a7028";
      ctx.beginPath();
      ctx.ellipse(6.5, 3.6, 3.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff7a0";
      ctx.beginPath();
      ctx.arc(5, -4.5, 3, 0, Math.PI * 2);
      ctx.arc(5, 4.5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.ellipse(5.6, -4.5, 1.0, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(5.6, 4.5, 1.0, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(6.3, -5.3, 0.6, 0, Math.PI * 2);
      ctx.arc(6.3, 3.7, 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(13, -1);
      ctx.lineTo(15, -2);
      ctx.lineTo(13, -3.5);
      ctx.closePath();
      ctx.moveTo(13, 1);
      ctx.lineTo(15, 2);
      ctx.lineTo(13, 3.5);
      ctx.closePath();
      ctx.fill();

      const tongueOut = (Math.sin(snake.tongueT) + 1) * 4 + 6;
      const tongueWave = Math.sin(snake.tongueT * 2) * 1.5;
      ctx.strokeStyle = "#d8366a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(11, 0);
      ctx.quadraticCurveTo(11 + tongueOut * 0.6, tongueWave, 11 + tongueOut, -1.8);
      ctx.moveTo(11 + tongueOut * 0.7, tongueWave * 0.5);
      ctx.lineTo(11 + tongueOut, 1.8);
      ctx.stroke();

      if (snake.eatPulse > 0) {
        const ep = snake.eatPulse / 24;
        ctx.strokeStyle = "rgba(255,180,80," + (ep * 0.7).toFixed(2) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18 + (1 - ep) * 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    if (!snake.dead && snake.hp < SNAKE_HP) {
      const bx = head.x;
      const by = head.y - cameraY - 26;
      const bw = 38;
      const ratio = snake.hp / SNAKE_HP;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx - bw / 2 - 1, by - 1, bw + 2, 5);
      ctx.fillStyle = "#4d9a3f";
      ctx.fillRect(bx - bw / 2, by, bw * ratio, 3);
    }

    ctx.restore();
  }

  function drawCannons() {
    for (const c of cannons) {
      const sy = c.y - cameraY;
      if (sy < -120 || sy > H + 120) continue;
      ctx.save();
      ctx.translate(c.x, sy);

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(0, 30, 34, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#5a3a1c";
      ctx.beginPath();
      ctx.moveTo(-26, 30);
      ctx.lineTo(26, 30);
      ctx.lineTo(22, 8);
      ctx.lineTo(-22, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3e260f";
      ctx.fillRect(-24, 8, 48, 4);
      ctx.fillStyle = "#7a4e28";
      ctx.fillRect(-22, 10, 44, 2);

      ctx.fillStyle = "#3a2412";
      ctx.fillRect(-20, 13, 3, 14);
      ctx.fillRect(17, 13, 3, 14);

      for (let i = -16; i <= 16; i += 16) {
        ctx.fillStyle = "#1a1a1a";
        ctx.beginPath();
        ctx.arc(i, 30, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a2818";
        ctx.beginPath();
        ctx.arc(i, 30, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#1a1208";
        ctx.lineWidth = 1.2;
        for (let s = 0; s < 6; s += 1) {
          const a = s * (Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(i, 30);
          ctx.lineTo(i + Math.cos(a) * 7, 30 + Math.sin(a) * 7);
          ctx.stroke();
        }
        ctx.fillStyle = "#c9a060";
        ctx.beginPath();
        ctx.arc(i, 30, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.rotate(c.aimAngle);
      const recoil = c.recoil || 0;

      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(20 - recoil, 6, 28, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      const barrelGrad = ctx.createLinearGradient(0, -16, 0, 16);
      barrelGrad.addColorStop(0, "#3a3a40");
      barrelGrad.addColorStop(0.5, "#1a1a1e");
      barrelGrad.addColorStop(1, "#0a0a0c");
      ctx.fillStyle = barrelGrad;
      ctx.beginPath();
      ctx.moveTo(-12 - recoil, -16);
      ctx.lineTo(46 - recoil, -14);
      ctx.lineTo(46 - recoil, 14);
      ctx.lineTo(-12 - recoil, 16);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-12 - recoil, -14, 58, 3);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-12 - recoil, 11, 58, 3);

      ctx.fillStyle = "#2a2a30";
      ctx.fillRect(-2 - recoil, -17, 5, 34);
      ctx.fillRect(18 - recoil, -16, 5, 32);
      ctx.fillRect(38 - recoil, -15, 5, 30);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-2 - recoil, -17, 5, 1.5);
      ctx.fillRect(18 - recoil, -16, 5, 1.5);
      ctx.fillRect(38 - recoil, -15, 5, 1.5);

      ctx.fillStyle = "#7a6028";
      for (let r = 0; r < 3; r += 1) {
        ctx.beginPath();
        ctx.arc(8 - recoil + r * 14, -10, 1.4, 0, Math.PI * 2);
        ctx.arc(8 - recoil + r * 14, 10, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#2a1a0a";
      ctx.beginPath();
      ctx.ellipse(-14 - recoil, 0, 4, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3a18";
      ctx.beginPath();
      ctx.ellipse(-12 - recoil, 0, 2, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0a0a0c";
      ctx.beginPath();
      ctx.arc(48 - recoil, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a20";
      ctx.beginPath();
      ctx.arc(48 - recoil, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      const muzzleGrad = ctx.createRadialGradient(48 - recoil, 0, 1, 48 - recoil, 0, 8);
      muzzleGrad.addColorStop(0, "#000");
      muzzleGrad.addColorStop(1, "#1a1a20");
      ctx.fillStyle = muzzleGrad;
      ctx.beginPath();
      ctx.arc(48 - recoil, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      if (recoil > 1.5) {
        ctx.fillStyle = "rgba(255,180,80," + (recoil / 6).toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(54 - recoil, 0, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#3a2412";
      ctx.fillRect(-8, -3, 6, 6);
      ctx.fillStyle = "#6a4828";
      ctx.fillRect(-8, -3, 6, 2);

      ctx.restore();
    }
  }

  function drawCannonballs() {
    for (const b of cannonballs) {
      const sy = b.y - cameraY;
      if (sy < -40 || sy > H + 40) continue;
      ctx.save();
      ctx.translate(b.x, sy);

      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, b.r * 2.4);
      glow.addColorStop(0, "rgba(255,160,60,0.8)");
      glow.addColorStop(0.5, "rgba(255,100,30,0.35)");
      glow.addColorStop(1, "rgba(255,60,20,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 2.4, 0, Math.PI * 2);
      ctx.fill();

      const ballGrad = ctx.createRadialGradient(-b.r * 0.4, -b.r * 0.4, 1, 0, 0, b.r);
      ballGrad.addColorStop(0, "#5a5a60");
      ballGrad.addColorStop(0.5, "#2a2a30");
      ballGrad.addColorStop(1, "#08080a");
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(-b.r * 0.4, -b.r * 0.4, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffd060";
      ctx.beginPath();
      ctx.arc(-Math.cos(b.spin) * b.r * 0.95, -Math.sin(b.spin) * b.r * 0.95, b.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff7a20";
      ctx.beginPath();
      ctx.arc(-Math.cos(b.spin + 0.4) * b.r * 1.1, -Math.sin(b.spin + 0.4) * b.r * 1.1, b.r * 0.22, 0, Math.PI * 2);
      ctx.fill();

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
    ctx.save();
    ctx.translate(-cameraX, 0);
    drawFoxes();
    drawPlatforms();
    drawSquirrels();
    drawHay();
    drawApples();
    drawRockets();
    drawShields();
    drawLasers();
    drawSaws();
    drawCannons();
    drawKnives();
    drawCannonballs();
    drawSnake();
    drawParticles();
    drawBossFox();
    drawPortal();
    drawRocketAura();
    drawChinchilla();
    drawShieldAura();
    drawLaserBeams();
    ctx.restore();
    drawPortalGuide();
    drawLevelPortalMarker();
    drawBossHpBar();
    drawDoubleJumpIndicator();
    drawLives();
    drawPowerupTimers();
    drawLevelBanner();
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
    updateCannons();
    updateKnives();
    updateCannonballs();
    updateSnake();
    updateSquirrels();
    updateParticles();
    if (gameMode === "levels") {
      updateBossFox();
      updateLevelTransition();
    } else {
      ensurePlatforms();
      ensureHazards();
    }
    updateHud();
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  function isModalOpen() {
    const lb = document.getElementById("leaderboard");
    const np = document.getElementById("name-prompt");
    return (lb && !lb.classList.contains("hidden")) || (np && !np.classList.contains("hidden"));
  }

  function isTextInputFocused() {
    const el = document.activeElement;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || el.isContentEditable;
  }

  window.addEventListener("keydown", (e) => {
    if (isTextInputFocused() || isModalOpen()) return;
    keys.add(e.key);
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      if (state === "over") startGame(lastGameMode);
      else if (state === "playing") jump();
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
    if (state === "over") startGame(lastGameMode);
    else if (state === "playing" && !useMobileControls()) jump();
  });

  canvas.addEventListener("touchstart", (e) => {
    if (state === "over") {
      e.preventDefault();
      startGame(lastGameMode);
      return;
    }
    if (useMobileControls()) e.preventDefault();
  }, { passive: false });

  const startLevelsBtn = document.getElementById("start-levels-btn");
  const startArcadeBtn = document.getElementById("start-arcade-btn");
  const restartLevelsBtn = document.getElementById("restart-levels-btn");
  const restartArcadeBtn = document.getElementById("restart-arcade-btn");
  if (startLevelsBtn) {
    startLevelsBtn.addEventListener("click", function () { startGame("levels"); });
    startLevelsBtn.classList.add("mode-selected");
    lastGameMode = "levels";
  }
  if (startArcadeBtn) startArcadeBtn.addEventListener("click", function () { startGame("arcade"); });
  if (restartLevelsBtn) restartLevelsBtn.addEventListener("click", function () { startGame("levels"); });
  if (restartArcadeBtn) restartArcadeBtn.addEventListener("click", function () { startGame("arcade"); });

  const lbBtn = document.getElementById("leaderboard-btn");
  const lbBtn2 = document.getElementById("leaderboard-btn-2");
  const lbClose = document.getElementById("leaderboard-close");
  const lbRename = document.getElementById("leaderboard-rename");
  if (lbBtn) lbBtn.addEventListener("click", showLeaderboard);
  if (lbBtn2) lbBtn2.addEventListener("click", showLeaderboard);
  if (lbClose) lbClose.addEventListener("click", hideLeaderboard);
  if (lbRename) lbRename.addEventListener("click", function () {
    hideLeaderboard();
    const overlayInp = getPlayerNameInputEl();
    if (overlayInp && overlay && !overlay.classList.contains("hidden")) {
      try { overlayInp.focus(); overlayInp.select(); } catch (e) {}
      return;
    }
    showNamePrompt(function () { showLeaderboard(); });
  });
  document.getElementById("leaderboard").addEventListener("click", function (e) {
    if (e.target.id === "leaderboard") hideLeaderboard();
  });

  const playerNameInput = getPlayerNameInputEl();
  if (playerNameInput) {
    playerNameInput.addEventListener("input", function () {
      if (playerNameInput.value.trim()) {
        playerNameInput.classList.remove("name-required");
        const hint = document.getElementById("player-name-hint");
        if (hint) hint.classList.add("hidden");
      }
    });
    playerNameInput.addEventListener("blur", function () {
      if (playerNameInput.value.trim()) commitPlayerNameFromOverlay();
    });
    playerNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitPlayerNameFromOverlay();
      }
    });
  }
  refreshPlayerNameDisplay();
  bindCosmeticButtons();
  leaderboardCache = getLeaderboardLocal();
  fetchLeaderboardFromServer();

  resetGame();
  loop();

  function unlockAudio() { startMusic(); }
  window.addEventListener("click", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
})();