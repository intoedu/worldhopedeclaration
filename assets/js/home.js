/* ==========================================================================
   홈 화면 전용 스크립트 (index.html)
   1) 참여자 수 올라가기: 통계 띠의 숫자는 data/stats.json 값입니다 (main.js 가 [data-stat] 을 채움).
      195개국 · 33인 · 6,435명은 정해진 기준·목표라 처음부터 그대로 보여 주고,
      바뀌는 숫자인 ‘현재 참여자 수’만 0 → 실제 값으로 올라갑니다.
      (페이지가 다 열리고 0.9초 뒤 + 통계 띠가 절반 이상 보일 때 시작, 1.2초)
   2) 배경 움직임 멈춤: 히어로 사진·원칙 띠·사진 타일이 화면 밖에 있거나 다른 탭을 보는 동안
      .is-paused 를 붙여 움직임을 멈춤 (style.css ‘모션’)
   3) 휴대폰 5대 원칙 카드: 아래 점 5개로 지금 몇 번째 카드인지 표시
   4) 첫 화면 아래 이야기(index.html S1–S8)의 자료 채우기
      · 글로벌 33: data/selection-criteria.json 의 분야(field_no) 11개 → 분야 칸
      · 세계희망지도: data/countries.json → 참여 국가 수·진행 상황, data/worldmap-dots.json → 금색 표시 위치
      · 소식: data/posts.json 최근 3개(고정 글 먼저). 글이 없으면 섹션을 숨김 / 응원: data/cheers.json (게시된 것이 있을 때만)
      · 연락처: assets/js/config.js 의 phone · address · publicEmail
      글자는 한·영을 함께 넣어 두므로(.ko/.en) 언어를 바꿔도 다시 그릴 필요가 없음
   '동작 줄이기' 설정이면 1)은 하지 않음(처음부터 최종 값). 구형 브라우저에서는 아무것도 하지 않음.
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  if (!WH) return;

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var hasIO = "IntersectionObserver" in window;

  /* ---------------- 2) 화면 밖·다른 탭에서는 배경 움직임 멈춤 (지도 위 금색 표시의 물결 포함) ---------------- */
  (function () {
    if (!hasIO) return;
    var targets = Array.prototype.slice.call(document.querySelectorAll(".home-hero, .home-band, .home-tiles, .hs-map"));
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
    var mobileMQ = window.matchMedia ? window.matchMedia("(max-width: 760px)") : null;
    var cur = -1;
    function show(i) {
      if (i === cur) return;
      var first = cur === -1;
      cur = i;
      marks.forEach(function (m, k) { m.classList.toggle("is-on", k === i); });
      // 처음 표시할 때는 읽지 않음 (넘길 때만 알림) · 카드를 넘기는 휴대폰에서만 (데스크톱은 다섯 칸이 한꺼번에 보여 모두 '보임'으로 잡힘)
      if (!first && (!mobileMQ || mobileMQ.matches)) live.innerHTML = WH.bi(cards.length + "개 중 " + (i + 1) + "번째", (i + 1) + " of " + cards.length);
    }
    show(0);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) show(cards.indexOf(en.target));
      });
    }, { root: list, threshold: 0.6 });
    cards.forEach(function (c) { io.observe(c); });
  })();

  /* ---------------- 3-1) 휴대폰 5대 가치(옆으로 넘기는 칸): 같은 점 표시 ----------------
     한 화면에 두 칸 남짓 보이므로 '넘길 수 있는 자리' 수만큼 점을 두고, 가로 스크롤 위치로 켬 */
  (function () {
    var list = document.querySelector(".hs-values-list");
    if (!list) return;
    var dots = document.createElement("div");
    dots.className = "home-pr-dots hs-values-dots";
    dots.setAttribute("aria-hidden", "true");
    list.parentNode.insertBefore(dots, list.nextSibling);
    var cur = -1, raf = 0;
    function step() {
      var c = list.children;
      var d = c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : 0;
      return d > 0 ? d : (list.clientWidth || 1);
    }
    function build() {
      var max = list.scrollWidth - list.clientWidth;
      // 넘길 자리 수 (가로로 넘기지 않는 넓은 화면은 0 → 점 없음)
      var n = max > 4 ? Math.min(list.children.length, Math.round(max / step()) + 1) : 0;
      if (dots.children.length !== n) { dots.innerHTML = new Array(n + 1).join("<i></i>"); cur = -1; }
      dots.hidden = n < 2;
      update();
    }
    function update() {
      var marks = dots.children;
      if (!marks.length) return;
      var i = Math.min(marks.length - 1, Math.round(list.scrollLeft / step()));
      if (i === cur) return;
      cur = i;
      Array.prototype.forEach.call(marks, function (m, k) { m.classList.toggle("is-on", k === i); });
    }
    list.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", build);
    build();
  })();

  /* ---------------- 4) 첫 화면 아래 이야기: 자료 채우기 ---------------- */
  (function () {
    var db = WH.db;
    if (!db || typeof db.json !== "function") return;
    var esc = WH.esc;
    // 한·영 두 벌을 함께 넣음 (값은 미리 esc 한 HTML)
    function bi(ko, en) { return WH.bi(ko, en || ko); }
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function pad2(n) { return (n < 10 ? "0" : "") + n; }
    // 화면에 가까워졌을 때 한 번만 실행 (큰 자료는 필요할 때 불러옴)
    function whenNear(el, fn) {
      if (!hasIO) { fn(); return; }
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
      }, { rootMargin: "600px 0px" });
      io.observe(el);
    }

    /* ---- S3. 글로벌 33: 11개 분야 칸 (data/selection-criteria.json 의 field_no 별 첫 줄) ---- */
    var fieldList = $('[data-hs="fields"]');
    if (fieldList) {
      db.json("selection-criteria").then(function (d) {
        var rows = d && Array.isArray(d.rows) ? d.rows : [];
        var seen = {}, fields = [];
        rows.forEach(function (r) {
          var no = r ? parseInt(r.field_no, 10) : NaN;
          if (!(no > 0) || seen[no]) return;
          seen[no] = true;
          var ko = String(r.field_ko || r.field_en || "").trim(), en = String(r.field_en || r.field_ko || "").trim();
          if (ko) fields.push({ no: no, ko: ko, en: en });
        });
        fields.sort(function (a, b) { return a.no - b.no; });
        // 자료를 못 읽으면 분야 칸 묶음 전체를 숨김 (빈 칸을 보여 주지 않음)
        if (!fields.length) { fieldList.hidden = true; return; }
        fieldList.insertAdjacentHTML("afterbegin", fields.map(function (f, i) {
          return '<li class="hs-field" style="--k:' + i + '">' +
            '<span class="hs-field-no"><i aria-hidden="true"></i>' + pad2(f.no) + "</span>" +
            '<b class="hs-field-name">' + bi(esc(f.ko), esc(f.en)) + "</b>" +
            '<span class="hs-field-en">' + bi('<span lang="en">' + esc(f.en) + "</span>", '<span lang="ko">' + esc(f.ko) + "</span>") + "</span>" +
            "</li>";
        }).join(""));
        var sum = $(".hs-field-sum", fieldList);
        if (sum) sum.style.setProperty("--k", fields.length);
      });
    }

    /* ---- S4. 세계희망지도: 참여 국가 수 · 나라별 진행 상황 · 금색 표시 ---- */
    var notes = $('[data-hs="notes"]');
    var art = $('[data-hs="map"]');
    // 점 지도 SVG 의 좌표 (scripts/build-dotmap.mjs 와 같은 식): x = (경도 + 180) × 2.5, y = (78 − 위도) × 2.5, 그림 900 × 335
    var MAP_W = 900, MAP_H = 335, MAP_K = 2.5, MAP_LAT0 = 78;
    function normCode(c) {
      var s = String(c == null ? "" : c).trim();
      return /^\d{1,3}$/.test(s) ? ("00" + s).slice(-3) : s;
    }
    function names(c) {
      var ko = String(c.name_ko || c.name_en || "").trim(), en = String(c.name_en || c.name_ko || "").trim();
      return { ko: esc(ko), en: esc(en) };
    }
    function placePins(list, m) {
      if (!art || !m || !Array.isArray(m.dots)) return; // 지도 자료를 못 읽으면 HTML 의 기본 표시를 그대로 둠
      var html = "";
      list.forEach(function (c) {
        var code = normCode(c.code);
        var own = m.dots.filter(function (d) { return d && normCode(d[2]) === code; });
        if (!own.length) return;
        // 그 나라 점들의 가운데에서 가장 가까운 점 (섬·속령 때문에 바다 위로 가지 않게 — worldmap.js 와 같은 방식)
        var sx = 0, sy = 0;
        own.forEach(function (d) { sx += Number(d[0]); sy += Number(d[1]); });
        var mx = sx / own.length, my = sy / own.length, best = own[0], bd = Infinity;
        own.forEach(function (d) {
          var dx = Number(d[0]) - mx, dy = Number(d[1]) - my, dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = d; }
        });
        var left = (Number(best[0]) + 180) * MAP_K / MAP_W * 100;
        var top = (MAP_LAT0 - Number(best[1])) * MAP_K / MAP_H * 100;
        if (!(left >= 0 && left <= 100 && top >= 0 && top <= 100)) return;
        var n = names(c);
        html += '<span class="hs-map-pin' + (left > 62 ? " is-left" : "") + '" style="left:' + left.toFixed(2) + "%;top:" + top.toFixed(2) + '%" aria-hidden="true">' +
          "<i></i><b>" + bi(n.ko, n.en) + "</b></span>";
      });
      $$(".hs-map-pin", art).forEach(function (p) { p.parentNode.removeChild(p); });
      if (html) art.insertAdjacentHTML("beforeend", html);
    }
    if (notes || art || $('[data-hs="count"]')) {
      db.json("countries").then(function (rows) {
        if (!Array.isArray(rows)) return;
        // 참여 국가 = 이름이 있는 항목 수 (worldmap.js 와 같은 기준)
        var list = rows.filter(function (r) { return r && typeof r === "object" && String(r.name_ko || r.name_en || "").trim(); });
        $$('[data-hs="count"]').forEach(function (el) { el.textContent = WH.fmtNum(list.length); });
        if (notes) {
          notes.innerHTML = list.map(function (c) {
            var n = names(c);
            var ko = c.note_ko ? n.ko + " · " + esc(c.note_ko) : n.ko;
            var en = c.note_en ? n.en + " · " + esc(c.note_en) : n.en;
            return "<li>" + bi(ko, en) + "</li>";
          }).join("");
          notes.hidden = !list.length;
        }
        if (!art) return;
        if (!list.length) { placePins([], { dots: [] }); return; }
        whenNear(art, function () {
          db.json("worldmap-dots").then(function (m) { placePins(list, m); });
        });
      });
    }

    /* ---- S6. 소식 (최근 3개 · 고정 글 먼저) · 희망 응원 메시지 ---- */
    var news = $('[data-hs="news"]');
    var postList = news ? $('[data-hs="posts"]', news) : null;
    // 분류 이름은 board.js 와 같음
    var CATS = { notice: ["공지", "Notice", "badge-notice"], news: ["소식", "News", "badge-news"], press: ["언론보도", "Press", "badge-press"] };
    // 본문 첫 문단 (빈 줄로 나뉜 첫 덩어리) — 글자는 화면에 넣을 때 esc
    function firstPara(text) { return String(text || "").trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim(); }
    function postItem(p, i) {
      var cat = CATS[p.category] || [p.category || "", p.category || "", "badge-sample"];
      var url = "post.html?id=" + encodeURIComponent(p.id);
      var tKo = p.title_ko || p.title_en || "", tEn = p.title_en || p.title_ko || "";
      var bKo = firstPara(p.body_ko || p.body_en), bEn = firstPara(p.body_en || p.body_ko);
      return '<li class="hs-post" style="--k:' + i + '">' +
        '<p class="hs-post-meta">' +
          (cat[0] ? '<span class="badge ' + cat[2] + '">' + bi(esc(cat[0]), esc(cat[1])) + "</span>" : "") +
          (p.pinned ? '<span class="hs-post-pin" data-icon="thumbtack"></span><span class="sr-only">' + bi("고정", "Pinned") + "</span>" : "") +
          '<time class="hs-post-date" datetime="' + esc(p.created_at) + '">' + esc(WH.fmtDate(p.created_at)) + "</time>" +
        "</p>" +
        '<h3 class="hs-post-title"><a class="hs-stretch" href="' + url + '">' + bi(esc(tKo), esc(tEn)) + "</a></h3>" +
        (bKo || bEn ? '<p class="hs-post-excerpt">' + bi(esc(bKo), esc(bEn)) + "</p>" : "") +
        '<span class="hs-post-more" aria-hidden="true">' + bi("자세히 보기", "Read more") + '<span data-icon="arrow-right"></span></span>' +
        "</li>";
    }
    if (news && postList && typeof db.listPosts === "function") {
      db.listPosts({ page: 1, size: 3 }).then(function (res) {
        var items = res && Array.isArray(res.items) ? res.items : [];
        if (!items.length) return; // 글이 없으면 섹션을 숨긴 채로 둠
        postList.innerHTML = items.map(postItem).join("");
        if (WH.fillIcons) WH.fillIcons(postList);
        news.hidden = false;
      }).catch(function () {});

      // 응원 메시지: 게시된 것이 있을 때만 (없으면 아무것도 보이지 않음)
      var cheerBox = $('[data-hs="cheers"]', news), cheerList = $('[data-hs="cheer-list"]', news);
      if (cheerBox && cheerList && typeof db.listCheers === "function") {
        db.listCheers(6).then(function (rows) {
          var list = (Array.isArray(rows) ? rows : []).filter(function (c) { return c && String(c.message || "").trim(); });
          if (!list.length) return;
          cheerList.innerHTML = list.map(function (c, i) {
            var who = c.name ? esc(c.name) : bi("익명", "Anonymous");
            return '<figure class="hs-cheer" style="--k:' + i + '"><blockquote><p>' + esc(c.message) + "</p></blockquote>" +
              "<figcaption>" + who + (c.region ? " · " + esc(c.region) : "") + "</figcaption></figure>";
          }).join("");
          cheerBox.hidden = false;
        }).catch(function () {});
      }
    }

    /* ---- S7·S8. 연락처: assets/js/config.js 값으로 (비어 있으면 그 줄을 숨김) ---- */
    var C = WH.config || {};
    function hideOwner(el) { var box = el.closest("li") || el; box.hidden = true; }
    if (C.phone) {
      var tel = "tel:" + String(C.phone).replace(/[^0-9+]/g, "");
      $$('[data-hs="tel"]').forEach(function (a) { a.setAttribute("href", tel); });
      $$('[data-hs="phone"]').forEach(function (el) { el.textContent = C.phone; });
    } else {
      $$('[data-hs="tel"]').forEach(function (a) {
        hideOwner(a);
        var dot = a.previousElementSibling;
        if (dot && dot.classList.contains("hs-dot")) dot.hidden = true;
      });
    }
    var addr = C.address || {};
    $$('[data-hs="address"]').forEach(function (el) {
      if (addr.ko || addr.en) el.innerHTML = bi(esc(addr.ko || addr.en), esc(addr.en || addr.ko));
      else hideOwner(el);
    });
    $$('[data-hs="email"]').forEach(function (a) {
      if (/@/.test(C.publicEmail || "")) { a.setAttribute("href", "mailto:" + C.publicEmail); a.textContent = C.publicEmail; }
      else hideOwner(a);
    });
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
