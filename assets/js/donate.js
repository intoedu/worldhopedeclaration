/* ==========================================================================
   후원·헌금: 계좌 정보 표시 + 온라인 결제(PortOne V2)
   - config.portone.storeId / channelKey 가 있어야 결제 버튼이 활성화됩니다.
   - 결제 검증은 Supabase Edge Function(verify-payment)에서 PortOne API로 확인 후 기록합니다.
   ========================================================================== */
(function () {
  "use strict";
  var WH = window.WH;
  var C = WH.config;
  var po = C.portone || {};
  var payReady = !!(po.storeId && po.channelKey);

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

  function say(ok, msg) { status.className = "form-status " + (ok ? "ok" : "err"); status.textContent = msg; }
  function amount() {
    var v = (form.querySelector('input[name="amount"]:checked') || {}).value;
    if (v === "custom") return parseInt(String(customInput.value).replace(/[^0-9]/g, ""), 10) || 0;
    return parseInt(v, 10) || 0;
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

  function verify(paymentId) {
    var sb = C.supabase || {};
    if (!(sb.url && sb.anonKey)) return Promise.resolve({ ok: true, unverified: true });
    return fetch(sb.url.replace(/\/$/, "") + "/functions/v1/verify-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: sb.anonKey, Authorization: "Bearer " + sb.anonKey },
      body: JSON.stringify({ paymentId: paymentId })
    }).then(function (r) { return r.json(); });
  }
  function done(res) {
    if (res && res.ok) {
      form.reset(); customWrap.hidden = true;
      say(true, WH.t("후원해 주셔서 감사합니다. 귀한 마음이 희망의 선교행진에 쓰이겠습니다.", "Thank you for your gift. It will be used for the mission march of hope."));
    } else {
      say(false, WH.t("결제 확인에 실패했습니다. 전국대표전화 " + C.phone + "로 문의해 주세요.", "Payment could not be verified. Please call " + C.phone + "."));
    }
  }

  // 모바일 결제 후 리다이렉트로 돌아온 경우
  var retId = WH.param("paymentId");
  if (retId) {
    if (WH.param("code")) say(false, WH.t("결제가 취소되었거나 실패했습니다: ", "Payment was cancelled or failed: ") + (WH.param("message") || ""));
    else verify(retId).then(done).catch(function () { done(null); });
    history.replaceState(null, "", location.pathname);
    form.scrollIntoView({ block: "center" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!payReady) return;
    var amt = amount();
    if (amt < 1000) { say(false, WH.t("후원 금액을 1,000원 이상으로 입력해 주세요.", "Please enter an amount of at least KRW 1,000.")); return; }
    var name = form.querySelector("#pay-name").value.trim();
    var phone = form.querySelector("#pay-phone").value.trim();
    var email = form.querySelector("#pay-email").value.trim();
    if (!name || !phone) { say(false, WH.t("이름과 연락처를 입력해 주세요.", "Please enter your name and phone number.")); return; }
    if (!form.querySelector("#pay-consent").checked) { say(false, WH.t("개인정보 수집·이용에 동의해 주세요.", "Please agree to the collection and use of personal information.")); return; }

    var paymentId = "wh-" + Date.now() + "-" + (Math.random().toString(36).slice(2) + "00000000").slice(0, 8);
    submitBtn.disabled = true;
    say(true, WH.t("결제창을 여는 중입니다…", "Opening payment window…"));
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
      if (!res) return;
      if (res.code) { say(false, WH.t("결제가 완료되지 않았습니다: ", "Payment not completed: ") + (res.message || res.code)); return; }
      say(true, WH.t("결제 확인 중입니다…", "Verifying payment…"));
      return verify(res.paymentId || paymentId).then(done);
    }).catch(function () {
      say(false, WH.t("결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", "Could not load the payment module. Please try again later."));
    }).finally(function () { submitBtn.disabled = false; });
  });
})();
