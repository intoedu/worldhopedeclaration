/* ==========================================================================
   관리자 페이지 — 서버 없이 GitHub 저장소 파일을 직접 수정하는 콘텐츠 관리
   - 로그인: GitHub Fine-grained 개인 액세스 토큰 (이 저장소 Contents 읽기·쓰기)
   - 저장: GitHub REST API(api.github.com)로 data/*.json · assets/img/uploads/ 에 커밋
     → GitHub Pages 가 자동으로 다시 배포 (약 1~2분 뒤 홈페이지 반영)
   - 화면 목록은 항상 API 에서 최신 파일을 읽어 구성 (배포 전 Pages 사본은 쓰지 않음)
   - 토큰은 api.github.com 으로만 전송하며 화면·콘솔에 출력하지 않습니다.
   - 문의·후원 신청·응원·결제 알림은 이메일(config.email.to)로 도착 — 여기에는 저장되지 않음
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var C = WH.config || window.WH_CONFIG || {};
  var esc = WH.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var GH = C.github || {};
  var OWNER = String(GH.owner || "").trim();
  var REPO = String(GH.repo || "").trim();
  var BRANCH = String(GH.branch || "").trim() || "main";
  var API = "https://api.github.com";
  var TOKEN_KEY = "wh-admin-gh-token";
  var SAVED = "저장했습니다. 보통 1~2분 뒤 홈페이지에 반영됩니다(사진을 여러 장 올린 직후에는 최대 10분).";
  var UPLOADS = "assets/img/uploads/";
  var MAX_EDGE = 2000;                // 사진 긴 변 최대 px
  var JPEG_Q = 0.86;                  // JPEG 품질
  var MAX_BYTES = 10 * 1024 * 1024;   // 줄인 뒤에도 10MB 를 넘으면 올리지 않음
  var MAX_SOURCE = 80 * 1024 * 1024;  // 원본이 이보다 크면 브라우저가 멈출 수 있어 거절
  var MAX_BATCH = 20;                 // 한 번에 올릴 사진 수 (사진 1장 = 커밋 1개)
  var ACCEPT = "image/jpeg,image/png,image/gif,image/webp"; // 올릴 수 있는 사진 형식 (SVG 제외)

  var CAT = { notice: "공지", news: "소식", press: "언론보도" };
  var ALBUM = { events: "행사·모임", ministry: "사역 현장", declaration: "희망선언" };

  var token = "";      // 메모리에만 보관 (화면·콘솔 출력 금지)
  var saving = 0;      // 저장 진행 중 여부
  var written = {};    // 방금 쓴 파일 {path: {prev, sha, text, at}} — API 가 잠깐 이전 내용을 돌려줄 때 대비

  /* ---------------- 작은 도우미 ---------------- */
  function pad(n) { return String(n).padStart(2, "0"); }
  function rand(n) {
    var abc = "0123456789abcdefghijklmnopqrstuvwxyz", buf = new Uint8Array(n), out = "", i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
    else for (i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
    for (i = 0; i < n; i++) out += abc.charAt(buf[i] % 36);
    return out;
  }
  /* yyyymmdd + sep + hhmmss (브라우저 현지 시각) */
  function stamp(d, sep) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + (sep || "") +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function newId(prefix) { return prefix + "-" + stamp(new Date()) + "-" + rand(4); }
  function uploadPath(folder, ext) { return UPLOADS + folder + "/" + stamp(new Date(), "-") + "-" + rand(6) + "." + ext; }
  /* 기존 데이터와 같은 형식: 2026-10-08T09:00:00+09:00 */
  function isoLocal(d) {
    var off = -d.getTimezoneOffset(), a = Math.abs(off);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" +
      pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) +
      (off >= 0 ? "+" : "-") + pad(Math.floor(a / 60)) + ":" + pad(a % 60);
  }
  function inputDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function inputDateTime(d) { return inputDate(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  /* "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:MM" → 현지 시각 Date (날짜만 있으면 정오) */
  function parseInput(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v || "");
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], m[4] == null ? 12 : +m[4], m[5] == null ? 0 : +m[5], 0);
    return isNaN(d) ? null : d;
  }
  function time(d) { var t = new Date(d).getTime(); return isNaN(t) ? 0 : t; }
  function short(s, n) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    n = n || 40;
    return s.length > n ? s.slice(0, n) + "…" : s;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function isPub(x) { return !!x && x.published !== false; }
  function idxOf(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id != null && String(list[i].id) === String(id)) return i;
    return -1;
  }
  function byId(list, id) { var i = idxOf(list, id); return i < 0 ? null : list[i]; }
  function sortPosts(a, b) {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return time(b.created_at) - time(a.created_at);
  }
  function options(map, sel) {
    var keys = Object.keys(map);
    if (sel && !map[sel]) keys.unshift(sel); // 목록에 없는 값도 그대로 보존
    return keys.map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === sel ? " selected" : "") + ">" + esc(map[k] || k) + "</option>";
    }).join("");
  }
  /* 관리자 화면(/admin/)에서 본 이미지 주소 */
  function imgSrc(path) {
    if (!path) return "";
    return /^(https?:|data:)/i.test(path) ? path : "../" + String(path).replace(/^\/+/, "");
  }
  /* 아직 배포 전인 새 사진 미리보기용 (공개 저장소 원본 주소, 토큰 사용 안 함) */
  function rawUrl(path) {
    if (!path || /^(https?:|data:)/i.test(path)) return "";
    return "https://raw.githubusercontent.com/" + encodeURIComponent(OWNER) + "/" + encodeURIComponent(REPO) + "/" +
      encPath(BRANCH) + "/" + encPath(String(path).replace(/^\/+/, ""));
  }
  function maskEmail(addr) {
    var at = addr.indexOf("@");
    var local = addr.slice(0, at), domain = addr.slice(at + 1);
    return local.slice(0, Math.min(2, Math.max(1, local.length - 1))) + "***@" + domain;
  }
  function status(el, type, msg) {
    if (!el) return;
    el.className = "form-status" + (type ? " " + type : "");
    el.textContent = msg || "";
  }

  /* ---------------- 오류 ---------------- */
  function httpError(st, msg, extra) {
    var e = new Error(msg || ("HTTP " + st));
    e.status = st;
    if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }
  /* 화면에 그대로 보여 줄 한국어 오류 (from: 원래 오류의 상태 코드 유지) */
  function userError(msg, from) {
    var e = new Error(msg);
    e.userMsg = msg;
    if (from) { e.status = from.status; e.rateLimited = from.rateLimited; }
    return e;
  }
  function notFound(what) {
    var e = userError(what + " 찾을 수 없습니다. 다른 곳에서 이미 바뀌었을 수 있어 목록을 새로 불러왔습니다.");
    e.refresh = true;
    return e;
  }
  function ghMsg(e) {
    var m = e && e.message;
    return m && !/^HTTP \d+$/.test(m) ? " (GitHub: " + m + ")" : "";
  }
  function errText(e) {
    if (!e) return "처리하지 못했습니다.";
    if (e.userMsg) return e.userMsg;
    var s = e.status;
    if (s === 0) return "GitHub 에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.";
    if (e.rateLimited) {
      var mins = e.reset ? Math.ceil((e.reset * 1000 - Date.now()) / 60000) : Math.ceil((e.retryAfter || 0) / 60);
      return "GitHub 요청 한도를 넘었습니다. " + (mins > 0 ? "약 " + mins + "분 뒤" : "잠시 후") + " 다시 시도해 주세요.";
    }
    if (/protected branch/i.test(e.message || "")) {
      return "‘" + BRANCH + "’ 브랜치에 보호 규칙이 있어 직접 저장할 수 없습니다. 저장소 Settings → Branches(Rules)의 보호 규칙을 확인해 주세요.";
    }
    if (s === 401) return "로그인이 만료되었습니다(토큰 만료 또는 삭제). 새 토큰으로 다시 로그인해 주세요.";
    if (s === 403) return "권한이 없습니다. 토큰의 Repository permissions → Contents 가 ‘Read and write’ 인지 확인해 주세요." + ghMsg(e);
    if (s === 404) return "저장소나 파일을 찾을 수 없습니다." + ghMsg(e);
    if (s === 409) return "다른 곳에서 동시에 수정되어 저장하지 못했습니다. 목록을 새로 불러온 뒤 다시 시도해 주세요." + ghMsg(e);
    if (s === 413) return "파일이 너무 커서 GitHub 가 받지 않았습니다.";
    if (s === 422) return "GitHub 가 저장 요청을 거부했습니다." + ghMsg(e);
    if (s >= 500) return "GitHub 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.";
    return "처리하지 못했습니다." + ghMsg(e);
  }

  /* ---------------- 토큰 보관 (기억하기: localStorage, 아니면 sessionStorage) ---------------- */
  function storage(kind) { try { return window[kind] || null; } catch (e) { return null; } }
  function readToken() {
    var kinds = ["sessionStorage", "localStorage"];
    for (var i = 0; i < kinds.length; i++) {
      try { var s = storage(kinds[i]), v = s && s.getItem(TOKEN_KEY); if (v) return v; } catch (e) {}
    }
    return "";
  }
  function clearToken() {
    ["sessionStorage", "localStorage"].forEach(function (k) {
      try { var s = storage(k); if (s) s.removeItem(TOKEN_KEY); } catch (e) {}
    });
  }
  function saveToken(t, remember) {
    clearToken();
    try { var s = storage(remember ? "localStorage" : "sessionStorage"); if (s) s.setItem(TOKEN_KEY, t); } catch (e) {}
  }

  /* ---------------- GitHub REST API ---------------- */
  function repoUrl(sub) { return "/repos/" + encodeURIComponent(OWNER) + "/" + encodeURIComponent(REPO) + (sub || ""); }
  function encPath(p) { return String(p).split("/").map(encodeURIComponent).join("/"); }
  function contentsUrl(path) { return repoUrl("/contents/" + encPath(path)); }

  /* 모든 요청은 https://api.github.com 으로만 보냄 (path 는 항상 "/..." 상대 경로) */
  function api(method, path, body, accept) {
    if (!token) return Promise.reject(httpError(401, ""));
    var headers = {
      Accept: accept || "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28"
    };
    var init = { method: method, headers: headers, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    return fetch(API + path, init).then(function (r) {
      return r.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) { d = null; }
        if (r.ok) return d;
        var msg = (d && d.message) || "";
        var left = r.headers.get("x-ratelimit-remaining");
        throw httpError(r.status, msg, {
          rateLimited: r.status === 429 || (r.status === 403 && (left === "0" || /rate limit/i.test(msg))),
          reset: Number(r.headers.get("x-ratelimit-reset")) || 0,
          retryAfter: Number(r.headers.get("retry-after")) || 0
        });
      }, function () { throw httpError(0, ""); });
    }, function () { throw httpError(0, ""); });
  }

  /* UTF-8 ↔ base64 */
  function bytesToB64(bytes) {
    var bin = "", step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8ToB64(text) { return bytesToB64(new TextEncoder().encode(text)); }
  function b64ToUtf8(b64) { return new TextDecoder("utf-8").decode(b64ToBytes(b64)); }
  function blobToB64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { var s = String(fr.result || ""); resolve(s.slice(s.indexOf(",") + 1)); };
      fr.onerror = function () { reject(userError("파일을 읽지 못했습니다.")); };
      fr.readAsDataURL(blob);
    });
  }

  /* 파일 읽기 → {sha, text} (mode "text") | {sha, base64} (기본) | {sha} (mode "meta"), 없으면 null */
  function getFile(path, mode) {
    return api("GET", contentsUrl(path) + "?ref=" + encodeURIComponent(BRANCH), undefined, "application/vnd.github.object+json").then(function (d) {
      if (!d || d.type !== "file") throw userError(path + " 은(는) 파일이 아닙니다.");
      if (mode === "meta") return { sha: d.sha };
      var w = written[path];
      if (mode === "text" && w && w.prev && w.sha && w.prev === d.sha && Date.now() - w.at < 120000) {
        return { sha: w.sha, text: w.text }; // 방금 저장한 내용보다 오래된 응답 → 저장한 내용 사용
      }
      var b64 = String(d.content || "").replace(/\s+/g, "");
      // 1MB 초과 파일은 content 가 비어 있음 → Git blob API 로 다시 읽기
      var load = !b64 && d.size > 0
        ? api("GET", repoUrl("/git/blobs/" + encodeURIComponent(d.sha))).then(function (b) { return String((b && b.content) || "").replace(/\s+/g, ""); })
        : Promise.resolve(b64);
      return load.then(function (data) {
        var out = { sha: d.sha };
        if (mode === "text") out.text = b64ToUtf8(data);
        else out.base64 = data;
        return out;
      });
    }, function (e) {
      if (e.status === 404) return null;
      throw e;
    });
  }
  function putFile(path, contentBase64, message, sha) {
    var body = { message: message, content: contentBase64, branch: BRANCH };
    if (sha) body.sha = sha;
    return api("PUT", contentsUrl(path), body);
  }
  function deleteFile(path, sha, message) {
    return api("DELETE", contentsUrl(path), { message: message, sha: sha, branch: BRANCH });
  }
  /* 새 파일 만들기 (일시적 충돌·네트워크 오류 시 한 번 재시도) → 새 파일 sha */
  function createFile(path, b64, message) {
    return putFile(path, b64, message).catch(function (e) {
      if (!(e.status === 0 || e.status === 409 || e.status >= 500)) throw e;
      return wait(2000).then(function () { return putFile(path, b64, message); }).catch(function (e2) {
        if (e2.status !== 422) throw e2;
        // 첫 요청이 실제로는 저장된 경우(응답만 실패) → 파일이 있으면 성공으로 처리
        return getFile(path, "meta").then(function (f) { if (!f) throw e2; return { content: { sha: f.sha } }; });
      });
    }).then(function (res) { return res && res.content ? res.content.sha : null; });
  }

  /* ---------------- data/*.json 읽기·쓰기 ---------------- */
  function dataPath(name) { return "data/" + name + ".json"; }
  function parseList(f, path) {
    if (!f) return [];
    var list;
    try { list = JSON.parse(String(f.text).replace(/^﻿/, "")); } catch (e) {
      throw userError(path + " 파일의 형식(JSON)이 올바르지 않아 작업을 멈췄습니다. 저장소에서 파일을 확인해 주세요.");
    }
    if (!Array.isArray(list)) throw userError(path + " 파일이 목록(배열) 형식이 아닙니다.");
    return list;
  }
  function loadList(name) {
    var path = dataPath(name);
    return getFile(path, "text").then(function (f) { return parseList(f, path); });
  }
  /* 읽기-수정-쓰기: 쓰기 직전에 최신 sha 를 받고, 충돌(409/422)이면 한 번 더 받아 같은 수정을 다시 적용
     mutate(list) → 수정된 배열 (null 이면 바뀐 것 없음 → 저장 생략) */
  function saveList(name, mutate, message) {
    var path = dataPath(name);
    function attempt(retry) {
      return getFile(path, "text").then(function (f) {
        var list = parseList(f, path);
        var next = mutate(list);
        if (next === null) return list;
        if (!Array.isArray(next)) next = list;
        var text = JSON.stringify(next, null, 2) + "\n";
        if (f && f.text === text) return next;
        return putFile(path, utf8ToB64(text), message, f ? f.sha : undefined).then(function (res) {
          written[path] = { prev: f ? f.sha : null, sha: res && res.content ? res.content.sha : null, text: text, at: Date.now() };
          return next;
        });
      }).catch(function (e) {
        if (retry && (e.status === 409 || e.status === 422)) return wait(1200).then(function () { return attempt(false); });
        throw e;
      });
    }
    return attempt(true);
  }
  /* 더 이상 쓰지 않는 업로드 이미지 삭제 (assets/img/uploads/ 아래 + 다른 항목이 쓰지 않을 때만)
     → true(삭제했거나 지울 필요 없음) / false(실패) — 실패해도 오류를 던지지 않음 */
  function removeUnused(path, list, field) {
    path = String(path || "");
    if (path.indexOf(UPLOADS) !== 0) return Promise.resolve(true);
    if (list.some(function (x) { return x && x[field] === path; })) return Promise.resolve(true);
    return getFile(path, "meta").then(function (f) {
      if (!f) return true;
      return deleteFile(path, f.sha, "[관리자] 사용하지 않는 이미지 삭제: " + path.split("/").pop()).then(function () { return true; });
    }).catch(function () { return false; });
  }

  /* ---------------- 사진 준비: 긴 변 2000px JPEG 0.86 (GIF 는 그대로, SVG 는 보안상 받지 않음) ---------------- */
  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(userError("이 형식의 사진은 브라우저에서 열 수 없습니다(HEIC 등). JPG 나 PNG 로 바꿔서 올려 주세요."));
      };
      img.src = url;
    });
  }
  function prepareImage(file) {
    var type = String(file.type || "").toLowerCase(), name = String(file.name || "");
    var isGif = type === "image/gif" || (!type && /\.gif$/i.test(name));
    // SVG 는 스크립트를 담을 수 있어(주소를 직접 열면 이 사이트 권한으로 실행) 올리지 않음
    if (type === "image/svg+xml" || /\.svgz?$/i.test(name)) {
      return Promise.reject(userError("SVG 파일은 보안상 올릴 수 없습니다. PNG 나 JPG 로 바꿔서 올려 주세요."));
    }
    if (isGif) {
      if (file.size > MAX_BYTES) return Promise.reject(userError("파일이 10MB 를 넘어 올릴 수 없습니다."));
      return Promise.resolve({ blob: file, ext: "gif" });
    }
    if (type && type.indexOf("image/") !== 0) return Promise.reject(userError("이미지 파일이 아닙니다."));
    if (file.size > MAX_SOURCE) return Promise.reject(userError("원본 파일이 너무 큽니다(80MB 초과)."));
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) throw userError("사진을 읽지 못했습니다.");
      var k = Math.min(1, MAX_EDGE / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff"; // 투명 PNG → 흰 배경
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, c.width, c.height);
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { if (b) resolve(b); else reject(userError("사진을 변환하지 못했습니다.")); }, "image/jpeg", JPEG_Q);
      });
    }).then(function (blob) {
      if (blob.size > MAX_BYTES) throw userError("줄인 뒤에도 10MB 를 넘어 올릴 수 없습니다.");
      return { blob: blob, ext: "jpg" };
    });
  }

  /* ---------------- 화면 전환 ---------------- */
  function show(id) {
    ["adm-setup", "adm-login", "adm-app"].forEach(function (x) { var el = document.getElementById(x); if (el) el.hidden = x !== id; });
  }
  function loginStatus(type, msg) { status($("#login-status"), type, msg); }

  var panel = $("#adm-panel");
  var current = "";
  var tabs = {};

  function imgFallback(e) {
    var img = e.target;
    if (!img || img.tagName !== "IMG") return;
    var raw = img.getAttribute("data-raw");
    if (raw && !img.hasAttribute("data-fallback")) { img.setAttribute("data-fallback", "1"); img.src = raw; }
  }
  function note(p, msg, isErr) {
    $$(".note", p).forEach(function (n) { n.remove(); });
    var el = document.createElement("p");
    el.className = "notice-box note" + (isErr ? " err" : " blue");
    el.setAttribute("role", isErr ? "alert" : "status");
    el.textContent = msg;
    p.insertBefore(el, p.firstChild);
  }
  /* 탭 열기: 패널을 새로 만들어(cloneNode) 이전 탭의 이벤트 리스너가 쌓이지 않게 함 */
  function openTab(name, msg, isErr) {
    if (!tabs[name]) name = "dash";
    current = name;
    $$(".adm-tabs [data-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-tab") === name)); });
    try { history.replaceState(null, "", "#" + name); } catch (e) {}
    var fresh = panel.cloneNode(false);
    panel.replaceWith(fresh);
    panel = fresh;
    var p = fresh;
    p.addEventListener("error", imgFallback, true);
    p.innerHTML = '<p class="muted">불러오는 중…</p>';
    Promise.resolve().then(function () { return tabs[name](p); }).then(function () {
      if (msg) note(p, msg, isErr);
    }, function (e) {
      if (e && e.status === 401) { expired(); return; }
      p.innerHTML = '<p class="form-status err">불러오지 못했습니다. ' + esc(errText(e)) + "</p>" +
        '<button type="button" class="btn btn-outline btn-sm mt-1" data-retry>다시 시도</button>';
      $("[data-retry]", p).addEventListener("click", function () { openTab(name); });
    });
  }

  /* 저장 공통: 버튼 잠금 → 작업 → 안내 → API 에서 다시 읽어 새로 그림 */
  function lock(p) {
    var els = $$("button, input, select, textarea", p).filter(function (el) { return !el.disabled; });
    els.forEach(function (el) { el.disabled = true; });
    saving++;
    return function () {
      saving = Math.max(0, saving - 1);
      els.forEach(function (el) { el.disabled = false; });
    };
  }
  function fail(e, p, st) {
    if (e && e.status === 401) { expired(); return; }
    var msg = errText(e);
    WH.toast(msg);
    if (st) status(st, "err", msg);
    else if (p) note(p, msg, true);
  }
  /* task() → Promise<추가 안내 문구 | undefined> */
  function save(p, task, st) {
    if (saving) { WH.toast("저장 중입니다. 잠시만 기다려 주세요."); return; }
    var tab = current;
    var unlock = lock(p);
    if (st) status(st, "", "저장 중…");
    Promise.resolve().then(task).then(function (extra) {
      unlock();
      WH.toast(SAVED);
      if (current === tab) openTab(tab, extra || "");
    }, function (e) {
      unlock();
      if (e && e.refresh && current === tab) { WH.toast(errText(e)); openTab(tab, errText(e), true); return; }
      fail(e, p, st);
    });
  }

  /* ---------------- 로그인 ---------------- */
  function verify(t) {
    if (!/^[\x21-\x7e]+$/.test(t)) {
      return Promise.reject(userError("토큰 형식이 올바르지 않습니다. 복사한 토큰 전체를 공백 없이 붙여 넣어 주세요."));
    }
    token = t;
    return api("GET", repoUrl()).then(function (repo) {
      if (!repo || !repo.permissions || repo.permissions.push !== true) {
        throw userError("이 토큰에는 저장소 쓰기 권한이 없습니다. 토큰의 Repository permissions → Contents 를 ‘Read and write’로 설정해 주세요.");
      }
      // 저장할 브랜치 확인 (없으면 저장할 수 없음)
      return api("GET", repoUrl("/branches/" + encPath(BRANCH))).then(function () { return repo; }, function (e) {
        if (e.status === 404) throw userError("저장소에 ‘" + BRANCH + "’ 브랜치가 없습니다. config.js 의 github.branch 를 확인해 주세요.");
        return repo; // 그 밖의 오류는 실제 저장 때 다시 확인
      });
    }).catch(function (e) {
      token = "";
      if (e.userMsg) throw e;
      var full = OWNER + "/" + REPO, msg;
      if (e.status === 0 || e.rateLimited) msg = errText(e);
      else if (e.status === 401) msg = "토큰이 올바르지 않거나 만료되었습니다. 토큰을 다시 복사해 붙여 넣거나, 새 토큰을 만들어 주세요.";
      else if (e.status === 403) msg = "이 토큰으로는 저장소(" + full + ")에 접근할 수 없습니다. 토큰의 Resource owner(" + OWNER + "), 저장소 선택, 권한을 확인해 주세요. 단체(Organization) 저장소라면 조직 관리자의 토큰 승인이 필요할 수 있습니다.";
      else if (e.status === 404) msg = "저장소(" + full + ")를 찾을 수 없습니다. 토큰을 만들 때 Resource owner 를 " + OWNER + " 로, Repository access 를 ‘Only select repositories → " + REPO + "’ 로 골랐는지 확인해 주세요.";
      else msg = errText(e);
      throw userError(msg, e);
    });
  }
  function enter() {
    $("#adm-repo").textContent = "GitHub · " + OWNER + "/" + REPO + " (" + BRANCH + ")";
    $("#adm-user").hidden = false;
    show("adm-app");
    var h = (location.hash || "").replace(/^#/, "");
    openTab(tabs[h] ? h : "dash");
  }
  function logout(msg) {
    token = "";
    written = {};
    clearToken();
    $("#adm-user").hidden = true;
    var fresh = panel.cloneNode(false);
    panel.replaceWith(fresh);
    panel = fresh;
    current = "";
    show("adm-login");
    loginStatus(msg ? "err" : "ok", msg || "로그아웃했습니다. 이 브라우저에 저장된 토큰을 지웠습니다.");
  }
  function expired() {
    logout("로그인이 만료되었습니다(토큰 만료 또는 삭제). 새 토큰으로 다시 로그인해 주세요.");
  }

  /* ---------------- 탭 1: 안내·현황 ---------------- */
  tabs.dash = function (p) {
    return Promise.all([loadList("posts"), loadList("gallery"), loadList("cheers")]).then(function (r) {
      var posts = r[0], gal = r[1], cheers = r[2];
      var A = C.analytics || {}, mail = C.email || {};
      var site = WH.baseUrl();
      var repoWeb = "https://github.com/" + encodeURIComponent(OWNER) + "/" + encodeURIComponent(REPO);
      var samples = gal.filter(function (g) { return g && g.sample; }).length;
      var to = String(mail.to || "").trim(), addr;
      if (!to) addr = '<span class="addr">설정되지 않음</span> — <code>config.js</code> 의 <code>email.to</code> 를 입력해야 접수됩니다.';
      else if (to.indexOf("@") < 0) addr = '<span class="addr">별칭 사용 중</span> (FormSubmit 별칭으로 실제 주소를 숨겨 두었습니다)';
      else addr = '<span class="addr">' + esc(maskEmail(to)) + "</span>";
      var how = mail.service === "mailto"
        ? "현재 방식: 방문자의 메일 앱으로 보내기(mailto)"
        : "현재 방식: FormSubmit 자동 메일 전송 · 처음 접수될 때 이 주소로 오는 ‘Activate(활성화)’ 메일의 버튼을 한 번 눌러야 이후 메일이 도착합니다.";
      var stat = function (label, list, sub) {
        return '<div class="stat"><small>' + label + "</small><b>" + list.filter(isPub).length + "</b><span>" + (sub || "전체 " + list.length + "개 중 게시") + "</span></div>";
      };
      var stats;
      if (A.goatcounter) {
        stats = '<p><a href="https://' + esc(encodeURIComponent(A.goatcounter)) + '.goatcounter.com" target="_blank" rel="noopener">GoatCounter 방문 통계 보기</a></p>' +
          "<p class=\"muted\">일별 방문자·많이 본 페이지·유입 경로를 볼 수 있습니다." + (C.showVisitCounter ? " 홈페이지 하단에 ‘누적 방문자’가 표시됩니다(GoatCounter 설정에서 ‘Allow adding visitor counts’ 필요)." : "") + "</p>";
      } else {
        stats = "<p>아직 방문 통계가 연결되지 않았습니다.</p><ul>" +
          '<li><a href="https://www.goatcounter.com/signup" target="_blank" rel="noopener">GoatCounter</a>(무료)에 가입해 만든 사이트 코드를 <code>config.js</code> 의 <code>analytics.goatcounter</code> 에 넣거나</li>' +
          "<li>Google Analytics 4 측정 ID(G-…)를 <code>analytics.ga4</code> 에 넣으면 집계가 시작됩니다.</li></ul>";
      }
      if (A.ga4) stats += '<p><a href="https://analytics.google.com/" target="_blank" rel="noopener">Google Analytics 보기</a> <span class="muted">(측정 ID ' + esc(A.ga4) + ")</span></p>";

      p.innerHTML =
        "<h2>안내 · 현황</h2>" +
        '<p class="muted">이 관리자 화면은 홈페이지 파일이 있는 GitHub 저장소를 직접 고칩니다. 저장하면 보통 1~2분 뒤 홈페이지에 반영됩니다(사진을 여러 장 올린 직후에는 최대 10분).</p>' +
        '<div class="stat-row">' +
        stat("공지·소식 (게시)", posts) +
        stat("갤러리 사진 (게시)", gal) +
        stat("응원 메시지 (게시)", cheers) +
        '<div class="stat"><small>예시 사진</small><b>' + samples + "</b><span>" + (samples ? "실제 사진으로 바꿔 주세요" : "모두 교체됨") + "</span></div>" +
        "</div>" +
        '<div class="info-grid">' +
        '<div class="info wide"><h3>온라인 접수는 이메일로 도착합니다</h3>' +
        "<p>받는 주소: " + addr + "</p>" +
        "<ul><li>문의·참여 신청 (문의하기)</li><li>정기 후원 신청 (후원·헌금)</li><li>희망 응원 메시지 (홈)</li><li>온라인 후원 결제 알림 (후원·헌금 — 결제 설정 후)</li></ul>" +
        '<p class="muted">' + esc(how) + "</p>" +
        "<p>이 관리자 화면에는 접수 내용이 저장되지 않습니다. 메일을 확인해 회신·처리해 주세요.</p>" +
        "<ul><li>응원 메시지는 게시할 것만 ‘응원 메시지’ 탭에 붙여 넣어 등록하면 홈 화면에 보입니다.</li>" +
        "<li>정기 후원 신청자에게는 전화로 CMS 자동이체 등록을 안내합니다. 계좌번호·주민등록번호는 온라인으로 받지 않습니다.</li>" +
        "<li>개인정보가 담긴 메일은 처리 후 개인정보처리방침의 보유 기간에 맞춰 삭제해 주세요.</li></ul></div>" +
        '<div class="info"><h3>방문 통계</h3>' + stats + "</div>" +
        '<div class="info"><h3>홈페이지 · 저장소</h3>' +
        '<p>홈페이지: <a href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(site) + "</a></p>" +
        '<p>저장 기록: <a href="' + esc(repoWeb + "/commits/" + encPath(BRANCH)) + '" target="_blank" rel="noopener">GitHub 변경 기록</a> <span class="muted">(잘못 저장한 내용은 여기서 되돌릴 수 있습니다)</span></p>' +
        '<p>반영(배포) 상태: <a href="' + esc(repoWeb + "/actions") + '" target="_blank" rel="noopener">GitHub Actions</a></p>' +
        '<p class="muted">로그인이 갑자기 풀리면 토큰이 만료된 것입니다. 새 토큰을 만들어 다시 로그인해 주세요.</p></div>' +
        "</div>";
    });
  };

  /* ---------------- 탭 2: 공지·소식 ---------------- */
  function postRow(x) {
    var id = x.id == null ? "" : String(x.id), pub = isPub(x);
    return "<tr" + (pub ? "" : ' class="is-hidden"') + ">" +
      '<td class="nowrap">' + esc(CAT[x.category] || x.category || "") + "</td>" +
      "<td>" + esc(x.title_ko || x.title_en || "(제목 없음)") + (x.title_ko && x.title_en ? '<br><small class="muted">' + esc(x.title_en) + "</small>" : "") + "</td>" +
      '<td class="nowrap">' + (pub ? '<span class="pill ok">게시</span>' : '<span class="pill">숨김</span>') + "</td>" +
      '<td class="nowrap">' + (x.pinned ? '<span class="pill new">고정</span>' : "") + "</td>" +
      '<td class="nowrap">' + esc(WH.fmtDate(x.created_at)) + "</td>" +
      '<td><div class="act">' + (id
        ? '<button type="button" data-act="edit" data-id="' + esc(id) + '">수정</button>' +
          (pub ? '<a class="mini" href="../post.html?id=' + encodeURIComponent(id) + '" target="_blank" rel="noopener">보기</a>' : "") +
          '<button type="button" class="danger" data-act="del" data-id="' + esc(id) + '">삭제</button>'
        : '<span class="muted">id 없음</span>') + "</div></td></tr>";
  }
  tabs.posts = function (p) {
    return loadList("posts").then(function (list) {
      var rows = list.filter(Boolean).sort(sortPosts);
      p.innerHTML =
        '<div class="adm-head"><div><h2>공지·소식</h2><p class="muted mb-0">글은 한국어만 써도 됩니다. 영어 칸이 비어 있으면 영어 화면에도 한국어가 보입니다. ‘보기’는 홈페이지 반영(보통 1~2분) 뒤에 확인할 수 있습니다. 숨김 글도 공개 저장소 파일(data/posts.json)에는 남아 누구나 볼 수 있으니 공개되면 안 되는 내용은 쓰지 마세요.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="new">새 글 쓰기</button></div>' +
        "<div data-editor></div>" +
        '<div class="tbl-wrap"><table class="adm"><thead><tr><th>분류</th><th>제목</th><th>상태</th><th>고정</th><th>작성일</th><th>관리</th></tr></thead><tbody>' +
        (rows.length ? rows.map(postRow).join("") : '<tr><td colspan="6" class="muted">아직 글이 없습니다.</td></tr>') +
        "</tbody></table></div>";
      p.addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]");
        if (!b || b.disabled) return;
        var act = b.getAttribute("data-act"), id = b.getAttribute("data-id");
        if (act === "new") editPost(p, null);
        else if (act === "edit") editPost(p, byId(rows, id));
        else if (act === "del") deletePost(p, byId(rows, id));
      });
    });
  };

  function editPost(p, post) {
    var isNew = !post;
    var x = post || { category: "notice", published: true, pinned: false };
    var box = $("[data-editor]", p);
    var whenVal = inputDateTime(time(x.created_at) ? new Date(x.created_at) : new Date());
    box.innerHTML =
      '<form class="editor form-grid" novalidate>' +
      "<h3>" + (isNew ? "새 글 쓰기" : "글 수정") + "</h3>" +
      '<div class="field"><label for="pf-cat">분류</label><select id="pf-cat">' + options(CAT, x.category || "notice") + "</select></div>" +
      '<div class="field"><label for="pf-date">작성일</label><input type="datetime-local" id="pf-date" value="' + esc(whenVal) + '"></div>' +
      '<div class="field full"><label for="pf-tko">제목 (한국어) <span class="req">*</span></label><input type="text" id="pf-tko" maxlength="200" value="' + esc(x.title_ko || "") + '"></div>' +
      '<div class="field full"><label for="pf-bko">내용 (한국어)</label><textarea id="pf-bko" style="min-height:220px">' + esc(x.body_ko || "") + "</textarea>" +
      '<p class="hint">빈 줄로 문단을 나눕니다. 링크(https://…)는 자동으로 연결됩니다.</p></div>' +
      '<div class="field full"><label for="pf-ten">제목 (영어, 선택)</label><input type="text" id="pf-ten" maxlength="300" value="' + esc(x.title_en || "") + '"></div>' +
      '<div class="field full"><label for="pf-ben">내용 (영어, 선택)</label><textarea id="pf-ben">' + esc(x.body_en || "") + "</textarea></div>" +
      '<div class="field full"><label for="pf-cover">대표 이미지 (선택)</label><input type="file" id="pf-cover" accept="' + ACCEPT + '">' +
      '<p class="hint">큰 사진은 긴 변 2000px JPG 로 줄여서 올립니다. 새 이미지를 고르면 기존 이미지를 바꿉니다.</p>' +
      (x.cover_url ? '<div class="cover-now"><img src="' + esc(imgSrc(x.cover_url)) + '" data-raw="' + esc(rawUrl(x.cover_url)) + '" alt="현재 대표 이미지">' +
        '<label class="check"><input type="checkbox" id="pf-cover-rm"> 이미지 빼기</label></div>' : "") +
      "</div>" +
      '<div class="field"><label class="check"><input type="checkbox" id="pf-pub"' + (isPub(x) ? " checked" : "") + "> 홈페이지에 게시</label></div>" +
      '<div class="field"><label class="check"><input type="checkbox" id="pf-pin"' + (x.pinned ? " checked" : "") + "> 목록 맨 위 고정</label></div>" +
      '<div class="full form-actions"><button type="submit" class="btn btn-primary btn-sm">' + (isNew ? "등록" : "수정 저장") + "</button>" +
      '<button type="button" class="btn btn-outline btn-sm" data-cancel>취소</button><span class="form-status" data-status></span></div>' +
      "</form>";
    var form = $("form", box), st = $("[data-status]", form);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    $("[data-cancel]", form).addEventListener("click", function () { box.innerHTML = ""; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var title = $("#pf-tko", form).value.trim();
      if (!title) { status(st, "err", "제목(한국어)을 입력해 주세요."); $("#pf-tko", form).focus(); return; }
      var dv = $("#pf-date", form).value, created;
      if (!isNew && x.created_at && dv === whenVal) created = x.created_at; // 바꾸지 않았으면 원래 값 유지
      else created = isoLocal(parseInput(dv) || new Date());
      var fields = {
        category: $("#pf-cat", form).value,
        pinned: $("#pf-pin", form).checked,
        published: $("#pf-pub", form).checked,
        created_at: created,
        title_ko: title,
        title_en: $("#pf-ten", form).value.trim(),
        body_ko: $("#pf-bko", form).value.replace(/\s+$/, ""),
        body_en: $("#pf-ben", form).value.replace(/\s+$/, "")
      };
      var file = $("#pf-cover", form).files[0];
      var rm = $("#pf-cover-rm", form), removeCover = !!(rm && rm.checked);
      var id = isNew ? newId("p") : x.id;
      var msg = (isNew ? "[관리자] 새 글: " : "[관리자] 글 수정: ") + short(title);

      save(p, function () {
        var uploaded = null, oldCover = "";
        var step = !file ? Promise.resolve() : prepareImage(file).then(function (img) {
          status(st, "", "대표 이미지 올리는 중…");
          var path = uploadPath("posts", img.ext);
          return blobToB64(img.blob).then(function (b64) {
            return createFile(path, b64, "[관리자] 대표 이미지 올리기");
          }).then(function (sha) { uploaded = { path: path, sha: sha }; });
        });
        return step.then(function () {
          status(st, "", "저장 중…");
          return saveList("posts", function (list) {
            if (isNew) {
              var entry = { id: id };
              Object.keys(fields).forEach(function (k) { entry[k] = fields[k]; });
              if (uploaded) entry.cover_url = uploaded.path;
              list.unshift(entry);
              return list;
            }
            var i = idxOf(list, id);
            if (i < 0) throw notFound("이 글을");
            oldCover = list[i].cover_url || "";
            var next = Object.assign({}, list[i], fields);
            if (uploaded) next.cover_url = uploaded.path;
            else if (removeCover) delete next.cover_url;
            list[i] = next;
            return list;
          }, msg).then(function (list) {
            if (oldCover && (uploaded || removeCover)) return removeUnused(oldCover, list, "cover_url").then(function () {});
          }, function (err) {
            // 글 저장에 실패하면 방금 올린 이미지를 정리 (정리 실패는 무시)
            if (!uploaded || !uploaded.sha) throw err;
            return deleteFile(uploaded.path, uploaded.sha, "[관리자] 저장하지 못한 대표 이미지 정리").then(function () { throw err; }, function () { throw err; });
          });
        });
      }, st);
    });
  }

  function deletePost(p, x) {
    if (!x) return;
    if (!confirm("‘" + short(x.title_ko || x.title_en || "(제목 없음)", 60) + "’ 글을 삭제할까요?")) return;
    save(p, function () {
      var cover = "";
      return saveList("posts", function (list) {
        var i = idxOf(list, x.id);
        if (i < 0) throw notFound("이 글을");
        cover = list[i].cover_url || "";
        list.splice(i, 1);
        return list;
      }, "[관리자] 글 삭제: " + short(x.title_ko || x.title_en)).then(function (list) {
        if (cover) return removeUnused(cover, list, "cover_url").then(function () {});
      });
    });
  }

  /* ---------------- 탭 3: 갤러리 ---------------- */
  function galItem(g) {
    var id = g.id == null ? "" : String(g.id), pub = isPub(g), sort = Number(g.sort) || 0;
    return "<figure" + (pub ? "" : ' class="is-hidden"') + ">" +
      '<img src="' + esc(imgSrc(g.image_url)) + '" data-raw="' + esc(rawUrl(g.image_url)) + '" alt="" loading="lazy">' +
      "<figcaption><b>" + esc(g.title_ko || g.title_en || "(제목 없음)") + "</b>" +
      '<span class="tags"><span class="muted">' + esc(ALBUM[g.album] || g.album || "") + "</span>" +
      (g.sample ? '<span class="pill new">예시</span>' : "") + (pub ? "" : '<span class="pill">숨김</span>') + "</span>" +
      (id
        ? '<label class="sort">순서 <input type="number" step="1" inputmode="numeric" value="' + sort + '" data-sort="' + esc(id) + '" data-orig="' + sort + '"></label>' +
          '<div class="act"><button type="button" data-act="edit" data-id="' + esc(id) + '">수정</button>' +
          '<button type="button" data-act="pub" data-id="' + esc(id) + '">' + (pub ? "숨기기" : "게시") + "</button>" +
          '<button type="button" class="danger" data-act="del" data-id="' + esc(id) + '">삭제</button></div>'
        : '<span class="muted">id 없음</span>') +
      "</figcaption></figure>";
  }
  tabs.gallery = function (p) {
    return loadList("gallery").then(function (list) {
      // 홈페이지와 같은 순서: sort 오름차순, 같으면 파일 안의 순서
      var rows = list.filter(Boolean).map(function (g, i) { return { g: g, i: i }; })
        .sort(function (a, b) { return (Number(a.g.sort) || 0) - (Number(b.g.sort) || 0) || a.i - b.i; })
        .map(function (x) { return x.g; });
      var samples = rows.filter(function (g) { return g.sample; }).length;
      p.innerHTML =
        "<h2>갤러리</h2>" +
        '<p class="muted">여러 장을 한 번에 올릴 수 있습니다(최대 ' + MAX_BATCH + "장). 사진은 긴 변 2000px JPG 로 줄여서 올립니다. ‘순서’ 숫자가 작을수록 앞에 보이고, 같으면 최근에 올린 사진이 앞에 옵니다. ‘숨기기’는 홈페이지 화면에서만 감출 뿐 사진 파일과 정보는 공개 저장소에 남으므로, 사진 속 인물의 삭제 요청 등은 ‘삭제’로 처리해 주세요.</p>" +
        '<form class="editor form-grid" data-upload novalidate>' +
        "<h3>사진 올리기</h3>" +
        '<div class="field"><label for="gf-album">앨범</label><select id="gf-album">' + options(ALBUM, "events") + "</select></div>" +
        '<div class="field"><label for="gf-files">사진 선택 <span class="req">*</span></label><input type="file" id="gf-files" accept="' + ACCEPT + '" multiple></div>' +
        '<div class="field"><label for="gf-tko">사진 제목 (한국어, 선택)</label><input type="text" id="gf-tko" maxlength="200" placeholder="예) 2026 희망선언 준비 모임"></div>' +
        '<div class="field"><label for="gf-ten">사진 제목 (영어, 선택)</label><input type="text" id="gf-ten" maxlength="300"></div>' +
        '<div class="full form-actions"><button type="submit" class="btn btn-primary btn-sm">올리기</button><span class="form-status" data-status></span></div>' +
        "</form>" +
        "<div data-editor></div>" +
        '<div class="adm-head"><div><h3>사진 목록</h3><p class="muted mb-0" style="font-size:13.5px">전체 ' + rows.length + "장 · 게시 " + rows.filter(isPub).length + "장" +
        (samples ? " · 예시 " + samples + "장 (실제 사진을 올린 뒤 삭제해 주세요)" : "") + "</p></div>" +
        '<button type="button" class="btn btn-primary btn-sm" data-act="sort-save" disabled>순서 저장</button></div>' +
        '<div class="gal-admin">' + (rows.length ? rows.map(galItem).join("") : '<p class="muted">아직 사진이 없습니다.</p>') + "</div>";

      var up = $("[data-upload]", p), ust = $("[data-status]", up), sortBtn = $('[data-act="sort-save"]', p);
      up.addEventListener("submit", function (e) {
        e.preventDefault();
        var files = Array.prototype.slice.call($("#gf-files", up).files || []);
        if (!files.length) { status(ust, "err", "올릴 사진을 선택해 주세요."); return; }
        if (files.length > MAX_BATCH) { status(ust, "err", "한 번에 " + MAX_BATCH + "장까지 올릴 수 있습니다. 나눠서 올려 주세요."); return; }
        var meta = { album: $("#gf-album", up).value, title_ko: $("#gf-tko", up).value.trim(), title_en: $("#gf-ten", up).value.trim() };
        save(p, function () { return uploadGallery(files, meta, ust); }, ust);
      });

      // 순서: 바꾼 칸을 모아 한 번에 저장 (커밋 1개)
      function dirtySorts() {
        var map = {}, n = 0;
        $$("[data-sort]", p).forEach(function (inp) {
          var v = parseInt(inp.value, 10);
          if (isNaN(v)) v = 0;
          var changed = String(v) !== inp.getAttribute("data-orig");
          inp.classList.toggle("dirty", changed);
          if (changed) { map[inp.getAttribute("data-sort")] = v; n++; }
        });
        return { map: map, n: n };
      }
      p.addEventListener("input", function (e) {
        if (!e.target.closest("[data-sort]")) return;
        var d = dirtySorts();
        sortBtn.disabled = !d.n;
        sortBtn.textContent = d.n ? "순서 저장 (" + d.n + ")" : "순서 저장";
      });

      p.addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]");
        if (!b || b.disabled) return;
        var act = b.getAttribute("data-act"), id = b.getAttribute("data-id"), g = id == null ? null : byId(rows, id);
        if (act === "sort-save") {
          var d = dirtySorts();
          if (!d.n) return;
          save(p, function () {
            return saveList("gallery", function (l) {
              var changed = false;
              l.forEach(function (x) {
                if (x && x.id != null && Object.prototype.hasOwnProperty.call(d.map, String(x.id))) { x.sort = d.map[String(x.id)]; changed = true; }
              });
              return changed ? l : null;
            }, "[관리자] 갤러리 순서 변경 (" + d.n + "장)");
          });
        } else if (act === "edit" && g) {
          editGallery(p, g);
        } else if (act === "pub" && g) {
          var target = !isPub(g);
          save(p, function () {
            return saveList("gallery", function (l) {
              var i = idxOf(l, g.id);
              if (i < 0) throw notFound("이 사진을");
              l[i].published = target;
              return l;
            }, "[관리자] 갤러리 사진 " + (target ? "게시" : "숨김") + ": " + short(g.title_ko || g.image_url));
          });
        } else if (act === "del" && g) {
          if (!confirm("이 사진을 삭제할까요?" + (g.sample ? " (예시 사진 — 목록에서만 빠집니다)" : ""))) return;
          save(p, function () {
            var path = "";
            return saveList("gallery", function (l) {
              var i = idxOf(l, g.id);
              if (i < 0) throw notFound("이 사진을");
              path = l[i].image_url || "";
              l.splice(i, 1);
              return l;
            }, "[관리자] 갤러리 사진 삭제: " + short(g.title_ko || g.image_url)).then(function (l) {
              // 업로드한 파일(assets/img/uploads/…)만 지움 — 목록에서는 항상 삭제
              return removeUnused(path, l, "image_url").then(function (ok) {
                if (!ok) return "목록에서는 삭제했지만 사진 파일(" + path + ")은 지우지 못했습니다. 홈페이지에는 보이지 않으니 그대로 두셔도 됩니다.";
              });
            });
          });
        }
      });
    });
  };

  /* 사진 여러 장: 한 장씩 준비·업로드 → 마지막에 data/gallery.json 한 번만 저장 */
  function uploadGallery(files, meta, st) {
    var done = [], skipped = [], stopped = null, n = files.length;
    return files.reduce(function (chain, f, i) {
      return chain.then(function () {
        if (stopped) return;
        var label = "(" + (i + 1) + "/" + n + ")";
        status(st, "", "사진 준비 중… " + label);
        return prepareImage(f).then(function (img) {
          status(st, "", "올리는 중… " + label);
          var path = uploadPath("gallery", img.ext);
          return blobToB64(img.blob).then(function (b64) {
            return createFile(path, b64, "[관리자] 갤러리 사진 올리기 " + label);
          }).then(function (sha) { done.push({ path: path, sha: sha }); });
        }).catch(function (e) {
          if (e && e.userMsg && e.status == null) { skipped.push((f.name || "사진 " + (i + 1)) + " — " + e.userMsg); return; }
          stopped = e; // GitHub 오류 → 남은 사진은 올리지 않음
        });
      });
    }, Promise.resolve()).then(function () {
      if (!done.length) {
        if (stopped) throw stopped;
        throw userError("올릴 수 있는 사진이 없습니다. " + skipped.join(" / "));
      }
      status(st, "", "사진 목록 저장 중…");
      var entries = done.map(function (u) {
        return { id: "", album: meta.album, image_url: u.path, title_ko: meta.title_ko, title_en: meta.title_en, sort: 0, published: true };
      });
      return saveList("gallery", function (list) {
        entries.forEach(function (en) {
          do { en.id = newId("g"); } while (idxOf(list, en.id) >= 0 || entries.filter(function (o) { return o.id === en.id; }).length > 1);
        });
        return entries.concat(list); // 새 사진이 앞에
      }, "[관리자] 갤러리 사진 " + entries.length + "장 추가").catch(function (err) {
        // 목록 저장 실패 → 방금 올린 파일 정리 (정리 실패는 무시)
        return done.reduce(function (c, u) {
          return c.then(function () { if (u.sha) return deleteFile(u.path, u.sha, "[관리자] 저장하지 못한 사진 정리").catch(function () {}); });
        }, Promise.resolve()).then(function () { throw err; });
      }).then(function () {
        var out = [done.length + "장을 올렸습니다."];
        if (skipped.length) out.push("제외한 사진: " + skipped.join(" / "));
        if (stopped) out.push((n - done.length - skipped.length) + "장은 올리지 못했습니다 — " + errText(stopped) + " 남은 사진을 다시 올려 주세요.");
        return out.join(" ");
      });
    });
  }

  function editGallery(p, g) {
    var box = $("[data-editor]", p);
    box.innerHTML =
      '<form class="editor form-grid" novalidate>' +
      "<h3>사진 정보 수정</h3>" +
      '<div class="field"><label for="ge-album">앨범</label><select id="ge-album">' + options(ALBUM, g.album || "events") + "</select></div>" +
      '<div class="field"><label>사진</label><span class="muted" style="font-size:13.5px;word-break:break-all">' + esc(g.image_url || "") + "</span></div>" +
      '<div class="field"><label for="ge-tko">사진 제목 (한국어)</label><input type="text" id="ge-tko" maxlength="200" value="' + esc(g.title_ko || "") + '"></div>' +
      '<div class="field"><label for="ge-ten">사진 제목 (영어, 선택)</label><input type="text" id="ge-ten" maxlength="300" value="' + esc(g.title_en || "") + '"></div>' +
      '<div class="full form-actions"><button type="submit" class="btn btn-primary btn-sm">수정 저장</button>' +
      '<button type="button" class="btn btn-outline btn-sm" data-cancel>취소</button><span class="form-status" data-status></span></div>' +
      "</form>";
    var form = $("form", box), st = $("[data-status]", form);
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    $("[data-cancel]", form).addEventListener("click", function () { box.innerHTML = ""; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = { album: $("#ge-album", form).value, title_ko: $("#ge-tko", form).value.trim(), title_en: $("#ge-ten", form).value.trim() };
      save(p, function () {
        return saveList("gallery", function (l) {
          var i = idxOf(l, g.id);
          if (i < 0) throw notFound("이 사진을");
          Object.assign(l[i], fields);
          return l;
        }, "[관리자] 갤러리 사진 정보 수정: " + short(fields.title_ko || g.image_url));
      }, st);
    });
  }

  /* ---------------- 탭 4: 응원 메시지 ---------------- */
  function cheerRow(c) {
    var id = c.id == null ? "" : String(c.id), pub = isPub(c);
    return "<tr" + (pub ? "" : ' class="is-hidden"') + ">" +
      "<td>" + (pub ? '<span class="pill ok">게시</span>' : '<span class="pill">숨김</span>') + "</td>" +
      '<td class="nowrap">' + esc(c.name || "") + "</td>" +
      "<td>" + esc(c.region || "") + "</td>" +
      '<td class="msg">' + esc(c.message || "") + "</td>" +
      '<td class="nowrap">' + esc(WH.fmtDate(c.created_at)) + "</td>" +
      '<td><div class="act">' + (id
        ? '<button type="button" data-act="pub" data-id="' + esc(id) + '">' + (pub ? "숨기기" : "게시") + "</button>" +
          '<button type="button" class="danger" data-act="del" data-id="' + esc(id) + '">삭제</button>'
        : '<span class="muted">id 없음</span>') + "</div></td></tr>";
  }
  tabs.cheers = function (p) {
    return loadList("cheers").then(function (list) {
      var rows = list.filter(Boolean).sort(function (a, b) { return time(b.created_at) - time(a.created_at); });
      var today = inputDate(new Date());
      p.innerHTML =
        "<h2>응원 메시지</h2>" +
        '<p class="muted">홈페이지에서 남긴 ‘희망 응원 메시지’는 담당자 이메일로 도착합니다. 게시할 메시지만 아래에 붙여 넣어 등록하세요(등록하면 바로 게시됩니다). ‘게시’ 상태인 메시지 중 최근 6개가 홈 화면에 보입니다.</p>' +
        '<p class="notice-box" style="margin:0 0 22px">등록한 메시지는 공개 저장소의 <code>data/cheers.json</code> 파일에 저장되어 누구나 볼 수 있습니다. ‘숨기기’는 홈페이지 화면에서만 감출 뿐 파일에는 그대로 남습니다. <b>게시 철회·삭제 요청을 받으면 반드시 ‘삭제’를 누르고</b>, 변경 이력에 남은 이전 기록도 정리해 주세요(README ‘게시 철회·삭제 요청 처리’).</p>' +
        '<form class="editor form-grid" data-add novalidate>' +
        "<h3>메시지 등록</h3>" +
        '<div class="field"><label for="cf-name">이름(닉네임) <span class="req">*</span></label><input type="text" id="cf-name" maxlength="20"></div>' +
        '<div class="field"><label for="cf-region">지역</label><input type="text" id="cf-region" maxlength="20" placeholder="예) 세종"></div>' +
        '<div class="field full"><label for="cf-msg">메시지 <span class="req">*</span></label><textarea id="cf-msg" maxlength="300" style="min-height:110px"></textarea>' +
        '<p class="hint"><span class="counter" data-counter>0</span>/300자</p></div>' +
        '<div class="field"><label for="cf-date">날짜</label><input type="date" id="cf-date" value="' + today + '"></div>' +
        '<div class="full form-actions"><button type="submit" class="btn btn-primary btn-sm">등록</button><span class="form-status" data-status></span></div>' +
        "</form>" +
        '<div class="tbl-wrap"><table class="adm"><thead><tr><th>상태</th><th>이름</th><th>지역</th><th>메시지</th><th>날짜</th><th>관리</th></tr></thead><tbody>' +
        (rows.length ? rows.map(cheerRow).join("") : '<tr><td colspan="6" class="muted">아직 등록된 메시지가 없습니다.</td></tr>') +
        "</tbody></table></div>";

      var form = $("[data-add]", p), st = $("[data-status]", form), msgEl = $("#cf-msg", form), counter = $("[data-counter]", form);
      msgEl.addEventListener("input", function () { counter.textContent = msgEl.value.length; });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = $("#cf-name", form).value.trim(), message = msgEl.value.trim().slice(0, 300);
        if (!name) { status(st, "err", "이름(닉네임)을 입력해 주세요."); $("#cf-name", form).focus(); return; }
        if (!message) { status(st, "err", "메시지를 입력해 주세요."); msgEl.focus(); return; }
        var dv = $("#cf-date", form).value;
        var entry = {
          id: newId("c"),
          name: name,
          region: $("#cf-region", form).value.trim(),
          message: message,
          created_at: isoLocal(!dv || dv === today ? new Date() : (parseInput(dv) || new Date())),
          published: true
        };
        save(p, function () {
          return saveList("cheers", function (l) {
            while (idxOf(l, entry.id) >= 0) entry.id = newId("c");
            l.unshift(entry);
            return l;
          }, "[관리자] 응원 메시지 등록 (" + entry.id + ")"); // 커밋 메시지는 공개되므로 이름 등 개인정보를 넣지 않음
        }, st);
      });

      p.addEventListener("click", function (e) {
        var b = e.target.closest("[data-act]");
        if (!b || b.disabled) return;
        var act = b.getAttribute("data-act"), c = byId(rows, b.getAttribute("data-id"));
        if (!c) return;
        if (act === "pub") {
          var target = !isPub(c);
          if (!target && !confirm("‘숨기기’는 홈페이지 화면에서만 감춥니다. 내용은 공개 저장소 파일(data/cheers.json)에 남아 누구나 볼 수 있습니다.\n게시 철회·삭제 요청이라면 ‘취소’를 누르고 ‘삭제’를 사용하세요.\n\n그래도 숨길까요?")) return;
          save(p, function () {
            return saveList("cheers", function (l) {
              var i = idxOf(l, c.id);
              if (i < 0) throw notFound("이 메시지를");
              l[i].published = target;
              return l;
            }, "[관리자] 응원 메시지 " + (target ? "게시" : "숨김") + " (" + c.id + ")");
          });
        } else if (act === "del") {
          if (!confirm("‘" + short(c.message, 30) + "’ 메시지를 삭제할까요?")) return;
          save(p, function () {
            return saveList("cheers", function (l) {
              var i = idxOf(l, c.id);
              if (i < 0) throw notFound("이 메시지를");
              l.splice(i, 1);
              return l;
            }, "[관리자] 응원 메시지 삭제 (" + c.id + ")").then(function () {
              return "삭제했습니다. 게시 철회·삭제 요청에 따른 것이라면 공개 저장소의 변경 이력에 남은 이전 기록도 정리해 주세요(README ‘게시 철회·삭제 요청 처리’).";
            });
          });
        }
      });
    });
  };

  /* ---------------- 시작 ---------------- */
  function boot() {
    // 관리자 화면은 한국어 전용 (공개 화면의 언어 선택은 건드리지 않음)
    // main.js 초기화(DOMContentLoaded)가 저장된 언어(en)를 적용하면 wh:lang 이벤트에서 다시 한국어로 고정
    // (WH.setLang 을 부르면 저장된 언어가 바뀌고 이벤트가 반복되므로 속성만 직접 설정)
    var forceKo = function () {
      document.documentElement.setAttribute("data-lang", "ko");
      document.documentElement.lang = "ko";
    };
    forceKo();
    document.addEventListener("wh:lang", forceKo);
    $$("[data-gh]").forEach(function (el) {
      var k = el.getAttribute("data-gh");
      el.textContent = k === "owner" ? OWNER : k === "repo" ? REPO : OWNER + "/" + REPO;
    });
    if (!OWNER || !REPO) { show("adm-setup"); return; }

    var form = $("#login-form"), btn = $('[type="submit"]', form), input = $("#l-token");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = input.value.trim();
      if (!t) { loginStatus("err", "토큰을 붙여 넣어 주세요."); input.focus(); return; }
      btn.disabled = true;
      loginStatus("", "확인 중…");
      verify(t).then(function () {
        saveToken(t, $("#l-remember").checked);
        input.value = "";
        loginStatus("", "");
        enter();
      }, function (err) {
        loginStatus("err", errText(err));
      }).then(function () { btn.disabled = false; });
    });
    $("#adm-logout").addEventListener("click", function () {
      if (saving && !confirm("저장 중입니다. 그래도 로그아웃할까요?")) return;
      logout("");
    });
    $$(".adm-tabs [data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { openTab(b.getAttribute("data-tab")); });
    });
    window.addEventListener("beforeunload", function (e) {
      if (saving) { e.preventDefault(); e.returnValue = ""; }
    });

    var saved = readToken();
    show("adm-login");
    if (!saved) { $("#howto").open = true; return; }
    btn.disabled = true;
    loginStatus("", "저장된 로그인 정보를 확인하는 중…");
    verify(saved).then(function () {
      loginStatus("", "");
      enter();
    }, function (err) {
      var temporary = err.status === 0 || err.rateLimited || err.status >= 500;
      if (!temporary) clearToken(); // 토큰 문제 → 지움 / 일시적 문제 → 유지(새로고침 시 재시도)
      loginStatus("err", errText(err) + (temporary ? " 잠시 뒤 새로고침하면 다시 확인합니다." : ""));
    }).then(function () { btn.disabled = false; });
  }

  boot();
})();
