// 실제 홈페이지 점검 (GitHub Actions 'Live site check' 가 배포 직후와 매주 실행)
//   node scripts/site-check.mjs                      → https://www.worldhopedeclaration.com 점검
//   SITE_URL=http://127.0.0.1:8000/worldhopedeclaration node scripts/site-check.mjs   → 다른 주소 점검
// 확인하는 것
//   · 모든 페이지(sitemap.xml + 검색 제외 페이지)가 PC·휴대폰 화면에서 열리는지, 스크립트 오류가 없는지
//   · 같은 사이트 안의 파일(CSS·JS·이미지·데이터)이 빠짐없이 불러와지는지, 페이지 안 링크가 살아 있는지
//   · http:// 주소와 www 없는 주소가 https://www… 로 넘어가는지, 보안 인증서가 넉넉히 남았는지
//   · 온라인 접수: ‘메일로 접수’ 방식이면 참여 신청서를 채워 보내기 → 받는 사람이 채워진 메일 창이 열리는지(메일은 보내지 않음),
//     자동 전송(FormSubmit) 방식이면 서비스에 연결되는지 (시험 메일은 보내지 않음 — 활성화 여부는 관리자 화면의 ‘온라인 접수 점검하기’)
//   · 도메인 만료일과 정지(hold) 여부, 공유 이미지·sitemap·robots, 없는 주소의 안내(404) 페이지
//   · 배포 반영: 저장소 최신 파일(HTML·JS·CSS·data)과 실제 홈페이지 파일이 같은지 (배포가 조용히 멈추는 일 대비)
// 문제가 있으면 끝에서 실패(exit 1)로 끝나 GitHub Actions 에 빨간 표시가 납니다.
import { chromium } from "playwright";
import { readFileSync, appendFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import tls from "node:tls";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.SITE_URL || "https://www.worldhopedeclaration.com").replace(/\/+$/, "") + "/";
const isLive = /^https:\/\/www\.worldhopedeclaration\.com\/$/.test(BASE);
const problems = [];   // 실패 처리할 문제
const notes = [];      // 참고 (실패로 보지 않음)
const fail = (m) => { problems.push(m); console.log("✗ " + m); };
const note = (m) => { notes.push(m); console.log("· " + m); };

// 점검할 페이지: sitemap.xml 의 경로 + 검색 제외 페이지
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/^\//, ""));
for (const extra of ["post.html?id=welcome", "privacy.html", "terms.html", "ministry.html", "admin/"]) if (!paths.includes(extra)) paths.push(extra);

const sameSite = (u) => u.startsWith(BASE);
// 온라인 접수 방식 (config.js 의 email.service) — "gmail": 신청자가 메일로 직접 보냄 / "formsubmit": 자동 전송
const MAIL_SERVICE = (readFileSync(join(root, "assets/js/config.js"), "utf8").match(/^\s*service:\s*"([a-z]+)"/m) || [])[1] || "formsubmit"; // 줄 맨 앞의 실제 설정만 (주석 속 예시 제외)
const IGNORE_REQ = /google\.com\/maps|maps\.google|googleapis\.com\/maps|gstatic\.com\/maps|goatcounter|googletagmanager/; // 지도·통계는 외부 사정으로 가끔 실패

const browser = await chromium.launch();
const links = new Map(); // 같은 사이트 링크 → 처음 발견한 페이지
for (const [label, opts] of [
  ["PC", { viewport: { width: 1440, height: 900 } }],
  ["휴대폰", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
]) {
  const ctx = await browser.newContext(opts);
  for (const path of paths) {
    const page = await ctx.newPage();
    const errs = [], bad = [];
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("requestfailed", (r) => { const u = r.url(); if (!IGNORE_REQ.test(u) && !/ERR_ABORTED/.test(r.failure()?.errorText || "")) bad.push(`${u} (${r.failure()?.errorText})`); });
    page.on("response", (r) => { const u = r.url(); if (r.status() >= 400 && !IGNORE_REQ.test(u) && r.request().resourceType() !== "document") bad.push(`${u} (HTTP ${r.status()})`); });
    let res;
    try { res = await page.goto(BASE + path, { waitUntil: "load", timeout: 45000 }); }
    catch (e) { fail(`[${label}] ${path}: 열리지 않음 — ${e.message.split("\n")[0]}`); await page.close(); continue; }
    if (!res || res.status() >= 400) fail(`[${label}] ${path}: HTTP ${res ? res.status() : "응답 없음"}`);
    await page.waitForTimeout(1500);
    // 아래까지 내려 늦게 불러오는 사진도 확인
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      header: !!document.querySelector("header.site-header a, #site-header-bar a"),
      footer: !!document.querySelector("footer.site-footer a"),
      brokenImgs: [...document.images].filter((i) => i.complete && i.currentSrc && i.naturalWidth === 0 && !i.closest("[hidden]")).map((i) => i.currentSrc),
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href),
    }));
    for (const e of errs) fail(`[${label}] ${path}: 스크립트 오류 — ${e}`);
    for (const b of [...new Set(bad)]) (sameSite(b) ? fail : note)(`[${label}] ${path}: 불러오지 못한 파일 — ${b}`);
    for (const i of info.brokenImgs) fail(`[${label}] ${path}: 깨진 사진 — ${i}`);
    if (info.overflow > 1) fail(`[${label}] ${path}: 화면 가로 넘침 ${info.overflow}px`);
    if (!path.startsWith("admin") && !info.header) fail(`[${label}] ${path}: 머리글(메뉴)이 그려지지 않음`);
    if (!path.startsWith("admin") && !info.footer) fail(`[${label}] ${path}: 바닥글이 그려지지 않음`);
    for (const l of info.links) if (sameSite(l) && !links.has(l.split("#")[0])) links.set(l.split("#")[0], path);
    await page.close();
  }
  await ctx.close();
}

// 온라인 접수 화면: ‘메일로 접수’ 방식이면 참여 신청서를 채워 보내기를 누르고, 받는 사람이 채워진 메일 창(컴퓨터 Gmail·휴대폰 메일 앱)이
// 열리는지 확인 (실제로 메일을 보내지는 않음). 자동 전송(formsubmit) 방식은 실제 메일이 나가므로 이 점검을 하지 않음
if (MAIL_SERVICE === "gmail") {
  const want = (readFileSync(join(root, "assets/js/config.js"), "utf8").match(/to:\s*"([^"]+@[^"]+)"/) || [])[1] || "";
  for (const [label, opts] of [
    ["PC", { viewport: { width: 1280, height: 900 } }],
    ["휴대폰", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: "Mozilla/5.0 (Linux; Android 14; SM-M366K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36" }],
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    try {
      await page.goto(BASE + "join.html#declare", { waitUntil: "load", timeout: 45000 });
      await page.waitForTimeout(1500);
      // 메일 창 열기를 가로채 주소만 기록 (실제로 열지 않음)
      await page.evaluate(() => {
        window.__opened = [];
        window.open = (u) => { window.__opened.push(String(u)); return null; };
        document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (a) { window.__opened.push(a.href); e.preventDefault(); } }, true);
      });
      const F = "#declare form[data-wh-form]";
      await page.evaluate((F) => {
        const f = document.querySelector(F);
        f.querySelectorAll("input,select,textarea").forEach((el) => {
          if (el.disabled || el.type === "hidden" || el.closest("[hidden]") || el.closest(".hp-field")) return;
          if (el.type === "checkbox") { if (el.required) el.checked = true; return; }
          if (el.tagName === "SELECT") { const o = [...el.options].find((o) => o.value && o.value !== "other"); if (o) el.value = o.value; el.dispatchEvent(new Event("change", { bubbles: true })); return; }
          if (!el.value) el.value = el.type === "email" ? "site-check@example.com" : el.type === "tel" ? "010-0000-0000" : "자동 점검";
        });
      }, F);
      await page.click(F + ' [type="submit"]');
      await page.waitForTimeout(800);
      const r = await page.evaluate((F) => ({
        opened: window.__opened || [],
        btn: (document.querySelector(F + " .form-status .form-fallback a.btn") || {}).href || "",
        status: (document.querySelector(F + " .form-status") || {}).textContent || "",
      }), F);
      const url = r.opened[0] || r.btn;
      const toOk = url && (url.startsWith("mailto:" + want) || url.includes("to=" + encodeURIComponent(want)));
      if (!toOk) fail(`[${label}] 참여 신청 보내기: 받는 사람(${want})이 채워진 메일 창이 열리지 않음 — ${(url || r.status).slice(0, 120)}`);
      else note(`[${label}] 참여 신청 보내기 → ${url.startsWith("mailto:") ? "메일 앱" : "Gmail"} 작성 창(받는 사람 ${want}) 열림 확인`);
      for (const e of errs) fail(`[${label}] 참여 신청 보내기: 스크립트 오류 — ${e}`);
    } catch (e) { fail(`[${label}] 참여 신청 보내기 점검 실패 — ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
}
await browser.close();

// 같은 사이트 링크가 모두 열리는지 (#앞부분 기준)
for (const [url, from] of links) {
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (r.status >= 400) fail(`깨진 링크: ${url.replace(BASE, "")} (HTTP ${r.status}, ${from} 에 있음)`);
  } catch (e) { fail(`깨진 링크: ${url.replace(BASE, "")} (${e.message}, ${from} 에 있음)`); }
}

if (isLive) {
  // http:// · www 없는 주소 → https://www… 로 이동하는지 (서버 이동 또는 페이지의 자동 이동)
  const b2 = await chromium.launch();
  const p2 = await b2.newPage();
  for (const start of ["http://www.worldhopedeclaration.com/", "http://worldhopedeclaration.com/", "https://worldhopedeclaration.com/"]) {
    try {
      await p2.goto(start, { waitUntil: "load", timeout: 30000 });
      await p2.waitForTimeout(1500);
      const end = p2.url();
      if (!end.startsWith("https://www.worldhopedeclaration.com/")) fail(`${start} → ${end} (https://www… 로 넘어가지 않음)`);
    } catch (e) { fail(`${start} 이 열리지 않음 — ${e.message.split("\n")[0]}`); }
  }
  await b2.close();
  // 보안 인증서 남은 기간
  const days = await new Promise((resolve) => {
    const s = tls.connect({ host: "www.worldhopedeclaration.com", port: 443, servername: "www.worldhopedeclaration.com" }, () => {
      const c = s.getPeerCertificate(); s.end();
      resolve(Math.floor((new Date(c.valid_to) - Date.now()) / 86400000));
    });
    s.on("error", () => resolve(-1));
  });
  if (days < 0) fail("보안 인증서를 확인하지 못함");
  else if (days < 14) fail(`보안 인증서가 ${days}일 남음 (GitHub 자동 갱신이 안 되고 있을 수 있음)`);
  else note(`보안 인증서 ${days}일 남음`);
  // 온라인 접수 서비스 연결 (시험 메일은 보내지 않음) — 자동 전송(formsubmit) 방식일 때만
  if (MAIL_SERVICE === "gmail") note("온라인 접수: ‘메일로 접수’ 방식(신청자가 메일 앱·Gmail로 직접 보냄) — 외부 전송 서비스 없음");
  else try {
    const r = await fetch("https://formsubmit.co/", { method: "GET" });
    // 점검 서버(데이터센터)에서는 FormSubmit 의 보안 확인(Cloudflare) 화면 때문에 403 이 오는 것이 정상 — 실제 방문자 브라우저는 통과
    if (r.status >= 500) fail(`온라인 접수 서비스(FormSubmit) 응답 이상: HTTP ${r.status}`);
    else note(`온라인 접수 서비스(FormSubmit) 서버 응답 확인 (HTTP ${r.status}${r.status === 403 ? ", 점검 서버용 보안 확인 화면 — 정상" : ""}). 활성화 여부는 관리자 화면 ‘온라인 접수 점검하기’로 확인`);
  } catch (e) { fail(`온라인 접수 서비스(FormSubmit)에 연결하지 못함 — ${e.message}`); }

  // 작업 문서·도구가 홈페이지 주소로 공개되지 않는지 (배포 때 제외 — .github/workflows/pages.yml)
  // (전 세계 캐시에 남은 예전 사본 때문에 잘못 판정하지 않도록 매번 새 주소로 확인)
  const docs = ["README.md", "CLAUDE.md", "docs/CONTENT_TODO.md", "scripts/site-check.mjs"], exposed = [];
  for (const f of docs) {
    try { const r = await fetch(BASE + f + "?check=" + Date.now(), { cache: "no-store" }); if (r.status === 200) exposed.push(f); }
    catch (e) { fail(`작업 문서 공개 여부를 확인하지 못함: ${f} — ${e.message}`); }
  }
  if (exposed.length) fail(`작업 문서가 홈페이지에 공개되어 있음: ${exposed.join(", ")}`);
  else note(`작업 문서(${docs.join(", ")})는 홈페이지에 공개되지 않음`);

  // 도메인 만료일·정지 여부 (등록 기관 공용 조회 RDAP) — 갱신을 놓치거나 소유자 이메일 인증을 안 하면 정지될 수 있음
  try {
    const r = await fetch("https://rdap.verisign.com/com/v1/domain/worldhopedeclaration.com", { headers: { Accept: "application/rdap+json" } });
    const d = await r.json();
    const exp = (d.events || []).find((e) => e.eventAction === "expiration");
    const status = (d.status || []).join(", ");
    if (/hold/i.test(status)) fail(`도메인이 정지(hold) 상태입니다: ${status} — 가비아에서 소유자 이메일 인증·결제 상태를 확인해야 합니다`);
    if (exp) {
      const left = Math.floor((new Date(exp.eventDate) - Date.now()) / 86400000);
      if (left < 30) fail(`도메인 만료까지 ${left}일 (${exp.eventDate.slice(0, 10)}) — 가비아에서 연장해야 합니다`);
      else note(`도메인 만료일 ${exp.eventDate.slice(0, 10)} (${left}일 남음)`);
    } else note("도메인 만료일을 확인하지 못함");
  } catch (e) { note(`도메인 정보 조회 실패 — ${e.message}`); }
}

// 공유 이미지·사이트맵·robots·없는 주소(404) 처리
for (const [path, want] of [["assets/img/og-image.jpg", 200], ["sitemap.xml", 200], ["robots.txt", 200], ["no-such-page-site-check.html", 404]]) {
  try {
    const r = await fetch(BASE + path);
    if (r.status !== want) fail(`${path}: HTTP ${r.status} (기대 ${want})`);
    if (want === 404 && !/site-header|세계희망연대/.test(await r.text())) fail("없는 주소에서 안내(404) 페이지가 나오지 않음");
  } catch (e) { fail(`${path}: ${e.message}`); }
}

// 배포 반영 확인: 저장소의 최신 파일과 실제 홈페이지의 파일이 같은지 (배포가 조용히 멈추는 일 대비 — 2026-10-12 실제로 겪음)
// 배포 직후에는 전 세계 캐시가 바뀌는 데 몇 분 걸릴 수 있어 최대 5번(1분 간격) 다시 확인
if (process.env.CHECK_DEPLOYED !== "0") {
  const files = [
    ...readdirSync(root).filter((f) => f.endsWith(".html")),
    ...readdirSync(join(root, "assets/js")).filter((f) => f.endsWith(".js")).map((f) => "assets/js/" + f),
    ...readdirSync(join(root, "assets/css")).filter((f) => f.endsWith(".css")).map((f) => "assets/css/" + f),
    ...readdirSync(join(root, "data")).filter((f) => f.endsWith(".json")).map((f) => "data/" + f),
  ];
  let stale = files;
  const rounds = Number(process.env.DEPLOY_RETRY_ROUNDS || 5), waitMs = Number(process.env.DEPLOY_RETRY_WAIT_MS || 60000);
  for (let round = 0; round < rounds && stale.length; round++) {
    if (round) await new Promise((r) => setTimeout(r, waitMs));
    const next = [];
    for (const f of stale) {
      try {
        const live = await (await fetch(BASE + f + (f.includes("?") ? "&" : "?") + "check=" + Date.now(), { cache: "no-store" })).text();
        if (live.replace(/\r\n/g, "\n") !== readFileSync(join(root, f), "utf8").replace(/\r\n/g, "\n")) next.push(f);
      } catch { next.push(f); }
    }
    stale = next;
  }
  if (stale.length) fail(`배포가 반영되지 않은 파일 ${stale.length}개 (저장소 최신본과 다름): ${stale.slice(0, 8).join(", ")}${stale.length > 8 ? " …" : ""} — GitHub Actions 의 'Deploy site to GitHub Pages' 실행 기록을 확인해야 합니다`);
  else note(`배포 반영 확인: 파일 ${files.length}개가 저장소 최신본과 같음`);
}

const summary = [
  `## 홈페이지 점검 — ${BASE}`,
  `페이지 ${paths.length}개 × PC·휴대폰, 같은 사이트 링크 ${links.size}개`,
  problems.length ? `### ❌ 문제 ${problems.length}건\n` + problems.map((m) => "- " + m).join("\n") : "### ✅ 문제 없음",
  notes.length ? "### 참고\n" + notes.map((m) => "- " + m).join("\n") : "",
].join("\n\n");
if (process.env.GITHUB_STEP_SUMMARY && existsSync(dirname(process.env.GITHUB_STEP_SUMMARY))) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
if (process.env.REPORT_FILE) writeFileSync(process.env.REPORT_FILE, summary + "\n");
console.log("\n" + summary);
process.exit(problems.length ? 1 : 0);
