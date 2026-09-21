# A14 기구·제조 전수 대조

2026-09-21 · **문서/기존 근거 감사 + F02 최대 외형/긴 나사 후보 국소 검사. 실물·제작 승인 아님.**

## 결론

현행 45단계 조립 안내의 사용자 지시 전부, BOM58행 전부와 체결24행을 대조했다. 이 감사에서 **새 기구 간섭 결함을 발견한 것은 아니다.** 그러나 전체 세트 일괄 제작 준비는 아직 완료되지 않았다. 남은 제조·교정 인터페이스·조달 보류를 초도 실물 시험과 분리해야 한다.

- **제작 전:** 신규 출력8종 제조사 심사, E03 교정 PCB 수정과 BaseCenter 인터페이스 연동, Head A03 핀/홀 공차(전기 트랙), M2 나사 완전물림 공차, 정확 품번 소량조달/코어 판매 단위.
- **입고/초도 후:** 출력 휨·맞춤, 작은 뒤너트/실제 공구, 감은 권선의 삽입, 양쪽 코어 접촉힘, 이음부 침하·크리프, 노브 잠금·마찰, 중심 정렬과 RF 영향.
- **이번 문서 오류:** C04의 팔로워 미선정 표현, 이전 동판/패드/구매이연을 현재처럼 읽게 하는 문서, 일부 출력물만 검토중으로 보이는 상태 표시. 루트가 원본 문서를 수정했고 수정본을 다시 읽었다. 공개 생성물/배포 확인은 루트 통합 검사 범위다.

[통합된 현행 상태표](https://ckh7488.github.io/showcase/reports/rf-current-probe/bom.html#readiness)를 먼저 읽는다. E03는 새로 발생한 업체 거절이 아니라 기존 기술 보류다. A02의 단면242Ω만으로 전체지그 입력이242Ω이거나 전면 재설계가 반드시 필요하다고 단정하지 않는다.

## 실제 대조 결과

| 항목 | 확인 |
|---|---|
| 최종 CAD | A14/C07 `93ba7a61650cfc94c3a9d644f7af4473283908f98d1194f296e7ecd7819f7f92` |
| 원본/mesh/검증 연결 | 현재 해시 일치. wrapper 참조5파일 해시도 일치 |
| 출력 제출물 | 15종·20개 전체가 현행 STL과 제출기록의 해시/수량 일치 |
| 체결 수량 | F01–F24 24행 모두 기존 실제 CAD 수량감사와 일치 |
| 같은 품번 합산 | F11+F17 와셔4개; F21+F24 PA와셔22개 |
| 기성 긴 손나사 |70mm스터드/관통노브/잼너트/와셔 선조립. 절단·압입 없음 |
| 검증 범위 | 과거8e의978자세, c718의455자세, 최종93ba의82조립체자세를 구분.82와328부품자세 중복합산 안 함 |

각 숫자는 기존 검사와 현재 파일 연결을 확인한 것이다. 이번에978경로/FEM/두께를 다시 실행하지 않았다.

### 추가 요청된 M2 너트 공차 검사

[제조사 개별도면](https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/936/04M020040HN.PDF)을 이미지로 확인했다: AF3.90±0.26, 높이1.20±0.26. 최대4.16/H1.46의 회전포락은 저장된 현행 CAD에서 정적 및 뒤삽입58자세 간섭0이다. **현행 M2×10의 너트 밖 끝여유는 공칭0.19mm**이므로 나사길이·불완전끝산·PCB/홀더 공차를 포함한 완전물림 통과로 선언할 수 없다.

같은 최대 머리D4/H1.6에서 축만M2×12로 늘린 기하후보는 앞인출61자세 간섭0, 최대너트 기준 공칭끝여유2.19mm. 조달 담당이 Essentra50M020040P012의 제조사PDF35쪽과 유통품을 확인했다. **후보 검사이며 현재 제품·BOM·주문을 바꾸지 않았다.** 초기 전달치3.98/H1.62를 쓴 민감도 파일은 폐기한 가정 이력으로 표시했고 현재 불량 근거로 사용하지 않는다.

## 최신 제조사 관측

루트가 **2026-09-21 15:14 KST** Chrome에서 주문 화면을 새로 로딩해 확인: 신규8종 검토중, 기존7종 및 헤드 PCB 파일승인. 상품$390.02+배송$10.33=$400.35. 구A13 대형3종은 실패 이력으로 남지만 합계 제외. 결제·위험감수 없음. 이 관측을 이 에이전트가 별도 브라우저에서 중복 확인했다고 표현하지 않는다.

LowerCenter 법선표본40,000점 최소2.4mm는 JLC의 국소박벽 경고가 해소됐다는 판정이 아니다. UpperRight 파일경고와 휨/출력방향도 업체 답변을 기다린다. 자동경고를 무시하고 제작 승인하는 근거는 없다.

## 요구별 전수 대조

분류: RESOLVED는 명시된 계산/절차 범위에서 해소, OPEN은 다음 단계 이전에 처리, PHYSICAL은 실물 필요. 세부 수치·파일 해시는 [mechanical.json](mechanical.json)에 저장한다.

### M01 · 現행 원본과 검증을 같은 리비전에 연결

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: 최종 native/mesh/source 해시와 wrapper 참조해시 대조. 8e→c718→93ba 변경 체인 존재; 과거978자세를 최종에서 재실행했다고 쓰지 않음.
- 남은 조치: 물리 성능 승격 금지; 다음 형상 변경 시 영향 범위 재연결.
- 근거: README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), catalogue_delta_verification.json (원본 경로: `../../mechanical/assembly_A14_DRAFT/catalogue_delta_verification.json`)

### M02 · 출력물 수량·자유 뚜껑·제출물 일치

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: BOM15종20개, 제출기록15종20개, 현행 STL15개 해시·수량 대조. 자유 뚜껑 STL과 닫힌 STEP의 용도 구별.
- 남은 조치: 제조사가 실제 사용할 파일과 출력방향 최종 확인.
- 근거: bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), jlc_observed_status.json (원본 경로: `../../reviews/a14_document_sync_20260921/jlc_observed_status.json`)

### M03 · 제조사 박벽/변형 검토 승인

- 상태: `OPEN_RELEASE_GATE` · 기준: A14/C07 final 93ba7a61
- 확인: 루트가 2026-09-21 15:14 KST Chrome에서 새로 조회: 신규8종 검토중; 기존7종·헤드 승인. 구3종 실패이력은 금액 제외.
- 남은 조치: LowerCenter 박벽/UpperRight 파일경고와8종 변형·출력방향 검토 결과를 받아야 제조 진행 가능. 위험감수·결제 안 함.
- 근거: README.md (원본 경로: `../../procurement/jlc_refresh_20260921/README.md`), jlc_observed_status.json (원본 경로: `../../reviews/a14_document_sync_20260921/jlc_observed_status.json`), README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`)

### M04 · 교정 PCB 수정과 기구 인터페이스를 함께 확정

- 상태: `OPEN_DESIGN_DEPENDENCY` · 기준: A14/C07 final 93ba7a61
- 확인: E03 A02 정합보류. 현행 BaseCenter 받침4곳과 FlatPCB는144×92.7×1.6 및 현행 장착축/높이에 종속.
- 남은 조치: 새 E03가 외곽·장착홀·중앙높이·두께를 유지하는지 확인. 바뀌면 BaseCenter 및 경로 재검토. CAD 새 결함을 발견했다는 뜻 아님.
- 근거: README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), REQUIREMENTS.csv (원본 경로: `../../docs/REQUIREMENTS.csv`)

### M05 · 동판 가공·패드 재단·별도 스프링·접착·압입 없이 조립

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: 현재 BOM/45단계에 동판·패드·별도 스프링·새 가공 없음. 두 노브는 기성 스터드 나사 조립. 권선·납땜은 별도 수작업.
- 남은 조치: 실물 미맞춤을 가공·접착으로 임의 보완하지 말 것.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), current_set_content.py (원본 경로: `../../viewer_A05/current_set_content.py`)

### M06 · 하부3분할/상부2분할/바닥3분할 조립

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: 선조립 L00A/B,U00A/B,B00A/B 존재. 받침면 먼저 안착, 전 나사 먼저 걸기, 뒤→앞 및 아래→위 방향 구별.
- 남은 조치: 실물 휨·홀 어긋남은 볼트 힘으로 펴지 않고 반품/수정 판단.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), README.md (원본 경로: `../../reviews/a14_recheck_20260921/independent/README.md`)

### M07 · 새 이음부 나사 길이/받침/바닥 돌출

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: 바닥PA M4×20 아래삽입4, 몸체/뚜껑PA M4×30 6, 너트10/와셔20. 공칭 끝여유 하부3.2/상부·바닥5.2, 머리 책상여유2.1mm.
- 남은 조치: 실제 완전 나사산·와셔 치수·PA 허용조임 확인. 민감도는 보증공차 아님.
- 근거: README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), HARDWARE_REVIEW.md (원본 경로: `../../reviews/a14_recheck_20260921/hardware/HARDWARE_REVIEW.md`)

### M08 · PCB 홀더 박벽 보강

- 상태: `RESOLVED_GEOMETRY_PENDING_SUPPLIER` · 기준: A14/C07 final 93ba7a61
- 확인: 외곽측벽2.5→5.5mm 및 하단3box 보강; 창/축 유지.40k 법선표본 최소2.4mm. JLC 알고리즘의0.5–1.2mm 구간은 독립재현 못함.
- 남은 조치: 표본검사만으로 업체경고 해제하지 않음. M03 제조사 답변 필요.
- 근거: README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`), DFM_RECHECK.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/DFM_RECHECK.md`)

### M09 · 얇은 뚜껑 보의 역할·강도

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 63×18×2.4mm 탄성부 유지. 새 A14 이상적완전접합 FEM 반력5.170/5.109N; 재메싱 실행, 반력차1.18%, 최대응력차13.3%.
- 남은 조치: 실제 접합미끄럼·프린트방향·체결력·접촉압·크리프·피로는 미검증. 얇은 보를 무조건두껍게 바꾸면 누름힘도 바뀜.
- 근거: README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`), fem_summary.json (원본 경로: `../../reviews/a14_recheck_20260921/structure/fem_summary.json`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M10 · 코어 끼움·권선 노출·고정바 접촉

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 앞에서 코어삽입/분리, 고정바후장착, 권선/접합면 비움. bare-core 경로 계산 근거 존재.
- 남은 조치: 실제 코어 편차와 감은선 두께/리드 유연성·권선 눌림·뒤너트 손조작, 양쪽면 동시접촉 확인.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../reviews/a14_document_sync_20260921/independent/README.md`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`), OPEN_CORE_HOLDER_REQUIREMENTS.md (원본 경로: `../../docs/OPEN_CORE_HOLDER_REQUIREMENTS.md`)

### M11 · 닫힘 위치 재현·내구성

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 왼쪽 ㄱ자 수동기준과 외곽 멈춤기둥; 중앙 이음나사 매회풀지 않음; 플라스틱에 반복 나사산 없음.
- 남은 조치: L기준은 자동정렬/전역뒤틀림 보증 아님.20회 개폐·24시간 유지 후 힘/변위/이음부 이동 기록.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M12 · 헤드 PCB 삽입과 SMA/권선 납땜 접근

- 상태: `RESOLVED_PATH_PHYSICAL_PENDING` · 기준: A14/C07 final 93ba7a61
- 확인: 기존30°/1.6mm경로 실패는 과거진단. 현행H05=45°/4mm,362자세 통과; SMA선납땜, 코어안착 후 S±연결, 고정바후장착.
- 남은 조치: 실제 M2뒤너트 및 인두/드라이버 외형·와이어탄성은 초도 확인.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../reviews/a14_document_sync_20260921/independent/README.md`), selected_pcb_path.json (원본 경로: `../../reviews/a14_document_sync_20260921/independent/selected_pcb_path.json`)

### M13 · 헤드PCB/코어 고정바 작은 뒤너트 작업

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: F01–04 실제품번·최대외형선정.45단계H04/H05/H08/H11에 손·뒤공구 미확인 명시.
- 남은 조치: M2 AF3.9 및M3 AF5.5용 실제 보유공구 외형/잡는 순서 확인. 큰7mm소켓검사를 여기에 적용하지 않음.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), HARDWARE_AUDIT.md (원본 경로: `../../reviews/a14_document_sync_20260921/hardware/HARDWARE_AUDIT.md`)

### M14 · 기성 긴 개폐 손나사, 절단 없이 물림 확보

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: F05/F22/F23/F24 스터드70+관통노브+잼너트+PA와셔; topflush, 공칭끝여유6.9.82조립체자세+외부선조립26공구자세근거.
- 남은 조치: 7mm입/Ø12머리/t3 게이지와 실제공구 대조, 반복역회전잠금과와셔침하 확인. 조달은M23.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), README.md (원본 경로: `../../reviews/a14_document_sync_20260921/cad_hardware/README.md`)

### M15 · 앞뒤 클램프 한노브 중심맞춤

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 각각 독립 노브1개로3턱 구동. 공칭Ø6–26. 앞뒤/코어공칭88mm축높이.
- 남은 조치: 실제 Ø6/12/26 시험편 중심오차, 타원케이블 눌림/미끄럼, 노브힘·가이드마찰 확인. 큰케이블범용 자동중심보장 아님.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), current_set_content.py (원본 경로: `../../viewer_A05/current_set_content.py`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M16 · 팔로워 기성품/공구 확정

- 상태: `DOCUMENT_FIXED_SOURCE_PUBLICATION_RECHECK_PENDING` · 기준: A14/C07 final 93ba7a61
- 확인: F12 NBK SBSMS-M4-5-20/2.5육각확정, 최대어깨20.25mm146자세통과. C04에는 구매품·공구미확정 문장이 남음. 감사 통보 후 current_guide_steps.py의 실제 F12 선정 문구 반영을 다시 읽어 확인했다.
- 남은 조치: 생성된45단계와 공개HTML에 수정문구 재생성 확인은 루트 통합 검사. 실제나사산·마찰·손공구 검증은 여전히 초도 확인.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), README.md (원본 경로: `../../reviews/a14_document_sync_20260921/independent/README.md`)

### M17 · 클램프 M6 축 조립·마찰·잠금

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: C04A/B→C05→C06→C07 선행순서, M6×120 노브삽입10mm, 상부잼/하부nyloc역할 분리. 실제SKU삽입 및외접공구경로 계산.
- 남은 조치: 축여유약.2mm 시험목표 맞추고 양방향반복잠금·마찰·백래시 확인.1mm구동너트 여유는과조임으로제거불가.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M18 · 상하 와셔 혼동 및 설치 수량

- 상태: `RESOLVED_SCOPED` · 기준: A14/C07 final 93ba7a61
- 확인: F11/F17 동일Fabory50060.060.001,t1.6,설치합계4.하부nyloc−.8mm; 최종CAD연결455자세기록.
- 남은 조치: actual두께/평면/축여유조절 확인. 과거.8mm하부와셔문서는이력.
- 근거: bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), README.md (원본 경로: `../../reviews/a14_document_sync_20260921/cad_hardware/README.md`)

### M19 · 클램프 사각너트 회전방지/탈락

- 상태: `INTENTIONAL_LIMITATION` · 기준: A14/C07 final 93ba7a61
- 확인: M4 7×7×3.2/M6 10×10×5 선정. 열린포켓; A12탈락방지캡/바닥판은 사용자단순화요청에따라A13부터제거.
- 남은 조치: 완전분해시 너트받치기/트레이보관. 실제모서리/공차·회전stop/삽입감 확인. 캡없음을새누락으로보고안함.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), DECISIONS.md (원본 경로: `../../docs/DECISIONS.md`)

### M20 · 바닥에 모듈 고정/헤드만 탈착

- 상태: `RESOLVED_PATH_PHYSICAL_PENDING` · 기준: A14/C07 final 93ba7a61
- 확인: 3모듈6M4×20 손나사와사각너트. 왼쪽클램프나사는25mm상승후외부X인출. Head PCB를 분해할 필요없음.
- 남은 조치: 바닥을 받친상태 아래너트손접근·안정된지지 확인. 헤드단독시 케이블/동축하중 별도지지 및배치별RF확인.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), current_set_content.py (원본 경로: `../../viewer_A05/current_set_content.py`)

### M21 · 금속이 측정에 방해하지 않도록 배치

- 상태: `PHYSICAL_RF_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 새이음10세트PA66, 열린코어/권선주변PCB M2와keeperM3PA. 바깥개폐/클램프기성금속 사용·거리검토는있음.
- 남은 조치: 거리만으로RF무영향단정불가. 실제체결재질/도전루프/코어픽업/삽입영향·클램프유무실측. 금속나사임의대체금지.
- 근거: README.md (원본 경로: `../../mechanical/assembly_A14_DRAFT/README.md`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), REQUIREMENTS.csv (원본 경로: `../../docs/REQUIREMENTS.csv`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M22 · 출력방향·평면도·홀/누적공차

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: STL는평행이동만수행,조립Y와slicerZ다름.국소홀/턱민감도검사는있으나warp포함안됨.
- 남은 조치: 제조사방향·기준면검토받고입고시나사없이맞춤. 사용자케이블실제굵기와M12/RJ45주변공간도확인.
- 근거: README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`), README.md (원본 경로: `../../reviews/a14_recheck_20260921/independent/README.md`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M23 · 선정품을 설치량에 맞게 실제 구입 가능

- 상태: `OPEN_PROCUREMENT_GATE` · 기준: A14/C07 final 93ba7a61
- 확인: F01–24 모두정확품번기재. F05설치2/포장200,F23설치2/포장500,F09설치2/유통100 경고는BOM에도이미표시.
- 남은 조치: 소량유통·동일품번·대한민국배송·재고·최종금액 확인. 선정=소량구매완료 아님; 범용동등품변경시외형대조.
- 근거: bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), HARDWARE_AUDIT.md (원본 경로: `../../reviews/a14_document_sync_20260921/hardware/HARDWARE_AUDIT.md`)

### M24 · 실제 조임 목표·수치 토크

- 상태: `PHYSICAL_VALIDATION_REQUIRED` · 기준: A14/C07 final 93ba7a61
- 확인: 현행절차는이음안착/멈춤기둥/축여유/외피보호를서로구별. 검증없는숫자토크제시안함.
- 남은 조치: 초도조립에서토크/힘·힘저하/반복후풀림기록. 합격관찰과기록중단조건정의;5.1N FEA를실물합격수치로강제하지않음.
- 근거: steps.json (원본 경로: `../../viewer_A05/guide_sources/steps.json`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`), README.md (원본 경로: `../../reviews/a14_recheck_20260921/structure/README.md`)

### M25 · 현행 보류를 한눈에 보이는 문서 상태로

- 상태: `DOCUMENT_FIXED_SOURCE_PUBLICATION_RECHECK_PENDING` · 기준: A14/C07 final 93ba7a61
- 확인: BOM E03/R08 보류는표시됨. 그러나P01/P02/P05는검토중주석없이제작으로표시,P11–15만검토중. STATUS본문현재단계A0.2, 일부기구요구문서A09/C01/패드/동판이전지시존재. 감사 통보 후 OPEN_DECISIONS/ASSEMBLY_CONSTRAINTS 전문을 현행으로 재작성한 내용 및 STATUS 이력 배너를 다시 읽었다. CURRENT_READINESS 8개 gate의 통합 상태표도 전문 확인했다.
- 남은 조치: 생성BOM의 조달 상태·신규8종 대기표시·공통배너 최종 출력 및 배포 확인은 루트 담당. 역사 원본은 보존.
- 근거: bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`), STATUS.md (원본 경로: `../../docs/STATUS.md`), OPEN_DECISIONS.md (원본 경로: `../../docs/OPEN_DECISIONS.md`), ASSEMBLY_CONSTRAINTS_20260917.md (원본 경로: `../../docs/ASSEMBLY_CONSTRAINTS_20260917.md`)

### M26 · 기록/라벨/조립과 사용범위

- 상태: `OPEN_PROCESS_GATE` · 기준: A14/C07 final 93ba7a61
- 확인: manual에헤드ID/권선극성/리비전/사진/교정ID기록있음. 실제serial/라벨/교정데이터/유효대역없음.
- 남은 조치: 실물제작후개체ID·사진·원시측정/실패기록생성. RF/보호체인미검증을기구완성으로해제하지않음.
- 근거: current_set_content.py (원본 경로: `../../viewer_A05/current_set_content.py`), RF_CURRENT_PROBE_WHITEPAPER.md (원본 경로: `../../docs/RF_CURRENT_PROBE_WHITEPAPER.md`), PHYSICAL_ACCEPTANCE.md (원본 경로: `../../reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md`)

### M27 · 헤드 SMA 핀/홀의 무가공 삽입 적합성

- 상태: `OPEN_INTERFACE_GATE_OTHER_TRACK` · 기준: A14/C07 final 93ba7a61
- 확인: 전기 트랙에서 HeadA03 일반PTH공차와GCT 권장도면 조건 대조 잔여를 확인; CURRENT_READINESS G-PCB에 드러났다. 이 기구감사에서 핀 공차를 새로 측정/해석한 것은 아니다.
- 남은 조치: 전기 트랙에서 완성홀/위치/핀 외형 공차 검증 후 유지 또는 국소 수정. JLC 파일승인=실물 핀 삽입보증 아님.
- 근거: [CURRENT_READINESS.md](https://ckh7488.github.io/showcase/reports/rf-current-probe/bom.html#readiness), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`)

### M28 · F01/F02 M2 나사의 완전물림 공차

- 상태: `OPEN_FASTENER_TOLERANCE_GATE` · 기준: A14/C07 final 93ba7a61
- 확인: 개별제조사도면을이미지로읽어F02=AF3.90±.26/H1.20±.26확인. 최대4.16/H1.46 회전포락+뒤삽입58자세실행간섭0.현행M2×10끝여유공칭.19mm. 같은최대머리M2×12기하후보는앞인출61자세간섭0/끝여유2.19mm.
- 남은 조치: 사출나사길이/불완전끝산/PCB·홀더grip누적공차대조필요. 정확50M020040P012후보는조달담당이제조사PDF35쪽확인했지만미채택. 제품CAD/BOM/업체파일변경안함. 처음제보3.98/H1.62는해당도면과다르므로부족.23mm를실제결함으로사용금지.
- 근거: f02_envelope_sensitivity.json (원본 경로: `../../reviews/full_audit_20260921/f02_envelope_sensitivity.json`), 04M020040HN.PDF (원본 경로: `../../reviews/full_audit_20260921/sources/04M020040HN.PDF`), bom.json (원본 경로: `../../viewer_A05/set_sources/bom.json`)

## 과거 문제와 현재 잔여 구분

- 동판 가공·작은 실리콘 패드·별도 스프링·A12 너트캡/밑판은 현재 구성에 없다. 사용자 단순화 요청으로 제거한 탈락방지 부품을 새 누락이라고 세지 않는다.
- PCB 옛30°/1.6mm 경로, 바닥 왼나사40mm 직선인출, 짧은 상부M4×25, 바닥M4×16, 가상M4×50손나사, .8mm하부와셔는 현행에서 수정됐다.
- `assembly_draft/`는 동기화 전 감사 초안임을 README에서 명시한다. 그 파일의30° PCB/느슨한 바닥을 뒤집는 지시는 현행45단계가 아니다. 현재 사용자 조립은45°/4mm 및 접합부를 받쳐 한곳씩 체결한다.
- A14 FEA는 새로 실행한 이상적 완전접합 참조 모델이다. A13 결과를 A14 나일론 이음부의 크리프·미끄럼 보증으로 재사용하지 않는다.

## 읽은 파일과 범위

본문은 현재 기구 트랙의 지시·상태·근거를 대조했다. 백서 전체RF 본문/과거 모든리비전·대용량FEM원시바이너리를 전부 다시읽었다는 뜻은 아니다. 백서/DECISIONS는 아래 범위를 명시한다. 기존 원시해석은 최종 형상 연결과보고서로 감사했다.

- `docs/OPEN_CORE_HOLDER_REQUIREMENTS.md` — full text
- `docs/CLAMP_SIMPLIFICATION_BRIEF.md` — full text
- `docs/ASSEMBLY_CONSTRAINTS_20260917.md` — full text
- `docs/CABLE_CENTERING_CONCEPT.md` — full text
- `docs/OPEN_DECISIONS.md` — full text
- `docs/REQUIREMENTS.csv` — full text
- `docs/STATUS.md` — full text
- `mechanical/build_assembly_A14.py` — full text
- `mechanical/verify_assembly_A14.py` — full text
- `mechanical/assembly_A14_DRAFT/README.md` — full text
- `mechanical/assembly_A14_DRAFT/catalogue_delta_verification.json` — full text
- `reviews/a14_recheck_20260921/README.md` — full text
- `reviews/a14_recheck_20260921/structure/README.md` — full text
- `reviews/a14_recheck_20260921/PHYSICAL_ACCEPTANCE.md` — full text
- `reviews/a14_recheck_20260921/structure/DFM_RECHECK.md` — full text
- `reviews/a14_recheck_20260921/hardware/HARDWARE_REVIEW.md` — full text
- `reviews/a14_recheck_20260921/independent/README.md` — full text
- `reviews/a14_document_sync_20260921/README.md` — full text
- `reviews/a14_document_sync_20260921/hardware/HARDWARE_AUDIT.md` — full text
- `reviews/a14_document_sync_20260921/independent/README.md` — full text
- `reviews/a14_document_sync_20260921/cad_hardware/README.md` — full text
- `reviews/a14_document_sync_20260921/assembly_draft/README.md` — full text
- `reviews/a14_document_sync_20260921/assembly_draft/AUDIT_TABLE.md` — full text
- `reviews/a14_document_sync_20260921/assembly_draft/ASSEMBLY_SHORT_KO.md` — full text
- `reviews/a14_document_sync_20260921/assembly_draft/PARTS_AND_TOOLS.md` — full text
- `viewer_A05/guide_steps.py` — full text
- `viewer_A05/set_content.py` — full text
- `viewer_A05/current_guide_steps.py` — full text
- `viewer_A05/current_set_content.py` — full text
- `viewer_A05/guide_sources/steps.json` — full text; guide 45 complete action/hold/tool/check/note/proof/path fields; BOM58 complete rows
- `viewer_A05/set_sources/bom.json` — full text; guide 45 complete action/hold/tool/check/note/proof/path fields; BOM58 complete rows
- `viewer_A05/set_sources/README.md` — full text
- `procurement/jlc_refresh_20260921/README.md` — full text
- `reviews/a14_document_sync_20260921/jlc_observed_status.json` — full text
- `reviews/split_print_20260919/publication.json` — full text
- `reviews/split_print_20260919/atlas_export.json` — full text
- `mechanical/assembly_A14_DRAFT/verification.json` — full text
- `reviews/a14_document_sync_20260921/independent/current_evidence.json` — full text
- `viewer_A05/set_sources/current_verification.json` — full text
- `docs/DECISIONS.md` — lines399-end: current mechanical revisions through latest2026-09-21; earlier decisions not represented as reread
- `docs/RF_CURRENT_PROBE_WHITEPAPER.md` — lines1-90,122-174,196-226,280-381,489-573,681-826; mechanical/interface/safety/gates/acceptance sections, not a claim of entire RF text reread
- `mechanical/assembly_A14_DRAFT/build_report.json` — all top-level fields and all15 part records programmatically assessed; no geometry regeneration
- `viewer_A05/set_sources/bom_cad_check.json` — all44 row counts programmatically crosschecked; existing stored geometry audit, not rerun
- `viewer_A05/current_set_content.py::MANUAL` — effective imported MANUAL full rendered text read, including inherited content
- `docs/CURRENT_READINESS.md` — full updated text,8 gates; read after root integration
- `reviews/full_audit_20260921/sources/04M020040HN.PDF` — single page image directly viewed;3.90+/-.26,1.20+/-.26,uncontrolled/date blank

읽은 파일의 SHA256,45단계별 읽은 필드,24체결행별 품번·수량·잔여조건,15제출물별 해시는 JSON에 있다. 문서가 감사 도중 갱신된 항목은 위의 재확인 기록을 따른다. 제품 CAD·STL·발주·Site는 이 작업에서 편집하지 않았다.
