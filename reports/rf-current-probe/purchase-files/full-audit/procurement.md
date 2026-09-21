# 현행 58행 BOM — 조달·보유·발주 전수 대조

2026-09-21 · 자료 대조 및 일차자료 확인 · CAD/사이트/주문 변경 없음

## 결론

**현재 구매 링크만으로 RF 프로브·교정·현장 측정의 완성 세트를 모두 주문하는 상태가 아니다.** 58행은 설치·설계 목록이다. 장바구니/견적/실제 보유/기술 보류를 아래처럼 나눠야 한다.

- 출력 **15종·20개**와 헤드 PCB A03만 JLC 견적에 있다. 9/21 15:14 상태 재확인 기준 새8종 검토중, 기존7종+헤드 파일 승인, 결제 없음. 헤드 파일 승인은 SMA 핀·홀 공차 검증 완료가 아니다. 교정 PCB **E03은 미접수·기술 보류**이며 전체 보드 H_I 검증 후 기존 유지/수정을 판단한다.
- 체결품 **24행·22고유품번·설치112개**는 선정/CAD 연결은 되어 있으나 **전부 현행 구매카트 밖**이다. 회사 M3–M5 나사 재고를 이 정확품 재고로 치환하지 않았다.
- 기존 DigiKey 공유카트는 **9종**이다. 구매 TXT/목록은 플럭스2·작업로드7을 복원한 **11종**, 국내 링크는 권선1판매단위·테이프1롤·팁2종의 **4행**이다. 기존9종과11종TXT를 둘 다 넣으면 중복된다.
- E01 판매단위/납기, R04 THRU 실제 보유·모델, R07 BNC 기준면 경로, R08 보호부 선정, 공구/납·테스터 확인이 남는다. 저레벨 실험실 특성화 준비와 현장 사용 준비는 같은 완료 상태가 아니다.
- F01/F02는 현재 M2×10과 최대 너트 기준 끝여유가 공칭0.19mm로 완전물림 공차가 미확인이다. 정확품 M2×12 후보50M020040P012의61인출자세/공칭2.19mm 여유는 확인됐지만 현재 CAD/BOM 변경으로 오인하지 않는다.
- 본 감사에서 이전33종 원본은 삭제하지 않았다. 유지11+복원4+설계상제외7+명시보류2+옛기구9를 모두 추적했다.

## 자료로 닫은 부분과 남은 조달 문제

F14 SMO-3(N)의 재질·날개 치수는 제조사 원본으로 확인되며 기존 CAD의 보수적 포락과 연결된다. 이를 새 기구 오류로 분류하지 않는다. 실제 소량판매와 한국배송은 미확정이다. 제조사 [제품](https://www.kangyang-europe.com/product/smo-3/) / [도면](https://www.kangyang-europe.com/wp-content/uploads/product_files/pdf/SMO-3.pdf).

코어는 제조사 도면/STEP에서 물리적 반쪽2개가 필요함을 확인한다. 14판 제조사 카탈로그의 split-core 개별판매 설명도 확보했지만 정확2644181281은 그 구판에 없다. 최신 정확품 판매단위의 공개 명시를 찾지 못했으므로 한쌍이라고 추정해1개 주문하거나 반쪽이라고 단정해2개 결제하지 않는다. [정확 제조사 제품](https://fair-rite.com/product/round-cable-snap-its-2644181281/) / [판매 페이지](https://www.digikey.com/en/products/detail/fair-rite-products-corp/2644181281/8594102).

|행|설치 수량|확인된 판매 단위/남은 일|
|---|---:|---|
|F05 M4×70 스터드|2|[Fabory](https://www.fabory.com/nl/p/20106040070/generatePdf)200개 전포장. 같은품 소량유통 미확정.|
|F07 M4 사각너트|16|[TME](https://www.tme.com/us/en-us/details/b4_bn147/nuts/bossard/8236739/)200개 배수. 공장포장1000과도 구분.|
|F09 M6 사각너트|2|[TME](https://www.tme.eu/en/details/b6_bn147/nuts/bossard/1092642/)100개 배수.|
|F10 M6 nyloc|2|[동일품 판매 예시](https://www.bd.dk/produkt/525325865/bossard-laasemoetrik-m6-din-985-lav-rustfrit-staal-a2-100-stk)는100개 팩. 한국배송 미확정.|
|F11+F17 황동 M6 와셔|총4|[Fabory](https://www.fabory.com/nl_BE/p/50060060001/generatePdf)250개 전포장. 두 BOM행을 두 팩으로 중복 주문하지 않음.|
|F15 M6×120 스터드|2|[Würth](https://eshop.wuerth.de/Threaded-rod-DIN-976-A2-70-stainless-steel-shape-A-THRPCE-DIN976-A-A2-70-M6X120/095496%20120.sku/en/US/EUR/)100개 포장. 소량유통/한국배송 미확정.|
|F23 M4 잼너트|2|[Fabory](https://www.fabory.com/en_NL/p/51080040001/generatePdf)500개 전포장. 같은품 소량유통 미확정.|
|Essentra PA 부품|행별|일부 공장1000개 포장이어도 DigiKey 낱개 판매 확인. 한국 주문시 실제수량/배송/재고 재확인.|

상세 제조사/판매자 URL·조회일·근거와 행별 CAD 이름은 [procurement.json](procurement.json)에 있다. 공개 검색의 재고는 캐시일 수 있어 현재 예약/한국 배송 확정으로 쓰지 않았다.

## 전체58행

현재 상태는 설치수량과 분리해 읽는다. ‘선정’은 결제 완료가 아니며, ‘보유 확인’은 보유를 확인해야 한다는 뜻인 행도 있다.

### 3D 출력15행

|ID / 품목·규격|설치량|실제 상태 / 근거|남은 조치|
|---|---:|---|---|
|P01 프로브 아래 중앙 몸체 — LowerCenter_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P02 프로브 왼쪽 뚜껑 — UpperLeft_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P03 아래 코어 고정바 — LowerKeeper_FREE_DRAFT.stl|1 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P04 위 코어 고정바 — UpperKeeper_FREE_DRAFT.stl|1 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P05 공통 바닥 가운데 — BaseCenter_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P06 클램프 고정틀 — C07_Frame_DRAFT.stl|2 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P07 클램프 연결틀 — C07_DriveYoke_DRAFT.stl|2 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P08 클램프 가로대·위 턱 — C07_TopBridgeJaw_DRAFT.stl|2 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P09 아래 왼쪽 턱 — C07_Jaw1_DRAFT.stl|2 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P10 아래 오른쪽 턱 — C07_Jaw2_DRAFT.stl|2 개|JLC 승인·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P11 프로브 아래 왼팔 — LowerArmLeft_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P12 프로브 아래 오른팔 — LowerArmRight_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P13 프로브 오른쪽 뚜껑 — UpperRight_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P14 공통 바닥 앞쪽 — BaseFront_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|
|P15 공통 바닥 뒤쪽 — BaseRear_A14_DRAFT.stl|1 개|JLC 검토중·미결제; 견적수량/STL해시 일치|3201PA-F/Grayish Black/No finish/No thread 검토 결과와 휨·박벽 조건 확인 후 제작 판단. 출력/실물맞춤은 미실행.|

### 전자·권선6행

|ID / 품목·규격|설치량|실제 상태 / 근거|남은 조치|
|---|---:|---|---|
|E01 분할 페라이트 코어 — Fair-Rite 2644181281 · 44 재료|2 반쪽|선정·판매단위/조달 미완료 — CORE_MANUFACTURER / CORE_SELLER / CORE_FAMILY_HISTORY|1개 판매가 반쪽/한쌍인지 정확품 판매처 확인 후 물리적 반쪽2개 확보; 현재 재고·납기 견적 필요|
|E02 헤드 PCB — RFCP_Head_A03_DRAFT · 36×28×1.6 mm · 2층|1 장|JLC 파일 승인·핀홀 공차 미완료·미결제 — JLC 상태15:14 / electrical/electrical.md / hardware/probe_head_A03/README.md|파일 승인은 SMA 핀·완성홀의 공차 검증 완료가 아님. GCT 5핀/홀 제조조건·실품 맞춤 확인과 원본/거버 고정 후 발주; 수령5장 중1장 조립|
|E03 평판 교정 PCB — RFCP_Fixture_Flat_A02_DRAFT · 144×92.7×1.6 mm · 2층|1 장|기술 보류·미접수 — electrical/electrical.md / hardware/calibration_fixture_PCB_A02/README.md / fixture_impedance_20260918|전체 보드의 H_I(입력파 대비 코어 내 전류)·전이·장착 영향 검증 후 기존판 유지/수정 결정. 새판은 필수가 아니며 검증·리비전 확정 후 견적/발주|
|E04 수직 SMA 암 커넥터 — GCT RFPC-SMA28-F · 표준 SMA, THT|3 개|기존9종 카트에3개·핀홀 맞춤 미완료 — purchase_items RFCP-E04 / electrical/electrical.md|표준 RFPC-SMA28-F 3개(헤드1+교정판2) 유지. E02 파일 승인과 별개로 5핀·완성홀 공차/실품 맞춤 확인; E03 개정 필요 시 footprint 재대조|
|E05 에나멜선 — UEW Ø0.3 mm 후보|필요 길이|국내 구매링크1판매단위 — purchase_items WDG-01; BOM의 null은 설치길이 미정이지 구매0 아님|Ø0.3 권선1종만; 실제 절연 포함 지름/판매길이·중량을 확인해 필요한 길이 사용|
|E06 폴리이미드 절연 테이프 — 폭 5 mm 후보 · 얇은 한 겹|필요 길이|국내 구매링크1롤 — purchase_items INS-01|SMG-A 5mm×33m 1롤; 실제 두께·한겹 코어절연 및 코어맞댐면 제외 확인|

### 체결·구동24행

|ID / 품목·규격|설치량|실제 상태 / 근거|남은 조치|
|---|---:|---|---|
|F01 헤드 PCB 나사 — Essentra 50M020040P010 · PA66 M2×0.4×10 · 머리 최대 Ø4.0×H1.6|2 개|현행 품번 선정·M2 완전물림 공차 보류·미카트 — 현재 CAD는 M2×10, 머리 제조사 최대 Ø4×H1.6. 최대 F02 너트 기준 끝여유 공칭0.19mm뿐이라 길이·끝 불완전산 공차 미확인. M2×12 정확품50M020040P012 후보는61인출자세 무간섭/공칭2.19mm 여유지만 현재 BOM/CAD 미채택. / 판매단위: 1|M2×10 실제 완전물림 공차 확인 또는 확인된 M2×12 후보50M020040P012 채택 판단 후 BOM/CAD 동기화. 한국 납기·판매단위·가격 확인 후 주문. 후보는 아직 미채택.|
|F02 헤드 PCB 너트 — Essentra 04M020040HN · PA66 M2 · AF3.9 / H1.2|2 개|현행 품번 선정·M2 완전물림 공차 보류·미카트 — 제조사 개별도면 AF3.90±0.26/H1.20±0.26. 최대AF4.16/H1.46 포락·뒤삽입58자세 무간섭. 현재 M2×10 끝여유 공칭0.19mm는 완전물림 공차 합격이 아님. 이전 미확인3.98/H1.62 가정은 폐기. / 판매단위: 1|M2×10 실제 완전물림 공차 확인 또는 확인된 M2×12 후보50M020040P012 채택 판단 후 BOM/CAD 동기화. 한국 납기·판매단위·가격 확인 후 주문. 후보는 아직 미채택.|
|F03 코어 고정바 나사 — Essentra 50M030050P035 · PA66 M3×0.5×35|4 개|정확 품번/설치수량 선정·미카트·미발주 — PA66 M3×35 머리 최대 Ø5.6×H2.4는 기존 Ø6.5×H3.3 CAD 포락 이내. 고정바 상하 합계4개. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F04 코어 고정바 너트 — Essentra 04M030050HNDIN34814 · PA66 M3 · AF5.3~5.5 / H2.2~2.4|4 개|정확 품번/설치수량 선정·미카트·미발주 — M3 AF5.3~5.5/H2.2~2.4 원본치수 확인. 고정바 상하 합계4개. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F05 개폐 손나사용 기성 스터드 — Fabory 20106.040.070 · DIN976-1A M4×0.7×70 전산 스터드 · 아연도금강 4.8|2 개|정확 품번/설치수량 선정·미카트·미발주 — M4×70 완성 스터드2개. 절단/압입 없음. F22/23/24와 선조립, 노브 상면 flush. Fabory200개 포장, 소량 재판매 미확정. / 판매단위: 200|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F06 모듈·가로대 손나사 — NBK KNMS-12-M4-20 · SUS303 · M4×20 · 노브 Ø12×H7.5|10 개|정확 품번/설치수량 선정·미카트·미발주 — M4×20 Ø12/H7.5: 바닥 탈착6 + 클램프 가로대4 =10. 사용자가 가진 일반 볼트와 동일한 손조작품으로 간주하지 않음. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F07 M4 사각너트 — Bossard BN147 / 8236739 · M4 · 7×7×3.2 · 아연도금강|16 개|정확 품번/설치수량 선정·미카트·미발주 — 헤드2 + 마운트6 + 가로대4 + follower4 =16. M4는 DIN557 범위 밖이라고 제조사가 명시하므로 정확한8236739를 기준으로 함. / 판매단위: 200|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F08 큰 노브 · M6 암나사 — Ganter GN 6336.2-32-M6-E · Ø32 · 돌출 금속 부싱|2 개|정확 품번/설치수량 선정·미카트·미발주 — 돌출 부싱 타입E. M6 스터드10mm 삽입 후 F16으로 프레임 밖 선조립. F15와 완성 높이 일치; 압입 노브 후보는 폐기. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F09 M6 사각 구동너트 — Bossard BN147 / 1092642 · DIN557 M6×1 · 10×10×5 · 아연도금강|2 개|정확 품번/설치수량 선정·미카트·미발주 — 10×10×5 사각 구동너트2개. 홈6mm와 차이1mm 명목. 이 유격을 F10 과조임으로 없애지 않음. / 판매단위: 100|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F10 M6 축 위치 조절 너트 — Bossard BN33024 / 5813950 · M6×1 · AF10 / H6|2 개|정확 품번/설치수량 선정·미카트·미발주 — AF10/H6 nyloc2개. 아래로0.8mm 옮긴 현재 F11과 함께 공칭 회전 여유0.2mm 조절. 나일론 링 실제 물림·양방향 유지 미시험. / 판매단위: 100|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F11 M6 축 받침 와셔 — Fabory 50060.060.001 · 황동 DIN125-1A · ID6.4 / OD12 / t1.6|2 개|정확 품번/설치수량 선정·미카트·미발주 — F17과 동일품. 아래 t1.6+F10 아래0.8mm 조정으로 채택한 형상. 설치 총4개를 한 품목으로 구매. / 판매단위: 250|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F12 팔로워 어깨나사 — NBK SBSMS-M4-5-20 · SUS304 상당 · 어깨 Ø5f9×20 / M4×0.7 나사8 / 머리Ø9×4 / 육각2.5|4 개|정확 품번/설치수량 선정·미카트·미발주 — 어깨 Ø5f9×20(+0.25/0), M4×0.7 나사8, 머리Ø9×4, 육각2.5. 최대20.25 후보146자세 기록 존재; 실제 필렛/마찰 미시험. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F13 교정 PCB 고정 나사 — Essentra 50M030050P012 · PA66 M3×0.5×12|4 개|정확 품번/설치수량 선정·미카트·미발주 — 교정 PCB용 M3×12 4개. E03 미발주와 분리해 보존하며 E03 검증 후 개정이 필요할 경우 장착 스택 재대조. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F14 교정 PCB 날개너트 — Kang Yang SMO-3(N) · M3 · PA66|4 개|정확 품번/설치수량 선정·미카트·미발주 — SMO-3(N) 원본 치수/PA66 확인 완료. A13 상속 CAD가 보수적 날개 포락으로 모델링. 실제 한국 소량판매·배송 미확정. E03 검증 결과 개정 시 장착 스택 재대조. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F15 큰 노브용 기성 전나사 스터드 — Würth 095496120 · DIN 976 M6×120 · A2-70|2 개|정확 품번/설치수량 선정·미카트·미발주 — M6×120 완성봉2개. 10mm 노브 물림으로 사용길이110mm. Würth 직접 포장100개, 실제 소량 조달 미확정. / 판매단위: 100|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F16 노브 고정 잼너트 — Fabory 51080.060.001 · DIN 934 M6 · AF10 / H5|2 개|정확 품번/설치수량 선정·미카트·미발주 — M6 AF10/H5 잼너트2개. 노브와 스터드를 프레임 밖에서 고정. F10과 역할 다름. 최종 조임력/풀림 실물 확인. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F17 축 위쪽 받침 와셔 — Fabory 50060.060.001 · 황동 · ID6.4 / OD12 / t1.6|2 개|정확 품번/설치수량 선정·미카트·미발주 — 위쪽 와셔2개. F11 아래쪽2와 동일 Fabory50060.060.001로 총4개. 두 줄을 별도품/별도팩으로 주문하지 않음. / 판매단위: 250|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F18 분할 바닥 연결 나사 — Essentra 50M040070P020 · PA66 M4×20|4 개|정확 품번/설치수량 선정·미카트·미발주 — PA66 M4×20 4개. 바닥 아래서 위로 삽입, 너트는 위. 옛 M4×16/25나사와 혼합 금지. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F19 분할 몸체·뚜껑 연결 나사 — Essentra 50M040070P030 · PA66 M4×30|6 개|정확 품번/설치수량 선정·미카트·미발주 — PA66 M4×30 6개 =하부4+상부2. 상부 M4×25는 끝나사 여유 부족으로 제외됨. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F20 분할 연결 육각너트 — Essentra 04M040070HNDIN34814 · PA66 M4|10 개|정확 품번/설치수량 선정·미카트·미발주 — PA66 M4 너트10개 =바닥4+하부4+상부2. 일반 사내 금속너트로 자동대체하지 않음. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F21 분할 연결 평와셔 — Essentra 17M04DIN34815 · PA66 · ID4.3 / OD9 / t0.8|20 개|정확 품번/설치수량 선정·미카트·미발주 — 분할 연결10곳×앞뒤2=20개. F24같은품2개를 더해 설치 총22. 공칭.8mm, 공개 구카탈로그.7...9mm 한계 별도. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F22 개폐용 관통 노브 — NBK KNFS-16-M4 · SUS303 관통 암나사 노브 M4×0.7 · Ø16×H9.5 / 허브Ø8×6|2 개|정확 품번/설치수량 선정·미카트·미발주 — 관통 M4 노브2개: Ø16/H9.5, 허브Ø8×6. F05끝을 노브상면 flush로 선조립. 실제 잠금/반복풀림 미확인. / 판매단위: 미확정|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F23 개폐 노브 고정 잼너트 — Fabory 51080.040.001 · DIN934 M4×0.7 · AF7 / H3.2 · A2-70|2 개|정확 품번/설치수량 선정·미카트·미발주 — M4 AF7/H3.2 잼너트2개. 노브와 직접 맞대며 그 사이에 와셔를 넣지 않음. 제조사500개 포장, 소량 유통 미확정. / 판매단위: 500|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|
|F24 개폐 노브 받침 와셔 — Essentra 17M04DIN34815 · PA 와셔 ID4.3 / OD9 / t0.8|2 개|정확 품번/설치수량 선정·미카트·미발주 — F21과 동일 PA 와셔 추가2개. 설치 총22. 잼너트 아래에 넣음. / 판매단위: 1|동일 품번의 한국 배송·납기·판매단위/최종 가격 확인 후 체결품 주문목록/카트 생성. 실제 부품 보유를 추정하지 않음.|

### 측정체인8행

|ID / 품목·규격|설치량|실제 상태 / 근거|남은 조치|
|---|---:|---|---|
|R01 SMA 수–수 50 Ω 케이블 — 표준 SMA male–male|2 개 사용|보유1+기존9종 카트1 — 사용자 1.SMA–SMA보유 진술 / purchase_items RFCP-R01|새 CSE-SGAM-305-SGAM1개와 보유1개로2포트; 보유선 식별/손상·길이·가동반경 확인|
|R02 SMA 수 50 Ω 로드 — TE 2467938-1 작업용 로드 · 50 Ω / SMA 수|1 개 사용|구매TXT11종/별도추가 링크에7개 — 복원감사33행 / purchase_items SHARED-LOAD|전체공용7개(발룬6+프로브공유/예비1)를 한 번만 주문; 기존9종 카트에는 아직 없음|
|R03 SMA OPEN / SHORT / LOAD — 보유 교정 표준|1 세트|보유 진술·세부 미확인 — 사용자 SMA SOL보유 진술 / END_TO_END_REHEARSAL|표준 각 모델/성별/모델계수·유효대역 확인; 작업용R02로 대체했다고 간주하지 않음|
|R04 SMA 암–암 THRU — 2포트 교정용 연결 기준|1 개 필요|실제 보유/품번 미확인 — PROTECTION_AND_PROCUREMENT CAL-THRU-01|키트의 암–암THRU와 모델 확인 후 없을 때 구매; 임의 zero-length정의 금지|
|R05 10 dB 감쇠기 — Mini-Circuits VAT-10A+ 후보|1 개|기존9종 카트1 — purchase_items RFCP-R05 / Mini-Circuits RevC 원본|VAT-10A+1개; 손실/전력 조건/전체체인 응답 확인. R08 보호부를 대신하지 않음|
|R06 SMA–BNC 50 Ω 케이블 — SparkFun 27480 · 1 m 기존 후보|1 개|기존9종 카트1 — purchase_items RFCP-R06 / CAB27480 공급사도면|27480 SMA-M/BNC-M 1m; 조립품S파라미터/실플러그와 받침하중 확인|
|R07 BNC–SMA 교정 어댑터 — Cinch 29-3835 기존 후보|1 개 조건부|조건부·카트 없음 — PROTECTION_AND_PROCUREMENT / END_TO_END_REHEARSAL|BNC 기준면 경로를 정한 뒤 Cinch29-3835 BNC-F/SMA-F1개 필요성 확정; 스코프 연결만에는 추가어댑터 불필요|
|R08 현장 입력 보호 — 허용 펄스·전압·에너지에 맞는 보호 체인|선정 후|미선정·현장사용 보류 — PROTECTION_AND_PROCUREMENT PROT-01 / 백서9·13·18절|실제 허용 펄스/정격/감도 후 보호임계·잔류/회복/왜곡 검증과 제품선정. 저레벨 수동벤치 실험과 현장세트를 구분|

### 장비·공구5행

|ID / 품목·규격|설치량|실제 상태 / 근거|남은 조치|
|---|---:|---|---|
|T01 2포트 이상 VNA — 50 Ω · 복소 S11/S21 · 1–300 MHz 포함, 500 MHz까지 확장 권장|1 대|사용자 보유·장비 상세 확인 — 사용자 LibreVNA 구매 언급 / DECISIONS|실제HW/FW/GUI, 동작대역/입력정격, 복소2포트교정·Touchstone 저장 확인|
|T02 오실로스코프 — 아날로그 대역폭 500 MHz 이상 권장 · 정의된 50 Ω 입력|1 대|사용자 보유·모델 잠정 — DEC-006 / PROTECTION_AND_PROCUREMENT|실물 모델/수리·교정상태와50Ω/DC결합 설정/입력정격 확인. 보유장비응답 미확인|
|T03 스패너·드라이버 — 7 mm / 10 mm / 5.5 mm / M2용 소형 공구 + 십자 드라이버 + follower용 2.5 mm 육각렌치|1 세트|실제 공구 보유 미확인 — 현행 BOM T03 / current_evidence 공구 제한|7/10/5.5mm·M2공구/십자/2.5mm육각 보유 조사 후 부족품만 구매; 검사된10mm 스패너 외형과 대조|
|T04 인두·납·플럭스·인두팁·테스터 — 권선·납땜·도통 확인|1 세트|인두보유+플럭스2·팁2구매복원 — purchase_items SHARED-FLUX/TIP-1.6D/TIP-2.4D / 이전33행|플럭스2는9종카트 밖 별도추가; 팁1.6D/2.4D각1 국내링크. 납·테스터는 실제 확인후 부족품 선정|
|T05 치수·축 여유 확인 도구 — 캘리퍼 / 필러 게이지 등|1 세트|실제 보유 미확인 — 현행 BOM T05 / PHYSICAL_ACCEPTANCE|치수 측정기와 약0.2mm 축여유 확인 도구 보유 확인 후 부족분만 구매|

## 58행 밖에 숨어 있는 절차 의존항목

- **CAL-BNC-01**: 절차에는 있음; 58행 전용 조달행/보유 근거 없음. 보유/대여부터 조사하고 필요한 경로만 선정; 무조건 새키트 구매를 추가하지 않음. 어댑터 단순 규격만으로 deembedding 완료라고 보지 않음.
- **RECEIVER-REFERENCE**: 절대 스코프 체인 검증용 독립 기준 RF전압/검증 수신기 접근 미확인. 검증된 기준 신호원/수신기·기존실험실 접근 확인; 필요하면 대여/외부교정 또는 전압·상대특성화 범위로 제한. LibreVNA명목 출력만으로 프로브/스코프 동시에 참값확정하지 않음.
- **BALUN_PURCHASE_SCOPE**: 현재 구매페이지는 RF58행 외 발룬5종도 포함. 발룬 기존 주문/보유/입고를 RF완료로 혼동하지 않음. 로드7·플럭스2는 두 프로젝트 공용으로 중복 구매하지 않음.
- **CONSUMABLE_DETAILS**: 권선 절연 포함 외경/테이프 두께/납·테스터 보유 미확인. 판매옵션과 실제 재고를 확인하고 필요한 것만 구매. 권선용.3mm와 폐기된 동판연결용.5mm를 다시두종 사지 않음.

## 문서의 서로 다른 시점 정리

아래는 감사 시작 당시 표현과 현재 근거의 대조 기록이다. 루트가 9/21 역사 경계·F14/R07·옛 C04 및 출처 정정을 반영했으며, 모든 항목이 현재도 미수정이라는 뜻은 아니다.

- `docs/PROTECTION_AND_PROCUREMENT.md`: 2026-09-17 최신: 카트완료/로드신규0 → 현행은 로드7 구매예정 복원, 기구24행 새카트 미완료. 날짜가 붙은 역사표기이며 9/21현재 발주완료 근거로 사용금지.
- `docs/STATUS.md`: 본문 G3 옛 A0.2/구경/개수/175000원 시나리오 → 상단9/21 A14/C07 58행/125객체가 우선. 과거 비용은 현행합계가 아님.
- `viewer_A05/set_sources/catalogue_parts.json remaining`: F05 최종 CAD/독립검증해시 확인 필요 → 93ba7a61 최종 저장원본 및 catalogue_delta/current_evidence로 확인완료. 남은 것은 실제조달/실물시험이며 기성조합기하미선정으로 읽지 않음.
- `viewer_A05/set_sources/bom.json F14.note`: 날개 외형·구매 가능 여부 확인 → 제조사도면 치수는 이미 CAD포락에 사용됐고 이번시각검토로 확인. 실제품정밀외형/공차·소량조달은 구분해서 남김.
- `viewer_A05/set_sources/bom.json T01/T02/T03/T05.status`: 보유 확인 → 보유완료와 확인할일이 혼동될 수 있음. VNA/스코프는 사용자진술, 정확모델/부속품/공구는 별도 미확인.
- `hardware/calibration_fixture_PCB_A02/README.md`: 옛30+35mm나일론기둥8개/기존브래킷 → 현재 A14공통바닥 통합지지대와 F13/F14로 대체; 옛지주8개를 구매목록에 복구하지 않음. E03전기보류는 계속유효.
- `viewer_A05/set_sources/purchase_manifest.json scope`: unresolved mechanical hardware → 정확품번/기하선정은 완료된 행과 실제소량조달/카트가 미완료인 행을 구분해 표현할 필요.

## 비용 해석

JLC RF$400.35와 발룬$220.54는 합계$620.89/869,246원(환율1,400)인 **제작·배송 견적 기록**이다. 가격은9/21 14:13 기록, 검토 상태는15:14 재확인이다. DigiKey11종410,967원과 국내4행48,840원은9/17~18의 부분 구매 참고액이다. 이를 더해도 코어·체결22품번·검증 후 확정할 E03 제작·보호/교정 준비·부족공구·미확정 세금/배송이 빠지므로 완성 세트 최종가격으로 표시하지 않는다.

## 실제 실행한 검증

- 현행 BOM58개 고유ID와 모든 CAD참조가125객체 mesh에 존재한다. compound개수를 설치개수로 세지 않았다.
- 현행 STL15개 SHA256/수량을 JLC기록과 대조해15개 전부 일치, 총20개 확인.
- 저장 CAD SHA256 `93ba7a61650cfc94c3a9d644f7af4473283908f98d1194f296e7ecd7819f7f92`가 기존 최종검증 연결의 해시와 일치한다. 새 기구/전기 시험은 실행하지 않았다.
- 플럭스2·작업로드7·팁1+1 복원량, 기존9카트와11종TXT/국내4행 분리 및 가격기준일을 확인했다.
- 보유/입고/실물맞춤은 새로 추정하지 않았다. 제조사 자료는 치수와 판매조건의 근거이며 실제 조립·RF 성능 인증이 아니다.

## 읽은 파일

현재 감사와 앞선 연속 조달/하드웨어 대조에서 읽은 파일을 아래에 열거한다. 문서가 길면 해당 조달·상태·결정 절을 대조했고 역사 항목은 현재 상태와 분리했다. 원본 해시는 JSON에 보존한다.

- `docs/RF_CURRENT_PROBE_WHITEPAPER.md`
- `docs/STATUS.md`
- `docs/DECISIONS.md`
- `docs/PROTECTION_AND_PROCUREMENT.md`
- `docs/END_TO_END_REHEARSAL.md`
- `docs/OPEN_CORE_HOLDER_REQUIREMENTS.md`
- `viewer_A05/current_set_content.py`
- `viewer_A05/set_content.py`
- `viewer_A05/guide_bom.py`
- `viewer_A05/build_purchase_handoff.py`
- `viewer_A05/set_sources/bom.json`
- `viewer_A05/set_sources/catalogue_parts.json`
- `viewer_A05/set_sources/purchase_manifest.json`
- `viewer_A05/set_sources/jlc_quote_status.json`
- `viewer_A05/dist/purchase.html`
- `viewer_A05/dist/purchase-files/purchase_items.json`
- `viewer_A05/dist/purchase-files/DigiKey_11_items.txt`
- `reviews/atlas_purchase_20260918/current_cart_rows.json`
- `procurement/full_purchase_20260917/purchase.json`
- `procurement/full_purchase_20260917/README.md`
- `procurement/full_purchase_20260917/최종검증.md`
- `procurement/combined_20260917/README.md`
- `procurement/combined_20260917/combined_procurement.json`
- `procurement/handoff_20260917/02_BALUN.md`
- `procurement/handoff_20260917/03_RF_LATER.md`
- `reviews/purchase_reconcile_20260921/reconciliation.json`
- `reviews/purchase_reconcile_20260921/README.md`
- `reviews/a14_document_sync_20260921/hardware/HARDWARE_AUDIT.md`
- `reviews/a14_document_sync_20260921/hardware/F05_final_patch.json`
- `reviews/a14_document_sync_20260921/hardware/source_manifest.json`
- `reviews/a14_recheck_20260921/hardware/HARDWARE_REVIEW.md`
- `mechanical/assembly_A14_DRAFT/README.md`
- `mechanical/assembly_A14_DRAFT/build_report.json`
- `mechanical/assembly_A14_DRAFT/catalogue_delta_verification.json`
- `reviews/a14_document_sync_20260921/independent/current_evidence.json`
- `hardware/probe_head_A03/README.md`
- `hardware/calibration_fixture_PCB_A02/README.md`
- `hardware/calibration_fixture_PCB_A02/BOM_DELTA.md`
- `reviews/a12_20260918/sources/SMO-3.pdf`
- `docs/references/core_farnell.pdf`
- `docs/references/2644181281_catalog.pdf`
- `reviews/full_audit_20260921/electrical/electrical.md`
- `reviews/full_audit_20260921/f02_envelope_sensitivity.json`
- `reviews/full_audit_20260921/sources/04M020040HN.PDF`
- `reviews/a14_recheck_20260921/hardware/essentra_fasteners_manufacturer.pdf`
