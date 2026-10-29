# 세계희망연대 홈페이지 (World Hope Declaration Network)

> 분열과 전쟁의 세상을 종식시키는 희망의 서막이 열린다.

**빌드 과정도, 서버도, 데이터베이스도 없는** 정적 웹사이트입니다. GitHub 저장소에 있는 파일이 그대로 홈페이지가 됩니다.

| 무엇을 | 어떻게 |
|---|---|
| 호스팅 | **GitHub Pages** (main 브랜치, 무료) → https://www.worldhopedeclaration.com (연결 도메인, 가비아 DNS · 기본 주소 https://intoedu.github.io/worldhopedeclaration/) |
| 공지·소식, 갤러리, 응원 메시지 게시 | 저장소의 `data/*.json` 파일. 관리자 페이지(`/admin/`)에서 GitHub 토큰으로 로그인해 직접 수정 |
| 문의·참여 신청, 정기 후원 신청, 희망 응원 메시지, 온라인 후원 결제 알림 | **담당자 이메일로 전송** (FormSubmit 무료 서비스, 실패하면 방문자가 메일로 직접 보내도록 안내 — 컴퓨터는 Gmail, 휴대폰은 메일 앱) |
| 온라인 결제 | PortOne V2 결제창 (결제 내역의 기준은 PortOne 관리자 콘솔) |
| 방문 통계 (선택) | GoatCounter 그리고/또는 Google Analytics 4 |

## 메뉴와 기능

| 페이지 | 파일 | 주요 기능 |
|---|---|---|
| 홈 | `index.html` | 메인 비주얼, 인사말 발췌, 선언→실천 4단계, 33인 희망선언, 사역 카드, 최신 소식, 갤러리 미리보기, 함께하기, 희망 응원 메시지(접수 → 이메일, 게시는 관리자) |
| 소개·인사말 | `about.html` | 취지문, 위원장 인사말, 조직 구성(위원회·연대), 오시는 길(지도) |
| 사역 안내 | `ministry.html` | 다섯 가지 사역 |
| 공지·소식 | `news.html`, `post.html` | 게시판(분류·검색·페이지 나눔), 상세 보기, 링크 복사, 글별 QR |
| 갤러리 | `gallery.html` | 앨범별 보기, 크게 보기(키보드·스와이프) |
| 문의하기 | `contact.html` | 문의·참여·동역 신청 폼 → 이메일 (`?type=join`으로 유형 자동 선택) |
| 후원·헌금 | `donate.html` | 계좌 안내, 정기 후원 신청서(→ 이메일), 온라인 결제(PortOne) |
| 자주 묻는 질문 | `faq.html` | 분류별 FAQ |
| QR코드 | `qr.html` | 홈페이지·메뉴별 QR 생성, 가운데 로고, PNG/SVG 저장, 인쇄 |
| 개인정보처리방침 | `privacy.html` | 초안 (확정 필요 항목 표시) |
| 없는 주소 | `404.html` | 잘못된 주소 안내 (GitHub Pages 하위 경로에서도 디자인 유지) |
| 관리자 | `admin/` | 공지·소식 글쓰기, 사진 올리기, 응원 메시지 게시 (GitHub 저장소 파일 직접 수정) |

- **한/영 전환**: 모든 화면 상단 KOR / ENG (선택한 언어 유지, `?lang=en` 링크 가능)
- **QR코드**: 모든 화면 상단 ‘QR코드’ 버튼 → 지금 보는 페이지의 QR 표시
- **방문자 통계**: GoatCounter 연결 시 하단에 ‘누적 방문자’ 표시. 자세한 통계는 GoatCounter·GA4 화면에서 확인

## 미리보기 (내 컴퓨터에서)

```bash
npx serve .            # 또는: python3 -m http.server 8080  → http://localhost:8080/
```

- 파일을 더블클릭(`file://`)해서 열면 브라우저 보안 정책 때문에 `data/*.json` 을 읽지 못해 게시판·갤러리가 비어 보입니다. 꼭 위처럼 간단한 로컬 서버로 여세요.
- 미리보기에서도 폼을 전송하면 **실제로 메일이 발송**됩니다(아래 FormSubmit 참고).

## 설정 — `assets/js/config.js` 한 파일

단체명·연락처·주소·후원 계좌·메일 수신 주소·관리자 저장소·결제·통계 설정이 모두 여기 있습니다. 값이 비어 있으면 그 기능은 ‘준비 중’으로 안전하게 표시되거나 꺼집니다.

| 항목 | 설명 |
|---|---|
| `siteUrl` | 공식 주소. QR코드·공유 링크의 기준 (비우면 현재 접속 주소). `scripts/set-domain.mjs` 가 자동 입력 |
| `draft` | `true` → 상단에 ‘시안 미리보기’ 안내. **정식 오픈 시 `false`** |
| `bank` | 후원 계좌 (입력하면 ‘계좌번호 복사’ 버튼이 생깁니다) |
| `publicEmail` | 홈페이지에 공개할 이메일 (비우면 표시 안 함) |
| `email.to` | 온라인 접수 메일을 받을 주소 (또는 FormSubmit 별칭) |
| `email.service` | `"formsubmit"`(기본, 자동 전송 — 실패하면 ‘Gmail로 보내기’ 안내) 또는 `"gmail"`(자동 전송 없이 방문자가 항상 Gmail로 직접 보내기. 예전 값 `"mailto"` 도 같게 동작) |
| `github` | 관리자 페이지가 수정할 저장소 (`owner`, `repo`, `branch`) |
| `portone` | 온라인 결제 `storeId`, `channelKey`, `payMethod` |
| `analytics` | `goatcounter`(사이트 코드), `ga4`(측정 ID) — 둘 다 선택 |
| `showVisitCounter` | GoatCounter 사용 시 하단 ‘누적 방문자’ 표시 여부 |

## 배포 — GitHub Pages

1. GitHub 저장소 **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** / 폴더: **/ (root)** → Save
2. 1~2분 뒤 https://intoedu.github.io/worldhopedeclaration/ 에서 열립니다. 이후 main 브랜치에 커밋할 때마다 자동으로 다시 게시됩니다(보통 1~2분, 커밋이 몰리면 최대 10분).
3. 저장소 최상위의 빈 파일 **`.nojekyll`** 은 GitHub Pages 가 파일을 가공(Jekyll)하지 않고 그대로 게시하게 합니다. 지우지 마세요.
4. 공식 주소를 config 와 검색엔진 정보에 반영하려면 한 번 실행 후 커밋합니다 (Node.js 18 이상):
   ```bash
   node scripts/set-domain.mjs https://intoedu.github.io/worldhopedeclaration
   ```
   → `config.js`의 `siteUrl`, 각 페이지의 canonical·og:url·og:image 절대주소, `sitemap.xml`, `robots.txt` 가 갱신됩니다. 여러 번 실행해도 안전합니다.

참고
- GitHub 무료 요금제에서는 **공개(public) 저장소**에서만 Pages 를 쓸 수 있습니다. 공개 저장소라면 `data/*.json`(게시된 글·사진·응원 메시지 — ‘숨기기’한 항목 포함)과 그 변경 이력을 누구나 볼 수 있으니, 게시하지 않을 개인정보는 저장소에 넣지 마세요. 삭제 요청은 아래 ‘게시 철회·삭제 요청 처리’를 따릅니다. 온라인 접수 내용(문의·신청)은 저장소에 저장되지 않고 이메일로만 전달됩니다.
- 이 사이트는 하위 경로(`/worldhopedeclaration/`)에서 동작하도록 모든 경로를 **상대 경로**로 씁니다. 새 파일을 추가할 때도 `/assets/...` 처럼 `/` 로 시작하는 경로는 쓰지 마세요. (`404.html` 은 어떤 깊이의 주소에서 열려도 사이트 최상위를 기준으로 계산합니다)
- GitHub Pages 는 응답 헤더(보안 헤더)를 직접 설정할 수 없습니다. 관리자 페이지는 페이지 안의 Content-Security-Policy 로 보호합니다.

### 연결 도메인 (선택)

GitHub 공식 문서(Managing / Verifying a custom domain for your GitHub Pages site) 기준, 사이트가 끊기지 않고 가로채기 위험도 없는 순서입니다. `node scripts/set-domain.mjs https://www.도메인` 을 실행하면 같은 안내가 화면에 나옵니다.

1. **도메인 소유 확인(권장)** — GitHub 계정(프로필 사진 → **Settings**) → **Pages** → **Add a domain** → 루트 도메인(예: `worldhopedeclaration.com`) 입력 → 화면의 **TXT 레코드**(호스트 `_github-pages-challenge-계정이름`, 값은 GitHub 화면에 표시)를 도메인 구입처 DNS 에 추가 → **Verify**. 확인된 도메인은 다른 GitHub 사용자가 가로채 쓸 수 없습니다. TXT 레코드는 지우지 않습니다.
2. **DNS 등록** (도메인 구입처의 DNS 관리)
   - 루트 도메인(호스트 `@`) **A 레코드 4개**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (선택: AAAA `2606:50c0:8000::153` ~ `8003::153`)
   - `www` **CNAME** → `intoedu.github.io` (저장소 이름은 붙이지 않음)
   - 같은 이름(`@`, `www`)에 있던 다른 A/AAAA/CNAME(파킹·포워딩)은 삭제, 메일용 MX·TXT 는 유지, 와일드카드(`*`) 레코드는 만들지 않음
3. **반영 확인** — 보통 수 분~수 시간(최대 24시간). 온라인 DNS 조회 또는 `dig`(Windows 는 PowerShell `Resolve-DnsName`)로 위 값이 나오는지 확인합니다.
4. 저장소 **Settings → Pages → Custom domain** 에 `www.도메인` 입력 → **Save** (GitHub 가 main 에 `CNAME` 파일 커밋을 만듭니다. `www` 로 넣으면 루트 도메인은 자동으로 `www` 로 이동합니다)
5. main 을 받아온 뒤 `node scripts/set-domain.mjs https://www.도메인` 실행 → 커밋 (siteUrl·canonical·og:url·og:image·`sitemap.xml`·`robots.txt`·`CNAME`)
6. 인증서가 발급되면 같은 화면의 **Enforce HTTPS** 를 켭니다. (HTTPS 는 보통 1시간 안, 체크박스가 켜질 수 있게 되기까지 최대 24시간. 오래 안 되면 Custom domain 을 Remove → 다시 Save)
7. 새 주소에서 **문의 폼을 한 번 시험 전송** → FormSubmit 확인 메일의 **Activate** 클릭(새 주소에서 다시 활성화가 필요할 수 있음) → 다시 시험. 관리자(`/admin/`)는 새 주소에서 다시 로그인합니다(브라우저 저장소가 주소별로 따로임).
8. QR코드 인쇄물은 새 주소가 https 로 열리는 것을 확인한 뒤 만듭니다. 기존 github.io 주소가 새 도메인으로 넘어가는지는 공식 문서에 명시가 없어 **직접 확인 필요**합니다.

다시 github.io 주소로 되돌릴 때는 `node scripts/set-domain.mjs https://intoedu.github.io/worldhopedeclaration` 을 실행하면 `CNAME` 이 삭제됩니다.

### 점검 장치 (재발 방지)

- **관리자 화면 → 안내·현황 → ‘온라인 접수 점검하기’**: 실제 접수와 같은 경로로 시험 메일 1통을 보내 결과를 알려 줍니다. 주소(도메인)를 바꾼 뒤나 “접수가 안 된다”는 연락을 받았을 때 누르세요. ‘활성화가 필요합니다’가 나오면 받는 메일함의 *Action Required: Activate FormSubmit on …* 메일에서 **ACTIVATE FORM** 을 한 번 누르면 됩니다(주소마다 한 번, 그 주소의 모든 신청서에 적용).
- **GitHub Actions ‘Live site check’** (`.github/workflows/site-check.yml`, `scripts/site-check.mjs`): 배포가 끝날 때마다와 매주 월요일 아침에 실제 홈페이지의 모든 페이지를 PC·휴대폰 화면으로 열어 스크립트 오류, 빠진 파일, 깨진 사진·링크, 화면 넘침, https 이동, 인증서 남은 기간, 접수 서비스 연결을 확인합니다. 문제가 있으면 Actions 탭에 빨간 표시(실패)가 나고 요약에 원인이 적힙니다. 수동 실행: Actions → Live site check → Run workflow.
- 온라인 전송이 실패해도 방문자 화면에는 ‘메일로 보내기(컴퓨터: Gmail, 휴대폰: 메일 앱) · 내용 복사하기 · 주소 복사 · 전화하기’가 함께 나오고 입력 내용은 지워지지 않습니다.

### robots.txt 와 검색 노출

- `robots.txt` 에는 `Disallow: /admin/` 이 들어 있지만, 검색엔진은 **도메인 최상위의 `/robots.txt` 만** 읽습니다. 즉 `intoedu.github.io/worldhopedeclaration/` 같은 하위 경로 주소에서는 이 파일이 적용되지 않고, 연결 도메인을 붙인 뒤부터 적용됩니다.
- 그래서 관리자 페이지에는 `<meta name="robots" content="noindex, nofollow">` 가 따로 들어 있습니다(주소와 관계없이 검색 제외).
- `sitemap.xml` 은 Google Search Console·네이버 서치어드바이저에 직접 제출하면 됩니다.

## 온라인 접수 → 이메일 (FormSubmit)

문의·참여 신청(`contact.html`), 정기 후원 신청(`donate.html`), 희망 응원 메시지(홈), 온라인 후원 결제 알림(결제 직후 자동)은 모두 `config.js` 의 **`email.to`** 주소로 메일이 갑니다. 서버 대신 [FormSubmit](https://formsubmit.co) 무료 메일 전송 서비스를 씁니다.

1. **처음 한 번 활성화** — 사이트를 게시한 뒤 문의 폼에서 시험 접수를 한 번 보내면, `email.to` 수신함으로 FormSubmit 의 **활성화(Activate Form) 확인 메일**이 옵니다. 수신함 주인이 메일 속 **Activate** 버튼을 눌러야 그다음 접수부터 메일이 도착합니다. (스팸함도 확인)
   - 활성화 전에는 자동 전송이 실패하므로, 방문자에게는 메일로 직접 보내는 대체 화면이 뜹니다(화면에 ‘운영자 안내’도 표시). **정식 오픈 전에 꼭 활성화**하세요.
   - 활성화는 **접속 주소(도메인)별로 다시 필요할 수 있습니다.** 연결 도메인을 붙인 뒤, 또는 로컬 미리보기에서 시험한 경우에도 시험 접수를 다시 보내 확인하세요.
2. **주소 숨기기(권장)** — 활성화 메일에 있는 무작위 문자열(별칭)을 `email.to` 에 이메일 주소 대신 넣으면 홈페이지 소스에서 실제 주소가 보이지 않습니다. 이때 Gmail 경로(대체 경로와 `email.service: "gmail"`)는 `publicEmail` 주소를 받는 주소로 쓰므로 `publicEmail` 도 입력해 두세요. 둘 다 이메일 주소가 아니면 Gmail 경로를 쓸 수 없어 방문자에게 전화 안내만 표시됩니다.
3. **대체 경로(메일로 보내기)** — 네트워크 차단·미활성화·서비스 장애 등으로 자동 전송이 실패하면(FormSubmit 응답이 12초 안에 오지 않을 때도 같음) 입력 내용은 그대로 두고 ‘메일로 보내기’·‘내용 복사하기’·‘전화하기’ 버튼과 받는 주소(‘주소 복사’ 버튼)를 보여 줍니다. ‘메일로 보내기’는 **컴퓨터에서는 ‘Gmail로 보내기’**(받는 사람·제목·내용이 채워진 Gmail 작성 창 `https://mail.google.com/mail/?view=cm…` 을 새 탭으로, 로그인 전이면 Google 로그인 뒤 이어짐), **휴대폰에서는 ‘메일 앱으로 보내기’**(`mailto:` — 안드로이드는 보통 Gmail 앱)입니다. 휴대폰 브라우저의 Gmail 웹 작성 창은 받는 사람·내용을 채우지 못하고 계정 선택 화면이 나오기 때문입니다(2026-10 의뢰인 실제 사용에서 확인). 주소가 약 5,500자를 넘으면 Google 이 거절하므로(2026-10-16 확인) 5,000자를 넘는 긴 내용은 줄여서 담고 전체는 ‘내용 복사하기’로 보내도록 안내합니다. FormSubmit 이 ‘활성화 필요’라고 답하면 같은 화면에 **운영자 안내**(담당자 메일함에서 ACTIVATE FORM 을 한 번 누를 것)가 함께 나옵니다. 카카오톡 안 브라우저에서는 ‘다른 브라우저로 열기’ 안내가 덧붙습니다. `email.service: "gmail"` 로 바꾸면 자동 전송 없이 항상 이 방식을 씁니다. 홈페이지의 이메일 주소 링크(하단·소개·홈)도 같은 방식(컴퓨터: Gmail 새 탭, 휴대폰: 메일 앱)으로 열립니다.
4. 메일은 표 형식으로 오며, 신청자가 이메일을 적었다면 **답장하기**로 바로 회신할 수 있습니다.

운영 원칙
- 주민등록번호·계좌번호는 온라인으로 받지 않습니다(정기 후원 출금 정보는 담당자가 전화로 안내).
- 접수 내용은 외부 서비스(FormSubmit)를 거쳐 전달되므로 개인정보처리방침에 위탁 사항으로 적습니다(운영 주체·국가 확인 필요).
- 수신 메일함은 2단계 인증을 켜고 담당자만 접근하게 하며, 처리 완료된 접수 메일은 방침에 정한 기간(초안: 1년) 안에 삭제합니다.
- 무료 서비스이므로 전송량 제한·장애가 있을 수 있습니다(조건은 FormSubmit 최신 안내 확인 필요). 급한 문의는 전국대표전화(1588-2716)도 함께 안내합니다.

## 콘텐츠 관리 — 관리자 페이지 (`/admin/`)

주소: https://intoedu.github.io/worldhopedeclaration/admin/ (연결 도메인 사용 시 `https://도메인/admin/`)

관리자 화면은 GitHub API 로 저장소 파일(`data/posts.json`, `data/gallery.json`, `data/cheers.json`, `assets/img/uploads/`)을 직접 수정(커밋)합니다. 저장하면 GitHub Pages 가 자동으로 다시 게시하며, 홈페이지에 보이기까지 보통 1~2분, 사진을 여러 장 올린 직후에는 최대 10분 걸립니다.

**GitHub 토큰 만들기 (관리자마다 각자, 처음 한 번)**
1. 저장소에 쓰기 권한이 있는 계정으로 GitHub 로그인
2. 프로필 사진 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
3. Resource owner: `intoedu` · **Expiration**: 사용 기간 지정(예: 90일, 만료되면 새로 발급)
4. Repository access: **Only select repositories** → `worldhopedeclaration` **하나만**
5. Repository permissions → **Contents: Read and write** (Metadata: Read-only 는 자동) — 그 밖의 권한은 주지 않습니다
6. 생성된 `github_pat_…` 토큰을 관리자 로그인 칸에 붙여 넣기

토큰 사용 원칙
- 토큰은 비밀번호와 같습니다. 사람마다 따로 만들고, 공유·메신저 전송 금지. 담당자가 바뀌거나 유출이 의심되면 같은 화면에서 즉시 삭제(Delete)합니다.
- ‘이 기기에서 기억하기’를 켜면 그 브라우저에만 저장되고, 끄면 탭을 닫을 때 지워집니다. 공용 컴퓨터에서는 켜지 마세요. 토큰은 GitHub(api.github.com) 외의 곳으로 전송되지 않습니다.
- 조직(Organization) 저장소라면 조직 설정에 따라 토큰 승인이 필요할 수 있습니다.

응원 메시지 게시 흐름: 방문자가 홈에서 접수 → 담당자 이메일로 도착 → 담당자가 내용을 확인해 관리자 ‘응원 메시지’ 탭에서 게시 → `data/cheers.json` 에 저장되어 홈에 표시.

관리자 페이지 없이 GitHub 웹 화면에서 `data/*.json` 을 직접 고쳐도 됩니다(형식은 기존 항목을 그대로 따라 주세요. 이미지 경로는 `assets/img/...` 처럼 `/` 없이).

### 게시 철회·삭제 요청 처리 (응원 메시지·사진 등)

저장소가 공개되어 있으므로 ‘숨기기’한 항목도 `data/*.json` 파일에 그대로 남아 누구나 볼 수 있고, ‘삭제’한 항목도 GitHub 변경 이력(이전 커밋)에 남습니다. 본인이 게시 철회·삭제를 요청하면 개인정보처리방침(제3조·제6조)에 따라 다음 순서로 처리합니다.

1. 관리자 페이지에서 해당 항목을 **‘삭제’** 합니다(‘숨기기’ 아님). 사진은 ‘삭제’하면 올린 파일도 함께 지워집니다.
2. **변경 이력 정리** — Git 을 다룰 수 있는 담당자가 [git filter-repo](https://github.com/newren/git-filter-repo) 로 진행합니다. 저장소에 브랜치 보호 규칙이 있으면 잠시 강제 푸시(force push)를 허용합니다.
   ```bash
   git clone --mirror https://github.com/intoedu/worldhopedeclaration.git wh-clean
   cd wh-clean
   # 응원 메시지 등 글자: 지울 문구를 한 줄에 하나씩 적은 파일(예: 메시지 문장 전체 ==>[삭제됨])
   #   다른 글에도 쓰이는 흔한 단어 대신, 그 항목에만 있는 문구(메시지 문장 전체 등)를 적습니다.
   git filter-repo --replace-text ../remove.txt --replace-message ../remove.txt
   # 사진 파일: 경로를 지정해 이력에서 통째로 제거
   # git filter-repo --invert-paths --path assets/img/uploads/gallery/파일이름.jpg
   git push --force --mirror https://github.com/intoedu/worldhopedeclaration.git
   ```
   (`refs/pull/…` 를 고칠 수 없다는 거절 메시지는 무시해도 됩니다)
3. **GitHub 에 남은 사본 삭제 요청** — 이력을 고친 뒤에도 이전 커밋 화면이 GitHub 에 한동안 남을 수 있으므로, GitHub 공식 문서 ‘Removing sensitive data from a repository’ 안내에 따라 GitHub Support 에 삭제를 요청합니다. 다른 사람이 만든 포크(fork)에 사본이 있으면 이것도 함께 문의합니다.
4. 다른 컴퓨터에 받아 둔 저장소 사본(clone)은 지우고 새로 받습니다. 관리자 페이지는 저장소를 매번 새로 읽으므로 따로 할 일이 없습니다.
5. 접수 메일도 메일함과 휴지통에서 삭제하고, 요청자에게 처리 결과를 알립니다.

관리자 페이지가 남기는 커밋 메시지에는 이름 같은 개인정보를 넣지 않고 항목 ID만 적습니다.

## 방문자 통계 (선택)

- **GoatCounter** — [goatcounter.com](https://www.goatcounter.com) 에서 가입하고 사이트 코드(예: `worldhope` → `https://worldhope.goatcounter.com`)를 `analytics.goatcounter` 에 입력합니다. 하단 ‘누적 방문자’를 보이려면 GoatCounter 설정에서 **Allow adding visitor counts on your website** 를 켭니다. 비영리(비상업) 이용은 무료로 안내되어 있습니다(요금·이용 조건 확인 필요).
- **Google Analytics 4** — 측정 ID(`G-XXXXXXXXXX`)를 `analytics.ga4` 에 입력합니다. 쿠키를 사용하므로 개인정보처리방침 제9조에 사용 사실과 거부 방법을 적어야 합니다.
- 관리자 페이지와 404 페이지는 집계하지 않습니다. 실제로 쓰는 도구에 맞춰 개인정보처리방침의 위탁·국외 이전(제5조)과 자동 수집(제9조) 항목을 고쳐 주세요.

## 온라인 결제 (PortOne V2)

1. PortOne 가입 → PG사(카드) 가맹 심사 → 채널 생성
2. `config.js` 의 `portone.storeId`, `portone.channelKey` 입력 → 후원 페이지 결제 버튼 활성화 (둘 다 홈페이지에 공개되어도 되는 값입니다. API Secret 은 절대 넣지 마세요)
3. 후원자가 결제를 마치면 담당자에게 **‘온라인 후원 결제 알림’ 메일**이 자동으로 갑니다.

> 서버가 없으므로 결제 결과를 서버에서 검증하지 않습니다. 알림 메일은 후원자 브라우저가 보내는 **참고용**이며, 후원자가 결제 직후 창을 닫으면 오지 않을 수도 있습니다. **실제 결제 여부·금액은 반드시 PortOne 관리자 콘솔에서 결제번호로 확인**하고, 정기적으로 콘솔 내역과 대조해 주세요. 기부금 영수증 등은 콘솔 기록을 기준으로 처리합니다.
>
> PG 가맹은 단체 서류 심사가 필요하며, 후원(기부) 결제는 PG사별 심사 조건이 다를 수 있습니다. 실제 연동 시 PortOne 최신 문서로 설정을 한 번 더 확인해 주세요.

## 콘텐츠 교체

- **로고**: `assets/img/logo.svg` 를 정식 로고로 덮어쓰기 (헤더·푸터·QR 가운데·파비콘에 반영). 공유 이미지 `assets/img/og-image.png`, `apple-touch-icon.png` 도 함께 교체
- **대표자 사진**: `assets/img/portrait-placeholder.svg` 대신 사진 파일을 넣고 `about.html` 의 경로 수정
- **사진·글**: 관리자 페이지에서 올리기 (또는 `data/*.json` 직접 수정)
- **문구**: 각 HTML 의 `<span class="ko">…</span><span class="en">…</span>` 쌍을 수정

## 폴더 구조

```
index.html … faq.html, qr.html, privacy.html
404.html                   없는 주소 안내 (하위 경로 자동 대응)
.nojekyll                  GitHub Pages 가 파일을 그대로 게시하도록 (삭제 금지)
admin/index.html           관리자 (GitHub 토큰 로그인)
assets/css/style.css       디자인 (청색 + 새벽빛 골드)
assets/js/config.js        ★ 사이트 설정
assets/js/main.js          헤더·푸터·한영 전환·QR 팝업·방문 통계
assets/js/data.js          데이터(JSON 읽기)·이메일 전송
assets/js/board.js · gallery.js · forms.js · donate.js · qr.js · admin.js
assets/img/                로고(임시)·사진 자리표시·공유 이미지
assets/img/uploads/        관리자에서 올린 사진 (올리면 자동 생성)
assets/vendor/             Pretendard 글꼴, QR 라이브러리 (자체 호스팅)
data/posts.json            공지·소식
data/gallery.json          갤러리
data/cheers.json           게시된 희망 응원 메시지
scripts/set-domain.mjs     공식 주소 일괄 반영 (+ 연결 도메인용 CNAME)
scripts/build-dotmap.mjs   세계지도 점 그림(SVG 3개) 생성 — 점 데이터가 바뀔 때만 한 번 실행 후 커밋
robots.txt                 검색엔진 안내 (sitemap.xml 은 set-domain 실행 시 생성)
CNAME                      연결 도메인 사용 시에만 set-domain 이 생성
docs/CONTENT_TODO.md       단체 자료·확인 사항 체크리스트
```

## 라이선스 (포함된 외부 자료)

- Pretendard — SIL Open Font License 1.1 (`assets/vendor/pretendard/LICENSE.txt`)
- qrcode-generator (Kazuhiko Arase) — MIT
- 성경 영문 인용: KJV (퍼블릭 도메인), 국문: 개역개정
