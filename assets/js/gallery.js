/* 사진 갤러리: 앨범 필터 + 라이트박스 (gallery.html / 홈 미리보기) */
(function () {
  "use strict";
  var WH = window.WH;
  var ALBUMS = {
    events: { ko: "행사·모임", en: "Events" },
    ministry: { ko: "사역 현장", en: "In the field" },
    declaration: { ko: "희망선언", en: "Declaration" }
  };
  function albumName(key) { return ALBUMS[key] ? WH.pick(ALBUMS[key]) : key; }

  /* ---------- 라이트박스 ---------- */
  var lb, items = [], idx = 0, lastFocus;
  function ensureLightbox() {
    if (lb) return;
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "사진 크게 보기");
    lb.setAttribute("data-en-aria-label", "Photo viewer");
    lb.innerHTML =
      '<span class="lb-count"></span>' +
      '<button type="button" class="lb-btn lb-close" aria-label="닫기" data-en-aria-label="Close">×</button>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="이전 사진" data-en-aria-label="Previous photo">‹</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="lb-btn lb-next" aria-label="다음 사진" data-en-aria-label="Next photo">›</button>';
    document.body.appendChild(lb);
    if (WH.applyAttrs) WH.applyAttrs(lb); // 지금 언어에 맞는 버튼 이름
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
      // Tab 은 보기 창 안의 버튼(닫기·이전·다음) 사이에서만 돎
      if (e.key === "Tab") {
        var btns = Array.prototype.filter.call(lb.querySelectorAll(".lb-btn"), function (b) { return b.offsetParent !== null; });
        if (!btns.length) return;
        var i = btns.indexOf(document.activeElement);
        e.preventDefault();
        btns[(i + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }
  function show(i) {
    if (!items.length) return;
    idx = (i + items.length) % items.length;
    var g = items[idx];
    var img = lb.querySelector("img");
    img.src = g.image_url;
    img.alt = WH.pick(g, "title");
    lb.querySelector("figcaption").innerHTML = WH.esc(WH.pick(g, "title")) + "<small>" + WH.esc(albumName(g.album)) + "</small>";
    lb.querySelector(".lb-count").textContent = (idx + 1) + " / " + items.length;
  }
  function open(list, i) {
    ensureLightbox();
    items = list;
    lastFocus = document.activeElement;
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    show(i);
    lb.querySelector(".lb-close").focus();
  }
  function close() {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  function tile(g, i) {
    return '<button type="button" class="gallery-item" data-i="' + i + '">' +
      '<img src="' + WH.esc(g.image_url) + '" alt="' + WH.esc(WH.pick(g, "title")) + '" loading="lazy">' +
      "<figcaption>" + WH.esc(WH.pick(g, "title")) + "<small>" + WH.esc(albumName(g.album)) + "</small></figcaption></button>";
  }
  function bindGrid(grid, list) {
    grid.onclick = function (e) {
      var b = e.target.closest(".gallery-item");
      if (b) open(list, parseInt(b.getAttribute("data-i"), 10));
    };
  }

  /* ---------- 갤러리 페이지 ---------- */
  var grid = document.getElementById("gallery-grid");
  if (grid) {
    var filters = document.getElementById("gallery-filters");
    var all = [], album = WH.param("album") || "";
    var renderFilters = function () {
      var keys = [];
      all.forEach(function (g) { if (keys.indexOf(g.album) === -1) keys.push(g.album); });
      filters.innerHTML = '<button type="button" class="chip" data-album="" aria-pressed="' + (!album) + '">' + WH.t("전체", "All") + "</button>" +
        keys.map(function (k) { return '<button type="button" class="chip" data-album="' + WH.esc(k) + '" aria-pressed="' + (album === k) + '">' + WH.esc(albumName(k)) + "</button>"; }).join("");
    };
    // 실제 사진이 하나도 없으면(모두 '준비 중' 예시) 사진 벽과 앨범 칩 대신 안내 한 장만 보여 줌
    var isEmpty = function () { return !all.length || all.every(function (g) { return g.sample === true; }); };
    var renderEmpty = function () {
      var bar = filters.closest(".board-toolbar");
      if (bar) bar.hidden = true;
      grid.classList.add("is-empty");
      grid.innerHTML = '<div class="empty-panel">' +
        '<span class="empty-panel-icon" aria-hidden="true">' + WH.icon("image") + "</span>" +
        '<p class="empty-panel-title">' + WH.t("사진 준비 중", "Photos coming soon") + "</p>" +
        '<p class="empty-panel-text">' + WH.t("행사와 사역 현장 사진은 준비되는 대로 올려 드립니다.", "Photos of events and ministry will be posted as they become available.") + "</p>" +
        '<div class="empty-panel-actions"><a class="btn btn-outline" href="news.html">' + WH.t("공지·소식 보기", "Read the News") + WH.icon("arrow-right") + "</a></div></div>";
    };
    var renderGrid = function () {
      if (isEmpty()) { renderEmpty(); return; }
      var list = all.filter(function (g) { return !album || g.album === album; });
      grid.innerHTML = list.length ? list.map(tile).join("") : '<p class="board-empty" style="grid-column:1/-1">' + WH.t("등록된 사진이 없습니다.", "No photos yet.") + "</p>";
      bindGrid(grid, list);
    };
    filters.addEventListener("click", function (e) {
      var b = e.target.closest("[data-album]");
      if (!b) return;
      album = b.getAttribute("data-album");
      renderFilters(); renderGrid();
    });
    WH.db.listGallery({}).then(function (rows) { all = rows; renderFilters(); renderGrid(); })
      .catch(function () { grid.innerHTML = '<p class="board-empty" style="grid-column:1/-1">' + WH.t("사진을 불러오지 못했습니다.", "Could not load photos.") + "</p>"; });
    document.addEventListener("wh:lang", function () { renderFilters(); renderGrid(); });
  }

  /* ---------- 홈 미리보기 ---------- */
  var preview = document.getElementById("gallery-preview");
  if (preview) {
    var rows = [];
    var renderPreview = function () { preview.innerHTML = rows.map(tile).join(""); bindGrid(preview, rows); };
    WH.db.listGallery({ limit: 4 }).then(function (r) { rows = r; renderPreview(); }).catch(function () {});
    document.addEventListener("wh:lang", renderPreview);
  }
})();
