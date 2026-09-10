# FreeBSD · Bastille에서 보고서 제공하기

```text
로컬에서 보고서 수정 → git commit / push
                            ↓
jail에서 showcase-update → Git의 main 가져오기 → 검사·빌드 → 웹 루트 교체
```

보고서는 정적 파일이라 GitHub Pages와 jail에서 동일하게 동작합니다. 3D와 차트는 방문자의 브라우저에서 실행됩니다. Jail은 Nginx로 파일만 제공합니다. Python과 Git은 갱신할 때만 사용합니다.

## 처음 한 번: jail 안에서 설치

아래 명령은 **이미 생성해 실행 중인 전용 보고서 jail 안에서 root로** 실행합니다. 호스트에서는 `bastille console JAIL_NAME`으로 들어갈 수 있습니다. 이 예제는 내부 포트 **8080**, 웹 루트 **/usr/local/www/showcase/current**를 사용합니다.

```sh
pkg install -y git python3 nginx ca_root_nss
git clone https://github.com/ckh7488/showcase.git /opt/showcase
sh /opt/showcase/deploy/freebsd/update.sh
```

업데이트용 짧은 명령을 설치합니다.

```sh
cat > /usr/local/bin/showcase-update <<'SH'
#!/bin/sh
exec sh /opt/showcase/deploy/freebsd/update.sh "$@"
SH
chmod 755 /usr/local/bin/showcase-update
```

**전용 jail의 새 Nginx 설정:** 기존 설정 파일이 있으면 먼저 복사해 둡니다. 기존 웹사이트가 운영 중인 jail은 이 파일로 전체 설정을 덮어쓰지 말고, `nginx.conf`의 `server { ... }` 부분만 기존 `http { ... }` 안에 추가합니다. 포트 8080의 다른 서비스와 겹치지 않게 설정합니다.

```sh
cp -p /usr/local/etc/nginx/nginx.conf /usr/local/etc/nginx/nginx.conf.before-showcase
cp /opt/showcase/deploy/freebsd/nginx.conf /usr/local/etc/nginx/nginx.conf
nginx -t
sysrc nginx_enable=YES
service nginx start
fetch -o /dev/null http://127.0.0.1:8080/
```

Nginx가 이미 실행 중이었다면 `start` 대신 `service nginx reload`를 사용합니다. `nginx -t`가 성공한 뒤 시작/재적용합니다. Python 3.10 이상이 필요합니다.

## 그다음부터: 명령 하나

먼저 로컬 수정본을 GitHub에 **push**합니다. 로컬 커밋만 한 내용은 jail에서 받을 수 없습니다.

**Jail 안에서:**

```sh
showcase-update
```

**Bastille 호스트에서:** (`JAIL_NAME`은 실제 jail 이름으로 변경)

```sh
bastille cmd JAIL_NAME /usr/local/bin/showcase-update
```

접속 주소는 `http://JAIL_IP:8080/`입니다. 보고서는 `/reports/porta-pcb/`처럼 바로 접속할 수도 있습니다. 새 보고서 카드는 `reports.json`에서 자동으로 만들어집니다.

별도 Nginx 재시작은 필요 없습니다. 명령은 **GitHub Actions 완료를 기다리지 않고 Git 원본을 직접 가져와 같은 검증·빌드를 실행**합니다. GitHub Pages 배포와 독립적으로 동작합니다.

## 접근 경로

- **VNET jail에 직접 접속 가능한 경우:** jail IP의 8080 포트로 접속합니다.
- **Bastille의 NAT/루프백 jail인 경우:** 호스트의 포트를 연결합니다. 예: 호스트에서 `bastille rdr JAIL_NAME tcp 8080 8080`.
- **기존 리버스 프록시가 있는 경우:** 프록시 목적지를 `http://JAIL_IP:8080`으로 설정합니다. 해당 도메인의 `/`로 연결하는 구성이 가장 간단합니다.

도메인, TLS, 방화벽, 호스트 포트 선택은 현재 jail 네트워크에 맞춥니다. 설치 스크립트는 이 설정을 임의로 변경하지 않습니다. 기존 프록시에서 긴 캐시 시간을 강제로 적용했다면 새 보고서를 즉시 볼 수 있도록 해당 규칙도 조정합니다.

## 실패 시 동작과 복구

- 새 내용을 별도 임시 폴더에서 내려받고 검사·빌드합니다.
- Git 오류, 링크 누락, 빌드 실패가 발생하면 기존 `current`는 유지되고 명령이 실패 코드로 종료됩니다.
- 성공한 파일을 새 `releases/` 폴더에 넣은 다음 `current` 심볼릭 링크를 원자적으로 교체합니다. 파일을 서비스 폴더에 하나씩 덮어쓰지 않습니다.
- 동시에 두 번 실행하면 두 번째 실행은 중단됩니다. 프로세스가 종료되면 OS가 잠금을 해제합니다.
- 같은 커밋이면 사이트를 다시 교체하지 않습니다.
- 이전 릴리스는 자동 삭제하지 않습니다. 누적 용량은 `du -sh /usr/local/www/showcase/releases`로 확인할 수 있습니다.

```sh
showcase-update --status
showcase-update --rollback
```

`--rollback`은 현재/이전 릴리스를 맞바꿉니다. 이후 일반 업데이트를 실행하면 다시 Git의 최신 커밋으로 올라갑니다. 롤백 명령도 호스트에서 `bastille cmd JAIL_NAME /usr/local/bin/showcase-update --rollback`처럼 실행합니다.

교체 시 이미 열려 있던 브라우저 탭이 여러 파일을 요청하면 업데이트 전후 파일이 섞일 수 있습니다. 큰 보고서 변경 후에는 페이지를 새로고침합니다. 이 배포 검사는 링크·파일 구성을 확인하며, 3D 기능이나 분석 내용의 타당성은 로컬 브라우저에서 먼저 확인합니다.

## 경로·브랜치 변경

```sh
showcase-update --root /usr/local/www/another-showcase --branch main
```

`--root`를 바꾸면 Nginx의 `root`도 그 경로의 `current`로 맞춥니다. 평소 사용하는 옵션은 `/usr/local/bin/showcase-update`의 `exec` 줄에 고정해 두면 됩니다. 이 배포 디렉터리는 이 도구 전용으로 사용합니다. Nginx 작업자도 상위 디렉터리를 통과하고 정적 파일을 읽을 수 있어야 합니다.

`/opt/showcase`는 업데이트 도구의 원본이고, 실제 웹 콘텐츠는 매번 별도 Git 스냅샷에서 빌드됩니다. **보고서를 갱신할 때 `/opt/showcase`에서 git pull 할 필요는 없습니다.** 배포 도구 자체가 개선됐을 때만 다음 명령으로 갱신합니다.

```sh
git -C /opt/showcase pull --ff-only
```

## 다른 AI가 보고서를 추가할 때

루트 README의 `reports/<slug>/` + `reports.json` 규칙을 따르면 GitHub Pages와 jail 양쪽에서 사용할 수 있습니다. Node 백엔드나 특정 PC 경로를 요구하는 보고서를 올리지 않습니다. 기존 보고서 폴더와 공개 URL을 유지합니다.

참고: [Bastille cmd](https://docs.bastillebsd.org/en/latest/chapters/subcommands/cmd.html), [Bastille 포트 연결](https://bastillebsd.org/blog/2021/01/13/bastille-port-redirection-and-persistence/), [Nginx root·파일 캐시](https://nginx.org/en/docs/http/ngx_http_core_module.html), [FreeBSD Python 3 포트](https://cgit.freebsd.org/ports/tree/lang/python3/Makefile)
