(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reduceMQ.matches;
  if (!reduced) root.classList.add("smooth");

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ============================================================
     Signature visual: the growth lattice
     Scattered points assemble into an ordered grid of columns that
     rise toward one corner. Read as: scattered tasks, organised into
     a system that compounds. Pure canvas 2D, no dependencies.
     ============================================================ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

  function Lattice(canvas, opts) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return null;
    var still = !!opts.still;
    var rand = mulberry32(1909);
    var nodes = [], edges = [], diag = [], index = {};
    var N = 0, maxH = 0;
    var w = 0, h = 0, dpr = 1, unit = 40, cx = 0, cy = 0;
    var start = performance.now();
    var running = false, visible = true, raf = 0;
    var mx = 0, my = 0, tmx = 0, tmy = 0;

    function build(n) {
      N = n; nodes = []; edges = []; diag = []; index = {}; maxH = 0;
      rand = mulberry32(1909);
      for (var i = 0; i < N; i++) {
        for (var j = 0; j < N; j++) {
          var g = (i + (N - 1 - j)) / (2 * (N - 1));            // 0 at front, 1 at back corner
          var jitter = (rand() - 0.5) * 1.1;
          var hgt = clamp(Math.round(1 + 6 * Math.pow(g, 1.5) + jitter * 0.8 * g), 1, 7);
          if (hgt > maxH) maxH = hgt;
          for (var l = 0; l <= hgt; l++) {
            var theta = rand() * Math.PI * 2, phi = Math.acos(2 * rand() - 1), r = 3.2 + rand() * 3.4;
            var node = {
              x: i - (N - 1) / 2, y: -l * 0.62, z: j - (N - 1) / 2,
              sx: r * Math.sin(phi) * Math.cos(theta), sy: r * Math.cos(phi) * 0.7 - 1.5, sz: r * Math.sin(phi) * Math.sin(theta),
              delay: 0.05 + g * 0.55 + (l / 6) * 0.35 + rand() * 0.35,
              top: l === hgt, base: l === 0, level: l, px: 0, py: 0, pz: 0, p: 0
            };
            index[i + "," + j + "," + l] = nodes.length;
            nodes.push(node);
          }
          index[i + "," + j + ",top"] = index[i + "," + j + "," + hgt];
        }
      }
      for (i = 0; i < N; i++) {
        for (j = 0; j < N; j++) {
          if (i < N - 1) edges.push([index[i + "," + j + ",0"], index[(i + 1) + "," + j + ",0"], 0]);
          if (j < N - 1) edges.push([index[i + "," + j + ",0"], index[i + "," + (j + 1) + ",0"], 0]);
          for (var k = 0; index[i + "," + j + "," + (k + 1)] !== undefined; k++) {
            edges.push([index[i + "," + j + "," + k], index[i + "," + j + "," + (k + 1)], 1]);
          }
          if (i < N - 1) edges.push([index[i + "," + j + ",top"], index[(i + 1) + "," + j + ",top"], 2]);
          if (j < N - 1) edges.push([index[i + "," + j + ",top"], index[i + "," + (j + 1) + ",top"], 2]);
        }
      }
      // signal path: front corner to back corner across the top surface
      for (i = 0; i < N; i++) {
        diag.push(index[i + "," + (N - 1 - i) + ",top"]);
        if (i < N - 1) diag.push(index[(i + 1) + "," + (N - 1 - i) + ",top"]);
      }
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width); h = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var narrow = w < 980;
      var n = narrow ? 6 : 7;
      if (n !== N) build(n);
      if (still) {
        unit = Math.min(w * 0.05, h * 0.08, 60); cx = w * (narrow ? 0.6 : 0.72); cy = h * (narrow ? 0.2 : 0.42);
      } else if (narrow) {
        unit = Math.min(w * 0.078, 46); cx = w * 0.5; cy = Math.min(h * 0.24, 76 + unit * 3.3);
      } else {
        unit = Math.min(w * 0.05, h * 0.085, 80); cx = w * 0.7; cy = h * 0.47;
      }
      if (!running) draw(still || reduced ? 100 : (performance.now() - start) / 1000);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05;
      var settle = clamp((t - 1.5) / 1.4, 0, 1);
      var drift = still ? 0 : Math.sin(t * 0.11) * 0.16;
      var yaw = 0.6 + drift + mx * 0.14 - (1 - settle) * 0.35;
      var pitch = 0.36 + my * 0.05;
      var cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      var D = N * 2.2, F = unit * D;
      var lift = (maxH * 0.62) / 2;

      for (var n = 0; n < nodes.length; n++) {
        var o = nodes[n];
        var p = clamp((t - o.delay) / 1.5, 0, 1);
        var e = easeOut(p);
        o.p = e;
        var swirl = (1 - e) * 1.6;
        var cs = Math.cos(swirl), ss = Math.sin(swirl);
        var sx = o.sx * cs - o.sz * ss, sz = o.sx * ss + o.sz * cs;
        var x = sx + (o.x - sx) * e, y = o.sy + (o.y + lift - o.sy) * e, z = sz + (o.z - sz) * e;
        var x1 = x * cyw - z * syw, z1 = x * syw + z * cyw;
        var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        var s = F / (z2 + D);
        o.px = cx + x1 * s; o.py = cy + y2 * s; o.pz = z2;
      }

      // edges
      if (settle > 0) {
        ctx.lineWidth = 1;
        for (var k = 0; k < edges.length; k++) {
          var ed = edges[k], a = nodes[ed[0]], b = nodes[ed[1]];
          var depth = clamp(0.75 - (a.pz + b.pz) / (4 * N), 0.25, 1);
          var alpha = settle * depth * (ed[2] === 2 ? 0.75 : ed[2] === 1 ? 0.28 : 0.16) * Math.min(a.p, b.p);
          ctx.strokeStyle = ed[2] === 2 ? "rgba(194,171,130," + alpha.toFixed(3) + ")" : "rgba(160,170,186," + alpha.toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        }
      }

      // nodes
      for (n = 0; n < nodes.length; n++) {
        o = nodes[n];
        var dz = clamp(0.8 - o.pz / (2.5 * N), 0.3, 1);
        var r = (o.top ? 2.1 : 1.3) * (0.7 + dz * 0.5);
        var al = (0.25 + 0.75 * o.p) * dz * (o.top ? 1 : 0.55);
        ctx.fillStyle = o.top ? "rgba(214,194,156," + al.toFixed(3) + ")" : "rgba(196,203,214," + al.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(o.px, o.py, r, 0, Math.PI * 2); ctx.fill();
      }

      // signal travelling up the surface once the system has formed
      if (settle >= 1 && diag.length > 1) {
        var cycle = 7, u = ((t - 2.9) % cycle) / cycle;
        if (u >= 0 && u < 0.72) {
          var f = (u / 0.72) * (diag.length - 1);
          var seg = Math.floor(f), fr = f - seg;
          var A = nodes[diag[seg]], B = nodes[diag[Math.min(seg + 1, diag.length - 1)]];
          var gx = A.px + (B.px - A.px) * fr, gy = A.py + (B.py - A.py) * fr;
          var glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, 18);
          glow.addColorStop(0, "rgba(232,214,178,.85)"); glow.addColorStop(1, "rgba(232,214,178,0)");
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gx, gy, 18, 0, Math.PI * 2); ctx.fill();
        }
        // the peak: one quiet marker on the highest column
        var peak = nodes[diag[diag.length - 1]];
        var pulse = still ? 0.5 : (Math.sin(t * 1.4) + 1) / 2;
        ctx.strokeStyle = "rgba(194,171,130," + (0.25 + pulse * 0.35).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(peak.px, peak.py, 7 + pulse * 3, 0, Math.PI * 2); ctx.stroke();
      }
    }

    function loop(now) {
      if (!running) return;
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function play() {
      if (running || still || reduced || !visible || document.hidden) return;
      running = true; raf = requestAnimationFrame(loop);
    }
    function pause() { running = false; cancelAnimationFrame(raf); }

    resize();
    window.addEventListener("resize", resize);

    if (!still && !reduced) {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (en) {
          visible = en[0].isIntersecting;
          if (visible) play(); else pause();
        }).observe(canvas);
      }
      document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); else play(); });
      window.addEventListener("pointermove", function (e) {
        tmx = e.clientX / window.innerWidth - 0.5; tmy = e.clientY / window.innerHeight - 0.5;
      }, { passive: true });
      play();
    }
    return { resize: resize };
  }

  var latticeEls = [document.getElementById("lattice"), document.getElementById("lattice-still")];
  try {
    if (latticeEls[0]) Lattice(latticeEls[0], {});
    if (latticeEls[1]) Lattice(latticeEls[1], { still: true });
  } catch (err) {
    // the page stays fully usable without the canvas
    latticeEls.forEach(function (c) { if (c) c.style.display = "none"; });
  }

  /* ============================================================
     Split headings into words for staggered entrances
     ============================================================ */
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.innerHTML = words.map(function (word, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + word.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</span></span>";
    }).join(" ");
  });

  /* ============================================================
     Scroll reveals. Only elements below the fold at load are hidden,
     so nothing already on screen ever disappears.
     ============================================================ */
  document.querySelectorAll("[data-reveal-group]").forEach(function (g) {
    Array.prototype.forEach.call(g.querySelectorAll("[data-reveal]"), function (el, i) { el.style.setProperty("--i", i % 6); });
  });

  if (!reduced && "IntersectionObserver" in window) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("is-pending");
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    document.querySelectorAll("[data-reveal], [data-split]").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.classList.add("is-pending");
        revealIO.observe(el);
      }
    });
  }

  /* ============================================================
     Header: tone follows the band underneath, hides on scroll down
     ============================================================ */
  var header = document.getElementById("site-header");
  var tones = Array.prototype.slice.call(document.querySelectorAll("main [data-tone], .site-footer"));
  var lastY = window.scrollY;

  function updateHeader() {
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 40);
    var probe = 38, tone = "dark";
    for (var i = 0; i < tones.length; i++) {
      var r = tones[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { tone = tones[i].getAttribute("data-tone") || "dark"; break; }
    }
    header.setAttribute("data-tone", tone);
    if (!root.classList.contains("menu-open")) {
      if (y > 700 && y - lastY > 6) header.classList.add("is-hidden");
      else if (lastY - y > 6 || y < 700) header.classList.remove("is-hidden");
    }
    lastY = y;
  }
  header.addEventListener("focusin", function () { header.classList.remove("is-hidden"); });

  /* active navigation item */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-list a"));
  var navIds = ["home", "about", "experience", "projects", "skills", "journey", "contact"];
  var alias = { journey: "skills" };
  function updateNav() {
    var mark = window.innerHeight * 0.4, current = "home";
    for (var i = 0; i < navIds.length; i++) {
      var el = document.getElementById(navIds[i]);
      if (el && el.getBoundingClientRect().top <= mark) current = alias[navIds[i]] || navIds[i];
    }
    navLinks.forEach(function (a) {
      if (a.getAttribute("href") === "#" + current) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  /* ============================================================
     Scroll-linked details: timeline progress, portrait depth,
     and the stage that opens into the dark sections
     ============================================================ */
  var rolesEl = document.getElementById("roles");
  var roleBar = document.getElementById("role-progress-bar");
  var trackEl = document.getElementById("track");
  var trackBar = document.getElementById("track-bar");
  var portrait = document.querySelector(".portrait-frame picture");
  var stages = [document.getElementById("work-stage"), document.getElementById("contact-stage")];

  function updateScrollFx() {
    var vh = window.innerHeight, vw = window.innerWidth, r;
    if (rolesEl && roleBar) {
      r = rolesEl.getBoundingClientRect();
      roleBar.style.setProperty("--p", reduced ? 1 : clamp((vh * 0.6 - r.top) / r.height, 0, 1).toFixed(4));
    }
    if (trackEl && trackBar) {
      r = trackEl.getBoundingClientRect();
      trackBar.style.setProperty("--p", reduced ? 1 : clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25), 0, 1).toFixed(4));
    }
    if (reduced) return;
    if (portrait) {
      r = portrait.parentNode.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) portrait.style.transform = "translate3d(0," + ((r.top + r.height / 2 - vh / 2) * -0.07).toFixed(1) + "px,0)";
    }
    var maxInset = vw > 720 ? Math.min(56, vw * 0.04) : 0;
    stages.forEach(function (st) {
      if (!st) return;
      r = st.getBoundingClientRect();
      var p = clamp(1 - r.top / (vh * 0.85), 0, 1);
      st.style.setProperty("--inset", ((1 - easeOut(p)) * maxInset).toFixed(1) + "px");
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateHeader(); updateNav(); updateScrollFx();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  updateHeader(); updateNav(); updateScrollFx();

  /* ============================================================
     Full-screen menu (narrow screens)
     ============================================================ */
  var menuBtn = document.getElementById("menu-btn");
  var menu = document.getElementById("menu");
  Array.prototype.forEach.call(menu.querySelectorAll(".menu-list a"), function (a, i) { a.style.setProperty("--i", i); });

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.querySelector(".menu-btn-label").textContent = open ? "Close" : "Menu";
    root.classList.toggle("menu-open", open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add("is-open"); });
      header.classList.remove("is-hidden");
      var first = menu.querySelector("a");
      if (first) first.focus();
    } else {
      menu.classList.remove("is-open");
      menu.hidden = true;
    }
  }
  menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia("(min-width: 981px)").addEventListener("change", function (mq) { if (mq.matches) setMenu(false); });

  /* ============================================================
     Case studies: accessible accordion
     ============================================================ */
  function setCase(btn, open) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("is-open", open);
  }
  document.querySelectorAll(".case-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () { setCase(btn, btn.getAttribute("aria-expanded") !== "true"); });
  });
  var hash = window.location.hash.slice(1);
  if (hash.indexOf("case-") === 0) {
    var deep = document.querySelector('[aria-controls="' + hash + '"]');
    if (deep) { setCase(deep, true); deep.scrollIntoView(); }
  }

  /* ============================================================
     Copy to clipboard
     ============================================================ */
  var status = document.getElementById("copy-status");
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var target = document.getElementById(btn.getAttribute("data-copy-target"));
      function fallback() {
        if (target) {
          var range = document.createRange(); range.selectNodeContents(target);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        }
        status.textContent = "Selected. Press Ctrl+C or ⌘C to copy.";
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = "Copied " + text + ".";
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = "Copy"; }, 2200);
        }, fallback);
      } else {
        fallback();
      }
    });
  });

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
