// 세계지도 점 그림(SVG) 3개를 만듭니다. 배포 때마다 돌리는 단계가 아니라, 점 데이터가 바뀌었을 때만
// 한 번 실행하고 결과 파일을 함께 커밋합니다.
//   node scripts/build-dotmap.mjs
// 입력: data/worldmap-dots.json  (Natural Earth 퍼블릭 도메인 → world-atlas(ISC) 가공, [경도, 위도, 국가코드])
// 출력:
//   assets/img/home/tile-worldmap.svg  홈 '세계지도' 타일 — 하늘색 그라데이션 점 + 대한민국(410) 금색 점
//   assets/img/brand/dotmap-light.svg  어두운(네이비) 바탕용 — 연한 하늘색 점
//   assets/img/brand/dotmap.svg        밝은 바탕용 — 회청색 점
// 좌표: x = (경도 + 180) × 2.5, y = (78 − 위도) × 2.5  →  viewBox 0 0 900 335 (북위 78° ~ 남위 56°)
// 점 간격: 원본 1.6° 격자에서 가로·세로 한 칸씩 건너뛴 3.2° 격자만 사용 (작게 보여도 또렷하도록)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = JSON.parse(readFileSync(join(root, "data/worldmap-dots.json"), "utf8"));
const STEP = Number(src.step) || 1.6;
const W = 900, H = 335, K = 2.5;
const HILITE = "410"; // 대한민국 (data/countries.json 의 code)

const num = (v) => String(Math.round(v * 10) / 10);
// 원본 격자의 경도는 −179.2°부터 시작(−180°에서 반 칸 밀림)하므로, 칸 번호는 가장 서쪽 경도를 기준으로 셈
// (−180° 기준으로 나누면 42.5 처럼 반올림 경계에 걸려 결과가 흔들림)
const lon0 = Math.min(...(src.dots || []).map((d) => Number(d[0])).filter(isFinite));
const onGrid = (lon, lat) => Math.round((lon - lon0) / STEP) % 2 === 0 && Math.round((78 - lat) / STEP) % 2 === 0;

const base = [];
const gold = [];
for (const d of src.dots || []) {
  const lon = Number(d[0]), lat = Number(d[1]), code = String(d[2]);
  if (!isFinite(lon) || !isFinite(lat)) continue;
  const x = (lon + 180) * K, y = (78 - lat) * K;
  if (x < 0 || x > W || y < 0 || y > H) continue; // 그림 밖(남극 일부 등)은 버림
  // 대한민국은 원래 격자의 점을 모두 금색으로 (3.2° 격자로 줄이면 점 하나만 남아 보이지 않음)
  if (code === HILITE) { gold.push([x, y]); continue; }
  if (onGrid(lon, lat)) base.push([x, y]);
}
// 위→아래, 왼→오른 순서로 정렬해 같은 입력이면 늘 같은 파일이 나오게 함
const sortPts = (a) => a.sort((p, q) => p[1] - q[1] || p[0] - q[0]);
const pathD = (pts) => sortPts(pts).map(([x, y]) => "M" + num(x) + " " + num(y) + "h0").join("");

const head = (title) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '">\n' +
  "<title>" + title + "</title>\n" +
  "<!-- Map data: Natural Earth (public domain) via world-atlas (ISC, Mike Bostock) · scripts/build-dotmap.mjs 로 생성 -->\n";
const dotsPath = (d, stroke, width) =>
  '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round"/>\n';

const baseD = pathD(base);
const goldD = pathD(gold);
const allD = pathD(base.concat(gold));

const files = {
  "assets/img/home/tile-worldmap.svg":
    head("World map dots") +
    // 그라데이션 중심: 그림의 가로 55%·세로 40% (userSpaceOnUse 로 그림 전체 기준)
    '<defs><radialGradient id="g" gradientUnits="userSpaceOnUse" cx="' + num(W * 0.55) + '" cy="' + num(H * 0.4) + '" r="' + num(W * 0.6) + '">' +
    '<stop offset="0" stop-color="#cfe0f5"/><stop offset="1" stop-color="#6f8fb8"/></radialGradient></defs>\n' +
    // 타일은 화면에서 약 0.45배로 줄어 보이므로 점을 조금 굵게(3.6 → 실제 약 1.6px)
    dotsPath(baseD, "url(#g)", 3.6) +
    dotsPath(goldD, "#d8b56a", 4.4) +
    "</svg>\n",
  "assets/img/brand/dotmap-light.svg": head("World map dots") + dotsPath(allD, "#a9c2e3", 2.4) + "</svg>\n",
  "assets/img/brand/dotmap.svg": head("World map dots") + dotsPath(allD, "#6f8fb8", 2.4) + "</svg>\n"
};

for (const [rel, body] of Object.entries(files)) {
  writeFileSync(join(root, rel), body);
  console.log(rel.padEnd(36), (Buffer.byteLength(body) / 1024).toFixed(1) + " KB");
}
console.log("점 " + base.length + "개 + 대한민국 " + gold.length + "개");
