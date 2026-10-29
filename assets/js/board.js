/* 공지·소식 게시판: 목록(news.html) / 상세(post.html) / 홈 최신글 */
(function () {
  "use strict";
  var WH = window.WH;
  var CATS = {
    notice: { ko: "공지", en: "Notice", cls: "badge-notice" },
    news: { ko: "소식", en: "News", cls: "badge-news" },
    press: { ko: "언론보도", en: "Press", cls: "badge-press" }
  };
  function badge(cat) {
    var c = CATS[cat] || { ko: cat, en: cat, cls: "badge-sample" };
    return '<span class="badge ' + c.cls + '">' + WH.esc(WH.pick(c)) + "</span>";
  }
  function postUrl(id) { return WH.ROOT + "post.html?id=" + encodeURIComponent(id); }
  function excerpt(p, n) {
    var t = WH.pick(p, "body").replace(/\s+/g, " ").trim();
    return t.length > n ? t.slice(0, n) + "…" : t;
  }
  function errorHtml() {
    return '<li class="board-empty">' + WH.t("게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "Could not load posts. Please try again later.") + "</li>";
  }

  /* ---------- 목록 ---------- */
  var list = document.getElementById("board-list");
  if (list) {
    var state = {
      category: WH.param("cat") || "",
      q: WH.param("q") || "",
      page: parseInt(WH.param("page"), 10) || 1,
      size: 10
    };
    var chips = document.querySelectorAll("[data-cat]");
    var form = document.getElementById("board-search");
    var input = form && form.querySelector("input");
    var pager = document.getElementById("board-pager");
    var countEl = document.getElementById("board-count");
    if (input) input.value = state.q;

    var syncUrl = function () {
      var p = new URLSearchParams();
      if (state.category) p.set("cat", state.category);
      if (state.q) p.set("q", state.q);
      if (state.page > 1) p.set("page", state.page);
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    };
    var load = function () {
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-cat") === state.category)); });
      list.innerHTML = '<li class="board-empty"><span class="skeleton" style="display:block;height:18px;max-width:420px;margin:0 auto"></span></li>';
      WH.db.listPosts(state).then(function (res) {
        var total = res.total;
        if (countEl) countEl.innerHTML = WH.t("전체 <b>" + total + "</b>건", "<b>" + total + "</b> posts");
        if (!res.items.length) {
          list.innerHTML = '<li class="board-empty">' + WH.t(state.q ? "검색 결과가 없습니다." : "등록된 게시글이 없습니다.", state.q ? "No results found." : "No posts yet.") + "</li>";
        } else {
          var start = total - (state.page - 1) * state.size;
          list.innerHTML = res.items.map(function (p, i) {
            var no = p.pinned ? '<span class="pin" title="' + WH.t("고정", "Pinned") + '">' + WH.icon("thumbtack") + "</span>" : String(start - i);
            return '<li class="board-row"><a href="' + postUrl(p.id) + '">' +
              '<span class="board-no">' + no + "</span>" + badge(p.category) +
              '<span class="board-title">' + WH.esc(WH.pick(p, "title")) + "</span>" +
              '<time class="board-date" datetime="' + WH.esc(p.created_at) + '">' + WH.fmtDate(p.created_at) + "</time></a></li>";
          }).join("");
        }
        renderPager(Math.max(1, Math.ceil(total / state.size)));
      }).catch(function () { list.innerHTML = errorHtml(); if (pager) pager.innerHTML = ""; });
      syncUrl();
    };
    var renderPager = function (pages) {
      if (!pager) return;
      if (pages <= 1) { pager.innerHTML = ""; return; }
      var html = '<button type="button" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? " disabled" : "") + ' aria-label="' + WH.t("이전", "Previous") + '">‹</button>';
      var from = Math.max(1, state.page - 2), to = Math.min(pages, from + 4);
      for (var i = from; i <= to; i++) html += '<button type="button" data-page="' + i + '"' + (i === state.page ? ' aria-current="page"' : "") + ">" + i + "</button>";
      html += '<button type="button" data-page="' + (state.page + 1) + '"' + (state.page >= pages ? " disabled" : "") + ' aria-label="' + WH.t("다음", "Next") + '">›</button>';
      pager.innerHTML = html;
    };
    chips.forEach(function (c) {
      c.addEventListener("click", function () { state.category = c.getAttribute("data-cat"); state.page = 1; load(); });
    });
    // 글이 하나도 없는 분류(예: 언론보도)는 칩을 숨김 — 눌러도 빈 목록만 보이므로 (지금 고른 분류는 그대로 둠)
    WH.db.listPosts({ size: 1000 }).then(function (res) {
      var used = {};
      res.items.forEach(function (p) { used[p.category] = true; });
      chips.forEach(function (c) {
        var cat = c.getAttribute("data-cat");
        if (cat && !used[cat] && cat !== state.category) c.hidden = true;
      });
    }).catch(function () {});
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); state.q = input.value.trim(); state.page = 1; load(); });
    if (pager) pager.addEventListener("click", function (e) {
      var b = e.target.closest("[data-page]");
      if (!b || b.disabled) return;
      state.page = parseInt(b.getAttribute("data-page"), 10);
      load();
      // '동작 줄이기' 설정이면 바로 이동
      list.scrollIntoView({ behavior: WH.motionOK && !WH.motionOK() ? "auto" : "smooth", block: "start" });
    });
    document.addEventListener("wh:lang", load);
    load();
  }

  /* ---------- 상세 ---------- */
  var view = document.getElementById("post-view");
  if (view) {
    var id = WH.param("id");
    var current = null;
    var render = function () {
      if (!current) return;
      var p = current.post;
      if (!p) {
        // 없는 글 주소는 검색에 올리지 않음 (빈 페이지가 검색 결과에 남지 않도록)
        if (!document.querySelector('meta[name="robots"]')) {
          var robots = document.createElement("meta");
          robots.name = "robots"; robots.content = "noindex";
          document.head.appendChild(robots);
        }
        // 글이 없을 때: 다른 빈 화면(갤러리·후원 준비 중)과 같은 상자 모양 (아이콘 · 제목 · 설명 · 버튼)
        view.innerHTML = '<div class="empty-panel"><span class="empty-panel-icon" aria-hidden="true">' + WH.icon("doc") + "</span>" +
          '<h1 class="empty-panel-title">' + WH.t("게시글을 찾을 수 없습니다", "Post not found") + "</h1>" +
          '<p class="empty-panel-text">' + WH.t("주소가 바뀌었거나 삭제된 글일 수 있습니다.", "The address may have changed or the post may have been removed.") + "</p>" +
          '<div class="empty-panel-actions"><a class="btn btn-primary" href="' + WH.ROOT + 'news.html">' + WH.t("공지·소식 보기", "See News & Notices") + WH.icon("arrow-right") + "</a></div></div>";
        return;
      }
      var title = WH.pick(p, "title");
      document.title = title + " | " + WH.pick(WH.config.name);
      // 글마다 대표 주소(canonical) — 같은 글이 ?lang= 등 다른 주소로 따로 잡히지 않게
      var canon = document.querySelector('link[rel="canonical"]');
      if (!canon) { canon = document.createElement("link"); canon.rel = "canonical"; document.head.appendChild(canon); }
      canon.href = WH.baseUrl() + "post.html?id=" + encodeURIComponent(p.id);
      var navRow = function (label, item) {
        if (!item) return "";
        return '<a href="' + postUrl(item.id) + '"><small>' + label + "</small><span>" + WH.esc(WH.pick(item, "title")) + "</span></a>";
      };
      view.innerHTML =
        '<header class="post-head">' + badge(p.category) +
        "<h1>" + WH.esc(title) + "</h1>" +
        '<div class="post-meta"><span>' + WH.esc(WH.pick(WH.config.name)) + '</span><time datetime="' + WH.esc(p.created_at) + '">' + WH.fmtDate(p.created_at) + "</time></div></header>" +
        (p.cover_url ? '<figure class="post-cover"><img src="' + WH.esc(p.cover_url) + '" alt=""></figure>' : "") +
        '<div class="post-body">' + WH.textToHtml(WH.pick(p, "body")) + "</div>" +
        '<div class="post-actions">' +
        '<a class="btn btn-navy btn-sm" href="' + WH.ROOT + 'news.html">' + WH.t("목록으로", "Back to list") + "</a>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        '<button type="button" class="btn btn-outline btn-sm" data-copy="' + WH.esc(WH.pageUrl()) + '">' + WH.icon("link") + WH.t("링크 복사", "Copy link") + "</button>" +
        '<button type="button" class="btn btn-outline btn-sm" data-qr-open>' + WH.icon("qr") + WH.t("QR코드", "QR code") + "</button></div></div>" +
        '<nav class="post-nav" aria-label="' + WH.t("이전/다음 글", "Previous/next post") + '">' +
        navRow(WH.t("다음 글", "Next"), current.next) + navRow(WH.t("이전 글", "Previous"), current.prev) + "</nav>";
    };
    if (!id) { current = { post: null }; render(); }
    else WH.db.getPost(id).then(function (r) { current = r; render(); }).catch(function () { current = { post: null }; render(); });
    document.addEventListener("wh:lang", render);
  }

  /* ---------- 홈 최신 소식 ---------- */
  var latest = document.getElementById("latest-news");
  if (latest) {
    var renderLatest = function () {
      WH.db.listPosts({ page: 1, size: 3 }).then(function (res) {
        if (!res.items.length) { latest.innerHTML = '<p class="muted">' + WH.t("등록된 소식이 없습니다.", "No news yet.") + "</p>"; return; }
        latest.innerHTML = res.items.map(function (p) {
          return '<a class="news-card" href="' + postUrl(p.id) + '"><div>' + badge(p.category) + "</div>" +
            "<h3>" + WH.esc(WH.pick(p, "title")) + "</h3><p>" + WH.esc(excerpt(p, 90)) + "</p>" +
            '<time datetime="' + WH.esc(p.created_at) + '">' + WH.fmtDate(p.created_at) + "</time></a>";
        }).join("");
      }).catch(function () { latest.innerHTML = '<p class="muted">' + WH.t("소식을 불러오지 못했습니다.", "Could not load news.") + "</p>"; });
    };
    document.addEventListener("wh:lang", renderLatest);
    renderLatest();
  }
})();
