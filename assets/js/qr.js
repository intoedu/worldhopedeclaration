/* QR코드 만들기 페이지: 홈페이지·메뉴별 QR 생성 → PNG / SVG 저장, 인쇄 */
(function () {
  "use strict";
  var WH = window.WH;
  var $ = function (s) { return document.querySelector(s); };
  var canvas = $("#qr-canvas");
  if (!canvas) return;

  var targetSel = $("#qr-target"), baseInput = $("#qr-base"), customWrap = $("#qr-custom-wrap"), customInput = $("#qr-custom");
  var sizeSel = $("#qr-size"), logoChk = $("#qr-logo"), capChk = $("#qr-caption-on"), capInput = $("#qr-caption-text");
  var capEl = $("#qr-caption"), urlEl = $("#qr-url");
  var base = WH.baseUrl();
  baseInput.value = base;
  var preset = WH.param("target");
  if (preset) {
    var opt = Array.prototype.find.call(targetSel.options, function (o) { return o.value === preset; });
    if (opt) targetSel.value = preset;
  }
  var isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  var warn = $("#qr-base-warn");
  if (warn) warn.hidden = !(isLocal && !WH.config.siteUrl);

  function color() { return (document.querySelector('input[name="qr-color"]:checked') || {}).value || "#0b1f44"; }
  function currentUrl() {
    if (targetSel.value === "custom") return customInput.value.trim();
    var b = baseInput.value.trim();
    if (b && !/^https?:\/\//i.test(b)) b = "https://" + b;
    b = b.replace(/\/+$/, "") + "/";
    return b + targetSel.value;
  }
  function captionText() {
    if (!capChk.checked) return "";
    return capInput.value.trim();
  }

  var renderSeq = 0;
  function render() {
    var url = currentUrl();
    customWrap.hidden = targetSel.value !== "custom";
    urlEl.textContent = url || WH.t("주소를 입력해 주세요.", "Please enter a URL.");
    capEl.hidden = !capChk.checked;
    capEl.innerHTML = WH.esc(captionText()) + "<small>" + WH.esc(url.replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</small>";
    if (!url) { canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); return; }
    var seq = ++renderSeq;
    WH.loadQR().then(function () {
      if (seq !== renderSeq) return;
      return WH.drawQR(canvas, url, { size: 560, color: color(), logo: logoChk.checked, margin: 2 });
    }).catch(function () {
      WH.toast(WH.t("주소가 너무 길어 QR코드를 만들 수 없습니다.", "The URL is too long for a QR code."));
    });
  }

  /* 저장용 고해상도 이미지(캡션 포함) */
  function exportCanvas() {
    var size = parseInt(sizeSel.value, 10) || 1024;
    var qrC = document.createElement("canvas");
    return WH.drawQR(qrC, currentUrl(), { size: size, color: color(), logo: logoChk.checked, margin: 4 }).then(function () {
      var cap = captionText();
      if (!cap) return qrC;
      var out = document.createElement("canvas");
      var capH = Math.round(size * 0.14);
      out.width = size; out.height = size + capH;
      var ctx = out.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(qrC, 0, 0);
      ctx.fillStyle = color();
      ctx.textAlign = "center";
      ctx.font = "800 " + Math.round(size * 0.05) + "px 'Pretendard Variable', Pretendard, sans-serif";
      ctx.fillText(cap, size / 2, size + capH * 0.38);
      ctx.fillStyle = "#667085";
      ctx.font = "500 " + Math.round(size * 0.026) + "px 'Pretendard Variable', Pretendard, sans-serif";
      ctx.fillText(currentUrl().replace(/^https?:\/\//, "").replace(/\/$/, ""), size / 2, size + capH * 0.72);
      return out;
    });
  }
  function fileBase() {
    var t = targetSel.value === "custom" ? "custom" : (targetSel.value.replace(".html", "") || "home");
    return "worldhope-qr-" + t;
  }

  function svgString() {
    return WH.loadQR().then(function () {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs["UTF-8"];
      var qr = qrcode(0, logoChk.checked ? "H" : "M");
      qr.addData(currentUrl()); qr.make();
      var n = qr.getModuleCount(), m = 4, total = n + m * 2;
      var cap = captionText();
      var capH = cap ? total * 0.14 : 0;
      var d = "";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
      var parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + " " + (total + capH) + '" width="1024" height="' + Math.round(1024 * (total + capH) / total) + '" shape-rendering="crispEdges">',
        '<rect width="100%" height="100%" fill="#ffffff"/>',
        '<path fill="' + color() + '" d="' + d + '"/>'
      ];
      var finish = function (logoData) {
        if (logoData) {
          var box = total * 0.22, pad = total * 0.022, bx = (total - box) / 2;
          parts.push('<rect x="' + (bx - pad) + '" y="' + (bx - pad) + '" width="' + (box + pad * 2) + '" height="' + (box + pad * 2) + '" rx="' + total * 0.03 + '" fill="#ffffff"/>');
          parts.push('<image x="' + bx + '" y="' + bx + '" width="' + box + '" height="' + box + '" href="' + logoData + '"/>');
        }
        if (cap) {
          parts.push('<text x="' + total / 2 + '" y="' + (total + capH * 0.38) + '" text-anchor="middle" font-family="Pretendard, \'Apple SD Gothic Neo\', sans-serif" font-weight="800" font-size="' + (total * 0.05) + '" fill="' + color() + '">' + WH.esc(cap) + "</text>");
          parts.push('<text x="' + total / 2 + '" y="' + (total + capH * 0.72) + '" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="' + (total * 0.026) + '" fill="#667085">' + WH.esc(currentUrl().replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</text>");
        }
        parts.push("</svg>");
        return parts.join("");
      };
      if (!logoChk.checked) return finish(null);
      return fetch(WH.ROOT + "assets/img/logo.svg").then(function (r) { return r.text(); })
        .then(function (txt) { return finish("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(txt)))); })
        .catch(function () { return finish(null); });
    });
  }

  $("#qr-png").addEventListener("click", function () {
    if (!currentUrl()) return;
    exportCanvas().then(function (c) { WH.downloadCanvas(c, fileBase() + ".png"); });
  });
  $("#qr-svg").addEventListener("click", function () {
    if (!currentUrl()) return;
    svgString().then(function (svg) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      a.download = fileBase() + ".svg";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    });
  });
  $("#qr-print").addEventListener("click", function () {
    document.body.classList.add("print-qr");
    window.print();
    setTimeout(function () { document.body.classList.remove("print-qr"); }, 500);
  });
  $("#qr-copy").addEventListener("click", function () { if (currentUrl()) WH.copy(currentUrl()); });

  [targetSel, sizeSel].forEach(function (el) { el.addEventListener("change", render); });
  [baseInput, customInput, capInput].forEach(function (el) { el.addEventListener("input", render); });
  [logoChk, capChk].forEach(function (el) { el.addEventListener("change", render); });
  document.querySelectorAll('input[name="qr-color"]').forEach(function (el) { el.addEventListener("change", render); });
  document.addEventListener("wh:lang", function () {
    if (!capInput.dataset.touched) capInput.value = capInput.getAttribute(WH.lang() === "en" ? "data-en-value" : "data-ko-value");
    render();
  });
  capInput.addEventListener("input", function () { capInput.dataset.touched = "1"; });
  if (!capInput.dataset.touched) capInput.value = capInput.getAttribute(WH.lang() === "en" ? "data-en-value" : "data-ko-value");
  render();
})();
