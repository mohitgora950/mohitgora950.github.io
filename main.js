/* =========================================================
   Mohit Gora — Portfolio interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => window.innerWidth <= 860;

  /* ---------------- Loader ---------------- */
  const loader = $("#loader");
  const hideLoader = () => loader && loader.classList.add("hidden");
  window.addEventListener("load", () => setTimeout(hideLoader, 450));
  setTimeout(hideLoader, 3000); // never block the page

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Toast ---------------- */
  const toastEl = $("#toast");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  /* ---------------- Nav: scroll state, mobile menu, active link ---------------- */
  const nav = $("#nav");
  const navLinks = $("#navLinks");
  const navToggle = $("#navToggle");
  const progress = $("#scrollProgress");

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    navLinks.classList.remove("open");
    navToggle.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  navToggle.addEventListener("click", () => {
    const open = !navLinks.classList.contains("open");
    navLinks.classList.toggle("open", open);
    navToggle.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$("a", navLinks).forEach((a) => a.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  const sectionLinks = new Map($$("a[href^='#']", navLinks).map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        sectionLinks.forEach((a) => a.classList.remove("active"));
        const link = sectionLinks.get(en.target.id);
        if (link && !link.classList.contains("nav-cta")) link.classList.add("active");
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main section[id]").forEach((s) => spy.observe(s));

  /* ---------------- Cursor glow ---------------- */
  const glow = $("#cursorGlow");
  if (finePointer && !reduceMotion) {
    let gx = 0, gy = 0, tx = 0, ty = 0;
    window.addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function moveGlow() {
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      glow.style.transform = `translate(${gx - 210}px, ${gy - 210}px)`;
      requestAnimationFrame(moveGlow);
    })();
  }

  /* ---------------- Typed roles ---------------- */
  const roles = ["a Software Engineer", "a Full-Stack Developer", "an AI / ML Engineer in the making", "a Data Scientist", "a Problem Solver"];
  const typed = $("#typed");
  if (!reduceMotion) {
    let r = 0, i = roles[0].length, deleting = true;
    const tick = () => {
      const word = roles[r];
      if (deleting) {
        i--;
        typed.textContent = word.slice(0, i);
        if (i === 0) { deleting = false; r = (r + 1) % roles.length; }
        setTimeout(tick, 38);
      } else {
        const next = roles[r];
        i++;
        typed.textContent = next.slice(0, i);
        if (i === next.length) { deleting = true; setTimeout(tick, 1900); }
        else setTimeout(tick, 75);
      }
    };
    setTimeout(tick, 2600);
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealer = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          revealer.unobserve(en.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el, idx) => {
    // light stagger for siblings in grids
    const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [];
    const pos = sibs.indexOf(el);
    if (pos > 0 && sibs.length > 1) el.style.transitionDelay = `${Math.min(pos, 5) * 80}ms`;
    revealer.observe(el);
  });

  /* ---------------- Counters ---------------- */
  const counter = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        counter.unobserve(el);
        const end = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        if (reduceMotion || end === 0) { el.textContent = end + suffix; return; }
        const dur = 1600, t0 = performance.now();
        const step = (now) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 }
  );
  $$(".stat-num").forEach((el) => counter.observe(el));

  /* ---------------- Crest flip (touch / keyboard) ---------------- */
  const crest = $("#crest");
  const hoverNone = window.matchMedia("(hover: none)").matches;
  crest.addEventListener("click", () => hoverNone && crest.classList.toggle("flipped"));
  crest.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); crest.classList.toggle("flipped"); }
  });

  /* ---------------- 3D tilt cards ---------------- */
  if (finePointer && !reduceMotion) {
    $$(".tilt").forEach((card) => {
      const max = card.classList.contains("project") ? 4 : 8;
      card.addEventListener("pointermove", (e) => {
        if (!card.classList.contains("in")) return;
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = "transform .08s linear, border-color .35s, box-shadow .35s";
        card.style.transform = `perspective(1100px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => {
        card.style.transition = "transform .6s cubic-bezier(.2,.7,.2,1), border-color .35s, box-shadow .35s";
        card.style.transform = "";
      });
    });
  }

  /* ---------------- RAG pipeline ---------------- */
  const ragInfo = $("#ragInfo");
  const ragSteps = $$(".rag-step");
  let ragIdx = 0, ragAuto;
  function setRag(i) {
    ragIdx = i;
    ragSteps.forEach((b, k) => b.classList.toggle("active", k === i));
    ragInfo.textContent = ragSteps[i].dataset.info;
  }
  ragSteps.forEach((b, i) =>
    b.addEventListener("click", () => {
      clearInterval(ragAuto);
      setRag(i);
    })
  );
  if (!reduceMotion) {
    const ragObs = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        clearInterval(ragAuto);
        if (en.isIntersecting) ragAuto = setInterval(() => setRag((ragIdx + 1) % ragSteps.length), 3200);
      });
    }, { threshold: 0.5 });
    ragObs.observe($("#ragFlow"));
  }

  /* ---------------- Copy buttons ---------------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }
  $$(".copy-btn").forEach((btn) =>
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyText(btn.dataset.copy);
      toast(ok ? `Copied: ${btn.dataset.copy}` : "Couldn't copy. Please copy it manually.");
    })
  );

  /* ---------------- Contact form → mailto ---------------- */
  const form = $("#ravenForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const topic = (fd.get("topic") || "").toString();
    const message = (fd.get("message") || "").toString().trim();

    let valid = true;
    [["name", name], ["email", email], ["message", message]].forEach(([k, v]) => {
      const field = form.elements[k];
      const bad = !v || (k === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      field.classList.toggle("invalid", bad);
      if (bad) valid = false;
    });
    if (!valid) { toast("Please fill in your name, a valid email and a message."); return; }

    const subject = `[Portfolio] ${topic} — ${name}`;
    const body = `Hi Mohit,\n\n${message}\n\n— ${name}\n${email}`;
    window.location.href = `mailto:mohitgora950@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast("Opening your email app…");
    form.reset();
  });

  /* ---------------- 3D tag sphere (skills) ---------------- */
  (function tagSphere() {
    const host = $("#tagSphere");
    if (!host) return;
    const words = [
      ["Python", "hot"], ["C++", "hot"], ["JavaScript"], ["SQL"], ["Node.js"], ["Express"], ["MySQL"], ["MongoDB"],
      ["PyTorch", "hot"], ["RAG", "cool"], ["Transformers", "cool"], ["Encoder", "cool"], ["Decoder", "cool"], ["ML"],
      ["Docker"], ["Kubernetes", "hot"], ["FastAPI"], ["JWT"], ["Chart.js"], ["OpenCV"], ["MediaPipe"], ["Pandas"],
      ["Git"], ["GitHub Actions"], ["REST APIs"], ["DSA", "hot"], ["HTML5"], ["CSS3"], ["Traefik"], ["Linux"],
      ["Hugging Face", "cool"], ["Distillation", "cool"], ["OS"], ["Networks"], ["Postman"], ["bcrypt"],
    ];
    const n = words.length;
    const tags = words.map(([w, cls], i) => {
      const el = document.createElement("span");
      el.textContent = w;
      if (cls) el.className = cls;
      host.appendChild(el);
      // Fibonacci sphere distribution
      const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return { el, x: Math.cos(theta) * Math.sin(phi), y: Math.sin(theta) * Math.sin(phi), z: Math.cos(phi) };
    });

    let R = 160, vx = 0.0025, vy = 0.004, dragging = false, lx = 0, ly = 0, running = false;
    const sizeIt = () => { R = host.clientWidth * 0.37; host.style.fontSize = Math.max(12, Math.min(16, host.clientWidth / 30)) + "px"; };
    sizeIt();
    window.addEventListener("resize", sizeIt);

    function rotate(ax, ay) {
      const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
      tags.forEach((t) => {
        const y1 = t.y * cx - t.z * sx;
        const z1 = t.y * sx + t.z * cx;
        const x2 = t.x * cy + z1 * sy;
        const z2 = -t.x * sy + z1 * cy;
        t.x = x2; t.y = y1; t.z = z2;
      });
    }
    function draw() {
      tags.forEach((t) => {
        const a = (t.z + 1) / 2; // 0 back → 1 front
        const s = 0.55 + a * 0.75;
        t.el.style.transform = `translate(-50%, -50%) translate3d(${(t.x * R).toFixed(1)}px, ${(t.y * R).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
        t.el.style.opacity = (0.18 + a * 0.82).toFixed(2);
        t.el.style.zIndex = Math.round(a * 100);
        t.el.style.filter = a < 0.35 ? "blur(1px)" : "none";
      });
    }
    function loop() {
      if (!running) return;
      if (!dragging) {
        vx += (0.0025 - vx) * 0.02;
        vy += (0.004 - vy) * 0.02;
      }
      rotate(vx, vy);
      draw();
      requestAnimationFrame(loop);
    }
    draw();

    host.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; host.setPointerCapture(e.pointerId); });
    host.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      vy = (e.clientX - lx) * 0.004;
      vx = -(e.clientY - ly) * 0.004;
      lx = e.clientX; ly = e.clientY;
    });
    const end = () => { dragging = false; };
    host.addEventListener("pointerup", end);
    host.addEventListener("pointercancel", end);

    if (reduceMotion) return;
    new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        const was = running;
        running = en.isIntersecting;
        if (running && !was) requestAnimationFrame(loop);
      });
    }).observe(host);
  })();

  /* ---------------- Shared Three.js helpers ---------------- */
  const hasThree = typeof window.THREE !== "undefined";

  function makeGlowTexture(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.35, outer);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }

  function createRenderer(canvas) {
    try {
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.5 : 1.8));
      return r;
    } catch (err) {
      return null;
    }
  }

  /* ---------------- HERO 3D: neural core + armillary rings + embers & snow ---------------- */
  (function heroScene() {
    const canvas = $("#heroCanvas");
    const hero = $("#home");
    if (!hasThree || !canvas) { hero.classList.add("no-webgl"); return; }
    const renderer = createRenderer(canvas);
    if (!renderer) { hero.classList.add("no-webgl"); return; }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0d0b, 0.045);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    const GOLD = 0xd9a441, EMBER = 0xe8703a, FROST = 0xa9c6d3;

    // ---- Core group
    const core = new THREE.Group();
    scene.add(core);

    // neural icosphere — nodes & synapses
    const ico = new THREE.IcosahedronGeometry(2, 2);
    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(ico),
      new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.add(wire);

    const nodeTex = makeGlowTexture("rgba(255,236,190,1)", "rgba(232,140,60,.45)");
    const nodes = new THREE.Points(
      ico,
      new THREE.PointsMaterial({ size: 0.22, map: nodeTex, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    core.add(nodes);

    // inner solid for depth (faceted, dark)
    const innerMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.25, 1),
      new THREE.MeshStandardMaterial({ color: 0x1a120b, emissive: 0x4a1d08, roughness: 0.4, metalness: 0.8, flatShading: true })
    );
    core.add(innerMesh);

    // ember heart glow
    const heart = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture("rgba(255,210,140,1)", "rgba(232,100,40,.5)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    heart.scale.set(5.2, 5.2, 1);
    core.add(heart);

    // armillary rings (astrolabe)
    const rings = [];
    const ringDefs = [
      { r: 2.9, tilt: [Math.PI / 2, 0, 0], speed: 0.25, color: GOLD },
      { r: 3.25, tilt: [Math.PI / 3, Math.PI / 4, 0], speed: -0.18, color: GOLD },
      { r: 3.6, tilt: [-Math.PI / 5, -Math.PI / 3, 0], speed: 0.12, color: FROST },
    ];
    ringDefs.forEach((d) => {
      const pivot = new THREE.Group();
      pivot.rotation.set(...d.tilt);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(d.r, 0.018, 8, 200),
        new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.55 })
      );
      pivot.add(ring);
      // bead orbiting on each ring
      const bead = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex, color: d.color === FROST ? 0xcfe6f0 : 0xffd27a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      bead.scale.set(0.55, 0.55, 1);
      bead.position.set(d.r, 0, 0);
      ring.add(bead);
      // tick marks
      const ticks = new THREE.Group();
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.03), new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.45 }));
        tick.position.set(Math.cos(a) * d.r, Math.sin(a) * d.r, 0);
        tick.rotation.z = a;
        ticks.add(tick);
      }
      ring.add(ticks);
      core.add(pivot);
      rings.push({ ring, speed: d.speed });
    });

    // lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const keyLight = new THREE.PointLight(EMBER, 2.2, 20);
    keyLight.position.set(0, 0, 0);
    core.add(keyLight);
    const rim = new THREE.DirectionalLight(FROST, 0.8);
    rim.position.set(-5, 4, 3);
    scene.add(rim);

    // ---- Particles
    const emberCount = isMobile() ? 260 : 650;
    const snowCount = isMobile() ? 160 : 380;
    const spread = { x: 26, y: 16, z: 14 };

    function makeField(count, colorA, colorB, size, tex) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const speed = new Float32Array(count);
      const phase = new Float32Array(count);
      const ca = new THREE.Color(colorA), cb = new THREE.Color(colorB), tmp = new THREE.Color();
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * spread.x;
        pos[i * 3 + 1] = (Math.random() - 0.5) * spread.y;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread.z - 2;
        tmp.copy(ca).lerp(cb, Math.random());
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        speed[i] = 0.4 + Math.random() * 1.1;
        phase[i] = Math.random() * Math.PI * 2;
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      return { pts, pos, speed, phase, count };
    }
    const embers = makeField(emberCount, 0xff8a3d, 0xffd27a, 0.16, makeGlowTexture("rgba(255,220,160,1)", "rgba(255,120,40,.5)"));
    const snow = makeField(snowCount, 0xbcd6e2, 0xffffff, 0.1, makeGlowTexture("rgba(255,255,255,1)", "rgba(180,210,225,.35)"));

    // ---- Layout / resize
    function layout() {
      const w = hero.clientWidth, h = hero.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (isMobile()) {
        core.position.set(1.7, 2.9, -1.5);
        core.scale.setScalar(0.72);
      } else {
        const shift = Math.min(4.2, 1.6 + (w / h) * 1.35);
        core.position.set(shift, 0.2, 0);
        core.scale.setScalar(1);
      }
    }
    layout();
    window.addEventListener("resize", layout);

    // ---- Interaction
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    let scrollFactor = 0;
    window.addEventListener("scroll", () => {
      scrollFactor = Math.min(window.scrollY / window.innerHeight, 1.2);
    }, { passive: true });

    // ---- Animate
    const clock = new THREE.Clock();
    let visible = true;
    new IntersectionObserver((ents) => ents.forEach((en) => { visible = en.isIntersecting; if (visible && !reduceMotion) clock.getDelta(); })).observe(hero);

    function updateField(f, dir, dt, t) {
      const p = f.pos;
      for (let i = 0; i < f.count; i++) {
        const ix = i * 3;
        p[ix + 1] += dir * f.speed[i] * dt * (dir > 0 ? 0.9 : 0.6);
        p[ix] += Math.sin(t * 0.8 + f.phase[i]) * dt * (dir > 0 ? 0.25 : 0.4);
        if (dir > 0 && p[ix + 1] > spread.y / 2) { p[ix + 1] = -spread.y / 2; p[ix] = (Math.random() - 0.5) * spread.x; }
        if (dir < 0 && p[ix + 1] < -spread.y / 2) { p[ix + 1] = spread.y / 2; p[ix] = (Math.random() - 0.5) * spread.x; }
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
    }

    function frame() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      core.rotation.y += dt * (0.12 + scrollFactor * 0.6);
      core.rotation.x = Math.sin(t * 0.25) * 0.15 + mouse.y * 0.25;
      core.rotation.z = mouse.x * -0.12;
      rings.forEach((r) => (r.ring.rotation.z += dt * r.speed * 2));
      innerMesh.rotation.x -= dt * 0.3;
      innerMesh.rotation.y -= dt * 0.2;

      const pulse = 1 + Math.sin(t * 2.2) * 0.06;
      heart.scale.set(5.2 * pulse, 5.2 * pulse, 1);
      keyLight.intensity = 2 + Math.sin(t * 3.1) * 0.4 + Math.sin(t * 7.3) * 0.15;
      nodes.material.size = 0.2 + Math.sin(t * 1.6) * 0.03;

      updateField(embers, +1, dt, t);
      updateField(snow, -1, dt, t);

      camera.position.x = mouse.x * 0.8;
      camera.position.y = -mouse.y * 0.5 - scrollFactor * 1.5;
      camera.lookAt(0, -scrollFactor * 1.5, 0);

      renderer.render(scene, camera);
    }

    if (reduceMotion) { frame(); return; }
    (function loop() {
      if (visible) frame();
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------------- Cricket ball 3D ---------------- */
  (function cricketBall() {
    const canvas = $("#ballCanvas");
    if (!hasThree || !canvas) return;
    const renderer = createRenderer(canvas);
    if (!renderer) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 6);

    // leather texture with seam + stitches (equirectangular)
    const W = 1024, H = 512;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, "#7d140d");
    grd.addColorStop(0.5, "#a3201a");
    grd.addColorStop(1, "#7d140d");
    g.fillStyle = grd;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { // leather grain
      g.fillStyle = `rgba(${Math.random() > 0.5 ? "0,0,0" : "255,140,120"},${Math.random() * 0.06})`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    const mid = H / 2;
    g.fillStyle = "#5e0d08";
    g.fillRect(0, mid - 6, W, 12);           // seam groove
    g.fillStyle = "#c9443a";
    g.fillRect(0, mid - 1.5, W, 3);          // seam ridge highlight
    g.strokeStyle = "#f4ecdc";
    g.lineWidth = 3;
    g.lineCap = "round";
    for (let x = 0; x < W; x += 14) {        // two rows of stitches
      g.beginPath(); g.moveTo(x, mid - 22); g.lineTo(x + 7, mid - 11); g.stroke();
      g.beginPath(); g.moveTo(x, mid + 22); g.lineTo(x + 7, mid + 11); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;

    const ballGroup = new THREE.Group();
    ballGroup.rotation.z = -0.45;
    ballGroup.rotation.x = 0.35;
    scene.add(ballGroup);
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 64, 48),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.08 })
    );
    ballGroup.add(ball);

    // shadow disc
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 40),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.75;
    scene.add(shadow);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xfff1d8, 1.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rimL = new THREE.DirectionalLight(0x9fd08a, 0.7);
    rimL.position.set(-4, -1, -2);
    scene.add(rimL);

    function size() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener("resize", size);

    const inView = () => {
      const r = canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    };
    const clock = new THREE.Clock();

    function frame() {
      const t = clock.getElapsedTime();
      ball.rotation.y = t * 2.4;                 // seam-up spin
      ballGroup.position.y = Math.abs(Math.sin(t * 1.6)) * 0.45 - 0.15;
      const s = 1 - ballGroup.position.y * 0.35;
      shadow.scale.set(s, s, 1);
      shadow.material.opacity = 0.25 + (1 - ballGroup.position.y) * 0.12;
      renderer.render(scene, camera);
    }
    if (reduceMotion) { frame(); return; }
    (function loop() {
      if (inView()) frame();
      requestAnimationFrame(loop);
    })();
  })();
})();
