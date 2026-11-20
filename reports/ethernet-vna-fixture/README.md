# VNA 케이블 지그 · SMA↔Ethernet

[ATLAS 보고서](https://ckh7488.github.io/showcase/reports/ethernet-vna-fixture/) · [계산 근거](EVIDENCE.md) · [측정용 Git과 실행 안내](https://github.com/ckh7488/rf_current_probe/blob/main/measurements/ethernet-vna/README.md)

기존 개념도·제작 PCB 보기·설계 설명에 최종 보드의 openEMS 형상과 네 사전 예측을 연결했습니다. 결과 카드를 선택하면 3D 경로와 주파수 응답이 함께 바뀝니다. 슬라이더는 저장된 1601개 주파수 지점을 선택합니다.

전체 계산 입력과 원시 파형은 `rf_current_probe` Git의 보존 묶음에 있습니다. 이 보고서 폴더에는 표시용 데이터·사진·3D 코드와 라이브러리를 둡니다. 실측은 같은 네 결선으로 측정용 Git에 세션을 추가하고, 확인한 비교 결과를 보고서에 반영합니다.

오프라인 검수용 한 파일을 만들 때 저장소 루트에서 실행합니다.

```sh
python reports/ethernet-vna-fixture/source/export_standalone.py ethernet-vna-review.html
```
