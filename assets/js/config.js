/* ==========================================================================
   사이트 설정 — 이 파일 하나만 수정하면 사이트 전체에 반영됩니다.
   (값이 비어 있으면 해당 기능은 안전하게 꺼지거나 '준비 중'으로 표시됩니다)
   ========================================================================== */
/* 연결 도메인에 http:// 로 들어오면 https:// 로 옮깁니다 (보안 연결).
   인증서는 발급 완료(2026-10-13, Let's Encrypt). GitHub Pages 의 'Enforce HTTPS' 가 켜지면 서버가 먼저 처리하므로 이 코드는 그대로 두어도 무해합니다. */
(function () {
  if (location.protocol === "http:" && /(^|\.)worldhopedeclaration\.com$/i.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
  }
})();

window.WH_CONFIG = {
  /* ---- 기본 정보 ---- */
  siteUrl: "https://www.worldhopedeclaration.com", // 도메인 연결 후 입력. 예: "https://www.example.org" (QR코드·공유 링크 기준 주소, 비우면 현재 접속 주소)
  name: { ko: "세계희망연대", en: "World Hope Declaration Network" },
  declaration: { ko: "세계희망선언", en: "World Hope Declaration" }, // 대표 브랜드(™)
  committee: { ko: "세계희망선언위원회", en: "World Hope Declaration Council" },
  representative: { ko: "원치현", en: "Chi-hyun Won" },
  address: { ko: "세종특별자치시 보람동 732", en: "732 Boram-dong, Sejong-si, Republic of Korea" },
  phone: "1588-2716", // 전국대표전화
  publicEmail: "bmig777won@gmail.com", // 홈페이지에 공개하는 이메일 (Gmail 대체 접수의 받는 주소로도 사용)
  // 하단(카피라이트 줄)에 표시하는 대표 연락처 — 의뢰인 요청(2026-10-12)
  footerContact: {
    name: { ko: "원치현", en: "Chi-hyun Won" },
    phone: "010-3352-4382",
    email: "bmig777won@gmail.com"
  },
  registrationNo: "", // 고유번호/비영리단체 등록번호 (확정 후 입력)
  businessHours: { ko: "", en: "" }, // 운영시간 (확정 후 입력)

  /* ---- 시안 모드 ---- */
  // true: 시안 단계 표시(개인정보처리방침 등의 '시안' 안내 상자 · data-draft-only 요소). 정식 오픈 시 false 로 변경
  draft: true,
  // true: 모든 페이지 맨 위에 '시안 미리보기' 안내 띠 표시 (고객 시안과 같은 화면을 위해 기본은 숨김)
  draftBar: false,

  /* ---- 후원 계좌 (확정 후 입력) ---- */
  bank: {
    name: { ko: "", en: "" }, // 예: "OO은행"
    account: "", // 예: "000-000000-00-000"
    holder: { ko: "", en: "" } // 예: "세계희망연대"
  },

  /* ---- 온라인 접수 → 이메일 ---- */
  // 문의·참여 신청, 정기 후원 신청, 희망 응원 메시지가 이 주소로 갑니다.
  // service: "gmail" (지금, 2026-10-30 의뢰인 결정) — ‘보내기’를 누르면 내용이 채워진 메일 창(휴대폰: 메일 앱, 컴퓨터: Gmail)이
  //   바로 열리고, 신청자가 그 창에서 ‘보내기’를 눌러 이 주소로 보냅니다. 외부 전송 서비스·활성화가 필요 없습니다.
  // service: "formsubmit" — FormSubmit(formsubmit.co) 무료 서비스로 자동 전송(‘보내기’ 한 번). 이 방식으로 바꾸면
  //   첫 접수 때 이 주소로 오는 ‘Activate FormSubmit’ 메일의 ACTIVATE FORM 을 한 번 눌러야 하고, 개인정보처리방침·동의 문구의
  //   ‘전달 방법’도 FormSubmit 경유로 다시 고쳐야 합니다.
  email: {
    to: "bmig777won@gmail.com",
    service: "gmail" // "gmail"(신청자가 메일로 직접 보내기) | "formsubmit"(자동 전송, 위 설명 참고)
  },

  /* ---- 콘텐츠 관리 (관리자 페이지 /admin/) ---- */
  // 글·사진·응원 메시지를 GitHub 저장소 파일(data/*.json, assets/img/uploads/)에 바로 저장합니다.
  // 관리자는 GitHub 개인 액세스 토큰으로 로그인합니다 (README 참고).
  github: {
    owner: "intoedu",
    repo: "worldhopedeclaration",
    branch: "main"
  },

  /* ---- 온라인 결제 (PortOne V2) ---- */
  // PG 가맹 계약 후 storeId / channelKey 입력 시 카드·간편결제 후원이 활성화됩니다.
  portone: {
    storeId: "",
    channelKey: "",
    payMethod: "CARD"
  },

  /* ---- 방문자 통계 (선택, 둘 다 무료) ---- */
  analytics: {
    // GoatCounter 사이트 코드 (예: "worldhope" → https://worldhope.goatcounter.com)
    // 입력 시 방문 집계 + 하단 '누적 방문자' 표시 (GoatCounter 설정에서 'Allow adding visitor counts' 켜기)
    goatcounter: "",
    // Google Analytics 4 측정 ID (예: "G-XXXXXXXXXX")
    ga4: ""
  },
  showVisitCounter: true,

  /* ---- SNS (있을 때만 입력) ---- */
  social: {
    youtube: "",
    instagram: "",
    facebook: "",
    blog: "",
    kakao: ""
  }
};
