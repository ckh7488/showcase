# PortA openEMS 작업 이어가기

이 폴더는 다른 컴퓨터에서 **모델과 원본 결과를 그대로 받아 검토·수정·재계산**하기 위한 자료입니다. 웹 결과서와 별도로 Git 저장소에 포함합니다.

## 먼저 확인할 파일

- [HANDOFF.md](HANDOFF.md): 현재 결론, 남은 계산과 다음 작업
- [manifest.json](manifest.json): 완료 실행별 ZIP, 내부 파일 목록, SHA-256, 아직 보관되지 않은 실행
- [environment.json](environment.json): 실제 사용한 Python·openEMS·CSXCAD 버전과 설치 자료
- [TEST 02 결과서](../../reports/porta-test-02/index.html): 조건·관측점별 그래프와 3D
- [TEST 02 최종 판단](../../reports/porta-test-02/records/mesh-20/screening-verdict.json): 시간·단면 격자를 확인하고 채택한 범위
- [원래 TEST 01 최종 검토](../../reports/porta-test-01/records/connected-10/screening-verdict.json): 확장 토폴로지 작업 이전의 네 조건 검토

`manifest.json`의 `allRequestedCalculationsArchived`가 `false`이면 아직 계산 중이거나 추가될 자료가 있습니다. 완료 계산의 보관 여부와 과학적 판단의 완료 여부는 별개입니다.

## 내려받은 자료 확인과 복원

아래 명령은 저장소 최상위에서 실행합니다. 검증·압축 해제는 Python 표준 라이브러리만 사용합니다.

```sh
python scripts/porta_emc/restore_runs.py
python scripts/porta_emc/restore_runs.py --case connected/test02-near-long --out work/near-long
```

첫 명령은 모든 ZIP과 내부 파일의 체크섬을 확인합니다. 두 번째 명령은 검증 후 선택한 실행을 새 폴더에 풉니다. 기존 폴더를 덮어쓰지 않습니다. `--case`에는 목록의 정확한 `id`를 사용합니다.

최종 커밋을 새로 내려받은 뒤 아래 명령으로 보관 자료와 대표 결과를 함께 확인할 수 있습니다. `--expected-commit`에는 실제 내려받은 전체 커밋 ID, `--out`에는 저장소 밖의 새 폴더를 넣습니다.

```sh
python scripts/porta_emc/verify_replica.py --expected-commit COMMIT_ID --out ../porta-restore-check --install /path/to/openEMS
```

이 검사는 모든 ZIP과 내부 파일을 대조하고 TEST 00·01·02 및 마지막 토폴로지 모델을 실제 바인딩으로 읽습니다. 복원한 TEST 02 원본에서 10·100·175·200 MHz의 대표 기록을 독립적으로 다시 계산해 결과서와 비교합니다. 새 필드 계산은 하지 않습니다. 바인딩 설치 전에는 `--skip-native`로 숫자·파일 검사만 수행할 수 있으며, 이 경우 기록에도 모델 로딩을 생략했다고 명시합니다.

ZIP에는 다음 자료가 포함됩니다.

- `case/geometry.xml`, `input.json`, `mesh.json`, 케이블의 `model.json`: 실제 계산 형상·물성·격자·입력·종단
- `case/port_ut_*`, `port_it_*`, `cm_*`, 해당 조건의 `shield_current_*`: 저장된 원본 전압·전류 파형
- `case/response.json`, `response.npz`, `solver.log`: 복소 결과와 실행 기록
- 당시 실행에 사용한 소스 파일, 연결 검증 자료와 라이선스
- TEST 02의 `preparation/`: 입력 포트·실드 접속을 만든 원본 준비 자료와 양끝 검증
- `inputs/cable-spec.json`: 도면에서 확인한 치수·배선 및 명시된 가정

전체 공간의 E/H 필드나 중간 시점에서 FDTD 계산을 재개하는 체크포인트는 저장한 적이 없습니다. 기존 결과 재분석은 즉시 가능하며, 형상을 바꾸는 새 계산은 처음부터 실행합니다. 원본 도면 PDF와 설치 프로그램은 실행별 ZIP에 포함하지 않습니다. 모델에 사용한 수치와 출처·설치 버전은 함께 보존합니다.

## 다른 컴퓨터에서 모델 열기

원본은 Windows x64 / Python 3.10 / openEMS 0.0.36 / CSXCAD 0.6.3에서 계산했습니다. [환경 기록](environment.json)의 같은 버전과 해당 Python 바인딩을 준비합니다. 다른 운영체제의 설치는 그 환경에서 별도로 확인해야 합니다.

```sh
python scripts/porta_emc/replay_geometry.py --case work/near-long/case --install /path/to/openEMS
```

이 명령은 XML을 실제 CSXCAD/openEMS로 읽고 격자와 FDTD 설정을 구성합니다. 새 필드 계산을 시작하지 않습니다. Windows에서는 `--install`에 그 컴퓨터의 설치 폴더를 지정합니다. Python 패키지가 이미 설치 위치를 찾는 환경이면 해당 옵션을 생략할 수 있습니다.

원본 형상의 필드를 다시 계산하려면 새 출력 위치와 `--run`을 추가합니다.

```sh
python scripts/porta_emc/replay_geometry.py --case work/near-long/case --install /path/to/openEMS --run --out work/replayed-near-long --threads 4
```

이 도구는 원본 형상에서 **새 파형**을 생성합니다. 기존 복소 응답이나 최종 판단을 덮어쓰지 않으며, 후처리는 해당 시험의 정의를 적용해야 합니다. TEST 02는 보관된 실행 스크립트로 같은 후처리까지 수행할 수도 있습니다.

```sh
python work/near-long/case/run_common_mode.py --prepared work/near-long/case --out work/recomputed-near-long --install /path/to/openEMS --threads 4
```

배선·피치·종단 등을 바꾸려면 복원한 입력의 복사본 또는 보관한 형상 생성 스크립트를 수정하고 새로운 폴더에 계산합니다. 원본 ZIP은 그대로 둡니다. 기존 작업 관리 스크립트의 PID나 대기 상태를 새 컴퓨터에서 재사용하지 않습니다.

## 결과를 읽는 기준

TEST 01의 전원 차동 입력과 TEST 02의 평균 입력은 다릅니다. TEST 02의 실제 평균 입력은 `(V7+V8)/2`, 잡음원 환산 기준은 `[(V7+50 I7)+(V8+50 I8)]/2`입니다. 전원 부하 때문에 평균 입력이 작아지는 주파수에서 두 기준의 전달비가 크게 달라질 수 있습니다.

8·10·12 ns 등의 창은 실제 파형을 그 시각까지 사용한 별도 DFT입니다. 25 ns 완료 실행의 상세 비교는 12·16·20·24 ns입니다. 저장되지 않은 주파수나 시간을 보간해 실제 계산처럼 표시하지 않습니다. 본 단계는 120 mm 시험 형상이며 실제 20 m 링크·트랜스·PHY 또는 CRC 발생을 직접 계산한 것이 아닙니다.

## 리모트 반영을 마치는 기준

진행 중인 계산과 검토가 끝나면 목록을 다시 생성하고 미완료 항목을 확인합니다. 관련 결과서·소스·이 폴더를 함께 커밋하고 리모트에 올립니다. 이어서 **리모트의 해당 커밋을 별도 위치에 내려받아** 체크섬 검증, 모델 로딩과 대표 결과 재분석을 수행합니다. 로컬에서만 확인한 것을 리모트 복원 확인으로 표시하지 않습니다.

Git 브랜치 업로드와 웹사이트 배포는 별도입니다. 전달 시 저장소·브랜치·커밋을 명시하며, 웹사이트를 배포한 경우에는 배포 작업과 실제 주소도 확인합니다.
