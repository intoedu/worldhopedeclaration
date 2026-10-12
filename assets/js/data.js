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

  /* ---------------- 이메일 전송 ----------------
     WH.mail.send({ subject, rows: [[항목명, 값], ...], replyTo })
     → Promise<{ok:true, via:"formsubmit"} | {ok:true, via:"mailto"}>
     FormSubmit 실패(네트워크 차단·미활성화·응답 지연 등) 시 reject → 호출 측에서 mailto 로 대체 가능 */
  var mailCfg = C.email || {};
  var SEND_TIMEOUT = 12000; // FormSubmit 응답을 기다리는 최대 시간(ms) — 넘으면 실패로 보고 대체 경로 안내
  /* 메일 앱(mailto) 받는 주소: email.to 가 이메일 주소면 그대로, 별칭이면 publicEmail, 둘 다 없으면 "" */
  function mailtoRecipient() {
    if (/@/.test(mailCfg.to || "")) return mailCfg.to;
    if (/@/.test(C.publicEmail || "")) return C.publicEmail;
    return "";
  }
  WH.mail = {
    enabled: !!mailCfg.to,
    service: mailCfg.service || "formsubmit",
    /* 받는 주소가 없으면 "mailto:?subject=…" 형태 (호출 측에서 /^mailto:\?/ 로 확인) */
    mailtoHref: function (subject, rows) {
      var body = rows.filter(function (r) { return r[1] != null && r[1] !== ""; })
        .map(function (r) { return "■ " + r[0] + "\n" + r[1]; }).join("\n\n");
      return "mailto:" + mailtoRecipient() +
        "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    },
    send: function (msg) {
      if (!mailCfg.to) return Promise.reject(new Error("email-not-configured"));
      if (WH.mail.service === "mailto") {
        // 받는 주소 없이 메일 앱을 열면 접수가 사라지므로 실패로 처리 (호출 측에서 전화 안내)
        if (!mailtoRecipient()) return Promise.reject(new Error("mailto-no-recipient"));
        location.href = WH.mail.mailtoHref(msg.subject, msg.rows);
        return Promise.resolve({ ok: true, via: "mailto" });
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
