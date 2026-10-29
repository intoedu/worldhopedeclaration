# 디자인 시스템 · 컴포넌트 가이드 (DESIGN.md)

세계희망연대 홈페이지의 **라이트 디자인 시스템** 사용법입니다. 페이지를 만들 때는 이 문서와
`assets/css/style.css` 의 클래스만 사용합니다. (새 CSS 가 꼭 필요하면 페이지 `<style>` 에 최소한으로 쓰고,
이 문서의 토큰 변수 `var(--…)` 를 사용합니다.)

- 방향: 흰색·아주 연한 하늘색 바탕, 딥 네이비 글자(`#13294b`), 세리프 제목, 얇은 구분선, 넉넉한 여백.
  금색은 아주 작은 포인트(선·번호)에만.
- 버튼은 각진 모서리(3px), 카드는 6–10px. 알약 모양 버튼 금지.
- 기준 시안: 홈 = 세계희망선언 시안(데스크톱·모바일).

---

## 0. 반드시 지킬 규칙

1. **주소는 항상 상대 경로** (`declaration.html`, `assets/img/...`). `/`로 시작하는 주소 금지
   (GitHub Pages 하위 경로 `/worldhopedeclaration/` 와 나중의 도메인 최상위 둘 다에서 동작해야 함).
2. **모든 글은 한·영 쌍**: `<span class="ko">…</span><span class="en">…</span>`. 속성은 `data-en-placeholder`,
   `data-en-aria-label`, `data-en-title`, `data-en-alt`, `<option data-en="…">`. 문서 제목은 `<body data-title-en="…">`.
3. JS 로 넣는 글자는 **반드시 `WH.esc()`** 로 이스케이프.
4. 지어낸 사실 금지(대표자 이름·인원·행사 등). 견본은 반드시 **`.sample-tag` 로 “예시 · Sample” 표시**.
   ID 카드 예시는 **“홍길동 / HONG GIL-DONG”** 같은 가상의 이름만, 실제 인물 사진·원치현 위원장 개인정보 사용 금지.
5. 태극(음양) 문양 사용 금지. 이중개념 아이콘은 `circles`(겹친 두 원) 등 중립 아이콘 사용.
   개신교·성경 중심 표현만, 가톨릭/이단적 상징·어투 금지.
6. 국가 수·목표 인원은 **하드코딩 금지** → `data/stats.json` + `data-stat` (아래 9장). 210/6,930 은 쓰지 않음.
7. 새 접수 폼은 `forms.js`(`form[data-wh-form]`)로만. 받는 이메일 주소를 HTML/JS 에 새로 적지 않음.
8. 코드 스타일: ES5 스타일 IIFE, `"use strict"`, 큰따옴표, 2칸 들여쓰기, 한국어 주석.

---

## 1. `<head>` 기본 코드 (복사해서 사용)

```html
<!doctype html>
<html lang="ko" data-lang="ko" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>세계희망선언문 | 세계희망연대</title>
<meta name="description" content="(페이지 설명 1~2문장)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="세계희망연대">
<meta property="og:title" content="세계희망선언문 | 세계희망연대">
<meta property="og:description" content="(짧은 설명)">
<meta property="og:image" content="assets/img/og-image.jpg">
<meta name="theme-color" content="#13294b">
<link rel="icon" href="assets/img/brand/favicon-64.png" type="image/png" sizes="64x64">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Noto+Serif+KR:wght@500;700;900&family=Noto+Serif:ital,wght@0,500;0,700;1,500&display=swap">
<link rel="stylesheet" href="assets/css/style.css">
<script>(function(){try{var l=new URLSearchParams(location.search).get("lang")||localStorage.getItem("wh-lang");if(l==="en"){var h=document.documentElement;h.setAttribute("data-lang","en");h.lang="en";}}catch(e){}})();</script>
</head>
```

- 제목 형식: `페이지명 | 세계희망연대` / 영문 `Page | World Hope Declaration Network`.
- 관리자 화면(`admin/`)은 보안정책(CSP) 때문에 Google Fonts 를 불러오지 않습니다(그대로 둘 것).

## 2. 페이지 뼈대 · 스크립트 순서

```html
<body data-page="declaration" data-title-en="The Declaration | World Hope Declaration Network">
<div id="site-header"></div>          <!-- 건너뛰기 링크·시안 안내 바·헤더·모바일 메뉴·하단 탭바 자동 생성 -->

<main id="main">
  <section class="page-hero">…</section>
  <section class="section">…</section>
</main>

<div id="site-footer"></div>          <!-- 푸터 자동 생성 -->
<script src="assets/js/config.js"></script>
<script src="assets/js/data.js"></script>
<script src="assets/js/main.js"></script>
<!-- 필요할 때만: forms.js(접수 폼) · board.js(게시판) · gallery.js · 페이지 전용 스크립트 -->
<script src="assets/js/forms.js"></script>
</body>
```

- 시안 안내 바(`config.draft`)는 자동. 시안에서만 보일 요소는 `data-draft-only` 속성.
- `data-page` 값: `home, declaration, vision, global33, worldmap, news, post, gallery, join, about, ministry,
  contact, donate, faq, qr, privacy, terms, 404`.
- 메뉴 강조를 바꾸고 싶으면 `<body data-nav="join">` (아래 표보다 우선).

### 메뉴 구성 (main.js `NAV`)

| id | 한국어 | English | 주소 |
|---|---|---|---|
| home | 홈 | Home | index.html |
| declaration | 세계희망선언 | Declaration | declaration.html |
| vision | 비전과 미션 | Vision & Mission | vision.html |
| global33 | 글로벌 33 | Global 33 | global33.html |
| worldmap | 세계지도 | World Map | worldmap.html |
| news | 소식 | News | news.html |
| join | 참여하기 | Join | join.html |
| about | 연대소개 | About | about.html |

메뉴에 없는 페이지의 강조: `ministry → vision`, `post·gallery → news`, `donate → join`,
`contact·faq → about`, `qr·privacy·terms·404 → 없음`.
정확히 그 페이지면 `aria-current="page"`, 같은 묶음이면 `aria-current="true"`.

**하위 메뉴(`NAV[i].sub`)** — 데스크톱 하위 메뉴 판과 푸터 사이트맵이 함께 씁니다. 페이지 구역 id 를 바꾸면 여기도 고쳐 주세요.

| 메뉴 | 하위 메뉴 → 주소 |
|---|---|
| 세계희망선언 | 선언문·5대 원칙 `declaration.html#principles` · 5대 가치 `#values` · 공동의 선언 `#together` |
| 비전과 미션 | 비전 `vision.html#vision` · 취지문 `#purpose` · 미션 `#mission` · 다섯 갈래의 사역 `#ministries` |
| 글로벌 33 | 11개 분야 `global33.html#fields` · 글로벌 확장 구조 `#structure` · 글로벌 대표 선정패 `#plaque` · 대한민국 대표 33인 추천 `korea33.html` |
| 세계지도 | 세계지도 보기 `worldmap.html` |
| 소식 | 공지·소식 `news.html` · 갤러리 `gallery.html` (`js-gallery-link`: 견본 사진뿐인 동안 숨김) |
| 참여하기 | 선언 참여 신청 `join.html#declare` · 글로벌 대표 추천 `#nominate` · 희망 응원 메시지 `#cheer` · 후원·헌금 `donate.html` · 문의하기 `contact.html` |
| 연대소개 | 위원장 인사말 `about.html#greeting` · 취지 `#purpose` · 조직 `#organization` · 오시는 길 `#location` · 자주 묻는 질문 `faq.html` |

- 헤더(1081px 이상): 로고 56px · 단체명, 주 메뉴 8개, KOR | ENG, 검색. 높이 72px(1081–1279px) / 76px(1280px 이상).
  위에서는 흰 바탕, 내려가면 아래 가는 선(`.is-scrolled`)과 뒤 흐림. 후원 버튼 등 별도 버튼은 두지 않음(시안 유지).
- 하위 메뉴 판(1081px 이상, `.site-header.is-menu`): 주 메뉴에 마우스를 0.12초 올리거나 Tab 으로 들어가면 펼쳐짐.
  **가리킨 메뉴 하나만** 보여 줌: 왼쪽 = 메뉴 이름(금색 영문 머리글 + 큰 이름), 가는 세로선, 오른쪽 = 그 메뉴의 하위 목록
  (3칸 격자, 줄마다 아래 가는 선 + 오른쪽 작은 화살표, 글자는 한 줄 — 한글은 줄바꿈 없음). 판 높이는 가장 긴 목록에 맞춘 한 가지
  (메뉴를 옮겨 가리켜도 출렁이지 않음, main.js `setupMega`). 하위 메뉴가 없는 ‘홈’에서는 판을 띄우지 않음(`.mega-empty`). Esc·밖으로 나가면 닫힘.
- 모바일 하단 탭바(760px 이하, 높이 58px): 세계희망선언문 · 글로벌 33 · 세계지도 · 참여하기 (아이콘 doc/group/world/sprout).
  지금 페이지는 아이콘 뒤 연하늘 알약 + 굵은 글자. 글을 입력하는 동안은 내려가 숨음.
  `body.has-tabbar` 에 하단 여백이 자동으로 들어갑니다. 페이지에서 `position: fixed; bottom: 0` 요소를 만들지 마세요.
- 휴대폰에서 내리면 헤더·탭바가 비켜 나고(`body.chrome-down`), 조금이라도 올리면 다시 나타남. 페이지 안 메뉴(`.subnav`)는 맨 위에 붙어 계속 보임.
  ‘동작 줄이기’ 설정이면 늘 제자리.
- 모바일 전체 메뉴: 주 메뉴 8개(지금 페이지는 연하늘 줄) + 바로가기 6칸(대표 33인 추천 · 후원·헌금 · 문의하기 · 자주 묻는 질문 ·
  QR코드 만들기 · 갤러리) + 아래 줄(전국대표전화 · 이 페이지 QR 아이콘 · KOR/ENG 두 칸 버튼).
- 푸터 두 단: 위 단 = 단체 소개(로고·단체명·위원회·문구) | 사이트맵(세계희망선언·글로벌 33·참여하기·연대소개의 하위 메뉴) |
  전국대표전화·주소·이메일 (760px 이하는 사이트맵을 숨기고 전국대표전화를 전체 폭 버튼으로).
  아래 단 = 시안의 한 줄(세계희망연대 / 세계희망선언, **개인정보처리방침** · 이용약관 · 문의하기, SNS 는 `config.social` 주소가 있을 때만).
  맨 아래 = 대표 연락처(`config.footerContact`, 의뢰인 요청) · 고유번호(`config.registrationNo` 가 있을 때만) · ©.
- 사이트 검색: 헤더 돋보기(또는 `/` 키). 페이지 색인은 main.js 의 `PAGES` 배열 (새 페이지 제목·설명이 바뀌면
  통합 담당에게 알려 주세요). 소식 글은 `data/posts.json` 에서 함께 검색.
  갤러리가 견본 사진뿐인 동안(`html[data-gallery-empty]`)은 메뉴와 같이 검색 결과에서도 갤러리를 뺍니다.

---

## 3. 토큰 (style.css `:root`)

| 종류 | 변수 | 값/용도 |
|---|---|---|
| 네이비 | `--navy-900` | `#13294b` 기본 글자·버튼·제목 |
|  | `--navy-950` / `--navy-800` / `--navy-700` | 푸터 / hover / 보조 |
| 블루 | `--blue-700` | `#2b5797` 링크·영문 소제목 |
|  | `--blue-500` | 포커스 테두리 |
|  | `--blue-200` / `--blue-100` / `--blue-50` / `--sky-50` | 얇은 테두리 / 배지 / 연한 바탕 |
| 금색 | `--gold-500` `--gold-600` `--gold-300` `--gold-100` | 아주 작은 포인트만. **금색 글자(눈썹글·번호·큰 숫자)는 `--gold-600`(#8a6a24, 흰·연한 바탕 4.6:1 이상)**, `--gold-500` 은 선·점에만 |
| 글자 | `--ink` / `--ink-2` / `--muted` | 본문 / 보조 문단 / 흐린 글(`#5f6c81`, 연한 바탕에서도 4.9:1 이상) |
| 선·바탕 | `--line` / `--line-2` / `--bg-alt` | 구분선 / 진한 구분선·입력칸 / 회색빛 바탕 |
| 글꼴 | `--f-serif` | Noto Serif KR — 한글 제목 |
|  | `--f-serif-en` | Noto Serif — 영문 문장 |
|  | `--f-display` | Cinzel — 영문 대문자 장식(WORLD HOPE DECLARATION) |
|  | `--f-sans` | Pretendard — 본문 |
|  | `--f-head` | 제목용(한국어 모드 = serif KR, 영어 모드 = Noto Serif 자동 전환) |
| 모서리 | `--radius-btn` 4px(모든 버튼) · `--radius-xs` 3px(입력칸) · `--radius-sm` 6px · `--radius` 8px(카드) · `--radius-lg` 10px(모달) |
| 그림자 | `--shadow-sm`(쉬는 카드) · `--shadow`(hover·펼친 카드·사진 타일) · `--shadow-lg`(모달) · `--shadow-art`(사진·종이·선정패 같은 큰 그림, 통계 카드) — 이 네 가지만 씀 |
| 레이아웃 | `--container` 1240px · `--gutter` clamp(20px, 4vw, 48px) · `--header-h` 76px(1280px 이상) · 72px(1081–1279px) · 60px(1080px 이하) · 53px(760px 이하) · `--tabbar-h` 58px — 헤더·본문·홈 블록·푸터가 같은 왼쪽 끝(1440px 화면 x=100, 1920px x=340) |
| 움직임 | `--ease-out` · `--ease-in-out` · `--dur-1` 160ms(색) · `--dur-2` 280ms(버튼·화살표) · `--dur-3` 700ms(스크롤 등장) |
| 질감 | `--grain` — 사진 위 고운 입자(`mix-blend-mode: overlay`, 투명도 .14–.16) |

글꼴 도우미 클래스: `.serif` `.serif-en` `.caps`(Cinzel 대문자) `.lead`(18px 보조 문단) `.nowrap`(한 덩어리로 묶을 짧은 말, 예: `<span class="nowrap">쓸 수 있습니다.</span>`).

- **숫자 글꼴**: Cinzel 의 ‘1’ 은 로마 숫자 I 처럼 보여 ‘11’ 이 ‘II’ 로 읽힘 → 분야 번호(01–11)·날짜·세부 번호는 Noto Serif(`--f-serif-en`).
  Cinzel 숫자는 01–05 처럼 1이 겹치지 않는 큰 장식 숫자에만.
- **줄바꿈**: 제목(h1–h3, `.section-title`, `.cta-title`)은 `text-wrap: balance`, 문단·목록은 `text-wrap: pretty`(공통 CSS).
  그래도 끝에 한 낱말만 남으면 그 말과 앞말을 `.nowrap` 으로 묶음(뜻이 끊기는 ‘쓸 수 / 있습니다’ 같은 곳 우선).
- **모서리**: 카드처럼 생긴 것(분야 칸·원칙 카드·아코디언)은 `--radius`(8px), 버튼·칩은 `--radius-btn`(4px), 큰 그림·ID 카드·모달은 `--radius-lg`(10px).
- **선 아이콘 크기는 세 가지**: 24px(선 1.5) · 32px(선 1.25) · 40px(선 1.25). 통계 띠(홈·세계지도)는 40px, 5대 가치는 모든 페이지 32px.

### ™ 규칙 (의뢰인 요청 2026-10-13 “한 화면에 하나”)
- **한 페이지에 많아야 한 번**, 그 페이지에서 세계희망선언 이름이 **큰 제목·머리 눈썹글로 처음 나오는 곳**에만 `<sup class="tm">™</sup>`
  (제목 크기의 0.4배, Noto Serif, 글자 윗선에 간격 없이). 지금 위치: 홈 큰 제목 · 선언문 머리 눈썹글(THE WORLD HOPE DECLARATION™) ·
  글로벌 33 제목 · 비전과 미션 ‘세계희망선언™ 5대 가치’ · 참여하기 ‘세계희망선언™ 참여 신청’(영어 화면은 이름이 제목에 없는 곳은 생략).
- 문장 속·질문(FAQ)·작은 글씨·그림 속(선정패·ID 카드 모양)·헤더 로고·세로 문구에는 넣지 않음. 대표 33인 추천 페이지는 머리 사진(선정패)에
  ™ 가 이미 그려져 있어 따로 넣지 않음. 이용약관 제7조(표장 조항)만 예외로 명칭을 ™ 와 함께 적음.
- QR코드를 보여 주는 곳(QR 창·QR코드 만들기·ID 카드 예시·FAQ QR 답변·이용약관)에는 “QR코드는 (주)덴소웨이브의 등록상표입니다.” 한 줄.

## 4. 여백 규칙

- 섹션: `.section`(위아래 112px, 760px 이하 72px) · `.section-sm`(64px) — 섹션 안에서 따로 padding 주지 않기.
- 스크롤 등장: 각 섹션(`main > section`, 첫 섹션 제외)의 `.container` 바로 아래 요소 앞 4개가 자동으로 차례로 떠오름(main.js).
  문단 하나하나에 `.reveal` 을 달지 않음 — 제목 묶음·카드 묶음 단위로만. 끄려면 섹션에 `data-no-reveal`.
- 섹션 제목 묶음 아래 52px(모바일 34px) 자동. 카드 그리드 간격 24px(`.grid`), 촘촘한 목록 16px.
- 배경 교차: 흰 섹션 → `.section-alt`(연회색) 또는 `.section-sky`(연하늘 그라데이션) → 흰 섹션. 어두운 띠는
  페이지당 최대 1개(`.cta-band` 또는 `.section-navy`).
- 본문 폭: 긴 글은 `.container.container-narrow`(860px).
- 360–1440px 에서 가로 스크롤이 생기지 않게: 고정 폭(px) 대신 grid/flex + `min-width:0`.

## 5. 버튼 · 링크

```html
<a class="btn btn-primary" href="declaration.html"><span class="ko">세계희망선언문 보기</span><span class="en">Read the Declaration</span><span data-icon="arrow-right"></span></a>
<a class="btn btn-outline" href="join.html">…</a>
<a class="btn btn-light">…</a>        <!-- 어두운 배경 위 흰 버튼 -->
<a class="btn btn-ghost-light">…</a>  <!-- 어두운 배경 위 흰 외곽선 -->
```
높이 52px · 모서리 4px · 그라데이션·그림자 없이 평평하게(마우스를 올리면 1px 떠오름). 크기 `.btn-sm`(44px) `.btn-lg`(56px, 760px 이하 52px), 가득 `.btn-block`.
높이는 크기마다 한 가지 — 페이지에서 `min-height` 를 따로 주지 않음(칩 `.chip` 도 44px).
`.btn-navy`=`.btn-primary`. `.btn-gold` 는 후원 버튼에만. 한 쌍의 버튼은 화살표 아이콘을 둘 다 넣거나 둘 다 빼기.
글 링크: `<a class="link-arrow" href="…">자세히 보기</a>` (→ 자동).

## 6. 하위 페이지 상단 (라이트 히어로)

```html
<section class="page-hero">              <!-- .center 가운데 정렬, .compact 낮은 높이, .no-motif 점 지도 빼기 -->
  <div class="container">
    <nav class="breadcrumb" aria-label="breadcrumb"><a href="index.html"><span class="ko">홈</span><span class="en">Home</span></a><span aria-hidden="true">/</span><span><span class="ko">세계희망선언</span><span class="en">Declaration</span></span></nav>
    <h1><span class="ko">세계희망선언문</span><span class="en">The World Hope Declaration</span></h1>
    <p class="page-hero-en">World Hope Declaration</p>   <!-- 금색 눈썹글: CSS(order)로 제목 '위'에 표시 -->
    <p><span class="ko">한두 문장 소개</span><span class="en">One or two lines</span></p>
  </div>
</section>
```
- 한 가지 공식: 경로 → 금색 눈썹글(Cinzel 12px · 28px 선) → 제목(32–48px) → 설명. 높이 340px 이상, 위아래 88/72px.
  **위 여백 88px 은 모든 머리말이 같음**(`.compact`·선언문·글로벌 33·참여하기·대표 33인 추천 포함) → 경로가 어느 페이지에서나 같은 높이.
  오른쪽에 그림이 있는 머리말은 경로를 격자 **밖** 한 줄로 두고, 그 아래 격자(글 | 그림)는 위쪽 맞춤(`align-items: start`).
- 가운데 정렬 머리말(`.center`, 선언문)은 바로 아래 페이지 안 메뉴(`.subnav`)도 가운데 — 의도한 짝. 다른 페이지는 왼쪽.
- 오른쪽의 옅은 점 세계지도는 `.page-hero::after` (assets/img/brand/dotmap.svg, 왼쪽은 서서히 사라짐). 그림이 따로 있는
  머리말(글로벌 33 문장·대표 추천 선정패·참여하기 카드·세계지도)은 `.no-motif`.
- 760px 이하: 경로 숨김, 왼쪽 정렬, 제목 30px, 설명 15.5px, 버튼은 한 줄에 하나(높이 52px). 그림은 버튼 아래(또는 같은 그림이
  아래 구역에 있으면 숨김) — 머리말이 390px 화면에서 520px 안팎에 끝나도록.

## 7. 섹션 제목

```html
<div class="section-head">               <!-- 기본: 왼쪽 / .center: 가운데 / .split: 왼쪽 제목 | 오른쪽 설명 (5:6) -->
  <span class="eyebrow">Five Principles</span>          <!-- 금색 눈썹글 (Cinzel 12px · 28px 선) -->
  <h2 class="section-title"><span class="ko">세계희망선언 5대 원칙</span><span class="en">The Five Principles</span></h2>
  <p class="section-sub">Five Principles</p>             <!-- 머리말 안의 section-sub 는 CSS 로 제목 '위' 눈썹글이 됨 -->
  <p class="section-lead"><span class="ko">설명</span><span class="en">Lead</span></p>
</div>
```
`eyebrow` 와 `section-sub` 는 둘 중 하나만. 한글을 넣어도 됩니다(자간 자동 축소, 영어만 든 `.ko` 는 `lang="en"` 을 붙이면 Cinzel 유지).
**한 페이지에 가운데 정렬 머리말은 많아야 1개**, 나머지는 `.split` 과 왼쪽을 번갈아 씁니다. 제목(h2) 최대 36px, 머리말과 내용 사이 56px.
어두운 띠 안(`.section-navy`, 네이비 `.cta-band`)에서는 금색이 밝게 바뀝니다.

### 페이지 안 메뉴 / 탭

```html
<nav class="subnav" aria-label="선언문 메뉴"><div class="container"><ul>
  <li><a href="#principles">…</a></li><li><a href="#values">…</a></li>
</ul></div></nav>                         <!-- 헤더 아래에 고정. 현재 위치는 a.is-active -->

<div class="tabs" role="tablist">          <!-- 버튼 탭: aria-selected="true" 가 선택 -->
  <button type="button" role="tab" aria-selected="true">…</button>
  <button type="button" role="tab" aria-selected="false">…</button>
</div>
```
고정 메뉴로 이동하는 구역에는 `style="scroll-margin-top:130px"`.

## 8. 공통 부품

### 그리드 · 카드
```html
<div class="grid grid-3">                 <!-- grid-2 / grid-3 / grid-4 / grid-5 (자동 반응형) -->
  <article class="card">                  <!-- .flat: hover 효과 없음, .navy: 네이비 카드 -->
    <div class="card-icon" data-icon="book"></div>
    <span class="card-num">01</span>
    <h3><span class="ko">제목</span><span class="en">Title</span></h3>
    <span class="card-en">English subtitle</span>
    <p>…</p>
  </article>
</div>
```
링크 카드: `<a class="card card-link" href="…">…<span class="link-arrow">…</span></a>`.

### 배지 · 예시 표시 · 안내 상자
```html
<span class="badge badge-navy">공지</span>   <!-- badge-notice / -news / -press / -sample / -navy / -outline / -gold -->
<span class="sample-tag"><span class="ko">예시</span><span class="en">Sample</span></span>
<div class="notice-box">금색 안내</div>  <div class="notice-box blue">파란 안내</div>
<span class="placeholder-note">자료 준비 중</span>
```

### 목록 · 표 · 인용
```html
<ul class="dot-list"><li>…</li></ul>      <ul class="check-list"><li>…</li></ul>
<dl class="kv"><dt>이름</dt><dd>…</dd></dl>
<div class="table-wrap"><table class="table"><thead><tr><th>…</th></tr></thead><tbody><tr><td>…</td><td class="num">33</td></tr></tbody></table></div>

<blockquote class="quote-block">         <!-- 포스터 문구 같은 큰 인용 -->
  <p>분열을 넘어 화해로, 절망을 넘어 희망으로</p>
  <p class="quote-en">From Division to Reconciliation, From Despair to Hope</p>
</blockquote>
<blockquote class="verse"><p class="ko">말씀</p><p class="en">Verse</p><cite>…</cite></blockquote>
<div class="prose">긴 글(약관 등): h2/h3/ul/ol/table 자동 스타일</div>
```

### 2단 (글 + 이미지)
```html
<div class="split">                       <!-- .split.reverse 는 이미지 왼쪽 -->
  <div>…글…</div>
  <figure class="media-frame"><img src="…" alt="…" width="…" height="…" loading="lazy"><figcaption>…</figcaption></figure>
</div>
```

### 키워드 줄
```html
<p class="keywords"><span>평화</span><span>지구환경</span><span>사람</span><span>연대</span><span>실천</span></p>
<p class="keywords en"><span>PEACE</span><span>PLANET</span><span>PEOPLE</span><span>PARTNERSHIP</span><span>ACTION</span></p>
```

---

## 9. 통계 숫자 (data/stats.json)

`data/stats.json`: `countries, per_country, fields, per_field, target, participants, updated, note`.
HTML 에 **기본값을 적은 요소**에 `data-stat="키"` 를 달면 main.js 가 자동으로 바꿔 넣습니다(천 단위 쉼표).

```html
<b data-stat="countries">195</b>  <b data-stat="target">6,435</b>  <span data-stat="updated">2026-10-12</span>
```
- 나중에 JS 로 그린 영역: `WH.fillStats(rootEl)` 호출. 값만 필요하면 `WH.stats().then(function (s) { … })`
  (실패 시 `null`). 채운 뒤 `document` 에 `wh:stats` 이벤트(detail = stats)가 발생합니다.
- 공식 예: 세계 각국 33인 × `<span data-stat="countries">195</span>`개국 = `<span data-stat="target">6,435</span>`인.

## 10. 홈 화면 부품 (index.html)

### 히어로 `.wh-hero`
```html
<section class="wh-hero" aria-labelledby="hero-title">
  <picture class="wh-hero-media">
    <source srcset="assets/img/home/hero-earth.webp" type="image/webp">
    <img src="assets/img/home/hero-earth.jpg" alt="" width="1052" height="864" fetchpriority="high">
  </picture>
  <div class="container wh-hero-inner">
    <div class="wh-hero-text">
      <p class="wh-hero-kicker"><span class="ko">분열을 넘어, 함께 만드는 더 나은 세상</span><span class="en">…</span></p>
      <h1 class="wh-hero-title" id="hero-title"><span class="ko">세계희망선언</span><span class="en">…</span><sup>™</sup></h1>
      <p class="wh-hero-en">WORLD HOPE DECLARATION</p>   <!-- ™ 는 위 큰 제목에만 (한 화면에 하나) -->
      <p class="wh-hero-lead"><span class="ko">국가·인종·종교·이념을 넘어<br>인류가 함께 살아갈 새로운 세계의 기준을 선언합니다.</span><span class="en">…</span></p>
      <p class="wh-hero-quote">From Division to Hope,<br>Together for a Better World.</p>
      <div class="wh-hero-actions">
        <a class="btn btn-primary btn-lg" href="declaration.html">…<span data-icon="arrow-right"></span></a>
        <a class="btn btn-outline btn-lg" href="join.html">…<span data-icon="arrow-right"></span></a>
      </div>
    </div>
    <ul class="wh-hero-vertical" aria-hidden="true"><li>ONE</li><li>HUMANITY</li><li>ONE</li><li>PLANET</li><li>ONE</li><li>HOPE</li></ul>
  </div>
</section>
```
데스크톱: 왼쪽 글 + 오른쪽 지구(왼쪽으로 흰색 페이드). 760px 이하: 가운데 정렬, 지구는 아래쪽, 버튼 세로(두 번째는 흰 버튼).
`.wh-hero-title` 은 한 줄 고정(`nowrap`) — 영문 제목은 짧게.

### 통계 띠 `.stats-band`
```html
<section class="stats-band" aria-label="세계희망선언 현황" data-en-aria-label="Declaration at a glance">
  <div class="container"><ul class="stats">
    <li class="stat-item">
      <span class="stat-icon" data-icon="world"></span>
      <div class="stat-body">
        <p class="stat-num"><b data-stat="countries">195</b><small><span class="ko">개국</span><span class="en">nations</span></small></p>
        <p class="stat-label">Countries</p>                      <!-- 대문자 자동 -->
        <p class="stat-desc"><span class="ko">세계희망선언 대상 국가</span><span class="en">…</span></p>
      </div>
    </li>
    <!-- people + per_country "인/각국" (label: <span class="hide-mobile">Representatives<br></span>per country)
         target + target "명" · users + participants "명" (label: <span class="hide-mobile">Current </span>participants) -->
  </ul></div>
</section>
```
모바일에서는 4칸 세로 쌓기, `.stat-desc` 숨김. 긴 라벨은 `hide-mobile` 로 앞부분을 숨겨 줄바꿈을 막습니다.

### 5대 원칙 띠 `.principles-band` (안개 낀 산 배경은 CSS 로 자동)
```html
<section class="principles-band" aria-labelledby="pr-title">
  <div class="mountains" aria-hidden="true"></div>
  <div class="container">
    <div class="section-head center">
      <h2 class="section-title" id="pr-title"><span class="ko">세계희망선언 5대 원칙</span><span class="en">The Five Principles</span></h2>
      <p class="section-sub">Five Principles</p>
    </div>
    <ol class="principles">
      <li class="principle">   <!-- 링크로: <li><a class="principle" href="declaration.html#p1">…같은 내용…</a></li> -->
        <span class="principle-no">01</span>
        <h3 class="principle-title"><span class="ko">이중개념</span><span class="en">Dualism</span></h3>
        <p class="principle-en">Dualism</p>
        <p class="principle-text"><span class="ko">이중개념을 인정하라.</span><span class="en">Recognize Dualism.</span></p>
      </li>
      …(5개)
    </ol>
  </div>
</section>
```
데스크톱 5칸(왼쪽 얇은 선) → 960px 2칸 → 560px 한 줄 목록.

### 사진 타일 `.tiles`
```html
<nav class="tiles" aria-label="바로가기" data-en-aria-label="Quick links">
  <a class="tile" href="declaration.html">
    <picture><source srcset="assets/img/home/tile-declaration.webp" type="image/webp"><img src="assets/img/home/tile-declaration.jpg" alt="" width="843" height="372" loading="lazy"></picture>
    <span class="tile-body"><b class="tile-title"><span class="ko">세계희망선언문</span><span class="en">The Declaration</span></b><span class="tile-en">The Declaration</span></span>
    <span class="tile-arrow" data-icon="arrow-right"></span>
  </a>
  <!-- global33 (795×372) · worldmap (828×372) · join (786×372) -->
</nav>
```
화면 폭 전체(컨테이너 밖에 둠), 4칸 → 960px 이하 2×2.

### 홈 첫 화면 (index.html 전용 `.home-*` · style.css ‘홈 (index.html 전용)’)
위의 공용 부품과 같은 구성을 홈 전용으로 다듬은 것입니다. (2026-10-13 의뢰인: “디테일도 잘 보고 … 디자인도 더 잘할 수 있으면 바꿔도 돼” →
시안 C(밝은 새벽빛 시안을 살린 고급화)를 바탕으로, 다른 시안의 좋은 점을 더함)
```html
<section class="home-hero" aria-labelledby="hero-title">
  <div class="home-hero-media" aria-hidden="true"><div class="home-hero-bg"><picture>…</picture><span class="home-hero-sun"></span></div></div>
  <div class="home-frame home-hero-inner">
    <div class="home-hero-text">
      <p class="home-hero-kicker">…</p>
      <h1 class="home-hero-title" id="hero-title"><span class="ko">세계희망<wbr>선<span class="nb">언<sup>™</sup></span></span><span class="en">World Hope <span class="nb">Declaration<sup>™</sup></span></span></h1>
      <p class="home-hero-en"><span class="ko">WORLD HOPE DECLARATION</span><span class="en" lang="ko">세계희망선언</span></p>
      <span class="home-hero-rule" aria-hidden="true"></span>   <!-- 가는 선 · 앞쪽 44px 금색 (휴대폰 숨김) -->
      <p class="home-hero-lead">…</p> <p class="home-hero-quote" lang="en">…</p>
      <div class="home-hero-actions"><a class="home-btn home-btn-solid" …>…</a><a class="home-btn home-btn-line" …>…</a></div>
    </div>
    <p class="home-hero-vertical" aria-hidden="true"><span><i>ONE</i> HUMANITY</span>…</p>   <!-- ™ 넣지 않음 -->
  </div>
</section>
<div class="home-band"><div class="home-band-mist" aria-hidden="true"></div> 통계 카드 · 5대 원칙 · 사진 타일 </div>
```
- `.home-hero`: 높이 `--hero-h` = 화면 폭의 44%(520–700px, 화면이 낮으면 줄임 · 영어는 제목이 두 줄이라 +36px, 최대 736px).
  사진 속 해가 화면 폭 `--sun-x`(76%)에 오도록 사진을 놓고, 글 뒤에는 옅은 새벽빛 막. 사진 확대는 1920px 화면에서도 약 1.13배(1.25배 이하).
  큰 제목 `세계희망선언™` 과 영문 `WORLD HOPE DECLARATION` 은 같은 폭(글자 사이 간격으로 맞춤). 영어 화면은 이름 전체
  `World Hope Declaration™`(두 줄) + 아래 한글 `세계희망선언`(넓은 자간). 화면 높이 800px 이하(1280×720 · 1366×768 노트북 등)는 제목·간격을 줄임.
- **™ 는 한 화면에 한 번만** — 큰 제목에만. 세로 문구(ONE HUMANITY…)·헤더 로고·통계에는 넣지 않습니다(점검: 보이는 글자에서 ™ 개수 = 1).
- 히어로 아래 끝: 통계 카드가 `--lap`(76px, 휴대폰 30px)만큼 사진 위에 걸치고, 사진은 카드 위쪽 뒤까지 이어지다가 마지막
  `--feather`(128px) 동안 띠 맨 위 색(#f1f0ec, 안개 사진 윗줄 색)으로 사라짐(`.home-hero::after`). `.home-band` 는 `display: flow-root`
  (카드의 음수 여백이 띠 밖으로 새어 띠가 사진을 덮지 않게). 안개 사진도 맨 위는 투명에서 시작 → 사진과 띠 사이에 곧은 선이 없음.
- `.home-stats-card`: 흰 카드 · 모서리 8px · 위쪽 2px 금색 선(처음 열 때 왼쪽부터 그어짐). 데스크톱은 금색 영문 이름 → 숫자 → 설명
  (읽는 순서는 숫자 먼저, subgrid 로 네 칸 줄 맞춤). 영어는 단위(nations·people)를 숨기고 참여자 칸 설명은 ‘As of 날짜’만(같은 말 반복 없음).
  휴대폰은 **2×2**: 칸마다 ‘아이콘 · 숫자 단위’ 한 줄 + 금색 영문 이름 전체(REPRESENTATIVES / PER COUNTRY 처럼 두 줄까지, 줄여 쓰지 않음),
  아래에 기준일 한 줄. 390×844·360×740 에서 카드 전체가 하단 탭바 위, 카카오톡 안 브라우저(390×664)에서도 네 숫자가 모두 보임.
- 버튼: 데스크톱(밝은 하늘 위)은 네이비 주 버튼 + 네이비 테두리 버튼. 휴대폰(어두운 지구 위)은 **아이보리 주 버튼 + 흰 테두리 유리 버튼**
  (주 버튼이 가장 또렷하게 · 키보드 표시는 금색).
- 세로 문구: 모든 낱말 굵게 + 또렷한 그림자 + 글자 뒤에만 옅은 남색 그늘(둥글게 번짐, 모양은 보이지 않음) → 밝은 하늘 위에서도 읽힘(2200px 이상은 네이비 글자·그늘 없음). 스크롤 안내 표시는 두지 않음.
- 헤더: 맨 위에서도 아래에 아주 옅은 가는 선(모든 페이지) → 흰 헤더와 히어로·머리말의 경계가 또렷함.
- `.home-pr`: 5대 원칙 카드(마우스를 올리면 떠오르며 위쪽 금색 선 · 표식이 화살표로). 휴대폰은 옆으로 넘기는 카드 + 점 표시.
  휴대폰 5대 가치(`.hs-values-list`)도 옆으로 넘기는 칸 + 같은 점 표시(넘길 수 있는 자리 수만큼, home.js).
- 통계 띠 네 칸은 같은 폭 → 칸 사이 세로선이 아래 사진 타일 사이 틈과 같은 자리.
- `.home-tile-desc`: 타일 설명 줄 = main.js 사이트 검색 색인(`PAGES`)의 페이지 설명 문구 그대로(숫자는 `data-stat`).
- 움직임: 히어로 사진이 천천히 다가오고 햇빛이 숨 쉬듯, 안개 낀 산이 천천히 좌우로, 타일 사진이 천천히 다가옴(화면 밖·다른 탭에서는 멈춤).
  처음 열 때 글이 차례로 떠오르고 가는 선·카드 금색 선이 그어지며, 참여자 수가 0에서 올라감. **‘동작 줄이기’면 모두 멈춘 최종 모습**(참여자 수도 처음부터 최종 값).
- 넣지 않기로 한 것: 휴대폰 히어로의 한 줄 표어(ONE HUMANITY • …) — 바로 위 영문 인용과 겹치고 첫 화면 길이를 늘림. 휴대폰 원칙 목록형 —
  시안의 넘기는 카드 유지(홈 길이).

### 첫 화면 아래 이야기 `.hs` (index.html S1–S8 · style.css ‘홈 — 첫 화면 아래 이야기’)
시안 첫 화면(히어로·통계·5대 원칙·타일) 아래에 8개 섹션이 이어집니다. 문구는 **모두 다른 페이지 문구를 그대로** 가져왔고
(출처는 index.html 의 섹션 주석), 원래 페이지 문구를 고치면 홈도 함께 고쳐 주세요.

| 섹션 | 클래스 | 바탕 | 자료 |
|---|---|---|---|
| S1 선언 한 문장 | `.hs-statement` | 흰색 | declaration.html 머리말 · vision.html 미션 설명 · 취지문 한 구절 |
| S2 5대 원칙 풀이 + 5대 가치 | `.hs-alt.hs-decl` | 아이보리 | declaration.html #p1–#p5 · #values (왼쪽 제목은 따라 내려옴, 960px 이하 해제) |
| S3 글로벌 33 | `.hs-g33` | 흰색 | 분야 11칸 = `data/selection-criteria.json`(home.js) · 추천 절차 = korea33.html |
| S4 세계희망지도 | `.hs-map` | 네이비 | `assets/img/brand/dotmap-light.svg` + 참여 국가 `data/countries.json` (금색 표시 위치는 `worldmap-dots.json` 으로 계산) |
| S5 위원장 인사말 | `.hs-msg` | 흰색 | about.html #greeting (사진·대체 글 포함) |
| S6 소식·응원 | `.hs-alt.hs-news` | 아이보리 | `data/posts.json` 최근 3개(글이 없으면 섹션 숨김) · `data/cheers.json`(게시된 것이 있을 때만) |
| S7 함께하기 | `.hs-act` | 네이비(아래쪽 새벽빛) | declaration.html ‘공동의 선언, 하나의 인류’ · join.html 세 갈래 (후원 링크는 후원 방법 확정 뒤) |
| S8 말씀·연락처 | `.hs-close` | 흰색 | vision.html 로마서 15:13(© 표기 포함) · 아래 한 줄 `.hs-contact` = 전국대표전화(`config.js` phone) + 문의하기·오시는 길·자주 묻는 질문 (주소·이메일은 바로 아래 푸터에만 · 휴대폰은 숨김) |

공통 부품: `.hs-eyebrow`(금색 선 + 대문자 꼬리표, 가운데 정렬은 부모에 `.is-center`) · `.hs-title` · `.hs-lead` · `.hs-link`(화살표 4px 이동) ·
`.hs-actions`(버튼 줄) · `.hs-rule`(48px 금색 선). 카드·줄 전체를 누르게 하려면 제목 링크에 `.hs-stretch`(읽기 프로그램은 제목만 링크로 읽음).
등장 효과: 요소에 `.reveal` + `style="--i:n"`(main.js), 칸 묶음은 `.hs-stagger reveal` + 칸마다 `--k`(0.055초 간격).
처음에 숨겨 두는 모습은 ‘동작 줄이기’가 아닐 때만 적용됩니다. 계속 움직이는 것은 지도 금색 표시의 물결 하나(화면 밖에서는 멈춤).

**바탕 순서(리듬)**: 밝은 첫 화면 → 흰색 S1 → 아이보리 S2 → 흰색 S3 → **네이비 S4** → 흰색 S5 → 아이보리 S6 → **네이비 S7** → 흰색 S8 → 네이비 푸터.
홈의 어두운 띠는 S4·S7 둘뿐이고 서로 붙지 않습니다(S6 이 숨겨져도 사이에 흰색 S5). 두 띠는 모양을 다르게 둡니다 —
S4 는 오른쪽이 밝은 네이비 + 점 세계지도, S7 은 점 지도 없이 아래쪽 가운데에서 떠오르는 옅은 새벽빛(첫 화면 햇빛 색) + 아래로 밝아지는 네이비.
(하위 페이지 맺음 띠 `.cta-band` 는 그대로 점 지도 장식)

## 11. 세계희망선언문 부품

### 상세 원칙 목록 `.decl-list`
```html
<ol class="decl-list">
  <li class="decl-item" id="p1">
    <span class="decl-no" aria-hidden="true">01</span>          <!-- 금색(--gold-600) Cinzel 숫자 하나 (동그라미·아이콘 없음) -->
    <div class="decl-body">
      <h3 class="decl-title"><span class="sr-only">1. </span><span class="ko">이중개념을 인정하라.</span><span class="en">Recognize Dualism.</span></h3>
      <p class="decl-meta"><span class="ko">二重槪念 · Dualism</span><span class="en" lang="ko">이중개념 · 二重槪念</span></p>
      <p class="decl-text ko">우리는 세상에 존재하는 …</p>
      <div class="decl-en">                                      <!-- 한국어 화면: 왼쪽 가는 선과 함께 옅게 -->
        <p class="decl-en-title ko" lang="en">Recognize Dualism.</p>
        <p class="decl-en-text" lang="en">Acknowledge the twofold reality …</p>
      </div>
    </div>
  </li>
</ol>
```
120px 숫자 칸 | 본문. 휴대폰에서는 숫자가 제목 위로 올라가고, 선언문 종이가 화면 끝까지 넓어집니다(본문 폭 확보).

### 5대 가치 `.values`
```html
<ul class="values">
  <li class="value">
    <span class="value-icon" data-icon="leaf"></span>
    <b class="value-ko"><span class="ko">평화</span><span class="en">Peace</span></b>
    <span class="value-en">Peace</span>
    <p class="value-text"><span class="ko">분쟁을 넘어 화해와 공존으로</span><span class="en">From Conflict to Reconciliation and Coexistence</span></p>
  </li>
</ul>
```
권장 아이콘: 평화 `leaf`, 지구환경 `world`, 사람 `people`, 연대 `hands`, 실천 `sprout`.

## 12. 글로벌 33 부품

### 분야 카드 `.field-grid`
```html
<ol class="field-grid">
  <li class="field-card" style="--accent:#b24b34">   <!-- 분야 색은 번호 앞 8px 점에만 -->
    <div class="field-card-top"><span class="field-no"><span class="field-dot" aria-hidden="true"></span><span class="field-word">Field&nbsp;</span>01</span><span class="field-count"><span data-stat="per_field">3</span><span class="ko">인</span><span class="en"> persons</span></span></div>
    <span class="field-icon" data-icon="megaphone"></span>
    <h3 class="field-name"><span class="ko">사회영향력</span><span class="en">Social Influence</span></h3>
    <p class="field-en">Social Influence</p>
    <p class="field-desc"><span class="ko">사회에 긍정적 영향을 미치는 인물</span><span class="en">…</span></p>
  </li>
</ol>
```
4칸 → 3칸 → 2칸 → (760px 이하) 흰 카드 한 장 안의 목록. 아이콘은 동그라미 없이 32px 선 아이콘. 칸 전체가 그 분야의 추천 안내
(`korea33.html#field-NN`, 그 분야가 펼쳐짐)로 가는 링크 — 제목 링크 `.field-card-link` 를 칸 전체로 넓힘. 권장 아이콘: 사회영향력 `megaphone`, 국위선양 `trophy`, 교육계 `book`,
문화예술계 `palette`, 종교계 `cross`(단순 십자, 개신교), 산업계 `chart`, 국방사회안전 `shield`, 의료계 `medical`,
생업종사자 `tool`, 시민 `users`, 정치계 `landmark`.

### 공식 `.formula`
```html
<p class="formula">
  <span class="formula-term"><b data-stat="per_country">33</b><small><span class="ko">인</span><span class="en">persons</span></small></span>
  <span class="formula-op">×</span>
  <span class="formula-term"><b data-stat="countries">195</b><small><span class="ko">개국</span><span class="en">nations</span></small></span>
  <span class="formula-op">=</span>
  <span class="formula-term is-result"><b data-stat="target">6,435</b><small><span class="ko">인</span><span class="en">persons</span></small></span>
</p>
<p class="formula-caption">…</p>
```

### ID 카드 예시 `.idcard` (가상 이름만)
```html
<div class="idcard-pair">
  <figure class="idcard">
    <span class="sample-tag"><span class="ko">예시</span><span class="en">Sample</span></span>
    <div class="idcard-head"><img src="assets/img/brand/logo-mark-160.png" alt="" width="38" height="38"><div><b>세계희망선언</b><small>WORLD HOPE DECLARATION</small></div></div>
    <p class="idcard-role">글로벌 대표<small>Global Representative</small></p>
    <div class="idcard-main">
      <div class="idcard-photo" aria-hidden="true"></div>     <!-- 실루엣 자리표시 (사진 금지) -->
      <dl class="idcard-rows">
        <div><dt>이름<small>Name</small></dt><dd>홍길동 HONG GIL-DONG</dd></div>
        <div><dt>국가<small>Country</small></dt><dd>대한민국 KOREA</dd></div>
        <div><dt>분야<small>Field</small></dt><dd>5. 종교계</dd></div>
        <div><dt>ID No.</dt><dd>WHD-KOR-05-001</dd></div>
      </dl>
      <div class="idcard-qr"><canvas width="116" height="116"></canvas></div>  <!-- WH.loadQR → WH.drawQR -->
    </div>
    <p class="idcard-org">세계희망선언위원회<small>World Hope Declaration Council</small></p>
  </figure>
  <figure class="idcard is-back">
    <span class="sample-tag">…</span>
    <img src="assets/img/brand/logo-mark-160.png" alt="" width="72" height="72">
    <b>세계희망선언</b><small>WORLD HOPE DECLARATION</small>
    <p class="keywords"><span>평화</span><span>지구환경</span><span>사람</span><span>연대</span><span>실천</span></p>
  </figure>
</div>
```

### 패 `.plaque` (문구 예시)
```html
<figure class="plaque">
  <span class="sample-tag">…</span>
  <img src="assets/img/brand/logo-mark-160.png" alt="" width="64" height="64">
  <p class="plaque-title">세계희망선언</p><p class="plaque-sub">WORLD HOPE DECLARATION</p>
  <p class="plaque-text">당신은 세계희망선언의 정신에 동의하고 …</p>
  <p class="plaque-text-en">In recognition of your commitment …</p>
  <p class="plaque-org">세계희망선언위원회<small>World Hope Declaration Council</small></p>
</figure>
```

## 13. 흐름 · CTA · 지도

```html
<ol class="flow">                          <!-- 가로 단계(모바일은 세로 선) -->
  <li class="flow-step"><span class="flow-icon" data-icon="book"></span><span class="flow-no">STEP 01</span>
    <h3 class="flow-title">연구·채택</h3><p class="flow-text">…</p></li>
</ol>

<section class="cta-band">                 <!-- 네이비 띠(오른쪽 아래 옅은 점 세계지도). .cta-band.light 는 연하늘 -->
  <div class="container cta-inner">
    <div><span class="eyebrow">Join Us</span><h2 class="cta-title">…</h2><p class="cta-text">…</p></div>
    <div class="cta-actions"><a class="btn btn-light btn-lg" href="join.html">…</a><a class="btn btn-ghost-light btn-lg" href="contact.html">…</a></div>
  </div>
</section>
<!-- .cta-band.light 안에서는 btn-primary / btn-outline 사용 -->

<div class="map-panel"><svg viewBox="…">…</svg>
  <ul class="legend"><li><span class="legend-dot"></span>대상 국가</li><li><span class="legend-dot is-active"></span>선정 진행</li><li><span class="legend-dot is-gold"></span>…</li></ul>
</div>
```

## 14. 폼 (forms.js 로 이메일 접수)

```html
<form class="form-card" data-wh-form="join" data-subject-ko="[세계희망연대 홈페이지] 참여 신청"
      data-ok-ko="신청이 전달되었습니다. 감사합니다." data-ok-en="Your application has been sent. Thank you.">
  <h3>…</h3><p>…</p>
  <div class="form-grid">                  <!-- 2칸, .full 은 한 줄 전체 -->
    <div class="field"><label for="j-name"><span class="ko">이름</span><span class="en">Name</span><span class="req">*</span></label>
      <input type="text" id="j-name" name="name" required autocomplete="name"></div>
    <div class="field full"><span class="label">…</span>
      <div class="radio-cards"><label><input type="radio" name="kind" value="a" checked data-label="구분"><span>…</span></label></div></div>
    <div class="hp-field" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>
    <div class="field full"><div class="consent-box"><div class="ko">· 수집 항목 …</div><div class="en">· Items …</div></div>
      <label class="check"><input type="checkbox" name="consent" required> <span>…(<a href="privacy.html">개인정보처리방침</a>)</span></label></div>
    <div class="full"><button type="submit" class="btn btn-primary btn-lg btn-block">…</button></div>
  </div>
</form>
```
`data-label="…"` 은 이메일에 표시될 한국어 항목명. 상태 문구는 `.form-status` 가 자동 생성.

**개인정보 수집·이용 안내 (안쪽 스크롤 상자 대신 항목별 목록)** — 문구는 원문 그대로, '· 라벨: 내용' 을 나눠 표시합니다.
```html
<ul class="consent-list ko">
  <li><b>수집 항목</b><span>이름, 연락처, …</span></li>
  <li><b>수집 목적</b><span>…</span></li>
  <li><b>전달 방법</b><span>… FormSubmit(formsubmit.co, 서버가 국외에 있을 수 있음) …</span></li>
  <li><b>보유 기간</b><span>…</span></li>
  <li class="is-note">동의를 거부하실 수 있으며, …</li>
</ul>
<ul class="consent-list en">…</ul>
<!-- 목록에 넣지 않은 줄(예: 추천서의 '피추천인 정보')이 있으면 원문 전체를 접어서 함께 둠 -->
<details class="consent-more"><summary><span class="ko">개인정보 수집·이용 안내 전문 보기 (필수)</span><span class="en">Read the full privacy notice (required)</span></summary>
  <div class="consent-box is-full" role="region" aria-label="개인정보 수집·이용 안내">(원문 전체)</div></details>
```
동의 체크(`label.check`)는 상자 22px, 줄 높이 44px 이상. 글 속 전화번호는 `<a class="tel-chip" href="tel:15882716"><span data-icon="phone"></span>1588-2716</a>`.

**'준비 중' 안내 한 장** `.empty-panel` (`.empty-panel-icon` · `-title` · `-text` · `-actions`) — 실제 사진이 없는 갤러리(gallery.js),
계좌·결제 설정 전의 후원 페이지(donate.html, `config.bank.account`·`config.portone` 이 비면 `[data-giving-ready]` 구역을 숨김).
갤러리가 예시 사진뿐이면 data.js 가 `<html data-gallery-empty>` 를 붙이고, 갤러리로 가는 링크에 `class="js-gallery-link"` 를 달면 숨겨집니다.
FAQ 아코디언: `<details class="faq-item"><summary><span class="q">Q</span><span>…</span><span class="tg" aria-hidden="true"></span></summary><div class="faq-answer"><span class="a">A</span><div>…</div></div></details>` 를 `.faq-list` 안에.

## 15. 아이콘

`<span data-icon="이름"></span>` (빈 요소에 자동 채움) 또는 JS `WH.icon("이름")`. 선 아이콘(24×24), 색은 `currentColor`,
크기는 부모 CSS 에서 `svg { width; height }`. 사용 가능한 이름:

```
phone mail pin clock qr globe world search thumbtack heart hands message users people user compass book doc
scroll filecheck megaphone sun shield flag calendar image copy download printer share link link2 external card
idcard bank landmark repeat cross seed sprout leaf target award trophy palette chart medical tool
circles layers horizontal balance center unity menu close check chevron-down chevron-right chevron-left
arrow-right youtube instagram facebook blog kakao
```

## 16. JS 도우미 (main.js · data.js)

`WH.ROOT`(사이트 최상위 절대 주소) · `WH.t(ko,en)` · `WH.pick(obj[,field])` · `WH.bi(ko,en)`(ko/en span 쌍) ·
`WH.esc` · `WH.param(k)` · `WH.fmtDate` · `WH.fmtNum` · `WH.textToHtml` · `WH.copy` · `WH.toast` · `WH.loadScript` ·
`WH.baseUrl()` · `WH.pageUrl(path)` · `WH.icon` · `WH.fillIcons(root)` · `WH.applyAttrs(root)`(동적으로 넣은 data-en-* 속성 번역) ·
`WH.loadQR()` · `WH.drawQR(canvas, text, {size, color, logo, margin})` · `WH.stats()` · `WH.fillStats(root)` ·
`WH.openSearch()` · `WH.db.listPosts/getPost/listGallery/listCheers/json(name)` · `WH.mail.send/mailtoHref`.
언어가 바뀌면 `document` 에 `wh:lang` 이벤트 → JS 로 그린 글은 이 이벤트에서 다시 그리기.
`[data-qr-open]` 요소를 누르면 현재 페이지 QR 모달(`data-qr-url` 로 주소 지정 가능).

## 17. 반응형 기준

| 폭 | 변화 |
|---|---|
| ≤1279 | 헤더 72px, 주 메뉴 간격이 화면 폭에 따라 줄어듦(1081px 20px ~ 1280px 40px); 1240px 이하에서 푸터 위 단 2칸 |
| ≤1080 | 모바일 헤더(햄버거 · 가운데 로고 · KOR▾, 영문 단체명 숨김), 전체 메뉴, 하위 메뉴 판 없음 |
| ≤960 | 3·4칸 그리드 → 2칸, 타일 2×2 |
| ≤760 | 하단 탭바, 내리면 헤더·탭바 숨김, 섹션 여백 72px, 홈 히어로 가운데 정렬, 푸터 사이트맵 숨김, `.hide-mobile` 숨김 |
| ≤560 | 거터 16px, 원칙 목록 한 줄 |

`.hide-mobile`(760px 이하 숨김) · `.show-mobile`(761px 이상 숨김).

## 18. 정리 예정 (홈 재작성 후 삭제)

style.css 맨 아래 `[임시] 이전 홈 화면 부품` 블록(`.hero`, `.hero-*`, `.steps`, `.step*`, `.feature-33`, `.big-33`,
`.question-*`)은 현재 index.html 본문만 사용합니다. 홈이 `.wh-hero` 구조로 바뀌면 블록째 지웁니다.
