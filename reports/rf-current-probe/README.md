# RF 전류 프로브 · 제작과 캘리브레이션

2026-09-17 · 설계·시험 절차 v0.3 · 실물 RF 측정 전

집게형 RF 합전류 센서와 새 PCB 교정지그를 설명하는 ATLAS 보고서다. 기존 동판·동띠 가공안을 Frame 1장 + EndPanel 2장으로 바꾸는 설계 초안을 반영한다.

- 전류 경로: 전체 / 중앙 SIG / 외부 귀환 선택.
- 교정 연결: VNA O/S/L/T, 지그 단독, 헤드 50 Ω 부하 상태, 프로브 전달 측정의 네 단계.
- 저장 CAD 원본 44개 부품을 직접 돌리는 3D 보기: 열기·닫기·PCB 분리·신호/귀환 강조.
- 원본 SMA 위치에 연결한 단계별 케이블·부하 배치, O/S/L/T 표준과 포트 선택. 액세서리 외형은 예시.
- 설명용 정합 50 Ω 환산 예제, 유효 조건과 상대 측정 한계.
- 벤치 체크리스트와 원본 식별·해시.

`index.html`, `report.css`, `report.js`, `cad-viewer.js`와 `assets/`, `records/`, `vendor/`로 구성한다. 공통 theme와 favicon 외에 다른 보고서나 CDN 의존성이 없다. Three.js r128·OrbitControls·MIT 라이선스를 자체 vendor 폴더에 둔다. `cover.png`는 실제 교정 안내 화면의 스크린샷이다.

검증된 제품 사양·제작 승인서·실측 교정표가 아니다. 원본 식별과 증거 범위는 `records/evidence.json`, 독자용 설명은 `records/source-notes.md`에 있다. 부품·측정 체인이 바뀌면 문서와 교정 조건을 함께 갱신한다.

원본 프로젝트의 `docs/atlas/export_cad_viewer.py`로 저장 CAD를 웹 모델로 내보낸다. 모델의 단위·부품별 오프셋·원본 해시는 `assets/fixture-cad.json`에 기록한다. `?step=3#calibration` 링크로 프로브 출력 연결 상태를 바로 열 수 있다.
