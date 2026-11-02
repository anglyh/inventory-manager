# Production hardening

## Objective
Close the gaps found before using the Dokploy deployment with real data.

## Scope and constraints
- Backend behind Traefik; frontend and API share `hostal-l.duckdns.org`.
- Minimal tests. No database scripts against any real database. Never read `.env`.
- Push, PR and merge stay with the user.
- Delivery strategy: ask-on-risk. Route: inline (small edits, code already read).

## Tasks
- [x] T1: limit failed auth attempts per IP and trust one proxy.
- [x] T2: allow registration only while no user exists (hide the link in the frontend).
- [x] T3: survive idle connection errors, shut down cleanly, add `/api/health`, drop unused CORS origins.

## Checks
- `bun x tsc --noEmit`, `bun x vitest run`.
- Pending on the user, after deploy: 11 failed logins give 429, while another network can still log in.

## Progress
Started 2026-11-01. T1-T3 share one commit: `src/index.ts` mixes them and each edit is a line or two.

Evidence: RED seen for the limiter and closed registration. `tsc --noEmit` passes; vitest 146 passed, 1 todo.
Smoke run without `.env` and with an unreachable database: `/api/health` gives 503; a foreign origin gets no CORS header.

Not proven: SIGTERM handling (Windows kills the process, exit 143), image build (Docker not running), `trust proxy 1` behind the real Traefik.

Reviews: 76a221b approved; 0a5505c (only 401 counts toward the limit, after a resilience finding) approved; frontend d30daad..d3fbed3 approved.
Open advisories, not fixed: 429 missing from OpenAPI; real login route not covered by the limiter test; first-user check is not atomic.
Next: user pushes both repos, merges to main, redeploys, runs the pending checks and sets up backups.
