/* ==========================================================================
   관리자 페이지 (Supabase Auth + RLS)
   대시보드(방문 통계) · 공지·소식 · 갤러리 · 응원 메시지 · 문의 · 후원 신청 · 온라인 후원
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var esc = WH.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var sb = null;

  var CAT = { notice: "공지", news: "소식", press: "언론보도" };
  var ALBUM = { events: "행사·모임", ministry: "사역 현장", declaration: "희망선언" };
  var INQ_TYPE = { general: "일반 문의", join: "참여·동역 신청", donation: "후원 문의", partnership: "협력 제안", press: "언론·취재" };

  function show(id) { ["adm-setup", "adm-login", "adm-app"].forEach(function (x) { $("#" + x).hidden = x !== id; }); }
  function dt(d) {
    if (!d) return "";
    var x = new Date(d);
    return WH.fmtDate(d) + " " + String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0");
  }
  function won(n) { return n == null ? "" : Number(n).toLocaleString("ko-KR") + "원"; }
  function fail(err) { console.error(err); WH.toast("오류: " + ((err && err.message) || "처리하지 못했습니다.")); }
  function must(res) { if (res.error) throw res.error; return res.data; }

  /* CSV 내보내기 (엑셀 한글 깨짐 방지 BOM 포함) */
  function downloadCsv(filename, cols, rows) {
    var cell = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [cols.map(function (c) { return cell(c[1]); }).join(",")];
    rows.forEach(function (r) { lines.push(cols.map(function (c) { return cell(typeof c[0] === "function" ? c[0](r) : r[c[0]]); }).join(",")); });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* 큰 사진은 업로드 전에 긴 변 2000px 로 줄임 (용량·로딩 속도) */
  function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve(file);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var max = 2000, w = img.naturalWidth, h = img.naturalHeight;
        URL.revokeObjectURL(img.src);
        if (Math.max(w, h) <= max) return resolve(file);
        var k = max / Math.max(w, h), c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { resolve(b ? new File([b], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file); }, "image/jpeg", 0.86);
      };
      img.onerror = function () { resolve(file); };
      img.src = URL.createObjectURL(file);
    });
  }
  function upload(folder, file) {
    return shrink(file).then(function (f) {
      var ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      var path = folder + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      return sb.storage.from("media").upload(path, f, { cacheControl: "31536000", upsert: false, contentType: f.type }).then(function (res) {
        if (res.error) throw res.error;
        return { path: path, url: sb.storage.from("media").getPublicUrl(path).data.publicUrl };
      });
    });
  }

  /* ---------------- 인증 ---------------- */
  function enter(session) {
    return sb.rpc("is_admin").then(function (res) {
      if (res.error || !res.data) {
        return sb.auth.signOut().then(function () {
          show("adm-login");
          var st = $("#login-form .form-status");
          st.className = "form-status err";
          st.textContent = "관리자 권한이 없는 계정입니다. schema.sql 의 ‘관리자 등록’ 쿼리를 실행했는지 확인해 주세요.";
        });
      }
      $("#adm-email").textContent = session.user.email || "";
      $("#adm-user").hidden = false;
      show("adm-app");
      refreshCounts();
      openTab("dash");
    });
  }

  function boot() {
    if (!WH.db.enabled) { show("adm-setup"); return; }
    WH.db.client().then(function (c) {
      sb = c;
      return sb.auth.getSession();
    }).then(function (r) {
      var session = r.data && r.data.session;
      if (session) return enter(session);
      show("adm-login");
    }).catch(function (e) { show("adm-login"); fail(e); });

    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var st = $("#login-form .form-status");
      st.className = "form-status"; st.textContent = "로그인 중…";
      sb.auth.signInWithPassword({ email: $("#l-email").value.trim(), password: $("#l-pass").value }).then(function (res) {
        if (res.error) { st.className = "form-status err"; st.textContent = "이메일 또는 비밀번호를 확인해 주세요."; return; }
        st.textContent = "";
        return enter(res.data.session);
      }).catch(fail);
    });
    $("#adm-logout").addEventListener("click", function () {
      sb.auth.signOut().then(function () { $("#adm-user").hidden = true; show("adm-login"); });
    });
    $$(".adm-tabs [data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { openTab(b.getAttribute("data-tab")); });
    });
  }

  function refreshCounts() {
    var q = [
      ["inquiries", sb.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new")],
      ["applications", sb.from("donation_applications").select("id", { count: "exact", head: true }).eq("status", "new")],
      ["cheers", sb.from("cheers").select("id", { count: "exact", head: true }).eq("approved", false)]
    ];
    return Promise.all(q.map(function (x) { return x[1]; })).then(function (res) {
      var out = {};
      res.forEach(function (r, i) {
        var n = r.count || 0, el = $('[data-count="' + q[i][0] + '"]');
        out[q[i][0]] = n;
        if (el) { el.textContent = n; el.hidden = !n; }
      });
      return out;
    }).catch(function () { return {}; });
  }

  /* ---------------- 탭 ---------------- */
  var panel = $("#adm-panel");
  var tabs = {};
  function openTab(name) {
    $$(".adm-tabs [data-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-tab") === name)); });
    // 탭마다 패널을 새로 만들어 이전 탭의 이벤트 리스너가 쌓이지 않게 함
    var fresh = panel.cloneNode(false);
    panel.replaceWith(fresh);
    panel = fresh;
    panel.innerHTML = '<p class="muted">불러오는 중…</p>';
    Promise.resolve(tabs[name]()).catch(function (e) { panel.innerHTML = '<p class="form-status err">불러오지 못했습니다: ' + esc(e.message || e) + "</p>"; });
  }

  /* ---- 대시보드 ---- */
  tabs.dash = function () {
    return Promise.all([
      sb.rpc("visit_stats").then(must),
      sb.rpc("visit_daily", { p_days: 14 }).then(must),
      sb.rpc("visit_top_pages", { p_days: 30 }).then(must),
      refreshCounts()
    ]).then(function (r) {
      var s = r[0] || {}, daily = r[1] || [], top = r[2] || [], cnt = r[3] || {};
      // 최근 14일을 0 포함해 채움 (한국시간 기준 날짜)
      var map = {};
      daily.forEach(function (d) { map[String(d.day).slice(0, 10)] = d; });
      var days = [];
      var kstNow = new Date(Date.now() + 9 * 3600 * 1000);
      for (var i = 13; i >= 0; i--) {
        var dd = new Date(kstNow.getTime() - i * 86400000).toISOString().slice(0, 10);
        var row = map[dd] || {};
        days.push({ day: dd, visitors: Number(row.visitors || 0), views: Number(row.views || 0) });
      }
      var max = Math.max.apply(null, days.map(function (d) { return d.visitors; }).concat([1]));
      var peakIdx = days.reduce(function (pi, d, i) { return d.visitors > days[pi].visitors ? i : pi; }, 0);
      var cols = days.map(function (d, i) {
        var label = (i === days.length - 1 || (i === peakIdx && d.visitors > 0)) ? '<span class="v">' + d.visitors + "</span>" : "";
        return '<div class="col" tabindex="0" data-tip="' + esc(d.day.slice(5).replace("-", ".") + " · 방문자 " + d.visitors + "명 · 조회 " + d.views + "회") + '">' + label +
          '<i style="height:' + (d.visitors ? Math.max(1.5, d.visitors / max * 100) : 0) + '%"></i></div>';
      }).join("");
      var labels = days.map(function (d, i) { return "<span>" + (i % 2 === 1 || i === days.length - 1 ? d.day.slice(5).replace("-", ".") : "") + "</span>"; }).join("");

      panel.innerHTML =
        "<h2>대시보드</h2><p class=\"muted\">방문자 수는 하루 단위 고유 방문자 기준이며, 같은 사람이 30분 안에 같은 페이지를 다시 열면 한 번만 집계합니다.</p>" +
        '<div class="stat-row">' +
        '<div class="stat"><small>오늘 방문자</small><b>' + Number(s.today || 0).toLocaleString() + "</b></div>" +
        '<div class="stat"><small>누적 방문자</small><b>' + Number(s.total || 0).toLocaleString() + "</b></div>" +
        '<div class="stat"><small>오늘 페이지 조회</small><b>' + Number(s.today_views || 0).toLocaleString() + "</b></div>" +
        '<div class="stat"><small>새 문의 · 신청 · 응원</small><b>' + (cnt.inquiries || 0) + " · " + (cnt.applications || 0) + " · " + (cnt.cheers || 0) + "</b></div>" +
        "</div>" +
        '<div class="chart"><h3>최근 14일 방문자</h3><p class="sub">막대에 마우스를 올리면 날짜별 방문자·조회 수가 보입니다.</p>' +
        '<div class="cols" role="img" aria-label="최근 14일 일별 방문자 막대 그래프">' + cols + '</div><div class="col-labels" aria-hidden="true">' + labels + '</div><div class="tip"></div>' +
        '<details class="mt-2"><summary class="muted" style="cursor:pointer;font-size:13.5px">표로 보기</summary><div class="tbl-wrap mt-1"><table class="adm"><tr><th>날짜</th><th>방문자</th><th>조회</th></tr>' +
        days.slice().reverse().map(function (d) { return "<tr><td>" + d.day + "</td><td>" + d.visitors + "</td><td>" + d.views + "</td></tr>"; }).join("") +
        "</table></div></details></div>" +
        '<h3 class="mt-4" style="font-size:17px;margin-bottom:10px">많이 본 페이지 (최근 30일)</h3>' +
        '<div class="tbl-wrap"><table class="adm"><tr><th>페이지</th><th>조회</th></tr>' +
        (top.length ? top.map(function (t) { return "<tr><td>" + esc(t.path) + "</td><td>" + Number(t.views).toLocaleString() + "</td></tr>"; }).join("") : '<tr><td colspan="2" class="muted">아직 데이터가 없습니다.</td></tr>') +
        "</table></div>";

      var chart = $(".chart", panel), tip = $(".tip", chart);
      var showTip = function (col) {
        var cr = chart.getBoundingClientRect(), r = col.getBoundingClientRect();
        tip.textContent = col.getAttribute("data-tip");
        tip.style.left = (r.left - cr.left + r.width / 2) + "px";
        tip.style.top = (col.querySelector("i").getBoundingClientRect().top - cr.top) + "px";
        tip.classList.add("on");
      };
      $$(".col", chart).forEach(function (col) {
        col.addEventListener("mouseenter", function () { showTip(col); });
        col.addEventListener("focus", function () { showTip(col); });
        col.addEventListener("mouseleave", function () { tip.classList.remove("on"); });
        col.addEventListener("blur", function () { tip.classList.remove("on"); });
      });
    });
  };

  /* ---- 공지·소식 ---- */
  tabs.posts = function () {
    return sb.from("posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(300).then(must).then(function (rows) {
      panel.innerHTML =
        '<div class="adm-head"><div><h2>공지·소식</h2><p class="muted mb-0">글은 한국어만 써도 됩니다. 영어 칸이 비어 있으면 영어 화면에도 한국어가 보입니다.</p></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="post-new">새 글 쓰기</button></div>' +
        '<div id="post-editor"></div>' +
        '<div class="tbl-wrap"><table class="adm"><tr><th>분류</th><th>제목</th><th>상태</th><th>작성일</th><th></th></tr>' +
        (rows.length ? rows.map(function (p) {
          return "<tr><td class=\"nowrap\">" + esc(CAT[p.category] || p.category) + "</td><td>" + esc(p.title_ko) + (p.title_en ? '<br><small class="muted">' + esc(p.title_en) + "</small>" : "") + "</td>" +
            '<td class="nowrap">' + (p.published ? '<span class="pill ok">게시</span>' : '<span class="pill">숨김</span>') + (p.pinned ? ' <span class="pill new">고정</span>' : "") + "</td>" +
            '<td class="nowrap">' + WH.fmtDate(p.created_at) + "</td>" +
            '<td><div class="act"><button type="button" data-edit="' + p.id + '">수정</button><a class="mini" href="../post.html?id=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener">보기</a><button type="button" class="danger" data-del="' + p.id + '">삭제</button></div></td></tr>';
        }).join("") : '<tr><td colspan="5" class="muted">아직 글이 없습니다.</td></tr>') +
        "</table></div>";

      $("#post-new").addEventListener("click", function () { editPost(null); });
      panel.addEventListener("click", function (e) {
        var ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
        if (ed) editPost(rows.find(function (r) { return r.id === ed.getAttribute("data-edit"); }));
        if (del && confirm("이 글을 삭제할까요? 되돌릴 수 없습니다.")) {
          sb.from("posts").delete().eq("id", del.getAttribute("data-del")).then(must).then(function () { WH.toast("삭제했습니다."); openTab("posts"); }).catch(fail);
        }
      });
    });
  };
  function editPost(p) {
    p = p || { category: "notice", published: true, pinned: false };
    var box = $("#post-editor");
    var local = function (d) { if (!d) return ""; var x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
    box.innerHTML =
      '<form class="editor form-grid" id="post-form">' +
      '<div class="field"><label for="pf-cat">분류</label><select id="pf-cat">' + Object.keys(CAT).map(function (k) { return '<option value="' + k + '"' + (p.category === k ? " selected" : "") + ">" + CAT[k] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="pf-date">작성일 (비우면 지금)</label><input type="datetime-local" id="pf-date" value="' + local(p.created_at) + '" style="width:100%;border:1px solid #cfd8e6;border-radius:12px;padding:11px 14px"></div>' +
      '<div class="field full"><label for="pf-tko">제목 (한국어) *</label><input type="text" id="pf-tko" maxlength="200" required value="' + esc(p.title_ko || "") + '"></div>' +
      '<div class="field full"><label for="pf-bko">내용 (한국어)</label><textarea id="pf-bko" style="min-height:220px">' + esc(p.body_ko || "") + "</textarea><p class=\"hint\">빈 줄로 문단을 나눕니다. 링크(https://…)는 자동으로 연결됩니다.</p></div>" +
      '<div class="field full"><label for="pf-ten">제목 (영어, 선택)</label><input type="text" id="pf-ten" maxlength="300" value="' + esc(p.title_en || "") + '"></div>' +
      '<div class="field full"><label for="pf-ben">내용 (영어, 선택)</label><textarea id="pf-ben">' + esc(p.body_en || "") + "</textarea></div>" +
      '<div class="field full"><label for="pf-cover">대표 이미지 (선택)</label><input type="file" id="pf-cover" accept="image/*">' +
      (p.cover_url ? '<p class="hint">현재: <a href="' + esc(p.cover_url) + '" target="_blank" rel="noopener">이미지 보기</a> · <label class="check" style="display:inline-flex"><input type="checkbox" id="pf-cover-rm"> 이미지 빼기</label></p>' : "") + "</div>" +
      '<div class="field"><label class="check"><input type="checkbox" id="pf-pub"' + (p.published ? " checked" : "") + "> 홈페이지에 게시</label></div>" +
      '<div class="field"><label class="check"><input type="checkbox" id="pf-pin"' + (p.pinned ? " checked" : "") + "> 목록 맨 위 고정</label></div>" +
      '<div class="full act"><button type="submit" class="btn btn-primary btn-sm">' + (p.id ? "수정 저장" : "등록") + '</button><button type="button" class="btn btn-outline btn-sm" id="pf-cancel">취소</button></div>' +
      "</form>";
    box.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#pf-cancel").addEventListener("click", function () { box.innerHTML = ""; });
    $("#post-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = e.target.querySelector('[type="submit"]');
      btn.disabled = true;
      var row = {
        category: $("#pf-cat").value,
        title_ko: $("#pf-tko").value.trim(),
        body_ko: $("#pf-bko").value,
        title_en: $("#pf-ten").value.trim() || null,
        body_en: $("#pf-ben").value.trim() ? $("#pf-ben").value : null,
        published: $("#pf-pub").checked,
        pinned: $("#pf-pin").checked,
        updated_at: new Date().toISOString()
      };
      if ($("#pf-date").value) row.created_at = new Date($("#pf-date").value).toISOString();
      if ($("#pf-cover-rm") && $("#pf-cover-rm").checked) row.cover_url = null;
      var file = $("#pf-cover").files[0];
      (file ? upload("posts", file).then(function (u) { row.cover_url = u.url; }) : Promise.resolve())
        .then(function () { return p.id ? sb.from("posts").update(row).eq("id", p.id) : sb.from("posts").insert(row); })
        .then(must)
        .then(function () { WH.toast(p.id ? "수정했습니다." : "등록했습니다."); openTab("posts"); })
        .catch(function (err) { btn.disabled = false; fail(err); });
    });
  }

  /* ---- 갤러리 ---- */
  tabs.gallery = function () {
    return sb.from("gallery").select("*").order("sort", { ascending: true }).order("created_at", { ascending: false }).limit(500).then(must).then(function (rows) {
      panel.innerHTML =
        "<h2>갤러리</h2><p class=\"muted\">여러 장을 한 번에 올릴 수 있습니다. 큰 사진은 자동으로 줄여서 올립니다. ‘순서’ 숫자가 작을수록 앞에 보입니다.</p>" +
        '<form class="editor form-grid" id="gal-form">' +
        '<div class="field"><label for="gf-album">앨범</label><select id="gf-album">' + Object.keys(ALBUM).map(function (k) { return '<option value="' + k + '">' + ALBUM[k] + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label for="gf-files">사진 선택 *</label><input type="file" id="gf-files" accept="image/*" multiple required></div>' +
        '<div class="field"><label for="gf-tko">사진 제목 (한국어)</label><input type="text" id="gf-tko" maxlength="200" placeholder="예) 2026 희망선언 준비 모임"></div>' +
        '<div class="field"><label for="gf-ten">사진 제목 (영어, 선택)</label><input type="text" id="gf-ten" maxlength="300"></div>' +
        '<div class="full act"><button type="submit" class="btn btn-primary btn-sm">올리기</button><span class="form-status" id="gf-status" style="margin:0"></span></div>' +
        "</form>" +
        '<div class="gal-admin">' + (rows.length ? rows.map(function (g) {
          return '<figure><img src="' + esc(g.image_url) + '" alt="" loading="lazy"><figcaption>' +
            "<b>" + esc(g.title_ko || "(제목 없음)") + '</b><span class="muted">' + esc(ALBUM[g.album] || g.album) + "</span>" +
            '<label style="display:flex;gap:6px;align-items:center">순서 <input type="number" value="' + (g.sort || 0) + '" data-sort="' + g.id + '" style="width:70px;border:1px solid var(--line);border-radius:6px;padding:3px 6px"></label>' +
            '<div class="act"><button type="button" data-pub="' + g.id + '">' + (g.published ? "숨기기" : "게시") + '</button><button type="button" class="danger" data-gdel="' + g.id + '">삭제</button></div>' +
            "</figcaption></figure>";
        }).join("") : '<p class="muted">아직 사진이 없습니다.</p>') + "</div>";

      $("#gal-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var files = Array.prototype.slice.call($("#gf-files").files);
        if (!files.length) return;
        var st = $("#gf-status"), btn = e.target.querySelector('[type="submit"]');
        btn.disabled = true;
        var base = { album: $("#gf-album").value, title_ko: $("#gf-tko").value.trim() || null, title_en: $("#gf-ten").value.trim() || null };
        var done = 0;
        files.reduce(function (chain, f) {
          return chain.then(function () {
            st.className = "form-status"; st.textContent = "올리는 중… (" + (done + 1) + "/" + files.length + ")";
            return upload("gallery", f).then(function (u) {
              return sb.from("gallery").insert(Object.assign({}, base, { image_url: u.url, storage_path: u.path })).then(must);
            }).then(function () { done++; });
          });
        }, Promise.resolve()).then(function () {
          WH.toast(done + "장을 올렸습니다."); openTab("gallery");
        }).catch(function (err) { btn.disabled = false; st.textContent = ""; fail(err); });
      });
      panel.addEventListener("change", function (e) {
        var s = e.target.closest("[data-sort]");
        if (s) sb.from("gallery").update({ sort: parseInt(s.value, 10) || 0 }).eq("id", s.getAttribute("data-sort")).then(must).then(function () { WH.toast("순서를 저장했습니다."); }).catch(fail);
      });
      panel.addEventListener("click", function (e) {
        var pub = e.target.closest("[data-pub]"), del = e.target.closest("[data-gdel]");
        if (pub) {
          var g = rows.find(function (r) { return r.id === pub.getAttribute("data-pub"); });
          sb.from("gallery").update({ published: !g.published }).eq("id", g.id).then(must).then(function () { openTab("gallery"); }).catch(fail);
        }
        if (del && confirm("이 사진을 삭제할까요?")) {
          var row = rows.find(function (r) { return r.id === del.getAttribute("data-gdel"); });
          (row.storage_path ? sb.storage.from("media").remove([row.storage_path]) : Promise.resolve())
            .then(function () { return sb.from("gallery").delete().eq("id", row.id); }).then(must)
            .then(function () { WH.toast("삭제했습니다."); openTab("gallery"); }).catch(fail);
        }
      });
    });
  };

  /* ---- 응원 메시지 ---- */
  tabs.cheers = function () {
    return sb.from("cheers").select("*").order("approved", { ascending: true }).order("created_at", { ascending: false }).limit(500).then(must).then(function (rows) {
      panel.innerHTML =
        "<h2>응원 메시지</h2><p class=\"muted\">‘승인’한 메시지만 홈 화면에 보입니다. 부적절한 글은 삭제해 주세요.</p>" +
        '<div class="tbl-wrap"><table class="adm"><tr><th>상태</th><th>이름</th><th>지역</th><th>메시지</th><th>작성일</th><th></th></tr>' +
        (rows.length ? rows.map(function (c) {
          return "<tr><td>" + (c.approved ? '<span class="pill ok">게시 중</span>' : '<span class="pill new">대기</span>') + "</td><td class=\"nowrap\">" + esc(c.name) + "</td><td>" + esc(c.region || "") + '</td><td class="msg">' + esc(c.message) + '</td><td class="nowrap">' + dt(c.created_at) + "</td>" +
            '<td><div class="act"><button type="button" data-appr="' + c.id + '" data-v="' + (!c.approved) + '">' + (c.approved ? "게시 취소" : "승인") + '</button><button type="button" class="danger" data-cdel="' + c.id + '">삭제</button></div></td></tr>';
        }).join("") : '<tr><td colspan="6" class="muted">아직 메시지가 없습니다.</td></tr>') + "</table></div>";
      panel.addEventListener("click", function (e) {
        var a = e.target.closest("[data-appr]"), d = e.target.closest("[data-cdel]");
        if (a) sb.from("cheers").update({ approved: a.getAttribute("data-v") === "true" }).eq("id", a.getAttribute("data-appr")).then(must).then(function () { refreshCounts(); openTab("cheers"); }).catch(fail);
        if (d && confirm("이 메시지를 삭제할까요?")) sb.from("cheers").delete().eq("id", d.getAttribute("data-cdel")).then(must).then(function () { refreshCounts(); openTab("cheers"); }).catch(fail);
      });
    });
  };

  /* ---- 접수 목록 공통 (문의 / 후원 신청) ---- */
  function intakeTab(opt) {
    return sb.from(opt.table).select("*").order("created_at", { ascending: false }).limit(1000).then(must).then(function (rows) {
      panel.innerHTML =
        '<div class="adm-head"><div><h2>' + opt.title + '</h2><p class="muted mb-0">' + opt.desc + "</p></div>" +
        '<button type="button" class="btn btn-outline btn-sm" id="csv">엑셀(CSV) 내려받기</button></div>' +
        '<div class="tbl-wrap"><table class="adm"><tr><th>상태</th>' + opt.cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "<th></th></tr>" +
        (rows.length ? rows.map(function (r) {
          return "<tr><td>" + (r.status === "done" ? '<span class="pill ok">처리 완료</span>' : '<span class="pill new">새 접수</span>') + "</td>" +
            opt.cols.map(function (c) {
              var v = typeof c[0] === "function" ? c[0](r) : r[c[0]];
              return "<td" + (c[2] ? ' class="' + c[2] + '"' : "") + ">" + esc(v == null ? "" : v) + "</td>";
            }).join("") +
            '<td><div class="act"><button type="button" data-st="' + r.id + '" data-v="' + (r.status === "done" ? "new" : "done") + '">' + (r.status === "done" ? "미처리로" : "처리 완료") + '</button><button type="button" class="danger" data-idel="' + r.id + '">삭제</button></div></td></tr>';
        }).join("") : '<tr><td colspan="' + (opt.cols.length + 2) + '" class="muted">아직 접수된 내용이 없습니다.</td></tr>') + "</table></div>";
      $("#csv").addEventListener("click", function () {
        downloadCsv(opt.table + "-" + new Date().toISOString().slice(0, 10) + ".csv", [["status", "상태"]].concat(opt.cols), rows);
      });
      panel.addEventListener("click", function (e) {
        var s = e.target.closest("[data-st]"), d = e.target.closest("[data-idel]");
        if (s) sb.from(opt.table).update({ status: s.getAttribute("data-v") }).eq("id", s.getAttribute("data-st")).then(must).then(function () { refreshCounts(); openTab(opt.tab); }).catch(fail);
        if (d && confirm("삭제할까요? 되돌릴 수 없습니다.")) sb.from(opt.table).delete().eq("id", d.getAttribute("data-idel")).then(must).then(function () { refreshCounts(); openTab(opt.tab); }).catch(fail);
      });
    });
  }
  tabs.inquiries = function () {
    return intakeTab({
      tab: "inquiries", table: "inquiries", title: "문의·참여 신청",
      desc: "회신 후 ‘처리 완료’로 바꿔 두면 새 접수만 숫자로 표시됩니다.",
      cols: [
        [function (r) { return dt(r.created_at); }, "접수일", "nowrap"],
        [function (r) { return INQ_TYPE[r.type] || r.type; }, "유형", "nowrap"],
        ["name", "이름", "nowrap"], ["phone", "연락처", "nowrap"], ["email", "이메일"], ["org", "소속"],
        ["message", "내용", "msg"]
      ]
    });
  };
  tabs.applications = function () {
    return intakeTab({
      tab: "applications", table: "donation_applications", title: "후원 신청",
      desc: "신청자에게 전화로 연락해 CMS 자동이체 등록을 안내해 주세요. (계좌번호·주민번호는 온라인으로 받지 않습니다)",
      cols: [
        [function (r) { return dt(r.created_at); }, "접수일", "nowrap"],
        [function (r) { return r.kind === "once" ? "일시" : "정기(매월)"; }, "구분", "nowrap"],
        [function (r) { return won(r.amount); }, "금액", "nowrap"],
        [function (r) { return r.withdraw_day ? r.withdraw_day + "일" : ""; }, "출금일", "nowrap"],
        ["name", "이름", "nowrap"], ["phone", "연락처", "nowrap"], ["email", "이메일"],
        [function (r) { return r.receipt ? "희망" : ""; }, "영수증", "nowrap"],
        ["memo", "남기신 말씀", "msg"]
      ]
    });
  };

  /* ---- 온라인 후원 ---- */
  tabs.donations = function () {
    return sb.from("donations").select("*").order("created_at", { ascending: false }).limit(1000).then(must).then(function (rows) {
      var total = rows.filter(function (r) { return r.status === "PAID"; }).reduce(function (s, r) { return s + (r.amount || 0); }, 0);
      var cols = [
        [function (r) { return dt(r.paid_at || r.created_at); }, "결제일"], [function (r) { return won(r.amount); }, "금액"],
        ["name", "이름"], ["phone", "연락처"], ["email", "이메일"], ["method", "결제수단"], ["status", "상태"], ["payment_id", "결제번호"]
      ];
      panel.innerHTML =
        '<div class="adm-head"><div><h2>온라인 후원</h2><p class="muted mb-0">결제대행사(PortOne)에서 결제 완료가 확인된 내역입니다. 총 <b>' + won(total) + "</b> · " + rows.length + "건</p></div>" +
        '<button type="button" class="btn btn-outline btn-sm" id="csv">엑셀(CSV) 내려받기</button></div>' +
        '<div class="tbl-wrap"><table class="adm"><tr>' + cols.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("") + "</tr>" +
        (rows.length ? rows.map(function (r) {
          return "<tr>" + cols.map(function (c) { var v = typeof c[0] === "function" ? c[0](r) : r[c[0]]; return '<td class="nowrap">' + esc(v == null ? "" : v) + "</td>"; }).join("") + "</tr>";
        }).join("") : '<tr><td colspan="' + cols.length + '" class="muted">아직 온라인 후원 내역이 없습니다. (PG 가맹 및 결제 설정 후 표시됩니다)</td></tr>') + "</table></div>";
      $("#csv").addEventListener("click", function () { downloadCsv("donations-" + new Date().toISOString().slice(0, 10) + ".csv", cols, rows); });
    });
  };

  boot();
})();
