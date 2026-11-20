# B-RJ2 · 설계와 openEMS 근거

[보존 묶음과 재현 안내](https://github.com/ckh7488/rf_current_probe/blob/main/selected-evidence/ethernet-vna-prediction-v1/README.md) · [측정 PC에서 이어가기](https://github.com/ckh7488/rf_current_probe/blob/main/measurements/ethernet-vna/README.md)

제작본 B-RJ2의 4층 PCB, 제조사 발룬 차동 데이터와 SMA·RJ45·시험 플러그 등가회로를 연결한 사전 예측입니다. 원시 구동과 수치 검토는 2026-11-17에 완료했고, 보고서는 2026-11-20에 갱신했습니다. 새 네 구성의 VNA RF 값은 예측 입력에 사용하지 않았습니다.

## 보존 자료

- 최종 CAD·EM 입력 형상·생성 코드·주요 설정·부품 데이터·솔버 버전과 해시.
- 완료한 24개 구동의 원시 파형 한 세트, 모델·격자·개별 검사.
- PCB 24단자 행렬, 네 구성의 복소 응답과 SMA S4P, 변화 범위·시간창 대조·수치 검토.
- [보존 파일 해시와 재생성 가능한 파생 자료 정리 기록](https://github.com/ckh7488/rf_current_probe/blob/main/selected-evidence/ethernet-vna-prediction-v1/RETENTION.json).

고정 입력 영수증 SHA256은 `c32f552001013efe648bb1f30f2df84d11ccaa6134cf6a27eea3bd92459ee884`, 원래 출력 영수증 SHA256은 `2ec95c6e19e83989b33bbf77db13d401752d074461f99439d59595703562eee4`입니다.

## 해석 범위

PCB는 실제 동박·패드·비아·GND 기준면의 3D EM입니다. 외층 35 µm PEC, 프리프레그 Dk 4.4·코어 Dk 4.36의 명목 무손실 유전체, MUR 경계·공기 여백 10 mm, 550 × 538 × 29 격자와 최대 5 ns 기록을 사용했습니다. 발룬은 균형된 센터탭 개방 2차측입니다. 커넥터·제작 플러그는 전송선과 RLC이며 서로 다른 SMA·RJ45 페어·발룬 패키지 사이의 결합은 0입니다.

| 100 MHz · SMA 50 Ω | 크기 | 위상 |
| --- | ---: | ---: |
| 개방 입력 반사 · J3/B S11 | −1.3325 dB | −61.6223° |
| D→C 결합 (개방) · J5→J4 S21 | −64.4689 dB | −153.6726° |
| 100 Ω 부하 정합 · J2/A S11 (99.9 Ω) | −24.3142 dB | 45.8673° |
| D→C 루프백 전달 · J5→J4 S21 | −1.0789 dB | −86.0136° |

그래프는 1–200 MHz의 원시 1601점 중 하나를 선택합니다. 100 MHz 카드는 원래 후처리가 복소 응답을 보간해 저장한 표이며, 그래프의 가장 가까운 원시 지점은 100.0025 MHz입니다.

상반성·수동성 검사를 통과했습니다. 약 5 ns 전체 기록 대비 3 ns·4 ns 절단 결과의 복소 차이를 명목 진폭으로 나눈 값이 10%를 넘은 곳은 D→C 결합 (개방)의 1 MHz 한 점입니다(10.4928%). 이 점에서 두 절단 결과와 전체 기록 사이의 최대 크기 차이는 0.5346042252 dB, 최대 위상 차이는 6.0079050266°입니다.

## 설계 자료

최종 native PCB SHA256은 `975e27c6593b1bdd81aed159409a7450afdd58b910fae45834afb5ff24f37933`입니다. [보존된 제작 CAD](https://github.com/ckh7488/rf_current_probe/blob/main/selected-evidence/ethernet-vna-prediction-v1/input/balun_eth_rj45.kicad_pcb), [제조 검사 요약](manufacturing-evidence.json), [제작 파일의 표시용 2D 데이터](board-data.js)를 연결합니다.

배선 길이는 트랙 중심선 기준이며, 차동 지정 구간 100.04 Ω와 SMA 지정 구간 49.97 Ω은 업체 계산값입니다. 실물 사진은 조립 중의 발룬 면입니다. 제작 기준 CAD의 SHA256을 입고 명세와 대조했으며, 그 CAD에도 사진과 같은 이전 실크 이름 `REV B-SMA1`이 남아 있습니다. 최종 제작 기준은 B-RJ2입니다. 네 시험의 실측은 측정 세션과 조건, Touchstone 원본을 별도로 추가합니다.
