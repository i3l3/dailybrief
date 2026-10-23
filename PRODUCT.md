# DailyBrief

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the user's request to implement the agreed plan: TypeScript, Next.js, Tailwind CSS, PostgreSQL, Docker Compose; separate web and collection worker.

## Users

A single Korean-speaking user checks what arrived since their previous visit, on desktop and mobile.

## Product Purpose

Bring interest-matched news, multiple inboxes, weather, school meals, stock prices, GeekNews and relevant CVEs into one personal dashboard.

## Operating Context

Self-hosted Docker service behind a private network or VPN without application login (single personal user, as explicitly requested). Asia/Seoul is the default timezone. No public deployment was requested.

## Capabilities and Constraints

Gmail OAuth and read-only IMAP with multiple accounts. Interest news and new inbox mail get automatic AI summaries. GeekNews and CVEs use deterministic tags and manual summaries only. OpenRouter and OpenAI are selectable. NEIS elementary/middle/high school meals. Korean and US prices through KIS, with no trading. School, location, watchlist and secrets are configured by the owner. Actual credentials have not been supplied.

## Brand Commitments

Working name DailyBrief. The user explicitly requested a liquid-glass / gethomepage-like translucent dashboard and supplied a dark, dense glass dashboard reference. Use impeccable to implement the design.

## Evidence on Hand

User-approved plan in this conversation; empty initial workspace; attached screenshot is visual reference, not source content. All preview data must be labeled synthetic. No verified personal accounts, school, location or holdings exist.

## Product Principles

- New information first; interests improve priority without hiding the rest.
- Preserve source links, timestamps and failure states.
- Keep mail read-only and secrets on the server.
- Explain unconfigured widgets rather than inventing live data.
