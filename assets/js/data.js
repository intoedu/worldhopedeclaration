/* ==========================================================================
   데이터 계층 (서버 없음)
   - 게시판·갤러리·응원 메시지: 저장소의 /data/*.json 파일을 읽어 화면 구성
     (관리자 페이지 /admin/ 에서 GitHub 저장소 파일을 직접 수정 → 자동 재배포)
   - 온라인 접수(문의·후원 신청·응원·결제 알림): 이메일 전송 (FormSubmit)
   ========================================================================== */
(function () {
  "use strict";
  var C = window.WH_CONFIG || {};
  var script = document.currentScript;
  var ROOT = script ? new URL("../../", script.src).href : location.origin + "/";
  var WH = (window.WH = window.WH || {});
  var jsonCache = {};

  function json(name) {
    if (!jsonCache[name]) {
      jsonCache[name] = fetch(ROOT + "data/" + name + ".json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .catch(function () { return []; });
    }
    return jsonCache[name];
  }
  function sortPosts(a, b) {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return new Date(b.created_at) - new Date(a.created_at);
  }
  function abs(url) {
    if (!url) return "";
    return /^(https?:|data:)/.test(url) ? url : ROOT + url.replace(/^\/+/, "");
  }
  function published(list) { return list.filter(function (x) { return x.published !== false; }); }

  WH.db = {
    abs: abs,
    json: json,

    /* 게시판 목록: {category, q, page(1~), size} → {items, total} */
    listPosts: function (opt) {
      opt = opt || {};
      var page = Math.max(1, opt.page || 1), size = opt.size || 10;
      return json("posts").then(function (rows) {
        var list = published(rows);
        if (opt.category) list = list.filter(function (p) { return p.category === opt.category; });
        if (opt.q) {
          var t = opt.q.toLowerCase();
          list = list.filter(function (p) {
            return [p.title_ko, p.title_en, p.body_ko, p.body_en].join(" ").toLowerCase().indexOf(t) !== -1;
          });
        }
        list.sort(sortPosts);
        return { items: list.slice((page - 1) * size, page * size), total: list.length };
      });
    },

    /* 게시글 1건 + 이전/다음 글 (작성일 기준) */
    getPost: function (id) {
      return json("posts").then(function (rows) {
        var list = published(rows).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        var i = list.findIndex(function (p) { return String(p.id) === String(id); });
        if (i === -1) return { post: null };
        var post = Object.assign({}, list[i], { cover_url: abs(list[i].cover_url) });
        return { post: post, prev: list[i + 1], next: list[i - 1] };
      });
    },

    /* 갤러리: {album, limit} — sort 오름차순, 같으면 최신순 */
    listGallery: function (opt) {
      opt = opt || {};
      return json("gallery").then(function (rows) {
        var list = published(rows)
          .filter(function (g) { return !opt.album || g.album === opt.album; })
          .map(function (g, i) { return Object.assign({ _i: i }, g, { image_url: abs(g.image_url) }); })
          .sort(function (a, b) { return (a.sort || 0) - (b.sort || 0) || a._i - b._i; });
        return opt.limit ? list.slice(0, opt.limit) : list;
      });
    },

    /* 게시된 응원 메시지 (최신순) */
    listCheers: function (limit) {
      return json("cheers").then(function (rows) {
        var list = published(rows).sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        return limit ? list.slice(0, limit) : list;
      });
    }
  };

  /* 갤러리에 실제 사진(견본 sample 이 아닌 것)이 있으면 <html data-gallery-ready> 를 붙임
     → 그때만 메뉴·버튼의 갤러리 링크(.js-gallery-link)가 보임 (style.css). 견본뿐이면 처음부터 숨긴 채 그대로 */
  if (!/\/admin\//.test(location.pathname)) {
    json("gallery").then(function (rows) {
      var list = published(Array.isArray(rows) ? rows : []);
      var empty = !list.length || list.every(function (g) { return g.sample === true; });
      if (empty) document.documentElement.removeAttribute("data-gallery-ready");
      else document.documentElement.setAttribute("data-gallery-ready", "");
    });
  }

  /* ---------------- 이메일 전송 ----------------
     WH.mail.send({ subject, rows: [[항목명, 값], ...], replyTo })
     → Promise<{ok:true, via:"formsubmit"} | {ok:true, via:"gmail"}>
     FormSubmit 실패(네트워크 차단·미활성화·응답 지연 등) 시 reject → 호출 측에서 Gmail 로 보내기 안내 */
  var mailCfg = C.email || {};
  var SEND_TIMEOUT = 12000; // FormSubmit 응답을 기다리는 최대 시간(ms) — 넘으면 실패로 보고 대체 경로 안내
  /* Gmail 작성 창 주소가 이보다 길면 Google 이 거절함 (2026-10-16 확인: 약 5,500자 정상,
     약 7,300자부터 로그인 전 단계에서 400 오류) → 여유를 두고 5,000자 안으로 본문을 줄임 */
  var GMAIL_MAX = 5000;
  /* Gmail 로 보낼 받는 주소: email.to 가 이메일 주소면 그대로, 별칭이면 publicEmail, 둘 다 없으면 "" */
  function mailRecipient() {
    if (/@/.test(mailCfg.to || "")) return mailCfg.to;
    if (/@/.test(C.publicEmail || "")) return C.publicEmail;
    return "";
  }
  /* Gmail 작성 창(웹) 주소 — 받는 사람·제목·본문이 채워진 채 열림. 로그인 전이면 Google 로그인 뒤 같은 창으로 이어짐 */
  function gmailHref(to, subject, body) {
    var q = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(to || "");
    if (subject) q += "&su=" + encodeURIComponent(subject);
    if (body) q += "&body=" + encodeURIComponent(body);
    return q;
  }
  WH.mail = {
    enabled: !!mailCfg.to,
    // "gmail"(예전 값 "mailto" 도 같음): 자동 전송 없이 방문자가 Gmail 로 직접 보내도록 안내
    service: mailCfg.service === "mailto" ? "gmail" : (mailCfg.service || "formsubmit"),
    recipient: mailRecipient,
    gmailHref: gmailHref,
    /* 메일 본문(일반 글) — ‘내용 복사하기’와 Gmail 본문에 같이 씀 */
    bodyText: function (rows) {
      return rows.filter(function (r) { return r[1] != null && r[1] !== ""; })
        .map(function (r) { return "■ " + r[0] + "\n" + r[1]; }).join("\n\n");
    },
    /* 접수 내용을 채운 Gmail 작성 창 주소. 받는 주소가 없으면 "" (호출 측에서 전화 안내).
       너무 길면 본문을 줄이고 안내 문구를 붙임 (전체는 ‘내용 복사하기’로) */
    composeHref: function (subject, rows) {
      var to = mailRecipient();
      if (!to) return "";
      var body = WH.mail.bodyText(rows);
      if (gmailHref(to, subject, body).length > GMAIL_MAX) {
        var note = "\n\n" + WH.t("(내용이 길어 일부만 담겼습니다. 홈페이지의 ‘내용 복사하기’로 전체를 붙여 넣어 주세요.)",
          "(Shortened because it is long. Use “Copy details” on the website to paste the full text.)");
        // 잘린 자리에 짝 없는 서로게이트(이모지 반쪽)가 남으면 주소 만들기에서 오류가 나므로 함께 제거
        while (body.length && gmailHref(to, subject, body + note).length > GMAIL_MAX) body = body.slice(0, -20).replace(/[\uD800-\uDBFF]$/, "");
        body += note;
      }
      return gmailHref(to, subject, body);
    },
    send: function (msg) {
      if (!mailCfg.to) return Promise.reject(new Error("email-not-configured"));
      if (WH.mail.service === "gmail") {
        // 받는 주소가 없으면 접수가 사라지므로 실패로 처리 (호출 측에서 전화 안내)
        if (!mailRecipient()) return Promise.reject(new Error("gmail-no-recipient"));
        return Promise.resolve({ ok: true, via: "gmail" });
      }
      var payload = {
        _subject: msg.subject,
        _template: "table",
        _captcha: "false",
        _honey: ""
      };
      if (msg.replyTo) payload._replyto = msg.replyTo;
      msg.rows.forEach(function (r) {
        if (r[1] == null || r[1] === "") return;
        var key = r[0], n = 2;
        while (Object.prototype.hasOwnProperty.call(payload, key)) key = r[0] + " (" + n++ + ")";
        payload[key] = String(r[1]);
      });
      payload["보낸 페이지"] = location.href.split("#")[0];
      // 응답이 오래 걸리면(서비스 지연·중간 차단 등) SEND_TIMEOUT 뒤 실패로 처리
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var timer;
      var timeout = new Promise(function (resolve, reject) {
        timer = setTimeout(function () {
          if (ctrl) ctrl.abort();
          reject(new Error("formsubmit-timeout"));
        }, SEND_TIMEOUT);
      });
      var request = fetch("https://formsubmit.co/ajax/" + encodeURIComponent(mailCfg.to), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || String(d.success) !== "true") throw new Error(d.message || ("formsubmit-" + r.status));
          return { ok: true, via: "formsubmit" };
        });
      });
      return Promise.race([request, timeout]).then(function (res) {
        clearTimeout(timer);
        return res;
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
    }
  };
})();
