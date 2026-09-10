# Showcase · 인터랙티브 보고서 모음

**[보고서 목록 열기](https://ckh7488.github.io/showcase/)** · [PALA720 보고서 바로 열기](https://ckh7488.github.io/showcase/reports/porta-pcb/)

HTML 보고서를 모아 두는 사이트입니다. 제목이나 썸네일을 누르면 보고서가 바로 열리고, 보고서 안의 Three.js 모델·차트·입력 기능이 그대로 동작합니다. 새 보고서는 폴더와 목록 항목만 추가하면 됩니다.

**HTML을 선택한 가장 큰 이유는 인터랙션입니다.** 모델을 돌려 보고, 결과를 선택하고, 조건을 바꾸며 이해할 수 있는 보고서를 만듭니다. 모든 문서는 랜딩페이지와 이어지는 차분한 문서형 톤을 사용합니다.

**[공통 디자인·인터랙션 규칙 → DESIGN.md](DESIGN.md)** — 다른 AI도 보고서를 만들기 전에 이 규칙을 읽습니다. 밝은 회색/흰색 바탕, 짙은 글자, 청록색 강조와 공통 글꼴·여백을 사용하며, `assets/theme.v1.css`를 연결합니다.

## 새 보고서 추가하기

1. `reports/<고유한-이름>/`에 완성된 보고서를 넣습니다. 시작 파일은 `index.html`입니다.
2. 보고서가 사용하는 CSS, JavaScript, 이미지, 3D 모델, 데이터, 글꼴도 같은 보고서 폴더 안에 넣습니다.
3. 실제 보고서 화면을 보여주는 썸네일을 `cover.png` 또는 `cover.webp`로 저장합니다.
4. 루트 `reports.json`의 `reports` 배열에 아래 형식으로 항목을 추가합니다. 배열 순서가 화면 순서입니다.
5. 검증과 브라우저 확인 후 커밋·푸시합니다. `main`에 반영되면 GitHub Actions가 검사하고 Pages에 배포합니다.

```json
{
  "id": "new-report",
  "title": "보고서 제목",
  "summary": "어떤 대상을 다루고 무엇을 확인할 수 있는지 한두 문장.",
  "category": "하드웨어 · 통신",
  "date": "2026-09-10",
  "path": "reports/new-report/",
  "cover": "reports/new-report/cover.png",
  "coverAlt": "썸네일 화면에 나타난 내용을 설명하는 문장",
  "tags": ["3D", "시뮬레이션"]
}
```

`id`는 중복되지 않는 영문 소문자·숫자·하이픈 이름입니다. 폴더 이름과 같아야 합니다. 날짜는 보고서 작성/갱신일이며 `YYYY-MM-DD` 형식입니다. 모든 필드는 필수이며 태그가 없으면 `[]`를 씁니다. 새 카드 추가를 위해 `index.html`이나 `assets/catalog.js`를 수정할 필요는 없습니다.

## 보고서 규칙

- **직접 열리는 HTML:** 클릭 후 별도 설치나 실행 명령 없이 보고서가 열려야 합니다. 서버가 필요한 앱은 정적 배포본을 먼저 만듭니다. 이 사이트에는 Python/Node 백엔드가 없습니다.
- **인터랙션 보존:** 3D 회전·확대, 차트 선택, 슬라이더 등 원래 기능을 유지합니다. HTML을 스크린샷이나 PDF 한 장으로 대체하지 않습니다.
- **폴더 안에 완결:** 공통 스타일 `../../assets/theme.v1.css`를 제외하면 다른 보고서나 로컬 작업 폴더에 의존하지 않습니다. 사용하는 버전의 라이브러리와 라이선스를 함께 보관합니다. 임의 CDN 최신 버전으로 바꾸지 않습니다.
- **상대 경로:** `./viewer.js`, `assets/model.glb`처럼 씁니다. `/assets/...`는 GitHub Pages의 `/showcase/` 경로를 벗어나므로 피합니다. 파일명 대소문자도 정확히 맞춥니다.
- **목록 복귀:** 보고서 상단에 `<a href="../../">← 보고서 목록</a>`를 둡니다. 새 탭을 강제하지 않아 브라우저 뒤로 가기도 자연스럽게 동작하게 합니다.
- **가독성:** 제목·목적·핵심 시각화·결과를 먼저 보여주고, 상세 가정과 출처는 접을 수 있게 구성합니다. 휴대폰에서도 페이지 전체가 가로로 넘치지 않게 합니다.
- **근거 보존:** 시뮬레이션과 실측, 가정과 확정값, 단위·조건·출처를 구분합니다. 한 주파수의 계산값을 전 대역 합격으로 바꾸지 않습니다.
- **게시 범위:** 해당 보고서와 필요한 자료만 올립니다. 비밀 키, 사용자 PC 경로, 원본 설계 전체, 관계없는 문서, 대형 solver 실행 폴더를 무작정 복사하지 않습니다. 이 저장소와 Pages는 공개되어 있습니다.
- **주소 유지:** 게시한 폴더 이름은 그대로 유지합니다. 기존 보고서를 새 보고서로 덮어쓰지 않습니다.

## 로컬 확인

Python 3.10 이상, 추가 패키지 없이 실행할 수 있습니다.

```sh
python scripts/validate.py
python -m http.server 8000
```

`http://localhost:8000/`에서 확인합니다. 파일을 더블클릭한 `file://` 방식은 목록 JSON이나 모델 불러오기를 막을 수 있습니다.

- 카드의 제목/이미지를 클릭해 보고서가 열리는지 확인
- 3D 회전·확대, 구간 전환, 슬라이더 등 실제 기능 확인
- 상세 출처 링크와 이미지/모델 요청에 404가 없는지 확인
- 휴대폰 너비와 큰 화면 모두 확인
- 목록으로 돌아오기 및 직접 보고서 URL 접속 확인

검사기는 등록 항목, 중복 이름, 날짜, 파일 존재, HTML/CSS 상대 링크, 대소문자, 큰 파일을 확인합니다. **JavaScript 실행·동적으로 불러오는 파일·외부 링크의 응답·수치 분석의 타당성은 브라우저/내용 검토로 별도 확인해야 합니다.**

## 배포

### FreeBSD · Bastille jail

**[처음 설치와 갱신 방법](deploy/freebsd/README.md)**

로컬에서 보고서를 수정해 `push`한 뒤, jail 안에서 `showcase-update` 한 번 실행하면 최신 보고서와 목록을 반영합니다. 별도 폴더에서 검사·빌드한 후 웹 루트를 교체하므로 실패하면 기존 사이트가 유지됩니다. 상태 확인과 이전 버전 복구도 지원합니다.

```sh
# 처음 설치 후, Bastille 호스트에서 실행
bastille cmd JAIL_NAME /usr/local/bin/showcase-update
```

### GitHub Pages

`.github/workflows/pages.yml`이 `main` 푸시 때 검증 → 정적 파일 묶기 → GitHub Pages 배포를 실행합니다. PR에서는 검증만 합니다. 검증에 실패하면 새 배포를 진행하지 않습니다.

처음 설정할 때 저장소 **Settings → Pages → Source: GitHub Actions**를 선택합니다. 이후에는 보고서 추가와 푸시만 하면 됩니다. 배포 상태는 **Actions → Validate and publish reports**에서 확인합니다.

`python scripts/build.py`는 배포할 파일만 `_site/`에 복사합니다. 기존 `_site/`가 없는 깨끗한 체크아웃에서 실행합니다. README·스크립트·개발 의존성은 사이트 배포 묶음에 포함하지 않습니다.

참고: [GitHub Pages 공식 문서](https://docs.github.com/en/pages) · [GitHub 공식 정적 사이트 배포 워크플로](https://github.com/actions/starter-workflows/blob/main/pages/static.yml)

## 구조

```text
index.html                 # 보고서 목록 화면
reports.json               # 카드 등록부: 새 보고서마다 한 항목
assets/                    # 목록 화면·공통 문서 테마
reports/
  porta-pcb/
    index.html             # 이번 통합 보고서
    assembly.html          # 전체 기구 3D
    viewer.js              # PCB 3D
    cover.png
    vendor/                # 이 보고서가 사용하는 라이브러리
    records/               # 상세 해석 기록의 정적 스냅샷
scripts/                   # 검증·배포 파일 묶기
deploy/freebsd/             # jail용 갱신 도구·Nginx 설정·설치 안내
.github/workflows/         # 자동 검증·배포
```

## 다른 AI에게 전달할 요청 예시

> 이 저장소의 AGENTS.md, README.md, DESIGN.md를 읽고, HTML 보고서를 reports/새이름/에 추가해 줘. 공통 테마를 연결해 기존 문서와 톤을 맞추고, 핵심 구조·비교를 직접 조작할 수 있게 만들어 줘. reports.json에 카드 한 개를 등록하고, 수치의 근거를 유지하면서 로컬 검증과 브라우저 테스트 후 배포해 줘. 배포 완료와 실제 URL 동작까지 확인해 줘.
