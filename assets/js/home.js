/* ==========================================================================
   홈 화면 전용 스크립트 (index.html)
   1) 참여자 수 올라가기: 통계 띠의 숫자는 data/stats.json 값입니다 (main.js 가 [data-stat] 을 채움).
      195개국 · 33인 · 6,435명은 정해진 기준·목표라 처음부터 그대로 보여 주고,
      바뀌는 숫자인 ‘현재 참여자 수’만 0 → 실제 값으로 올라갑니다.
      (페이지가 다 열리고 0.9초 뒤 + 통계 띠가 절반 이상 보일 때 시작, 1.2초)
   2) 배경 움직임 멈춤: 히어로 사진·원칙 띠·사진 타일이 화면 밖에 있거나 다른 탭을 보는 동안
      .is-paused 를 붙여 움직임을 멈춤 (style.css ‘모션’)
   3) 휴대폰 5대 원칙 카드: 아래 점 5개로 지금 몇 번째 카드인지 표시
   '동작 줄이기' 설정이면 1)은 하지 않음(처음부터 최종 값). 구형 브라우저에서는 아무것도 하지 않음.
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  if (!WH) return;

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var hasIO = "IntersectionObserver" in window;

  /* ---------------- 2) 화면 밖·다른 탭에서는 배경 움직임 멈춤 ---------------- */
  (function () {
    if (!hasIO) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll(".home-hero, .home-principles, .home-tiles"));
    if (!targets.length) return;
    var inView = new Map();
    function apply(el) { el.classList.toggle("is-paused", document.hidden || !inView.get(el)); }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { inView.set(en.target, en.isIntersecting); apply(en.target); });
    }, { threshold: 0 });
    targets.forEach(function (el) { inView.set(el, true); io.observe(el); });
    document.addEventListener("visibilitychange", function () { targets.forEach(apply); });
  })();

  /* ---------------- 3) 휴대폰 5대 원칙 카드: 점 표시 ---------------- */
  (function () {
    var list = document.querySelector(".home-pr-list");
    if (!list || !hasIO) return;
    var cards = Array.prototype.slice.call(list.children);
    if (cards.length < 2) return;
    var dots = document.createElement("div");
    dots.className = "home-pr-dots";
    dots.setAttribute("aria-hidden", "true");
    dots.innerHTML = cards.map(function () { return "<i></i>"; }).join("");
    var live = document.createElement("p");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    list.parentNode.insertBefore(dots, list.nextSibling);
    list.parentNode.insertBefore(live, dots.nextSibling);
    var marks = Array.prototype.slice.call(dots.children);
    var cur = -1;
    function show(i) {
      if (i === cur) return;
      var first = cur === -1;
      cur = i;
      marks.forEach(function (m, k) { m.classList.toggle("is-on", k === i); });
      // 처음 표시할 때는 읽지 않음 (넘길 때만 알림)
      if (!first) live.innerHTML = WH.bi(cards.length + "개 중 " + (i + 1) + "번째", (i + 1) + " of " + cards.length);
    }
    show(0);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) show(cards.indexOf(en.target));
      });
    }, { root: list, threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
  })();

  /* ---------------- 1) 참여자 수 올라가기 ---------------- */
  var band = document.querySelector(".home-stats");
  if (!band || reduce || !hasIO || !window.requestAnimationFrame) return;
  var el = band.querySelector('.home-stat-num b[data-stat="participants"]');
  if (!el) return;

  var fmt = typeof WH.fmtNum === "function" ? WH.fmtNum : function (n) { return String(n); };
  function parse(text) {
    var n = parseInt(String(text).replace(/[^\d]/g, ""), 10);
    return isNaN(n) ? null : n;
  }
  var value = parse(el.textContent);
  if (value == null) return;
  var state = "idle"; // idle(대기) → running(진행) → done(끝)

  // 화면 낭독기는 움직이는 숫자 대신 이 실제 값을 읽음
  var sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = fmt(value);
  el.parentNode.insertBefore(sr, el);
  el.setAttribute("aria-hidden", "true");

  // 숫자 폭을 최종 값 기준으로 고정 → 올라가는 동안 옆 글자(명)가 흔들리지 않음
  // 지금은 글자 수(ch)로 대강 잡고, 글꼴이 다 받아진 뒤 한 번만 실제 폭을 잼(그 전에는 레이아웃을 읽지 않음)
  function roughWidth() { el.style.minWidth = fmt(value).length + "ch"; }
  function lockWidth() {
    if (state === "done") return;
    var shown = el.textContent;
    el.style.minWidth = "";
    el.textContent = fmt(value);
    var w = el.getBoundingClientRect().width;
    el.textContent = shown;
    if (w) el.style.minWidth = Math.ceil(w) + "px";
  }
  function finish() {
    state = "done";
    el.textContent = fmt(value);
    el.style.minWidth = "";
    el.removeAttribute("aria-hidden");
    if (sr.parentNode) sr.parentNode.removeChild(sr);
  }
  roughWidth();
  el.textContent = "0";
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { window.requestAnimationFrame(lockWidth); });
  }

  // main.js 가 data/stats.json 값을 채운 직후(같은 순간) 호출됨 → 아직 시작 전이면 다시 0 으로
  document.addEventListener("wh:stats", function (e) {
    var v = (e.detail || {}).participants;
    if (typeof v !== "number" || !isFinite(v)) return;
    value = Math.max(0, Math.round(v));
    sr.textContent = fmt(value);
    if (state === "idle") { roughWidth(); el.textContent = "0"; window.requestAnimationFrame(lockWidth); }
    else if (state === "done") el.textContent = fmt(value);
  });

  var DURATION = 1200;
  function run() {
    if (state !== "idle") return;
    state = "running";
    var start = null;
    function step(now) {
      if (state !== "running") return;
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / DURATION);
      if (p >= 1) { finish(); return; }
      var eased = 1 - Math.pow(2, -10 * p); // 빠르게 시작해 부드럽게 멈춤
      el.textContent = fmt(Math.round(value * eased));
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  // 시작 조건: 페이지가 다 열리고 0.9초 지남 + 통계 띠가 절반 이상 보임 (둘 다 만족할 때)
  var ready = false, seen = false;
  function maybeRun() { if (ready && seen) run(); }
  function onLoad() { setTimeout(function () { ready = true; maybeRun(); }, 900); }
  if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad);
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.disconnect();
      seen = true;
      maybeRun();
    });
  }, { threshold: 0.5 });
  io.observe(band);

  // 인쇄할 때는 바로 최종 값으로
  window.addEventListener("beforeprint", function () {
    io.disconnect();
    if (state !== "done") finish();
  });
})();
