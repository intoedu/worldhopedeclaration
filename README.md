# 세계희망연대 홈페이지 (World Hope Alliance)

> 분열과 전쟁의 세상을 종식시키는 희망의 서막이 열린다.

빌드 과정이 없는 정적 웹사이트입니다. 파일을 그대로 올리면 동작하고, 게시판·갤러리·문의·후원 신청·방문 통계는 Supabase를 연결하면 관리자 페이지에서 운영할 수 있습니다.

## 메뉴와 기능

| 페이지 | 파일 | 주요 기능 |
|---|---|---|
| 홈 | `index.html` | 메인 비주얼, 인사말 발췌, 선언→실천 4단계, 33인 희망선언, 사역 카드, 최신 소식, 갤러리 미리보기, 함께하기, 희망 응원 메시지 |
| 소개·인사말 | `about.html` | 취지문, 위원장 인사말, 조직 구성(위원회·연대), 오시는 길(지도) |
| 사역 안내 | `ministry.html` | 다섯 가지 사역 |
| 공지·소식 | `news.html`, `post.html` | 게시판(분류·검색·페이지 나눔), 상세 보기, 링크 복사, 글별 QR |
| 갤러리 | `gallery.html` | 앨범별 보기, 크게 보기(키보드·스와이프) |
| 문의하기 | `contact.html` | 문의·참여·동역 신청 폼 (`?type=join`으로 유형 자동 선택) |
| 후원·헌금 | `donate.html` | 계좌 안내, 정기 후원 신청서, 온라인 결제(PortOne) |
| 자주 묻는 질문 | `faq.html` | 분류별 FAQ |
| QR코드 | `qr.html` | 홈페이지·메뉴별 QR 생성, 가운데 로고, PNG/SVG 저장, 인쇄 |
| 개인정보처리방침 | `privacy.html` | 초안 (확정 필요 항목 표시) |
| 관리자 | `admin/` | 대시보드(방문 통계), 글쓰기, 사진 올리기, 응원 승인, 문의·후원 확인, CSV 내려받기 |

- **한/영 전환**: 모든 화면 상단 KOR / ENG (선택한 언어 유지, `?lang=en` 링크 가능)
- **QR코드**: 모든 화면 상단 ‘QR코드’ 버튼 → 지금 보는 페이지의 QR 표시
- **방문자 통계**: 하단에 오늘/전체 방문자 표시, 관리자에서 14일 그래프·인기 페이지 확인 (Supabase 연결 시)

## 미리보기

```bash
npx serve .            # 또는: python3 -m http.server 8080
```

## 설정 — `assets/js/config.js` 한 파일

단체명·연락처·주소·후원 계좌·Supabase·결제·GA 설정이 모두 여기 있습니다. 값이 비어 있으면 그 기능은 ‘준비 중’으로 안전하게 표시됩니다.

- `draft: true` → 상단에 ‘시안 미리보기’ 안내. **정식 오픈 시 `false`**
- `bank` → 후원 계좌 (입력하면 ‘계좌번호 복사’ 버튼이 생깁니다)
- `publicEmail` → 홈페이지에 공개할 이메일 (비우면 표시 안 함)

## 배포 (Vercel 권장)

1. Vercel에서 이 저장소를 Import → Framework: **Other**, Build Command 없음, Output Directory: 루트(`.`)
2. 도메인 연결 (Vercel → Settings → Domains)
3. 도메인이 정해지면 한 번 실행 후 커밋:
   ```bash
   node scripts/set-domain.mjs https://www.도메인
   ```
   → `config.js`의 `siteUrl`, 각 페이지의 canonical·og:url·og:image 절대주소, `sitemap.xml`, `robots.txt`가 갱신됩니다.

`vercel.json`에 보안 헤더와 관리자 페이지 검색 제외가 설정되어 있습니다.

## 게시판·갤러리·문의·통계 연결 (Supabase)

1. supabase.com 에서 프로젝트 생성 (지역: Northeast Asia (Seoul) 권장)
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여 넣고 실행 (여러 번 실행해도 안전)
3. Authentication → Users 에서 관리자 계정 생성 → `schema.sql` 맨 아래 ‘관리자 등록’ 쿼리를 이메일만 바꿔 실행
4. Authentication 설정에서 **신규 가입(Sign ups) 끄기**
5. Project Settings → API 의 URL / anon key 를 `config.js`의 `supabase.url`, `supabase.anonKey` 에 입력
6. `/admin/` 접속 → 로그인

연결 전에는 `data/posts.json`, `data/gallery.json` 내용으로 화면이 구성되고, 문의·후원 신청은 메일 앱(`inquiryEmail`)으로 접수됩니다. 응원 메시지는 연결 후 활성화됩니다.

보안 설계: 모든 테이블에 RLS 적용 — 방문자는 ‘접수’만 가능하고 열람은 관리자만 가능합니다. 계좌번호·주민등록번호는 온라인으로 받지 않습니다.

## 온라인 결제 연결 (PortOne V2)

1. PortOne 가입 → PG사(카드) 가맹 심사 → 채널 생성
2. `config.js` 의 `portone.storeId`, `portone.channelKey` 입력 → 후원 페이지 결제 버튼 활성화
3. 결제 검증 함수 배포 (브라우저 결과만 믿지 않고 서버에서 PortOne API로 확인 후 기록):
   ```bash
   supabase functions deploy verify-payment
   supabase secrets set PORTONE_API_SECRET=... PORTONE_STORE_ID=store-... ALLOWED_ORIGIN=https://www.도메인
   ```
4. 관리자 → ‘온라인 후원’ 탭에서 내역 확인

> PG 가맹은 단체 서류 심사가 필요하며, 후원(기부) 결제는 PG사별 심사 조건이 다를 수 있습니다. 실제 연동 시 PortOne 최신 문서로 필드명을 한 번 더 확인해 주세요.

## 콘텐츠 교체

- **로고**: `assets/img/logo.svg` 를 정식 로고로 덮어쓰기 (헤더·푸터·QR 가운데·파비콘에 반영). 공유 이미지 `assets/img/og-image.png`, `apple-touch-icon.png` 도 함께 교체
- **대표자 사진**: `assets/img/portrait-placeholder.svg` 대신 사진 파일을 넣고 `about.html` 의 경로 수정
- **사진·글**: Supabase 연결 후 관리자에서 올리기 (연결 전에는 `data/*.json` 수정)
- **문구**: 각 HTML 의 `<span class="ko">…</span><span class="en">…</span>` 쌍을 수정

## 폴더 구조

```
index.html … faq.html, qr.html, privacy.html, 404.html
admin/index.html           관리자
assets/css/style.css       디자인 (청색 + 새벽빛 골드)
assets/js/config.js        ★ 사이트 설정
assets/js/main.js          헤더·푸터·한영 전환·QR 팝업·통계
assets/js/data.js          데이터 계층 (Supabase ↔ JSON)
assets/js/board.js · gallery.js · forms.js · donate.js · qr.js · admin.js
assets/img/                로고(임시)·사진 자리표시·공유 이미지
assets/vendor/             Pretendard 글꼴, QR 라이브러리, supabase-js (자체 호스팅)
data/posts.json, gallery.json   연결 전 기본 데이터
supabase/schema.sql        DB·권한·통계 함수
supabase/functions/verify-payment   결제 검증
scripts/set-domain.mjs     도메인 일괄 반영
docs/CONTENT_TODO.md       단체 자료·확인 사항 체크리스트
```

## 라이선스 (포함된 외부 자료)

- Pretendard — SIL Open Font License 1.1 (`assets/vendor/pretendard/LICENSE.txt`)
- qrcode-generator (Kazuhiko Arase) — MIT
- supabase-js — MIT (`assets/vendor/supabase/LICENSE`)
- 성경 영문 인용: KJV (퍼블릭 도메인), 국문: 개역개정
