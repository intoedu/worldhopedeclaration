// 사이트 주소(도메인)가 정해지거나 바뀔 때 한 번 실행한 뒤 커밋합니다.
//   GitHub Pages 기본 주소:  node scripts/set-domain.mjs https://intoedu.github.io/worldhopedeclaration
//   연결 도메인:            node scripts/set-domain.mjs https://www.example.org
// - assets/js/config.js 의 siteUrl 설정 (QR코드·공유 링크 기준 주소)
// - 각 페이지에 canonical / og:url / 절대경로 og:image 반영
// - sitemap.xml 생성, robots.txt 에 Sitemap 줄 추가
// - 연결 도메인이면 저장소 최상위에 CNAME 파일(호스트 이름 한 줄) 생성,
//   *.github.io 주소면 CNAME 을 만들지 않고 기존 CNAME 은 삭제
// 여러 번 실행해도 안전합니다(주소를 바꾸면 그 값으로 다시 반영).
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (process.argv[2] || "").trim();
let parsed = null;
try {
  if (/^https?:\/\/[^/]+/i.test(arg)) parsed = new URL(arg);
} catch (e) {
  parsed = null;
}
if (!parsed || parsed.search || parsed.hash || parsed.username || parsed.password) {
  console.error("사용법: node scripts/set-domain.mjs https://www.example.org");
  console.error("        node scripts/set-domain.mjs https://intoedu.github.io/worldhopedeclaration");
  process.exit(1);
}

const host = parsed.hostname.toLowerCase();
const path = parsed.pathname.replace(/\/+$/, ""); // "" 또는 "/worldhopedeclaration"
const base = `${parsed.protocol}//${parsed.host.toLowerCase()}${path}`;
const isGithubIo = /\.github\.io$/.test(host);

// config.js 의 GitHub 저장소 정보 (안내 문구용)
const cfgPath = join(root, "assets/js/config.js");
let cfg = readFileSync(cfgPath, "utf8");
const ghBlock = (cfg.match(/github:\s*\{([\s\S]*?)\}/) || [])[1] || "";
const ghOwner = (ghBlock.match(/owner:\s*"([^"]*)"/) || [])[1] || "intoedu";
const ghRepo = (ghBlock.match(/repo:\s*"([^"]*)"/) || [])[1] || "worldhopedeclaration";

const pages = ["index.html", "about.html", "ministry.html", "news.html", "gallery.html", "donate.html", "contact.html", "faq.html", "qr.html", "post.html", "privacy.html"];
const indexable = pages.filter((p) => !["post.html", "privacy.html"].includes(p));

// config.js
cfg = cfg.replace(/siteUrl: "[^"]*"/, `siteUrl: "${base}"`);
writeFileSync(cfgPath, cfg);

// 페이지 메타
for (const p of pages) {
  const file = join(root, p);
  if (!existsSync(file)) continue;
  let html = readFileSync(file, "utf8");
  const url = p === "index.html" ? `${base}/` : `${base}/${p}`;
  html = html.replace(/\n<link rel="canonical"[^>]*>/g, "").replace(/\n<meta property="og:url"[^>]*>/g, "");
  html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${base}/assets/img/og-image.png">`);
  if (p !== "post.html") {
    html = html.replace(/(<meta property="og:image"[^>]*>)/, `$1\n<meta property="og:url" content="${url}">\n<link rel="canonical" href="${url}">`);
  }
  writeFileSync(file, html);
}

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const urls = indexable.map((p) => `  <url><loc>${p === "index.html" ? base + "/" : base + "/" + p}</loc><lastmod>${today}</lastmod></url>`).join("\n");
writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

// robots.txt (검색엔진은 도메인 최상위의 robots.txt 만 읽습니다)
writeFileSync(join(root, "robots.txt"), `User-agent: *\nDisallow: /admin/\nSitemap: ${base}/sitemap.xml\n`);

// CNAME (GitHub Pages 연결 도메인)
const cnamePath = join(root, "CNAME");
let cnameNote;
if (isGithubIo) {
  if (existsSync(cnamePath)) {
    unlinkSync(cnamePath);
    cnameNote = "CNAME 삭제(github.io 기본 주소 사용)";
  } else {
    cnameNote = "CNAME 없음(github.io 기본 주소 사용)";
  }
} else {
  writeFileSync(cnamePath, `${host}\n`);
  cnameNote = `CNAME = ${host}`;
}

console.log(`완료: ${base} 로 설정했습니다. (config.js, 페이지 메타, sitemap.xml, robots.txt, ${cnameNote})`);

// ---- 안내 ----
const warn = [];
if (parsed.protocol !== "https:") warn.push("주소가 http:// 입니다. GitHub Pages 는 https:// 주소 사용을 권장합니다.");
if (isGithubIo) {
  const userSite = host === `${ghRepo.toLowerCase()}`;
  if (!userSite && host !== `${ghOwner.toLowerCase()}.github.io`) {
    warn.push(`config.js 의 github.owner(${ghOwner}) 와 주소의 계정(${host})이 다릅니다. 확인해 주세요.`);
  }
  if (!userSite && !path) {
    warn.push(`프로젝트 사이트는 https://${host}/${ghRepo} 처럼 저장소 이름이 경로에 붙습니다. 주소를 확인해 주세요.`);
  }
  if (path) {
    warn.push("하위 경로 주소에서는 robots.txt 가 검색엔진에 인식되지 않습니다(도메인 최상위만 인식).");
    warn.push(`sitemap.xml 은 Google Search Console 등에 직접 제출하세요: ${base}/sitemap.xml`);
  }
} else if (path) {
  warn.push(`GitHub Pages 연결 도메인은 도메인 최상위에서 열립니다. 경로(${path})를 빼고 다시 실행하는 것을 권장합니다.`);
}
if (warn.length) {
  console.log("\n[확인]");
  warn.forEach((w) => console.log(`- ${w}`));
}

if (!isGithubIo) {
  const pagesHost = `${ghOwner.toLowerCase()}.github.io`;
  const hasWww = /^www\./.test(host);
  const apex = host.replace(/^www\./, "");
  const aRecords = `       185.199.108.153
       185.199.109.153
       185.199.110.153
       185.199.111.153
     (선택) AAAA 레코드: 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153`;
  const dns = hasWww
    ? `   · ${apex} (루트 도메인, 호스트 '@') — A 레코드 4개
${aRecords}
   · ${host} (호스트 'www') — CNAME → ${pagesHost}`
    : `   · ${host} 가 루트 도메인이면 (호스트 '@') — A 레코드 4개
${aRecords}
     그리고 www.${host} (호스트 'www') — CNAME → ${pagesHost}
   · ${host} 가 하위 도메인(예: hope.example.org)이면 — 그 이름으로 CNAME → ${pagesHost} 하나만 등록`;
  console.log(`
[다음 단계 — 연결 도메인 ${host}]
1) 이 변경 사항(CNAME 포함)을 커밋해 main 브랜치에 올립니다.
2) 도메인 구입처(가비아·카페24 등)의 DNS 관리에서 아래 레코드를 등록합니다.
${dns}
   ※ 같은 이름으로 이미 등록된 다른 A/CNAME 레코드(포워딩·파킹 등)는 삭제합니다.
3) GitHub 저장소 Settings → Pages → Custom domain 에 '${host}' 가 표시되는지 확인합니다.
   (DNS 반영에는 몇 분~최대 48시간이 걸릴 수 있습니다)
4) 인증서 발급이 끝나면 같은 화면에서 'Enforce HTTPS' 를 켭니다.
5) 새 주소에서 문의 폼을 한 번 시험 전송해 메일이 도착하는지 확인합니다.
   (FormSubmit 이 새 주소에서 다시 활성화(Activate) 확인 메일을 보낼 수 있습니다)
6) 만들어 둔 QR코드는 새 주소 기준으로 다시 저장·인쇄합니다.`);
} else {
  console.log(`
[다음 단계 — GitHub Pages 기본 주소]
1) 이 변경 사항을 커밋해 main 브랜치에 올립니다.
2) GitHub 저장소 Settings → Pages 에서 Source: Deploy from a branch / main / (root) 인지 확인합니다.
3) Custom domain 칸이 비어 있는지 확인합니다. (도메인을 연결할 때 이 스크립트를 도메인 주소로 다시 실행)`);
}
