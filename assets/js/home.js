/* ==========================================================================
   홈 화면 전용 스크립트 (index.html)
   - 통계(195개국 · 33인 · 6,435명 · 참여자)의 숫자는 data/stats.json 값입니다.
     · 값 채우기: main.js 가 [data-stat] 요소를 자동으로 채움 (천 단위 쉼표,
       target 이 없으면 countries × per_country 로 계산). 실패하면 HTML 기본값 유지.
     · 이 파일: 통계 띠가 화면에 들어오는 순간(데스크톱은 첫 화면에서 바로)
       0 → 실제 값으로 숫자가 올라가는 효과만 더합니다.
       '동작 줄이기' 설정·구형 브라우저에서는 아무것도 하지 않습니다.
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var band = document.querySelector(".home-stats");
  if (!WH || !band) return;

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  if (reduce || !("IntersectionObserver" in window) || !window.requestAnimationFrame) return;

  // 이미 지나간 위치(새로 고침으로 아래쪽에서 다시 연 경우)면 효과 없이 그대로 둠
  if (band.getBoundingClientRect().bottom < 0) return;

  var fmt = typeof WH.fmtNum === "function" ? WH.fmtNum : function (n) { return String(n); };
  function parse(text) {
    var n = parseInt(String(text).replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? null : n;
  }

  /* 숫자 요소마다 상태 보관: idle(대기) → running(진행) → done(끝) */
  var items = [];
  band.querySelectorAll(".home-stat-num b[data-stat]").forEach(function (el) {
    var value = parse(el.textContent);
    if (value == null) return;
    // 화면 낭독기는 움직이는 숫자 대신 이 실제 값을 읽음
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = fmt(value);
    el.parentNode.insertBefore(sr, el);
    el.setAttribute("aria-hidden", "true");
    items.push({ el: el, sr: sr, key: el.getAttribute("data-stat"), value: value, state: "idle" });
  });
  if (!items.length) return;

  // 숫자 폭을 최종 값 기준으로 고정 → 올라가는 동안 옆 글자(개국·명)가 흔들리지 않음
  function lockWidth(it) {
    var shown = it.el.textContent;
    it.el.style.minWidth = "";
    it.el.textContent = fmt(it.value);
    var w = it.el.getBoundingClientRect().width;
    it.el.textContent = shown;
    if (w) it.el.style.minWidth = Math.ceil(w) + "px";
  }
  function finish(it) {
    it.state = "done";
    it.el.textContent = fmt(it.value);
    it.el.style.minWidth = "";
    it.el.removeAttribute("aria-hidden");
    if (it.sr.parentNode) it.sr.parentNode.removeChild(it.sr);
  }

  items.forEach(function (it) {
    lockWidth(it);
    it.el.textContent = "0";
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      items.forEach(function (it) { if (it.state !== "done") lockWidth(it); });
    });
  }

  // main.js 가 data/stats.json 값을 채운 직후(같은 순간) 호출됨 → 아직 시작 전이면 다시 0 으로
  document.addEventListener("wh:stats", function (e) {
    var s = e.detail || {};
    items.forEach(function (it) {
      var v = s[it.key];
      if (typeof v !== "number" || !isFinite(v)) return;
      it.value = Math.max(0, Math.round(v));
      it.sr.textContent = fmt(it.value);
      if (it.state === "idle") { lockWidth(it); it.el.textContent = "0"; }
      else if (it.state === "done") it.el.textContent = fmt(it.value);
    });
  });

  var DURATION = 1400;
  function run() {
    var start = null;
    items.forEach(function (it) { if (it.state === "idle") it.state = "running"; });
    function step(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / DURATION);
      var eased = 1 - Math.pow(1 - p, 3);
      var pending = false;
      items.forEach(function (it) {
        if (it.state !== "running") return;
        if (p >= 1) { finish(it); return; }
        it.el.textContent = fmt(Math.round(it.value * eased));
        pending = true;
      });
      if (pending) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.disconnect();
      run();
    });
  }, { threshold: 0.35 });
  io.observe(band);

  // 인쇄할 때는 바로 최종 값으로
  window.addEventListener("beforeprint", function () {
    io.disconnect();
    items.forEach(function (it) { if (it.state !== "done") finish(it); });
  });
})();
