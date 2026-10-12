/* ==========================================================================
   공개 폼 처리 (문의·참여 신청 / 정기 후원 신청 / 희망 응원 메시지)
   <form data-wh-form="inquiries|donation_applications|cheers"
         data-subject-ko="메일 제목" data-ok-ko="완료 문구" data-ok-en="Done message">
   - 서버·데이터베이스 없음: 입력 내용은 WH.mail.send(FormSubmit)로 담당자 이메일에 전달됩니다.
   - 메일 본문 항목명은 화면 언어와 관계없이 항상 한국어(라벨의 .ko 텍스트)로 보냅니다.
   - FormSubmit 전송 실패(네트워크 차단·미활성화 등) 시 방문자의 메일 앱(mailto)으로 대체합니다.
     (예전 속성 data-fallback="none" 이 있으면 메일 앱 대신 전화 안내만 표시)
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
    }
  };
  var CONSENT_LABEL = "개인정보 수집·이용 동의";

  /* 전국대표전화 안내 문구 */
  function phoneKo() { return "전국대표전화(" + (C.phone || "") + ")"; }
  function phoneEn() { return C.phone || ""; }

  /* type: "ok" | "err" | "info"(중립: 전송 중·메일 앱 안내) */
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

  /* 화면 순서대로 확인: 필수 입력, 이메일 형식, 연락처(숫자 9자리 이상) — 선택 항목도 입력했다면 형식 확인 */
  function validate(form) {
    var firstBad = null;
    form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("has-error"); });
    form.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (el.disabled || el.closest(".hp-field") || /^(submit|button|reset|hidden|file)$/.test(el.type)) return;
      var v = String(el.value || "").trim();
      var bad = false;
      if (el.required) {
        if (el.type === "checkbox") bad = !el.checked;
        else if (el.type === "radio") bad = !form.querySelector('[name="' + el.name + '"]:checked');
        else bad = !v;
      }
      if (!bad && v && el.type === "email") bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!bad && v && el.type === "tel") bad = v.replace(/[^0-9]/g, "").length < 9;
      if (bad) {
        var f = el.closest(".field"); if (f) f.classList.add("has-error");
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) {
      firstBad.focus();
      var msg;
      if (firstBad.type === "checkbox" && firstBad.name === "consent") msg = WH.t("개인정보 수집·이용에 동의해 주세요.", "Please agree to the collection and use of personal information.");
      else if (firstBad.type === "email" && firstBad.value) msg = WH.t("이메일 주소 형식을 확인해 주세요.", "Please check the email address.");
      else if (firstBad.type === "tel" && firstBad.value) msg = WH.t("연락처를 정확히 입력해 주세요. (숫자 9자리 이상)", "Please enter a valid phone number (at least 9 digits).");
      else msg = WH.t("필수 항목을 확인해 주세요.", "Please check the required fields.");
      setStatus(form, "err", msg);
      return false;
    }
    return true;
  }

  /* 메일 앱(mailto)으로 대체 접수. 받는 주소가 없으면(별칭만 설정 등) 공개 이메일 사용, 그것도 없으면 false */
  function openMailApp(msg) {
    var href = WH.mail.mailtoHref(msg.subject, msg.rows);
    if (/^mailto:\?/.test(href)) {
      if (!/@/.test(C.publicEmail || "")) return false;
      href = "mailto:" + C.publicEmail + href.slice(7);
    }
    location.href = href;
    return true;
  }
  function mailAppStatus(form, failed) {
    setStatus(form, "info", failed
      ? WH.t("온라인 전송이 원활하지 않아 메일 앱을 열었습니다. 작성된 내용을 확인하신 뒤 ‘보내기’를 눌러 접수를 완료해 주세요. 메일 앱이 열리지 않으면 " + phoneKo() + "로 연락해 주세요.",
        "Online delivery did not go through, so your email app has been opened. Please review the prefilled message and press Send to complete. If no email app opened, please call " + phoneEn() + ".")
      : WH.t("메일 앱이 열렸습니다. 작성된 내용을 확인하신 뒤 ‘보내기’를 눌러 접수를 완료해 주세요. 메일 앱이 열리지 않으면 " + phoneKo() + "로 연락해 주세요.",
        "Your email app has been opened. Please review the prefilled message and press Send to complete. If no email app opened, please call " + phoneEn() + "."));
  }
  function failStatus(form) {
    setStatus(form, "err", WH.t("온라인 접수를 처리하지 못했습니다. 잠시 후 다시 시도하시거나 " + phoneKo() + "로 연락해 주세요.",
      "We could not send your submission. Please try again later or call " + phoneEn() + "."));
  }

  document.querySelectorAll("form[data-wh-form]").forEach(function (form) {
    var noMailApp = form.getAttribute("data-fallback") === "none"; // 예전 마크업 호환
    var sending = false;
    form.setAttribute("novalidate", "");

    // 입력을 고치면 오류 표시 해제
    form.addEventListener("input", function (e) {
      var f = e.target.closest && e.target.closest(".field.has-error");
      if (f) f.classList.remove("has-error");
    });

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

      var fallback = function () {
        if (noMailApp || !openMailApp(msg)) { failStatus(form); return; }
        mailAppStatus(form, true); // 입력 내용은 지우지 않음 (메일 앱이 안 열렸을 때 다시 시도 가능)
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
        if (res && res.via === "mailto") { mailAppStatus(form, false); return; } // 설정이 service:"mailto" 인 경우
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
