# 사용 자료 라이선스 대장

홈페이지에 들어간 글꼴·이미지·코드·데이터·인용문의 권리 근거를 기록합니다. 새 자료를 넣을 때마다 이 표를 갱신하세요.

## 글꼴
| 글꼴 | 사용처 | 제공 방식 | 라이선스 | 근거 |
|---|---|---|---|---|
| Pretendard (Kil Hyung-jin) | 본문 | 저장소에 포함 `assets/vendor/pretendard/` | SIL OFL 1.1 | 동봉 `LICENSE.txt`, npm `pretendard` 패키지 정보 |
| Noto Serif KR | 한글 제목 | Google Fonts 링크 | SIL OFL 1.1 | npm `@fontsource/noto-serif-kr` 패키지 정보 |
| Noto Serif | 영문 문장 | Google Fonts 링크 | SIL OFL 1.1 | npm `@fontsource/noto-serif` 패키지 정보 |
| Cinzel | 영문 대문자 장식 | Google Fonts 링크 | SIL OFL 1.1 | npm `@fontsource/cinzel` 패키지 정보 |

글꼴 목록 뒤의 맑은 고딕·Apple SD Gothic Neo·바탕·Georgia 등은 방문자 기기에 설치된 글꼴을 이름으로만 지정한 것이며 파일을 배포하지 않습니다.

## 이미지
| 파일 | 출처 | 권리 상태 |
|---|---|---|
| `assets/img/brand/*` (로고) | 의뢰인이 AI로 제작한 시안 이미지에서 잘라냄 | 의뢰인 측 사용 승인(2026-10-12, 전도사님 확인: “AI로 만든 홈페이지 구도, 로고도 따와서 사용”) — 고해상도 원본 확보 시 교체 |
| `assets/img/home/hero-earth.*`, `tile-*.*`, `principle-card.*` | 의뢰인이 AI로 제작한 시안 이미지에서 잘라냄 | 의뢰인 측 사용 승인(2026-10-12). 참고: 시안을 만든 AI 서비스의 이용약관상 상업적 이용이 허용되는지는 의뢰인 확인 사항 |
| `assets/img/award/plaque.*`, `pin.*` (선정패·배지) | 의뢰인이 AI로 제작한 자료 이미지에서 잘라냄 | 의뢰인 측 사용 승인(2026-10-12). 얼굴 사진이 든 ID 카드, 유엔 엠블럼과 비슷한 문양의 목걸이 줄 이미지는 쓰지 않음 |
| `assets/img/people/chairman-won.*` (위원장 사진) | 의뢰인 제공 사진(2026-10-13, 전도사님 전달: “대표사진 이걸로 해줘”) | 본인(위원장) 사진을 의뢰인이 직접 제공·게재 요청. 촬영자(사진관 등)가 따로 있으면 홈페이지 게재 허락 여부 확인 권장. 메타데이터(EXIF) 제거 후 사용 |
| `assets/img/og-image.png`, `apple-touch-icon.png` | 위 이미지와 OFL 글꼴로 제작 | 위 항목에 따름 |
| `assets/img/gallery/photo-*.svg`, `portrait-placeholder.svg`, `logo.svg` | 직접 제작한 자리표시 이미지 | 문제 없음 |
| `assets/img/home/tile-worldmap.svg` (홈 ‘세계지도’ 타일의 점 지도) | `scripts/build-dotmap.mjs` 로 `data/worldmap-dots.json` 에서 직접 생성 | 아래 ‘세계지도 점 데이터’와 같은 출처: Natural Earth(퍼블릭 도메인) → world-atlas(ISC, Mike Bostock). 파일 안에 출처 주석 포함 |
| `assets/img/brand/dotmap.svg` (밝은 바탕용 점 지도) | 위와 같음 | 위와 같음 |
| `assets/img/brand/dotmap-light.svg` (어두운 바탕용 점 지도) | 위와 같음 | 위와 같음 |

의뢰인 자료 중 사람 얼굴 예시 이미지(33인 선정 기준표의 ‘예시 이미지’)와 유엔 엠블럼이 들어간 이미지는 사용하지 않습니다. 실존 인물로 오인될 수 있고, 유엔 엠블럼은 허가 없이 사용할 수 없기 때문입니다. 대신 분야별 선 아이콘을 씁니다.

## 코드·데이터
| 자료 | 라이선스 | 비고 |
|---|---|---|
| qrcode-generator (Kazuhiko Arase) `assets/vendor/qrcode/` | MIT | 파일 머리말의 저작권 고지 유지. “QR Code”는 (주)덴소웨이브(DENSO WAVE INCORPORATED)의 등록상표 |
| 세계지도 점 데이터 `data/worldmap-dots.json` | Natural Earth(퍼블릭 도메인)를 world-atlas(ISC, Mike Bostock)로 가공 | `data/worldmap-dots.LICENSE.txt` 동봉 |
| 그 외 사이트 코드 | 이 저장소 제작물 | — |

## 인용문
| 인용 | 역본·권리 | 비고 |
|---|---|---|
| 로마서 15:13, 고린도후서 9:7 (국문) | 성경전서 개역개정판 © 대한성서공회 1998 | 출처 표기 필요. 웹 게재 허락 기준(절 수 등)은 대한성서공회에 확인 필요 |
| 같은 구절 (영문) | KJV | 한국·미국 등에서 퍼블릭 도메인 (영국에서는 왕실 특허 대상) |

## 외부 서비스
| 서비스 | 용도 | 비고 |
|---|---|---|
| GitHub Pages (GitHub, Inc., 미국) | 호스팅 | 개인정보처리방침 제5조에 기재 |
| FormSubmit (formsubmit.co) | 접수 내용 이메일 전송 | 개인정보처리방침·동의서에 기재 |
| Google Maps 임베드, Google Fonts | 지도, 글꼴 | 방문자 접속 정보(IP 등)가 Google로 전달됨 — 처리방침 반영 검토 |
| PortOne·PG사 | 온라인 결제(가맹 후) | — |
| GoatCounter / Google Analytics | 방문 통계(설정 시) | — |
