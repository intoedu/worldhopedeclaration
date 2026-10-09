/* ==========================================================================
   공개 폼 처리 (문의·참여 신청 / 정기후원 신청 / 응원 메시지)
   <form data-wh-form="테이블명" data-fallback="mailto|none" data-subject-ko="..." data-subject-en="...">
   - Supabase 연결 시: 해당 테이블에 저장 (관리자 페이지에서 확인)
   - 미연결 시: mailto 로 메일 앱을 열어 접수하거나(fallback=mailto), 준비 중 안내(fallback=none)
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var C = WH.config;

  function setStatus(form, ok, msg) {
    var el = form.querySelector(".form-status");
    if (!el) { el = document.createElement("p"); el.className = "form-status"; el.setAttribute("role", "status"); form.appendChild(el); }
    el.className = "form-status " + (ok ? "ok" : "err");
    el.textContent = msg;
  }
  function collect(form) {
    var row = {}, lines = [];
    form.querySelectorAll("[name]").forEach(function (el) {
      var name = el.name;
      if (!name || el.closest(".hp-field") || el.dataset.skip !== undefined) return;
      if ((el.type === "radio") && !el.checked) return;
      var v;
      if (el.type === "checkbox") v = el.checked;
      else v = (el.value || "").trim();
      if (el.dataset.type === "int") v = v === "" ? null : parseInt(String(v).replace(/[^0-9]/g, ""), 10) || null;
      if (v === "" ) v = null;
      row[name] = v;
      var label = form.querySelector('label[for="' + el.id + '"]');
      var labelSpan = label && label.querySelector(WH.lang() === "en" ? ".en" : ".ko");
      var labelText = el.dataset.label || (label ? (labelSpan || label).textContent.replace("*", "").trim() : name);
      var shown = el.type === "checkbox" ? (v ? "예" : "아니오") : (el.tagName === "SELECT" ? el.options[el.selectedIndex].text : v);
      if (name !== "consent" && shown != null && shown !== "") lines.push("■ " + labelText + "\n" + shown);
    });
    return { row: row, lines: lines };
  }
  function validate(form) {
    var firstBad = null;
    form.querySelectorAll(".field").forEach(function (f) { f.classList.remove("has-error"); });
    form.querySelectorAll("[required]").forEach(function (el) {
      var bad = el.type === "checkbox" ? !el.checked : !String(el.value || "").trim();
      if (!bad && el.type === "email" && el.value) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
      if (!bad && el.type === "tel" && el.value) bad = String(el.value).replace(/[^0-9]/g, "").length < 9;
      if (bad) {
        var f = el.closest(".field"); if (f) f.classList.add("has-error");
        if (!firstBad) firstBad = el;
      }
    });
    if (firstBad) {
      firstBad.focus();
      var consent = firstBad.type === "checkbox";
      setStatus(form, false, consent
        ? WH.t("개인정보 수집·이용에 동의해 주세요.", "Please agree to the collection and use of personal information.")
        : WH.t("필수 항목을 확인해 주세요.", "Please check the required fields."));
      return false;
    }
    return true;
  }

  document.querySelectorAll("form[data-wh-form]").forEach(function (form) {
    var table = form.getAttribute("data-wh-form");
    var fallback = form.getAttribute("data-fallback") || "mailto";
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var hp = form.querySelector(".hp-field input");
      if (hp && hp.value) return; // 스팸 봇
      if (!validate(form)) return;
      var data = collect(form);
      var row = data.row;
      delete row.consent;
      row.lang = WH.lang();
      var btn = form.querySelector('[type="submit"]');

      if (WH.db.enabled) {
        if (btn) btn.disabled = true;
        WH.db.insert(table, row).then(function () {
          form.reset();
          setStatus(form, true, form.getAttribute("data-ok-" + WH.lang()) || WH.t("정상적으로 접수되었습니다. 감사합니다.", "Submitted successfully. Thank you."));
          form.dispatchEvent(new CustomEvent("wh:submitted"));
        }).catch(function () {
          setStatus(form, false, WH.t("접수 중 오류가 발생했습니다. 전국대표전화 " + C.phone + "로 연락해 주세요.", "Something went wrong. Please call " + C.phone + "."));
        }).finally(function () { if (btn) btn.disabled = false; });
        return;
      }

      if (fallback === "mailto" && C.inquiryEmail) {
        var subject = (WH.lang() === "en" ? form.getAttribute("data-subject-en") : form.getAttribute("data-subject-ko")) || "[홈페이지] 접수";
        var who = row.name ? " - " + row.name : "";
        var body = data.lines.join("\n\n");
        location.href = "mailto:" + C.inquiryEmail + "?subject=" + encodeURIComponent(subject + who) + "&body=" + encodeURIComponent(body);
        setStatus(form, true, WH.t("메일 앱이 열리면 ‘보내기’를 눌러 접수를 완료해 주세요. 메일 앱이 없으시면 " + C.phone + "로 연락해 주세요.",
          "Your email app will open — press Send to complete. If it doesn’t, please call " + C.phone + "."));
        return;
      }
      setStatus(form, false, WH.t("온라인 접수는 정식 오픈 후 이용하실 수 있습니다. (시안 단계)", "Online submission will be available after launch. (Draft)"));
    });
  });

  /* ---------- 응원 메시지 목록 ---------- */
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
    WH.db.listCheers(6).then(function (r) { cheers = r; render(); }).catch(render);
    document.addEventListener("wh:lang", render);
  }
})();
