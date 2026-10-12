/* ==========================================================================
   세계희망연대 — 공통 스크립트
   헤더/푸터, 한·영 전환, 아이콘, QR 모달, 토스트, 스크롤 효과, 방문 통계
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

  function applyLang(lang) {
    var html = document.documentElement;
    html.setAttribute("data-lang", lang);
    html.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    // 속성 번역: data-ko-placeholder / data-en-placeholder 등
    ["placeholder", "aria-label", "title", "alt"].forEach(function (attr) {
      document.querySelectorAll("[data-en-" + attr + "]").forEach(function (el) {
        if (!el.hasAttribute("data-ko-" + attr)) el.setAttribute("data-ko-" + attr, el.getAttribute(attr) || "");
        el.setAttribute(attr, lang === "en" ? el.getAttribute("data-en-" + attr) : el.getAttribute("data-ko-" + attr));
      });
    });
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
    document.querySelectorAll(".lang-switch button").forEach(function (b) {
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

  /* ---------------- 아이콘 ---------------- */
  var P = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    thumbtack: '<path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v1H6v-1z"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    hands: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.8-2.9l-4.2 3.9"/><path d="m2 15 6 6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2zM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
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
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
    bank: '<path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/>',
    repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    cross: '<path d="M12 3v18M7 8h10"/>',
    link2: '<path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 1 1 0 10h-2M8 12h8"/>',
    seed: '<path d="M7 20h10M12 20v-8"/><path d="M12 12c0-3 2-6 6-6 0 3-2 6-6 6zM12 14c0-2.5-1.7-5-5-5 0 2.5 1.7 5 5 5z"/>'
  };
  WH.icon = function (name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || "") + "</svg>";
  };
  function fillIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = WH.icon(el.getAttribute("data-icon"));
    });
  }
  WH.fillIcons = fillIcons;

  /* ---------------- 헤더 / 푸터 ---------------- */
  var NAV = [
    { id: "about", href: "about.html", ko: "소개·인사말", en: "About" },
    { id: "ministry", href: "ministry.html", ko: "사역 안내", en: "Ministries" },
    { id: "news", href: "news.html", ko: "공지·소식", en: "News" },
    { id: "gallery", href: "gallery.html", ko: "갤러리", en: "Gallery" },
    { id: "faq", href: "faq.html", ko: "자주 묻는 질문", en: "FAQ" },
    { id: "contact", href: "contact.html", ko: "문의하기", en: "Contact" }
  ];
  function bi(ko, en) { return '<span class="ko">' + ko + '</span><span class="en">' + en + "</span>"; }
  function telHref() { return "tel:" + String(C.phone || "").replace(/[^0-9+]/g, ""); }

  function renderHeader() {
    var mount = document.getElementById("site-header");
    if (!mount) return;
    var page = document.body.getAttribute("data-page") || "";
    var name = C.name || { ko: "세계희망연대", en: "World Hope Alliance" };
    var navItems = NAV.map(function (n) {
      return '<li><a href="' + ROOT + n.href + '"' + (n.id === page || (page === "post" && n.id === "news") ? ' aria-current="page"' : "") + ">" + bi(n.ko, n.en) + "</a></li>";
    }).join("");
    var brand =
      '<a class="brand" href="' + ROOT + 'index.html" aria-label="' + WH.esc(name.ko) + ' 홈">' +
      '<img src="' + ROOT + 'assets/img/logo.svg" alt="" width="44" height="44">' +
      '<span class="brand-text"><strong>' + bi(WH.esc(name.ko), WH.esc(name.en)) + "</strong><small>" + bi(WH.esc((name.en || "").toUpperCase()), WH.esc(name.ko)) + "</small></span></a>";

    // <base> 가 있는 페이지(404)에서는 "#main" 이 사이트 최상위 기준이 되므로 현재 주소를 붙임
    var skipHref = document.querySelector("base[href]") ? location.pathname + location.search + "#main" : "#main";
    mount.innerHTML =
      '<a class="skip-link" href="' + WH.esc(skipHref) + '">' + bi("본문 바로가기", "Skip to content") + "</a>" +
      (C.draft ? '<div class="draft-bar">' + bi("<b>시안 미리보기</b> · 사진과 일부 문구는 단체 자료를 받은 뒤 교체됩니다.", "<b>Draft preview</b> · Photos and some text will be replaced with final materials.") + "</div>" : "") +
      '<div class="topbar"><div class="container">' +
      '<a class="topbar-phone" href="' + telHref() + '"><span class="label">' + bi("전국대표전화", "Call") + " </span><strong>" + WH.esc(C.phone || "") + "</strong></a>" +
      '<div class="topbar-right">' +
      '<button type="button" class="topbar-btn" data-qr-open>' + WH.icon("qr") + bi("QR코드", "QR Code") + "</button>" +
      '<div class="lang-switch" role="group" aria-label="Language"><button type="button" data-set-lang="ko" aria-pressed="false">KOR</button><button type="button" data-set-lang="en" aria-pressed="false">ENG</button></div>' +
      "</div></div></div>";

    var header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML =
      '<div class="container header-inner">' + brand +
      '<nav class="gnb" aria-label="주 메뉴"><ul>' + navItems + "</ul></nav>" +
      '<a class="btn btn-gold btn-sm header-cta" href="' + ROOT + 'donate.html">' + WH.icon("heart") + bi("후원·헌금", "Give") + "</a>" +
      '<button type="button" class="menu-toggle" aria-expanded="false" aria-controls="mobile-nav" aria-label="메뉴 열기"><span></span></button>' +
      "</div>";
    mount.after(header);

    var mnav = document.createElement("div");
    mnav.className = "mobile-nav";
    mnav.id = "mobile-nav";
    mnav.setAttribute("aria-hidden", "true");
    mnav.innerHTML =
      '<div class="mobile-nav-panel" role="dialog" aria-modal="true" aria-label="전체 메뉴">' +
      '<div class="mobile-nav-head">' + brand + '<button type="button" class="mobile-nav-close" aria-label="메뉴 닫기">×</button></div>' +
      '<ul><li><a href="' + ROOT + 'index.html"' + (page === "home" ? ' aria-current="page"' : "") + ">" + bi("홈", "Home") + "</a></li>" + navItems + "</ul>" +
      '<a class="btn btn-gold btn-block" href="' + ROOT + 'donate.html">' + WH.icon("heart") + bi("후원·헌금 하기", "Give / Donate") + "</a>" +
      '<a class="btn btn-outline btn-block mt-1" href="' + ROOT + 'qr.html">' + WH.icon("qr") + bi("홈페이지 QR코드", "Website QR Code") + "</a>" +
      '<div class="mobile-nav-contact">' + bi("전국대표전화", "Call us") + '<br><a href="' + telHref() + '">' + WH.esc(C.phone || "") + "</a></div>" +
      "</div>";
    document.body.appendChild(mnav);

    var toggle = header.querySelector(".menu-toggle");
    function setMenu(open) {
      mnav.classList.toggle("is-open", open);
      mnav.setAttribute("aria-hidden", String(!open));
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
      if (open) mnav.querySelector(".mobile-nav-close").focus();
      else toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener("click", function () { setMenu(!mnav.classList.contains("is-open")); });
    mnav.querySelector(".mobile-nav-close").addEventListener("click", function () { setMenu(false); });
    mnav.addEventListener("click", function (e) { if (e.target === mnav) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && mnav.classList.contains("is-open")) setMenu(false); });

    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderFooter() {
    var mount = document.getElementById("site-footer");
    if (!mount) return;
    var name = C.name || {};
    var year = new Date().getFullYear();
    var links = [{ href: "index.html", ko: "홈", en: "Home" }].concat(NAV, [
      { href: "donate.html", ko: "후원·헌금", en: "Give" },
      { href: "qr.html", ko: "QR코드", en: "QR Code" }
    ]);
    var social = C.social || {};
    var socialLinks = Object.keys(social).filter(function (k) { return social[k]; }).map(function (k) {
      return '<a href="' + WH.esc(social[k]) + '" target="_blank" rel="noopener">' + k.charAt(0).toUpperCase() + k.slice(1) + "</a>";
    }).join(" · ");
    var hours = WH.pick(C.businessHours || {});
    mount.outerHTML =
      '<footer class="site-footer"><div class="container">' +
      '<div class="footer-top">' +
      '<div class="footer-brand"><a class="brand" href="' + ROOT + 'index.html"><img src="' + ROOT + 'assets/img/logo.svg" alt="" width="44" height="44"><span class="brand-text"><strong>' + bi(WH.esc(name.ko || ""), WH.esc(name.en || "")) + "</strong><small>" + bi(WH.esc((name.en || "").toUpperCase()), WH.esc(name.ko || "")) + "</small></span></a>" +
      "<p>" + bi("분열과 전쟁의 세상을 종식시키는 희망의 서막이 열린다.", "The prelude of hope begins — to bring an end to a world of division and war.") + "</p>" +
      (socialLinks ? '<p class="footer-meta">' + socialLinks + "</p>" : "") +
      "</div>" +
      "<div><h4>" + bi("바로가기", "Quick links") + '</h4><ul class="footer-links">' +
      links.map(function (l) { return '<li><a href="' + ROOT + l.href + '">' + bi(l.ko, l.en) + "</a></li>"; }).join("") +
      "</ul></div>" +
      "<div><h4>" + bi("연락처", "Contact") + '</h4><ul class="footer-contact">' +
      '<li><a class="big" href="' + telHref() + '">' + WH.esc(C.phone || "") + '</a><br><small class="muted">' + bi("전국대표전화", "Main line (Korea)") + "</small></li>" +
      "<li><b>" + bi("주소", "Address") + "</b>" + bi(WH.esc((C.address || {}).ko || ""), WH.esc((C.address || {}).en || "")) + "</li>" +
      (C.publicEmail ? "<li><b>" + bi("이메일", "Email") + '</b><a href="mailto:' + WH.esc(C.publicEmail) + '">' + WH.esc(C.publicEmail) + "</a></li>" : "") +
      (hours ? "<li><b>" + bi("운영시간", "Hours") + "</b>" + WH.esc(hours) + "</li>" : "") +
      "</ul></div>" +
      "</div>" +
      '<div class="footer-bottom">' +
      '<div class="footer-meta">' +
      "<span><strong>" + bi(WH.esc(name.ko || ""), WH.esc(name.en || "")) + "</strong></span>" +
      "<span>" + bi("대표", "Representative") + " " + bi(WH.esc((C.representative || {}).ko || ""), WH.esc((C.representative || {}).en || "")) + "</span>" +
      (C.registrationNo ? "<span>" + bi("고유번호", "Reg. No.") + " " + WH.esc(C.registrationNo) + "</span>" : "") +
      '<a href="' + ROOT + 'privacy.html"><strong>' + bi("개인정보처리방침", "Privacy Policy") + "</strong></a>" +
      '<a href="' + ROOT + 'admin/">' + bi("관리자", "Admin") + "</a>" +
      "</div>" +
      '<div class="footer-meta"><span class="visit-counter" hidden></span><span>© ' + year + " " + WH.esc(name.en || "") + ". All rights reserved.</span></div>" +
      "</div></div></footer>";
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
    ctx.fillStyle = opts.color || "#0b1f44";
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
      img.src = ROOT + "assets/img/logo.svg";
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
    var modal;
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-qr-open]");
      if (!btn) return;
      e.preventDefault();
      if (!modal) {
        modal = document.createElement("div");
        modal.className = "modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.innerHTML =
          '<div class="modal-panel"><button type="button" class="modal-close" aria-label="닫기">×</button>' +
          "<h2>" + bi("이 페이지 QR코드", "QR code for this page") + "</h2>" +
          "<p>" + bi("휴대폰 카메라로 비추면 바로 접속됩니다.", "Scan with your phone camera to open.") + "</p>" +
          '<canvas width="440" height="440"></canvas>' +
          '<p class="qr-url" style="margin:12px 0 0"></p>' +
          '<div class="modal-actions"><button type="button" class="btn btn-primary btn-sm" data-qr-dl>' + WH.icon("download") + bi("PNG 저장", "Save PNG") + "</button>" +
          '<a class="btn btn-outline btn-sm" href="' + ROOT + 'qr.html">' + bi("QR 만들기", "QR maker") + "</a></div></div>";
        document.body.appendChild(modal);
        var close = function () { modal.classList.remove("is-open"); };
        modal.addEventListener("click", function (ev) { if (ev.target === modal || ev.target.closest(".modal-close")) close(); });
        document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
        modal.querySelector("[data-qr-dl]").addEventListener("click", function () {
          WH.downloadCanvas(modal.querySelector("canvas"), "worldhope-qr.png");
        });
      }
      var url = btn.getAttribute("data-qr-url") || WH.pageUrl();
      modal.querySelector(".qr-url").textContent = url;
      modal.classList.add("is-open");
      modal.querySelector(".modal-close").focus();
      WH.loadQR().then(function () { WH.drawQR(modal.querySelector("canvas"), url, { size: 440, logo: true, margin: 2 }); });
    });
  }

  /* ---------------- 스크롤 등장 효과 ---------------- */
  function setupReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
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
    setupReveal();
    setupAnalytics();
    setupVisits();
  }
  // 본문 끝에서 로드되면 즉시 실행(페이지 스크립트가 바로 WH 기능을 쓸 수 있도록)
  if (document.readyState !== "loading" || document.getElementById("site-footer")) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
