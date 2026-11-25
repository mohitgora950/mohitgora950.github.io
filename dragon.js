/* =========================================================
   Dragon Flight — fly Mohit Gora's dragon, burn the banners,
   unlock the repositories. Pure canvas, no libraries.
   ========================================================= */
(() => {
  "use strict";

  /* ---------------- Data ---------------- */
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

  /* ---------------- DOM ---------------- */
  const $ = (s) => document.querySelector(s);
  const canvas = $("#game");
  const ctx = canvas.getContext("2d");
  const titleEl = $("#title"), titleText = $("#titleText");
  const startEl = $("#start"), startBtn = $("#startBtn");
  const hud = $("#hud"), vault = $("#vault"), repoList = $("#repoList");
  const burnedEl = $("#burned"), scoreEl = $("#score"), toastEl = $("#toast");
  const fireBtn = $("#fireBtn"), winEl = $("#win");
  $("#total").textContent = REPOS.length;

  const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  if (isTouch) {
    document.body.classList.add("touch");
    const desk = document.querySelector("#startHint .desk");
    if (desk) desk.innerHTML = "<b>Drag</b> to fly · hold the <b>flame button</b> to breathe fire";
  }

  repoList.innerHTML = REPOS.map((r, i) => `
    <a class="repo locked" id="repo-${i}" href="${r.url}" target="_blank" rel="noopener">
      <span class="name"><i class="fa-solid fa-lock"></i>${r.title}</span>
      <span class="desc">${r.desc}</span>
    </a>`).join("");

  /* ---------------- Utils ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
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
    smoke: sprite([[0, "rgba(60,52,50,.55)"], [0.5, "rgba(40,34,34,.3)"], [1, "rgba(20,18,18,0)"]]),
    ember: sprite([[0, "rgba(255,230,170,1)"], [0.3, "rgba(255,140,50,.8)"], [1, "rgba(255,80,20,0)"]], 32),
    frost: sprite([[0, "rgba(220,240,255,1)"], [0.35, "rgba(150,200,230,.6)"], [1, "rgba(100,160,200,0)"]], 32),
    glow: sprite([[0, "rgba(255,150,60,.55)"], [0.4, "rgba(255,90,30,.18)"], [1, "rgba(255,60,20,0)"]], 256),
  };
  const cloudSprite = (() => {
    const c = document.createElement("canvas");
    c.width = 520; c.height = 200;
    const g = c.getContext("2d");
    const r = mulberry32(7);
    for (let i = 0; i < 26; i++) {
      const rad = 30 + r() * 58, x = 100 + rad + r() * (320 - rad * 2), y = 100 + (r() - 0.5) * (180 - rad * 2) * 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(46,40,48,.55)");
      gr.addColorStop(1, "rgba(30,26,32,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return c;
  })();

  /* ---------------- World / resize ---------------- */
  let W = 0, H = 0, DPR = 1, S = 1, worldW = 3000, groundY = 0;
  let ridgeFar = [], ridgeNear = [], castles = [], towers = [], clouds = [];
  const STEP = 36;

  function makeRidge(len, base, amp, seed) {
    const r = mulberry32(seed), out = [];
    const p1 = r() * 10, p2 = r() * 10;
    for (let i = 0; i <= len / STEP + 2; i++) {
      const x = i * STEP;
      const y = base
        - Math.abs(Math.sin(x * 0.0016 + p1)) * amp
        - Math.sin(x * 0.0047 + p2) * amp * 0.35
        - r() * amp * 0.12;
      out.push(y);
    }
    return out;
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    S = clamp(Math.min(H / 820, W / 700), 0.5, 1.15);
    worldW = Math.max(W * 3.4, 3400);
    groundY = H * 0.9;

    ridgeFar = makeRidge(W + (worldW - W) * 0.15 + 200, H * 0.72, H * 0.3, 11);
    ridgeNear = makeRidge(W + (worldW - W) * 0.35 + 200, H * 0.82, H * 0.22, 23);

    const r = mulberry32(41);
    castles = [];
    const castleLen = W + (worldW - W) * 0.55;
    for (let x = 120; x < castleLen; x += rand(380, 620)) {
      castles.push({ x, w: 60 + r() * 90, h: H * (0.08 + r() * 0.12), towers: 2 + Math.floor(r() * 3), seed: r() });
    }

    const xs = [0.3, 0.45, 0.59, 0.73, 0.88], hs = [0.5, 0.6, 0.44, 0.57, 0.5];
    const prev = towers;
    towers = REPOS.map((repo, i) => ({
      i, repo,
      x: worldW * xs[i],
      top: groundY - H * hs[i],
      w: 70 * S,
      heat: prev[i] ? prev[i].heat : 0,
      burned: prev[i] ? prev[i].burned : false,
    }));

    if (!clouds.length) {
      for (let i = 0; i < 9; i++) clouds.push({ x: rand(0, W * 2), y: rand(H * 0.02, H * 0.35), s: rand(0.8, 2), v: rand(4, 14) });
    }
  }
  window.addEventListener("resize", resize);
  resize();

  function bannerRect(t) {
    const poleTop = t.top - 64 * S;
    return { x: t.x + 4 * S, y: poleTop + 2 * S, w: 104 * S, h: 54 * S };
  }

  /* ---------------- Dragon ---------------- */
  const N = 34;
  const dragon = {
    p: [], vx: 0, vy: 0, jaw: 0.05, headAngle: 0, flap: 0, breathing: false, roar: 0,
  };
  function segLen() { return 9.5 * S; }
  function resetDragon(x, y) {
    dragon.p = [];
    for (let i = 0; i < N; i++) dragon.p.push({ x: x - i * segLen(), y: y + Math.sin(i * 0.5) * 6 });
    dragon.vx = 0; dragon.vy = 0;
  }
  function bodyWidth(i) {
    if (i < 6) return (7.5 + i * 2.3) * S;
    return (21 * Math.pow(1 - (i - 6) / (N - 6), 1.15) + 1.6) * S;
  }

  /* ---------------- State ---------------- */
  let state = "intro", tIntro = 0, time = 0;
  let camX = 0, shake = 0, score = 0, burnedCount = 0;
  const fire = [], embers = [], bits = [], ravens = [];
  let ravenTimer = 2, lightning = { next: 3.5, life: 0, flash: 0, pts: [] };
  let winShown = false;

  // input
  const input = { mx: W * 0.5, my: H * 0.5, mouseActive: false, firing: false, keys: new Set(), touchId: null, tx: 0, ty: 0, lastKey: 0 };

  for (let i = 0; i < 70; i++) embers.push({ x: rand(0, 1), y: rand(0, 1), v: rand(0.02, 0.07), s: rand(0.6, 1.8), ph: rand(0, 6.28), frost: Math.random() < 0.35 });

  resetDragon(-160 * S, H * 0.56);

  /* ---------------- Input handlers ---------------- */
  canvas.addEventListener("pointerdown", (e) => {
    if (state === "intro") { skipIntro(); return; }
    if (state === "ready") { startGame(); return; }
    if (e.pointerType === "mouse") {
      input.mouseActive = true; input.mx = e.clientX; input.my = e.clientY;
      if (e.button === 0) input.firing = true;
    } else {
      input.touchId = e.pointerId; input.tx = e.clientX; input.ty = e.clientY;
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { input.mouseActive = true; input.mx = e.clientX; input.my = e.clientY; }
    else if (e.pointerId === input.touchId) { input.tx = e.clientX; input.ty = e.clientY; }
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse") input.firing = false;
    if (e.pointerId === input.touchId) input.touchId = null;
  });
  window.addEventListener("pointercancel", (e) => { if (e.pointerId === input.touchId) input.touchId = null; });
  window.addEventListener("blur", () => { input.firing = false; input.keys.clear(); });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  const fireDown = (e) => { e.preventDefault(); e.stopPropagation(); input.firing = true; fireBtn.classList.add("active"); };
  const fireUp = (e) => { e.preventDefault(); input.firing = false; fireBtn.classList.remove("active"); };
  fireBtn.addEventListener("pointerdown", fireDown);
  fireBtn.addEventListener("pointerup", fireUp);
  fireBtn.addEventListener("pointerleave", fireUp);
  fireBtn.addEventListener("pointercancel", fireUp);

  const KEYMAP = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
  window.addEventListener("keydown", (e) => {
    if (state === "intro" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); skipIntro(); return; }
    if (state === "ready" && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); startGame(); return; }
    if (e.code === "Space") { e.preventDefault(); input.firing = true; }
    if (KEYMAP[e.code]) { e.preventDefault(); input.keys.add(KEYMAP[e.code]); input.lastKey = time; input.mouseActive = false; }
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") input.firing = false;
    if (KEYMAP[e.code]) input.keys.delete(KEYMAP[e.code]);
  });

  startBtn.addEventListener("click", (e) => { e.stopPropagation(); startGame(); });
  $("#vaultToggle").addEventListener("click", () => vault.classList.toggle("collapsed"));
  $("#again").addEventListener("click", () => winEl.classList.remove("show"));

  /* ---------------- Flow ---------------- */
  let revealDone = false;
  function setReveal(p) {
    p = clamp(p, 0, 1);
    titleText.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`;
    titleText.style.webkitClipPath = titleText.style.clipPath;
    if (p >= 1 && !revealDone) {
      revealDone = true;
      titleText.classList.add("lit");
      setTimeout(() => titleEl.classList.add("show-sub"), 250);
      setTimeout(() => { if (state === "intro") state = "ready"; startEl.classList.add("show"); }, 1000);
    }
  }
  function skipIntro() {
    if (revealDone) { if (state === "ready") startGame(); return; }
    tIntro = Math.max(tIntro, 4.6);
    setReveal(1);
  }
  function startGame() {
    if (state === "play") return;
    state = "play";
    titleEl.classList.add("gone");
    startEl.classList.remove("show"); startEl.classList.add("gone");
    hud.style.display = "flex";
    document.body.classList.add("playing");
    if (W > 760) vault.classList.remove("collapsed");
    toast("Fly into the realm", "Burn each tower's banner to unlock a repository.", null);
  }
  let toastTimer;
  function toast(title, text, url) {
    toastEl.innerHTML = `<h3>${title}</h3><p>${text}</p>${url ? `<a href="${url}" target="_blank" rel="noopener">Open repository →</a>` : ""}`;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), url ? 4200 : 3000);
  }
  function burnBanner(t) {
    t.burned = true;
    burnedCount++;
    burnedEl.textContent = burnedCount;
    shake = Math.max(shake, 10);
    const b = bannerRect(t);
    for (let k = 0; k < 70; k++) {
      const a = rand(0, Math.PI * 2), sp = rand(80, 420);
      fire.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, age: 0, life: rand(0.5, 1.1), s0: rand(6, 12) * S, s1: rand(30, 60) * S, drag: 1.8, noHit: true });
    }
    const el = document.getElementById(`repo-${t.i}`);
    el.classList.remove("locked"); el.classList.add("open", "flash");
    el.querySelector("i").className = "fa-solid fa-fire";
    toast(`🔥 ${t.repo.title} unlocked`, t.repo.desc, t.repo.url);
    if (burnedCount === REPOS.length && !winShown) {
      winShown = true;
      setTimeout(() => winEl.classList.add("show"), 2200);
    }
  }

  /* ---------------- Update ---------------- */
  function update(dt) {
    time += dt;
    const d = dragon, head = d.p[0];
    let tx, ty, maxSpeed = 720 * S, steer = 3.2;
    d.breathing = false;

    if (state === "intro" || state === "ready") {
      tIntro += dt;
      const hx = W * (W < 760 ? 0.16 : 0.2), hy = H * 0.5;
      if (state === "intro" && tIntro < 1.8) { tx = hx + 40; ty = hy; maxSpeed = 900 * S; }
      else if (state === "intro" && tIntro < 2.4) { tx = hx + 60; ty = hy - 10; d.roar = 1; if (tIntro < 1.9) shake = Math.max(shake, 7); }
      else if (state === "intro" && tIntro < 4.6) { tx = hx + 70; ty = hy + Math.sin(tIntro * 2) * 8; d.breathing = true; }
      else { tx = hx + Math.sin(time * 0.9) * 70 * S + 40; ty = hy + Math.sin(time * 1.6) * 40 * S; }
      camX = 0;
    } else {
      // play
      const keys = input.keys;
      const kx = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0);
      const ky = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0);
      if (input.touchId !== null) { tx = input.tx + camX; ty = input.ty; }
      else if (kx || ky) { tx = head.x + kx * 400; ty = head.y + ky * 400; }
      else if (input.mouseActive) { tx = input.mx + camX; ty = input.my; }
      else { tx = head.x + d.vx * 0.3; ty = head.y + Math.sin(time * 1.5) * 20; }
      d.breathing = input.firing;
    }

    // steering
    let dx = tx - head.x, dy = ty - head.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = Math.min(maxSpeed, dist * 3.2);
    const wvx = (dx / dist) * want, wvy = (dy / dist) * want;
    const k = Math.min(1, dt * steer);
    d.vx += (wvx - d.vx) * k;
    d.vy += (wvy - d.vy) * k;
    // gentle hover bob so it never looks frozen
    d.vy += Math.sin(time * 2.4) * 18 * S * dt * 4;
    head.x += d.vx * dt; head.y += d.vy * dt;
    const minX = state === "play" ? 30 : -400;
    head.x = clamp(head.x, minX, worldW - 30);
    head.y = clamp(head.y, 50 * S, groundY - 30 * S);

    // spine (follow-the-leader + tail droop)
    const sl = segLen();
    for (let i = 1; i < N; i++) {
      const a = d.p[i - 1], b = d.p[i];
      b.y += 26 * S * dt * (i / N);
      const ex = a.x - b.x, ey = a.y - b.y, L = Math.hypot(ex, ey) || 1;
      if (L > sl) { b.x = a.x - (ex / L) * sl; b.y = a.y - (ey / L) * sl; }
    }

    // head angle
    let ang = Math.atan2(head.y - d.p[2].y, head.x - d.p[2].x);
    if (state === "intro" && tIntro > 1.8 && tIntro < 4.6) ang = 0.06;
    let diff = ang - d.headAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    d.headAngle += diff * Math.min(1, dt * 9);

    // jaw
    const jawTarget = d.breathing ? 0.48 : d.roar > 0 ? 0.62 : 0.06 + Math.max(0, Math.sin(time * 0.7)) * 0.04;
    d.jaw = lerp(d.jaw, jawTarget, Math.min(1, dt * 12));
    d.roar = Math.max(0, d.roar - dt * 2.5);

    // wings
    const spd = Math.hypot(d.vx, d.vy) / (720 * S);
    d.flap += dt * (5.2 + spd * 3 + (d.vy < -80 ? 2.5 : 0));

    // camera
    if (state === "play") {
      const target = clamp(head.x - W * 0.42, 0, worldW - W);
      camX = lerp(camX, target, Math.min(1, dt * 3));
    }
    shake = Math.max(0, shake - dt * 22);

    // fire emission
    if (d.breathing) {
      const intro = state !== "play";
      const m = mouthPos();
      const count = Math.round((intro ? 14 : 10) * (dt * 60));
      for (let c = 0; c < count; c++) {
        const a = d.headAngle + rand(-0.15, 0.15) + (d.jaw - 0.48) * 0.2;
        const sp = intro ? rand(W * 0.95, W * 1.2) : rand(560, 820) * Math.sqrt(S);
        fire.push({
          x: m.x + rand(-3, 3), y: m.y + rand(-3, 3),
          vx: Math.cos(a) * sp + d.vx * 0.5, vy: Math.sin(a) * sp + d.vy * 0.5,
          age: 0, life: intro ? rand(0.8, 1.05) : rand(0.55, 0.85),
          s0: rand(5, 10) * S, s1: rand(34, 62) * S * (intro ? 1.3 : 1), drag: intro ? 0.75 : 1.4,
        });
      }
      if (Math.random() < dt * 8) shake = Math.max(shake, 2);
    }
    if (fire.length > 1400) fire.splice(0, fire.length - 1400);

    // burned tower flames
    towers.forEach((t) => {
      if (!t.burned) { t.heat = Math.max(0, t.heat - dt * 0.4); return; }
      if (Math.random() < dt * 30) {
        const b = bannerRect(t);
        fire.push({ x: b.x + rand(0, b.w * 0.6), y: b.y + b.h * 0.7, vx: rand(-20, 20), vy: rand(-140, -60), age: 0, life: rand(0.5, 0.9), s0: 6 * S, s1: rand(22, 36) * S, drag: 0.5, noHit: true });
      }
    });

    // fire update + hits
    let front = -Infinity;
    for (let i = fire.length - 1; i >= 0; i--) {
      const f = fire[i];
      f.age += dt;
      if (f.age >= f.life) { fire.splice(i, 1); continue; }
      const dr = Math.exp(-f.drag * dt);
      f.vx *= dr; f.vy = f.vy * dr - 70 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt;
      const st = f.age / f.life;
      if (!f.noHit && st < 0.75) {
        if (f.x > front) front = f.x;
        if (state === "play") {
          for (const t of towers) {
            if (t.burned) continue;
            const b = bannerRect(t);
            if (f.x > b.x - 10 && f.x < b.x + b.w + 10 && f.y > b.y - 10 && f.y < b.y + b.h + 10) {
              t.heat += 0.0045;
              if (t.heat >= 2.2) burnBanner(t);
            }
          }
          for (const r of ravens) {
            if (!r.dead && Math.hypot(f.x - r.x, f.y - r.y) < 18 * S) killRaven(r);
          }
        }
      }
    }
    if (state === "intro" && !revealDone && tIntro > 2.4) {
      const rect = titleText.getBoundingClientRect();
      const sx = front - camX;
      if (rect.width) setReveal((sx - rect.left) / rect.width);
      if (tIntro > 4.4) setReveal(1);
    }

    // ravens
    if (state === "play") {
      ravenTimer -= dt;
      if (ravenTimer <= 0 && ravens.length < 7) {
        ravenTimer = rand(1.2, 2.6);
        const fromRight = Math.random() < 0.7;
        ravens.push({
          x: camX + (fromRight ? W + 60 : -60), y: rand(H * 0.1, H * 0.62),
          vx: (fromRight ? -1 : 1) * rand(110, 190) * S, ph: rand(0, 6.28), dead: false, amp: rand(20, 50),
        });
      }
    }
    for (let i = ravens.length - 1; i >= 0; i--) {
      const r = ravens[i];
      r.ph += dt * 9;
      r.x += r.vx * dt;
      r.y += Math.sin(r.ph * 0.25) * r.amp * dt;
      if (r.dead || r.x < camX - 200 || r.x > camX + W + 200) ravens.splice(i, 1);
    }

    // debris
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.age += dt;
      if (b.age > b.life) { bits.splice(i, 1); continue; }
      b.vy += 300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
    }

    // lightning
    lightning.next -= dt;
    if (lightning.next <= 0) {
      lightning.next = rand(5, 11);
      lightning.life = 0.32; lightning.flash = 1;
      const x0 = rand(W * 0.1, W * 0.9);
      let x = x0, y = 0;
      lightning.pts = [[x, y]];
      while (y < H * 0.62) { y += rand(18, 42); x += rand(-34, 34); lightning.pts.push([x, y]); }
      shake = Math.max(shake, 3);
    }
    lightning.life = Math.max(0, lightning.life - dt);
    lightning.flash = Math.max(0, lightning.flash - dt * 3.2);

    // clouds drift
    clouds.forEach((c) => { c.x -= c.v * dt; if (c.x < -600) c.x = W * 2 + rand(0, 300); });
  }

  function killRaven(r) {
    r.dead = true;
    score += 10;
    scoreEl.textContent = score;
    for (let k = 0; k < 14; k++) {
      bits.push({ x: r.x, y: r.y, vx: rand(-160, 160), vy: rand(-220, 40), age: 0, life: rand(0.6, 1.2), rot: rand(0, 6), vr: rand(-8, 8), s: rand(3, 7) * S });
    }
    for (let k = 0; k < 16; k++) {
      fire.push({ x: r.x, y: r.y, vx: rand(-140, 140), vy: rand(-160, 60), age: 0, life: rand(0.3, 0.6), s0: 4 * S, s1: 20 * S, drag: 2, noHit: true });
    }
  }

  function mouthPos() {
    const d = dragon, h = d.p[0], HS = S * 1.15;
    const flip = Math.cos(d.headAngle) < 0 ? -1 : 1;
    const lx = 50 * HS, ly = (3 + d.jaw * 6) * HS * flip;
    const c = Math.cos(d.headAngle), s = Math.sin(d.headAngle);
    return { x: h.x + lx * c - ly * s, y: h.y + lx * s + ly * c };
  }

  /* ---------------- Draw: background ---------------- */
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#04050a");
    g.addColorStop(0.45, "#0f0a10");
    g.addColorStop(0.78, "#26120e");
    g.addColorStop(1, "#3a170c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // moon
    const mx = W * 0.8 - camX * 0.03, my = H * 0.18, mr = Math.min(W, H) * 0.06;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5;
    ctx.drawImage(SPR.frost, mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
    mg.addColorStop(0, "#f4f1e6"); mg.addColorStop(1, "#a9b4bb");
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(120,130,140,.25)";
    ctx.beginPath(); ctx.arc(mx + mr * 0.3, my + mr * 0.15, mr * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx - mr * 0.35, my - mr * 0.25, mr * 0.14, 0, Math.PI * 2); ctx.fill();

    // clouds
    clouds.forEach((c) => {
      const x = ((c.x - camX * 0.08) % (W * 2 + 600) + W * 2 + 600) % (W * 2 + 600) - 600;
      ctx.drawImage(cloudSprite, x, c.y, 520 * c.s * S * 1.4, 200 * c.s * S * 1.4);
    });

    // lightning bolt
    if (lightning.life > 0 && lightning.pts.length) {
      ctx.save();
      ctx.globalAlpha = lightning.life / 0.32;
      ctx.strokeStyle = "rgba(200,225,255,.95)";
      ctx.shadowColor = "rgba(160,200,255,1)";
      ctx.shadowBlur = 24;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      lightning.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRidge(arr, par, color, top) {
    const off = camX * par;
    const i0 = Math.max(0, Math.floor(off / STEP) - 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(i0 * STEP - off, H);
    for (let i = i0; i < arr.length && i * STEP - off < W + STEP * 2; i++) ctx.lineTo(i * STEP - off, arr[i]);
    ctx.lineTo(W + STEP * 2, H);
    ctx.closePath();
    ctx.fill();
    if (top) {
      ctx.strokeStyle = top; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = i0; i < arr.length && i * STEP - off < W + STEP * 2; i++) {
        const x = i * STEP - off;
        i === i0 ? ctx.moveTo(x, arr[i]) : ctx.lineTo(x, arr[i]);
      }
      ctx.stroke();
    }
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
        const tx = x + (k / (c.towers - 1 || 1)) * (c.w - tw);
        const th = c.h * (1.3 + ((c.seed * 10 + k) % 1) * 0.8);
        ctx.fillRect(tx, base - th, tw, th);
        ctx.beginPath();
        ctx.moveTo(tx - 3, base - th); ctx.lineTo(tx + tw / 2, base - th - tw * 1.3); ctx.lineTo(tx + tw + 3, base - th);
        ctx.fill();
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
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 40; x += 40) {
      const wx = x + camX;
      ctx.lineTo(x, groundY + Math.sin(wx * 0.01) * 6 + Math.sin(wx * 0.037) * 4);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  }

  /* ---------------- Draw: towers ---------------- */
  function drawTower(t) {
    const x = t.x - camX;
    if (x < -260 || x > W + 260) return;
    const w = t.w, top = t.top;
    // body
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "#1c1714"); g.addColorStop(0.5, "#2c2420"); g.addColorStop(1, "#151110");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, groundY + 20);
    ctx.lineTo(x - w * 0.42, top);
    ctx.lineTo(x + w * 0.42, top);
    ctx.lineTo(x + w / 2, groundY + 20);
    ctx.fill();
    // crenellations
    const cw = w * 0.9, cx0 = x - cw / 2, ch = 14 * S;
    ctx.fillRect(cx0, top - 6 * S, cw, 8 * S);
    for (let k = 0; k < 5; k += 2) ctx.fillRect(cx0 + (k / 5) * cw, top - 6 * S - ch, cw / 5, ch);
    // stone lines
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    for (let y = top + 18 * S; y < groundY; y += 18 * S) {
      ctx.beginPath(); ctx.moveTo(x - w * 0.45, y); ctx.lineTo(x + w * 0.45, y); ctx.stroke();
    }
    // windows
    for (let k = 0; k < 3; k++) {
      const wy = top + 40 * S + k * 70 * S;
      if (wy > groundY - 30) break;
      const lit = t.burned || k === 1;
      ctx.fillStyle = lit ? `rgba(255,${t.burned ? 120 : 170},50,${0.65 + Math.sin(time * 4 + k) * 0.2})` : "#0b0908";
      ctx.beginPath();
      ctx.moveTo(x - 6 * S, wy + 18 * S); ctx.lineTo(x - 6 * S, wy + 5 * S);
      ctx.quadraticCurveTo(x, wy - 3 * S, x + 6 * S, wy + 5 * S); ctx.lineTo(x + 6 * S, wy + 18 * S);
      ctx.fill();
    }
    // pole
    const poleTop = top - 64 * S;
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 3 * S;
    ctx.beginPath(); ctx.moveTo(x, top - 6 * S); ctx.lineTo(x, poleTop); ctx.stroke();
    ctx.fillStyle = "#d9a441";
    ctx.beginPath(); ctx.arc(x, poleTop, 3.5 * S, 0, Math.PI * 2); ctx.fill();

    const b = bannerRect(t);
    const bx = b.x - camX;
    if (!t.burned) {
      // waving banner with swallowtail
      const heat = clamp(t.heat / 2.2, 0, 1);
      ctx.save();
      ctx.beginPath();
      const segs = 10;
      for (let k = 0; k <= segs; k++) {
        const u = k / segs, px = bx + u * b.w, wave = Math.sin(time * 4 - u * 5 + t.i) * 4 * S * u;
        k === 0 ? ctx.moveTo(px, b.y + wave) : ctx.lineTo(px, b.y + wave);
      }
      const tailWave = Math.sin(time * 4 - 5 + t.i) * 4 * S;
      ctx.lineTo(bx + b.w - 14 * S, b.y + b.h / 2 + tailWave);
      ctx.lineTo(bx + b.w, b.y + b.h + tailWave);
      for (let k = segs; k >= 0; k--) {
        const u = k / segs, px = bx + u * b.w, wave = Math.sin(time * 4 - u * 5 + t.i) * 4 * S * u;
        ctx.lineTo(px, b.y + b.h + wave);
      }
      ctx.closePath();
      const bg = ctx.createLinearGradient(bx, b.y, bx + b.w, b.y + b.h);
      bg.addColorStop(0, `rgb(${110 + heat * 140},${22 + heat * 70},${18})`);
      bg.addColorStop(1, `rgb(${60 + heat * 120},${12 + heat * 40},${10})`);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#f3d58b";
      ctx.font = `700 ${Math.round(11 * S)}px Cinzel, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const label = t.repo.name.length > 13 ? t.repo.name.slice(0, 12) + "…" : t.repo.name;
      ctx.fillText(label, bx + b.w * 0.45, b.y + b.h / 2);
      ctx.restore();
      if (heat > 0.05) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = heat * 0.8;
        ctx.drawImage(SPR.glow, bx - b.w * 0.5, b.y - b.h, b.w * 2, b.h * 3);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      // floating hint
      if (state === "play") {
        ctx.fillStyle = "rgba(236,227,207,.55)";
        ctx.font = `500 ${Math.round(10 * S)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("🔥 burn me", bx + b.w / 2, b.y - 12 * S + Math.sin(time * 3 + t.i) * 3);
      }
    } else {
      // charred remnant + label
      ctx.fillStyle = "#1a0f0b";
      ctx.fillRect(bx, b.y, 10 * S, b.h * 0.5);
      ctx.fillStyle = "#ffb26b";
      ctx.font = `700 ${Math.round(11 * S)}px Cinzel, serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("✓ " + t.repo.title, x, top + 22 * S > groundY ? top : poleTop - 26 * S);
    }
  }

  /* ---------------- Draw: dragon ---------------- */
  function drawWing(sx, sy, ang, flip, phase, far) {
    const WS = S * 1.3;
    const k = Math.sin(phase);
    const m = (0.15 + 0.85 * k) * (far ? 0.82 : 1);
    const xs = 1 - 0.12 * Math.abs(k);
    const P = (x, y) => [x * xs * WS, y * m * WS];
    const O = P(0, 0), E = P(-18, -48), Wr = P(6, -92);
    const tips = [P(-36, -140), P(-94, -118), P(-130, -76), P(-136, -26)];
    const R = P(-74, 6);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.scale(1, flip);
    if (far) ctx.translate(6 * S, -5 * S);

    // membrane
    ctx.beginPath();
    ctx.moveTo(...O); ctx.lineTo(...E); ctx.lineTo(...Wr); ctx.lineTo(...tips[0]);
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1];
      const cx = lerp((a[0] + b[0]) / 2, Wr[0], 0.28), cy = lerp((a[1] + b[1]) / 2, Wr[1], 0.28);
      ctx.quadraticCurveTo(cx, cy, b[0], b[1]);
    }
    const lc = [lerp((tips[3][0] + R[0]) / 2, Wr[0], 0.2), lerp((tips[3][1] + R[1]) / 2, Wr[1], 0.2)];
    ctx.quadraticCurveTo(lc[0], lc[1], R[0], R[1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(Wr[0], Wr[1], R[0], R[1]);
    if (far) { g.addColorStop(0, "rgba(46,14,10,.97)"); g.addColorStop(1, "rgba(26,8,6,.97)"); }
    else { g.addColorStop(0, "rgba(128,34,18,.94)"); g.addColorStop(0.6, "rgba(84,20,12,.95)"); g.addColorStop(1, "rgba(48,12,8,.97)"); }
    ctx.fillStyle = g;
    ctx.fill();
    if (!far && dragon.breathing) { ctx.fillStyle = "rgba(255,120,40,.12)"; ctx.fill(); }

    // bones
    ctx.strokeStyle = far ? "#140504" : "#2a0d08";
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = 4.5 * S;
    ctx.beginPath(); ctx.moveTo(...O); ctx.lineTo(...E); ctx.lineTo(...Wr); ctx.stroke();
    ctx.lineWidth = 2.2 * S;
    tips.forEach((tp) => { ctx.beginPath(); ctx.moveTo(...Wr); ctx.lineTo(...tp); ctx.stroke(); });
    // claw on wrist
    ctx.fillStyle = "#c9b08a";
    ctx.beginPath(); ctx.moveTo(Wr[0], Wr[1]); ctx.lineTo(Wr[0] + 8 * S, Wr[1] - 6 * S * Math.sign(m || 1)); ctx.lineTo(Wr[0] + 2 * S, Wr[1] + 2 * S); ctx.fill();
    ctx.restore();
  }

  function drawDragon() {
    const d = dragon, p = d.p.map((q) => ({ x: q.x - camX, y: q.y }));
    // normals and widths
    const L = [], R = [], nrm = [], tan = [];
    for (let i = 0; i < N; i++) {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(N - 1, i + 1)];
      let tx = a.x - b.x, ty = a.y - b.y;
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      const nx = -ty, ny = tx;
      const w = bodyWidth(i);
      tan.push([tx, ty]); nrm.push([nx, ny]);
      L.push([p[i].x + nx * w, p[i].y + ny * w]);
      R.push([p[i].x - nx * w, p[i].y - ny * w]);
    }
    const shoulder = p[6];
    const bodyAng = Math.atan2(p[5].y - p[7].y, p[5].x - p[7].x);
    const flip = Math.cos(bodyAng) < 0 ? -1 : 1;

    // shadow on ground
    const hy = d.p[0].y;
    const shAlpha = clamp(1 - (groundY - hy) / (H * 0.8), 0.05, 0.35);
    ctx.fillStyle = `rgba(0,0,0,${shAlpha})`;
    ctx.beginPath(); ctx.ellipse(p[8].x, groundY + 8, 120 * S, 10 * S, 0, 0, Math.PI * 2); ctx.fill();

    // far wing
    drawWing(shoulder.x, shoulder.y, bodyAng, flip, d.flap - 0.35, true);

    // body
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < N; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = N - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = "#2b110d";
    ctx.fill();
    ctx.strokeStyle = "rgba(150,48,22,.55)";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // belly plates & dorsal spikes
    for (let i = 1; i < N - 1; i++) {
      const lowerIsL = nrm[i][1] > 0;
      const low = lowerIsL ? L[i] : R[i], up = lowerIsL ? R[i] : L[i];
      const w = bodyWidth(i);
      // belly
      ctx.strokeStyle = `rgba(150,70,32,${0.55 - i / N * 0.3})`;
      ctx.lineWidth = Math.max(1, w * 0.55);
      ctx.beginPath();
      ctx.moveTo(lerp(p[i].x, low[0], 0.55), lerp(p[i].y, low[1], 0.55));
      ctx.lineTo(lerp(p[i + 1].x, (nrm[i + 1][1] > 0 ? L[i + 1] : R[i + 1])[0], 0.55), lerp(p[i + 1].y, (nrm[i + 1][1] > 0 ? L[i + 1] : R[i + 1])[1], 0.55));
      ctx.stroke();
      // spikes
      if (i >= 2 && i <= N - 4) {
        const sgn = lowerIsL ? -1 : 1;
        const nx = nrm[i][0] * sgn, ny = nrm[i][1] * sgn;
        const len = w * 0.75 + 3 * S;
        const bx = up[0], by = up[1];
        ctx.fillStyle = "#170705";
        ctx.beginPath();
        ctx.moveTo(bx + tan[i][0] * w * 0.35, by + tan[i][1] * w * 0.35);
        ctx.lineTo(bx + nx * len - tan[i][0] * len * 0.45, by + ny * len - tan[i][1] * len * 0.45);
        ctx.lineTo(bx - tan[i][0] * w * 0.35, by - tan[i][1] * w * 0.35);
        ctx.fill();
      }
      // scale glints
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,120,60,.08)";
        ctx.beginPath(); ctx.arc(p[i].x, p[i].y, w * 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // tail spade
    const tl = p[N - 1], tt = tan[N - 1], tn = nrm[N - 1], ts = 12 * S;
    ctx.fillStyle = "#3a140e";
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tl.x - tt[0] * ts * 0.6 + tn[0] * ts * 0.7, tl.y - tt[1] * ts * 0.6 + tn[1] * ts * 0.7);
    ctx.lineTo(tl.x - tt[0] * ts * 1.6, tl.y - tt[1] * ts * 1.6);
    ctx.lineTo(tl.x - tt[0] * ts * 0.6 - tn[0] * ts * 0.7, tl.y - tt[1] * ts * 0.6 - tn[1] * ts * 0.7);
    ctx.closePath();
    ctx.fill();

    // legs (front at 8, hind at 18)
    [8, 18].forEach((i) => {
      const lowerIsL = nrm[i][1] > 0;
      const low = lowerIsL ? L[i] : R[i];
      const fwd = tan[i];
      const tuck = clamp(Math.hypot(d.vx, d.vy) / (600 * S), 0, 1);
      const len = (i === 8 ? 14 : 18) * S;
      const kx = low[0] - fwd[0] * len * (0.3 + tuck * 0.6), ky = low[1] + len * (1 - tuck * 0.45);
      const fx = kx + fwd[0] * len * 0.5 * (1 - tuck), fy = ky + len * 0.8 * (1 - tuck * 0.5);
      ctx.strokeStyle = "#24100c"; ctx.lineCap = "round";
      ctx.lineWidth = (i === 8 ? 5 : 7) * S;
      ctx.beginPath(); ctx.moveTo(low[0], low[1]); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.strokeStyle = "#c9b08a"; ctx.lineWidth = 1.6 * S;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (fwd[0] * 6 + c * 3) * S, fy + 5 * S); ctx.stroke();
      }
    });

    // near wing
    drawWing(shoulder.x, shoulder.y, bodyAng, flip, d.flap, false);

    drawHead(p[0].x, p[0].y);
  }

  function drawHead(x, y) {
    const d = dragon, HS = S * 1.15;
    const flip = Math.cos(d.headAngle) < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.headAngle);
    ctx.scale(HS, HS * flip);
    const jaw = d.jaw;

    // mouth glow / interior
    if (jaw > 0.12) {
      ctx.save();
      ctx.fillStyle = d.breathing ? "rgba(255,170,70,.95)" : "#3b0c08";
      ctx.beginPath();
      ctx.moveTo(2, 2); ctx.lineTo(46, 1);
      ctx.lineTo(2 + Math.cos(jaw) * 42, 3 + Math.sin(jaw) * 42);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // horns (back)
    ctx.fillStyle = "#b8a07a";
    ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(-8, -32, -26, -38); ctx.quadraticCurveTo(-10, -26, -1, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2, -9); ctx.quadraticCurveTo(-20, -20, -36, -21); ctx.quadraticCurveTo(-20, -13, -8, -4); ctx.closePath(); ctx.fill(); ctx.stroke();

    // lower jaw
    ctx.save();
    ctx.translate(0, 3);
    ctx.rotate(jaw);
    ctx.fillStyle = "#33130e";
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(44, 0); ctx.quadraticCurveTo(47, 4, 41, 6); ctx.lineTo(6, 9); ctx.lineTo(-4, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(150,48,22,.5)"; ctx.lineWidth = 0.8; ctx.stroke();
    if (jaw > 0.12) {
      ctx.fillStyle = "#efe6d2";
      for (let tx = 16; tx <= 42; tx += 5) { ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + 1.6, -4); ctx.lineTo(tx + 3.2, 0); ctx.fill(); }
    }
    // chin spikes
    ctx.fillStyle = "#1a0705";
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(-6, 16); ctx.lineTo(10, 8.5); ctx.fill();
    ctx.restore();

    // skull / upper jaw
    const g = ctx.createLinearGradient(0, -16, 0, 6);
    g.addColorStop(0, "#43180f"); g.addColorStop(1, "#2a0f0b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.bezierCurveTo(4, -18, 20, -17, 31, -12);
    ctx.lineTo(47, -6);
    ctx.quadraticCurveTo(53, -3, 50, 1);
    ctx.lineTo(30, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(170,60,28,.55)"; ctx.lineWidth = 0.9; ctx.stroke();
    // upper teeth
    if (jaw > 0.12) {
      ctx.fillStyle = "#efe6d2";
      for (let tx = 18; tx <= 44; tx += 5) { ctx.beginPath(); ctx.moveTo(tx, 2); ctx.lineTo(tx + 1.6, 6.5); ctx.lineTo(tx + 3.2, 1.8); ctx.fill(); }
    }
    // brow ridge
    ctx.strokeStyle = "#150504"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(12, -13); ctx.lineTo(30, -10.5); ctx.stroke();
    // cheek frills
    ctx.fillStyle = "#1a0705";
    ctx.beginPath(); ctx.moveTo(-4, -2); ctx.lineTo(-18, -6); ctx.lineTo(-6, 3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 3); ctx.lineTo(-16, 7); ctx.lineTo(-4, 6.5); ctx.fill();
    // nostril
    ctx.fillStyle = "#0c0302";
    ctx.beginPath(); ctx.ellipse(45, -4, 1.8, 1, -0.3, 0, Math.PI * 2); ctx.fill();
    // eye
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(SPR.ember, 15, -16, 16, 16);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffbf3a";
    ctx.beginPath(); ctx.ellipse(23, -8, 3.6, 2.4, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#120302";
    ctx.beginPath(); ctx.ellipse(23.4, -8, 0.8, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* ---------------- Draw: ravens, fire, fx ---------------- */
  function drawRavens() {
    ravens.forEach((r) => {
      const x = r.x - camX, y = r.y, s = 12 * S, f = Math.sin(r.ph);
      const dir = r.vx < 0 ? -1 : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = "#050506";
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.1); ctx.lineTo(s * 1.25, 0); ctx.lineTo(s * 0.7, s * 0.12); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(-s * 1.4, -s * 0.25); ctx.lineTo(-s * 1.4, s * 0.25); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, 0); ctx.quadraticCurveTo(-s * 0.4, -s * 1.3 * f, -s * 1.2, -s * 1.1 * f); ctx.quadraticCurveTo(-s * 0.2, -s * 0.4 * f, s * 0.3, 0); ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(SPR.frost, s * 0.45, -s * 0.35, s * 0.5, s * 0.5);
      ctx.restore();
    });
    ctx.fillStyle = "#0b0b0c";
    bits.forEach((b) => {
      ctx.save();
      ctx.globalAlpha = 1 - b.age / b.life;
      ctx.translate(b.x - camX, b.y); ctx.rotate(b.rot);
      ctx.beginPath(); ctx.ellipse(0, 0, b.s, b.s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function drawFire() {
    // smoke first (normal blend)
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
      const img = st < 0.12 ? SPR.core : st < 0.32 ? SPR.yellow : st < 0.6 ? SPR.orange : SPR.red;
      ctx.globalAlpha = st < 0.6 ? 0.9 : (0.85 - st) * 3;
      ctx.drawImage(img, f.x - camX - sz / 2, f.y - sz / 2, sz, sz);
    }
    // light cast by the flame
    if (dragon.breathing) {
      const m = mouthPos();
      ctx.globalAlpha = 0.55 + Math.random() * 0.15;
      const r = 340 * S;
      ctx.drawImage(SPR.glow, m.x - camX - r * 0.4, m.y - r, r * 2.4, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function drawEmbers(dt) {
    ctx.globalCompositeOperation = "lighter";
    embers.forEach((e) => {
      e.y -= e.v * dt * (e.frost ? -0.6 : 1);
      e.ph += dt * 2;
      if (e.y < -0.05) { e.y = 1.05; e.x = Math.random(); }
      if (e.y > 1.05) { e.y = -0.05; e.x = Math.random(); }
      const x = (((e.x * W * 1.3 - camX * 0.4 * e.s) % (W * 1.3)) + W * 1.3) % (W * 1.3) - W * 0.15 + Math.sin(e.ph) * 12;
      const y = e.y * H, s = (e.frost ? 6 : 8) * e.s;
      ctx.globalAlpha = 0.5 + Math.sin(e.ph * 3) * 0.3;
      ctx.drawImage(e.frost ? SPR.frost : SPR.ember, x - s / 2, y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function drawOverlay() {
    // ground fog + vignette
    const fg = ctx.createLinearGradient(0, H * 0.75, 0, H);
    fg.addColorStop(0, "rgba(40,18,10,0)"); fg.addColorStop(1, "rgba(60,22,10,.45)");
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.75, W, H * 0.25);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (lightning.flash > 0) {
      ctx.fillStyle = `rgba(190,215,255,${lightning.flash * 0.22})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawArrows() {
    if (state !== "play") return;
    const next = towers.find((t) => !t.burned);
    if (!next) return;
    const sx = next.x - camX;
    if (sx > -20 && sx < W + 20) return;
    const right = sx > W;
    const ax = right ? W - 34 : 34, ay = H * 0.5 + Math.sin(time * 3) * 6;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.fillStyle = "rgba(14,12,10,.7)";
    ctx.strokeStyle = "#d9a441"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#ff9a4d";
    ctx.beginPath();
    if (right) { ctx.moveTo(8, 0); ctx.lineTo(-5, -8); ctx.lineTo(-5, 8); }
    else { ctx.moveTo(-8, 0); ctx.lineTo(5, -8); ctx.lineTo(5, 8); }
    ctx.fill();
    ctx.fillStyle = "#f3d58b";
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textAlign = right ? "right" : "left";
    ctx.fillText(next.repo.name, right ? -28 : 28, 4);
    ctx.restore();
  }

  /* ---------------- Loop ---------------- */
  // Test hook: dragon.html#sim=6&play=1&keys=r&fire=1&dx=500 fast-forwards the simulation (used for screenshots)
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
        if (q.get("dx")) { dragon.p.forEach((pt) => (pt.x += parseFloat(q.get("dx")))); }
        if (q.get("dy")) { dragon.p.forEach((pt) => (pt.y += parseFloat(q.get("dy")))); }
      }
      update(1 / 60);
    }
    lightning.flash = 0; lightning.life = 0;
  })();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);

    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawSky();
    drawRidge(ridgeFar, 0.15, "#120e13", "rgba(169,198,211,.12)");
    drawRidge(ridgeNear, 0.35, "#0c0a0c", "rgba(232,112,58,.10)");
    drawCastles();
    drawGround();
    towers.forEach(drawTower);
    drawDragon();
    drawRavens();
    drawFire();
    drawEmbers(dt);
    ctx.restore();
    drawOverlay();
    drawArrows();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
