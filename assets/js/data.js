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
     FormSubmit 실패(네트워크 차단·미활성화 등) 시 reject → 호출 측에서 mailto 로 대체 가능 */
  var mailCfg = C.email || {};
  WH.mail = {
    enabled: !!mailCfg.to,
    service: mailCfg.service || "formsubmit",
    mailtoHref: function (subject, rows) {
      var body = rows.filter(function (r) { return r[1] != null && r[1] !== ""; })
        .map(function (r) { return "■ " + r[0] + "\n" + r[1]; }).join("\n\n");
      return "mailto:" + (/@/.test(mailCfg.to || "") ? mailCfg.to : "") +
        "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    },
    send: function (msg) {
      if (!mailCfg.to) return Promise.reject(new Error("email-not-configured"));
      if (WH.mail.service === "mailto") {
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
      return fetch("https://formsubmit.co/ajax/" + encodeURIComponent(mailCfg.to), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok || String(d.success) !== "true") throw new Error(d.message || ("formsubmit-" + r.status));
          return { ok: true, via: "formsubmit" };
        });
      });
    }
  };
})();
