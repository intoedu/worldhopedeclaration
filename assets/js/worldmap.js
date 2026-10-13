/* ==========================================================================
   세계지도 페이지 (worldmap.html)
   - data/worldmap-dots.json 의 점(경도, 위도, 국가 코드)으로 점 세계지도 SVG 를 그림
     등장방형 도법: x = (경도 + 180) / 360 × W, y = (위도max − 위도) / (위도max − 위도min) × H
     점은 상태별로 <path> 하나에 "M x y h0" + 둥근 선끝(round cap) 으로 그려 가볍게 유지
   - data/countries.json 의 참여 국가: 금색 점 + 퍼지는 고리 표시(버튼) + 정보 말풍선
     (마우스 올리기·키보드 초점·누르기, Esc 로 닫기)
   - 참여 국가 목록 · 참여 국가 수([data-wm="count"]) · 진행 막대
   - 지도 데이터: Natural Earth(퍼블릭 도메인) → world-atlas(ISC) 가공, data/worldmap-dots.LICENSE.txt
   countries.json 항목: { code(ISO 숫자 코드), iso3, name_ko, name_en, status, selected, target,
                          note_ko, note_en, [lon, lat](선택: 표시 위치 직접 지정) }
   ========================================================================== */
(function () {
  "use strict";

  var WH = window.WH;
  var mapEl = document.getElementById("wm-map");
  if (!WH || !WH.db || !mapEl) return;

  var scroller = mapEl.querySelector(".wm-scroller");
  var canvas = mapEl.querySelector(".wm-canvas");
  var pop = document.getElementById("wm-pop");
  var listEl = document.getElementById("wm-list");
  var zoomBtn = document.getElementById("wm-zoom");

  var W = 1000;      // 지도 가로 길이 (SVG 좌표 단위)
  var PAD = 8;       // 지도 가장자리 여백
  var DENSE = 8;     // 표시가 이보다 많으면 지도 위 이름표를 숨김
  var GAP = 16;      // 표시와 말풍선 사이 간격(px)

  /* 진행 상태 → 표시 문구 (모르는 값은 '참여') */
  var STATUS = {
    selecting: ["선정 진행 중", "Selecting"],
    selected: ["선정 완료", "Selected"],
    completed: ["선정 완료", "Completed"],
    declared: ["선언 완료", "Declared"],
    preparing: ["준비 중", "Preparing"],
    planned: ["참여 예정", "Planned"],
    applied: ["참여 신청", "Applied"]
  };

  var state = { list: [], byKey: {}, ready: false, active: null, pinned: false, total: null };

  /* ---------------- 도우미 ---------------- */
  function esc(s) { return WH.esc(s); }
  function bi(ko, en) { return WH.bi(esc(ko), esc(en == null ? ko : en)); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  // ISO 숫자 코드는 세 자리로 맞춤 (4 → "004")
  function normCode(c) {
    var s = String(c == null ? "" : c).trim();
    return /^\d{1,3}$/.test(s) ? ("00" + s).slice(-3) : s;
  }
  function statusPair(st) {
    var k = String(st || "").toLowerCase();
    return STATUS[k] || ["참여", "Participating"];
  }
  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function primaryName(c) { return WH.t(c.ko, c.en); }
  function altName(c) { return WH.lang() === "en" ? c.ko : c.en; }
  function markerByKey(k) { return k ? canvas.querySelector('.wm-marker[data-key="' + k + '"]') : null; }

  /* countries.json 한 줄 → 화면용 객체 */
  function normalize(rows) {
    var out = [];
    (Array.isArray(rows) ? rows : []).forEach(function (r) {
      if (!r || typeof r !== "object") return;
      var ko = String(r.name_ko || r.name_en || "").trim();
      var en = String(r.name_en || r.name_ko || "").trim();
      if (!ko) return;
      var c = {
        key: "c" + out.length,
        code: normCode(r.code),
        iso3: String(r.iso3 || "").trim().toUpperCase(),
        ko: ko, en: en,
        status: r.status,
        selected: num(r.selected),
        target: num(r.target),
        note_ko: String(r.note_ko || "").trim(),
        note_en: String(r.note_en || "").trim(),
        lon: num(r.lon), lat: num(r.lat),
        hasMarker: false
      };
      out.push(c);
    });
    return out;
  }

  /* 무게중심에서 가장 가까운 그 나라의 점 (본토 밖 섬·속령 때문에 바다 위로 가지 않도록) */
  function centroid(pts) {
    var sx = 0, sy = 0;
    pts.forEach(function (p) { sx += p[0]; sy += p[1]; });
    var mx = sx / pts.length, my = sy / pts.length, best = pts[0], bd = Infinity;
    pts.forEach(function (p) {
      var d = (p[0] - mx) * (p[0] - mx) + (p[1] - my) * (p[1] - my);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  function setStatus(ko, en) {
    var el = document.getElementById("wm-status");
    if (el) el.innerHTML = bi(ko, en);
  }

  /* ---------------- 지도 그리기 ---------------- */
  function drawMap(geo) {
    if (!geo || !Array.isArray(geo.dots) || !geo.dots.length) {
      setStatus("지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "The map could not be loaded. Please try again later.");
      return;
    }
    var latMax = Number(geo.latMax), latMin = Number(geo.latMin), step = Number(geo.step) || 1.6;
    if (!isFinite(latMax) || !isFinite(latMin) || latMax <= latMin) { latMax = 78; latMin = -56; }
    var H = W * (latMax - latMin) / 360;
    var px = function (lon) { return (lon + 180) / 360 * W; };
    var py = function (lat) { return (latMax - lat) / (latMax - latMin) * H; };

    // 참여 국가 코드 → 점 묶음
    var hiCodes = {};
    state.list.forEach(function (c) { if (c.code) hiCodes[c.code] = true; });
    var base = [], lit = [], groups = {};
    geo.dots.forEach(function (d) {
      if (!d) return;
      var lon = Number(d[0]), lat = Number(d[1]);
      // 지도 범위 밖(남극 등)은 제외
      if (!isFinite(lon) || !isFinite(lat) || lat > latMax + step || lat < latMin - step) return;
      var x = r1(px(lon)), y = r1(py(lat)), seg = "M" + x + " " + y + "h0";
      var code = normCode(d[2]);
      if (code && hiCodes[code]) {
        var g = groups[code] || (groups[code] = { segs: [], pts: [] });
        g.segs.push(seg); g.pts.push([x, y]);
        return;
      }
      // 반짝이는 점 약 5% (좌표로 정한 고정 무작위 → 새로고침해도 같은 모양)
      var h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      if (h - Math.floor(h) < 0.05) lit.push(seg); else base.push(seg);
    });

    var vb = { x: -PAD, y: -PAD, w: W + PAD * 2, h: r1(H + PAD * 2) };
    var eq = r1(py(0));
    var hiPaths = Object.keys(groups).map(function (code) {
      return '<path class="wm-dots-hi" data-code="' + esc(code) + '" filter="url(#wm-glow)" d="' + groups[code].segs.join("") + '"/>';
    }).join("");

    var svg =
      '<svg class="wm-svg" xmlns="http://www.w3.org/2000/svg" viewBox="' + [vb.x, vb.y, vb.w, vb.h].join(" ") + '"' +
      ' role="img" aria-labelledby="wm-svg-t wm-svg-d" focusable="false">' +
      '<title id="wm-svg-t"></title><desc id="wm-svg-d"></desc>' +
      "<defs>" +
      '<radialGradient id="wm-g" gradientUnits="userSpaceOnUse" cx="' + r1(W * 0.54) + '" cy="' + r1(H * 0.42) + '" r="' + r1(W * 0.6) + '">' +
      '<stop offset="0" stop-color="#e2ecfa" stop-opacity=".92"/>' +
      '<stop offset=".55" stop-color="#a9c2e3" stop-opacity=".64"/>' +
      '<stop offset="1" stop-color="#7d9fcb" stop-opacity=".32"/>' +
      "</radialGradient>" +
      // 점이 한 줄로만 있으면 상자 크기가 0 이 되므로 필터 영역은 지도 전체 좌표로 지정
      '<filter id="wm-glow" filterUnits="userSpaceOnUse" x="' + vb.x + '" y="' + vb.y + '" width="' + vb.w + '" height="' + vb.h + '">' +
      '<feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
      "</filter>" +
      "</defs>" +
      (eq > 0 && eq < H ? '<path class="wm-equator" d="M0 ' + eq + "H" + W + '"/>' : "") +
      '<path class="wm-dots" stroke="url(#wm-g)" d="' + base.join("") + '"/>' +
      (lit.length ? '<path class="wm-dots-lit" d="' + lit.join("") + '"/>' : "") +
      hiPaths +
      "</svg>";

    // 참여 국가 표시(버튼) — 화면 크기와 관계없이 같은 크기로 보이도록 HTML 로 겹쳐 놓음
    var markers = state.list.map(function (c) {
      var pos = null;
      if (c.lon != null && c.lat != null) pos = [px(c.lon), py(c.lat)];
      else if (c.code && groups[c.code]) pos = centroid(groups[c.code].pts);
      if (!pos) return "";
      c.hasMarker = true;
      var left = (pos[0] - vb.x) / vb.w * 100, top = (pos[1] - vb.y) / vb.h * 100;
      return '<button type="button" class="wm-marker' + (left > 76 ? " is-left" : "") + '" data-key="' + c.key + '"' +
        ' style="left:' + left.toFixed(3) + "%;top:" + top.toFixed(3) + '%" aria-describedby="wm-pop">' +
        '<span class="wm-marker-dot" aria-hidden="true"></span>' +
        '<span class="wm-marker-label" aria-hidden="true">' + bi(c.ko, c.en) + "</span></button>";
    }).join("");

    canvas.style.aspectRatio = vb.w + " / " + vb.h;
    canvas.innerHTML = svg + '<div class="wm-markers">' + markers + "</div>";
    mapEl.classList.toggle("is-dense", canvas.querySelectorAll(".wm-marker").length > DENSE);
    state.ready = true;
  }

  /* 언어에 따라 바뀌는 지도 설명·표시 이름 */
  function updateTexts() {
    var names = state.list.filter(function (c) { return c.hasMarker; }).map(primaryName);
    var t = document.getElementById("wm-svg-t"), d = document.getElementById("wm-svg-d");
    if (t) t.textContent = WH.t("세계희망선언 세계지도", "World Hope Declaration world map");
    if (d) {
      d.textContent = names.length
        ? WH.t("점으로 그린 세계지도입니다. 금색으로 표시된 참여 국가: ", "A dotted world map. Participating nations shown in gold: ") + names.join(", ")
        : WH.t("점으로 그린 세계지도입니다.", "A dotted world map.");
    }
    state.list.forEach(function (c) {
      var m = markerByKey(c.key);
      if (!m) return;
      var st = statusPair(c.status);
      m.setAttribute("aria-label", primaryName(c) + (altName(c) && altName(c) !== primaryName(c) ? " (" + altName(c) + ")" : "") + ", " + WH.t(st[0], st[1]));
    });
  }

  /* ---------------- 말풍선 ---------------- */
  function popHtml(c) {
    var st = statusPair(c.status);
    var note = WH.t(c.note_ko || c.note_en, c.note_en || c.note_ko);
    var unit = WH.lang() === "en" ? "" : "인";
    var kv = [];
    if (c.target != null) kv.push([WH.t("목표", "Target"), WH.fmtNum(c.target) + unit]);
    if (c.selected != null) kv.push([WH.t("선정", "Selected"), WH.fmtNum(c.selected) + unit]);
    var alt = altName(c);
    return '<p class="wm-pop-top">' +
        (c.iso3 ? '<span class="wm-pop-code">' + esc(c.iso3) + "</span>" : "") +
        '<span class="badge badge-gold">' + esc(WH.t(st[0], st[1])) + "</span></p>" +
      '<p class="wm-pop-name">' + esc(primaryName(c)) +
        (alt && alt !== primaryName(c) ? '<span class="wm-pop-alt">' + esc(alt) + "</span>" : "") + "</p>" +
      (note ? '<p class="wm-pop-note">' + esc(note) + "</p>" : "") +
      (kv.length ? '<dl class="wm-pop-kv">' + kv.map(function (r) {
        return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
      }).join("") + "</dl>" : "");
  }

  function setActive(key, on) {
    var m = markerByKey(key);
    if (m) m.classList.toggle("is-active", on);
    var c = state.byKey[key];
    if (c && c.code) {
      var p = canvas.querySelector('.wm-dots-hi[data-code="' + c.code + '"]');
      if (p) p.classList.toggle("is-active", on);
    }
  }

  function show(key, pin) {
    var c = state.byKey[key];
    if (!c || !markerByKey(key)) return;
    if (state.active && state.active !== key) setActive(state.active, false);
    var changed = state.active !== key || pop.hidden;
    state.active = key;
    state.pinned = !!pin;
    setActive(key, true);
    if (changed) {
      pop.innerHTML = popHtml(c);
      pop.hidden = false;
    }
    place();
  }

  function hide() {
    if (!state.active) return;
    setActive(state.active, false);
    state.active = null;
    state.pinned = false;
    pop.hidden = true;
  }

  /* 말풍선 위치: 위쪽에 자리가 있으면 위, 아니면 아래 (지도 너비 안으로 맞춤) */
  function place() {
    if (!state.active || pop.hidden) return;
    var m = markerByKey(state.active);
    if (!m) { hide(); return; }
    var mr = mapEl.getBoundingClientRect(), br = m.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
    var bx = br.left + br.width / 2, by = br.top + br.height / 2;
    // 확대(가로 스크롤) 상태에서 표시가 보이는 영역 밖으로 나가면 닫기
    if (bx < sr.left - 1 || bx > sr.right + 1) { hide(); return; }
    var cx = bx - mr.left, cy = by - mr.top;
    var pw = pop.offsetWidth, ph = pop.offsetHeight, mw = mapEl.clientWidth, mh = mapEl.clientHeight;
    var roomAbove = cy - GAP - ph, roomBelow = mh - (cy + GAP + ph);
    var above = roomAbove >= 0 || (roomBelow < 0 && roomAbove > roomBelow);
    var left = Math.max(4, Math.min(cx - pw / 2, mw - pw - 4));
    pop.classList.toggle("is-below", !above);
    pop.style.left = Math.round(left) + "px";
    pop.style.top = Math.round(above ? cy - GAP - ph : cy + GAP) + "px";
    pop.style.setProperty("--ax", Math.round(Math.max(14, Math.min(cx - left, pw - 14))) + "px");
  }

  /* ---------------- 목록 · 숫자 ---------------- */
  function renderList() {
    if (!state.list.length) {
      listEl.innerHTML = '<li class="wm-empty">' + bi("아직 세계지도에 표시된 참여 국가가 없습니다.", "No participating nations are shown on the map yet.") + "</li>";
      return;
    }
    listEl.innerHTML = state.list.map(function (c) {
      var st = statusPair(c.status);
      var note = WH.t(c.note_ko || c.note_en, c.note_en || c.note_ko);
      var alt = altName(c);
      var unit = "<small>" + bi("인", "people") + "</small>";
      var count = "";
      if (c.selected != null && c.target) {
        count = '<p class="wm-row-count"><span>' + bi("선정", "Selected") + "</span>" +
          "<b>" + esc(WH.fmtNum(c.selected)) + " <small>/ " + esc(WH.fmtNum(c.target)) + "</small></b></p>";
      } else if (c.target != null) {
        count = '<p class="wm-row-count"><span>' + bi("목표", "Target") + "</span><b>" + esc(WH.fmtNum(c.target)) + unit + "</b></p>";
      } else if (c.selected != null) {
        count = '<p class="wm-row-count"><span>' + bi("선정", "Selected") + "</span><b>" + esc(WH.fmtNum(c.selected)) + unit + "</b></p>";
      }
      return '<li class="wm-row">' +
        '<span class="wm-row-code" aria-hidden="true">' + esc(c.iso3 || c.code) + "</span>" +
        '<div class="wm-row-main">' +
          '<h3 class="wm-row-name"><span>' + esc(primaryName(c)) + "</span>" +
            (alt && alt !== primaryName(c) ? '<span class="wm-row-alt">' + esc(alt) + "</span>" : "") + "</h3>" +
          '<p class="wm-row-note"><span class="badge badge-gold">' + esc(WH.t(st[0], st[1])) + "</span>" +
            (note ? "<span>" + esc(note) + "</span>" : "") + "</p>" +
        "</div>" +
        count +
        (c.hasMarker
          ? '<button type="button" class="btn btn-outline btn-sm wm-row-btn" data-key="' + c.key + '"><span data-icon="pin"></span>' + bi("지도에서 보기", "Show on map") + "</button>"
          : "") +
        "</li>";
    }).join("");
    WH.fillIcons(listEl);
  }

  function renderCount() {
    var n = state.list.length;
    document.querySelectorAll('[data-wm="count"]').forEach(function (el) { el.textContent = WH.fmtNum(n); });
  }

  /* ---------------- 확대 보기 (좁은 화면) ---------------- */
  function centerOn(m) {
    if (!m || !mapEl.classList.contains("is-zoomed")) return;
    scroller.scrollLeft = Math.max(0, m.offsetLeft + m.offsetWidth / 2 - scroller.clientWidth / 2);
  }
  function setZoom(on) {
    mapEl.classList.toggle("is-zoomed", on);
    if (zoomBtn) {
      zoomBtn.setAttribute("aria-pressed", String(on));
      var zi = zoomBtn.querySelector(".wm-zoom-in"), zo = zoomBtn.querySelector(".wm-zoom-out");
      if (zi) zi.hidden = on;
      if (zo) zo.hidden = !on;
    }
    if (on) centerOn(markerByKey(state.active) || canvas.querySelector(".wm-marker"));
    else scroller.scrollLeft = 0;
    place();
  }

  /* ---------------- 이벤트 ---------------- */
  function markerFrom(e) { return e.target && e.target.closest ? e.target.closest(".wm-marker") : null; }

  canvas.addEventListener("mouseover", function (e) {
    var m = markerFrom(e);
    if (!m || state.pinned) return;
    if (state.active !== m.getAttribute("data-key")) show(m.getAttribute("data-key"), false);
  });
  canvas.addEventListener("mouseout", function (e) {
    var m = markerFrom(e);
    if (!m || state.pinned) return;
    if (e.relatedTarget && m.contains(e.relatedTarget)) return;
    if (document.activeElement === m) return; // 키보드 초점이 있으면 유지
    hide();
  });
  canvas.addEventListener("focusin", function (e) {
    var m = markerFrom(e);
    if (m && state.active !== m.getAttribute("data-key")) show(m.getAttribute("data-key"), false);
  });
  canvas.addEventListener("focusout", function (e) {
    var m = markerFrom(e);
    if (!m || state.pinned) return;
    if (e.relatedTarget && m.contains(e.relatedTarget)) return;
    hide();
  });
  canvas.addEventListener("click", function (e) {
    var m = markerFrom(e);
    if (!m) return;
    var k = m.getAttribute("data-key");
    if (state.active === k && state.pinned) hide();
    else show(k, true);
  });

  // 목록의 '지도에서 보기'
  listEl.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".wm-row-btn") : null;
    if (!b) return;
    var k = b.getAttribute("data-key"), m = markerByKey(k);
    if (!m) return;
    centerOn(m);
    mapEl.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "center" });
    try { m.focus({ preventScroll: true }); } catch (err) { m.focus(); }
    show(k, true);
  });

  // 바깥을 누르거나 Esc 를 누르면 닫기
  document.addEventListener("click", function (e) {
    if (!state.active) return;
    var t = e.target;
    if (t && t.closest && (t.closest(".wm-marker") || t.closest(".wm-row-btn"))) return;
    hide();
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Escape" || e.key === "Esc") && state.active) hide();
  });

  var raf = 0;
  function schedulePlace() {
    if (raf) return;
    raf = window.requestAnimationFrame(function () { raf = 0; place(); });
  }
  window.addEventListener("resize", schedulePlace);
  scroller.addEventListener("scroll", schedulePlace, { passive: true });

  if (zoomBtn) zoomBtn.addEventListener("click", function () { setZoom(!mapEl.classList.contains("is-zoomed")); });

  document.addEventListener("wh:lang", function () {
    renderList();
    updateTexts();
    renderCount();
    if (state.active && !pop.hidden) {
      var c = state.byKey[state.active];
      if (c) { pop.innerHTML = popHtml(c); place(); }
    }
  });

  /* ---------------- 시작 ---------------- */
  Promise.all([
    WH.db.json("worldmap-dots"),
    WH.db.json("countries"),
    typeof WH.stats === "function" ? WH.stats() : Promise.resolve(null)
  ]).then(function (res) {
    state.list = normalize(res[1]);
    state.list.forEach(function (c) { state.byKey[c.key] = c; });
    var s = res[2];
    if (s && Number(s.countries) > 0) state.total = Number(s.countries);
    drawMap(res[0]);
    updateTexts();
    renderList();
    renderCount();
  }).catch(function () {
    setStatus("지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "The map could not be loaded. Please try again later.");
    listEl.innerHTML = '<li class="wm-empty">' + bi("참여 국가 목록을 불러오지 못했습니다.", "The list of nations could not be loaded.") + "</li>";
  });
})();
