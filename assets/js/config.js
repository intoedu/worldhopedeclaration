/* ==========================================================================
   사이트 설정 — 이 파일 하나만 수정하면 사이트 전체에 반영됩니다.
   (값이 비어 있으면 해당 기능은 안전하게 꺼지거나 '준비 중'으로 표시됩니다)
   ========================================================================== */
window.WH_CONFIG = {
  /* ---- 기본 정보 ---- */
  siteUrl: "", // 도메인 연결 후 입력. 예: "https://www.example.org" (QR코드·공유 링크 기준 주소)
  name: { ko: "세계희망연대", en: "World Hope Alliance" },
  committee: { ko: "세계희망선언위원회", en: "World Hope Declaration Committee" },
  representative: { ko: "원치현", en: "Chi-hyun Won" },
  address: { ko: "세종특별자치시 보람동 732", en: "732 Boram-dong, Sejong-si, Republic of Korea" },
  phone: "1588-2716", // 전국대표전화
  publicEmail: "", // 홈페이지에 공개할 이메일 (확정 후 입력)
  inquiryEmail: "bmig777won@gmail.com", // 온라인 접수(DB) 미연결 시 문의 메일 수신 주소
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

  /* ---- Supabase (게시판·갤러리·문의·후원신청·응원·방문통계) ---- */
  // Supabase 프로젝트 생성 후 Project URL 과 anon(public) key 를 입력하면 자동 활성화됩니다.
  supabase: {
    url: "",
    anonKey: ""
  },

  /* ---- 온라인 결제 (PortOne V2) ---- */
  // PG 가맹 계약 후 storeId / channelKey 입력 시 카드·간편결제 후원이 활성화됩니다.
  portone: {
    storeId: "",
    channelKey: "",
    payMethod: "CARD"
  },

  /* ---- 방문자 통계 (선택) ---- */
  // Google Analytics 4 측정 ID (예: "G-XXXXXXXXXX"). 비워 두면 사용하지 않습니다.
  gaMeasurementId: "",
  // 하단에 오늘/전체 방문자 수 표시 (Supabase 연결 시 동작)
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
