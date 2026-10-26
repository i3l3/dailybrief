# Current release: full functionality restored (2026-10-26)

User explicitly requested full original functionality with public access. Removed the read-only banner, settings placeholder, local-only item actions and GAS mutation blocks. Native dashboard POST now updates visits; settings/accounts/refresh and actual summary requests forward to the original backend. Gmail connection entry is restored. Four adapter tests cover forwarding and existing OAuth flow; TypeScript and generated bundle build pass. Real Dokploy and Apps Script redeployment remain unverified. Earlier read-only descriptions below are historical.

# Apps Script adapter verification — 2026-10-23

## 2026-10-26 public / Compose update

- Public GAS reads require no Session email; mutations, account management, forced collection and new AI requests are denied. The initial snapshot uses `/bridge/public-dashboard` and does not update the personal visit cursor.
- `bridge` is included in compose.yaml, uses the worker build target, binds port 8787 inside the container and reaches `web:3000` and `db:5432` by service name. A non-sensitive health endpoint is available at `/bridge/health`.
- This folder is now intentionally tracked in Git, including generated Apps Script files. `.env` variants, `.clasp.json` and preview.png remain ignored. Docker includes bridge source and excludes generated dist files.
- TypeScript, four bridge tests (including health response) and Compose configuration validation passed.
- A new Docker image build was attempted but could not run because Docker Desktop's Linux engine was unavailable. No container startup or Dokploy redeployment is claimed for this update.

Historical owner-only and whole-folder-ignore observations below describe the earlier version, not the current public release.

## Passed locally

- Built the original dashboard, settings, shell, icons, styles and fonts into Apps Script HTML files. Original source hashes are recorded in `dist/source-manifest.json`.
- TypeScript check passed including the adapter and bridge.
- `Code.gs` and the generated browser bundle passed JavaScript syntax checks.
- Four bridge tests passed: allowlist agreement between GAS/Node; bearer authentication, Origin forwarding and request/error preservation; one-time OAuth ticket, PKCE, cookie/state verification and mocked persistence; owner-only GAS access and no bootstrap secret fields.
- Read-only requests through a real local bridge to the existing native server passed for status, settings, accounts and dashboard. Returned personal contents were not logged. These checks did not change visits, settings or mail.
- Browser rendered the generated synthetic preview at 1280px without horizontal overflow. Both groups were present: GeekNews → news, mail → CVE. The original manual demo-summary interaction updated the visible text and displayed the explicit no-real-AI-call notice.
- `git check-ignore` confirms the entire folder is ignored; `git ls-files apps-script` returns no tracked files. The folder is also excluded from Docker build context.

## Not verified / required setup

- No Google Apps Script project was created or deployed and no new Google permissions were granted.
- Public HTTPS bridge address, DNS/TLS, script properties and OAuth redirect URI must be configured following README.md.
- Real Google-hosted HtmlService rendering, real `google.script.run`/UrlFetch transport and live bridge Gmail OAuth have not been exercised. OAuth tests use injected fake token/profile/persistence functions. Existing real mail and summary workers are reused, not reimplemented or independently revalidated here.
- No new real AI request, mail send, Gmail connection or account deletion was triggered during adapter tests.
- Full production equivalence remains subject to the live checklist in README.md and Apps Script quotas. The existing server/DB/worker must remain reachable and running.

## Official platform references

- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
- https://developers.google.com/apps-script/reference/base/session
- https://developers.google.com/apps-script/guides/services/quotas
