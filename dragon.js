/* =========================================================
   Dragon Flight — fly Mohit Gora's dragon, burn the banners,
   survive the frost army, slay the Frost Wyrm, unlock repos.
   Pure canvas + WebAudio, no libraries.
   ========================================================= */
(() => {
  "use strict";

  /* ================= Data ================= */
  const REPOS = [
    { name: "cloud", title: "Cloud-Native LLM Microservice", url: "https://github.com/mohitgora950/cloud",
      desc: "Distilled a teacher LLM into a 70M-param student model and served it on Kubernetes with HPA, zero-downtime rollouts and CI/CD." },
    { name: "professor-rating-app", title: "EduRate", url: "https://github.com/mohitgora950/professor-rating-app",
      desc: "Full-stack, role-based rating & analytics platform: Node.js, Express, MySQL, JWT, Chart.js, Nodemailer." },
    { name: "Local-sign-language", title: "Sign Language Translator", url: "https://github.com/mohitgora950/Local-sign-language",
      desc: "Real-time hand-gesture recognition with MediaPipe + OpenCV that turns signs into text and speech." },
    { name: "phoneBook", title: "PhoneBook", url: "https://github.com/mohitgora950/phoneBook",
      desc: "A lightweight JavaScript contact manager to add, search and organise contacts." },
    { name: "portfolio", title: "This Portfolio", url: "https://github.com/mohitgora950/mohitgora950.github.io",
      desc: "Three.js portfolio and this dragon game, written from scratch in HTML, CSS and JS." },
  ];
  const RANKS = [[0, "Hatchling"], [400, "Fledgling"], [1200, "Drake"], [3000, "Wyvern"], [6000, "Firestorm"], [10000, "Dragonlord"], [16000, "World-Burner"], [25000, "God of Flame"]];
  const COMBO_WORDS = [[10, "DRAGONFIRE"], [7, "INFERNO"], [5, "BLAZE"], [3, "CHAIN"], [2, "COMBO"]];

  /* ================= DOM ================= */
  const $ = (s) => document.querySelector(s);
  const canvas = $("#game"), ctx = canvas.getContext("2d");
  const titleEl = $("#title"), titleText = $("#titleText");
  const startEl = $("#start"), startBtn = $("#startBtn"), bestLine = $("#bestLine");
  const vault = $("#vault"), repoList = $("#repoList"), toastEl = $("#toast");
  const burnedEl = $("#burned"), scoreEl = $("#score"), rankEl = $("#rank"), comboEl = $("#combo"), comboTimeEl = $("#comboTime");
  const hpFill = $("#hpFill"), fuelFill = $("#fuelFill"), fuelBar = $("#fuelBar"), boostRow = $("#boostRow"), powersEl = $("#powers");
  const bossBar = $("#bossBar"), bossFill = $("#bossFill"), announceEl = $("#announce"), hurtEl = $("#hurt");
  const fireBtn = $("#fireBtn"), boostBtn = $("#boostBtn");
  const pausePanel = $("#pausePanel"), overPanel = $("#overPanel"), winPanel = $("#winPanel");
  $("#total").textContent = REPOS.length;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  };

  const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (isTouch) {
    document.body.classList.add("touch");
    const desk = document.querySelector("#startHint .desk");
    if (desk) desk.innerHTML = "<b>Drag</b> to fly · hold <b>🔥</b> to breathe fire · tap <b>💨</b> to dash";
  }

  let best = store.get("dragonBest", 0);
  const unlocked = new Set(store.get("dragonUnlocked", []));
  if (best > 0) bestLine.textContent = `🏆 Your best: ${best.toLocaleString()}. Can you beat it?`;

  repoList.innerHTML = REPOS.map((r, i) => `
    <a class="repo ${unlocked.has(i) ? "open" : "locked"}" id="repo-${i}" href="${r.url}" target="_blank" rel="noopener">
      <span class="name"><i class="fa-solid ${unlocked.has(i) ? "fa-fire" : "fa-lock"}"></i>${r.title}</span>
      <span class="desc">${r.desc}</span>
    </a>`).join("");

  /* ================= Utils ================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sprite(stops, size = 64) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const SPR = {
    core: sprite([[0, "rgba(255,255,240,1)"], [0.3, "rgba(255,240,180,.9)"], [1, "rgba(255,200,80,0)"]]),
    yellow: sprite([[0, "rgba(255,230,140,1)"], [0.35, "rgba(255,180,60,.8)"], [1, "rgba(255,120,20,0)"]]),
    orange: sprite([[0, "rgba(255,170,70,.95)"], [0.4, "rgba(240,90,20,.7)"], [1, "rgba(200,40,10,0)"]]),
    red: sprite([[0, "rgba(220,70,20,.8)"], [0.45, "rgba(150,25,8,.5)"], [1, "rgba(80,10,5,0)"]]),
    bcore: sprite([[0, "rgba(245,250,255,1)"], [0.3, "rgba(190,230,255,.9)"], [1, "rgba(120,190,255,0)"]]),
    bmid: sprite([[0, "rgba(140,210,255,1)"], [0.4, "rgba(70,140,255,.75)"], [1, "rgba(40,80,255,0)"]]),
    bout: sprite([[0, "rgba(90,110,255,.85)"], [0.45, "rgba(80,40,220,.5)"], [1, "rgba(50,20,150,0)"]]),
    smoke: sprite([[0, "rgba(55,48,46,.6)"], [0.5, "rgba(36,30,30,.32)"], [1, "rgba(20,18,18,0)"]]),
    ember: sprite([[0, "rgba(255,230,170,1)"], [0.3, "rgba(255,140,50,.8)"], [1, "rgba(255,80,20,0)"]], 32),
    redeye: sprite([[0, "rgba(255,240,180,1)"], [0.25, "rgba(255,90,20,.9)"], [1, "rgba(200,0,0,0)"]], 64),
    frost: sprite([[0, "rgba(225,245,255,1)"], [0.35, "rgba(150,210,240,.6)"], [1, "rgba(100,160,220,0)"]], 32),
    frostBig: sprite([[0, "rgba(180,230,255,.6)"], [0.4, "rgba(90,170,255,.22)"], [1, "rgba(60,120,255,0)"]], 128),
    glow: sprite([[0, "rgba(255,150,60,.55)"], [0.4, "rgba(255,90,30,.18)"], [1, "rgba(255,60,20,0)"]], 256),
    heal: sprite([[0, "rgba(255,120,130,.9)"], [0.4, "rgba(255,60,80,.35)"], [1, "rgba(255,40,60,0)"]], 64),
    gem: sprite([[0, "rgba(200,255,200,.9)"], [0.4, "rgba(80,230,140,.35)"], [1, "rgba(40,200,120,0)"]], 64),
  };
  const cloudSprite = (() => {
    const c = document.createElement("canvas");
    c.width = 520; c.height = 200;
    const g = c.getContext("2d"), r = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const rad = 30 + r() * 58, x = 100 + rad + r() * (320 - rad * 2), y = 100 + (r() - 0.5) * (180 - rad * 2) * 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(46,40,48,.55)"); gr.addColorStop(1, "rgba(30,26,32,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return c;
  })();

  /* ================= Audio (procedural) ================= */
  const Sound = (() => {
    let ac = null, master = null, noiseBuf = null, fireGain = null, muted = store.get("dragonMuted", false);
    const lastPlay = {};
    function init() {
      if (ac) { if (ac.state === "suspended") ac.resume(); return; }
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.45; master.connect(ac.destination);
        const len = ac.sampleRate * 2; noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100;
        const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 120;
        fireGain = ac.createGain(); fireGain.gain.value = 0;
        src.connect(lp).connect(hp).connect(fireGain).connect(master); src.start();
      } catch { ac = null; }
    }
    function throttle(k, ms) { const n = performance.now(); if (lastPlay[k] && n - lastPlay[k] < ms) return true; lastPlay[k] = n; return false; }
    function noise(dur, f0, f1, vol, delay = 0) {
      if (!ac) return;
      const t = ac.currentTime + delay, src = ac.createBufferSource(); src.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + dur + 0.05);
    }
    function tone(f0, f1, dur, vol, type = "sine", delay = 0) {
      if (!ac) return;
      const t = ac.currentTime + delay, o = ac.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      init,
      fire(on) { if (ac && fireGain) fireGain.gain.setTargetAtTime(on ? 0.32 : 0, ac.currentTime, 0.06); },
      roar(pitch = 1) { tone(120 * pitch, 42 * pitch, 1.3, 0.5, "sawtooth"); tone(180 * pitch, 60 * pitch, 1.0, 0.25, "square", 0.05); noise(1.2, 900, 120, 0.5); },
      boom() { if (throttle("boom", 60)) return; noise(0.5, 2400, 90, 0.55); tone(90, 35, 0.35, 0.3, "triangle"); },
      small() { if (throttle("small", 40)) return; noise(0.18, 3000, 400, 0.22); },
      hit() { tone(110, 40, 0.3, 0.55, "triangle"); noise(0.2, 900, 150, 0.35); },
      pickup() { tone(660, 660, 0.09, 0.22); tone(990, 990, 0.12, 0.22, "sine", 0.08); tone(1320, 1320, 0.16, 0.18, "sine", 0.16); },
      rank() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.5, 0.16, "triangle", i * 0.09)); },
      dash() { noise(0.35, 4000, 300, 0.35); },
      shoot() { if (throttle("shoot", 90)) return; tone(1400, 500, 0.08, 0.05, "square"); },
      ice() { if (throttle("ice", 120)) return; tone(2000, 1200, 0.12, 0.06, "sine"); noise(0.12, 6000, 2000, 0.08); },
      melt() { if (throttle("melt", 70)) return; noise(0.12, 5000, 1500, 0.12); },
      toggle() { muted = !muted; store.set("dragonMuted", muted); if (master) master.gain.value = muted ? 0 : 0.45; return muted; },
      get muted() { return muted; },
    };
  })();
  $("#muteBtn").innerHTML = `<i class="fa-solid ${Sound.muted ? "fa-volume-xmark" : "fa-volume-high"}"></i>`;

  /* ================= World / resize ================= */
  let W = 0, H = 0, DPR = 1, S = 1, DS = 1, worldW = 3000, groundY = 0;
  let ridgeFar = [], ridgeNear = [], castles = [], towers = [], clouds = [];
  const STEP = 36;

  function makeRidge(len, base, amp, seed) {
    const r = mulberry32(seed), out = [], p1 = r() * 10, p2 = r() * 10;
    for (let i = 0; i <= len / STEP + 2; i++) {
      const x = i * STEP;
      out.push(base - Math.abs(Math.sin(x * 0.0016 + p1)) * amp - Math.sin(x * 0.0047 + p2) * amp * 0.35 - r() * amp * 0.12);
    }
    return out;
  }
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = clamp(Math.min(H / 820, W / 700), 0.5, 1.15);
    DS = S * 1.32;
    worldW = Math.max(W * 3.6, 3600);
    groundY = H * 0.9;
    ridgeFar = makeRidge(W + (worldW - W) * 0.15 + 200, H * 0.72, H * 0.3, 11);
    ridgeNear = makeRidge(W + (worldW - W) * 0.35 + 200, H * 0.82, H * 0.22, 23);
    const r = mulberry32(41);
    castles = [];
    const castleLen = W + (worldW - W) * 0.55;
    for (let x = 120; x < castleLen; x += 380 + r() * 240) castles.push({ x, w: 60 + r() * 90, h: H * (0.08 + r() * 0.12), towers: 2 + Math.floor(r() * 3), seed: r() });
    const xs = [0.28, 0.43, 0.58, 0.72, 0.87], hs = [0.5, 0.6, 0.44, 0.57, 0.5];
    const prev = towers;
    towers = REPOS.map((repo, i) => ({ i, repo, x: worldW * xs[i], top: groundY - H * hs[i], w: 70 * S, heat: prev[i] ? prev[i].heat : 0, burned: prev[i] ? prev[i].burned : false }));
    if (!clouds.length) for (let i = 0; i < 9; i++) clouds.push({ x: rand(0, W * 2), y: rand(H * 0.02, H * 0.35), s: rand(0.8, 2), v: rand(4, 14) });
  }
  window.addEventListener("resize", resize);
  resize();
  const bannerRect = (t) => ({ x: t.x + 4 * S, y: t.top - 62 * S, w: 104 * S, h: 54 * S });

  /* ================= Dragon ================= */
  const N = 36;
  const dragon = { p: [], vx: 0, vy: 0, jaw: 0.05, headAngle: 0, flap: 0, breathing: false, roar: 0, heat: 0 };
  const segLen = () => 10 * DS;
  function resetDragon(x, y) {
    dragon.p = [];
    for (let i = 0; i < N; i++) dragon.p.push({ x: x - i * segLen(), y: y + Math.sin(i * 0.5) * 6 });
    dragon.vx = 0; dragon.vy = 0;
  }
  function bodyWidth(i) {
    if (i < 6) return (6.5 + i * 2.4) * DS;
    return (21 * Math.pow(1 - (i - 6) / (N - 6), 1.2) + 1.4) * DS;
  }
  function localToWorld(lx, ly, scale) {
    const d = dragon, h = d.p[0], flip = Math.cos(d.headAngle) < 0 ? -1 : 1;
    const c = Math.cos(d.headAngle), s = Math.sin(d.headAngle);
    const x = lx * scale, y = ly * scale * flip;
    return { x: h.x + x * c - y * s, y: h.y + x * s + y * c };
  }
  const HSCALE = () => DS * 1.1;
  const mouthPos = () => localToWorld(56, 3 + dragon.jaw * 7, HSCALE());
  const eyePos = () => localToWorld(27, -9, HSCALE());
  const nosePos = () => localToWorld(52, -5, HSCALE());

  /* ================= State ================= */
  let state = "intro", tIntro = 0, time = 0, paused = false, timeScale = 1, slowT = 0;
  let camX = 0, shake = 0, hurtFlash = 0;
  let score = 0, shownScore = -1, combo = 0, comboT = 0, rankIdx = 0, playTime = 0, burnedCount = 0, lastFire = -9;
  let boss = null, bossDone = false, endless = false;
  const P = { hp: 100, fuel: 100, locked: false, invuln: 0, lastHit: -99, boostCd: 0, boostT: 0, inferno: 0, infinite: 0 };
  const fire = [], smoke = [], sparks = [], embers = [], bits = [], enemies = [], shots = [], pickups = [], texts = [], rings = [];
  const spawn = { raven: 1.5, archer: 6, wraith: 18 };
  let lightning = { next: 3.5, life: 0, flash: 0, pts: [] };
  const input = { mx: 0, my: 0, mouseActive: false, firing: false, keys: new Set(), touchId: null, tx: 0, ty: 0, boost: false };

  for (let i = 0; i < 70; i++) embers.push({ x: Math.random(), y: Math.random(), v: rand(0.02, 0.07), s: rand(0.6, 1.8), ph: rand(0, 6.28), frost: Math.random() < 0.35 });
  resetDragon(-200 * DS, H * 0.56);

  /* ================= Input ================= */
  canvas.addEventListener("pointerdown", (e) => {
    if (state === "intro") { skipIntro(); return; }
    if (state === "ready") { startGame(); return; }
    if (paused) return;
    if (e.pointerType === "mouse") {
      input.mouseActive = true; input.mx = e.clientX; input.my = e.clientY;
      if (e.button === 0) input.firing = true;
      if (e.button === 2) input.boost = true;
    } else { input.touchId = e.pointerId; input.tx = e.clientX; input.ty = e.clientY; }
  });
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { input.mouseActive = true; input.mx = e.clientX; input.my = e.clientY; }
    else if (e.pointerId === input.touchId) { input.tx = e.clientX; input.ty = e.clientY; }
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse" && e.button === 0) input.firing = false;
    if (e.pointerId === input.touchId) input.touchId = null;
  });
  window.addEventListener("pointercancel", (e) => { if (e.pointerId === input.touchId) input.touchId = null; });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("blur", () => { input.firing = false; input.keys.clear(); if (state === "play") setPaused(true); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") setPaused(true); });

  function holdBtn(btn, on, off) {
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); btn.classList.add("active"); on(); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, (e) => { e.preventDefault(); btn.classList.remove("active"); off && off(); }));
  }
  holdBtn(fireBtn, () => (input.firing = true), () => (input.firing = false));
  holdBtn(boostBtn, () => (input.boost = true));

  const KEYMAP = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
  window.addEventListener("keydown", (e) => {
    if (state === "intro" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); skipIntro(); return; }
    if (state === "ready" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); startGame(); return; }
    if (state === "over" && (e.code === "KeyR" || e.code === "Space" || e.code === "Enter")) { e.preventDefault(); retry(); return; }
    if (e.code === "KeyP" || e.code === "Escape") { if (state === "play") setPaused(!paused); return; }
    if (e.code === "KeyM") { toggleMute(); return; }
    if (paused) return;
    if (e.code === "Space") { e.preventDefault(); input.firing = true; }
    if ((e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "KeyE") && !e.repeat) input.boost = true;
    if (KEYMAP[e.code]) { e.preventDefault(); input.keys.add(KEYMAP[e.code]); input.mouseActive = false; }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") input.firing = false;
    if (KEYMAP[e.code]) input.keys.delete(KEYMAP[e.code]);
  });

  startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
  $("#vaultToggle").addEventListener("click", () => vault.classList.toggle("collapsed"));
  $("#pauseBtn").addEventListener("click", () => setPaused(!paused));
  $("#resumeBtn").addEventListener("click", () => setPaused(false));
  $("#muteBtn").addEventListener("click", toggleMute);
  $("#retryBtn").addEventListener("click", retry);
  $("#endlessBtn").addEventListener("click", () => { winPanel.classList.remove("show"); endless = true; state = "play"; });

  function toggleMute() {
    Sound.init();
    const m = Sound.toggle();
    $("#muteBtn").innerHTML = `<i class="fa-solid ${m ? "fa-volume-xmark" : "fa-volume-high"}"></i>`;
  }
  function setPaused(v) {
    if (state !== "play" && v) return;
    paused = v;
    pausePanel.classList.toggle("show", v);
    input.firing = false;
    Sound.fire(false);
    $("#pauseBtn").innerHTML = `<i class="fa-solid ${v ? "fa-play" : "fa-pause"}"></i>`;
  }

  /* ================= Flow ================= */
  let revealDone = false;
  function setReveal(p) {
    p = clamp(p, 0, 1);
    titleText.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    titleText.style.webkitClipPath = titleText.style.clipPath;
    if (p >= 1 && !revealDone) {
      revealDone = true;
      titleText.classList.add("lit");
      setTimeout(() => titleEl.classList.add("show-sub"), 250);
      setTimeout(() => { if (state === "intro") state = "ready"; startEl.classList.add("show"); }, 900);
    }
  }
  function skipIntro() {
    if (revealDone) { if (state === "ready") startGame(); return; }
    tIntro = Math.max(tIntro, 4.6);
    setReveal(1);
  }
  function startGame() {
    if (state === "play") return;
    Sound.init();
    Sound.roar();
    titleEl.classList.add("gone");
    startEl.classList.remove("show"); startEl.classList.add("gone");
    document.body.classList.add("playing");
    if (W > 900) vault.classList.remove("collapsed");
    resetRun();
    state = "play";
    announce("Chapter I", "Burn the Banners");
  }
  function resetRun() {
    Object.assign(P, { hp: 100, fuel: 100, locked: false, invuln: 1.5, lastHit: -99, boostCd: 0, boostT: 0, inferno: 0, infinite: 0 });
    score = 0; shownScore = -1; combo = 0; comboT = 0; rankIdx = 0; playTime = 0; burnedCount = 0; lastFire = -9;
    boss = null; bossDone = false; endless = false; timeScale = 1; slowT = 0;
    enemies.length = 0; shots.length = 0; pickups.length = 0; texts.length = 0; fire.length = 0; rings.length = 0;
    Object.assign(spawn, { raven: 1.5, archer: 7, wraith: 22 });
    towers.forEach((t) => { t.burned = false; t.heat = 0; });
    burnedEl.textContent = 0;
    rankEl.textContent = RANKS[0][1];
    bossBar.classList.remove("on");
    // tower guards
    towers.forEach((t) => enemies.push(makeArcher(t.x, t.top - 6 * S, true)));
    camX = 0;
    if (state !== "intro" && state !== "ready") resetDragon(W * 0.2, H * 0.45);
  }
  function retry() {
    overPanel.classList.remove("show");
    winPanel.classList.remove("show");
    resetRun();
    resetDragon(W * 0.2, H * 0.45);
    state = "play";
    Sound.init(); Sound.roar(1.1);
    announce("Rise again", "Fly, Dragon");
  }
  let toastTimer;
  function toast(title, text, url) {
    toastEl.innerHTML = `<h3>${title}</h3><p>${text}</p>${url ? `<a href="${url}" target="_blank" rel="noopener">Open repository →</a>` : ""}`;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), url ? 4500 : 3000);
  }
  function announce(small, big, frost) {
    announceEl.querySelector(".a1").textContent = small;
    announceEl.querySelector(".a2").textContent = big;
    announceEl.classList.toggle("frost", !!frost);
    announceEl.classList.remove("show");
    void announceEl.offsetWidth;
    announceEl.classList.add("show");
  }
  function floatText(x, y, text, color = "#ffd27a", size = 18) { texts.push({ x, y, text, color, size: size * Math.max(0.8, S), t: 0, life: 1.1 }); }
  function ring(x, y, max, color = "255,140,60", life = 0.5) { rings.push({ x, y, r: 4, max, t: 0, life, color }); }

  function addScore(base, x, y, isKill = true) {
    if (isKill) { combo = comboT > 0 ? combo + 1 : 1; comboT = 2.6; }
    const mult = isKill ? Math.min(combo, 10) : 1;
    const pts = Math.round(base * mult);
    score += pts;
    floatText(x, y, `+${pts}`, mult >= 5 ? "#ffffff" : "#ffd27a", 16 + Math.min(mult, 10));
    if (isKill && combo >= 2) {
      const word = COMBO_WORDS.find(([n]) => combo >= n)[1];
      comboEl.textContent = `x${mult} ${word}`;
      comboEl.classList.add("on");
      comboEl.classList.remove("pop"); void comboEl.offsetWidth; comboEl.classList.add("pop");
    }
    while (rankIdx < RANKS.length - 1 && score >= RANKS[rankIdx + 1][0]) {
      rankIdx++;
      rankEl.textContent = RANKS[rankIdx][1];
      announce("Rank up", RANKS[rankIdx][1]);
      Sound.rank();
      P.hp = Math.min(100, P.hp + 20);
      ring(dragon.p[0].x, dragon.p[0].y, 260 * S, "255,210,120", 0.7);
    }
  }

  function hurt(dmg) {
    if (state !== "play" || P.invuln > 0 || P.boostT > 0) return;
    P.hp -= dmg; P.invuln = 0.6; P.lastHit = playTime;
    shake = Math.max(shake, 10); hurtFlash = 1;
    if (combo > 1) floatText(dragon.p[0].x, dragon.p[0].y - 40 * S, "COMBO LOST", "#ff7b6b", 14);
    combo = 0; comboT = 0; comboEl.classList.remove("on");
    Sound.hit();
    if (P.hp <= 0) die();
  }
  function die() {
    P.hp = 0; state = "dead"; input.firing = false; Sound.fire(false); Sound.roar(0.6);
    slowT = 1.2; timeScale = 0.35; shake = 18;
    for (let k = 0; k < 60; k++) spawnFire(dragon.p[6].x, dragon.p[6].y, rand(0, 6.28), rand(100, 500), true);
    setTimeout(showOver, 1700);
  }
  function showOver() {
    state = "over";
    const isRecord = score > best;
    if (isRecord) { best = score; store.set("dragonBest", best); }
    $("#oScore").textContent = score.toLocaleString();
    $("#oBest").textContent = best.toLocaleString();
    $("#oRank").textContent = RANKS[rankIdx][1];
    const nudge = $("#nudge");
    nudge.className = "nudge" + (isRecord ? " record" : "");
    const gap = best - score + 1;
    if (isRecord && score > 0) nudge.textContent = "🏆 NEW RECORD! The realm trembles.";
    else if (best === 0) nudge.textContent = "Every legend starts somewhere. Burn a few ravens and fly again!";
    else if (gap <= Math.max(300, best * 0.25)) nudge.textContent = `So close! Only ${gap.toLocaleString()} point${gap === 1 ? "" : "s"} to beat your best. One more flight?`;
    else if (rankIdx < RANKS.length - 1) nudge.textContent = `${(RANKS[rankIdx + 1][0] - score).toLocaleString()} more points to become a ${RANKS[rankIdx + 1][1]}.`;
    else nudge.textContent = "Even legends fall. Rise again.";
    overPanel.classList.add("show");
    bestLine.textContent = `🏆 Your best: ${best.toLocaleString()}`;
  }

  function burnBanner(t) {
    t.burned = true;
    burnedCount++;
    burnedEl.textContent = burnedCount;
    shake = Math.max(shake, 12);
    Sound.boom();
    const b = bannerRect(t);
    for (let k = 0; k < 80; k++) spawnFire(b.x + b.w / 2, b.y + b.h / 2, rand(0, 6.28), rand(80, 460), true);
    ring(b.x + b.w / 2, b.y + b.h / 2, 200 * S);
    addScore(300, b.x + b.w / 2, b.y - 20 * S, false);
    enemies.forEach((e) => { if (e.guard && Math.abs(e.x - t.x) < 10 && !e.dead) killEnemy(e); });
    const el = document.getElementById(`repo-${t.i}`);
    el.classList.remove("locked"); el.classList.add("open", "flash");
    el.querySelector("i").className = "fa-solid fa-fire";
    unlocked.add(t.i); store.set("dragonUnlocked", [...unlocked]);
    toast(`🔥 ${t.repo.title} unlocked`, t.repo.desc, t.repo.url);
    dropPickup(b.x + b.w / 2, b.y, 1);
    if (burnedCount === REPOS.length && !boss && !bossDone) setTimeout(() => { if (state === "play") summonBoss(); }, 1800);
  }

  /* ================= Spawners ================= */
  function makeArcher(x, y, guard = false) { return { type: "archer", x, y, hp: 10, cd: rand(1.2, 2.8), guard, flash: 0, dead: false, aim: 0 }; }
  function spawnRaven() {
    const fromRight = Math.random() < 0.7;
    const diver = playTime > 25 && Math.random() < 0.35;
    enemies.push({ type: "raven", x: camX + (fromRight ? W + 60 : -60), y: rand(H * 0.08, H * 0.62), vx: (fromRight ? -1 : 1) * rand(110, 190) * S, vy: 0, ph: rand(0, 6.28), amp: rand(20, 50), hp: 3, diver, flash: 0, dead: false });
  }
  function spawnWraith() {
    const side = Math.random() < 0.6 ? 1 : -1;
    enemies.push({ type: "wraith", x: camX + (side > 0 ? W + 80 : -80), y: rand(H * 0.15, H * 0.5), hp: 26, cd: rand(2, 3.5), ph: rand(0, 6.28), ang: rand(0, 6.28), flash: 0, dead: false });
  }
  function summonBoss() {
    const bx = camX + W + 300, by = H * 0.3;
    const p = [];
    for (let i = 0; i < 40; i++) p.push({ x: bx + i * 14 * S, y: by });
    boss = { p, hp: 1600, max: 1600, vx: 0, vy: 0, volley: 2.5, breath: 7, breathT: 0, summon: 9, flash: 0, jaw: 0, angle: Math.PI };
    bossBar.classList.add("on");
    bossFill.style.transform = "scaleX(1)";
    announce("Chapter II", "The Frost Wyrm Awakens", true);
    Sound.roar(0.75);
    shake = 16;
    lightning.next = 0;
  }
  function dropPickup(x, y, chance) {
    if (Math.random() > chance) return;
    const r = Math.random();
    const kind = P.hp < 45 && r < 0.45 ? "heal" : r < 0.3 ? "heal" : r < 0.55 ? "infinite" : r < 0.78 ? "inferno" : "gem";
    pickups.push({ kind, x, y, vy: -60, t: 0 });
  }

  /* ================= Particles ================= */
  function spawnFire(x, y, a, sp, noHit = false, extra = {}) {
    fire.push(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(0.45, 0.9), s0: rand(5, 11) * S, s1: rand(28, 54) * S, drag: 1.8, noHit, blue: false, dmg: 1 }, extra));
  }
  function burst(x, y, n, color = "ember", spd = 260) {
    for (let k = 0; k < n; k++) { const a = rand(0, 6.28), s = rand(40, spd); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, age: 0, life: rand(0.3, 0.8), s: rand(4, 10) * S, col: color }); }
  }

  /* ================= Update ================= */
  function update(rawDt) {
    if (slowT > 0) { slowT -= rawDt; if (slowT <= 0) timeScale = 1; }
    const dt = rawDt * timeScale;
    time += dt;
    const d = dragon, head = d.p[0];
    let tx, ty, maxSpeed = 760 * S, steer = 3.4;
    d.breathing = false;

    if (state === "intro" || state === "ready") {
      tIntro += dt;
      const hx = W * (W < 760 ? 0.17 : 0.2), hy = H * 0.5;
      if (state === "intro" && tIntro < 1.8) { tx = hx + 40; ty = hy; maxSpeed = 950 * S; }
      else if (state === "intro" && tIntro < 2.4) {
        tx = hx + 60; ty = hy - 10; d.roar = 1;
        if (tIntro < 1.86) { shake = Math.max(shake, 9); ring(head.x, head.y, 300 * S, "255,120,40", 0.7); }
      }
      else if (state === "intro" && tIntro < 4.6) { tx = hx + 70; ty = hy + Math.sin(tIntro * 2) * 8; d.breathing = true; }
      else { tx = hx + Math.sin(time * 0.9) * 70 * S + 40; ty = hy + Math.sin(time * 1.6) * 40 * S; }
      camX = 0;
    } else if (state === "play") {
      playTime += dt;
      const keys = input.keys;
      const kx = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0);
      const ky = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0);
      if (input.touchId !== null) { tx = input.tx + camX; ty = input.ty; }
      else if (kx || ky) { tx = head.x + kx * 400; ty = head.y + ky * 400; }
      else if (input.mouseActive) { tx = input.mx + camX; ty = input.my; }
      else { tx = head.x + d.vx * 0.3; ty = head.y + Math.sin(time * 1.5) * 20; }

      // fuel
      const canFire = input.firing && (P.infinite > 0 || (!P.locked && P.fuel > 0));
      d.breathing = canFire;
      if (canFire) {
        lastFire = playTime;
        if (P.infinite <= 0) {
          P.fuel -= 24 * dt;
          if (P.fuel <= 0) { P.fuel = 0; P.locked = true; floatText(head.x, head.y - 50 * S, "OVERHEATED!", "#ff7b6b", 16); }
        }
      } else if (playTime - lastFire > 0.3) {
        P.fuel = Math.min(100, P.fuel + 30 * dt);
        if (P.locked && P.fuel >= 35) P.locked = false;
      }
      P.inferno = Math.max(0, P.inferno - dt);
      P.infinite = Math.max(0, P.infinite - dt);
      P.invuln = Math.max(0, P.invuln - dt);
      P.boostCd = Math.max(0, P.boostCd - dt);
      if (playTime - P.lastHit > 4) P.hp = Math.min(100, P.hp + 2.5 * dt);

      // dash
      if (input.boost) {
        input.boost = false;
        if (P.boostCd <= 0) {
          const a = d.headAngle;
          P.boostT = 0.3; P.boostCd = 2.2;
          d.vx = Math.cos(a) * 1700 * S; d.vy = Math.sin(a) * 1700 * S;
          ring(head.x, head.y, 160 * S, "150,210,255", 0.4);
          Sound.dash();
        }
      }
      // combo timer
      if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; comboEl.classList.remove("on"); } }
    } else if (state === "dead") {
      tx = head.x + d.vx * 0.5; ty = groundY; maxSpeed = 500 * S; steer = 1.2;
      if (Math.random() < 0.5) smoke.push({ x: d.p[6].x, y: d.p[6].y, vx: rand(-20, 20), vy: rand(-60, -20), age: 0, life: rand(1, 1.8), s0: 20 * S, s1: 80 * S });
    } else {
      tx = head.x; ty = head.y;
    }

    // steering
    if (P.boostT > 0 && state === "play") {
      P.boostT -= dt;
      if (Math.random() < 0.8) sparks.push({ x: head.x, y: head.y, vx: -d.vx * 0.1, vy: -d.vy * 0.1, age: 0, life: 0.35, s: 14 * S, col: "frost" });
    } else {
      const dx = tx - head.x, dy = ty - head.y, dd = Math.hypot(dx, dy) || 1;
      const want = Math.min(maxSpeed, dd * 3.2);
      const k = Math.min(1, dt * steer);
      d.vx += ((dx / dd) * want - d.vx) * k;
      d.vy += ((dy / dd) * want - d.vy) * k;
      d.vy += Math.sin(time * 2.4) * 18 * S * dt * 4;
    }
    head.x += d.vx * dt; head.y += d.vy * dt;
    head.x = clamp(head.x, state === "play" ? 30 : -400, worldW - 30);
    head.y = clamp(head.y, 50 * S, groundY - 24 * S);

    const sl = segLen();
    for (let i = 1; i < N; i++) {
      const a = d.p[i - 1], b = d.p[i];
      b.y += 26 * S * dt * (i / N);
      const ex = a.x - b.x, ey = a.y - b.y, L = Math.hypot(ex, ey) || 1;
      if (L > sl) { b.x = a.x - (ex / L) * sl; b.y = a.y - (ey / L) * sl; }
    }

    let ang = Math.atan2(head.y - d.p[2].y, head.x - d.p[2].x);
    if (state === "intro" && tIntro > 1.8 && tIntro < 4.6) ang = 0.06;
    let diff = ang - d.headAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    d.headAngle += diff * Math.min(1, dt * 9);

    const jawTarget = d.breathing ? 0.5 : d.roar > 0 ? 0.68 : 0.08 + Math.max(0, Math.sin(time * 0.7)) * 0.06;
    d.jaw = lerp(d.jaw, jawTarget, Math.min(1, dt * 12));
    d.roar = Math.max(0, d.roar - dt * 2.5);
    d.heat = lerp(d.heat, d.breathing ? 1 : 0, Math.min(1, dt * (d.breathing ? 4 : 1.5)));
    const spd = Math.hypot(d.vx, d.vy) / (760 * S);
    d.flap += dt * (5 + spd * 3 + (d.vy < -80 ? 2.5 : 0));

    if (state === "play" || state === "dead") camX = lerp(camX, clamp(head.x - W * 0.42, 0, worldW - W), Math.min(1, dt * 3));
    shake = Math.max(0, shake - rawDt * 24);
    hurtFlash = Math.max(0, hurtFlash - rawDt * 2.5);

    // dragon ambience: nostril smoke, eye trail, crack embers
    if (Math.random() < dt * 14) { const n = nosePos(); smoke.push({ x: n.x, y: n.y, vx: rand(-15, 15) - d.vx * 0.1, vy: rand(-40, -15), age: 0, life: rand(0.7, 1.3), s0: 4 * DS, s1: 26 * DS }); }
    if (Math.random() < dt * 5) { const n = nosePos(); sparks.push({ x: n.x, y: n.y, vx: rand(-20, 20), vy: rand(-60, -20), age: 0, life: 0.5, s: 4 * S, col: "ember" }); }
    if (spd > 0.25 || d.roar > 0) { const e = eyePos(); sparks.push({ x: e.x, y: e.y, vx: 0, vy: 0, age: 0, life: 0.22, s: 9 * DS, col: "red" }); }
    if (Math.random() < dt * (6 + d.heat * 30)) { const i = 3 + Math.floor(Math.random() * 18), q = d.p[i]; sparks.push({ x: q.x, y: q.y, vx: rand(-20, 20), vy: rand(-90, -30), age: 0, life: rand(0.4, 0.9), s: rand(3, 6) * S, col: "ember" }); }

    // breath
    if (d.breathing) {
      const intro = state !== "play";
      const m = mouthPos();
      const blue = P.inferno > 0;
      const count = Math.round((intro ? 14 : 11) * (dt * 60));
      for (let c = 0; c < count; c++) {
        const a = d.headAngle + rand(-0.15, 0.15) + (d.jaw - 0.5) * 0.2;
        const sp = intro ? rand(W * 0.95, W * 1.2) : rand(600, 860) * Math.sqrt(S);
        fire.push({ x: m.x + rand(-3, 3), y: m.y + rand(-3, 3), vx: Math.cos(a) * sp + d.vx * 0.5, vy: Math.sin(a) * sp + d.vy * 0.5, age: 0,
          life: intro ? rand(0.8, 1.05) : rand(0.55, 0.85), s0: rand(5, 10) * S, s1: rand(36, 64) * S * (intro ? 1.3 : 1), drag: intro ? 0.75 : 1.4,
          noHit: intro, blue, dmg: blue ? 2.5 : 1 });
      }
      if (Math.random() < dt * 8) shake = Math.max(shake, 2.5);
    }
    Sound.fire(d.breathing && state === "play" && !paused);
    if (fire.length > 1500) fire.splice(0, fire.length - 1500);

    // burned tower flames + banner heat decay
    towers.forEach((t) => {
      if (!t.burned) { t.heat = Math.max(0, t.heat - dt * 0.4); return; }
      if (Math.random() < dt * 30) { const b = bannerRect(t); spawnFire(b.x + rand(0, b.w * 0.6), b.y + b.h * 0.7, -Math.PI / 2 + rand(-0.2, 0.2), rand(60, 140), true, { drag: 0.5, s1: rand(22, 36) * S }); }
    });

    if (state === "play") spawnEnemies(dt);
    updateEnemies(dt);
    if (boss) updateBoss(dt);
    updateShots(dt);
    updateFire(dt);
    updatePickups(dt);
    updateFx(dt);

    if (state === "intro" && !revealDone && tIntro > 2.4) {
      let front = -Infinity;
      for (const f of fire) if (f.age / f.life < 0.75 && f.x > front) front = f.x;
      const rect = titleText.getBoundingClientRect();
      if (rect.width) setReveal((front - camX - rect.left) / rect.width);
      if (tIntro > 4.4) setReveal(1);
    }

    // lightning
    lightning.next -= dt;
    if (lightning.next <= 0) {
      lightning.next = boss ? rand(2.5, 5) : rand(5, 11);
      lightning.life = 0.32; lightning.flash = 1;
      let x = rand(W * 0.1, W * 0.9), y = 0;
      lightning.pts = [[x, y]];
      while (y < H * 0.62) { y += rand(18, 42); x += rand(-34, 34); lightning.pts.push([x, y]); }
      shake = Math.max(shake, 3);
    }
    lightning.life = Math.max(0, lightning.life - dt);
    lightning.flash = Math.max(0, lightning.flash - dt * 3.2);
    clouds.forEach((c) => { c.x -= c.v * dt; if (c.x < -600) c.x = W * 2 + rand(0, 300); });
  }

  function spawnEnemies(dt) {
    const diff = 1 + playTime / 50 + burnedCount * 0.35;
    const living = (t) => enemies.filter((e) => e.type === t && !e.dead).length;
    spawn.raven -= dt;
    if (spawn.raven <= 0) { spawn.raven = Math.max(0.45, 2.1 / diff) * (boss ? 2 : 1); if (living("raven") < 6 + diff * 2) spawnRaven(); }
    if (playTime > 8) {
      spawn.archer -= dt;
      if (spawn.archer <= 0) { spawn.archer = Math.max(2.4, 7 / diff); if (living("archer") < 2 + diff) enemies.push(makeArcher(camX + rand(W * 0.55, W * 1.15), groundY)); }
    }
    if (playTime > 26 || burnedCount >= 1) {
      spawn.wraith -= dt;
      if (spawn.wraith <= 0) { spawn.wraith = Math.max(4.5, 16 / diff); if (living("wraith") < Math.min(4, 1 + diff * 0.7)) spawnWraith(); }
    }
  }

  function playerHits(x, y, r) {
    const p = dragon.p;
    if (dist(x, y, p[0].x, p[0].y) < r + 14 * DS) return true;
    for (const i of [3, 6, 10, 14, 19]) if (dist(x, y, p[i].x, p[i].y) < r + bodyWidth(i) + 2 * DS) return true;
    return false;
  }

  function updateEnemies(dt) {
    const head = dragon.p[0];
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.flash = Math.max(0, e.flash - dt);
      if (e.dead) { enemies.splice(i, 1); continue; }
      if (e.type === "raven") {
        e.ph += dt * 9;
        if (e.diver && state === "play" && Math.abs(e.x - head.x) < W * 0.6) {
          const a = Math.atan2(head.y - e.y, head.x - e.x), sp = 230 * S;
          e.vx = lerp(e.vx, Math.cos(a) * sp, dt * 1.5); e.vy = lerp(e.vy, Math.sin(a) * sp, dt * 1.5);
          e.x += e.vx * dt; e.y += e.vy * dt;
        } else { e.x += e.vx * dt; e.y += Math.sin(e.ph * 0.25) * e.amp * dt; }
        if (state === "play" && playerHits(e.x, e.y, 8 * S)) {
          if (P.boostT > 0) killEnemy(e); else { hurt(4); e.vx *= -1; }
        }
        if (e.x < camX - 300 || e.x > camX + W + 300) enemies.splice(i, 1);
      } else if (e.type === "archer") {
        const sx = e.x - camX;
        if (!e.guard && sx < -300) { enemies.splice(i, 1); continue; }
        e.aim = Math.atan2(head.y - (e.y - 30 * S), head.x - e.x);
        if (state === "play" && sx > -40 && sx < W + 40) {
          e.cd -= dt;
          if (e.cd <= 0) {
            e.cd = rand(1.6, 2.8) / Math.min(2, 1 + playTime / 120);
            const ox = e.x, oy = e.y - 30 * S, sp = 600 * S;
            const tt = dist(ox, oy, head.x, head.y) / sp;
            const a = Math.atan2(head.y + dragon.vy * tt * 0.5 - oy - 60 * S * tt * tt, head.x + dragon.vx * tt * 0.5 - ox) + rand(-0.05, 0.05);
            shots.push({ type: "arrow", x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 120 * S, life: 3, dmg: 7, r: 4 * S });
            Sound.shoot();
          }
        }
      } else if (e.type === "wraith") {
        e.ph += dt * 3; e.ang += dt * 0.6;
        const R = 280 * S, gx = head.x + Math.cos(e.ang) * R, gy = clamp(head.y + Math.sin(e.ang) * R * 0.6, H * 0.1, groundY - 80 * S);
        const a = Math.atan2(gy - e.y, gx - e.x), sp = 170 * S * (dist(e.x, e.y, gx, gy) > 60 ? 1 : 0.3);
        e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt + Math.sin(e.ph) * 20 * S * dt;
        if (state === "play") {
          e.cd -= dt;
          if (e.cd <= 0 && Math.abs(e.x - camX - W / 2) < W * 0.6) {
            e.cd = rand(2.6, 3.6);
            const base = Math.atan2(head.y - e.y, head.x - e.x);
            for (let k = -1; k <= 1; k++) shots.push({ type: "shard", x: e.x, y: e.y, vx: Math.cos(base + k * 0.18) * 380 * S, vy: Math.sin(base + k * 0.18) * 380 * S, g: 0, life: 3.5, dmg: 9, r: 6 * S });
            Sound.ice();
          }
          if (playerHits(e.x, e.y, 16 * S)) { if (P.boostT > 0) damageEnemy(e, 15); else hurt(10); }
        }
      }
    }
  }

  function updateBoss(dt) {
    const b = boss, head = dragon.p[0], h = b.p[0];
    b.flash = Math.max(0, b.flash - dt);
    const t = time;
    const tx = camX + W * (0.66 + 0.2 * Math.sin(t * 0.55)), ty = H * (0.38 + 0.24 * Math.sin(t * 1.1));
    const dx = tx - h.x, dy = ty - h.y, dd = Math.hypot(dx, dy) || 1, sp = Math.min(420 * S, dd * 2.5);
    b.vx = lerp(b.vx, (dx / dd) * sp, dt * 2); b.vy = lerp(b.vy, (dy / dd) * sp, dt * 2);
    h.x += b.vx * dt; h.y += b.vy * dt;
    const sl = 14 * S;
    for (let i = 1; i < b.p.length; i++) {
      const a = b.p[i - 1], c = b.p[i], ex = a.x - c.x, ey = a.y - c.y, L = Math.hypot(ex, ey) || 1;
      c.y += 20 * S * dt * (i / b.p.length);
      if (L > sl) { c.x = a.x - (ex / L) * sl; c.y = a.y - (ey / L) * sl; }
    }
    // face the player when attacking, else the travel direction
    const want = b.breathT > 0 || b.volley < 0.6 ? Math.atan2(head.y - h.y, head.x - h.x) : Math.atan2(h.y - b.p[2].y, h.x - b.p[2].x);
    let df = want - b.angle; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2;
    b.angle += df * Math.min(1, dt * 5);
    if (state !== "play") return;
    const mx = h.x + Math.cos(b.angle) * 40 * S, my = h.y + Math.sin(b.angle) * 40 * S;
    const rage = b.hp < b.max * 0.4 ? 1.5 : 1;
    b.volley -= dt * rage;
    if (b.volley <= 0) {
      b.volley = 2.3;
      const base = Math.atan2(head.y - my, head.x - mx), n = rage > 1 ? 9 : 7;
      for (let k = 0; k < n; k++) { const a = base + (k - (n - 1) / 2) * 0.13; shots.push({ type: "shard", x: mx, y: my, vx: Math.cos(a) * 430 * S, vy: Math.sin(a) * 430 * S, g: 0, life: 3.5, dmg: 10, r: 7 * S }); }
      Sound.ice();
    }
    b.breath -= dt * rage;
    if (b.breath <= 0) { b.breath = 7.5; b.breathT = 1.8; Sound.roar(1.4); }
    if (b.breathT > 0) {
      b.breathT -= dt;
      for (let k = 0; k < 4; k++) {
        const a = b.angle + rand(-0.14, 0.14), s = rand(500, 700) * S;
        shots.push({ type: "frost", x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0, life: rand(0.6, 0.9), dmg: 12, r: 14 * S, age: 0 });
      }
    }
    b.jaw = lerp(b.jaw, b.breathT > 0 || b.volley < 0.4 ? 0.55 : 0.08, dt * 10);
    b.summon -= dt;
    if (b.summon <= 0) { b.summon = 11; spawnWraith(); spawnWraith(); }
    for (const i of [0, 6, 12, 18, 24]) if (playerHits(b.p[i].x, b.p[i].y, 20 * S)) hurt(18);
  }

  function damageEnemy(e, dmg) {
    e.hp -= dmg; e.flash = 0.08;
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const base = { raven: 10, archer: 40, wraith: 80 }[e.type] || 10;
    addScore(base, e.x, e.y - 20 * S);
    if (e.type === "raven") { for (let k = 0; k < 12; k++) bits.push({ x: e.x, y: e.y, vx: rand(-160, 160), vy: rand(-220, 40), age: 0, life: rand(0.6, 1.2), rot: rand(0, 6), vr: rand(-8, 8), s: rand(3, 7) * S }); Sound.small(); }
    else { burst(e.x, e.y - (e.type === "archer" ? 25 * S : 0), 26, e.type === "wraith" ? "frost" : "ember", 320); ring(e.x, e.y, 120 * S, e.type === "wraith" ? "150,210,255" : "255,140,60"); Sound.boom(); shake = Math.max(shake, 5); }
    for (let k = 0; k < 14; k++) spawnFire(e.x, e.y, rand(0, 6.28), rand(60, 200), true, { life: rand(0.3, 0.6), s1: 22 * S });
    dropPickup(e.x, e.y, { raven: 0.06, archer: 0.22, wraith: 0.4 }[e.type]);
  }
  function killBoss() {
    const b = boss;
    boss = null; bossDone = true;
    bossBar.classList.remove("on");
    addScore(2500, b.p[0].x, b.p[0].y, false);
    slowT = 1.4; timeScale = 0.3; shake = 24;
    Sound.roar(0.5); Sound.boom();
    b.p.forEach((q, i) => { if (i % 2 === 0) { burst(q.x, q.y, 10, "frost", 400); ring(q.x, q.y, 90 * S, "150,210,255", 0.8); } });
    announce("Victory", "The Frost Wyrm Has Fallen");
    for (let k = 0; k < 4; k++) dropPickup(b.p[0].x + rand(-60, 60), b.p[0].y, 1);
    shots.length = 0;
    if (!endless) setTimeout(() => {
      if (state !== "play") return;
      state = "win";
      if (score > best) { best = score; store.set("dragonBest", best); }
      $("#wScore").textContent = score.toLocaleString(); $("#wBest").textContent = best.toLocaleString(); $("#wRank").textContent = RANKS[rankIdx][1];
      winPanel.classList.add("show");
      input.firing = false; Sound.fire(false);
    }, 3200);
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      s.vy += (s.g || 0) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.type === "frost") s.age += dt;
      if (s.life <= 0 || s.y > groundY + 20) { shots.splice(i, 1); continue; }
      if (state === "play" && playerHits(s.x, s.y, s.r)) { hurt(s.dmg); if (s.type !== "frost") burst(s.x, s.y, 8, "frost", 160); shots.splice(i, 1); }
    }
  }

  function updateFire(dt) {
    for (let i = fire.length - 1; i >= 0; i--) {
      const f = fire[i];
      f.age += dt;
      if (f.age >= f.life) { fire.splice(i, 1); continue; }
      const dr = Math.exp(-f.drag * dt);
      f.vx *= dr; f.vy = f.vy * dr - 70 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.noHit || state !== "play" || f.age / f.life > 0.75) continue;
      let consumed = false;
      for (const t of towers) {
        if (t.burned) continue;
        const b = bannerRect(t);
        if (f.x > b.x - 10 && f.x < b.x + b.w + 10 && f.y > b.y - 10 && f.y < b.y + b.h + 10) { t.heat += 0.0045 * f.dmg; if (t.heat >= 2.2) burnBanner(t); }
      }
      for (const e of enemies) {
        if (e.dead) continue;
        let hit = false;
        if (e.type === "raven") hit = dist(f.x, f.y, e.x, e.y) < 18 * S;
        else if (e.type === "wraith") hit = dist(f.x, f.y, e.x, e.y) < 26 * S;
        else hit = Math.abs(f.x - e.x) < 14 * S && f.y < e.y + 4 && f.y > e.y - 48 * S;
        if (hit) { damageEnemy(e, f.dmg); consumed = true; break; }
      }
      if (!consumed && boss) {
        for (let k = 0; k < boss.p.length; k += 3) {
          const q = boss.p[k];
          if (dist(f.x, f.y, q.x, q.y) < bossWidth(k) + 6 * S) {
            boss.hp -= f.dmg; boss.flash = 0.06; consumed = true;
            if (Math.random() < 0.15) sparks.push({ x: f.x, y: f.y, vx: rand(-80, 80), vy: rand(-80, 40), age: 0, life: 0.4, s: 6 * S, col: "frost" });
            if (boss.hp <= 0) killBoss();
            break;
          }
        }
      }
      if (!consumed) {
        for (let j = shots.length - 1; j >= 0; j--) {
          const s = shots[j];
          if (s.type === "frost") continue;
          if (dist(f.x, f.y, s.x, s.y) < 14 * S) {
            shots.splice(j, 1); score += 5; Sound.melt();
            sparks.push({ x: s.x, y: s.y, vx: 0, vy: -40, age: 0, life: 0.5, s: 16 * S, col: "steam" });
            consumed = true; break;
          }
        }
      }
      if (consumed) fire.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    const head = dragon.p[0];
    for (let i = pickups.length - 1; i >= 0; i--) {
      const k = pickups[i];
      k.t += dt;
      k.vy = lerp(k.vy, 25 * S, dt * 2);
      k.y = Math.min(k.y + k.vy * dt, groundY - 30 * S);
      if (k.t > 12) { pickups.splice(i, 1); continue; }
      if (state === "play" && (dist(k.x, k.y, head.x, head.y) < 48 * DS || playerHits(k.x, k.y, 14 * S))) {
        pickups.splice(i, 1);
        Sound.pickup();
        ring(k.x, k.y, 90 * S, "255,230,150", 0.4);
        if (k.kind === "heal") { P.hp = Math.min(100, P.hp + 30); floatText(k.x, k.y, "+30 HP", "#ff8a8a"); }
        if (k.kind === "infinite") { P.infinite = 7; P.fuel = 100; P.locked = false; floatText(k.x, k.y, "ENDLESS FIRE!", "#ffb066", 20); }
        if (k.kind === "inferno") { P.inferno = 9; floatText(k.x, k.y, "BLUE INFERNO!", "#9fd8ff", 20); }
        if (k.kind === "gem") { addScore(250, k.x, k.y, false); }
      }
    }
  }

  function updateFx(dt) {
    for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.age += dt; if (s.age > s.life) { smoke.splice(i, 1); continue; } s.x += s.vx * dt; s.y += s.vy * dt; }
    for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.age += dt; if (s.age > s.life) { sparks.splice(i, 1); continue; } s.vy += 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
    for (let i = bits.length - 1; i >= 0; i--) { const b = bits[i]; b.age += dt; if (b.age > b.life) { bits.splice(i, 1); continue; } b.vy += 300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; }
    for (let i = texts.length - 1; i >= 0; i--) { const t = texts[i]; t.t += dt; if (t.t > t.life) texts.splice(i, 1); else t.y -= 46 * dt; }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; if (r.t > r.life) rings.splice(i, 1); else r.r = lerp(4, r.max, 1 - Math.pow(1 - r.t / r.life, 3)); }
    if (sparks.length > 700) sparks.splice(0, sparks.length - 700);
    if (smoke.length > 300) smoke.splice(0, smoke.length - 300);
  }

  /* ================= Draw: background ================= */
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (boss) { g.addColorStop(0, "#03060c"); g.addColorStop(0.5, "#0a1220"); g.addColorStop(0.8, "#182030"); g.addColorStop(1, "#28160f"); }
    else { g.addColorStop(0, "#04050a"); g.addColorStop(0.45, "#0f0a10"); g.addColorStop(0.78, "#26120e"); g.addColorStop(1, "#3a170c"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const mx = W * 0.8 - camX * 0.03, my = H * 0.18, mr = Math.min(W, H) * 0.06;
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5;
    ctx.drawImage(SPR.frost, mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, boss ? "#e6f4ff" : "#f4f1e6"); mg.addColorStop(1, boss ? "#7f9fb8" : "#a9b4bb");
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(120,130,140,.25)";
    ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.15, mr * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.25, mr * 0.14, 0, Math.PI * 2); ctx.fill();
    clouds.forEach((c) => {
      const span = W * 2 + 600, x = (((c.x - camX * 0.08) % span) + span) % span - 600;
      ctx.drawImage(cloudSprite, x, c.y, 520 * c.s * S * 1.4, 200 * c.s * S * 1.4);
    });
    if (lightning.life > 0 && lightning.pts.length) {
      ctx.save();
      ctx.globalAlpha = lightning.life / 0.32;
      ctx.strokeStyle = "rgba(200,225,255,.95)"; ctx.shadowColor = "rgba(160,200,255,1)"; ctx.shadowBlur = 24; ctx.lineWidth = 2.4;
      ctx.beginPath(); lightning.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.restore();
    }
  }
  function drawRidge(arr, par, color, top) {
    const off = camX * par, i0 = Math.max(0, Math.floor(off / STEP) - 1);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(i0 * STEP - off, H);
    for (let i = i0; i < arr.length && i * STEP - off < W + STEP * 2; i++) ctx.lineTo(i * STEP - off, arr[i]);
    ctx.lineTo(W + STEP * 2, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = top; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = i0; i < arr.length && i * STEP - off < W + STEP * 2; i++) { const x = i * STEP - off; i === i0 ? ctx.moveTo(x, arr[i]) : ctx.lineTo(x, arr[i]); }
    ctx.stroke();
  }
  function drawCastles() {
    const off = camX * 0.55;
    ctx.fillStyle = "#0a0809";
    castles.forEach((c) => {
      const x = c.x - off;
      if (x > W + 200 || x + c.w < -200) return;
      const base = H * 0.86;
      ctx.fillRect(x, base - c.h, c.w, c.h + H);
      const tw = c.w / (c.towers * 1.6);
      for (let k = 0; k < c.towers; k++) {
        const tx = x + (k / (c.towers - 1 || 1)) * (c.w - tw), th = c.h * (1.3 + ((c.seed * 10 + k) % 1) * 0.8);
        ctx.fillRect(tx, base - th, tw, th);
        ctx.beginPath(); ctx.moveTo(tx - 3, base - th); ctx.lineTo(tx + tw / 2, base - th - tw * 1.3); ctx.lineTo(tx + tw + 3, base - th); ctx.fill();
        if ((k + Math.floor(c.seed * 7)) % 2 === 0) {
          ctx.fillStyle = `rgba(255,150,60,${0.5 + Math.sin(time * 3 + k + c.seed * 9) * 0.2})`;
          ctx.fillRect(tx + tw * 0.35, base - th * 0.7, tw * 0.3, tw * 0.45);
          ctx.fillStyle = "#0a0809";
        }
      }
    });
  }
  function drawGround() {
    const g = ctx.createLinearGradient(0, groundY - 20, 0, H);
    g.addColorStop(0, "#120c0a"); g.addColorStop(1, "#050404");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 40; x += 40) { const wx = x + camX; ctx.lineTo(x, groundY + Math.sin(wx * 0.01) * 6 + Math.sin(wx * 0.037) * 4); }
    ctx.lineTo(W, H); ctx.fill();
  }

  /* ================= Draw: towers ================= */
  function drawTower(t) {
    const x = t.x - camX;
    if (x < -260 || x > W + 260) return;
    const w = t.w, top = t.top;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "#1c1714"); g.addColorStop(0.5, "#2c2420"); g.addColorStop(1, "#151110");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - w / 2, groundY + 20); ctx.lineTo(x - w * 0.42, top); ctx.lineTo(x + w * 0.42, top); ctx.lineTo(x + w / 2, groundY + 20); ctx.fill();
    const cw = w * 0.9, cx0 = x - cw / 2, ch = 14 * S;
    ctx.fillRect(cx0, top - 6 * S, cw, 8 * S);
    for (let k = 0; k < 5; k += 2) ctx.fillRect(cx0 + (k / 5) * cw, top - 6 * S - ch, cw / 5, ch);
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    for (let y = top + 18 * S; y < groundY; y += 18 * S) { ctx.beginPath(); ctx.moveTo(x - w * 0.45, y); ctx.lineTo(x + w * 0.45, y); ctx.stroke(); }
    for (let k = 0; k < 3; k++) {
      const wy = top + 40 * S + k * 70 * S;
      if (wy > groundY - 30) break;
      const lit = t.burned || k === 1;
      ctx.fillStyle = lit ? `rgba(255,${t.burned ? 120 : 170},50,${0.65 + Math.sin(time * 4 + k) * 0.2})` : "#0b0908";
      ctx.beginPath(); ctx.moveTo(x - 6 * S, wy + 18 * S); ctx.lineTo(x - 6 * S, wy + 5 * S); ctx.quadraticCurveTo(x, wy - 3 * S, x + 6 * S, wy + 5 * S); ctx.lineTo(x + 6 * S, wy + 18 * S); ctx.fill();
    }
    const poleTop = top - 64 * S;
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.moveTo(x, top - 6 * S); ctx.lineTo(x, poleTop); ctx.stroke();
    ctx.fillStyle = "#d9a441"; ctx.beginPath(); ctx.arc(x, poleTop, 3.5 * S, 0, Math.PI * 2); ctx.fill();
    const b = bannerRect(t), bx = b.x - camX;
    if (!t.burned) {
      const heat = clamp(t.heat / 2.2, 0, 1);
      ctx.beginPath();
      const segs = 10;
      for (let k = 0; k <= segs; k++) { const u = k / segs, px = bx + u * b.w, wave = Math.sin(time * 4 - u * 5 + t.i) * 4 * S * u; k === 0 ? ctx.moveTo(px, b.y + wave) : ctx.lineTo(px, b.y + wave); }
      const tw = Math.sin(time * 4 - 5 + t.i) * 4 * S;
      ctx.lineTo(bx + b.w - 14 * S, b.y + b.h / 2 + tw); ctx.lineTo(bx + b.w, b.y + b.h + tw);
      for (let k = segs; k >= 0; k--) { const u = k / segs, px = bx + u * b.w, wave = Math.sin(time * 4 - u * 5 + t.i) * 4 * S * u; ctx.lineTo(px, b.y + b.h + wave); }
      ctx.closePath();
      const bg = ctx.createLinearGradient(bx, b.y, bx + b.w, b.y + b.h);
      bg.addColorStop(0, `rgb(${110 + heat * 140},${22 + heat * 70},18)`); bg.addColorStop(1, `rgb(${60 + heat * 120},${12 + heat * 40},10)`);
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#f3d58b"; ctx.font = `700 ${Math.round(11 * S)}px Cinzel, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t.repo.name.length > 13 ? t.repo.name.slice(0, 12) + "…" : t.repo.name, bx + b.w * 0.45, b.y + b.h / 2);
      if (heat > 0.02) {
        ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(bx, b.y + b.h + 8 * S, b.w, 5 * S);
        ctx.fillStyle = "#ff9a4d"; ctx.fillRect(bx, b.y + b.h + 8 * S, b.w * heat, 5 * S);
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = heat * 0.8;
        ctx.drawImage(SPR.glow, bx - b.w * 0.5, b.y - b.h, b.w * 2, b.h * 3);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      }
      if (state === "play") {
        ctx.fillStyle = "rgba(236,227,207,.6)"; ctx.font = `600 ${Math.round(10 * S)}px Inter, sans-serif`;
        ctx.fillText("🔥 BURN ME", bx + b.w / 2, b.y - 14 * S + Math.sin(time * 3 + t.i) * 3);
      }
    } else {
      ctx.fillStyle = "#ffb26b"; ctx.font = `700 ${Math.round(11 * S)}px Cinzel, serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("✓ " + t.repo.title, x, poleTop - 24 * S);
    }
  }

  /* ================= Draw: the dragon ================= */
  function drawWing(sx, sy, ang, flip, phase, far) {
    const WS = DS * 1.3, k = Math.sin(phase);
    const m = (0.12 + 0.88 * k) * (far ? 0.8 : 1), xs = 1 - 0.12 * Math.abs(k);
    const P2 = (x, y) => [x * xs * WS, y * m * WS];
    const O = P2(0, 0), E = P2(-16, -52), Wr = P2(8, -98);
    const tips = [P2(-30, -150), P2(-88, -132), P2(-128, -92), P2(-146, -46), P2(-128, -6)];
    const R = P2(-70, 8);
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(ang); ctx.scale(1, flip);
    if (far) ctx.translate(7 * DS, -6 * DS);
    // membrane with deep scallops and a tear
    ctx.beginPath();
    ctx.moveTo(...O); ctx.lineTo(...E); ctx.lineTo(...Wr); ctx.lineTo(...tips[0]);
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (i === 2) {
        ctx.lineTo(lerp(mx, Wr[0], 0.25), lerp(my, Wr[1], 0.25));
        ctx.lineTo(lerp(mx, Wr[0], 0.5) - 6 * DS, lerp(my, Wr[1], 0.5));
        ctx.lineTo(lerp(mx, Wr[0], 0.3) + 4 * DS, lerp(my, Wr[1], 0.3) + 3 * DS * m);
        ctx.lineTo(...b);
      } else ctx.quadraticCurveTo(lerp(mx, Wr[0], 0.4), lerp(my, Wr[1], 0.4), b[0], b[1]);
    }
    ctx.quadraticCurveTo(lerp((tips[4][0] + R[0]) / 2, Wr[0], 0.2), lerp((tips[4][1] + R[1]) / 2, Wr[1], 0.2), R[0], R[1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(Wr[0], Wr[1], R[0], R[1]);
    if (far) { g.addColorStop(0, "rgba(36,6,6,.98)"); g.addColorStop(1, "rgba(12,3,3,.98)"); }
    else { g.addColorStop(0, "rgba(110,14,10,.96)"); g.addColorStop(0.55, "rgba(58,8,6,.97)"); g.addColorStop(1, "rgba(18,4,3,.98)"); }
    ctx.fillStyle = g; ctx.fill();
    if (!far && dragon.heat > 0.05) { ctx.fillStyle = `rgba(255,90,30,${dragon.heat * 0.22})`; ctx.fill(); }
    ctx.strokeStyle = "rgba(150,30,15,.35)"; ctx.lineWidth = 1; ctx.stroke();
    // veins
    ctx.strokeStyle = far ? "rgba(0,0,0,.5)" : "rgba(10,0,0,.55)"; ctx.lineWidth = 0.9 * DS;
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1];
      ctx.beginPath(); ctx.moveTo(...Wr); ctx.quadraticCurveTo(lerp(Wr[0], a[0], 0.6), lerp(Wr[1], b[1], 0.5), lerp((a[0] + b[0]) / 2, Wr[0], 0.42), lerp((a[1] + b[1]) / 2, Wr[1], 0.42)); ctx.stroke();
    }
    // bones
    ctx.strokeStyle = far ? "#080202" : "#0e0303"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = 5.5 * DS; ctx.beginPath(); ctx.moveTo(...O); ctx.lineTo(...E); ctx.lineTo(...Wr); ctx.stroke();
    ctx.lineWidth = 2.6 * DS; tips.forEach((tp) => { ctx.beginPath(); ctx.moveTo(...Wr); ctx.lineTo(...tp); ctx.stroke(); });
    if (!far) { ctx.strokeStyle = "rgba(160,40,20,.45)"; ctx.lineWidth = 1.2 * DS; ctx.beginPath(); ctx.moveTo(...O); ctx.lineTo(...E); ctx.lineTo(...Wr); ctx.stroke(); }
    // claws on wrist and finger tips
    ctx.fillStyle = far ? "#6b5d48" : "#dccaa4";
    const sgn = Math.sign(m || 1);
    ctx.beginPath(); ctx.moveTo(Wr[0] - 2 * DS, Wr[1]); ctx.quadraticCurveTo(Wr[0] + 14 * DS, Wr[1] - 6 * DS * sgn, Wr[0] + 16 * DS, Wr[1] + 6 * DS * sgn); ctx.lineTo(Wr[0] + 3 * DS, Wr[1] + 3 * DS * sgn); ctx.fill();
    tips.slice(0, 4).forEach((tp) => { ctx.beginPath(); ctx.moveTo(tp[0] - 2 * DS, tp[1]); ctx.lineTo(tp[0] - 7 * DS, tp[1] - 6 * DS * sgn); ctx.lineTo(tp[0] + 2 * DS, tp[1]); ctx.fill(); });
    ctx.restore();
  }

  function drawDragon() {
    const d = dragon, p = d.p.map((q) => ({ x: q.x - camX, y: q.y }));
    const blink = P.invuln > 0 && state === "play" && Math.floor(time * 20) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.45;
    const L = [], R = [], nrm = [], tan = [];
    for (let i = 0; i < N; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(N - 1, i + 1)];
      let tx = a.x - b.x, ty = a.y - b.y;
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx, w = bodyWidth(i);
      tan.push([tx, ty]); nrm.push([nx, ny]);
      L.push([p[i].x + nx * w, p[i].y + ny * w]); R.push([p[i].x - nx * w, p[i].y - ny * w]);
    }
    const shoulder = p[6];
    const bodyAng = Math.atan2(p[5].y - p[7].y, p[5].x - p[7].x);
    const flip = Math.cos(bodyAng) < 0 ? -1 : 1;
    const lowerOf = (i) => (nrm[i][1] > 0 ? L[i] : R[i]);
    const upperOf = (i) => (nrm[i][1] > 0 ? R[i] : L[i]);

    // ground shadow
    const shAlpha = clamp(1 - (groundY - d.p[0].y) / (H * 0.8), 0.05, 0.4);
    ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
    ctx.beginPath(); ctx.ellipse(p[8].x, groundY + 8, 140 * DS, 11 * DS, 0, 0, Math.PI * 2); ctx.fill();

    // under-glow while breathing
    if (d.heat > 0.05) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = d.heat * 0.35;
      ctx.drawImage(SPR.glow, p[4].x - 160 * DS, p[4].y - 160 * DS, 320 * DS, 320 * DS);
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = blink ? 0.45 : 1;
    }

    drawWing(shoulder.x, shoulder.y, bodyAng, flip, d.flap - 0.35, true);

    // far legs
    drawLeg(8, lowerOf, tan, true); drawLeg(19, lowerOf, tan, true);

    // body silhouette
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < N; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = N - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = "#130706"; ctx.fill();
    ctx.strokeStyle = "rgba(170,34,18,.6)"; ctx.lineWidth = 1.3; ctx.stroke();

    // scales (chevrons) + belly plates
    for (let i = 1; i < N - 2; i++) {
      const w = bodyWidth(i), lo = lowerOf(i), lo2 = lowerOf(i + 1);
      ctx.strokeStyle = "rgba(80,16,10,.75)"; ctx.lineWidth = Math.max(1, w * 0.5);
      ctx.beginPath(); ctx.moveTo(lerp(p[i].x, lo[0], 0.62), lerp(p[i].y, lo[1], 0.62)); ctx.lineTo(lerp(p[i + 1].x, lo2[0], 0.62), lerp(p[i + 1].y, lo2[1], 0.62)); ctx.stroke();
      if (i % 2 === 0 && i < N - 6) {
        ctx.strokeStyle = "rgba(110,22,14,.55)"; ctx.lineWidth = 1;
        const c = p[i], tx = tan[i][0], ty = tan[i][1], s = w * 0.55;
        ctx.beginPath(); ctx.moveTo(c.x + nrm[i][0] * s, c.y + nrm[i][1] * s); ctx.lineTo(c.x - tx * s * 0.6, c.y - ty * s * 0.6); ctx.lineTo(c.x - nrm[i][0] * s, c.y - nrm[i][1] * s); ctx.stroke();
      }
    }

    // lava cracks along the spine (pulse brighter while breathing)
    ctx.globalCompositeOperation = "lighter";
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      for (let i = 2; i < N - 7; i++) {
        const w = bodyWidth(i), zig = (i % 2 ? 0.28 : -0.22) * w;
        const x = p[i].x + nrm[i][0] * zig, y = p[i].y + nrm[i][1] * zig;
        i === 2 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const a = 0.35 + 0.2 * Math.sin(time * 4) + d.heat * 0.5;
      ctx.strokeStyle = pass === 0 ? `rgba(255,70,15,${a * 0.5})` : `rgba(255,190,110,${a})`;
      ctx.lineWidth = pass === 0 ? 4.5 * DS : 1.3 * DS;
      ctx.stroke();
    }
    // belly seams glow
    if (d.heat > 0.05) {
      ctx.strokeStyle = `rgba(255,120,40,${d.heat * 0.7})`; ctx.lineWidth = 1.2;
      for (let i = 2; i < N - 8; i += 2) { const lo = lowerOf(i); ctx.beginPath(); ctx.moveTo(lerp(p[i].x, lo[0], 0.35), lerp(p[i].y, lo[1], 0.35)); ctx.lineTo(lerp(p[i].x, lo[0], 0.9), lerp(p[i].y, lo[1], 0.9)); ctx.stroke(); }
    }
    ctx.globalCompositeOperation = "source-over";

    // dorsal spikes: big obsidian blades with glowing tips (two staggered rows)
    for (let i = 1; i <= N - 3; i++) {
      const up = upperOf(i), sgn = nrm[i][1] > 0 ? -1 : 1;
      const nx = nrm[i][0] * sgn, ny = nrm[i][1] * sgn, w = bodyWidth(i);
      const big = i % 2 === 1;
      const len = (i < 16 ? w * 1.25 + 8 * DS : w * 1.1 + 3 * DS) * (big ? 1 : 0.6);
      const tipX = up[0] + nx * len - tan[i][0] * len * 0.55, tipY = up[1] + ny * len - tan[i][1] * len * 0.55;
      const b1x = up[0] + tan[i][0] * w * 0.45, b1y = up[1] + tan[i][1] * w * 0.45;
      const b2x = up[0] - tan[i][0] * w * 0.45, b2y = up[1] - tan[i][1] * w * 0.45;
      ctx.fillStyle = "#070202";
      ctx.beginPath(); ctx.moveTo(b1x, b1y); ctx.quadraticCurveTo(lerp(b1x, tipX, 0.5) + nx * 2, lerp(b1y, tipY, 0.5) + ny * 2, tipX, tipY); ctx.lineTo(b2x, b2y); ctx.fill();
      if (big) {
        ctx.fillStyle = `rgba(255,${70 + d.heat * 100},30,${0.55 + d.heat * 0.4})`;
        ctx.beginPath(); ctx.moveTo(lerp(b1x, tipX, 0.62), lerp(b1y, tipY, 0.62)); ctx.lineTo(tipX, tipY); ctx.lineTo(lerp(b2x, tipX, 0.62), lerp(b2y, tipY, 0.62)); ctx.fill();
      }
    }

    // tail axe-blade
    const tl = p[N - 1], tt = tan[N - 1], tn = nrm[N - 1], ts = 16 * DS;
    ctx.fillStyle = "#0b0303";
    ctx.beginPath();
    ctx.moveTo(tl.x + tt[0] * 4 * DS, tl.y + tt[1] * 4 * DS);
    ctx.quadraticCurveTo(tl.x + tn[0] * ts * 1.3, tl.y + tn[1] * ts * 1.3, tl.x - tt[0] * ts * 1.1 + tn[0] * ts * 0.9, tl.y - tt[1] * ts * 1.1 + tn[1] * ts * 0.9);
    ctx.lineTo(tl.x - tt[0] * ts * 0.7, tl.y - tt[1] * ts * 0.7);
    ctx.lineTo(tl.x - tt[0] * ts * 1.1 - tn[0] * ts * 0.9, tl.y - tt[1] * ts * 1.1 - tn[1] * ts * 0.9);
    ctx.quadraticCurveTo(tl.x - tn[0] * ts * 1.3, tl.y - tn[1] * ts * 1.3, tl.x + tt[0] * 4 * DS, tl.y + tt[1] * 4 * DS);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,80,30,.6)"; ctx.lineWidth = 1.2; ctx.stroke();

    // near legs
    drawLeg(8, lowerOf, tan, false); drawLeg(19, lowerOf, tan, false);

    drawWing(shoulder.x, shoulder.y, bodyAng, flip, d.flap, false);
    drawHead(p[0].x, p[0].y);
    ctx.globalAlpha = 1;
  }

  function drawLeg(i, lowerOf, tan, far) {
    const d = dragon, low = lowerOf(i), fwd = tan[i];
    const tuck = clamp(Math.hypot(d.vx, d.vy) / (600 * S), 0, 1);
    const len = (i === 8 ? 15 : 20) * DS, off = far ? -4 * DS : 0;
    const kx = low[0] - fwd[0] * len * (0.3 + tuck * 0.6) + off, ky = low[1] + len * (1 - tuck * 0.45);
    const fx = kx + fwd[0] * len * 0.5 * (1 - tuck), fy = ky + len * 0.8 * (1 - tuck * 0.5);
    ctx.strokeStyle = far ? "#070202" : "#160807"; ctx.lineCap = "round";
    ctx.lineWidth = (i === 8 ? 6 : 8) * DS;
    ctx.beginPath(); ctx.moveTo(low[0] + off, low[1]); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = far ? "#6b5d48" : "#e3d3b0";
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath(); ctx.moveTo(fx - 1.5 * DS, fy); ctx.quadraticCurveTo(fx + (fwd[0] * 8 + c * 4) * DS, fy + 3 * DS, fx + (fwd[0] * 6 + c * 5) * DS, fy + 9 * DS); ctx.lineTo(fx + 1.5 * DS, fy); ctx.fill();
    }
  }

  function drawHead(x, y) {
    const d = dragon, HS = HSCALE(), flip = Math.cos(d.headAngle) < 0 ? -1 : 1, jaw = d.jaw;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(d.headAngle); ctx.scale(HS, HS * flip);

    // throat / mouth fire glow
    if (jaw > 0.12) {
      ctx.fillStyle = d.breathing ? (P.inferno > 0 ? "rgba(160,215,255,.95)" : "rgba(255,180,80,.95)") : "#2a0605";
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(54, 1); ctx.lineTo(2 + Math.cos(jaw) * 50, 4 + Math.sin(jaw) * 50); ctx.closePath(); ctx.fill();
    }
    // horns: crown of four, bone with dark roots
    const hornGrad = ctx.createLinearGradient(0, 0, -50, -50);
    hornGrad.addColorStop(0, "#2a1c12"); hornGrad.addColorStop(0.5, "#9c8462"); hornGrad.addColorStop(1, "#efe2c4");
    ctx.fillStyle = hornGrad; ctx.strokeStyle = "#140c06"; ctx.lineWidth = 0.7;
    const horn = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); ctx.quadraticCurveTo(pts[6], pts[7], pts[8], pts[9]); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    horn([10, -15, -8, -42, -32, -58, -12, -36, 2, -11]);
    horn([2, -12, -22, -28, -52, -36, -24, -20, -6, -5]);
    horn([-2, 0, -20, 4, -40, 14, -20, 10, -2, 6]);
    horn([18, -16, 14, -28, 6, -36, 18, -26, 26, -14]);
    // lower jaw
    ctx.save();
    ctx.translate(0, 3); ctx.rotate(jaw);
    ctx.fillStyle = "#1c0807";
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(52, 0); ctx.quadraticCurveTo(56, 4, 49, 7); ctx.lineTo(8, 11); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(170,40,20,.5)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle = "#f2e9d6";
    if (jaw > 0.1) {
      for (let tx = 12; tx <= 46; tx += 4.5) { const big = tx > 42 || tx < 16; ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + 1.6, big ? -7 : -4); ctx.lineTo(tx + 3.2, 0); ctx.fill(); }
    }
    ctx.fillStyle = "#070202";
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(4 + k * 9, 9); ctx.lineTo(-2 + k * 9, 17 - k); ctx.lineTo(10 + k * 9, 9); ctx.fill(); }
    ctx.restore();
    // skull: long, angular snout
    const g = ctx.createLinearGradient(0, -18, 0, 6);
    g.addColorStop(0, "#2e0d0a"); g.addColorStop(1, "#150605");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(6, -19); ctx.lineTo(30, -16); ctx.lineTo(54, -8); ctx.quadraticCurveTo(61, -4, 57, 1); ctx.lineTo(34, 3); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(190,50,25,.55)"; ctx.lineWidth = 0.9; ctx.stroke();
    // snout ridge spikes
    ctx.fillStyle = "#070202";
    for (let k = 0; k < 4; k++) { const sx = 32 + k * 6; ctx.beginPath(); ctx.moveTo(sx, -14 + k * 1.6); ctx.lineTo(sx + 1, -19 + k * 1.6); ctx.lineTo(sx + 4, -13 + k * 1.6); ctx.fill(); }
    // upper teeth + fangs
    if (jaw > 0.1) {
      ctx.fillStyle = "#f2e9d6";
      for (let tx = 14; tx <= 50; tx += 4.5) { const big = tx > 46 || (tx > 22 && tx < 27); ctx.beginPath(); ctx.moveTo(tx, 2); ctx.lineTo(tx + 1.6, big ? 10 : 6); ctx.lineTo(tx + 3.2, 1.8); ctx.fill(); }
    }
    // cheek plates
    ctx.strokeStyle = "rgba(120,24,14,.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(20, 0); ctx.moveTo(-4, 3); ctx.lineTo(14, 4); ctx.stroke();
    // heavy brow (angry)
    ctx.fillStyle = "#070202";
    ctx.beginPath(); ctx.moveTo(14, -17); ctx.lineTo(38, -12); ctx.lineTo(34, -8.5); ctx.lineTo(16, -12); ctx.closePath(); ctx.fill();
    // nostril
    ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(52, -5, 2.2, 1.1, -0.3, 0, Math.PI * 2); ctx.fill();
    // eye: slanted, burning
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(SPR.redeye, 10, -24, 34, 30);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffcf3a";
    ctx.beginPath(); ctx.moveTo(19, -9); ctx.quadraticCurveTo(26, -14, 34, -10.5); ctx.quadraticCurveTo(27, -6.5, 19, -9); ctx.fill();
    ctx.fillStyle = "#ff5a1a";
    ctx.beginPath(); ctx.moveTo(22, -9.3); ctx.quadraticCurveTo(27, -12.5, 32, -10.4); ctx.quadraticCurveTo(27, -7.5, 22, -9.3); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(27.4, -9.8, 0.7, 2.6, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ================= Draw: enemies & boss ================= */
  function drawEnemies() {
    for (const e of enemies) {
      const x = e.x - camX, y = e.y;
      if (x < -120 || x > W + 120) continue;
      if (e.type === "raven") {
        const s = 12 * S, f = Math.sin(e.ph), dir = e.vx < 0 ? -1 : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
        ctx.fillStyle = e.flash > 0 ? "#ff9a4d" : "#050506";
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.1); ctx.lineTo(s * 1.25, 0); ctx.lineTo(s * 0.7, s * 0.12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.4, -s * 0.25); ctx.lineTo(-s * 1.4, s * 0.25); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.quadraticCurveTo(-s * 0.4, -s * 1.3 * f, -s * 1.2, -s * 1.1 * f); ctx.quadraticCurveTo(-s * 0.2, -s * 0.4 * f, s * 0.3, 0); ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(e.diver ? SPR.redeye : SPR.frost, s * 0.4, -s * 0.4, s * 0.6, s * 0.6);
        ctx.restore();
      } else if (e.type === "archer") {
        const s = S;
        ctx.save(); ctx.translate(x, y);
        const face = Math.cos(e.aim) < 0 ? -1 : 1;
        ctx.scale(face, 1);
        ctx.fillStyle = e.flash > 0 ? "#ff9a4d" : "#101a22";
        ctx.fillRect(-6 * s, -14 * s, 4 * s, 14 * s); ctx.fillRect(2 * s, -14 * s, 4 * s, 14 * s);
        ctx.fillStyle = e.flash > 0 ? "#ffb070" : "#22343f";
        ctx.beginPath(); ctx.moveTo(-9 * s, -14 * s); ctx.lineTo(9 * s, -14 * s); ctx.lineTo(7 * s, -36 * s); ctx.lineTo(-7 * s, -36 * s); ctx.fill();
        ctx.fillStyle = "#0b1218"; ctx.beginPath(); ctx.moveTo(-8 * s, -36 * s); ctx.lineTo(-14 * s, -10 * s); ctx.lineTo(-4 * s, -14 * s); ctx.fill();
        ctx.fillStyle = "#2c3e4a"; ctx.beginPath(); ctx.arc(0, -42 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-7 * s, -43 * s, 14 * s, 3 * s);
        ctx.globalCompositeOperation = "lighter"; ctx.drawImage(SPR.frost, -2 * s, -48 * s, 10 * s, 10 * s); ctx.globalCompositeOperation = "source-over";
        ctx.save(); ctx.translate(6 * s, -28 * s); ctx.rotate(face > 0 ? e.aim : Math.PI - e.aim);
        ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(0, 0, 13 * s, -1.25, 1.25); ctx.stroke();
        ctx.strokeStyle = "rgba(220,230,240,.6)"; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(-1.25) * 13 * s, Math.sin(-1.25) * 13 * s); ctx.lineTo(-4 * s * (e.cd < 0.5 ? 2 : 1), 0); ctx.lineTo(Math.cos(1.25) * 13 * s, Math.sin(1.25) * 13 * s); ctx.stroke();
        ctx.restore();
        ctx.restore();
      } else if (e.type === "wraith") {
        const s = S, bob = Math.sin(e.ph) * 6 * s;
        ctx.save(); ctx.translate(x, y + bob);
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.7;
        ctx.drawImage(SPR.frostBig, -60 * s, -60 * s, 120 * s, 120 * s);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = e.flash > 0 ? "rgba(255,170,100,.8)" : "rgba(170,215,240,.38)";
        ctx.strokeStyle = "rgba(210,240,255,.7)"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, -30 * s);
        ctx.quadraticCurveTo(22 * s, -26 * s, 18 * s, 6 * s);
        for (let k = 0; k <= 5; k++) { const px = 18 * s - k * 7.2 * s; ctx.lineTo(px, 22 * s + Math.sin(time * 6 + k + e.ph) * 6 * s + (k % 2) * 8 * s); }
        ctx.quadraticCurveTo(-22 * s, -26 * s, 0, -30 * s); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(4,12,20,.9)"; ctx.beginPath(); ctx.ellipse(0, -14 * s, 9 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(SPR.frost, -8 * s, -20 * s, 8 * s, 8 * s); ctx.drawImage(SPR.frost, 1 * s, -20 * s, 8 * s, 8 * s);
        ctx.restore();
        // hp pip
        if (e.hp < 26) { ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(x - 16 * s, y - 44 * s, 32 * s, 3 * s); ctx.fillStyle = "#8fd3ff"; ctx.fillRect(x - 16 * s, y - 44 * s, 32 * s * (e.hp / 26), 3 * s); }
      }
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#0b0b0c";
    bits.forEach((b) => { ctx.save(); ctx.globalAlpha = 1 - b.age / b.life; ctx.translate(b.x - camX, b.y); ctx.rotate(b.rot); ctx.beginPath(); ctx.ellipse(0, 0, b.s, b.s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    ctx.globalAlpha = 1;
  }

  const bossWidth = (i) => (i < 5 ? (14 + i * 3.5) : (32 * Math.pow(1 - (i - 5) / 35, 1.1) + 2)) * S;
  function drawBoss() {
    const b = boss, n = b.p.length, p = b.p.map((q) => ({ x: q.x - camX, y: q.y }));
    const L = [], R = [], nrm = [], tan = [];
    for (let i = 0; i < n; i++) {
      const a = p[Math.max(0, i - 1)], c = p[Math.min(n - 1, i + 1)];
      let tx = a.x - c.x, ty = a.y - c.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const nx = -ty, ny = tx, w = bossWidth(i);
      tan.push([tx, ty]); nrm.push([nx, ny]); L.push([p[i].x + nx * w, p[i].y + ny * w]); R.push([p[i].x - nx * w, p[i].y - ny * w]);
    }
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5;
    for (let i = 0; i < n; i += 6) ctx.drawImage(SPR.frostBig, p[i].x - 80 * S, p[i].y - 80 * S, 160 * S, 160 * S);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = b.flash > 0 ? "#3a6c8c" : "#0d2635"; ctx.fill();
    ctx.strokeStyle = "rgba(170,230,255,.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    // ice crystals
    for (let i = 2; i < n - 2; i += 2) {
      const up = nrm[i][1] > 0 ? R[i] : L[i], sgn = nrm[i][1] > 0 ? -1 : 1, w = bossWidth(i), len = w * 1.2 + 6 * S;
      const nx = nrm[i][0] * sgn, ny = nrm[i][1] * sgn;
      ctx.fillStyle = "rgba(190,235,255,.85)";
      ctx.beginPath(); ctx.moveTo(up[0] + tan[i][0] * w * 0.3, up[1] + tan[i][1] * w * 0.3); ctx.lineTo(up[0] + nx * len, up[1] + ny * len); ctx.lineTo(up[0] - tan[i][0] * w * 0.3, up[1] - tan[i][1] * w * 0.3); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(120,200,255,.5)"; ctx.lineWidth = 3 * S;
    ctx.beginPath(); for (let i = 1; i < n - 4; i++) i === 1 ? ctx.moveTo(p[i].x, p[i].y) : ctx.lineTo(p[i].x, p[i].y); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    // head
    const h = p[0], HS = S * 1.6, flip = Math.cos(b.angle) < 0 ? -1 : 1;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(b.angle); ctx.scale(HS, HS * flip);
    if (b.jaw > 0.15) { ctx.fillStyle = "rgba(170,230,255,.95)"; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(46, 1); ctx.lineTo(2 + Math.cos(b.jaw) * 42, 4 + Math.sin(b.jaw) * 42); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "rgba(210,245,255,.9)";
    [[4, -12, -30, -40, -6, -6], [10, -14, -10, -46, 4, -10], [-2, 2, -34, 12, -4, 6]].forEach(([a1, a2, b1, b2, c1, c2]) => { ctx.beginPath(); ctx.moveTo(a1, a2); ctx.lineTo(b1, b2); ctx.lineTo(c1, c2); ctx.fill(); });
    ctx.save(); ctx.translate(0, 3); ctx.rotate(b.jaw);
    ctx.fillStyle = "#123447"; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(44, 0); ctx.lineTo(40, 7); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = b.flash > 0 ? "#4f86a8" : "#173d52";
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(8, -18); ctx.lineTo(46, -7); ctx.lineTo(50, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(200,240,255,.7)"; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(SPR.frostBig, 6, -24, 30, 30);
    ctx.fillStyle = "#e8fbff"; ctx.beginPath(); ctx.moveTo(14, -9); ctx.lineTo(28, -12); ctx.lineTo(24, -7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  /* ================= Draw: shots, pickups, fx ================= */
  function drawShots() {
    for (const s of shots) {
      const x = s.x - camX, y = s.y;
      if (x < -60 || x > W + 60) continue;
      if (s.type === "arrow") {
        const a = Math.atan2(s.vy, s.vx), l = 16 * S;
        ctx.strokeStyle = "#c9b48e"; ctx.lineWidth = 1.8 * S;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalCompositeOperation = "lighter"; ctx.drawImage(SPR.frost, x - 5 * S, y - 5 * S, 10 * S, 10 * S); ctx.globalCompositeOperation = "source-over";
      } else if (s.type === "shard") {
        const a = Math.atan2(s.vy, s.vx), l = 13 * S;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.globalCompositeOperation = "lighter"; ctx.drawImage(SPR.frost, -14 * S, -14 * S, 28 * S, 28 * S); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(220,248,255,.95)"; ctx.beginPath(); ctx.moveTo(l, 0); ctx.lineTo(0, -4 * S); ctx.lineTo(-l * 0.8, 0); ctx.lineTo(0, 4 * S); ctx.fill();
        ctx.restore();
      } else {
        const st = s.age / 0.9, sz = (14 + st * 40) * S;
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.max(0, 0.9 - st);
        ctx.drawImage(SPR.frostBig, x - sz, y - sz, sz * 2, sz * 2);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      }
    }
  }
  function drawPickups() {
    for (const k of pickups) {
      const x = k.x - camX, y = k.y + Math.sin(k.t * 4) * 5 * S, s = 13 * S;
      if (k.t > 9 && Math.floor(k.t * 8) % 2) continue;
      const glowSpr = k.kind === "heal" ? SPR.heal : k.kind === "gem" ? SPR.gem : k.kind === "inferno" ? SPR.bmid : SPR.yellow;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.8;
      ctx.drawImage(glowSpr, x - s * 3, y - s * 3, s * 6, s * 6);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, s * 1.35 + Math.sin(k.t * 6) * 2, 0, Math.PI * 2); ctx.stroke();
      ctx.save(); ctx.translate(x, y);
      if (k.kind === "heal") {
        ctx.fillStyle = "#ff4d5e"; ctx.beginPath(); ctx.moveTo(0, s * 0.8); ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.6, -s * 1.1, 0, -s * 0.4); ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.3, -s * 0.1, 0, s * 0.8); ctx.fill();
      } else if (k.kind === "gem") {
        ctx.fillStyle = "#7dffb0"; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, -s * 0.2); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, -s * 0.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.3, -s * 0.2); ctx.lineTo(-s * 0.3, -s * 0.2); ctx.fill();
      } else {
        ctx.fillStyle = k.kind === "inferno" ? "#7fc6ff" : "#ff9a3c";
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.1, s * 0.6, s * 0.4); ctx.quadraticCurveTo(0, s * 1.1, -s * 0.6, s * 0.4); ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.ellipse(0, s * 0.3, s * 0.25, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  function drawSmoke() {
    for (const s of smoke) {
      const st = s.age / s.life, sz = s.s0 + st * s.s1;
      ctx.globalAlpha = (1 - st) * 0.85;
      ctx.drawImage(SPR.smoke, s.x - camX - sz / 2, s.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
  function drawFire() {
    for (const f of fire) {
      const st = f.age / f.life;
      if (st < 0.62) continue;
      const sz = f.s0 + st * f.s1 * 1.3;
      ctx.globalAlpha = (1 - st) * 0.9;
      ctx.drawImage(SPR.smoke, f.x - camX - sz / 2, f.y - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = "lighter";
    for (const f of fire) {
      const st = f.age / f.life;
      if (st >= 0.85) continue;
      const sz = f.s0 + st * f.s1;
      const img = f.blue ? (st < 0.15 ? SPR.bcore : st < 0.45 ? SPR.bmid : SPR.bout) : (st < 0.12 ? SPR.core : st < 0.32 ? SPR.yellow : st < 0.6 ? SPR.orange : SPR.red);
      ctx.globalAlpha = st < 0.6 ? 0.9 : (0.85 - st) * 3;
      ctx.drawImage(img, f.x - camX - sz / 2, f.y - sz / 2, sz, sz);
    }
    if (dragon.breathing) {
      const m = mouthPos();
      ctx.globalAlpha = 0.55 + Math.random() * 0.15;
      const r = 360 * S;
      ctx.drawImage(P.inferno > 0 ? SPR.frostBig : SPR.glow, m.x - camX - r * 0.4, m.y - r, r * 2.4, r * 2);
    }
    for (const s of sparks) {
      const st = s.age / s.life, img = s.col === "frost" ? SPR.frost : s.col === "red" ? SPR.redeye : s.col === "steam" ? SPR.smoke : SPR.ember;
      ctx.globalAlpha = (1 - st) * (s.col === "red" ? 0.6 : 0.9);
      const sz = s.s * (s.col === "red" ? 1 - st * 0.5 : 1);
      ctx.drawImage(img, s.x - camX - sz / 2, s.y - sz / 2, sz, sz);
    }
    for (const r of rings) {
      ctx.globalAlpha = 1 - r.t / r.life;
      ctx.strokeStyle = `rgba(${r.color},.9)`; ctx.lineWidth = 3 * S * (1 - r.t / r.life) + 1;
      ctx.beginPath(); ctx.arc(r.x - camX, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function drawTexts() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const t of texts) {
      const a = 1 - t.t / t.life, sc = t.t < 0.12 ? 1 + (0.12 - t.t) * 5 : 1;
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.round(t.size * sc)}px Cinzel, serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(0,0,0,.7)"; ctx.strokeText(t.text, t.x - camX, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x - camX, t.y);
    }
    ctx.globalAlpha = 1;
  }
  function drawEmbers(dt) {
    ctx.globalCompositeOperation = "lighter";
    embers.forEach((e) => {
      e.y -= e.v * dt * (e.frost ? -0.6 : 1); e.ph += dt * 2;
      if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
      if (e.y > 1.05) { e.y = -0.05; e.x = Math.random(); }
      const x = (((e.x * W * 1.3 - camX * 0.4 * e.s) % (W * 1.3)) + W * 1.3) % (W * 1.3) - W * 0.15 + Math.sin(e.ph) * 12;
      const s = (e.frost ? 6 : 8) * e.s;
      ctx.globalAlpha = 0.5 + Math.sin(e.ph * 3) * 0.3;
      ctx.drawImage(e.frost || boss ? SPR.frost : SPR.ember, x - s / 2, e.y * H - s / 2, s, s);
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  function drawOverlay() {
    const fg = ctx.createLinearGradient(0, H * 0.75, 0, H);
    fg.addColorStop(0, "rgba(40,18,10,0)"); fg.addColorStop(1, "rgba(60,22,10,.45)");
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.75, W, H * 0.25);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (lightning.flash > 0) { ctx.fillStyle = `rgba(190,215,255,${lightning.flash * 0.14})`; ctx.fillRect(0, 0, W, H); }
    const low = state === "play" && P.hp < 30 ? (0.35 + Math.sin(time * 7) * 0.2) : 0;
    hurtEl.style.opacity = Math.max(hurtFlash, low).toFixed(2);
  }
  function drawArrowHint() {
    if (state !== "play" || boss) return;
    const next = towers.filter((t) => !t.burned).sort((a, b) => Math.abs(a.x - dragon.p[0].x) - Math.abs(b.x - dragon.p[0].x))[0];
    if (!next) return;
    const sx = next.x - camX;
    if (sx > -20 && sx < W + 20) return;
    const right = sx > W, ax = right ? W - 34 : 34, ay = H * 0.5 + Math.sin(time * 3) * 6;
    ctx.save(); ctx.translate(ax, ay);
    ctx.fillStyle = "rgba(14,12,10,.7)"; ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff9a4d"; ctx.beginPath();
    if (right) { ctx.moveTo(8, 0); ctx.lineTo(-5, -8); ctx.lineTo(-5, 8); } else { ctx.moveTo(-8, 0); ctx.lineTo(5, -8); ctx.lineTo(5, 8); }
    ctx.fill();
    ctx.fillStyle = "#f3d58b"; ctx.font = "600 11px Inter, sans-serif"; ctx.textAlign = right ? "right" : "left"; ctx.textBaseline = "middle";
    ctx.fillText(next.repo.name, right ? -28 : 28, 0);
    ctx.restore();
  }

  /* ================= HUD sync ================= */
  let lastPowers = "";
  function syncHud() {
    if (score !== shownScore) { shownScore = score; scoreEl.textContent = score.toLocaleString(); }
    hpFill.style.transform = `scaleX(${clamp(P.hp / 100, 0, 1)})`;
    fuelFill.style.transform = `scaleX(${P.infinite > 0 ? 1 : clamp(P.fuel / 100, 0, 1)})`;
    fuelBar.classList.toggle("locked", P.locked && P.infinite <= 0);
    boostRow.classList.toggle("ready", P.boostCd <= 0);
    comboTimeEl.style.transform = `scaleX(${clamp(comboT / 2.6, 0, 1)})`;
    const pw = (P.inferno > 0 ? `<span class="power inferno">BLUE INFERNO ${Math.ceil(P.inferno)}s</span>` : "") + (P.infinite > 0 ? `<span class="power infinite">ENDLESS FIRE ${Math.ceil(P.infinite)}s</span>` : "");
    if (pw !== lastPowers) { lastPowers = pw; powersEl.innerHTML = pw; }
    if (boss) bossFill.style.transform = `scaleX(${clamp(boss.hp / boss.max, 0, 1)})`;
  }

  /* ================= Loop ================= */
  // Test hook: dragon.html#sim=10&play=1&fire=1&keys=r&dx=500&dy=-100&boss=1 fast-forwards the simulation (for screenshots)
  (function simHook() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (!q.has("sim")) return;
    const steps = Math.round(parseFloat(q.get("sim")) * 60);
    let played = false;
    for (let i = 0; i < steps; i++) {
      if (q.get("play") && !played && revealDone && i > steps * 0.5) {
        startGame(); played = true;
        if (q.get("keys")) q.get("keys").split("").forEach((k) => input.keys.add(k));
        if (q.get("fire")) input.firing = true;
        if (q.get("dx")) dragon.p.forEach((pt) => (pt.x += parseFloat(q.get("dx"))));
        if (q.get("dy")) dragon.p.forEach((pt) => (pt.y += parseFloat(q.get("dy"))));
        if (q.get("boss")) summonBoss();
      }
      update(1 / 60);
    }
    lightning.flash = 0; lightning.life = 0; lightning.next = 999; hurtFlash = 0; P.invuln = 0;
  })();

  let last = performance.now();
  function frame(now) {
    const rawDt = clamp((now - last) / 1000, 0, 1 / 30);
    last = now;
    if (!paused) update(rawDt);
    syncHud();
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawSky();
    drawRidge(ridgeFar, 0.15, boss ? "#0c1119" : "#120e13", "rgba(169,198,211,.14)");
    drawRidge(ridgeNear, 0.35, boss ? "#080b10" : "#0c0a0c", "rgba(232,112,58,.10)");
    drawCastles();
    drawGround();
    towers.forEach(drawTower);
    drawSmoke();
    drawPickups();
    drawEnemies();
    if (boss) drawBoss();
    drawDragon();
    drawShots();
    drawFire();
    drawTexts();
    drawEmbers(paused ? 0 : rawDt);
    ctx.restore();
    drawOverlay();
    drawArrowHint();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
