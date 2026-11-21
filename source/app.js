
(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var canvas = document.getElementById('headCanvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var poster = document.querySelector('.portrait img');
  var FRAME_W = 810, FRAME_H = 720;
  var MAIN_FRAMES = 29, MAIN_COLS = 8, DOWN_FRAMES = 12, DOWN_COLS = 6;
  var HEAD_FRONT = 28, HEAD_SIDE = 0;
  var headSheet = new Image();
  var downSheet = new Image();
  var headReady = false, downReady = false;
  var headNow = HEAD_FRONT, headTarget = HEAD_FRONT;
  var downMode = false, downAlpha = 0, downAlphaTarget = 0;
  var downFrame = 0, downFrameTarget = 0;
  var mirror = 0;
  var downLayer = document.createElement('canvas');
  downLayer.width = FRAME_W; downLayer.height = FRAME_H;
  var dctx = downLayer.getContext('2d');
  var mixLayer = document.createElement('canvas');
  mixLayer.width = FRAME_W; mixLayer.height = FRAME_H;
  var mctx = mixLayer.getContext('2d');

  function clampNum(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function easeTurn(t){ t = clampNum(t, 0, 1); return t * t * (3 - 2 * t); }

  function drawIndex(c, sheet, pos, cols, count, alpha, flip){
    var i = Math.floor(pos), f = pos - i;
    if (i > count - 1) { i = count - 1; f = 0; }
    if (i < 0) { i = 0; f = 0; }
    c.save();
    if (flip) { c.translate(FRAME_W, 0); c.scale(-1, 1); }
    c.globalAlpha = alpha;
    c.drawImage(sheet, (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    if (f > 0.03 && i + 1 < count && f < 0.97) {
      c.globalAlpha = alpha * f;
      c.drawImage(sheet, ((i + 1) % cols) * FRAME_W, Math.floor((i + 1) / cols) * FRAME_H, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
    }
    c.restore();
  }

  function renderHead(){
    if (!ctx) return;
    var a = downReady ? downAlpha : 0;
    if (a <= 0.004) {
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      if (headReady) drawIndex(ctx, headSheet, headNow, MAIN_COLS, MAIN_FRAMES, 1, mirror ? 1 : 0);
      return;
    }
    mctx.clearRect(0, 0, FRAME_W, FRAME_H);
    if (headReady) drawIndex(mctx, headSheet, headNow, MAIN_COLS, MAIN_FRAMES, 1 - a, mirror ? 1 : 0);
    dctx.clearRect(0, 0, FRAME_W, FRAME_H);
    drawIndex(dctx, downSheet, downFrame, DOWN_COLS, DOWN_FRAMES, 1, mirror ? 0 : 1);
    mctx.globalAlpha = a;
    mctx.drawImage(downLayer, 0, 0);
    mctx.globalAlpha = 1;
    ctx.clearRect(0, 0, FRAME_W, FRAME_H);
    ctx.drawImage(mixLayer, 0, 0);
  }

  function headAim(x, y){
    var inDown = Math.abs(x) < 0.97 && y > (downMode ? 0.10 : 0.20);
    if (inDown) {
      downMode = true;
      downAlphaTarget = clampNum((y - 0.20) / 0.24, 0, 1);
      downFrameTarget = clampNum((y - 0.20) / 0.55, 0, 1) * (DOWN_FRAMES - 1);
    } else {
      downMode = false;
      downAlphaTarget = 0;
    }
    if (Math.abs(x) > 0.05) mirror = x > 0 ? 1 : 0;
    var turn = easeTurn((Math.abs(x) - 0.05) / 0.95);
    headTarget = HEAD_FRONT - turn * (HEAD_FRONT - HEAD_SIDE);
  }

  headSheet.onload = function(){ headReady = true; if (poster) poster.style.opacity = '0'; renderHead(); };
  downSheet.onload = function(){ downReady = true; renderHead(); };
  if (finePointer && !reduceMotion && ctx) {
    headSheet.src = "__HEAD__";
    downSheet.src = "__DOWN__";
  }
  renderHead();

  if (finePointer && !reduceMotion && ctx) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function loop(){
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      headNow += (headTarget - headNow) * 0.26;
      if (Math.abs(headTarget - headNow) < 0.002) headNow = headTarget;
      if (downMode) {
        downAlpha += (downAlphaTarget - downAlpha) * 0.34;
        if (Math.abs(downAlphaTarget - downAlpha) < 0.002) downAlpha = downAlphaTarget;
      } else {
        downAlpha += (0 - downAlpha) * 0.50;
        if (downAlpha < 0.002) downAlpha = 0;
      }
      downFrame += (downFrameTarget - downFrame) * 0.22;
      if (Math.abs(downFrameTarget - downFrame) < 0.01) downFrame = downFrameTarget;
      renderHead();
      var busy = Math.abs(tx - cx) > 0.0004 || Math.abs(ty - cy) > 0.0004 ||
                 Math.abs(headTarget - headNow) > 0.002 ||
                 (downMode ? Math.abs(downAlphaTarget - downAlpha) > 0.002 : downAlpha > 0.002);
      raf = busy ? requestAnimationFrame(loop) : null;
    }
    function kick(){ if (!raf) raf = requestAnimationFrame(loop); }
    window.addEventListener('pointermove', function(e){
      tx = clampNum((e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2, -1, 1);
      ty = clampNum((e.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2, -1, 1);
      headAim(tx, ty);
      kick();
    }, { passive: true });
    window.addEventListener('blur', function(){
      downMode = false; downAlphaTarget = 0; headTarget = HEAD_FRONT; kick();
    });
  }

  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var certItems = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));

  function visibleCerts(){
    return certItems.filter(function(el){ return !el.hidden; });
  }

  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbCount = document.getElementById('lbCount');
  var lbIndex = 0;

  function paintCert(i){
    var list = visibleCerts();
    if (!list.length) return;
    lbIndex = (i + list.length) % list.length;
    var el = list[lbIndex];
    var img = el.querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = el.getAttribute('data-caption') || img.alt;
    lbCount.textContent = (lbIndex + 1) + ' / ' + list.length;
  }

  function openCert(el){
    if (el.hidden) { var allBtn = document.querySelector('[data-filter="全部"]'); if (allBtn) allBtn.click(); }
    paintCert(visibleCerts().indexOf(el));
    lb.classList.add('on');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    document.getElementById('lbClose').focus();
  }
  function closeCert(){
    lb.classList.remove('on');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  certItems.forEach(function(el){
    el.addEventListener('click', function(){ openCert(el); });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-open]'), function(btn){
    btn.addEventListener('click', function(){
      var el = document.querySelector('[data-cert-key="' + btn.getAttribute('data-open') + '"]');
      if (el) openCert(el);
    });
  });

  filterButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      var f = btn.getAttribute('data-filter');
      filterButtons.forEach(function(b){ b.classList.toggle('on', b === btn); });
      certItems.forEach(function(el){
        el.hidden = f !== '全部' && el.getAttribute('data-cat') !== f;
      });
    });
  });

  document.getElementById('lbClose').addEventListener('click', closeCert);
  document.getElementById('lbPrev').addEventListener('click', function(){ paintCert(lbIndex - 1); });
  document.getElementById('lbNext').addEventListener('click', function(){ paintCert(lbIndex + 1); });
  document.getElementById('lb').addEventListener('click', function(e){
    if (e.target === lb) closeCert();
  });
  window.addEventListener('keydown', function(e){
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeCert();
    else if (e.key === 'ArrowLeft') paintCert(lbIndex - 1);
    else if (e.key === 'ArrowRight') paintCert(lbIndex + 1);
  });
  var wheelLock = 0;
  lb.addEventListener('wheel', function(e){
    e.preventDefault();
    var now = Date.now();
    if (now - wheelLock < 260) return;
    wheelLock = now;
    paintCert(lbIndex + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });
})();
