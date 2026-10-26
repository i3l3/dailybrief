# Apps Script 전체 기능 대시보드 + Dokploy

실제 뉴스·메일·날씨·급식·시세를 로그인 없이 공개하는 버전입니다. 원본 React 화면을 번들링해 Apps Script에서 실행하고, 기존 DailyBrief 서버·PostgreSQL·워커를 재사용합니다. 스프레드시트는 필요 없습니다. 사용자의 요청에 따라 로그인과 조회 전용 제한을 제거했습니다. 접속자는 실제 메일 조회, 설정 변경, 계정 추가·삭제, 유료 AI 요약, 갱신, 읽음·저장 등 원본 기능을 사용할 수 있으며 결과는 실제 DB에 반영됩니다.

이 폴더는 이제 Git에 포함됩니다. 비밀 설정 `.env*`(예제 제외), `.clasp.json`과 개인 미리보기 이미지는 계속 제외됩니다. 실제 키·DB·메일은 저장소에 포함하지 않습니다.

## 1. Dokploy 환경변수

기존 Compose 앱의 Environment에 기존 값을 유지하면서 아래 두 값을 추가하세요.

```dotenv
BRIDGE_TOKEN=직접생성한64자리임의문자열
BRIDGE_PUBLIC_URL=https://bridge.example.com
```

토큰은 로컬에서 아래 명령으로 생성합니다. 기존 `MASTER_KEY`를 재사용하거나 변경하지 마세요.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`BRIDGE_PUBLIC_URL`에는 다음 단계에서 브리지에 연결할 실제 HTTPS 도메인을 넣습니다. 주소 끝에 경로·쿼리를 넣지 않습니다. `APP_URL`, `POSTGRES_PASSWORD`, `MASTER_KEY`, Google OAuth 설정 등 기존 값은 그대로 유지합니다.

## 2. Compose 재배포와 도메인

Git 저장소의 최신 main을 받아 `compose.yaml`로 재배포합니다. 이제 `db`, `migrate`, `web`, `worker`, `bridge`가 함께 생성됩니다. 별도 파일 복사나 수동 브리지 실행은 필요 없습니다.

Dokploy Compose 앱의 Domains에서 도메인을 추가합니다.

| 항목 | 값 |
|---|---|
| Host | BRIDGE_PUBLIC_URL의 호스트, 예: bridge.example.com |
| Service | bridge |
| Container Port | 8787 |
| Path | / |
| HTTPS | 활성화, 유효한 인증서 |

DNS를 서버로 연결하고 도메인 변경 후 다시 배포하세요. Dokploy의 Isolated Deployments를 사용해 관련 서비스가 동일한 앱 네트워크에서 서로 접근하도록 구성합니다. Preview Compose에서 `bridge`가 `web`과 `db`에 접근할 수 있는 네트워크를 공유하는지 확인하세요. 도메인은 개인용 로그인 없는 `web:3000` 대신 **인증된 `bridge:8787`**에 연결합니다. bridge는 호스트 포트를 직접 공개하지 않고 컨테이너 네트워크의 8787만 expose합니다.

`https://bridge.example.com/bridge/health`가 `{"ok":true}`를 반환하면 브리지 프로세스가 실행 중입니다. 이 확인은 데이터베이스와 전체 연동 성공을 보장하지는 않습니다. 토큰 없이 `/api/dashboard`에 접근하면 401이어야 합니다.

공식 문서: https://docs.dokploy.com/docs/core/docker-compose/domains

## 3. Apps Script 파일과 속성

`dist/`의 다음 5개 파일을 Apps Script 편집기에 넣습니다.

- Code.gs
- Index.html (편집기의 HTML 파일 이름: Index)
- Styles.html (이름: Styles)
- Bundle.html (이름: Bundle)
- appsscript.json (프로젝트 설정에서 매니페스트 표시 후 내용 교체)

`source-manifest.json`은 빌드 기록이며 업로드하지 않습니다.

프로젝트 설정 → 스크립트 속성에서 아래 값을 추가합니다.

| 속성 | 값 |
|---|---|
| BRIDGE_URL | Dokploy의 BRIDGE_PUBLIC_URL과 동일 |
| BRIDGE_TOKEN | Dokploy의 BRIDGE_TOKEN과 동일 |

공개 접속에 OWNER_EMAIL은 필요 없습니다. 토큰은 HTML에 넣지 않습니다. Apps Script 서버에서만 사용합니다.

웹 앱 **새 버전**을 배포하면서 실행 사용자 **나**, 액세스 **모든 사용자(익명 포함)**를 선택합니다. 기존 배포는 매니페스트 변경만으로 권한이 바뀌지 않습니다. Workspace 조직 정책에 따라 익명 배포가 제한될 수 있습니다. 개인 소유자에게 최초 권한 승인이 필요한 것은 정상이며 공개 방문자에게는 Google 로그인을 요구하지 않는 설정입니다.

공개 URL의 `/exec`로 접속합니다. `/exec?page=demo`는 원본 가상 데이터, `/exec?view=mail`은 메일 뷰로 시작합니다. 실제 UI는 iframe 안에서 hash 라우팅을 사용합니다.

## 기능과 연결

원본 화면·테마·레이아웃·필터·더 보기·중식/석식 선택을 그대로 번들링합니다. 실제 수집·IMAP·NVD·OpenAI/OpenRouter·KIS는 기존 서버에서 계속 동작합니다. 요약하기는 실제 AI 대기열에 등록됩니다. 방문 기록·읽음·저장은 원본 앱과 동일한 DB에 반영됩니다. 원본에 없는 토스증권 연동 등의 기능을 추가한 것은 아닙니다.

Gmail·IMAP 계정과 API 키는 Apps Script의 설정 화면에서도 관리합니다. Gmail OAuth를 사용하려면 `GAS_WEB_APP_URL`에 실제 `/exec` 주소를 설정하고 OAuth 클라이언트에 `BRIDGE_PUBLIC_URL/bridge/oauth/callback`을 추가합니다. 기존에 연결된 계정 조회에는 이 OAuth 설정 변경이 필요하지 않습니다. 새 Gmail 연결에는 정확한 GAS_WEB_APP_URL과 리디렉션 URI가 필요합니다.

## 로컬 빌드·검증

```powershell
npm ci
node apps-script/build.mjs
node --import tsx --test apps-script/tests/bridge.test.ts
npm run typecheck
```

원본 UI가 바뀌면 빌드 후 dist 파일을 Apps Script에 다시 넣고 새 버전 배포합니다. React·Lucide 라이선스 고지문은 번들에 보존하며 포함 폰트 고지문은 FONT-LICENSE.txt에 있습니다.

로컬에서 전체 Compose를 실행할 때도 BRIDGE_TOKEN과 BRIDGE_PUBLIC_URL 설정이 필요합니다. 브리지 없이 기존 본체만 쓸 경우 `docker compose up -d --build web worker`로 필요한 서비스만 지정할 수 있습니다.

## 운영 확인

- 시크릿 브라우저에서 Google 로그인 없이 접속되는지
- 실제 뉴스·메일·위젯과 기존 요약이 표시되는지
- 설정 저장·메일 계정 관리·AI 요청이 원본과 동일하게 처리되는지
- 방문·읽음·저장 기록이 원본 앱과 공유되는지
- 토큰 없이 브리지 개인 데이터 API 접근이 401인지

실제 Dokploy 배포·DNS·TLS·Google 배포는 이 소스 변경만으로 자동 완료되지 않습니다. Apps Script에는 실행 시간·UrlFetch 일일 할당량 제한이 적용됩니다. 상시 수집과 요약은 기존 워커에서 실행합니다.
