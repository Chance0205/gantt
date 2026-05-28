# Gantt Project — Claude 작업 메모

## 프로젝트 개요
- `output/mr-v2.html` — 메인 파일 (단독 실행 HTML, React CDN)
- `output/mr-v2-gantt-state-v1.json` — 앱 데이터 저장 파일 (git으로 동기화)
- Claude Code 웹 환경에서 작업 시 Save 버튼 → JSON 자동 커밋
- 로컬(`python -m http.server`)에서는 JSON 읽기만 가능, 쓰기 불가

## 백로그 (논의됐지만 미구현)

- [ ] **태스크 복사/붙여넣기** (난이도: 중)
  - 단일 태스크 + 서브트리(하위 포함) 복사
  - 우클릭 컨텍스트 메뉴에 추가
  - Ctrl+C / Ctrl+V 단축키
  - 새 ID 생성, deps 제거
