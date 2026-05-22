# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Pubfy is a Brazilian SaaS restaurant management platform (React + TypeScript + Vite frontend, Supabase backend). The frontend connects to a hosted Supabase project at `jyrfjvyeikhqpuwcvdff.supabase.co` with credentials embedded in `src/integrations/supabase/client.ts` (public anon key, protected by RLS).

### Running the application

- **Dev server**: `npm run dev` — starts Vite on port 8080 (binds to `::`)
- No `.env` file is required for local development — Supabase URL and anon key are embedded with fallback defaults.
- The app is fully functional against the hosted Supabase project without Docker or local Supabase.

### Key commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint (all) | `npm run lint` |
| Lint (src only) | `npm run lint:src` |
| Lint (edge functions) | `npm run lint:functions` |
| Type check | `npm run typecheck` |
| Unit tests | `npm run test` |
| Unit tests (watch) | `npm run test:watch` |
| Build | `npm run build` |

### Non-obvious caveats

- The Supabase Edge Functions (under `supabase/functions/`) use Deno runtime. They are linted separately via `npm run lint:functions` but cannot be type-checked with the main `tsc --noEmit` (the main tsconfig targets browser/node).
- The `lovable-tagger` Vite plugin runs only in development mode — it's safe to ignore it for production builds.
- Node.js 22 is used in CI; the README mentions 16+ but modern dependencies require Node 18+.
- `package-lock.json` is the authoritative lockfile (use `npm install`, not yarn/pnpm/bun).
- E2E tests (`npm run test:e2e`) require Playwright browsers installed (`npx playwright install --with-deps`) and a production build first.
