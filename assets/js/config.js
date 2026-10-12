/* ==========================================================================
   사이트 설정 — 이 파일 하나만 수정하면 사이트 전체에 반영됩니다.
   (값이 비어 있으면 해당 기능은 안전하게 꺼지거나 '준비 중'으로 표시됩니다)
   ========================================================================== */
window.WH_CONFIG = {
  /* ---- 기본 정보 ---- */
  siteUrl: "", // 도메인 연결 후 입력. 예: "https://www.example.org" (QR코드·공유 링크 기준 주소, 비우면 현재 접속 주소)
  name: { ko: "세계희망연대", en: "World Hope Alliance" },
  committee: { ko: "세계희망선언위원회", en: "World Hope Declaration Committee" },
  representative: { ko: "원치현", en: "Chi-hyun Won" },
  address: { ko: "세종특별자치시 보람동 732", en: "732 Boram-dong, Sejong-si, Republic of Korea" },
  phone: "1588-2716", // 전국대표전화
  publicEmail: "", // 홈페이지에 공개할 이메일 (확정 후 입력)
  registrationNo: "", // 고유번호/비영리단체 등록번호 (확정 후 입력)
  businessHours: { ko: "", en: "" }, // 운영시간 (확정 후 입력)

  /* ---- 시안 모드 ---- */
  // true: 상단에 '시안 미리보기' 안내 바 표시. 정식 오픈 시 false 로 변경
  draft: true,

  /* ---- 후원 계좌 (확정 후 입력) ---- */
  bank: {
    name: { ko: "", en: "" }, // 예: "OO은행"
    account: "", // 예: "000-000000-00-000"
    holder: { ko: "", en: "" } // 예: "세계희망연대"
  },

  /* ---- 온라인 접수 → 이메일 전송 ---- */
  // 문의·참여 신청, 정기 후원 신청, 희망 응원 메시지, 온라인 후원 알림이 이 주소로 메일 발송됩니다.
  // 전송은 FormSubmit(formsubmit.co) 무료 서비스를 사용합니다.
  // · 첫 접수 때 이 주소로 '활성화(Activate)' 확인 메일이 한 번 옵니다 → 버튼을 눌러야 이후 메일이 도착합니다.
  // · 활성화 메일에 있는 무작위 문자열(별칭)을 to 에 넣으면 홈페이지 소스에서 이메일 주소가 숨겨집니다.
  email: {
    to: "bmig777won@gmail.com",
    service: "formsubmit" // "formsubmit" | "mailto"(방문자의 메일 앱으로 보내기)
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
