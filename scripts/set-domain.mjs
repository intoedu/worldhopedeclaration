// 도메인 확정 후 한 번 실행:  node scripts/set-domain.mjs https://www.example.org
// - assets/js/config.js 의 siteUrl 설정 (QR코드·공유 링크 기준 주소)
// - 각 페이지에 canonical / og:url / 절대경로 og:image 반영
// - sitemap.xml 생성, robots.txt 에 Sitemap 줄 추가
// 여러 번 실행해도 안전합니다(도메인을 바꾸면 그 값으로 다시 반영).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
if (!arg || !/^https?:\/\/[^/]+/i.test(arg)) {
  console.error("사용법: node scripts/set-domain.mjs https://www.example.org");
  process.exit(1);
}
const base = arg.replace(/\/+$/, "");
const pages = ["index.html", "about.html", "ministry.html", "news.html", "gallery.html", "donate.html", "contact.html", "faq.html", "qr.html", "post.html", "privacy.html"];
const indexable = pages.filter((p) => !["post.html", "privacy.html"].includes(p));

// config.js
const cfgPath = join(root, "assets/js/config.js");
writeFileSync(cfgPath, readFileSync(cfgPath, "utf8").replace(/siteUrl: "[^"]*"/, `siteUrl: "${base}"`));

// 페이지 메타
for (const p of pages) {
  const file = join(root, p);
  let html = readFileSync(file, "utf8");
  const url = p === "index.html" ? `${base}/` : `${base}/${p}`;
  html = html.replace(/\n<link rel="canonical"[^>]*>/, "").replace(/\n<meta property="og:url"[^>]*>/, "");
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

// robots.txt
writeFileSync(join(root, "robots.txt"), `User-agent: *\nDisallow: /admin/\nSitemap: ${base}/sitemap.xml\n`);

console.log(`완료: ${base} 로 설정했습니다. (config.js, 페이지 메타, sitemap.xml, robots.txt)`);
