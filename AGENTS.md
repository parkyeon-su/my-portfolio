# AGENTS.md — Codex 작업 가이드

개인용 취업 준비 노트 (GitHub Pages 정적 사이트). 빌드 도구 없음: HTML + CSS + 바닐라 JS.

## 구조
- `index.html` — 레이아웃 껍데기 (사이드바, 모달, 토스트)
- `assets/css/style.css` — 디자인. 색은 `:root` 토큰만 사용 (베이지 `--bg`, 연한 곤색 `--navy`)
- `assets/js/data.js` — **모든 콘텐츠**. 내용 추가/수정은 대부분 여기서
- `assets/js/app.js` — 해시 라우팅 SPA. 화면 = `viewXxx()` 함수가 HTML 문자열 반환

## 데이터 규칙 (data.js)
- `companies[]` 한 객체 = 기업 분석 + 지원 현황 + 자소서 + 면접 준비
  - `status`: interest | writing | submitted | passed | test | interview | offer | rejected
  - 날짜는 `YYYY-MM-DD`. `deadline`을 넣으면 달력에 자동 표시
  - 새 기업은 `stub(id, 이름, 업종, 직무, 메모)`로 만든 뒤 필드 채우기
  - `applications[]`: `{ q, limit, a }` (자소서 문항)
  - `issues[]`: `{ date, title, note }`, `interview[]`: `{ q, a }`, `links[]`: `{ label, url }`
- `events[]`: `{ id, date, type, title, companyId, time, memo }`, type: deadline | test | interview | result | event | etc
- `news[]`: `{ id, date, title, source, url, summary, companyId }` — 뉴스 카드
- `quotes[]`: `{ id, text, author, book }` — 대시보드 '오늘의 구절' (날짜마다 하나씩 순환). 사용자가 직접 고른 구절만 넣을 것
- `experiences[]`: STAR 형식 `{ id, title, org, period, role, tags, s, a, r }`
- `strengths[].evidence`에는 experiences의 id를 넣음
- 텍스트 필드에서 `- `로 시작하는 줄은 글머리 목록, `**굵게**` 지원

## 지켜야 할 것
- 공개 사이트임: 전화번호, 주소, 생년월일, 주민번호 등 개인정보 넣지 말 것
- 외부 라이브러리 추가하지 말 것 (글꼴: 나눔스퀘어라운드, Fraunces(영문 제목), Pretendard(대체)만 사용)
- 사용자 입력은 항상 `esc()`로 이스케이프
- 사실 확인이 안 된 기업 정보는 지어내지 말고 빈칸으로 둘 것
