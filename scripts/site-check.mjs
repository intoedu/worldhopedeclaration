// 실제 홈페이지 점검 (GitHub Actions 'Live site check' 가 배포 직후와 매주 실행)
//   node scripts/site-check.mjs                      → https://www.worldhopedeclaration.com 점검
//   SITE_URL=http://127.0.0.1:8000/worldhopedeclaration node scripts/site-check.mjs   → 다른 주소 점검
// 확인하는 것
//   · 모든 페이지(sitemap.xml + 검색 제외 페이지)가 PC·휴대폰 화면에서 열리는지, 스크립트 오류가 없는지
//   · 같은 사이트 안의 파일(CSS·JS·이미지·데이터)이 빠짐없이 불러와지는지, 페이지 안 링크가 살아 있는지
//   · http:// 주소와 www 없는 주소가 https://www… 로 넘어가는지, 보안 인증서가 넉넉히 남았는지
//   · 온라인 접수 서비스(FormSubmit)에 연결되는지 (시험 메일은 보내지 않음 — 활성화 여부는 관리자 화면의 ‘온라인 접수 점검하기’)
// 문제가 있으면 끝에서 실패(exit 1)로 끝나 GitHub Actions 에 빨간 표시가 납니다.
import { chromium } from "playwright";
import { readFileSync, appendFileSync, existsSync } from "node:fs";
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
  // 온라인 접수 서비스 연결 (시험 메일은 보내지 않음)
  try {
    const r = await fetch("https://formsubmit.co/", { method: "GET" });
    if (r.status >= 500) fail(`온라인 접수 서비스(FormSubmit) 응답 이상: HTTP ${r.status}`);
    else note(`온라인 접수 서비스(FormSubmit) 연결됨 (HTTP ${r.status})`);
  } catch (e) { fail(`온라인 접수 서비스(FormSubmit)에 연결하지 못함 — ${e.message}`); }
}

const summary = [
  `## 홈페이지 점검 — ${BASE}`,
  `페이지 ${paths.length}개 × PC·휴대폰, 같은 사이트 링크 ${links.size}개`,
  problems.length ? `### ❌ 문제 ${problems.length}건\n` + problems.map((m) => "- " + m).join("\n") : "### ✅ 문제 없음",
  notes.length ? "### 참고\n" + notes.map((m) => "- " + m).join("\n") : "",
].join("\n\n");
if (process.env.GITHUB_STEP_SUMMARY && existsSync(dirname(process.env.GITHUB_STEP_SUMMARY))) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
console.log("\n" + summary);
process.exit(problems.length ? 1 : 0);
