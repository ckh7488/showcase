# 전기·교정 전체 감사 — 2026-09-21

## 결론

**현재 자료로 전체 세트를 제작하면 바로 정량 측정까지 된다고 할 수 없다. 그렇다고 A02의 전면 재설계가 필요하다고 입증된 것도 아니다.** E03의 보류 이유는 완성된 지그에서 코어를 지나는 전류와 주파수 응답의 근거가 부족하기 때문이다. 약 242 Ω는 짧은 중심 구간을 무한히 늘렸다고 가정한 균일 단면의 특성 임피던스다. 실제 PCB의 입력 임피던스나 실제 측정 오차가 아니다.

확인한 범위에서는 중심 SIG만 코어 안을 통과하고 귀환 GND가 밖에 있는 전류 경로, 수신기 측 단일 50 Ω 종단, VNA through/transfer 연결 원칙은 맞다. 그러나 **국소 전류 모델(HI), 실제 교정, BNC 기준면 전환, scope 응답, 현장 보호, 광대역 전류 복원**은 서로 다른 미완료 항목이다. 사용자가 처음 기대한 잡음/간헐 과도 전류의 정량 파형까지 현행 기본파 코드로 해결되었다고 설명하면 안 된다.

## 무엇을 언제 해결해야 하나

| 구분 | 남은 사항 | 판정·다음 조치 |
|---|---|---|
| 제작 전 설계/제조 조건 | Head A03와 Fixture A02의 GCT 5핀 SMA 및 실제 완성홀·위치 공차, 실제 적층 | nominal footprint/DRC/JLC 승인만으로 무리 없이 끼워짐을 보장하지 않는다. 아래 공차 대조와 제조 조건 확인이 필요하다. |
| E03 제작 승인 전 설계 검토 | A02 전체 포트·중심 전류·loaded 상태 모델 | 현 형상 유지 평가부터 한다. 지금 기하 재설계나 5.3 pF 정합 채택을 결정하지 않는다. |
| 첫 실물의 필수 특성화 | T01 접속, T02 empty/loaded, T03~T10 선형성·반복·픽업·상쇄·위치·삽입 | 시제품을 만든 뒤 필요한 검증이다. CAD 단계에서 실측 통과로 바꿀 수 없다. |
| A 단위 표시 전 | 유효 HI/기준면·ZT·유효 주파수·오차 예산 | 근거 없는 구간은 상대 S21 또는 전압만 표시한다. 1−S11 자동 보정 금지. |
| scope에서 A 표시 전 | 실제 BNC 끝 기준면, 제거되는 어댑터의 처리, scope 자체 응답·부하 | BNC 기준면 교정 또는 검증된 복소 2포트 제거 방법 중 실행 가능한 경로가 필요하다. |
| 광대역 전류 파형 표시 전 | 위상·대역 마스크·잡음·역보정 구현/검증 | 현행 scope_tone은 기본파 RMS 전류용이다. 총 RMS/FFT/펄스 피크 전류는 미구현이다. |
| 산업 하네스/외부 에너지 적용 전 | 보호 부품·정격·잔류전압·왜곡·복귀, DC bias·삽입 영향 | 감쇠기만으로 서지 보호를 확보했다고 하지 않는다. 저에너지 VNA 벤치와 구분한다. |

E03 외형을 변경하게 될 때는 A14 BaseCenter 등 지지부와의 종속 치수도 재검토해야 한다. 이는 향후 변경의 영향이며, 현재 당장 기구 전체를 다시 만든다는 결정은 아니다.

## 1. 현재 원본 및 실제로 실행한 검증

- Head A03 PCB SHA: `e8fe7e9c551d78b89099443fee699feafc675fd767ea91fa858292c19d2d4c3d`.
- Fixture A02 PCB SHA: `c148d6bf5d71da9dff32b5e93b917266076ec98e5edab353ca737e3c02134783`.
- 저장 ERC/DRC·native·Gerber 비교 기록을 읽고 해시가 현재 원본과 일치함을 확인했다. Head의 초기 ERC 기본 제외 항목은 9/18 strict ERC의 0 ignored / 0 violation 결과와 구분했다. 이번 에이전트가 ERC/DRC를 새로 실행한 것은 아니다.
- 현재 KiCad 원본을 저장/재채움 없이 읽었다. Head는 4 footprint/9 pad, A02는 6 footprint/14 pad다. A02 중앙 filled-zone은 양면 SIG 약 ±3.40 mm, GND의 최근접 |x| 약 51.31 mm다. 중앙 다리 바로 아래에 GND가 깔린 잘못된 구조는 아니다. 근거: [board_readback.json](board_readback.json).
- 저장 2D 전위 169,455점에서 원래 희소행렬 풀이를 사용하지 않고 edge flux/에너지로 재적분했다. C=13.995167 pF/m, 에너지와 상대 차이 약 2.9×10⁻¹², 전하 불균형 1.04×10⁻¹¹ 이하, Z0=241.650184 Ω를 재현했다. **산술 일관성 확인이며 모델의 실제 RF 적합성 검증은 아니다.** [계산/해시](calculations.json), [재현 스크립트](check_electrical.py).
- root가 이번 감사에서 실행한 110개 소프트웨어 테스트는 failure/error 0이다. 별도 합성 리허설은 9개 연결 판정, 4개 기본파 계산, 10개 잘못된 사용 거부의 기대 결과와 일치했다. 이 수는 실제 RF/조립 시험 수가 아니며 중복 합산하지 않는다. [테스트](../unit_tests.xml), [합성 리허설](../synthetic_rehearsal/report.json).
- 전체 A02 3D RF EM, 실제 S2P/교정, 실제 핀 끼움, scope 응답/보호 시험은 실행하지 않았다. `measurements/raw`에 실측 결과가 없다.

## 2. 약 242 Ω 결과가 말하는 것과 말하지 않는 것

원 모델은 2D electrostatic 단면이다. 중심 FR4/양면 SIG와 멀리 떨어진 두 귀환을 무한 균일 전송선으로 보고, εr=4.3·영 두께 도체·이상 접속을 가정했다. 이 가정 안에서 메시/영역 수렴과 CPW 기준식 대조를 저장했고 이번에 원 전위를 다시 적분했다.

하지만 실제 중심 창은 33.75 mm인데 SIG–GND 간격은 47.9 mm다. 균일 구간이 횡방향 간격보다 짧다. SMA 중심 간 68.7 mm 전체의 끝단 전이, SMA launch, 비아 인덕턴스, 도전/유전 손실, 코어/권선, 주변 구조가 생략되어 있다. **실제 전체가 242 Ω이라고도, 실제 50 Ω이 아니어서 못 쓴다고도 결론 낼 수 없다.**

같은 단면을 길이 33.75 mm의 이상 무손실 균일선으로 놓은 별도 예시에서는 100 MHz S11≈−15.73 dB지만 중심 전류에 대한 단순 matched 환산 크기 오차는 약 −0.123 dB다. 300 MHz는 각각 −7.08 dB / −0.996 dB다. 위상 오차는 각각 약 −9.84° / −27.56°로 별도다. 이 예시는 **반사 목표와 국소 전류 환산 오차가 같은 양이 아님**을 보여줄 뿐 실제 A02 예측이나 1−S11 보정 승인이 아니다. [예시 CSV](uniform_line_illustration.csv).

외부 S2P가 같아도 내부 전류는 다를 수 있다(서로 역비인 두 이상 변압기 예시는 외부 전달이 1이지만 중간 전류가 달라진다). 그러므로 빈 지그의 포트 S만으로 코어 중앙 전류를 확정하려면 구조 모델이 추가로 필요하다. 실제 출력 50 Ω가 연결된 헤드의 삽입 효과도 포함해야 한다.

## 3. 50 Ω 교정과 Ethernet의 100 Ω는 다른 조건

여기 50 Ω는 교정 포트/출력 종단과 전달함수의 조건이다. 측정하려는 Ethernet 차동쌍이 100 Ω라고 해서 프로브를 100 Ω 부하로 교정해야 하는 것은 아니다. 프로브는 구경을 통과하는 도체의 RF 합전류를 검출한다. 다만 프로브를 붙이는 행위가 원래 전류를 바꾸는 삽입 효과와 외부 전계 픽업은 별도 검증 대상이다.

일반식은 `ZT = √50 × S21 / HI`, `HI = Icore/a1`이다. `50×S21`은 `HI≈1/√50`가 성립할 때의 특수식이다. `50×S21/(1−S11)`은 입력 기준면 전류와 코어 전류가 같다는 조건이 추가된다. 50 Ω의 출력 기준이 DUT의 CM 임피던스 50 Ω 가정으로 바뀌는 것은 아니다.

## 4. SMA 핀/홀 조립성 — 사양 대조로 아직 닫히지 않음

현재 Head A03는 GCT RFPC-SMA28-F의 nominal 권장 center Ø1.50 / ground Ø1.70 / pitch 5.08 mm다. 저장 Rev1.2 도면의 권장 PCB 홀 허용은 ±0.05 mm다. [GCT 현행 제품 페이지](https://gct.co/connector/rfpc-sma28-f)는 같은 female/THT/50 Ω/6 GHz 제품을 표시한다. 최신 도면 다운로드는 오류로 열리지 않아 저장 Rev1.2보다 새 도면이 없다고 보증하지 않는다.

[JLC 현행 제작 능력](https://jlcpcb.com/capabilities/pcb-capabilities)은 일반 완성홀 +0.13/−0.08 mm, 홀 위치 ±0.05 mm다. press-fit ±0.05는 다층 ENIG·원형 Ø0.55~2.0 mm 조건이며 현재 2층 일반 주문에 자동 적용되는 약속이 아니다.

센터 핀 Ø1.27에 도면의 일반 .XX ±0.1을 적용하면 최대 1.37 mm, 일반 제작의 Ø1.50 최소 홀은 1.42 mm다. 중심이 완전히 일치해도 지름 여유 0.05 mm, 반경 여유 0.025 mm뿐이다. 4개 ground foot을 도면의 외곽/안쪽 치수에서 정사각형으로 추정하면 최대 측면 약 1.10 mm, 대각 약 1.556 mm이며 최소 Ø1.62 홀의 중심 일치 반경 여유는 약 0.032 mm다.

이는 **한계 민감도 계산**이다. 상관된 도면 치수를 독립 오차로 중복 합산하지 않았고 5핀 전체 위치 공차 모델을 완성한 것도 아니다. 따라서 조립 불량 확정이나 홀 확대 결론은 아니다. 대신 실제 핀/도면·발주 완성홀 조건을 대조하지 않고 “반드시 잘 끼워짐”을 선언할 수 없다는 근거다. 실제 부품 확인 또는 제조 공차 합의가 우선이다. 같은 footprint를 쓰는 E03도 동일 검토가 필요하다.

## 5. 교정 연결 및 scope 전환

1. 실제 테스트 케이블 끝에서 모델이 확인된 SOL/THRU로 2포트 교정한다.
2. Through: P1→지그 J1, 지그 J2→P2. 헤드 없음/있음 두 상태를 비교하고, 헤드 있음에서는 헤드 출력에 외장 50 Ω를 단다.
3. RF OFF 후 transfer: P1→지그 J1, 지그 J2→외장 50 Ω, 헤드 출력→P2. 헤드에 또 50 Ω를 병렬로 달지 않는다.
4. 먼저 relative S21로 저장한다. 알려진 HI/기준면·품질이 확보된 대역만 전류 환산한다.
5. 실제 attenuator·SMA–BNC 케이블을 포함해 교정한 뒤 BNC–SMA 어댑터를 제거해서 scope에 꽂는다면 전달함수가 바뀐다. BNC 끝 기준면 교정 또는 검증한 복소 어댑터 제거가 필요하다. 케이블 손실 한 숫자 빼기로 대체하지 않는다.
6. scope의 내부 50 Ω 부하와 주파수 응답도 독립 확인한다. 원 MSO4054는 DC/내부 50 Ω/FULL/1×/Sample의 실제 설정과 사용 감도를 기록한다. AC의 입력 종단 변경이나 저감도 대역 제한을 놓치면 안 된다.

소프트웨어가 잘못된 기준면/미확인 수신기 응답을 거부하는 것은 유용하다. 그러나 어댑터 de-embedding이나 실제 scope gain을 구해주는 기능이 완성되었다는 뜻은 아니다. 이 조건이 아직 없으면 scope 전압만 관측한다. 이후 기본파 RMS 환산과 광대역 전류 복원을 분리한다.

## 6. 문서에서 생긴 오해와 수정 방향

- 초기 G3 문서는 A0.1/작은 PCB/옛 기구를 기술하는 역사 자료다. 그 안의 미확정 RF 항목은 현재도 남아 있을 수 있지만 옛 형상 지침을 현재 조립법으로 사용하면 안 된다.
- 현행 manual과 calibration 화면에는 E03 보류가 있지만 구매/조립 완료 흐름과 분리되어 있어 “전체 제작 직전”이라는 인상을 줄 수 있다. 처음부터 부품 제작 상태와 정량 측정 준비 상태를 별도로 보여야 한다.
- “알려진 전류 경로를 만든다”는 문구는 물리적인 경로와 전류 크기를 혼동시킨다. “전류를 흘리는 경로이며 전류 크기·주파수 모델은 검증 전”으로 명확히 한다.
- BNC 어댑터 제거와 scope 응답은 상세 리허설 문서에 있지만 간단 사용 순서에서도 전류 환산의 선행조건으로 표시해야 한다.
- 최종 사용 목표에 가까운 광대역 잡음/과도 전류 복원과 현행 기본파 RMS 코드의 차이를 구매 전 표시해야 한다. 예쁜 3D나 제조 승인으로 해소되지 않는다.
- `REQUIREMENTS.csv`의 오랜 NOT_VERIFIED는 단순히 모두 실패라는 뜻도, 최신 CAD 검증이 없어졌다는 뜻도 아니다. 아래 표처럼 구조/소프트웨어 확인과 실물/정량 보류를 구분해야 한다.

## 7. 다음 실행

새 설계를 바로 만드는 대신 [T02/HI 실행 패키지](T02_HI_EXECUTION.md)에 따라 **현재 A02 형상을 유지한 전체 지그 전류 모델→실물 empty/loaded→transfer** 순서로 평가한다. 패키지는 고정 형상 해시·포트·전류 정의·필수 원출력·수렴·벤치 연결·레벨·통과 기준을 지정한 계획이다. 전체 3D EM 실행 결과가 아니다. 지그 모델과 실물 결과가 허용 오차를 만족하지 못하는 범위를 확인한 뒤에만 최소 형상/정합 변경을 비교한다.

## 8. 전 요구사항 대조표

`SOFTWARE_VERIFIED`는 수학/데이터 처리 범위, `CAD_CONFIRMED`는 저장 형상/접속 범위이며 실물 성능 통과를 뜻하지 않는다. `OTHER_TRACK`은 누락이 아니라 기구/조달 담당으로 연결한 범위다. 각 증거 키의 실제 경로는 표 아래와 JSON에 있다.

| ID | 요구사항 | 판정 / 남은 관문 | 근거 | 조치 |
|---|---|---|---|---|
| DOC-01 | 기존 파일 보존 및 G0 상태·요구사항·결정·작업계획 관리 | PARTIAL · DOCUMENTATION — 기준서와 과거 기록은 보존되어 있으나 과거 설계 상태와 현행 제조·RF 상태를 분리해야 한다. | W, UI | 현행 제작 가능 범위와 E03·정량 환산 보류를 한 화면/현행 상태표에 표시한다. |
| REQ-01 | 전원 없는 수동 CT 방식이며 일차 케이블과 계측 회로 사이 의도적인 도전 접속 없음 | CAD_CONFIRMED_PHYSICAL_PENDING · FIRST_ARTICLE — 수동 코어·권선·SMA 구조이며 능동 IC와 일차에 대한 의도적 도전 접속이 없다. | HEAD, A02 | T01 실제 도통·절연 구조 검사. DMM 통과를 내전압 정격으로 표시하지 않는다. |
| REQ-02 | 헤드 기본 출력 SMA 및 측정 부하 50 Ω | TOPOLOGY_CONFIRMED · BENCH_CHAIN — 헤드에 추가 50 Ω 병렬 저항이 없고 P2 또는 scope의 단일 50 Ω 종단을 쓴다. | HEAD, G2 | 실제 로드와 케이블을 식별하고 through/transfer 전환마다 종단 위치를 확인한다. |
| REQ-03 | LibreVNA 2-port 구성으로 헤드와 측정 체인 특성화 가능 | PLAN_READY_UNQUALIFIED · CALIBRATION — 2포트 연결은 정의됨. 실제 장비·표준 모델 및 HI 검증은 없다. | G2, PLAN | HW/FW/GUI·SOL/THRU 모델을 기록하고 T02 empty/loaded와 transfer를 구분 실행한다. |
| REQ-04 | 코어·권선·차폐·PCB·출력 케이블 식별과 개별 교정 이력 보관 | TEMPLATE_READY · FIRST_ARTICLE — 구성/교정 ID 스키마가 있으나 실제 교정 이력은 없다. | SW, G2 | 실제 core/turns/gap/head/cable/attenuator/termination ID를 채운다. |
| REQ-05 | 원시 S-parameter와 계산된 전달 임피던스를 함께 보관 | NO_MEASURED_DATA · FIRST_ARTICLE — 원시 실측 파일이 없으며 합성 결과만 존재한다. | SW, NUM | 원시 S2P 불변 보존 후 그 해시와 처리 CSV를 연결한다. |
| REQ-06 | 장착 반복성·전류 상쇄·직접 픽업·선형성·삽입 영향 시험 | NOT_MEASURED · FIRST_ARTICLE — 선형성·픽업·상쇄·반복·삽입은 절차만 있고 실측하지 않았다. | G2, PLAN | T04~T10을 구성과 레벨 고정 후 실행한다. |
| REQ-07 | 보호접지·쉴드를 임의로 끊거나 계측기 접지를 부유시키지 않음 | PROCEDURE_ONLY · FIELD — PE·DUT 쉴드 임의 변경 금지가 명시되어 있다. | W, PROT | 실제 접속과 현장 에너지 경로를 검토하고 무전원 장착한다. |
| REQ-08 | 회로 검토와 실측 없이 내전압·허용 전류·서지 내성 표시 금지 | NO_RATING_ESTABLISHED · FIELD — 내전압·허용 순 DC·서지·CAT 정격을 부여할 실측 근거가 없다. | W, PROT | 정격 미검증 표기를 유지하고 저에너지 벤치로 범위를 제한한다. |
| REQ-09 | 신규 지출 10만 원 목표와 20만 원 상한을 관리 | OTHER_TRACK · PROCUREMENT — 초기 예산과 이후 사용자 구매 범위 변경이 있어 현재 견적/승인 트랙에서 관리할 항목이다. | W, UI | 최신 수량·배송·세금과 보류 부품을 포함해 구매 담당 결과에 연결한다. |
| REQ-10 | 기존 Ethernet SI 지그와 별도 설계하고 RF 헤드에 RJ45/PHY를 넣지 않음 | CAD_CONFIRMED · SCOPE — 헤드에 RJ45/PHY/ADC/MCU가 없고 Ethernet SI 지그와 별도이다. | HEAD | 현행 수동 범위를 유지한다. |
| TGT-01 | 1~100 MHz 재현성 있는 비교 측정과 유효 특성화 우선 확보 | NOT_MEASURED · PERFORMANCE — 1~100 MHz는 첫 검증 목표이며 확보된 사양이 아니다. | G2, PLAN | 먼저 조건을 고정한 상대 비교, 이후 HI 근거가 있는 대역의 정량 환산을 평가한다. |
| TGT-02 | 전체 개발 목표 100 kHz~300 MHz | NOT_MEASURED · PERFORMANCE — 100 kHz~300 MHz 전 대역 동작을 입증하지 않았다. | W, PLAN | 유효 대역을 실측으로 마스킹하고 상위 대역을 분리 평가한다. |
| TGT-03 | 100 kHz~500 MHz 가능한 범위 특성 확인 및 500 MHz 확장 검토 | EXTENSION_TARGET · PERFORMANCE — 500 MHz는 확장 검토이며 필수 완료 사양이 아니다. | W | 1~100 MHz 결과 후 장비·잡음·픽업 한계에 따라 확장 여부를 판단한다. |
| TGT-04 | 집게형 유효 구경 약 30~35 mm를 출발점으로 성능을 유지하며 케이블 장착 여유 우선 | OTHER_TRACK · MECHANICAL — 초기 약 30~35 mm 구경과 현행 케이블 클램프 사용 범위는 동일 개념이 아니다. | W, MECH | 실제 코어 개구·권선 여유·케이블 굵기·진입 폭은 현행 기구 감사와 실제 케이블로 확인한다. |
| TGT-05 | 중간 대역 수 Ω~수십 Ω 감도 및 mA급 RF 비교 측정 검토 | NOT_MEASURED · PERFORMANCE — 5턴/50 Ω의 이상적 10 Ω 감도는 기생 성분·주파수·잡음이 없는 근사다. | W, HEAD | ZT와 잡음 바닥을 실측하여 mA 검출 범위를 정한다. |
| TGT-06 | 1~100 MHz 정량 오차 예산 ±3 dB 수준 초기 검토 | UNCERTAINTY_UNASSESSED · QUANTITATIVE — ±3 dB는 초기 목표이며 HI·반복·위치·체인·수신기 오차 예산이 없다. | W, PLAN | 독립 전류 기준 또는 검증 모델과 비교하고 결합 불확도를 산정한다. |
| SENS-01 | 부호와 통과 횟수를 포함한 합전류 IΣ를 원시 보고 단위로 사용 | DEFINITION_CONFIRMED · INTERPRETATION — 원시 센서량은 부호·통과 횟수를 포함한 합전류 IΣ다. 100 Ω 차동 Ethernet 조건을 교정 부하로 대입하지 않는다. | W, SW | 페어 평균 Icm로 표시한다면 IΣ=2Icm 등 해당 정의를 명시한다. |
| SENS-02 | 부담·코어·배선에 따른 삽입 영향과 DC/저주파 bias 고려 | NOT_MEASURED · FIELD — DC 출력이 없어도 코어 DC bias와 삽입 임피던스는 생길 수 있다. | W, PLAN | T10에서 헤드 유무·종단·왕복 도체 구성을 비교하고 허용 순 DC를 임의 지정하지 않는다. |
| SENS-03 | 최대 2~3개 코어와 3/5/7턴 탐색 시작점 비교 | STARTING_CONFIG_ONLY · PERFORMANCE — 선정 코어와 5턴은 시작 구성이다. 3/5/7턴 비교 결과는 없다. | W, G2 | 한 변수씩 바꾸어 대역·반복·삽입·픽업을 비교한다. |
| CAL-01 | 지그 중심 전류는 코어 안을 통과하고 귀환은 코어 밖으로 흐름 | CAD_CONFIRMED_RF_PENDING · CALIBRATION — 양면 중심 SIG만 코어 안, 두 GND 귀환은 밖이라는 filled-copper 단면을 확인했다. | A02, NUM | 전체 3D 연결·누설 및 loaded 상태의 전류 경로를 T02/HI로 확인한다. |
| CAL-02 | 정합·기준면·50 Ω 부하 조건에서만 ZT≈50×S21 적용 | PRECONDITIONS_UNPROVED · QUANTITATIVE — 50×S21 수식 계산은 맞지만 A02에 적용할 알려진 코어 전류 조건은 증명되지 않았다. | G1, NUM, PLAN | 신뢰할 HI 또는 같은 기준면의 정합/전류 조건이 없으면 relative로만 처리한다. |
| CAL-03 | 1−S11 보정은 코어 전류 기준면과 무분기 조건을 검토한 뒤 적용 | PRECONDITIONS_UNPROVED · QUANTITATIVE — 1−S11은 입력 기준면 전류다. 국소 코어 전류와 같다는 근거가 없다. | G1, NUM, PLAN | 분기/변위전류와 지연을 모델로 평가하고 불충족 시 HI 경로를 쓴다. |
| CAL-04 | 복소 ZT 위상에 지그 지연과 기준면 모델 포함 | PHASE_UNQUALIFIED · WIDEBAND_CURRENT — 지그 지연을 포함한 복소 ZT 실측이 없고 광대역 역복원 기능도 구현되지 않았다. | G1, CHAIN | 위상 미검증이면 magnitude-only; 시간 전류 복원은 별도 구현·검증한다. |
| CAL-05 | 전력 차 식의 부호·단위를 정의로 검산 | SOFTWARE_VERIFIED · NONE — 정합 동일 기준 임피던스에서 Pout−Pin 및 −20 dB→5 Ω 검산 근거가 있다. | SW, NUM | 물리 조건 검증과 소프트웨어 수식 통과를 분리 유지한다. |
| HW-01 | 차폐·나사·GND·SMA 외피가 자속을 쇄교하는 단락 턴을 만들지 않음 | GEOMETRY_REVIEW_ONLY · FIRST_ARTICLE — 귀환/체결 구조 검토는 있으나 모든 금속의 RF 무영향을 증명하지 않는다. | W, HEAD, A02, MECH | 완성품의 도전 루프 및 T08/T10 금속·케이블 배치 의존성을 확인한다. |
| HW-02 | 실제 stack-up과 SMA footprint 및 짧은 신호·연속 귀환 경로 사용 | PRE_FAB_HOLD · FABRICATION — 현재 SMA nominal footprint/DRC는 일치하나 제조 완성홀·핀·위치 공차의 실제 5핀 조립성은 미확정이다. | HEAD, FIT, NUM | 실제 SMA 도면/표본과 발주 홀·적층 조건을 대조하고 최소 무리 없는 삽입을 확인한다. 임의 홀 확대는 하지 않는다. |
| HW-03 | M12 8핀 및 일반 RJ45 케이블에 커넥터 분리 없이 장착하는 집게형과 기구 반복성 확보 | OTHER_TRACK_PHYSICAL_PENDING · FIRST_ARTICLE — CAD 경로 검사와 실제 개폐·정렬·반복성은 다른 검증이다. | MECH, G2 | 현행 조립 순서에 따라 실제 케이블 장착과 T05 반복 시험을 한다. |
| SAFE-01 | 수신기 입력 정격과 감쇠·보호·종단 체인을 확인 | FIELD_HOLD · FIELD — 감쇠기 후보가 있어도 서지 보호 부품/잔류전압/수신기 안전이 검증된 것은 아니다. | PROT, CHAIN | 저에너지 VNA 벤치를 별도 허용 범위로 두고 현장 전 보호 정격·왜곡·복귀를 검증한다. |
| SAFE-02 | 저에너지 실험실 검증부터 시작하며 현장은 확인된 저전압 하네스로 제한 | PROCEDURE_ONLY · FIELD — 저에너지 벤치와 산업 하네스는 별도 적용 단계이다. | W, G2 | 상용전원/VFD/고전압/서지 직접 적용을 제외하고 무전원 장착·종단 유지한다. |
| SAFE-03 | 제조 조건 미확정 시 DRAFT — NOT FOR FABRICATION 표시 | PARTIAL_RELEASE_ONLY · FABRICATION — Gerber/JLC 승인과 전기 기능·실물 조립 완료는 다르다. A02가 보류되어 있다. | UI, G3 | Head·기구·교정PCB·측정체인 승인을 각각 구분하고 미확정은 DRAFT 유지한다. |
| DATA-01 | 원시 파일과 구성·장비 설정·교정 ID·필수 메타데이터 보존 | SOFTWARE_VERIFIED_PHYSICAL_EMPTY · FIRST_ARTICLE — 메타데이터 검사는 통과하지만 실제 구성 값/교정 ID가 채워진 실측은 없다. | SW, G2 | 측정마다 실제 장비 설정·키트·체인·온도·도체 구성을 기록한다. |
| DATA-02 | 계산·시뮬레이션·실측·합성 결과의 출처와 상태 구분 | SOFTWARE_VERIFIED · NONE — 합성/계산/시뮬레이션과 실측을 분리한 기록이 있다. | SW, NUM | 2D 결과와 이번 유한선로 예시를 실제 A02 S2P로 승격하지 않는다. |
| DATA-03 | 교정 CSV에 유효성·불확도·위상 품질 상태 표시 | SOFTWARE_VERIFIED_PHYSICAL_EMPTY · QUANTITATIVE — CSV의 UNASSESSED/유효성/위상 상태 로직은 검증되었으나 실제 불확도는 없다. | SW | 실측 마스크와 오류 예산을 채우고 무효/외삽 구간을 보존한다. |
| SW-01 | Touchstone 주파수 단위·RI/MA/DB·포트 순서 검증 | SOFTWARE_VERIFIED · NONE — Touchstone 단위·표현·포트 순서 및 거부 조건은 현재 110개 테스트 범위에 있다. | SW | 새 실제 VNA export가 들어오면 메타데이터와 포트 방향을 대조한다. |
| SW-02 | peak/RMS/peak-to-peak와 dBm/dBµV/dBµA 환산 검증 | SOFTWARE_VERIFIED · TONE_ONLY — 기본파 RMS의 단위 환산은 검증됨. 총 파형 RMS/펄스에 정현파 환산을 적용할 수 없다. | SW, CHAIN | 기본파 결과임을 표시하고 광대역 전류/펄스 피크 기능과 구분한다. |
| SW-03 | 대역 밖 외삽·null 역보정·클리핑 데이터 정량화 차단 | SOFTWARE_VERIFIED_PHYSICAL_EMPTY · QUANTITATIVE — null·범위 밖·clipping·알 수 없는 체인 거부 시험이 통과한다. | SW | 실측 시 관측된 clipping/overload와 유효 대역을 실제로 입력한다. |
| SW-04 | 체인에 포함된 케이블·감쇠기의 이중 보정 차단 | SOFTWARE_VERIFIED_PHYSICAL_EMPTY · SCOPE_CURRENT — 이중 보정/어댑터 제거/수신기 미검증을 거부한다. 실제 어댑터 제거 보정 구현/데이터는 없다. | SW, CHAIN | BNC 기준면 교정 또는 검증 2포트 de-embedding 경로와 실제 scope 응답을 확보한다. |
| SW-05 | 플롯에 데이터 종류·축·단위·헤드·교정 ID·유효 대역 표시 | SOFTWARE_VERIFIED · NONE — 합성 출력 라벨/단위/ID 검증은 통과한다. | SW | 실측 데이터에서도 상태·유효 대역·불확도를 표시한다. |
| SIM-01 | 시뮬레이션에 모델·설정·원본 출력과 적절한 재료 근거 보관 | LIMITED_MODEL_VERIFIED · CALIBRATION — 2D 단면의 원본·경계·수렴·비교 및 재적분은 있으나 전체 A02 RF 모델은 없다. | NUM, PLAN | 현재 형상 전체의 포트/전류 모델과 가정·수렴·원출력을 T02 패키지에 따라 확보한다. |
| VAL-01 | T01 구조·절연·접속 검사 | NOT_MEASURED · FIRST_ARTICLE — T01 실물 접속/절연 구조 결과가 없다. | G2 | 권선 저항과 일차-측정 회로의 의도치 않은 도통을 확인한다. 내전압 시험으로 부르지 않는다. |
| VAL-02 | T02 지그 through·반사·손실·위상과 헤드 장착 영향 확인 | NOT_MEASURED · CALIBRATION — 실제 empty/loaded S2P가 없다. S11≤−20 dB는 초기 목표이며 국소 전류 증거와 다르다. | G1, PLAN | 두 상태의 4개 복소 S와 모델/HI를 대조하고 유지 가능 대역을 결정한다. |
| VAL-03 | T03 전달 임피던스의 유효 연속 구간 확보 | NOT_MEASURED · QUANTITATIVE — 유효 연속 ZT 대역이 없다. | G2, PLAN | HI·잡음·반복·선형성·픽업 조건을 함께 만족하는 구간만 허용한다. |
| VAL-04 | T04 출력 레벨 선형성 | NOT_MEASURED · FIRST_ARTICLE — 레벨 선형성 실측 없음. | G2, PLAN | −30/−20/−10 dBm 등 지원 레벨에서 출력 10±1 dB 변화, S21 동일성을 확인한다. |
| VAL-05 | T05 집게 개폐·재장착 반복성 | NOT_MEASURED · FIRST_ARTICLE — 개폐 5회 ±1 dB 반복성 실측 없음. | G2, PLAN | 접합면·체결·권선·케이블 배치를 기록하여 5회 이상 비교한다. |
| VAL-06 | T06 도체 위치 의존성 | NOT_MEASURED · FIRST_ARTICLE — 케이블 중심 고정 형상은 위치 민감도 실측을 대신하지 않는다. | G2, PLAN | 중심/가장자리/원위치 복귀 후 허용 위치와 오차를 정한다. |
| VAL-07 | T07 왕복 전류 상쇄 | NOT_MEASURED · FIRST_ARTICLE — 상쇄 20 dB 실측 없음. 단일/왕복 전류가 다르면 단순 전압 비가 틀릴 수 있다. | G1, G2 | 각 경우 실제 일차 전류로 정규화한 상쇄를 구한다. |
| VAL-08 | T08 직접 픽업·누설 | NOT_MEASURED · FIRST_ARTICLE — 직접 픽업 대조 실측 없음. | G1, G2 | 의도한 결합을 제거한 누설을 기록하고 순수 E-field만 분리했다고 부르지 않는다. |
| VAL-09 | T09 실제 출력 체인 의존성 | NOT_MEASURED · SCOPE_CURRENT — 실제 BNC까지의 복소 체인과 scope 내부 응답/부하 동등성이 없다. | CHAIN, PLAN | 체인 기준면을 확정하고 수신기 응답을 독립 전압 기준으로 확인한다. |
| VAL-10 | T10 프로브 삽입 영향 | NOT_MEASURED · FIELD — 프로브 삽입이 CM 전류/링크를 바꾸는 정도가 알려지지 않았다. | W, G2 | 헤드 유무와 출력 종단별 S 및 안전 DUT 오류 로그를 비교한다. |
| VAL-11 | T11 제한된 펄스 응답 | NOT_MEASURED · PULSE — 안전한 펄스 응답 시험도 아직 없다. 기본파 분석은 펄스 전류 복원이 아니다. | W, CHAIN, PROT | 알려진 저에너지 입력으로 링잉/droop/clipping만 먼저 평가한다. |
| VAL-12 | T12 현장 전후 상태 점검 | NOT_MEASURED · FIELD — 현장 전후 비교 측정 없음. | G2 | 동일 지그/체인으로 전후 특성·손상을 점검한다. |
| VAL-13 | 검출 최소 SNR 10 dB를 초기 기준으로 검토 | NOT_MEASURED · QUANTITATIVE — SNR 10 dB 목표도 아직 측정되지 않았다. | W, G2 | IFBW/평균/FFT window·ENBW와 잡음 바닥을 기록한다. SNR만으로 정확도를 보장하지 않는다. |
| FIELD-01 | 전체/부분 도체군·쉴드 포함 여부와 비동시 측정의 해석 한계 기록 | NOT_EXECUTED · FIELD — 전체/부분 도체군·쉴드 포함 여부의 해석 원칙만 있다. | W | 실제 배치와 비동시 측정 한계를 기록하고 작은 합전류로 내부 CM 스트레스를 배제하지 않는다. |
| FIELD-02 | F0~F4 중 가능한 조건과 오류 로그 시각 관계 기록 | NOT_EXECUTED · FIELD — 장애 상관/시계 관계의 현장 결과가 없다. | W | 안전 조건 충족 후 F0~F4 중 가능한 구성과 오류 로그 시간 오차를 기록한다. |
| REL-01 | 재제작 원본·조립/측정 절차·개체별 교정·유효 범위·검증·보호 조건 포함 | NOT_COMPLETE · FULL_RELEASE — 기구/PCB 원본이 있어도 개체별 교정·유효 범위·보호 조건이 없어 완성 측정기 패키지가 아니다. | W, UI, PLAN, CHAIN | 제작 승인과 실험용 시제품·정량 측정·현장 사용 승인을 분리한다. |

### 증거 키

- **W**: `docs/RF_CURRENT_PROBE_WHITEPAPER.md`
- **G1**: `docs/G1_FIXTURE_REVIEW.md`
- **G2**: `docs/G2_BENCH_PROCEDURE.md`, `docs/G2_VERIFICATION.md`
- **G3**: `docs/G3_PROTOTYPE_PACKAGE.md`
- **HEAD**: `hardware/probe_head_A03/design_geometry.json`, `hardware/probe_head_A03/review/saved_board_verification.json`, `hardware/probe_head_A03/review/fabrication_verification.json`, `reviews/functionality_20260918/head_strict_erc.json`, `reviews/functionality_20260918/head_drc.json`
- **A02**: `hardware/calibration_fixture_PCB_A02/geometry.json`, `hardware/calibration_fixture_PCB_A02/verification.json`, `reviews/functionality_20260918/fixture_erc.json`, `reviews/functionality_20260918/fixture_drc.json`
- **NUM**: `reviews/full_audit_20260921/electrical/calculations.json`, `reviews/full_audit_20260921/electrical/board_readback.json`, `reviews/fixture_impedance_20260918/results.json`
- **PLAN**: `reviews/full_audit_20260921/electrical/T02_HI_EXECUTION.md`
- **FIT**: `docs/BUILD_READINESS_20260917.md`, `docs/references/RFPC-SMA28-F.pdf`, `docs/references/RFPC-SMA28-F_page1.png`, `hardware/probe_head_A03/design_geometry.json`
- **CHAIN**: `docs/END_TO_END_REHEARSAL.md`, `analysis/scope_tone.py`, `analysis/scope_metadata_template.json`
- **PROT**: `docs/PROTECTION_AND_PROCUREMENT.md`
- **SW**: `reviews/full_audit_20260921/unit_tests.xml`, `reviews/full_audit_20260921/synthetic_rehearsal/report.json`, `analysis/rfcp.py`, `analysis/metadata_template.json`
- **UI**: `viewer_A05/dist/manual.html`, `viewer_A05/assembly_viewer.js`, `viewer_A05/current_guide_steps.py`, `viewer_A05/current_set_content.py`
- **MECH**: `reviews/full_audit_20260921/mechanical.json`

## 9. 읽은 파일과 재현성

전체 전문/도면/구조화 결과를 읽은 목록과 당시 해시는 [electrical.json](electrical.json)의 `files_read`에 보존했다. 현재 문서는 root가 별도로 수정 중이므로 읽은 당시 해시와 이후 발행본이 다를 수 있다. 이 감사에서는 원본 CAD·Gerber·사이트·발주를 변경하지 않았다.

- `docs/RF_CURRENT_PROBE_WHITEPAPER.md`
- `docs/REQUIREMENTS.csv`
- `docs/G1_FIXTURE_REVIEW.md`
- `docs/G2_BENCH_PROCEDURE.md`
- `docs/G2_VERIFICATION.md`
- `docs/G3_PROTOTYPE_PACKAGE.md`
- `docs/END_TO_END_REHEARSAL.md`
- `docs/PROTECTION_AND_PROCUREMENT.md`
- `docs/ATLAS_A02_DESIGN_REVIEW.md`
- `analysis/README.md`
- `analysis/rfcp.py`
- `analysis/scope_tone.py`
- `analysis/metadata_template.json`
- `analysis/scope_metadata_template.json`
- `analysis/fixture_model.py`
- `analysis/fixture_impedance_20260918.py`
- `analysis/extract_fixture_cross_section.py`
- `hardware/probe_head_A03/README.md`
- `hardware/probe_head_A03/build_head.py`
- `hardware/probe_head_A03/design_geometry.json`
- `hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_pcb`
- `hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_sch`
- `hardware/probe_head_A03/RFCP_Head_A03_DRAFT.kicad_pro`
- `hardware/probe_head_A03/review/erc.json`
- `hardware/probe_head_A03/review/drc.json`
- `hardware/probe_head_A03/review/saved_board_verification.json`
- `hardware/probe_head_A03/review/fabrication_verification.json`
- `hardware/calibration_fixture_PCB_A02/README.md`
- `hardware/calibration_fixture_PCB_A02/ASSEMBLY.md`
- `hardware/calibration_fixture_PCB_A02/build_pcb.py`
- `hardware/calibration_fixture_PCB_A02/geometry.json`
- `hardware/calibration_fixture_PCB_A02/verification.json`
- `hardware/calibration_fixture_PCB_A02/review/erc.json`
- `hardware/calibration_fixture_PCB_A02/review/drc.json`
- `hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_pcb`
- `hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_sch`
- `hardware/calibration_fixture_PCB_A02/RFCP_Fixture_Flat_A02_DRAFT.kicad_pro`
- `reviews/functionality_20260918/README.md`
- `reviews/functionality_20260918/head_strict_erc.json`
- `reviews/functionality_20260918/head_drc.json`
- `reviews/functionality_20260918/fixture_erc.json`
- `reviews/functionality_20260918/fixture_drc.json`
- `reviews/fixture_impedance_20260918/README.md`
- `reviews/fixture_impedance_20260918/results.json`
- `reviews/fixture_impedance_20260918/cad_cross_section.json`
- `reviews/fixture_impedance_20260918/runtime.json`
- `reviews/fixture_impedance_20260918/potential_field.npz`
- `viewer_A05/dist/manual.html`
- `viewer_A05/assembly_template.html`
- `viewer_A05/assembly_viewer.js`
- `viewer_A05/current_guide_steps.py`
- `viewer_A05/guide_bom.py`
- `viewer_A05/set_content.py`
- `docs/atlas/source/sections/calibration.html`
- `docs/BUILD_READINESS_20260917.md`
- `docs/references/RFPC-SMA28-F.pdf`
- `docs/references/RFPC-SMA28-F_page1.png`
- `viewer_A05/current_set_content.py`
- `reviews/full_audit_20260921/unit_tests.xml`
- `reviews/full_audit_20260921/synthetic_rehearsal/report.json`

완료 → 전기·교정 전 요구 대조 및 저장 근거 독립 검산. 변경 파일 → 이 감사 폴더만. 실제 검증 → 원 전위 재적분/현재 PCB 읽기/조건부 수치 예시. 미검증 → 전체 EM·실제 교정·scope/보호·실물 핀 삽입. 다음 작업 → 현재 A02 유지 평가와 제조 공차 대조.
