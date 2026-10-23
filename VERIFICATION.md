# Verification

2026-10-23 layout update: the dashboard stacks GeekNews above news in the left column and mail above CVEs in the right column, with independent column heights. The existing local order was updated without changing other settings. TypeScript, nine unit tests, the layout detector and Docker production build passed. Browser DOM checks at the current mobile viewport confirmed 14px gaps within both groups.

Validated locally on Windows with Node.js 24 and Docker Compose.

- TypeScript check passed.
- Nine unit tests passed: interest/exclusion rules, CVE matching, automatic-summary restrictions, visit boundary, IMAP cursor reset, SSRF/link rejection, authenticated encryption, RSS/Atom normalization, settings validation.
- Fifteen integration checks passed against an isolated temporary PostgreSQL database: migration preservation of visits/settings/secrets, login-free dashboard/settings access, legacy login redirect, removed authentication API, origin validation, encrypted/redacted secrets, settings validation, multiple mail account identity, visit tracking, read/save persistence, private IMAP blocking, scoped account deletion and persistent summary queue.
- Docker production image built successfully; migrations, web, worker and PostgreSQL started successfully. Restart preserved the migration record. The login-removal migration moves the visit cursor to app_state and removes the former owner/session/login-attempt tables; settings, mail accounts and encrypted secrets remain. Temporary test databases were removed.
- Open-Meteo and GeekNews were fetched successfully by the worker in the isolated QA environment.
- Browser checks covered desktop and mobile layout, lunch/dinner selection, search and empty results, bookmark view, manual demo summary, comma-separated settings editing and saving. Mobile DOM width and scroll width were both 390px.
- Impeccable detector returned no findings for `src`. Independent review requested two fixes (date placement and selected-state accessibility); both were applied and scored resolved, with disposition `ship` for those fixes.

## Verification limits

No personal Gmail OAuth client, IMAP account, KIS, NEIS or AI API credentials were supplied. Their live authenticated flows were not verified. CVE rendering and matching rules were tested, but live NVD ingestion with a configured watchlist was not verified. VPN/reverse-proxy configuration and deployment to another server remain environment work.

The `/demo` route contains explicitly synthetic content. It does not prove external integrations or personal account access. Search filters currently loaded items; older items can be loaded in each type's full view.
