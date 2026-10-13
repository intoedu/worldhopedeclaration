/* ==========================================================================
   세계희망연대 — 공통 스크립트
   헤더(데스크톱·모바일)·전체 메뉴·하단 탭바·푸터, 사이트 검색, 한·영 전환,
   아이콘, QR 모달, 토스트, 스크롤 효과, 통계 숫자(data/stats.json), 방문 통계
   ========================================================================== */
(function () {
  "use strict";

  var C = window.WH_CONFIG || {};
  var script = document.currentScript;
  var ROOT = script ? new URL("../../", script.src).href : location.origin + "/";
  var WH = (window.WH = window.WH || {});
  WH.ROOT = ROOT;
  WH.config = C;

  /* ---------------- 언어 ---------------- */
  var LANG_KEY = "wh-lang";
  function storedLang() {
    try {
      var q = new URLSearchParams(location.search).get("lang");
      if (q === "ko" || q === "en") return q;
      var s = localStorage.getItem(LANG_KEY);
      if (s === "ko" || s === "en") return s;
    } catch (e) {}
    return "ko";
  }
  WH.lang = function () { return document.documentElement.getAttribute("data-lang") || "ko"; };
  WH.t = function (ko, en) { return WH.lang() === "en" && en ? en : ko; };
  /* {ko, en} 객체 또는 row 의 field_ko / field_en 에서 현재 언어 값 선택 */
  WH.pick = function (obj, field) {
    if (!obj) return "";
    if (field) {
      var en = obj[field + "_en"], ko = obj[field + "_ko"];
      return WH.lang() === "en" && en ? en : (ko || en || "");
    }
    return WH.lang() === "en" && obj.en ? obj.en : (obj.ko || obj.en || "");
  };

  /* 속성 번역: data-en-placeholder / data-en-aria-label / data-en-title / data-en-alt */
  function applyAttrs(root, lang) {
    ["placeholder", "aria-label", "title", "alt"].forEach(function (attr) {
      root.querySelectorAll("[data-en-" + attr + "]").forEach(function (el) {
        if (!el.hasAttribute("data-ko-" + attr)) el.setAttribute("data-ko-" + attr, el.getAttribute(attr) || "");
        el.setAttribute(attr, lang === "en" ? el.getAttribute("data-en-" + attr) : el.getAttribute("data-ko-" + attr));
      });
    });
  }
  WH.applyAttrs = function (root) { applyAttrs(root || document, WH.lang()); };

  function applyLang(lang) {
    var html = document.documentElement;
    html.setAttribute("data-lang", lang);
    html.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyAttrs(document, lang);
    // <option data-en="..."> 번역
    document.querySelectorAll("option[data-en]").forEach(function (o) {
      if (!o.hasAttribute("data-ko")) o.setAttribute("data-ko", o.textContent);
      o.textContent = lang === "en" ? o.getAttribute("data-en") : o.getAttribute("data-ko");
    });
    var body = document.body;
    if (body) {
      if (!body.hasAttribute("data-title-ko")) body.setAttribute("data-title-ko", document.title);
      var en = body.getAttribute("data-title-en");
      document.title = lang === "en" && en ? en : body.getAttribute("data-title-ko");
    }
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
    });
    document.dispatchEvent(new CustomEvent("wh:lang", { detail: { lang: lang } }));
  }
  WH.setLang = applyLang;

  /* ---------------- 유틸 ---------------- */
  WH.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  WH.param = function (k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } };
  WH.fmtDate = function (d) {
    var dt = new Date(d);
    if (isNaN(dt)) return "";
    var y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, "0"), day = String(dt.getDate()).padStart(2, "0");
    return y + "." + m + "." + day;
  };
  /* 숫자 → 1,234 형식 (숫자가 아니면 그대로) */
  WH.fmtNum = function (n) {
    var x = Number(n);
    return n !== "" && n != null && isFinite(x) ? x.toLocaleString("en-US") : String(n == null ? "" : n);
  };
  /* 일반 텍스트 → 안전한 HTML (빈 줄 = 문단, 줄바꿈 = <br>, URL 자동 링크) */
  WH.textToHtml = function (text) {
    var safe = WH.esc(text || "").trim();
    if (!safe) return "";
    safe = safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return safe.split(/\n\s*\n/).map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; }).join("");
  };
  WH.copy = function (text) {
    var done = function () { WH.toast(WH.t("복사되었습니다.", "Copied to clipboard.")); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, fallback);
    fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      ta.remove();
    }
  };
  WH.loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded) return resolve();
        existing.addEventListener("load", resolve); existing.addEventListener("error", reject);
        return;
      }
      var s = document.createElement("script");
      s.src = src; s.async = true; s.dataset.src = src;
      s.onload = function () { s.dataset.loaded = "1"; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  };
  /* 공유·QR 기준 주소: 설정된 도메인 우선, 없으면 현재 접속 주소 */
  WH.baseUrl = function () {
    var u = (C.siteUrl || "").trim().replace(/\/+$/, "");
    return u ? u + "/" : ROOT;
  };
  WH.pageUrl = function (path) {
    if (path == null) {
      var rel = location.href.replace(ROOT, "").replace(/[?#].*$/, "");
      var keep = new URLSearchParams(location.search);
      keep.delete("lang");
      var qs = keep.toString();
      path = rel + (qs ? "?" + qs : "");
    }
    return WH.baseUrl() + path.replace(/^\//, "");
  };

  var toastTimer;
  WH.toast = function (msg) {
    var el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-show"); }, 2800);
  };

  /* 여러 겹의 창(메뉴·검색·QR)이 열려 있는 동안 배경 스크롤 잠금 */
  var scrollLocks = 0;
  function lockScroll(on) {
    scrollLocks = Math.max(0, scrollLocks + (on ? 1 : -1));
    document.documentElement.style.overflow = scrollLocks ? "hidden" : "";
  }
  /* 대화상자 안에서 Tab 키 순환 */
  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetWidth || el.offsetHeight || el.getClientRects().length; }
    );
  }
  function trapTab(root, e) {
    if (e.key !== "Tab") return;
    var f = focusables(root);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- 아이콘 (선 아이콘, 24×24) ---------------- */
  var P = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    world: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M3.5 7h17M3.5 17h17M12 2c2.8 2.8 4.2 6.1 4.2 10s-1.4 7.2-4.2 10c-2.8-2.8-4.2-6.1-4.2-10S9.2 4.8 12 2z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    thumbtack: '<path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v1H6v-1z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    hands: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.8-2.9l-4.2 3.9"/><path d="m2 15 6 6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    group: '<circle cx="12" cy="8.1" r="3.3"/><path d="M5.6 21v-3a6.4 6.4 0 0 1 12.8 0v3z"/><path d="M6.1 7.9a2.3 2.3 0 1 0 0 3.6M17.9 7.9a2.3 2.3 0 1 1 0 3.6"/><path d="M5.6 21H1.3v-2.4c0-2.8 2-5 4.8-5.4M18.4 21h4.3v-2.4c0-2.8-2-5-4.8-5.4"/>',
    people: '<circle cx="12" cy="7.5" r="3"/><circle cx="5" cy="9.5" r="2.2"/><circle cx="19" cy="9.5" r="2.2"/><path d="M6.5 20v-1.5a5.5 5.5 0 0 1 11 0V20"/><path d="M1.5 19.5v-.8A3.3 3.3 0 0 1 6 15.6M22.5 19.5v-.8a3.3 3.3 0 0 0-4.5-3.1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h3"/>',
    scroll: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
    filecheck: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    sun: '<circle cx="12" cy="14" r="4"/><path d="M12 4v2M4.9 7.9l1.4 1.4M2 14h2M20 14h2M17.7 9.3l1.4-1.4M3 20h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    flag: '<path d="M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    link2: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    idcard: '<rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M4.5 17a3.5 3.5 0 0 1 7 0M14 9.5h5M14 13h5M14 16.5h3"/>',
    bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
    landmark: '<path d="M3 21h18M5 18h14M6 18v-7M10 18v-7M14 18v-7M18 18v-7M3 11h18L12 4z"/>',
    repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    cross: '<path d="M12 3v18M7 8h10"/>',
    seed: '<path d="M7 20h10M12 20v-8"/><path d="M12 12c0-3 2-6 6-6 0 3-2 6-6 6zM12 14c0-2.5-1.7-5-5-5 0 2.5 1.7 5 5 5z"/>',
    sprout: '<path d="M12 21v-9M8 21h8"/><path d="M12 12C12 8 9.5 5 5 5c0 4 2.5 7 7 7z"/><path d="M12 14c0-4 2.6-7.5 7-7.5 0 4.2-2.6 7.5-7 7.5z"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13C4 7 9 3 20 3c0 10-4 17-9 17z"/><path d="M4 21c2.5-5 6-8.5 11-11"/>',
    target: '<path d="M20.2 8.6A9.4 9.4 0 1 1 16.3 4.4"/><circle cx="11.6" cy="12.6" r="5.4"/><circle cx="11.6" cy="12.6" r="1.6"/><path d="m12.8 11.4 6.4-6.4"/><path d="m19.2 5-.5-2.2 1.6-1.3.6 1.6 1.6.6-1.3 1.6z"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.2 13.6 7 22l5-3 5 3-1.2-8.4"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    palette: '<path d="M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/><path d="M16 8h4v4"/>',
    medical: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/><path d="M12 9.5v6M9 12.5h6"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    /* 5대 원칙용 중립 아이콘 (태극 문양 사용 금지) */
    circles: '<circle cx="9" cy="12" r="6.5"/><circle cx="15" cy="12" r="6.5"/>',
    layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
    horizontal: '<circle cx="5" cy="9" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="19" cy="9" r="2"/><path d="M2 20v-2a3 3 0 0 1 6 0v2M9 20v-2a3 3 0 0 1 6 0v2M16 20v-2a3 3 0 0 1 6 0v2M2 4h20"/>',
    balance: '<path d="M12 4v16M8 20h8M4 7h16"/><path d="M4 7l-3 6.5a3 3 0 0 0 6 0zM20 7l-3 6.5a3 3 0 0 0 6 0z"/>',
    center: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21"/>',
    unity: '<circle cx="12" cy="7.5" r="4.5"/><circle cx="7.5" cy="15" r="4.5"/><circle cx="16.5" cy="15" r="4.5"/>',
    /* 화면 조작 */
    menu: '<path d="M3 5h18M3 12h18M3 19h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    "chevron-right": '<path d="m9 6 6 6-6 6"/>',
    "chevron-left": '<path d="m15 6-6 6 6 6"/>',
    "arrow-right": '<path d="M4 12h16M14 6l6 6-6 6"/>',
    /* SNS */
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.8 4 12 4 12 4s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z"/><path d="m9.8 15.5 5.7-3.5-5.7-3.5z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4zM17.5 6.5h.01"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    blog: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    "youtube-fill": '<path fill="currentColor" stroke="none" fill-rule="evenodd" d="M22.6 7.2a2.9 2.9 0 0 0-2-2C18.8 4.7 12 4.7 12 4.7s-6.8 0-8.6.5a2.9 2.9 0 0 0-2 2A30 30 0 0 0 1 12a30 30 0 0 0 .4 4.8 2.9 2.9 0 0 0 2 2c1.8.5 8.6.5 8.6.5s6.8 0 8.6-.5a2.9 2.9 0 0 0 2-2A30 30 0 0 0 23 12a30 30 0 0 0-.4-4.8zM9.8 15.1V8.9l5.4 3.1z"/>',
    "facebook-fill": '<path fill="currentColor" stroke="none" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/>',
    kakao: '<path d="M12 4C6.5 4 2 7.4 2 11.6c0 2.7 1.8 5 4.6 6.4L5.7 21l3.6-2.4c.9.2 1.8.3 2.7.3 5.5 0 10-3.4 10-7.6S17.5 4 12 4z"/>'
  };
  WH.icon = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || "") + "</svg>";
  };
  WH.iconNames = Object.keys(P);
  function fillIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = WH.icon(el.getAttribute("data-icon"));
    });
  }
  WH.fillIcons = fillIcons;

  /* ---------------- 메뉴 정의 ---------------- */
  // 주 메뉴 (데스크톱 가로 메뉴 · 모바일 전체 메뉴). 8개 항목과 순서는 시안 그대로
  // sub: 데스크톱 하위 메뉴 판과 푸터 사이트맵에 쓰는 하위 메뉴 (각 페이지의 구역 id 로 바로 이동)
  //      cls: "js-gallery-link" → 갤러리가 견본 사진뿐인 동안 숨김 (html[data-gallery-empty])
  var NAV = [
    { id: "home", href: "index.html", ko: "홈", en: "Home", cap: "Home" },
    { id: "declaration", href: "declaration.html", ko: "세계희망선언", en: "Declaration", cap: "Declaration", sub: [
      { href: "declaration.html#principles", ko: "선언문·5대 원칙", en: "Declaration & Principles" },
      { href: "declaration.html#values", ko: "5대 가치", en: "Five Values" },
      { href: "declaration.html#together", ko: "공동의 선언", en: "Declare Together" }
    ] },
    { id: "vision", href: "vision.html", ko: "비전과 미션", en: "Vision & Mission", cap: "Vision", sub: [
      { href: "vision.html#vision", ko: "비전", en: "Vision" },
      { href: "vision.html#purpose", ko: "취지문", en: "Statement of Purpose" },
      { href: "vision.html#mission", ko: "미션", en: "Mission" },
      { href: "vision.html#ministries", ko: "다섯 갈래의 사역", en: "Five Ministries" }
    ] },
    { id: "global33", href: "global33.html", ko: "글로벌 33", en: "Global 33", cap: "Global 33", sub: [
      { href: "global33.html#fields", ko: "11개 분야", en: "11 Fields" },
      { href: "global33.html#structure", ko: "글로벌 확장 구조", en: "Global Structure" },
      { href: "global33.html#plaque", ko: "글로벌 대표 패", en: "Representative Plaque" },
      { href: "korea33.html", ko: "대한민국 대표 33인 추천", en: "Nominate Korea’s 33" }
    ] },
    { id: "worldmap", href: "worldmap.html", ko: "세계지도", en: "World Map", cap: "World Map", sub: [
      { href: "worldmap.html", ko: "세계지도 보기", en: "Explore the Map" }
    ] },
    { id: "news", href: "news.html", ko: "소식", en: "News", cap: "News", sub: [
      { href: "news.html", ko: "공지·소식", en: "News & Notices" },
      { href: "gallery.html", ko: "갤러리", en: "Gallery", cls: "js-gallery-link" }
    ] },
    { id: "join", href: "join.html", ko: "참여하기", en: "Join", cap: "Join Us", sub: [
      { href: "join.html#declare", ko: "선언 참여 신청", en: "Join the Declaration" },
      { href: "join.html#nominate", ko: "글로벌 대표 추천", en: "Nominate a Global Representative" },
      { href: "join.html#cheer", ko: "희망 응원 메시지", en: "Messages of Hope" },
      { href: "donate.html", ko: "후원·헌금", en: "Give" },
      { href: "contact.html", ko: "문의하기", en: "Contact" }
    ] },
    { id: "about", href: "about.html", ko: "연대소개", en: "About", cap: "About", sub: [
      { href: "about.html#greeting", ko: "위원장 인사말", en: "Chairman’s Greeting" },
      { href: "about.html#purpose", ko: "취지", en: "Purpose" },
      { href: "about.html#organization", ko: "조직", en: "Organization" },
      { href: "about.html#location", ko: "오시는 길", en: "Location" },
      { href: "faq.html", ko: "자주 묻는 질문", en: "FAQ" }
    ] }
  ];
  // 메뉴에 없는 페이지 → 어느 메뉴를 강조할지 (body[data-nav] 가 있으면 그것을 우선)
  var NAV_ALIAS = {
    ministry: "vision",
    post: "news",
    gallery: "news",
    donate: "join",
    contact: "about",
    faq: "about",
    korea33: "global33"
  };
  // 모바일 하단 탭바
  var TABS = [
    { id: "declaration", href: "declaration.html", icon: "doc", ko: "세계희망선언문", en: "Declaration" },
    { id: "global33", href: "global33.html", icon: "group", ko: "글로벌 33", en: "Global 33" },
    { id: "worldmap", href: "worldmap.html", icon: "world", ko: "세계지도", en: "World Map" },
    { id: "join", href: "join.html", icon: "sprout", ko: "참여하기", en: "Join" }
  ];
  // 모바일 전체 메뉴 아래쪽 바로가기 (2칸 × 3줄). '이 페이지 QR' 은 맨 아래 줄의 아이콘 버튼으로
  // 갤러리는 맨 끝: 숨겨지면 남은 5칸 중 마지막 칸이 한 줄 전체를 차지 (CSS)
  var MORE = [
    { id: "korea33", href: "korea33.html", icon: "group", ko: "대표 33인 추천", en: "Nominate Korea 33" },
    { id: "donate", href: "donate.html", icon: "heart", ko: "후원·헌금", en: "Give" },
    { id: "contact", href: "contact.html", icon: "mail", ko: "문의하기", en: "Contact" },
    { id: "faq", href: "faq.html", icon: "message", ko: "자주 묻는 질문", en: "FAQ" },
    { id: "qr", href: "qr.html", icon: "qr", ko: "QR코드 만들기", en: "QR Maker" },
    { id: "gallery", href: "gallery.html", icon: "image", ko: "갤러리", en: "Gallery", cls: "js-gallery-link" }
  ];
  WH.nav = NAV;
  function navById(id) {
    for (var i = 0; i < NAV.length; i++) if (NAV[i].id === id) return NAV[i];
    return null;
  }

  function bi(ko, en) { return '<span class="ko">' + ko + '</span><span class="en">' + en + "</span>"; }
  WH.bi = bi;
  function telHref() { return "tel:" + String(C.phone || "").replace(/[^0-9+]/g, ""); }
  /* 하위 메뉴 한 줄 (데스크톱 하위 메뉴 판 · 푸터 사이트맵 공용) */
  function subItem(s) {
    return "<li" + (s.cls ? ' class="' + s.cls + '"' : "") + '><a href="' + ROOT + s.href + '">' + bi(WH.esc(s.ko), WH.esc(s.en)) + "</a></li>";
  }
  function pageId() { return (document.body && document.body.getAttribute("data-page")) || ""; }
  function navId() {
    var b = document.body;
    var p = pageId();
    return (b && b.getAttribute("data-nav")) || NAV_ALIAS[p] || p;
  }
  /* 지금 페이지면 aria-current="page", 같은 메뉴 묶음이면 aria-current="true" */
  function current(id) {
    if (id === pageId()) return ' aria-current="page"';
    if (id === navId()) return ' aria-current="true"';
    return "";
  }
  function logoImg(size) {
    return '<picture><source srcset="' + ROOT + 'assets/img/brand/logo-mark-160.webp" type="image/webp">' +
      '<img src="' + ROOT + 'assets/img/brand/logo-mark-160.png" alt="" width="' + size + '" height="' + size + '"></picture>';
  }
  function brandHtml() {
    var name = C.name || {};
    return '<a class="brand" href="' + ROOT + 'index.html" aria-label="' + WH.esc((name.ko || "") + " 홈") + '" data-en-aria-label="' + WH.esc((name.en || "") + " — Home") + '">' +
      logoImg(72) +
      '<span class="brand-text" aria-hidden="true"><strong>' + WH.esc(name.ko || "") + "</strong><small>" + WH.esc(name.en || "") + "<sup>™</sup></small></span></a>";
  }
  function langButtons() {
    return '<button type="button" data-set-lang="ko" aria-pressed="false" lang="ko" aria-label="한국어">KOR</button>' +
      '<button type="button" data-set-lang="en" aria-pressed="false" lang="en" aria-label="English">ENG</button>';
  }

  /* ---------------- 헤더 · 모바일 메뉴 · 탭바 ---------------- */
  function renderHeader() {
    var mount = document.getElementById("site-header");
    if (!mount) return;

    // <base> 가 있는 페이지(404)에서는 "#main" 이 사이트 최상위 기준이 되므로 현재 주소를 붙임
    var skipHref = document.querySelector("base[href]") ? location.pathname + location.search + "#main" : "#main";

    // 주 메뉴: 항목마다 하위 목록(.gnb-sub)을 함께 넣음 → 데스크톱에서 하위 메뉴 판으로 펼쳐짐 (Tab 순서: 메뉴 → 그 하위 메뉴)
    // 하위 메뉴 판 왼쪽(로고 아래)에는 지금 가리킨 메뉴 이름을 크게 (.gnb-intro, 화면 낭독기에는 위 메뉴와 겹치므로 숨김)
    var col = 0;
    var navItems = NAV.map(function (n) {
      var sub = n.sub && n.sub.length ?
        '<div class="gnb-intro" aria-hidden="true"><span class="ko">' + n.cap + "</span><strong>" + bi(n.ko, n.en) + "</strong></div>" +
        '<ul class="gnb-sub" style="--c:' + (col++) + '">' + n.sub.map(subItem).join("") + "</ul>" : "";
      return "<li><a class=\"gnb-top\" href=\"" + ROOT + n.href + '"' + current(n.id) + ">" + bi(n.ko, n.en) + "</a>" + sub + "</li>";
    }).join("");

    // 헤더 전체를 문자열로 만든 뒤 한 번에 넣음 (자리 #site-header 는 CSS 로 헤더 높이만큼 비워 둠 → 화면 밀림 없음)
    // 넣은 뒤에야 위치·크기를 읽음
    mount.outerHTML =
      '<a class="skip-link" href="' + WH.esc(skipHref) + '">' + bi("본문 바로가기", "Skip to content") + "</a>" +
      (C.draftBar ? '<div class="draft-bar">' + bi("<b>시안 미리보기</b> · 사진과 일부 문구는 단체 자료를 받은 뒤 교체됩니다.", "<b>Draft preview</b> · Photos and some text will be replaced with final materials.") + "</div>" : "") +
      '<header class="site-header" id="site-header-bar">' +
      '<div class="header-inner">' +
      '<button type="button" class="icon-btn menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="전체 메뉴 열기" data-en-aria-label="Open menu">' + WH.icon("menu") + "</button>" +
      brandHtml() +
      '<nav class="gnb" aria-label="주 메뉴" data-en-aria-label="Main menu"><ul>' + navItems + '</ul><div class="gnb-panel" aria-hidden="true"></div></nav>' +
      '<div class="header-utils">' +
      '<span class="util-sep util-sep-faint" aria-hidden="true"></span>' +
      '<div class="lang-switch" role="group" aria-label="언어 선택" data-en-aria-label="Language">' + langButtons() + "</div>" +
      '<span class="util-sep" aria-hidden="true"></span>' +
      '<button type="button" class="icon-btn" data-search-open aria-label="사이트 검색" data-en-aria-label="Search the site" title="검색" data-en-title="Search">' + WH.icon("search") + "</button>" +
      "</div>" +
      '<div class="lang-drop">' +
      '<button type="button" class="lang-drop-btn" aria-expanded="false" aria-controls="lang-drop-menu" aria-label="언어 선택 (현재 한국어)" data-en-aria-label="Language (current: English)">' + bi("KOR", "ENG") + WH.icon("chevron-down") + "</button>" +
      '<div class="lang-drop-menu" id="lang-drop-menu" hidden>' +
      '<button type="button" data-set-lang="ko" aria-pressed="false" lang="ko">한국어 <small>KOR</small></button>' +
      '<button type="button" data-set-lang="en" aria-pressed="false" lang="en">English <small>ENG</small></button>' +
      "</div></div>" +
      "</div></header>";
    var header = document.getElementById("site-header-bar");

    // 모바일 전체 메뉴
    var mnav = document.createElement("div");
    mnav.className = "mobile-nav";
    mnav.id = "mobile-nav";
    mnav.setAttribute("aria-hidden", "true");
    mnav.innerHTML =
      '<div class="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="전체 메뉴" data-en-aria-label="Site menu">' +
      '<div class="mobile-nav-head">' + brandHtml() +
      '<button type="button" class="icon-btn mobile-nav-close" aria-label="메뉴 닫기" data-en-aria-label="Close menu">' + WH.icon("close") + "</button></div>" +
      '<button type="button" class="mnav-search" data-search-open>' + WH.icon("search") + bi("검색어를 입력하세요", "Search the site") + "</button>" +
      '<nav aria-label="주 메뉴" data-en-aria-label="Main menu"><ul class="mnav-list">' +
      NAV.map(function (n) {
        return '<li><a href="' + ROOT + n.href + '"' + current(n.id) + ">" + bi(n.ko, n.en) + '<small class="ko">' + n.cap + "</small>" + WH.icon("chevron-right") + "</a></li>";
      }).join("") +
      "</ul></nav>" +
      '<ul class="mnav-more">' +
      MORE.map(function (m) {
        return "<li" + (m.cls ? ' class="' + m.cls + '"' : "") + '><a href="' + ROOT + m.href + '"' + (m.id === pageId() ? ' aria-current="page"' : "") + ">" + WH.icon(m.icon) + "<span>" + bi(m.ko, m.en) + "</span></a></li>";
      }).join("") +
      "</ul>" +
      '<div class="mnav-foot">' +
      (C.phone ? '<div class="mnav-phone">' + bi("전국대표전화", "Main line (Korea)") + '<a href="' + telHref() + '">' + WH.esc(C.phone) + "</a></div>" : '<div class="mnav-phone"></div>') +
      '<button type="button" class="icon-btn mnav-qr" data-qr-open aria-label="이 페이지 QR코드" data-en-aria-label="QR code for this page" title="이 페이지 QR코드" data-en-title="QR code for this page">' + WH.icon("qr") + "</button>" +
      '<div class="lang-switch" role="group" aria-label="언어 선택" data-en-aria-label="Language">' + langButtons() + "</div>" +
      "</div></div>";
    document.body.appendChild(mnav);

    var toggle = header.querySelector(".menu-toggle");
    var panel = mnav.querySelector(".mobile-nav-panel");
    function isOpen() { return mnav.classList.contains("is-open"); }
    function setMenu(open, keepFocus) {
      if (open === isOpen()) return;
      mnav.classList.toggle("is-open", open);
      mnav.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      lockScroll(open);
      if (open) {
        // visibility 전환이 끝난 다음 프레임에 포커스 (숨김 상태에서는 포커스가 안 됨)
        var closeBtn = mnav.querySelector(".mobile-nav-close");
        void panel.offsetWidth;
        closeBtn.focus();
        requestAnimationFrame(function () { if (isOpen() && document.activeElement !== closeBtn) closeBtn.focus(); });
      } else if (!keepFocus) toggle.focus({ preventScroll: true });
    }
    WH.closeMenu = function () { setMenu(false, true); };
    toggle.addEventListener("click", function () { setMenu(!isOpen()); });
    mnav.querySelector(".mobile-nav-close").addEventListener("click", function () { setMenu(false); });
    mnav.addEventListener("click", function (e) { if (e.target === mnav) setMenu(false); });
    panel.addEventListener("keydown", function (e) { trapTab(panel, e); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen()) setMenu(false); });
    // 화면이 넓어져 메뉴가 사라지면 잠금 해제
    if (window.matchMedia) {
      var mq = window.matchMedia("(min-width: 1081px)");
      var onMq = function () { if (mq.matches && isOpen()) setMenu(false, true); };
      if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
    }

    // 모바일 언어 선택 (KOR ▾)
    var drop = header.querySelector(".lang-drop");
    var dropBtn = drop.querySelector(".lang-drop-btn");
    var dropMenu = drop.querySelector(".lang-drop-menu");
    function setDrop(open) {
      dropMenu.hidden = !open;
      dropBtn.setAttribute("aria-expanded", String(open));
    }
    dropBtn.addEventListener("click", function () {
      setDrop(dropMenu.hidden);
      if (!dropMenu.hidden) {
        var cur = dropMenu.querySelector('[aria-pressed="true"]') || dropMenu.querySelector("button");
        cur.focus();
      }
    });
    dropMenu.addEventListener("click", function (e) {
      if (e.target.closest("[data-set-lang]")) { setDrop(false); dropBtn.focus(); }
    });
    dropMenu.addEventListener("keydown", function (e) {
      var items = Array.prototype.slice.call(dropMenu.querySelectorAll("button"));
      var i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
      } else if (e.key === "Escape") { setDrop(false); dropBtn.focus(); }
      else if (e.key === "Tab") setDrop(false);
    });
    document.addEventListener("click", function (e) { if (!dropMenu.hidden && !drop.contains(e.target)) setDrop(false); });

    // 하단 탭바 (모바일 전용, CSS 로 760px 이하에서만 보임)
    var bar = document.createElement("nav");
    bar.className = "tabbar";
    bar.setAttribute("aria-label", "빠른 메뉴");
    bar.setAttribute("data-en-aria-label", "Quick menu");
    bar.innerHTML = TABS.map(function (t) {
      return '<a href="' + ROOT + t.href + '"' + current(t.id) + ">" + WH.icon(t.icon) + "<span>" + bi(t.ko, t.en) + "</span></a>";
    }).join("");
    document.body.appendChild(bar);
    document.body.classList.add("has-tabbar");

    setupMega(header);
    setupChromeScroll(header, bar);
  }

  /* ---------------- 데스크톱 하위 메뉴 판 (1081px 이상) ----------------
     · 주 메뉴에 마우스를 올리면 0.12초 뒤, 키보드(Tab)로 들어가면 바로 펼침 → 모든 하위 메뉴가 한 판에, 각 메뉴 바로 아래
     · 마우스가 메뉴·판 밖으로 나가거나, 포커스가 메뉴 밖으로 나가거나, Esc 를 누르면 닫힘
     · 하위 목록의 위치·폭은 펼칠 때 계산(layout): 위 메뉴 글자 시작점에 맞추되, 옆 목록과 겹치면 어긋남이 가장 작도록 고르게 비켜 놓음
     · 마지막으로 가리킨 메뉴(.is-hot)는 목록 위 금빛 선 + 진한 글자, 판 왼쪽에 메뉴 이름 */
  function setupMega(header) {
    var gnb = header.querySelector(".gnb");
    var panel = gnb && gnb.querySelector(".gnb-panel");
    if (!panel) return;
    var mq = window.matchMedia ? window.matchMedia("(min-width: 1081px)") : null;
    var openTimer = 0, hovering = false, dismissed = false, raf = 0;
    var GAP = 12, PAD_TOP = 22, PAD_BOTTOM = 28;

    function desktop() { return !mq || mq.matches; }
    function isOpen() { return header.classList.contains("is-menu"); }
    function keyFocus(el) {
      try { return el.matches(":focus-visible"); } catch (e) { return true; }
    }
    /* 하위 목록 놓기: 각 목록의 글자 시작을 위 메뉴의 글자 시작에 맞추는 것이 목표.
       하위 메뉴 이름이 위 메뉴보다 길어 그대로 두면 겹치므로, 겹치는 목록끼리 한 묶음으로 보고
       '위 메뉴와 어긋난 거리'의 제곱 합이 가장 작은 곳에 묶음을 놓음(줄 바꿈 없이 고르게 퍼짐).
       판의 폭(로고 오른쪽 ~ 검색 버튼 오른쪽 끝)이 모자라면 가장 넓은 목록부터 줄을 바꿔 폭을 줄임 */
    function layout() {
      var hb = header.getBoundingClientRect();
      var inner = header.querySelector(".header-inner");
      var ib = inner.getBoundingClientRect(), ics = getComputedStyle(inner);
      var brand = inner.querySelector(".brand").getBoundingClientRect();
      var lo = brand.right - hb.left + 32;
      var hi = ib.right - parseFloat(ics.paddingRight) - hb.left;
      var cols = [];
      Array.prototype.forEach.call(gnb.querySelectorAll(".gnb-sub"), function (sub) {
        var top = sub.parentNode.querySelector(".gnb-top");
        var tb = top.getBoundingClientRect();
        var linkPad = parseFloat(getComputedStyle(sub.querySelector("a") || sub).paddingLeft) || 0;
        sub.style.left = "0px";
        sub.style.width = "max-content";
        var nat = Math.ceil(sub.getBoundingClientRect().width);
        sub.style.width = "min-content";
        var min = Math.ceil(sub.getBoundingClientRect().width);
        cols.push({ sub: sub, x: tb.left - hb.left + (parseFloat(getComputedStyle(top).paddingLeft) || 0) - linkPad, w: nat, min: min });
      });
      // 폭이 모자라면 가장 넓은 목록부터 줄 바꿈 (가장 좁게는 낱말 하나 폭까지)
      var room = hi - lo - GAP * (cols.length - 1);
      for (var guard = 0; guard < 40; guard++) {
        var total = cols.reduce(function (s, c) { return s + c.w; }, 0);
        if (total <= room) break;
        var widest = null, next = 0;
        cols.forEach(function (c) { if (c.w > c.min && (!widest || c.w > widest.w)) widest = c; });
        if (!widest) break;
        cols.forEach(function (c) { if (c !== widest && c.w > next) next = c.w; });
        // 둘째로 넓은 목록 폭까지만 한 번에 줄임 (한 목록만 지나치게 좁아지지 않게)
        widest.w = Math.max(widest.min, widest.w - Math.max(4, Math.min(total - room, widest.w - next)));
      }
      // 겹치는 목록을 묶어 가며 놓기 (순서 유지, 사이 간격 GAP)
      var groups = [];
      function pos(g) { return Math.min(Math.max(g.sum / g.n, lo), hi - g.w); }
      cols.forEach(function (c, i) {
        groups.push({ first: i, last: i, w: c.w, sum: c.x, n: 1 });
        while (groups.length > 1) {
          var b = groups[groups.length - 1], a = groups[groups.length - 2];
          if (pos(a) + a.w + GAP <= pos(b)) break;
          a.sum += b.sum - (a.w + GAP) * b.n;
          a.n += b.n; a.w += GAP + b.w; a.last = b.last;
          groups.pop();
        }
      });
      groups.forEach(function (g) {
        var left = pos(g);
        for (var i = g.first; i <= g.last; i++) {
          cols[i].sub.style.left = Math.round(left) + "px";
          cols[i].sub.style.width = Math.ceil(cols[i].w) + "px";
          left += cols[i].w + GAP;
        }
      });
      var h = 0;
      cols.forEach(function (c) { h = Math.max(h, c.sub.offsetHeight); });
      header.style.setProperty("--mega-h", Math.ceil(h + PAD_TOP + PAD_BOTTOM) + "px");
    }
    function open() {
      clearTimeout(openTimer);
      if (isOpen() || !desktop()) return;
      layout();
      header.classList.add("is-menu");
    }
    function close() {
      clearTimeout(openTimer);
      header.classList.remove("is-menu");
      setHot(null);
    }
    function focusInside() {
      var a = document.activeElement;
      return a && gnb.contains(a) && keyFocus(a);
    }
    // 지금 가리키는 메뉴 묶음(.is-hot): 마지막으로 마우스·포커스가 들어간 메뉴를 기억
    // (메뉴에서 하위 목록으로 내려가는 동안 판의 빈 곳을 지나도 강조가 깜빡이지 않게)
    var hot = null;
    function setHot(li) {
      if (li === hot) return;
      if (hot) hot.classList.remove("is-hot");
      hot = li;
      if (hot) hot.classList.add("is-hot");
    }
    function topLi(el) {
      var li = el && el.closest ? el.closest(".gnb > ul > li") : null;
      return li && gnb.contains(li) ? li : null;
    }
    gnb.addEventListener("mouseover", function (e) {
      var li = topLi(e.target);
      if (li) setHot(li);
    });
    gnb.addEventListener("focusin", function (e) { setHot(topLi(e.target)); });

    gnb.addEventListener("mouseenter", function () {
      hovering = true;
      dismissed = false;
      clearTimeout(openTimer);
      if (!isOpen()) openTimer = setTimeout(open, 120);
    });
    gnb.addEventListener("mouseleave", function () {
      hovering = false;
      clearTimeout(openTimer);
      if (!focusInside()) close();
    });
    gnb.addEventListener("focusin", function (e) {
      // 메뉴 밖에서 새로 들어오면(예: 마우스로 Esc 를 누른 뒤 나중에 Tab 으로 들어옴) 다시 펼칠 수 있게
      // (창을 다시 볼 때처럼 이전 포커스가 없는 경우는 닫힌 채로 둠)
      if (e.relatedTarget && !gnb.contains(e.relatedTarget)) dismissed = false;
      if (!dismissed && keyFocus(e.target)) open();
    });
    gnb.addEventListener("focusout", function (e) {
      if (e.relatedTarget && gnb.contains(e.relatedTarget)) return;
      dismissed = false;
      if (!hovering) close();
    });
    // Esc: 판을 닫고, 하위 메뉴에 있던 포커스는 그 위 메뉴로 (다시 Tab 하거나 마우스를 올리기 전까지 닫힌 채)
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || !isOpen()) return;
      dismissed = true;
      var a = document.activeElement;
      var sub = a && a.closest ? a.closest(".gnb-sub") : null;
      if (sub) sub.parentNode.querySelector(".gnb-top").focus();
      close();
    });
    // 같은 페이지 안의 구역으로 가는 하위 메뉴를 누르면 판을 닫음
    gnb.addEventListener("click", function (e) {
      if (e.target.closest(".gnb-sub a")) { dismissed = true; close(); }
    });
    var relayout = function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        if (!isOpen()) return;
        if (desktop()) layout(); else close();
      });
    };
    window.addEventListener("resize", relayout);
    document.addEventListener("wh:lang", relayout);
  }

  /* ---------------- 스크롤에 따른 헤더·탭바 ----------------
     · 조금이라도 내려가면 헤더 아래 가는 선(.is-scrolled)
     · 휴대폰(760px 이하): 120px 아래에서 내리면 헤더·하단 탭바를 숨기고(body.chrome-down), 6px 이상 올리면 다시 보임.
       메뉴·검색·QR 창이 열려 있는 동안은 그대로. 헤더·탭바 안으로 포커스가 가면 바로 보임 */
  function setupChromeScroll(header, bar) {
    var body = document.body;
    var mobile = window.matchMedia ? window.matchMedia("(max-width: 760px)") : null;
    // '동작 줄이기' 설정이면 헤더·탭바를 늘 그 자리에 둠
    var still = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var lastY = window.scrollY || 0;
    function setDown(on) {
      if (body.classList.contains("chrome-down") !== on) body.classList.toggle("chrome-down", on);
    }
    function onScroll() {
      var y = window.scrollY || window.pageYOffset || 0;
      var scrolled = y > 8;
      if (header.classList.contains("is-scrolled") !== scrolled) header.classList.toggle("is-scrolled", scrolled);
      if (!mobile || !mobile.matches || (still && still.matches)) { setDown(false); lastY = y; return; }
      if (scrollLocks) { lastY = y; return; }
      var dy = y - lastY;
      if (y < 120) { setDown(false); lastY = y; }
      // 한 번에 화면 높이보다 크게 바뀌면(주소의 #구역으로 바로 이동 등) 상태는 그대로 두고 기준만 옮김
      else if (Math.abs(dy) > window.innerHeight) lastY = y;
      else if (dy > 6) { setDown(true); lastY = y; }
      else if (dy < -6) { setDown(false); lastY = y; }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    [header, bar].forEach(function (el) {
      if (el) el.addEventListener("focusin", function () { setDown(false); });
    });
    onScroll();
  }

  /* ---------------- 푸터 (두 단) ----------------
     위 단(.footer-main): 단체 소개(로고·단체명·위원회·문구) | 사이트맵(세계희망선언·글로벌 33·참여하기·연대소개의 하위 메뉴) | 전국대표전화·주소·이메일
     아래 단(.footer-inner): 시안 그대로 한 줄 — 세계희망연대 World Hope Declaration Network | 세계희망선언 World Hope Declaration
       ……… 개인정보처리방침 · 이용약관 · 문의하기 · (SNS)
     맨 아래(.footer-copy): 대표 연락처(의뢰인 요청 2026-10-12) · 고유번호(config.registrationNo 가 있을 때만) · ©
     SNS 아이콘은 주소(config.social)가 있을 때만 표시 (주소 없는 아이콘은 눌러도 아무 일이 없고 상표만 노출되므로 숨김).
     누적 방문자(.visit-counter)는 값이 있을 때만 나타남. */
  var SOCIAL = [
    { key: "youtube", icon: "youtube-fill", label: "YouTube" },
    { key: "instagram", icon: "instagram", label: "Instagram" },
    { key: "facebook", icon: "facebook-fill", label: "Facebook" },
    { key: "blog", icon: "blog", label: "Blog" },
    { key: "kakao", icon: "kakao", label: "KakaoTalk Channel" }
  ];
  var FOOTER_MAP = ["declaration", "global33", "join", "about"];
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\//i.test(u) ? u : "";
  }
  function safeMail(m) {
    return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(m || "") ? m : "";
  }

  function renderFooter() {
    var mount = document.getElementById("site-footer");
    if (!mount) return;
    var esc = WH.esc;
    var name = C.name || {}, decl = C.declaration || {}, com = C.committee || {}, addr = C.address || {};
    var social = C.social || {};

    var socialHtml = SOCIAL.map(function (s) {
      var url = safeUrl(social[s.key]);
      return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener" aria-label="' + s.label + ' (새 창)" data-en-aria-label="' + s.label + ' (opens in a new tab)" title="' + s.label + '">' + WH.icon(s.icon) + "</a>" : "";
    }).join("");

    // 위 단 ① 단체 소개
    var aboutHtml = '<div class="footer-about">' +
      '<a class="footer-logo" href="' + ROOT + 'index.html">' + logoImg(48) +
      "<b>" + esc(name.ko || "") + '</b><span lang="en">' + esc(name.en || "") + "</span></a>" +
      (com.ko ? '<p class="footer-committee">' + bi(esc(com.ko), esc(com.en || com.ko)) + "</p>" : "") +
      '<p class="footer-quote" lang="en">From Division to Hope,<br>Together for a Better World.</p>' +
      "</div>";
    // 위 단 ② 사이트맵 (주 메뉴의 하위 메뉴 그대로)
    var mapHtml = '<nav class="footer-sitemap" aria-label="사이트맵" data-en-aria-label="Sitemap">' +
      FOOTER_MAP.map(function (id) {
        var n = navById(id);
        if (!n || !n.sub) return "";
        return '<div class="footer-col"><p class="footer-col-title"><a href="' + ROOT + n.href + '">' + bi(n.ko, n.en) + "</a></p>" +
          "<ul>" + n.sub.map(subItem).join("") + "</ul></div>";
      }).join("") + "</nav>";
    // 위 단 ③ 연락처
    var pub = safeMail(C.publicEmail);
    var reachList = (addr.ko ? "<li>" + WH.icon("pin") + "<span>" + bi(esc(addr.ko), esc(addr.en || addr.ko)) + "</span></li>" : "") +
      (pub ? "<li>" + WH.icon("mail") + '<a href="mailto:' + esc(pub) + '">' + esc(pub) + "</a></li>" : "");
    var reachHtml = '<div class="footer-reach">' +
      (C.phone ? '<p class="footer-tel-label">' + bi("전국대표전화", "Main line") + "</p>" +
        '<a class="footer-tel" href="' + telHref() + '">' + esc(C.phone) + "</a>" +
        // 휴대폰: 누르기 쉬운 전체 폭 버튼
        '<a class="btn btn-ghost-light footer-tel-btn" href="' + telHref() + '">' + WH.icon("phone") + bi("전국대표전화 " + esc(C.phone), "Main line " + esc(C.phone)) + "</a>" : "") +
      (reachList ? '<ul class="footer-reach-list">' + reachList + "</ul>" : "") +
      "</div>";

    // 맨 아래 줄: 대표 연락처 · 고유번호 · ©
    var fc = C.footerContact || {};
    var tel = String(fc.phone || "").replace(/[^0-9+]/g, "");
    var mail = safeMail(fc.email);
    var contactBits = [];
    if (fc.name) contactBits.push("<span>" + bi("대표 ", "Representative ") + bi(esc(fc.name.ko || ""), esc(fc.name.en || fc.name.ko || "")) + "</span>");
    if (tel) contactBits.push('<a href="tel:' + esc(tel) + '">' + esc(fc.phone) + "</a>");
    if (mail) contactBits.push('<a href="mailto:' + esc(mail) + '">' + esc(mail) + "</a>");
    var regNo = String(C.registrationNo || "").trim();
    if (regNo) contactBits.push("<span>" + bi("고유번호 ", "Registration No. ") + esc(regNo) + "</span>");
    var copyHtml = '<div class="footer-copy"><div class="footer-copy-inner">' +
      (contactBits.length ? '<p class="footer-contact">' + contactBits.join('<i aria-hidden="true">·</i>') + "</p>" : "") +
      '<p class="footer-rights">© ' + new Date().getFullYear() + " " + bi(esc(name.ko || ""), esc(name.en || "")) + ". All rights reserved.</p>" +
      "</div></div>";

    mount.outerHTML =
      '<footer class="site-footer">' +
      '<div class="footer-main"><div class="footer-main-inner">' + aboutHtml + mapHtml + reachHtml + "</div></div>" +
      '<div class="footer-inner">' +
      '<div class="footer-brands">' +
      '<a class="footer-brand" href="' + ROOT + 'index.html"><b>' + esc(name.ko || "") + '</b><span lang="en">' + esc(name.en || "") + "</span></a>" +
      '<span class="footer-sep" aria-hidden="true"></span>' +
      '<a class="footer-brand" href="' + ROOT + 'declaration.html"><b>' + esc(decl.ko || "") + '</b><span lang="en">' + esc(decl.en || "") + "</span></a>" +
      "</div>" +
      '<div class="footer-right">' +
      '<span class="visit-counter" hidden></span>' +
      '<nav class="footer-links" aria-label="정책 및 문의" data-en-aria-label="Policies and contact">' +
      '<a class="footer-privacy" href="' + ROOT + 'privacy.html">' + bi("개인정보처리방침", "Privacy Policy") + "</a>" +
      '<a href="' + ROOT + 'terms.html">' + bi("이용약관", "Terms of Use") + "</a>" +
      '<a href="' + ROOT + 'contact.html">' + bi("문의하기", "Contact") + "</a>" +
      "</nav>" +
      (socialHtml ? '<div class="footer-social">' + socialHtml + "</div>" : "") +
      "</div></div>" + copyHtml + "</footer>";
  }

  /* ---------------- 사이트 검색 ---------------- */
  // 페이지 색인 (제목·설명·검색어). 새 페이지를 만들면 여기에 한 줄 추가합니다.
  var PAGES = [
    { href: "index.html", ko: "홈", en: "Home", dko: "세계희망선언™ — 분열을 넘어, 함께 만드는 더 나은 세상", den: "World Hope Declaration™ — From division to hope, together for a better world", k: "home main 메인 첫 화면 세계희망선언 world hope declaration" },
    { href: "declaration.html", ko: "세계희망선언문", en: "The Declaration", dko: "세계희망선언 5대 원칙과 5대 가치 — 이중개념·종속구조·수평논리·중심기축·공평화합", den: "Five principles and five values — Dualism, Dependent Structure, Horizontal Logic, Centrium, R.P.U.", k: "선언문 5대 원칙 five principles 이중개념 dualism 종속구조 dependent structure 수평논리 horizontal logic 중심기축 centrium 공평화합 rpu righteousness peace united 5대 가치 values 평화 지구환경 planet 사람 people 연대 partnership 실천 action" },
    { href: "vision.html", ko: "비전과 미션", en: "Vision & Mission", dko: "세계희망선언이 향하는 비전과 사명", den: "The vision and mission of the World Hope Declaration", k: "비전 미션 vision mission 사명 목표 goal 사역 ministry 선교행진 mission march" },
    { href: "global33.html", ko: "글로벌 33", en: "Global 33", dko: "각국 글로벌 대표 33인 선정 — 11개 분야 × 분야별 3인", den: "33 Global Representatives per country — 11 fields × 3 persons each", k: "33인 대표 representatives 11개 분야 fields 사회영향력 국위선양 교육계 문화예술계 종교계 산업계 국방사회안전 의료계 생업종사자 시민 정치계 id card 카드 패 plaque" },
    { href: "korea33.html", ko: "대한민국 대표 33인 추천", en: "Nominate Korea’s 33", dko: "세계희망선언문 채택 서명자 · 11개 분야 × 3인 추천 안내와 추천서", den: "Nominate Korea’s 33 representatives — guide by field and nomination form", k: "추천 nominate nomination 대한민국 korea 33인 대표 서명자 signatory 선정 기준 criteria 분야 field 추천서" },
    { href: "worldmap.html", ko: "세계지도", en: "World Map", dko: "세계희망선언 대상 국가와 국가별 대표 선정 현황", den: "Countries of the World Hope Declaration and selection status", k: "세계지도 world map 지도 국가 countries nations 현황 status 대한민국 korea" },
    { href: "news.html", ko: "소식", en: "News", dko: "공지사항 · 소식 · 언론보도", den: "Notices, news and press", k: "공지 notice 소식 news 언론보도 press 게시판 board" },
    { href: "join.html", ko: "참여하기", en: "Join", dko: "세계희망선언에 참여하고 함께 희망을 선언합니다", den: "Join the World Hope Declaration", k: "참여 join 신청 apply 참가 동역 partner 응원 cheer" },
    { href: "about.html", ko: "연대소개", en: "About", dko: "취지문 · 위원장 인사말 · 조직 구성 · 오시는 길", den: "Purpose, chairman's greeting, organization and location", k: "소개 about 취지 purpose 인사말 greeting 위원장 chairman 원치현 조직 organization 위원회 council 오시는 길 location 주소 address 세종" },
    { href: "ministry.html", ko: "사역 안내", en: "Ministries", dko: "연구·채택 → 33인 선언 → 실천 → 보호·인도 → 선교행진", den: "Research & adoption, declaration by 33, practice, protection & guidance, mission march", k: "사역 ministry ministries 선교행진 mission march 연구 채택 실천 보호 인도" },
    { href: "gallery.html", ko: "갤러리", en: "Gallery", dko: "행사와 사역 현장 사진", den: "Photos of events and ministry", k: "갤러리 gallery 사진 photo 앨범 album" },
    { href: "donate.html", ko: "후원·헌금", en: "Give", dko: "계좌 후원 · 정기 후원 신청 · 온라인 후원", den: "Bank transfer, monthly giving and online giving", k: "후원 헌금 give donate donation 계좌 정기 기부금 영수증 receipt" },
    { href: "contact.html", ko: "문의하기", en: "Contact", dko: "문의 및 참여·동역 신청 · 전국대표전화 " + (C.phone || ""), den: "Inquiries and applications · " + (C.phone || ""), k: "문의 contact 전화 phone call 연락처 " + (C.phone || "") },
    { href: "faq.html", ko: "자주 묻는 질문", en: "FAQ", dko: "세계희망연대와 참여·후원에 관한 질문과 답변", den: "Frequently asked questions", k: "faq 질문 question 답변 answer" },
    { href: "qr.html", ko: "QR코드 만들기", en: "QR Code Maker", dko: "홈페이지와 각 메뉴의 QR코드 만들기·저장·인쇄", den: "Create, save and print QR codes", k: "qr 큐알 코드 code 인쇄 print" },
    { href: "privacy.html", ko: "개인정보처리방침", en: "Privacy Policy", dko: "개인정보 수집·이용 및 보호에 관한 방침", den: "How we handle personal information", k: "개인정보 privacy 방침 policy" },
    { href: "terms.html", ko: "이용약관", en: "Terms of Use", dko: "홈페이지 이용약관", den: "Website terms of use", k: "약관 terms 이용 use" }
  ];
  function norm(s) {
    return String(s || "").toLowerCase().replace(/[·・.,:;!?'"“”‘’()[\]{}\/\\\-–—_|™]+/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(q) { return norm(q).split(" ").filter(Boolean); }
  function searchPages(q) {
    var toks = tokens(q);
    if (!toks.length) return [];
    // 갤러리가 견본 사진뿐인 동안(data.js 가 <html data-gallery-empty> 표시)에는 메뉴처럼 검색 결과에서도 뺌
    var noGallery = document.documentElement.hasAttribute("data-gallery-empty");
    return PAGES.map(function (p) {
      if (noGallery && p.href === "gallery.html") return null;
      var title = norm(p.ko + " " + p.en);
      var hay = norm([p.ko, p.en, p.dko, p.den, p.k].join(" "));
      for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) === -1) return null;
      var score = toks.reduce(function (s, t) { return s + (title.indexOf(t) !== -1 ? 2 : 1); }, 0);
      return { p: p, score: score };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).map(function (x) { return x.p; });
  }
  /* 검색어 강조 (안전하게 이스케이프한 뒤 <mark>) */
  function highlight(text, toks) {
    text = String(text || "");
    var lower = text.toLowerCase(), out = "", i = 0;
    while (i < text.length) {
      var best = -1, len = 0;
      toks.forEach(function (t) {
        var j = lower.indexOf(t, i);
        if (j !== -1 && (best === -1 || j < best || (j === best && t.length > len))) { best = j; len = t.length; }
      });
      if (best === -1 || !len) break;
      out += WH.esc(text.slice(i, best)) + "<mark>" + WH.esc(text.slice(best, best + len)) + "</mark>";
      i = best + len;
    }
    return out + WH.esc(text.slice(i));
  }

  function setupSearch() {
    if (!document.querySelector("[data-search-open]")) return;
    var overlay, input, box, opener, timer, seq = 0;

    function build() {
      overlay = document.createElement("div");
      overlay.className = "search-overlay";
      overlay.id = "site-search";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "site-search-title");
      overlay.innerHTML =
        '<div class="search-panel">' +
        '<h2 class="sr-only" id="site-search-title">' + bi("사이트 검색", "Site search") + "</h2>" +
        '<form class="search-form" role="search">' + WH.icon("search") +
        '<label class="sr-only" for="site-search-q">' + bi("검색어", "Search terms") + "</label>" +
        '<input type="search" id="site-search-q" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="무엇을 찾으세요? 예) 5대 원칙, 글로벌 33, 후원" data-en-placeholder="Search — e.g. principles, Global 33, give">' +
        '<button type="button" class="icon-btn search-close" aria-label="검색 닫기" data-en-aria-label="Close search">' + WH.icon("close") + "</button>" +
        "</form>" +
        '<div class="search-results" aria-live="polite"></div>' +
        "</div>";
      document.body.appendChild(overlay);
      applyAttrs(overlay, WH.lang());
      input = overlay.querySelector("input");
      box = overlay.querySelector(".search-results");

      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () { render(input.value); }, 140);
      });
      overlay.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        var first = box.querySelector(".search-group li a");
        if (first) location.href = first.href;
      });
      overlay.querySelector(".search-close").addEventListener("click", close);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
      overlay.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); close(); return; }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          var links = Array.prototype.slice.call(box.querySelectorAll("a"));
          if (!links.length) return;
          var i = links.indexOf(document.activeElement);
          e.preventDefault();
          if (e.key === "ArrowDown") (i < 0 ? links[0] : links[Math.min(i + 1, links.length - 1)]).focus();
          else if (i <= 0) input.focus();
          else links[i - 1].focus();
          return;
        }
        trapTab(overlay, e);
      });
      document.addEventListener("wh:lang", function () {
        if (overlay.classList.contains("is-open")) render(input.value);
      });
    }

    function group(title, items) {
      return '<div class="search-group"><h3 class="search-group-title">' + title + "</h3><ul>" + items.join("") + "</ul></div>";
    }
    function item(href, title, desc, toks) {
      return '<li><a href="' + WH.esc(href) + '"><b>' + highlight(title, toks) + "</b>" + (desc ? "<span>" + highlight(desc, toks) + "</span>" : "") + "</a></li>";
    }
    function emptyHtml(q) {
      return '<p class="search-empty">' + WH.esc(WH.t("‘" + q + "’에 대한 검색 결과가 없습니다. 다른 낱말로 찾아보세요.", "No results for “" + q + "”. Try another word.")) + "</p>" + quickHtml();
    }
    function quickHtml() {
      return '<div class="search-group"><h3 class="search-group-title">' + bi("바로가기", "Quick links") + '</h3><div class="search-quick">' +
        NAV.map(function (n) { return '<a href="' + ROOT + n.href + '">' + WH.esc(WH.t(n.ko, n.en)) + "</a>"; }).join("") +
        '<button type="button" data-qr-open>' + WH.icon("qr") + WH.esc(WH.t("이 페이지 QR코드", "QR code for this page")) + "</button>" +
        "</div></div>";
    }

    function render(raw) {
      var my = ++seq;
      var q = String(raw || "").trim();
      if (!q) { box.innerHTML = quickHtml(); return; }
      var toks = tokens(q);
      var pages = searchPages(q).slice(0, 8);
      var pageHtml = pages.length ? group(bi("페이지", "Pages"), pages.map(function (p) {
        return item(ROOT + p.href, WH.t(p.ko, p.en), WH.t(p.dko, p.den), toks);
      })) : "";
      var canPosts = WH.db && typeof WH.db.listPosts === "function";
      if (!canPosts) { box.innerHTML = pageHtml || emptyHtml(q); return; }
      box.innerHTML = pageHtml + '<div class="search-posts"><p class="search-empty">' + WH.esc(WH.t("소식을 찾는 중…", "Searching news…")) + "</p></div>";
      WH.db.listPosts({ q: q, size: 6 }).then(function (res) {
        if (my !== seq) return;
        var items = (res && res.items) || [];
        var holder = box.querySelector(".search-posts");
        if (items.length) {
          holder.innerHTML = group(bi("소식", "News") + " · " + WH.esc(res.total), items.map(function (p) {
            return item(ROOT + "post.html?id=" + encodeURIComponent(p.id), WH.pick(p, "title"), WH.fmtDate(p.created_at), toks);
          }));
        } else if (pages.length) holder.innerHTML = "";
        else box.innerHTML = emptyHtml(q);
      }, function () {
        if (my !== seq) return;
        if (pages.length) box.querySelector(".search-posts").innerHTML = "";
        else box.innerHTML = emptyHtml(q);
      });
    }

    function open(from) {
      if (!overlay) build();
      if (overlay.classList.contains("is-open")) { input.focus(); return; }
      opener = from || document.activeElement;
      overlay.classList.add("is-open");
      lockScroll(true);
      render(input.value);
      input.focus();
      input.select();
    }
    function close() {
      if (!overlay || !overlay.classList.contains("is-open")) return;
      overlay.classList.remove("is-open");
      lockScroll(false);
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    }
    WH.openSearch = open;
    WH.closeSearch = close;

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-search-open]");
      if (!b) return;
      e.preventDefault();
      if (b.closest(".mobile-nav") && WH.closeMenu) {
        // 모바일 메뉴에서 열면 메뉴를 닫고, 검색을 닫을 때 메뉴 버튼으로 돌아감
        WH.closeMenu();
        open(document.querySelector(".menu-toggle"));
      } else open(b);
    });
    // "/" 키로 검색 열기 (입력 중이 아닐 때)
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      var t = e.target;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      e.preventDefault();
      open(document.activeElement);
    });
  }

  /* ---------------- 통계 숫자 (data/stats.json) ----------------
     HTML 에 <b data-stat="countries">195</b> 처럼 기본값을 적어 두면
     data/stats.json 값으로 바꿔 넣습니다. (불러오기 실패 시 기본값 유지) */
  WH.stats = function () {
    if (!WH.db || typeof WH.db.json !== "function") return Promise.resolve(null);
    return WH.db.json("stats").then(function (s) {
      if (!s || typeof s !== "object" || Array.isArray(s)) return null;
      if (s.target == null && s.countries && s.per_country) s.target = s.countries * s.per_country;
      return s;
    }, function () { return null; });
  };
  WH.fillStats = function (root) {
    var els = (root || document).querySelectorAll("[data-stat]");
    if (!els.length) return Promise.resolve(null);
    return WH.stats().then(function (s) {
      if (!s) return null;
      els.forEach(function (el) {
        var v = s[el.getAttribute("data-stat")];
        if (v == null || v === "") return;
        el.textContent = typeof v === "number" ? WH.fmtNum(v) : String(v);
      });
      return s;
    });
  };
  WH.motionOK = function () {
    return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };
  /* 숫자가 화면에 들어오면 0부터 올라가며 세기 (최종 표시는 fillStats 와 같음) */
  function countUp(el, finalText) {
    var target = parseFloat(String(finalText).replace(/,/g, ""));
    if (!isFinite(target) || target <= 0 || !/^[\d,]+$/.test(String(finalText).trim())) { el.textContent = finalText; return; }
    var t0 = null, dur = target > 999 ? 1800 : 1300;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? WH.fmtNum(Math.round(target * e)) : finalText;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function setupStats() {
    // 큰 숫자 표시만 대상 (문장 속 숫자는 그대로, 홈 통계 띠는 home.js 가 담당)
    var els = Array.prototype.slice.call(document.querySelectorAll(".join-now-num b[data-stat], .stat-num b[data-stat], .g33-step-num b[data-stat], .g33-live-num b[data-stat]"));
    var animate = els.length && WH.motionOK() && "IntersectionObserver" in window && "requestAnimationFrame" in window;
    // 지금 보이는 숫자만 0에서 시작 (다른 언어로 가려진 숫자는 그대로 둠)
    var live = animate ? els.filter(function (el) { return el.getClientRects().length && /^[\d,]+$/.test(el.textContent.trim()); }) : [];
    var defaults = live.map(function (el) { return el.textContent; });
    live.forEach(function (el) { el.textContent = "0"; });
    function run(s) {
      if (!live.length) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          countUp(en.target, en.target.getAttribute("data-count-to"));
        });
      }, { threshold: 0.4 });
      live.forEach(function (el, i) {
        var v = s ? s[el.getAttribute("data-stat")] : null;
        el.setAttribute("data-count-to", v == null || v === "" ? defaults[i] : (typeof v === "number" ? WH.fmtNum(v) : String(v)));
        el.textContent = "0";
        io.observe(el);
      });
    }
    WH.fillStats().then(function (s) {
      run(s);
      if (s) document.dispatchEvent(new CustomEvent("wh:stats", { detail: s }));
    }, function () { run(null); });
  }

  /* ---------------- QR 모달 ---------------- */
  WH.loadQR = function () {
    if (window.qrcode) return Promise.resolve();
    return WH.loadScript(ROOT + "assets/vendor/qrcode/qrcode.js");
  };
  /* QR → canvas. opts: {size, color, bg, margin, logo(bool), level} */
  WH.drawQR = function (canvas, text, opts) {
    opts = opts || {};
    var level = opts.level || (opts.logo ? "H" : "M");
    qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
    var qr = qrcode(0, level);
    qr.addData(text);
    qr.make();
    var n = qr.getModuleCount();
    var margin = opts.margin == null ? 4 : opts.margin;
    var size = opts.size || 512;
    var cell = size / (n + margin * 2);
    canvas.width = size; canvas.height = size;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = opts.bg || "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = opts.color || "#13294b";
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) {
          var x = Math.round((c + margin) * cell), y = Math.round((r + margin) * cell);
          var w = Math.round((c + margin + 1) * cell) - x, h = Math.round((r + margin + 1) * cell) - y;
          ctx.fillRect(x, y, w, h);
        }
      }
    }
    var result = { qr: qr, modules: n, margin: margin };
    if (!opts.logo) return Promise.resolve(result);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var box = size * 0.22, pad = size * 0.022;
        var bx = (size - box) / 2;
        ctx.fillStyle = opts.bg || "#ffffff";
        roundRect(ctx, bx - pad, bx - pad, box + pad * 2, box + pad * 2, size * 0.03);
        ctx.fill();
        ctx.drawImage(img, bx, bx, box, box);
        resolve(result);
      };
      img.onerror = function () { resolve(result); };
      // 가운데 로고: 단체 마크 (큰 크기 인쇄용은 512px 원본)
      img.src = ROOT + "assets/img/brand/" + (size > 640 ? "logo-mark-512.png" : "logo-mark-160.png");
    });
  };
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  WH.downloadCanvas = function (canvas, filename) {
    var a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    document.body.appendChild(a); a.click(); a.remove();
  };

  function setupQrModal() {
    var modal, opener;
    function close() {
      if (!modal || !modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      lockScroll(false);
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
    }
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-qr-open]");
      if (!btn) return;
      e.preventDefault();
      // 모바일 메뉴·검색 창 안의 버튼이면 그 창을 닫고, QR 창을 닫을 때 메뉴 버튼(또는 검색 전 위치)으로 돌아감
      var back = null;
      if (btn.closest(".mobile-nav") && WH.closeMenu) { WH.closeMenu(); back = document.querySelector(".menu-toggle"); }
      else if (btn.closest(".search-overlay") && WH.closeSearch) { WH.closeSearch(); back = document.activeElement; }
      if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-labelledby", "qr-modal-title");
        modal.innerHTML =
          '<div class="modal-panel"><button type="button" class="modal-close" aria-label="닫기" data-en-aria-label="Close">' + WH.icon("close") + "</button>" +
          '<h2 id="qr-modal-title">' + bi("이 페이지 QR코드", "QR code for this page") + "</h2>" +
          "<p>" + bi("휴대폰 카메라로 비추면 바로 접속됩니다.", "Scan with your phone camera to open.") + "</p>" +
          '<canvas width="440" height="440" role="img" aria-label="QR코드" data-en-aria-label="QR code"></canvas>' +
          '<p class="qr-url" style="margin:12px 0 0"></p>' +
          '<div class="modal-actions"><button type="button" class="btn btn-primary btn-sm" data-qr-dl>' + WH.icon("download") + bi("PNG 저장", "Save PNG") + "</button>" +
          '<a class="btn btn-outline btn-sm" href="' + ROOT + 'qr.html">' + bi("QR 만들기", "QR maker") + "</a></div></div>";
        document.body.appendChild(modal);
        applyAttrs(modal, WH.lang());
        modal.addEventListener("click", function (ev) { if (ev.target === modal || ev.target.closest(".modal-close")) close(); });
        modal.addEventListener("keydown", function (ev) { trapTab(modal, ev); });
        document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
        modal.querySelector("[data-qr-dl]").addEventListener("click", function () {
          WH.downloadCanvas(modal.querySelector("canvas"), "worldhope-qr.png");
        });
      }
      var url = btn.getAttribute("data-qr-url") || WH.pageUrl();
      modal.querySelector(".qr-url").textContent = url;
      if (!modal.classList.contains("is-open")) { opener = back || btn; lockScroll(true); }
      modal.classList.add("is-open");
      modal.querySelector(".modal-close").focus();
      WH.loadQR().then(function () { WH.drawQR(modal.querySelector("canvas"), url, { size: 440, logo: true, margin: 2 }); });
    });
  }

  /* ---------------- 스크롤 등장 효과 ----------------
     섹션 단위로 등장: 각 섹션(main > section)의 .container 바로 아래 요소 앞 4개에 .reveal 을 자동으로 붙이고
     --i(0~3)로 순서를 줘서 0.07초 간격으로 차례로 떠오르게 함 (CSS: .reveal / .reveal.is-in)
     · 제외: 첫 섹션·페이지 머리말(.page-hero), 입력 양식(form)과 그 안쪽, 이미 .reveal 을 가진 요소
     · HTML 에 직접 단 .reveal(카드 묶음 등)은 같은 부모 안에서의 순서로 --i 를 줌 */
  function setupReveal() {
    var main = document.getElementById("main") || document.querySelector("main");
    if (main) {
      Array.prototype.forEach.call(main.children, function (sec, idx) {
        if (sec.tagName !== "SECTION" || idx === 0 || sec.classList.contains("page-hero") || sec.hasAttribute("data-no-reveal")) return;
        sec.querySelectorAll(".container").forEach(function (box) {
          if (box.closest("form")) return;
          var n = 0;
          Array.prototype.forEach.call(box.children, function (el) {
            if (n >= 4) return;
            if (el.tagName === "FORM" || el.querySelector("form, .reveal") || el.classList.contains("reveal") || el.closest(".reveal")) return;
            el.classList.add("reveal");
            el.style.setProperty("--i", n++);
          });
        });
      });
    }
    var els = document.querySelectorAll(".reveal");
    els.forEach(function (el) {
      if (el.style.getPropertyValue("--i")) return;
      var sibs = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains("reveal"); });
      el.style.setProperty("--i", Math.min(sibs.indexOf(el), 6));
    });
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        // 페이지를 열 때 이미 화면에 보이는 요소는 바로 등장 (화면 아래 끝에 살짝 걸친 것도)
        var first = seen && !seen.has(el);
        if (seen) seen.add(el);
        var r = en.boundingClientRect;
        if (!(first && r.top < window.innerHeight && r.bottom > 0)) {
          if (!en.isIntersecting) return;
          // 보통 요소는 12% 이상 보일 때, 화면보다 긴 요소(긴 글 등)는 들어오자마자 (12%가 화면보다 클 수 있으므로)
          var rh = en.rootBounds ? en.rootBounds.height : window.innerHeight;
          if (en.intersectionRatio < 0.12 && r.height < rh * 0.6) return;
        }
        el.classList.add("is-in");
        io.unobserve(el);
        // 등장이 끝나면 .reveal 을 떼어 요소 본래의 전환 효과(마우스 올림 등)가 늦게 반응하지 않게 함 (.is-in 은 남김)
        setTimeout(function () { el.classList.remove("reveal"); }, 1000 + (parseFloat(el.style.getPropertyValue("--i")) || 0) * 70);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: [0, 0.12] });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 방문자 통계 (GoatCounter · GA4, 선택) ---------------- */
  var A = C.analytics || {};
  function trackable() {
    return !document.body.hasAttribute("data-no-track") && location.pathname.indexOf("/admin") === -1;
  }
  function setupAnalytics() {
    if (!trackable()) return;
    if (A.ga4) {
      WH.loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(A.ga4)).catch(function () {});
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", A.ga4);
    }
    if (A.goatcounter) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://gc.zgo.at/count.js";
      s.setAttribute("data-goatcounter", "https://" + encodeURIComponent(A.goatcounter) + ".goatcounter.com/count");
      document.head.appendChild(s);
    }
  }
  /* 하단 '누적 방문자' 표시: GoatCounter 공개 카운터 (설정에서 'Allow adding visitor counts' 필요, 수 시간 단위로 갱신) */
  function setupVisits() {
    // 표시할 자리(하단 .visit-counter)가 없는 페이지(관리자 등)에서는 요청하지 않음
    if (!A.goatcounter || !C.showVisitCounter || !document.querySelector(".visit-counter")) return;
    fetch("https://" + encodeURIComponent(A.goatcounter) + ".goatcounter.com/counter/TOTAL.json")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        var el = document.querySelector(".visit-counter");
        if (!el || !d || d.count == null) return;
        el.innerHTML = "<span>" + bi("누적 방문자", "Total visitors") + " <b>" + WH.esc(d.count) + "</b></span>";
        el.hidden = false;
      }).catch(function () {});
  }

  /* ---------------- 초기화 ---------------- */
  function init() {
    document.documentElement.classList.remove("no-js");
    if (!C.draft) document.querySelectorAll("[data-draft-only]").forEach(function (el) { el.remove(); });
    renderHeader();
    renderFooter();
    fillIcons();
    applyLang(storedLang());
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-set-lang]");
      if (b) applyLang(b.getAttribute("data-set-lang"));
      var c = e.target.closest("[data-copy]");
      if (c) WH.copy(c.getAttribute("data-copy"));
    });
    setupQrModal();
    setupSearch();
    setupReveal();
    setupStats();
    setupAnalytics();
    setupVisits();
  }
  // 본문 끝에서 로드되면 즉시 실행(페이지 스크립트가 바로 WH 기능을 쓸 수 있도록)
  if (document.readyState !== "loading" || document.getElementById("site-footer")) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
