# DailyBrief

MIT 라이선스로 배포합니다. 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.

Apps Script 공개 시연 버전과 Dokploy의 Compose 브리지 배포 설정은 [apps-script/README.md](apps-script/README.md)를 참고하세요. Compose는 `bridge` 서비스도 실행하므로 `BRIDGE_TOKEN`, `BRIDGE_PUBLIC_URL`을 설정해야 합니다. 도메인은 `bridge` 서비스의 컨테이너 포트 `8787`에 연결합니다.

관심 뉴스, 여러 메일 계정, 날씨, 학교 급식, 관심 종목, GeekNews와 CVE를 모으는 개인 대시보드입니다. 디자인에는 프로젝트에 설치된 **Impeccable**을 사용했습니다.

## 빠른 실행

필수: Docker Engine/Compose. 로컬 개발에는 Node.js 24도 필요합니다.

```powershell
node scripts/setup-env.mjs
docker compose up -d --build
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 로그인 없이 대시보드가 표시됩니다. 설정 화면에서 지역·학교·메일·API 키를 연결하세요.

[http://localhost:3000/demo](http://localhost:3000/demo)는 가상 데이터만 사용하는 미리보기입니다. 실제 개인 데이터와 연결되지 않으며 저장·요약은 화면 안에서만 동작합니다.

기본 바인딩은 루프백입니다. VPN에서 접근하려면 `.env`의 `BIND_ADDRESS`에 VPN 인터페이스 주소를 추가하고 `APP_URL`을 실제 접속 주소로 변경하세요. 웹 컨테이너 포트만 노출하고 DB 포트는 외부로 열지 마세요. Gmail OAuth를 HTTPS 프록시 뒤에서 연결할 때는 상태 쿠키에 `COOKIE_SECURE=true`를 설정합니다. 애플리케이션은 VPN 자체를 구성하거나 네트워크 접근을 제한해주지 않습니다.

## 초기 설정

- **뉴스:** RSS/Atom 소스 이름·URL, 관심 태그·키워드·제외어를 등록합니다. GeekNews 피드는 기본 수집합니다. 관심사가 일치한 뉴스만 자동 요약합니다.
- **AI:** OpenRouter/OpenAI 중 하나, 사용 가능한 모델 ID와 해당 API 키를 입력합니다. 자동 요약 시도 기본 한도는 한국 시간으로 하루 뉴스 30건·메일 100건입니다. 실패 후 재시도도 한도에 포함합니다. 수동 요청은 별도입니다. 금액 기반 비용 상한은 제공자 콘솔에서 설정하세요.
- **날씨:** 도시 검색 또는 위도·경도를 입력합니다. 기본 지역은 서울입니다.
- **급식:** NEIS 키를 저장한 뒤 학교 이름을 검색하고 주소를 확인합니다. 중식·석식이 없는 날짜에는 미제공으로 표시합니다. 메뉴에 포함된 알레르기 번호는 원본대로 유지합니다.
- **주식:** KIS Developers에서 발급한 **실전 Open API** App Key/Secret을 설정하고 관심 종목을 추가합니다. 국내는 6자리 종목코드, 미국은 심볼과 NAS/NYS/AMS 거래소를 지정합니다. 계좌·주문 API는 호출하지 않습니다. 해외 시세는 제공자 정책에 따라 지연될 수 있습니다. 표시 시각은 조회 시각이며 거래소 체결 시각을 보장하지 않습니다.
- **CVE:** NVD 키는 선택입니다. 키워드·벤더·제품·CPE 중 하나와 일치하면 표시합니다. CVSS가 없는 보고서는 미평가로 표시합니다. 키워드 일치는 특정 설치 버전의 취약성 판정이 아닙니다.

### Gmail OAuth

1. Google Cloud 프로젝트에서 Gmail API를 활성화합니다.
2. OAuth 동의 화면을 구성하고 개인 계정을 테스트 사용자 등 허용 대상에 추가합니다. 개인 사용에 대한 검증 예외와 테스트 모드 토큰 만료 정책을 확인하세요.
3. 웹 애플리케이션 OAuth 클라이언트를 만들고 리디렉션 URI를 `APP_URL/api/oauth/google/callback`과 정확히 일치시킵니다. 예: `http://localhost:3000/api/oauth/google/callback`.
4. `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 설정하고 웹·워커를 재생성합니다.
5. 설정 → 메일 계정 → Gmail 연결을 누릅니다. 여러 계정 연결을 지원합니다.

권한은 `gmail.readonly`입니다. 증분 동기화는 history ID를 사용하고, 커서가 만료되면 최근 24시간으로 복구합니다. Google이 허용하는 리디렉션 호스트·HTTPS 조건을 따라야 하며 VPN IP를 임의로 OAuth 리디렉션에 쓸 수 있다고 가정하지 마세요.

### IMAP

메일 제공자에서 IMAP을 켜고 앱 비밀번호를 발급한 뒤 계정을 추가합니다. 포트 993 TLS 또는 143 필수 STARTTLS를 지원합니다. 내부 학교 서버는 `IMAP_ALLOWED_HOSTS=imap.school.example`처럼 정확한 호스트를 운영자가 허용해야 합니다. TLS 인증서 검증을 끄는 옵션은 제공하지 않습니다.

INBOX를 읽기 전용으로 열어 원본 읽음 상태를 보존합니다. 계정별 UIDVALIDITY·UID로 증분 수집합니다. 최초 연결과 UIDVALIDITY 변경 시 최근 24시간을 가져옵니다. 5MB를 넘는 메시지는 제한되며 첨부파일은 AI에 전송하지 않습니다. 메일 본문과 요약은 로컬 DB에 저장되고, 자동 요약 시 정제한 본문이 선택한 AI 제공자에게 전송됩니다.

## 로컬 개발·검증

```powershell
npm ci
node scripts/setup-env.mjs
docker compose up -d db
npm run migrate
npm run dev
# 별도 터미널
npm run worker
# 검사
npm run typecheck
npm test
npm run test:integration
npm run build
```

데이터베이스는 기본적으로 호스트 `127.0.0.1:15432`입니다. Windows 예약 포트 등과 충돌하면 `DB_PORT`와 로컬 `DATABASE_URL`의 포트를 함께 바꾸세요. Compose 내부에서는 `db:5432`로 자동 덮어씁니다. 기존 PostgreSQL을 쓰면 `DATABASE_URL`을 바꾸세요.

웹은 접속 여부와 관계없이 동작하는 별도 워커에 수집·요약을 위임합니다. 수집 기본 간격: 메일·시세 5분, 피드·GeekNews 15분, 날씨 30분, CVE 1시간, 급식 하루 1회와 한국 날짜 변경 시. 뉴스·메일의 첫 수집은 최근 24시간입니다. 큐는 DB에 영속화되며 중복 실행 억제와 제한된 재시도를 사용합니다.

‘지난 방문 이후’ 기준은 서버에서 직전 대시보드 조회 성공 시각을 저장합니다. 현재 탭의 새로고침 버튼은 기준을 바꾸지 않습니다. 새 탭이나 재방문은 새 방문으로 기록됩니다. 원본 메일 읽음과 대시보드 읽음은 별개입니다.

REST API는 `/api/dashboard`, `/api/status`, `/api/settings`, `/api/accounts`, `/api/items/:id`, `/api/refresh`, `/api/jobs/:id`, `/api/schools`, `/api/locations`입니다. 로그인·회원가입·세션 API는 없으며 변경 요청은 `APP_URL`과 동일한 Origin만 허용합니다. 비밀정보는 조회 API에 반환하지 않습니다.

## 운영과 백업

```powershell
docker compose ps
docker compose logs --tail 100 worker
```

백업에는 **DB와 `.env`의 MASTER_KEY**가 모두 필요합니다. MASTER_KEY를 잃으면 저장한 OAuth·IMAP·API 자격정보를 복호화할 수 없습니다. DB 백업과 키는 암호화된 별도 저장소에 보관하세요.

셸의 바이너리 리디렉션 차이를 피하려면 컨테이너 안에서 덤프한 뒤 복사합니다.

```powershell
docker compose exec -T db pg_dump -U dailybrief -d dailybrief -Fc -f /tmp/dailybrief.dump
docker compose cp db:/tmp/dailybrief.dump ./dailybrief.dump
```

복원 시 웹·워커를 중지하고 대상 DB의 기존 데이터 처리 방침을 확인하세요. 새 DB에 다음을 실행한 뒤 원래 MASTER_KEY를 복원하고 웹·워커를 시작합니다.

```powershell
docker compose cp ./dailybrief.dump db:/tmp/dailybrief.dump
docker compose exec -T db pg_restore -U dailybrief -d dailybrief --no-owner /tmp/dailybrief.dump
docker compose up -d web worker
```

연동 해제는 해당 계정과 로컬 메일·요약을 삭제합니다. 개인 단일 서버 운영을 전제로 하며 보존 기간을 강제로 정리하지 않습니다. 초기 화면은 종류별 최근 80개에서 표시하고, 종류별 전체 보기의 ‘소식 더 보기’로 과거 항목을 추가 조회할 수 있습니다. 검색·필터는 현재 불러온 항목에 적용됩니다. VPN·프록시 구축, 실서버 배포, 실제 API 자격정보 발급은 운영자의 환경 작업입니다.

`test:integration`은 별도 임시 DB와 3101 포트의 테스트 서버를 만들고 완료 후 정리합니다. 3101 포트가 비어 있어야 합니다. 현재 DB의 소유자·설정·메일은 테스트에 사용하지 않습니다.
