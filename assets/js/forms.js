/* ==========================================================================
   공개 폼 처리 (문의·참여 신청 / 정기 후원 신청 / 희망 응원 메시지 /
               세계희망선언 참여 신청 / 글로벌 대표 추천)
   <form data-wh-form="inquiries|donation_applications|cheers|declaration_join|nominations"
         data-subject-ko="메일 제목" data-ok-ko="완료 문구" data-ok-en="Done message">
   - 서버·데이터베이스 없음: 입력 내용은 WH.mail.send(FormSubmit)로 담당자 이메일에 전달됩니다.
   - 메일 본문 항목명은 화면 언어와 관계없이 항상 한국어(라벨의 .ko 텍스트)로 보냅니다.
     같은 이름의 항목이 여러 개면(예: 추천인 이름 / 피추천인 이름) 입력칸에 data-label="…" 로 구분합니다.
   - FormSubmit 전송 실패(네트워크 차단·미활성화 등) 시 대체 접수 안내(메일로 보내기·내용 복사·주소 복사·전화)를 보여 줍니다.
     (예전 속성 data-fallback="none" 이 있으면 메일 대신 전화 안내만 표시)
   - ‘기타(직접 입력)’: <select data-other="입력칸 id"> 에서 value="other" 를 고르면 그 입력칸(.field)을
     보이고 필수로 바꿉니다. 다른 값이면 숨기고 전송하지 않습니다(disabled).
   - 항목별 오류 문구: 입력칸에 data-msg-ko="…" data-msg-en="…" (없으면 기본 문구)
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var C = WH.config || {};

  /* 폼 종류별 기본 메일 제목·완료 문구 (data-subject-ko / data-ok-* 가 없을 때) */
  var DEFAULTS = {
    inquiries: {
      subject: "[세계희망연대 홈페이지] 문의",
      ok: ["문의가 담당자에게 전달되었습니다. 확인 후 연락드리겠습니다. 감사합니다.",
        "Your message has been sent to our staff. We will get back to you soon. Thank you."]
    },
    donation_applications: {
      subject: "[세계희망연대 홈페이지] 정기 후원 신청",
      ok: ["후원 신청이 담당자에게 전달되었습니다. 곧 연락드리겠습니다. 감사합니다.",
        "Your application has been sent to our staff. We will contact you soon. Thank you."]
    },
    cheers: {
      subject: "[세계희망연대 홈페이지] 희망 응원 메시지",
      ok: ["응원 메시지가 전달되었습니다. 확인 후 홈페이지에 게시됩니다. 감사합니다!",
        "Your message has been delivered. It will be posted on the website after review. Thank you!"]
    },
    declaration_join: {
      subject: "[세계희망연대 홈페이지] 세계희망선언 참여 신청",
      ok: ["참여 신청이 담당자에게 전달되었습니다. 확인 후 연락드리겠습니다. 함께해 주셔서 감사합니다.",
        "Your application has been sent to our staff. We will contact you after review. Thank you for joining us."]
    },
    nominations: {
      subject: "[세계희망연대 홈페이지] 글로벌 대표 추천",
      ok: ["추천이 담당자에게 전달되었습니다. 확인 후 연락드리겠습니다. 감사합니다.",
        "Your nomination has been sent to our staff. We will contact you after review. Thank you."]
    }
  };
  var CONSENT_LABEL = "개인정보 수집·이용 동의";

  /* 전국대표전화 안내 문구 */
  function phoneKo() { return "전국대표전화(" + (C.phone || "") + ")"; }
  function phoneEn() { return C.phone || ""; }

  /* type: "ok" | "err" | "info"(중립: 전송 중·메일로 보내기 안내) */
  function setStatus(form, type, msg) {
    var el = form.querySelector(".form-status");
    if (!el) {
      el = document.createElement("p");
      el.className = "form-status";
      el.setAttribute("role", "status");
      var btn = form.querySelector('[type="submit"]');
      (btn && btn.parentNode ? btn.parentNode : form).appendChild(el);
    }
    el.className = "form-status " + type;
    el.textContent = msg;
  }
  function okMessage(form) {
    var def = (DEFAULTS[form.getAttribute("data-wh-form")] || {}).ok ||
      ["정상적으로 전달되었습니다. 감사합니다.", "Sent successfully. Thank you."];
    return form.getAttribute("data-ok-" + WH.lang()) || WH.t(def[0], def[1]);
  }

  /* 요소 안의 한국어 텍스트(.ko) — 필수 표시(*)와 공백 정리 */
  function koText(node) {
    if (!node) return "";
    var ko = node.classList && node.classList.contains("ko") ? node : node.querySelector(".ko");
    return (ko || node).textContent.replace(/\*/g, "").replace(/\s+/g, " ").trim();
  }
  /* 항목명: data-label → label[for] → 라디오 그룹 제목(.label) → 감싼 label → name */
  function labelOf(form, el) {
    if (el.getAttribute("data-label")) return el.getAttribute("data-label");
    var label = el.id ? form.querySelector('label[for="' + el.id + '"]') : null;
    if (label) return koText(label);
    var field = el.closest(".field");
    if (el.type === "radio" && field && field.querySelector(".label")) return koText(field.querySelector(".label"));
    if (el.closest("label")) return koText(el.closest("label"));
    return el.name;
  }
  /* 값: 선택 상자·라디오는 한국어 표시 문구, 체크박스는 예/아니오 */
  function valueOf(el) {
    if (el.type === "checkbox") return el.checked ? "예" : "아니오";
    if (el.type === "radio") return koText(el.closest("label")) || el.value;
    if (el.tagName === "SELECT") {
      if (!el.value) return "";
      var o = el.options[el.selectedIndex];
      return o ? (o.getAttribute("data-ko") || o.textContent).trim() : el.value;
    }
    var v = String(el.value || "").trim();
    if (v && el.getAttribute("data-type") === "int") {
      var digits = v.replace(/[^0-9]/g, "");
      if (digits) return Number(digits).toLocaleString("ko-KR");
    }
    return v;
  }

  /* 폼 → { subject, rows, replyTo } */
  function build(form) {
    var type = form.getAttribute("data-wh-form");
    var rows = [], consentEl = null, replyTo = "";
    form.querySelectorAll("[name]").forEach(function (el) {
      if (!el.name || el.disabled || el.closest(".hp-field") || el.hasAttribute("data-skip")) return;
      if (/^(submit|button|reset|file)$/.test(el.type)) return;
      if (el.name === "consent") { consentEl = el; return; }
      if (el.type === "radio" && !el.checked) return;
      var v = valueOf(el);
      if (v == null || v === "") return;
      if (el.type === "email" && !replyTo) replyTo = v;
      rows.push([labelOf(form, el), v]);
    });
    rows.push(["접수 언어", WH.lang() === "en" ? "English" : "한국어"]);
    rows.push([(consentEl && consentEl.getAttribute("data-label")) || CONSENT_LABEL, "동의함"]);

    var nameEl = form.querySelector('[name="name"]');
    var name = nameEl ? String(nameEl.value || "").trim() : "";
    var base = form.getAttribute("data-subject-ko") || (DEFAULTS[type] || {}).subject || "[세계희망연대 홈페이지] 온라인 접수";
    return { subject: base + (name ? " - " + name : ""), rows: rows, replyTo: replyTo };
  }

  /* ---------- 항목별 오류 표시 ----------
     입력칸 바로 아래 <p class="field-error"> (aria-describedby 로 연결, aria-invalid) + 신청서 맨 위 요약(.form-alert, role=alert).
     고치면(입력·선택) 그 항목의 표시는 바로 사라짐. 문구는 두 언어를 함께 넣어 언어를 바꿔도 맞게 보임 */
  var errSeq = 0;
  // [한국어, 영어] — 입력칸의 data-msg-* 가 있으면 그것, 없으면 종류별 기본 문구
  function errorPair(el, missing) {
    var ko = el.getAttribute("data-msg-ko"), en = el.getAttribute("data-msg-en");
    if (ko || en) return [ko || en, en || ko];
    if (el.type === "checkbox" && el.name === "consent") return ["개인정보 수집·이용에 동의해 주세요.", "Please agree to the collection and use of personal information."];
    if (!missing && el.type === "email") return ["이메일 주소 형식을 확인해 주세요.", "Please check the email address."];
    if (!missing && el.type === "tel") return ["연락처를 정확히 입력해 주세요. (숫자 9자리 이상)", "Please enter a valid phone number (at least 9 digits)."];
    return missing ? ["필수 항목입니다", "Required"] : ["형식을 확인해 주세요", "Please check the format"];
  }
  function biText(pair) { return WH.bi(WH.esc(pair[0]), WH.esc(pair[1])); }
  function errHost(el) { return el.closest(".field") || el.closest("label") || el; }
  function markInvalid(el, id) {
    if (!el.hasAttribute("data-wh-desc")) el.setAttribute("data-wh-desc", el.getAttribute("aria-describedby") || "");
    var base = el.getAttribute("data-wh-desc");
    el.setAttribute("aria-describedby", (base ? base + " " : "") + id);
    el.setAttribute("aria-invalid", "true");
  }
  function clearHost(host) {
    if (!host) return;
    if (host.classList) host.classList.remove("has-error");
    var p = host.__whErr;
    if (p && p.parentNode) p.parentNode.removeChild(p);
    host.__whErr = null;
    var ctrls = host.matches && host.matches("input, select, textarea") ? [host] : Array.prototype.slice.call(host.querySelectorAll ? host.querySelectorAll("[aria-invalid]") : []);
    ctrls.forEach(function (c) {
      c.removeAttribute("aria-invalid");
      if (c.hasAttribute("data-wh-desc")) {
        var base = c.getAttribute("data-wh-desc");
        if (base) c.setAttribute("aria-describedby", base); else c.removeAttribute("aria-describedby");
        c.removeAttribute("data-wh-desc");
      }
    });
  }
  function showFieldError(el, pair) {
    var host = errHost(el);
    var p = host.__whErr;
    if (!p) {
      p = document.createElement("p");
      p.className = "field-error";
      p.id = "wh-err-" + (++errSeq);
      host.__whErr = p;
      // .field 안이면 그 끝에, 체크박스 줄(label)·단독 입력칸이면 바로 뒤에
      if (host.classList && host.classList.contains("field")) host.appendChild(p);
      else host.parentNode.insertBefore(p, host.nextSibling);
    }
    p.innerHTML = biText(pair);
    markInvalid(el, p.id);
  }
  // 신청서 맨 위 요약: 첫 입력 묶음(fieldset · .form-grid) 바로 앞
  function showSummary(form, pair) {
    var box = form.querySelector(".form-alert");
    if (!box) {
      box = document.createElement("p");
      box.className = "form-alert";
      box.setAttribute("role", "alert");
      var first = null;
      Array.prototype.some.call(form.children, function (c) {
        if (c.matches("fieldset, .form-grid") || c.querySelector("input:not([type=hidden]), select, textarea")) { first = c; return true; }
        return false;
      });
      form.insertBefore(box, first || form.firstChild);
    }
    box.innerHTML = biText(pair);
  }
  function clearAll(form) {
    form.querySelectorAll(".field.has-error").forEach(function (f) { f.classList.remove("has-error"); });
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { clearHost(errHost(el)); });
    var box = form.querySelector(".form-alert");
    if (box) box.parentNode.removeChild(box);
  }

  /* 화면 순서대로 확인: 필수 입력, 이메일 형식, 연락처(숫자 9자리 이상) — 선택 항목도 입력했다면 형식 확인 */
  function validate(form) {
    var firstBad = null, firstPair = null;
    clearAll(form);
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (el.disabled || el.closest(".hp-field") || /^(submit|button|reset|hidden|file)$/.test(el.type)) return;
      var v = String(el.value || "").trim();
      var bad = false, missing = false;
      if (el.required) {
        if (el.type === "checkbox") bad = !el.checked;
        else if (el.type === "radio") bad = !form.querySelector('[name="' + el.name + '"]:checked');
        else bad = !v;
        missing = bad;
      }
      if (!bad && v && el.type === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!bad && v && el.type === "tel") bad = v.replace(/[^0-9]/g, "").length < 9;
      if (bad) {
        var f = el.closest(".field"); if (f) f.classList.add("has-error");
        var pair = errorPair(el, missing);
        showFieldError(el, pair);
        if (!firstBad) { firstBad = el; firstPair = pair; }
      }
    });
    if (firstBad) {
      firstBad.focus();
      // 요약·아래 상태 줄: 첫 항목의 문구(data-msg-* · 동의 · 이메일 · 연락처), 그 밖에는 기본 문구
      var sum = firstPair[0] === "필수 항목입니다" || firstPair[0] === "형식을 확인해 주세요" ?
        ["필수 항목을 확인해 주세요.", "Please check the required fields."] : firstPair;
      showSummary(form, sum);
      setStatus(form, "err", WH.t(sum[0], sum[1]));
      return false;
    }
    return true;
  }

  /* 메일로 대체 접수 (PC: Gmail 작성 창, 휴대폰: 메일 앱). 받는 주소(email.to 또는 publicEmail)는 WH.mail.composeHref 가 고르며,
     받는 주소가 없으면(별칭만 있고 publicEmail 도 없음) "" */
  function composeHref(msg) {
    return WH.mail.composeHref(msg.subject, msg.rows);
  }
  /* 설정이 service:"gmail" 인 경우(자동 전송 없이 메일로 접수): 아래 버튼으로 메일을 열어 ‘보내기’를 누르도록 안내 */
  function gmailStatus(form, msg) {
    var label = WH.mail.composeLabel();
    setStatus(form, "info", WH.t("아래 ‘" + label + "’를 누르면 작성하신 내용이 채워진 메일 창이 열립니다. 그 창에서 ‘보내기’를 눌러야 접수가 완료됩니다.",
      "Press “" + label + "” below to open an email with your details filled in, then press Send there to complete."));
    fallbackActions(form, msg);
  }
  /* 온라인 전송이 되지 않았을 때 — ① 메일로 보내기(받는 사람·제목·내용이 채워진 메일 — PC 는 Gmail 작성 창을 새 탭으로,
     휴대폰은 메일 앱) ② 내용 복사하기 ③ 전화, 그리고 받는 주소와 ‘주소 복사’를 함께 보여 줍니다.
     입력한 내용은 지우지 않습니다. 메일을 저절로 열지 않습니다(팝업 차단·열렸는지 알 수 없음).
     FormSubmit 이 ‘활성화 필요’라고 답한 경우에는 운영자가 할 일(담당자 메일함에서 한 번 활성화)을 함께 표시합니다. */
  function fallbackStatus(form, msg, err) {
    setStatus(form, "info", WH.t("온라인 전송이 되지 않았습니다. 작성하신 내용은 그대로 남아 있으니, 아래 방법 중 하나로 보내 주세요.",
      "Online delivery did not go through. Your entries are kept — please send them in one of the ways below."));
    fallbackActions(form, msg, err && err.activation);
  }
  function fallbackActions(form, msg, activation) {
    var el = form.querySelector(".form-status");
    var to = WH.mail.recipient();
    var mobile = WH.mail.isMobile();
    var kakao = /KAKAOTALK/i.test(navigator.userAgent || "");
    var plain = WH.t("받는 사람: ", "To: ") + to + "\n" + WH.t("제목: ", "Subject: ") + msg.subject + "\n\n" + WH.mail.bodyText(msg.rows);
    var mk = function (tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    };
    var box = mk("span", "form-fallback");
    var mail = mk("a", "btn btn-outline btn-sm", WH.mail.composeLabel());
    mail.href = composeHref(msg);
    if (!mobile) { mail.target = "_blank"; mail.rel = "noopener"; } // PC: Gmail 새 탭 — 이 페이지와 입력한 내용은 그대로 남음
    var copy = mk("button", "btn btn-outline btn-sm", WH.t("내용 복사하기", "Copy details"));
    copy.type = "button";
    copy.addEventListener("click", function () { WH.copy(plain); });
    box.appendChild(mail); box.appendChild(copy);
    if (C.phone) {
      var tel = mk("a", "btn btn-outline btn-sm", WH.t("전화하기 ", "Call ") + C.phone);
      tel.href = "tel:" + String(C.phone).replace(/[^0-9+]/g, "");
      box.appendChild(tel);
    }
    // 받는 주소를 크게 보여 주고 바로 복사할 수 있게 (메일에 직접 붙여 넣는 분을 위해)
    var addr = mk("span", "form-fallback-to");
    addr.appendChild(mk("span", "form-fallback-to-label", WH.t("받는 사람", "To")));
    addr.appendChild(mk("b", "", to));
    var copyTo = mk("button", "btn btn-outline btn-sm form-fallback-to-copy", WH.t("주소 복사", "Copy address"));
    copyTo.type = "button";
    copyTo.addEventListener("click", function () { WH.copy(to); });
    addr.appendChild(copyTo);
    var note = mk("span", "form-fallback-note", WH.t(
      "메일 창에서 ‘보내기’를 눌러야 접수가 완료됩니다. 메일 창이 열리지 않으면 ‘내용 복사하기’를 누른 뒤, 쓰시는 메일·문자에 붙여 넣어 위 주소로 보내 주세요." +
        (kakao ? " 카카오톡 안에서 보고 계셔서 메일 앱이 열리지 않으면, 화면의 메뉴(⋮ 또는 ⋯)에서 ‘다른 브라우저로 열기’를 눌러 주세요." : "") +
        (mobile ? "" : " (Gmail은 Google LLC의 상표입니다.)"),
      "Press Send in the email window to complete. If no email window opens, press “Copy details”, paste it into any email and send it to the address above." +
        (kakao ? " If you are viewing this inside KakaoTalk and no email app opens, use “Open in another browser” from the menu (⋮ or ⋯)." : "") +
        (mobile ? "" : " (Gmail is a trademark of Google LLC.)")));
    el.appendChild(box);
    el.appendChild(addr);
    el.appendChild(note);
    if (activation) {
      // FormSubmit 이 ‘활성화 필요’라고 답함 → 담당자가 메일함에서 한 번만 누르면 이후로는 ‘보내기’ 한 번에 접수됨
      el.appendChild(mk("span", "form-fallback-admin", WH.t(
        "운영자 안내: 온라인 접수가 아직 활성화되지 않았습니다. 담당자 메일함(" + to + ")에서 제목이 ‘Action Required: Activate FormSubmit on’으로 시작하는 가장 최근 메일을 열어 파란 ‘ACTIVATE FORM’ 버튼을 한 번 누르면, 그다음부터는 ‘보내기’ 한 번으로 바로 접수됩니다.",
        "Operator note: online submission is not activated yet. In the staff mailbox (" + to + "), open the most recent email whose subject starts with “Action Required: Activate FormSubmit on” and press the blue “ACTIVATE FORM” button once; after that, submissions go through with a single click.")));
    }
  }
  function failStatus(form) {
    setStatus(form, "err", WH.t("온라인 접수를 처리하지 못했습니다. 잠시 후 다시 시도하시거나 " + phoneKo() + "로 연락해 주세요.",
      "We could not send your submission. Please try again later or call " + phoneEn() + "."));
  }

  /* ‘기타(직접 입력)’ 선택 상자: value="other" 일 때만 직접 입력칸을 보이고 필수로 (숨기면 전송·검사에서 제외) */
  function setupOther(form) {
    var selects = form.querySelectorAll("select[data-other]");
    if (!selects.length) return;
    var sync = function () {
      selects.forEach(function (sel) {
        var input = document.getElementById(sel.getAttribute("data-other"));
        if (!input) return;
        var on = sel.value === "other";
        var wrap = input.closest(".field") || input;
        wrap.hidden = !on;
        input.disabled = !on;
        input.required = on;
        if (!on) wrap.classList.remove("has-error");
      });
    };
    selects.forEach(function (sel) {
      sel.addEventListener("change", function () {
        sync();
        // 직접 입력을 고르면 바로 입력할 수 있게 이동
        var input = document.getElementById(sel.getAttribute("data-other"));
        if (sel.value === "other" && input) input.focus();
      });
    });
    // form.reset() 뒤에는 change 가 일어나지 않으므로 초기화가 끝난 다음 다시 맞춤
    form.addEventListener("reset", function () { window.setTimeout(sync, 0); });
    sync();
  }

  document.querySelectorAll("form[data-wh-form]").forEach(function (form) {
    var noMailApp = form.getAttribute("data-fallback") === "none"; // 예전 마크업 호환
    var sending = false;
    form.setAttribute("novalidate", "");
    setupOther(form);

    // 입력을 고치면 그 항목의 오류 표시 해제 (모두 고치면 위 요약도)
    var fix = function (e) {
      var el = e.target;
      if (!el || !el.closest || !el.matches("input, select, textarea")) return;
      var host = errHost(el);
      if (host.__whErr || (host.classList && host.classList.contains("has-error"))) clearHost(host);
      if (!form.querySelector("[aria-invalid]")) {
        var box = form.querySelector(".form-alert");
        if (box) box.parentNode.removeChild(box);
      }
    };
    form.addEventListener("input", fix);
    form.addEventListener("change", fix);
    form.addEventListener("reset", function () { clearAll(form); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var hp = form.querySelector(".hp-field input");
      if (hp && hp.value) { // 스팸 봇: 보내지 않고 성공한 것처럼 표시
        form.reset();
        setStatus(form, "ok", okMessage(form));
        return;
      }
      if (!validate(form)) return;
      var msg = build(form);
      var btn = form.querySelector('[type="submit"]');

      var fallback = function (err) {
        if (err && window.console) console.warn("[온라인 접수] 전송 실패:", err.message || err);
        if (noMailApp || !composeHref(msg)) { failStatus(form); return; }
        fallbackStatus(form, msg, err); // 입력 내용은 지우지 않음
      };
      if (!WH.mail || !WH.mail.enabled) { fallback(); return; }

      sending = true;
      if (btn) btn.disabled = true;
      setStatus(form, "info", WH.t("전송 중입니다…", "Sending…"));
      var done = function () {
        sending = false;
        if (btn) btn.disabled = false;
      };
      WH.mail.send({ subject: msg.subject, rows: msg.rows, replyTo: msg.replyTo }).then(function (res) {
        if (res && res.via === "gmail") { gmailStatus(form, msg); return; } // 설정이 service:"gmail" 인 경우
        form.reset();
        setStatus(form, "ok", okMessage(form));
        form.dispatchEvent(new CustomEvent("wh:submitted"));
      }, fallback).then(done, done);
    });
  });

  /* ---------- 응원 메시지 목록 (data/cheers.json 에 게시된 것만) ---------- */
  var wall = document.getElementById("cheer-list");
  if (wall) {
    var cheers = [];
    var render = function () {
      if (!cheers.length) {
        wall.innerHTML = '<div class="cheer-empty">' + WH.icon("message").replace("<svg", '<svg style="width:34px;height:34px;margin:0 auto 10px;color:#9fb3d8"') +
          WH.t("첫 번째 희망 응원 메시지를 남겨 주세요.", "Be the first to leave a message of hope.") + "</div>";
        return;
      }
      wall.innerHTML = cheers.map(function (c) {
        return '<article class="cheer"><p>' + WH.esc(c.message) + "</p><footer><b>" + WH.esc(c.name || WH.t("익명", "Anonymous")) +
          (c.region ? " · " + WH.esc(c.region) : "") + "</b><time>" + WH.fmtDate(c.created_at) + "</time></footer></article>";
      }).join("");
    };
    WH.db.listCheers(6).then(function (r) { cheers = r || []; render(); }).catch(render);
    document.addEventListener("wh:lang", render);
  }
})();
