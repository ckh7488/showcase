# PortA 해석 및 시험 계획

ATLAS의 `porta-lab-setup` 검토본 `lab-review-03`을 기준으로 만든 인터랙티브 시험 설계입니다. openEMS를 실행하지 않았으며 solver 입력 격자나 결과 파일도 아닙니다.

## 범위

- 00: 공식 openEMS 마이크로스트립 예제로 포트·격자·경계를 검증하는 계획.
- 01: 전원 묶음 사이의 AC 자극에서 Ethernet 차동/공통모드 관측. 전원 핀 배정 A/B.
- 02: 두 전원 묶음의 기준판 상대 공통모드 자극. 실드 끝 접속 A/B.
- 03: 제조 Gerber에서 가져온 M12↔T2 / T2↔LAN9354 구간과 실제 패드 XY에 놓인 시험 위치 마커.
- 04: 기존 실험실 구성, 별도 다도체 전송선·회로 모델 및 실물 확인으로 연결하는 계획.

`cases.js`가 문구·설계 순서의 원본이고 `plan.js`가 선택 조건을 JSON으로 저장합니다. 실행하지 않은 결과의 배열은 항상 비어 있습니다. 화면용 케이블 길이축은 0.4배로 압축되어 있으며 단면·재료·꼬임 피치는 가정입니다. 두 3D 모델 모두 solver 격자로 사용하지 않습니다.

## 자료

`data/lab-baseline.json`은 사용자 확인 사실과 미확인 항목의 스냅샷입니다. `data/provenance.json`은 기존 구성 보고서에서 가져온 파일의 원본·복사본 해시를 구분합니다. `data/pcb-points.js`는 `board-components.js`의 실제 패드 두 점에서 계산한 표시 중심입니다. 두 신호를 함께 볼 때는 RX 마커를 예시로 사용하고 TX 선택 시 해당 패드로 바뀝니다.

Three.js r128, OrbitControls, 라이선스 및 모든 실행 자료는 이 폴더 안에 있습니다. 공통 테마와 파비콘만 ATLAS의 공용 자산을 사용합니다.

## 확인

데이터 갱신: 저장소 루트에서 `node scripts/prepare_porta_test_plan.cjs`.

정적 검사: `python scripts/validate.py`.

포트 8000에서 저장소를 제공한 뒤 `node scripts/check_porta_test_plan.cjs`로 다섯 시험·배선/접속·치수·마커·모바일을 검사합니다. Puppeteer와 Chromium이 필요하며 Python/Node는 사이트 실행에 필요하지 않습니다. 검사는 UI와 데이터 일관성을 확인하며 전자기 해석의 타당성을 증명하지 않습니다.

주요 근거 링크는 각 시험 옆에 표시합니다. 케이블 품명·재료·트랜스 내부·PHY 부하·실제 접촉과 자극 자료가 확보되면 가정과 구분해 갱신합니다.
