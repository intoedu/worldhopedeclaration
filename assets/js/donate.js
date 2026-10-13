/* ==========================================================================
   후원·헌금: 계좌 정보 표시 + 온라인 결제(PortOne V2)
   - config.portone.storeId / channelKey 가 있어야 결제 버튼이 활성화됩니다.
   - 서버가 없으므로 결제 검증 API를 호출하지 않습니다.
     결제가 끝나면 담당자에게 '온라인 후원 결제 알림' 메일(WH.mail.send)만 보냅니다.
     ※ 결제 내역의 기준(원장)은 PortOne 관리자 콘솔입니다. 알림 메일은 후원자 브라우저에서
       보내는 참고용이므로 누락·위조될 수 있습니다 → 담당자는 콘솔에서 결제번호로 대조합니다.
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var C = WH.config || {};
  var po = C.portone || {};
  var payReady = !!(po.storeId && po.channelKey);
  var PENDING_KEY = "wh-pay-pending"; // 모바일 리다이렉트 결제용 임시 저장 (sessionStorage)

  /* ---------- 준비 상태: 계좌도 결제도 아직 없으면 '준비 중' 안내 한 장만 (방법·신청서는 숨김) ---------- */
  var bankReady = !!((C.bank || {}).account);
  var givingReady = bankReady || payReady;
  Array.prototype.forEach.call(document.querySelectorAll("[data-giving-ready]"), function (el) { el.hidden = !givingReady; });
  Array.prototype.forEach.call(document.querySelectorAll("[data-giving-pending]"), function (el) { el.hidden = givingReady; });

  /* ---------- 계좌 정보 ---------- */
  function renderBank() {
    var box = document.getElementById("bank-box");
    if (!box) return;
    var b = C.bank || {};
    if (b.account) {
      box.innerHTML = '<div class="account-box"><small>' + WH.esc(WH.pick(b.name)) + '</small><div class="acct">' + WH.esc(b.account) +
        '</div><div class="holder">' + WH.t("예금주", "Account holder") + " " + WH.esc(WH.pick(b.holder)) + "</div></div>" +
        '<button type="button" class="btn btn-outline btn-block" data-copy="' + WH.esc(WH.pick(b.name) + " " + b.account) + '">' + WH.icon("copy") + WH.t("계좌번호 복사", "Copy account number") + "</button>";
      WH.fillIcons(box);
    } else {
      box.innerHTML = '<div class="account-box"><small>' + WH.t("후원 계좌", "Bank account") + '</small><div class="acct">' + WH.t("계좌 안내 준비 중", "Coming soon") +
        '</div><div class="holder">' + WH.t("계좌 확정 후 안내됩니다 · 문의 ", "Details to be announced · Call ") + WH.esc(C.phone) + "</div></div>";
    }
  }
  renderBank();
  document.addEventListener("wh:lang", renderBank);

  /* ---------- 온라인 결제 ---------- */
  var form = document.getElementById("pay-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var customWrap = form.querySelector("#pay-custom-wrap");
  var customInput = form.querySelector("#pay-custom");
  var submitBtn = form.querySelector('[type="submit"]');
  var readyNote = document.getElementById("pay-not-ready");

  var METHOD_KO = {
    CARD: "신용·체크카드",
    EASY_PAY: "간편결제",
    TRANSFER: "계좌이체",
    VIRTUAL_ACCOUNT: "가상계좌",
    MOBILE: "휴대폰 결제"
  };

  function say(type, msg) { status.className = "form-status " + type; status.textContent = msg; }
  function amount() {
    var v = (form.querySelector('input[name="amount"]:checked') || {}).value;
    if (v === "custom") return parseInt(String(customInput.value).replace(/[^0-9]/g, ""), 10) || 0;
    return parseInt(v, 10) || 0;
  }
  function won(n) { return Number(n || 0).toLocaleString("ko-KR"); }
  /* 한국 표준시 "YYYY-MM-DD HH:MM:SS (KST)" — 방문자 기기 시간대와 무관 */
  function kstNow() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ") + " (KST)";
  }

  /* sessionStorage (사생활 보호 모드 등에서 실패할 수 있어 try/catch) */
  function savePending(info) {
    try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(info)); } catch (e) {}
  }
  function takePending(paymentId) {
    var info = null;
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      sessionStorage.removeItem(PENDING_KEY);
      info = raw ? JSON.parse(raw) : null;
    } catch (e) { info = null; }
    return info && info.paymentId === paymentId ? info : null;
  }

  /* 담당자에게 결제 알림 메일. 실패해도 무시(결제 자체는 PortOne에 기록됨).
     service:"mailto" 설정이면 후원자 메일 앱이 열리게 되므로 보내지 않습니다. */
  function notifyStaff(info) {
    if (!info || !WH.mail || !WH.mail.enabled || WH.mail.service !== "formsubmit") return Promise.resolve(null);
    var method = info.payMethod || "CARD";
    return WH.mail.send({
      subject: "[세계희망연대] 온라인 후원 결제 알림 - " + info.name + " " + won(info.amount) + "원",
      rows: [
        ["후원자", info.name],
        ["연락처", info.phone],
        ["이메일", info.email],
        ["금액", won(info.amount) + "원"],
        ["결제번호", info.paymentId],
        ["결제수단", (METHOD_KO[method] || method) + " (" + method + ")"],
        ["결제 시각", kstNow()],
        ["접수 언어", info.lang === "en" ? "English" : "한국어"],
        ["확인 안내", "후원자 브라우저에서 결제 완료 직후 자동 발송된 알림입니다. 실제 결제 여부와 금액은 PortOne 관리자 콘솔에서 결제번호로 확인해 주세요."]
      ],
      replyTo: info.email || ""
    }).catch(function () { return null; });
  }

  /* 결제 성공 → 알림 메일(결과와 무관) + 감사 문구 */
  function succeeded(info, paymentId) {
    if (info) notifyStaff(info);
    form.reset();
    customWrap.hidden = true;
    say("ok", WH.t("후원해 주셔서 감사합니다. 귀한 마음이 희망의 선교행진에 쓰이겠습니다.", "Thank you for your gift. It will be used for the mission march of hope.") +
      (paymentId ? " " + WH.t("(결제번호 ", "(Payment ID ") + paymentId + ")" : ""));
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "amount") {
      var custom = e.target.value === "custom";
      customWrap.hidden = !custom;
      if (custom) customInput.focus();
    }
  });
  if (!payReady) {
    submitBtn.disabled = true;
    if (readyNote) readyNote.hidden = false;
  }

  /* 모바일 결제: 결제창에서 리다이렉트로 돌아온 경우 (?paymentId=...&code=...)
     주소의 값은 누구나 조작할 수 있으므로 화면에 그대로 옮기지 않습니다.
     감사 문구는 이 탭에서 시작한 결제(저장된 후원자 정보와 결제번호 일치)일 때만 표시합니다. */
  var retId = WH.param("paymentId");
  if (retId) {
    var pending = takePending(retId);
    var code = WH.param("code");
    if (code) {
      say("err", WH.t("결제가 취소되었거나 완료되지 않았습니다.", "Payment was cancelled or not completed.") +
        (/^[A-Za-z0-9_]{1,40}$/.test(code) ? " (" + code + ")" : ""));
    } else if (pending) {
      succeeded(pending, pending.paymentId);
    } else {
      say("info", WH.t("이 화면에서 결제 결과를 확인하지 못했습니다. 결제 완료 여부는 카드사·결제 앱 내역에서 확인해 주시고, 궁금하신 점은 전국대표전화(" + (C.phone || "") + ")로 문의해 주세요.",
        "We could not confirm the payment result on this page. Please check your card or payment app history, or call " + (C.phone || "") + " if you have questions."));
    }
    try { history.replaceState(null, "", location.pathname + (location.hash || "")); } catch (e) {}
    form.scrollIntoView({ block: "center" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!payReady) return;
    var amt = amount();
    if (amt < 1000) { say("err", WH.t("후원 금액을 1,000원 이상으로 입력해 주세요.", "Please enter an amount of at least KRW 1,000.")); return; }
    var name = form.querySelector("#pay-name").value.trim();
    var phone = form.querySelector("#pay-phone").value.trim();
    var email = form.querySelector("#pay-email").value.trim();
    if (!name || !phone) { say("err", WH.t("이름과 연락처를 입력해 주세요.", "Please enter your name and phone number.")); return; }
    if (phone.replace(/[^0-9]/g, "").length < 9) { say("err", WH.t("연락처를 정확히 입력해 주세요. (숫자 9자리 이상)", "Please enter a valid phone number (at least 9 digits).")); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say("err", WH.t("이메일 주소 형식을 확인해 주세요.", "Please check the email address.")); return; }
    if (!form.querySelector("#pay-consent").checked) { say("err", WH.t("개인정보 수집·이용에 동의해 주세요.", "Please agree to the collection and use of personal information.")); return; }

    var paymentId = "wh-" + Date.now() + "-" + (Math.random().toString(36).slice(2) + "00000000").slice(0, 8);
    var info = {
      paymentId: paymentId,
      name: name,
      phone: phone,
      email: email,
      amount: amt,
      payMethod: po.payMethod || "CARD",
      lang: WH.lang()
    };
    savePending(info); // 모바일은 결제 후 페이지가 새로 열리므로 미리 저장
    submitBtn.disabled = true;
    say("info", WH.t("결제창을 여는 중입니다…", "Opening payment window…"));
    WH.loadScript("https://cdn.portone.io/v2/browser-sdk.js").then(function () {
      return window.PortOne.requestPayment({
        storeId: po.storeId,
        channelKey: po.channelKey,
        paymentId: paymentId,
        orderName: WH.pick(C.name) + " " + WH.t("후원", "Donation"),
        totalAmount: amt,
        currency: "CURRENCY_KRW",
        payMethod: po.payMethod || "CARD",
        customer: { fullName: name, phoneNumber: phone, email: email || undefined },
        redirectUrl: WH.pageUrl("donate.html")
      });
    }).then(function (res) {
      if (!res) return; // 리다이렉트 방식: 돌아온 뒤 위에서 처리
      takePending(paymentId); // PC 결제: 임시 저장 정보 정리
      if (res.code) { say("err", WH.t("결제가 완료되지 않았습니다: ", "Payment not completed: ") + (res.message || res.code)); return; }
      // 결제 완료가 기준. 알림 메일 성공 여부와 관계없이 감사 문구 표시
      succeeded(info, res.paymentId || paymentId);
    }).catch(function () {
      takePending(paymentId);
      say("err", WH.t("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "Could not load the payment module. Please try again later."));
    }).then(function () { submitBtn.disabled = false; });
  });
})();
