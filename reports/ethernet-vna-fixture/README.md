# 발룬 Ethernet 보드 · 제작 전 검증

공통 발룬 보드 하나의 제작 전 기록이다. B-RJ2의 실장면 선택, 2026-09-29 openEMS 입력과 원시 응답, native CAD 및 10월 2일 업체 CAM 검토를 잇는다.

## 화면과 데이터

- `prebuild.js`: 실제 트랙·패드·도금홀·내층 동박의 Three.js 3D 보기. 배선안 선택, 층 펼침/모으기, B페어 확대, 드래그/키보드 회전과 초기화.
- `prebuild-data.js`: 두 해석 입력의 형상과 B페어 1–150 MHz 응답. 값 선택은 저장된 1 MHz 간격의 지점을 사용한다.
- 세 수치 카드: 차동 반사 Sdd11, 전방 차동→공통 Scd21, 여섯 B→A/C/D 차동 NEXT/FEXT 경로의 주파수별 최댓값. 선택한 지표의 위치와 그래프를 연결한다.
- `EVIDENCE.md`: 원시 파형 날짜, 수치 정리 날짜, 입력 해시, 설계·CAM 근거와 재현 방법.
- `rf-evidence.zip`, `rf-results.csv`, `manufacturing-evidence.json`: 선별한 재현 자료와 기계 판독용 수치.

3D는 저장 CAD의 동박 형상이다. 기본 보기는 네 층 간격을 펼쳐 보여주며 ‘층 모으기’가 원래 약 1.6 mm 적층 간격으로 돌린다. 그래프는 RJ45에서 발룬의 차동 패드까지, 명목 FR-4/PEC와 50 Ω 단자 16개의 PCB 모델 응답이다.

화면의 두 배선안은 `com_old`와 `com_front`다. 최종 B-RJ2와 `com_old`의 차동 트랙·신호 비아 기하를 대조했다. `vendor/`는 이 보고서가 소유하는 Three.js r128과 OrbitControls 및 MIT 라이선스다.

## 검토와 배포

루트에서 `python scripts/validate.py`, `python scripts/build.py`, `git diff --check`와 JS 구문 검사를 실행한다. HTTP로 목록→보고서→복귀, 두 배선안과 세 지표, 1/100/150 MHz, 층 모으기·확대·회전·초기화, 1280/896/768/390/320 px를 확인한다. 공개 시 해당 커밋의 Pages 배포와 실제 URL에서 같은 동작을 확인한다.

기존 조립·BOM 자산은 기존 URL을 유지한다. 본문의 범위는 공통 발룬 보드의 제작 전 검증으로 정리했다.
