/* ==========================================================================
   글로벌 33 페이지 (global33.html) 전용 스크립트
   - ID 카드 예시의 QR코드 (이 페이지 주소)
   - 글로벌 확장 구조: 점으로 그린 세계지도 (data/worldmap-dots.json)
     + data/countries.json 에 등록된 국가 표시
   - 하위 메뉴 현재 위치 강조
   통계 숫자([data-stat])는 main.js 가 data/stats.json 으로 자동 채움
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  if (!WH) return;

  /* ---------------- ID 카드 예시: QR코드 ---------------- */
  function setupQR() {
    var canvas = document.querySelector("[data-g33-qr] canvas");
    if (!canvas || typeof WH.loadQR !== "function") return;
    WH.loadQR().then(function () {
      // 화면에서 58px 정도로 보이므로 고해상도(4배)로 그림
      return WH.drawQR(canvas, WH.pageUrl("global33.html"), { size: 232, margin: 1 });
    }).catch(function () {
      // QR 라이브러리를 못 불러오면 빈 흰 칸으로 둠
    });
  }

  /* ---------------- 점 세계지도 ---------------- */
  // 지도 안쪽 여백 비율 (가장자리 점이 잘리지 않게)
  var PAD_X = 0.006, PAD_Y = 0.03;

  function setupMap() {
    var box = document.querySelector(".g33-map");
    var canvas = box ? box.querySelector("canvas") : null;
    if (!box || !canvas || !canvas.getContext || !WH.db || typeof WH.db.json !== "function") return;

    var map = null;      // worldmap-dots.json
    var marked = {};     // 표시할 국가 코드 → true
    var frame = 0;

    // 경도·위도 → 지도 상자 안의 비율(0~1)
    function fx(lon) { return PAD_X + (1 - PAD_X * 2) * ((Number(lon) + 180) / 360); }
    function fy(lat) { return PAD_Y + (1 - PAD_Y * 2) * ((map.latMax - Number(lat)) / (map.latMax - map.latMin)); }

    function draw() {
      frame = 0;
      if (!map) return;
      var w = box.clientWidth, h = box.clientHeight;
      if (!w || !h) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      var ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 점 크기: 점 간격의 약 1/3 (좁은 화면에서도 보이도록 최소값)
      var cell = (w * (1 - PAD_X * 2)) / (360 / (map.step || 1.6));
      var r = Math.max(0.75, Math.min(2.3, cell * 0.34));
      var base = [], gold = [];
      map.dots.forEach(function (d) {
        (marked[String(d[2])] ? gold : base).push(d);
      });
      function dots(list) {
        ctx.beginPath();
        list.forEach(function (d) {
          var x = fx(d[0]) * w, y = fy(d[1]) * h;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        });
        ctx.fill();
      }
      ctx.fillStyle = "rgba(43, 87, 151, 0.27)";
      dots(base);
      ctx.fillStyle = "rgba(184, 145, 63, 0.95)";
      dots(gold);
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(draw);
    }

    // countries.json 의 국가를 지도에 표시 (이름표 + 범례)
    function renderMarks(countries) {
      var legend = document.querySelector("[data-g33-legend]");
      var html = "";
      (Array.isArray(countries) ? countries : []).forEach(function (c) {
        if (!c || c.code == null) return;
        var code = String(c.code);
        var own = map.dots.filter(function (d) { return String(d[2]) === code; });
        if (!own.length) return;
        marked[code] = true;
        // 그 나라 점들의 가운데
        var lon = 0, lat = 0;
        own.forEach(function (d) { lon += Number(d[0]); lat += Number(d[1]); });
        lon /= own.length; lat /= own.length;
        var left = fx(lon) * 100, top = fy(lat) * 100;

        var nameKo = WH.esc(c.name_ko || c.name_en || code);
        var nameEn = WH.esc(c.name_en || c.name_ko || code);
        var pin = document.createElement("span");
        pin.className = "g33-pin" + (left > 62 ? " is-left" : "");
        pin.style.left = left.toFixed(2) + "%";
        pin.style.top = top.toFixed(2) + "%";
        pin.innerHTML = '<span class="g33-pin-label">' + WH.bi(nameKo, nameEn) + "</span>";
        box.appendChild(pin);

        var noteKo = c.note_ko ? " — " + WH.esc(c.note_ko) : "";
        var noteEn = c.note_en ? " — " + WH.esc(c.note_en) : "";
        html += '<li><span class="legend-dot is-gold"></span>' + WH.bi(nameKo + noteKo, nameEn + noteEn) + "</li>";
      });
      if (legend && html) legend.insertAdjacentHTML("beforeend", html);
    }

    function load() {
      Promise.all([WH.db.json("worldmap-dots"), WH.db.json("countries")]).then(function (res) {
        var m = res[0];
        if (!m || !Array.isArray(m.dots) || !m.dots.length || m.latMax == null || m.latMin == null) return;
        map = m;
        renderMarks(res[1]);
        draw();
        if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(box);
        else window.addEventListener("resize", schedule);
      });
    }

    // 화면에 가까워졌을 때만 지도 자료(약 100KB)를 불러옴
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); }
      }, { rootMargin: "600px 0px" });
      io.observe(box);
    } else {
      load();
    }
  }

  /* ---------------- 하위 메뉴: 현재 위치 강조 (main.js WH.subnavSpy 공통) ---------------- */
  function setupSubnav() {
    if (WH.subnavSpy) WH.subnavSpy(document.querySelector(".g33-subnav"));
  }

  function init() {
    setupQR();
    setupMap();
    setupSubnav();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
