# VNA 케이블 지그 · SMA↔Ethernet

공통 발룬 B-SMA1과 현행 RJ45–M12/Molex 어댑터를 연결·조립·측정할 때 보는 문서다. 기존 `balun-routing`의 배선/EM 비교와 별개로 시스템 구성을 설명한다.

## 상호작용

- 양끝의 접속 종류와 A/B 페어를 선택하면 연결 순서, 지그 커넥터 핀맵과 설치 BOM이 바뀐다.
- PCB 4종, 신호층, 페어 강조, 핀 번호, DUT 단자 확대/전체 보기를 제공한다. `boards.json/js`는 native KiCad의 선로·패드 중심에서 추출했다. 내부 plane, 실제 pad 외형·커넥터 몸체, 3D 체결 공간과 RF 결과를 나타내지 않는다.
- 측정 4단계의 연결·저장 파일을 선택해 읽는다. BOM CSV는 선택 구성의 설치량과 날짜가 있는 구매 기록을 구분한다.

## 보드별 BOM과 에이전트용 데이터

`bom.json`이 보드 1장당 기본 실장 수량의 원본이다. `modules`의 고정 ID는 `common`(공통 발룬), `llc`(M12 LLC 수 어댑터), `m12`(M12 슬립링 암 어댑터), `molex`다. M12 암/수를 하나의 M12 품목으로 합치지 않는다.

- `modules[].lines[]`: `part_id`, `refs`, 정수 `quantity_per_board`. `parts[part_id]`에서 제조사/MPN/단위/PCB 리비전을 읽는다.
- 각 모듈의 장수와 `quantity_per_board`를 곱하고 같은 `part_id`만 합산한다. 예: 공통 2장+LLC 1장+Molex 1장 → ADT2-1T+ 8개, Samtec SMA 8개, RJ45 4개, LLC/Molex 커넥터 각각 1개, 해당 PCB 2/1/1장.
- `assembly_conditions`의 기본 DNP·RSH1 납땜 브리지·TP 도금 홀은 구매 부품 합계에 넣지 않는다. RSH1은 기준 Port 1/2 보드의 역할에 따라 다르다.
- `shared_measurement`는 한 활성 측정 구성의 외부 준비물이며 보드 제작 장수에 곱하지 않는다. `unresolved.quantity=null`은 미확정이며 0개라는 뜻이 아니다.
- 이 수량은 실장 필요량이다. 예비/포장/재고 차감과 이전 구매량은 별도다. LLC 회수품도 실장 필요량 1개를 유지하고 실제 보유량 확인 뒤 조달량을 정한다.

HTML의 `#bom-common`, `#bom-llc`, `#bom-m12`, `#bom-molex` 표는 JavaScript 없이도 읽을 수 있다. `bom-per-board.csv`는 4종의 13행을 모은 표이며 `bom-common.csv` 등은 각각 1장 기준이다. 화면의 제작 장수 합산 결과는 CSV와 JSON으로 내려받을 수 있다. 제작 장수 입력은 위의 실제 양끝 측정 구성과 독립적이며, ‘위 측정 구성의 장수 가져오기’로 맞출 수 있다.

ATLAS 루트에서 `python scripts/build_fixture_bom.py`로 JSON에서 HTML 표·CSV·JS를 다시 생성한다. 관련 원문 해시와 공통 native BOM의 기본 실장량을 대조한 뒤 생성한다. 부품이 바뀌면 근거 원문과 실제 CAD부터 재검토하고 `sources.json`을 갱신한다.

## 근거와 한계

`sources.json`은 검토한 파일들의 상대 경로·SHA-256이다. 현행 PCB 4개는 기존 검토 해시와 일치했고 어댑터 J2 핀맵을 native pad net으로 다시 확인했다. 50 Ω 로드 6개 필요와 통합 구매 7개, 공통 보드 2장 실장과 bare PCB 5장 기록을 구분한다. 표준·기구의 미확정 상태를 수량 0이나 완성 세트로 표시하지 않는다.

실물 RF 검증·제조 승인·자동 통신 합격 판정·TDR 위치 분석은 이 문서 작업의 결과가 아니다. 과거 구매 상태나 가격을 현재 상태로 재발행하지 않는다. 개인 경로·공유 카트·주문 링크·인보이스를 공개 자산으로 복사하지 않았다.

원본 추출 도구와 내부 브라우저 점검은 상위 작업 폴더의 `outputs/ethernet-atlas-20260923`에 보관한다. 데이터 재생성 시 4개 PCB의 해시 변경을 자동 승인하지 말고 현행 문서·핀맵·검토 기록부터 대조한다.

ATLAS 루트에서 `python scripts/validate.py` 후 HTTP로 목록 → 새 보고서 → 복귀, 구성/페어/PCB/층/확대/측정 전환, CSV 내려받기 및 390/320 px 화면을 확인한다. 출판하려면 별도로 배포 결과와 실제 URL을 확인한다.
