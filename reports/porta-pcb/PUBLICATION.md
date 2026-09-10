# PortA report publication

2026-09-10 웹 게시본. 보고서 작성일: 2026-09-08.

- 본문과 3D는 기존 porta-pcb-assessment 결과를 보존했습니다.
- 웹 배포를 위해 상대 링크를 정리하고 보고서 목록 복귀 링크를 추가했습니다.
- records/의 이전 보고서는 정적 스냅샷입니다. 과거 진행 상태를 유지하되 자동 새로고침은 제거했습니다.
- 원본 CAD/FW, 해석 실행 파일, 대형 원시 파형 및 전체 작업 폴더는 게시하지 않습니다.
- report-data.json의 원본 경로와 SHA256은 출처 식별용이며, 원시 NPZ가 웹에 포함됐다는 뜻이 아닙니다.
- PHY측 초기 openEMS와 케이블측 NGSolve FEM의 검증 상태를 구분합니다. 새 시뮬레이션은 수행하지 않았습니다.
- third-party: Three.js r128, MIT (vendor/LICENSE-three.txt).

2026-09-10 문서 스타일·인터랙션 갱신:

- ATLAS 공통 테마와 DESIGN.md를 적용했습니다.
- 결과 선택 → 숫자/반사량 표시 → 해당 3D 선로 이동을 연결했습니다.
- RX/TX 개별 강조와 전체 화면 보기를 추가했습니다.
- 설명용 dB 슬라이더는 반사 전력 비율만 계산합니다. 원본 PCB 계산값과 검증 상태를 바꾸지 않습니다.
- report-data.json과 Gerber 형상 데이터는 보존했습니다.
