(function () {
  "use strict";

  var root = document.documentElement;
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var sections = ["works", "certs", "contact"].map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function onScroll() {
    var y = window.scrollY || root.scrollTop;

    var current = "";
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 140) current = sections[i].id;
    }
    if (window.innerHeight + y >= root.scrollHeight - 4) current = "contact";
    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current);
    });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScroll();
      ticking = false;
    });
  }, { passive: true });
  onScroll();

  /* reveal */
  var revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealItems.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add("in"); });
  }

  /* lightbox */
  var lb = document.getElementById("lb");
  var lbImg = document.getElementById("lbImg");
  var lbCap = document.getElementById("lbCap");
  function openLightbox(btn) {
    var img = btn.querySelector("img");
    if (!img || !lb || !lbImg) return;
    lbImg.src = img.currentSrc || img.src;
    lbImg.alt = img.alt || "";
    if (lbCap) lbCap.textContent = btn.getAttribute("data-cap") || img.alt || "";
    if (typeof lb.showModal === "function") lb.showModal();
    else lb.setAttribute("open", "");
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-cap]");
    if (btn && btn.tagName === "BUTTON") {
      e.preventDefault();
      openLightbox(btn);
    }
  });
  if (lb) {
    lb.addEventListener("click", function (e) {
      if (e.target === lb || e.target.closest(".lb-close")) {
        if (typeof lb.close === "function") lb.close();
        else lb.removeAttribute("open");
      }
    });
    lb.addEventListener("cancel", function () {
      if (typeof lb.close === "function") lb.close();
      else lb.removeAttribute("open");
    });
  }

  /* portrait: a single frame source, head turns toward the pointer */
  var canvas = document.querySelector(".head");
  var portrait = document.querySelector(".portrait");
  var dataEl = document.getElementById("sheetData");
  if (!canvas || !portrait || !dataEl) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var sheetData;
  try { sheetData = JSON.parse(dataEl.textContent); } catch (err) { return; }

  var FRAME_W = 270, FRAME_H = 240, MAIN_COLS = 8, MAIN_COUNT = 29, DOWN_COLS = 6, DOWN_COUNT = 12;
  var headSheet = new Image();
  var downSheet = new Image();
  var headReady = false, downReady = false;
  var now = 28, target = 28, mirror = 0;
  var downAlpha = 0, downTarget = 0;
  var running = false, lastMove = 0;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function drawFrame(img, pos, cols, count, alpha, flip) {
    if (!img || !img.naturalWidth) return;
    var i = Math.round(clamp(pos, 0, count - 1));
    ctx.save();
    if (flip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H, FRAME_W, FRAME_H, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawFrame(headSheet, now, MAIN_COLS, MAIN_COUNT, 1, mirror);
    if (downAlpha > 0.01) drawFrame(downSheet, DOWN_COUNT - 1, DOWN_COLS, DOWN_COUNT, downAlpha, mirror ? 0 : 1);
  }

  function ease(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function onMove(e) {
    var r = portrait.getBoundingClientRect();
    var nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.4, 1.4);
    var ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.4, 1.4);
    if (Math.abs(nx) > 0.05) mirror = nx > 0 ? 1 : 0;
    target = 28 - ease((Math.abs(nx) - 0.05) / 0.95) * 28;
    downTarget = (ny > 0.48 && Math.abs(nx) < 0.6) ? clamp((ny - 0.48) / 0.52, 0, 1) : 0;
    lastMove = performance.now();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function reset() {
    target = 28;
    downTarget = 0;
    lastMove = performance.now();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function tick(t) {
    now += (target - now) * 0.2;
    downAlpha += (downTarget - downAlpha) * 0.2;
    if (Math.abs(target - now) < 0.01) now = target;
    if (Math.abs(downTarget - downAlpha) < 0.01) downAlpha = downTarget;
    render();
    var idle = t - lastMove > 900;
    if (!idle || Math.abs(target - now) > 0.01 || downAlpha > 0.001) {
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }

  headSheet.onload = function () {
    headReady = true;
    portrait.classList.add("ready");
    render();
  };
  downSheet.onload = function () {
    downReady = true;
    render();
  };
  headSheet.src = sheetData.head;
  downSheet.src = sheetData.down;

  if (fine && !reduce) {
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", reset);
  } else {
    headSheet.onload = function () {
      portrait.classList.add("ready");
      drawFrame(headSheet, 28, MAIN_COLS, MAIN_COUNT, 1, 0);
    };
  }
})();
