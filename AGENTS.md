# AGENTS.md

## Project

- **pkg manager**: `pnpm` (v11.3.0). Not npm or yarn.
- **stack**: Next.js 16 (App Router), Apollo Server 5, Prisma 7 + SQLite, shadcn/ui (Radix), Tailwind v4, jose (JWT), Vitest.
- **dir layout**: `src/app/` (pages + API route), `src/graphql/` (schema, resolvers, context), `src/services/` (business logic), `src/lib/` (prisma, auth, env, cursor), `src/components/` (React components).

### Key commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start dev server on `localhost:3000` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | `eslint` |
| `pnpm test` | `vitest run` — no watch mode. Runs against `dev.db` directly. |
| `pnpm db:push` | **Custom** script (`scripts/db-push.ts`), not Prisma's `db push`. Applies schema diff to SQLite + regenerates Prisma client. |
| `pnpm codegen` | GraphQL Codegen — **requires `pnpm dev` running** (reads schema from `localhost:3000/graphql`). |
| `pnpm jwt:generate` | CLI helper for dev tokens. |

### Verification order

```text
pnpm typecheck && pnpm lint && pnpm test
```

### Generated code

- **Prisma client**: `src/generated/prisma/` — import from `@/generated/prisma/client`. Gitignored.
- **GraphQL TS types**: `src/generated/graphql.ts` — from `graphql-codegen`.
- Client `.graphql` operation documents live in `src/**/*.graphql`.

### Prisma

- Single `Note` model: `id`, `ownerUsername`, `title`, `content`, `createdAt`, `updatedAt`.
- SQLite via `better-sqlite3` adapter.
- `prisma.config.ts` uses Prisma's `defineConfig` format (separate from `schema.prisma`).
- Schema changes: run `pnpm db:push` to apply + regenerate client. Don't use `prisma db push` directly.

### GraphQL server

- Entrypoint: `src/app/graphql/route.ts` — handler for `GET` and `POST` at `/graphql`.
- Schema defined as tagged template strings in `src/graphql/schema/*.ts` (not `.graphql` files).
- Resolvers in `src/graphql/resolvers/*.ts`, merged in `index.ts`.
- Auth: Bearer token → `jose` JWT verify. Login mutation returns `accessToken`. `GRAPHQL_AUTH_BYPASS_LOCAL=true` bypasses auth in dev.
- Pagination: cursor-based, implemented in-memory in `NoteService`. Sort + filter done client-side on fetched records.

### Test quirks

- Vitest with `jsdom` env by default. Files that need Node env use `// @vitest-environment node` docblock.
- No test DB isolation — tests use `dev.db` same as dev. `beforeEach` cleans notes.
- Setup: `src/test/setup.ts` sets `JWT_SECRET` and `DATABASE_URL` defaults.
- Uses `@testing-library/jest-dom/vitest` matchers.
- Service tests use in-memory fake repos (not hitting the DB).

### Environment

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-secret"
GRAPHQL_PLAYGROUND_ENABLED="true"
GRAPHQL_AUTH_BYPASS_LOCAL="false"
```

### Auth

- Any username can log in via `login` mutation (no password). JWT expires in 1h.
- `me` query returns the authenticated user.
- Note ownership enforced by `ownerUsername` — users only see their own notes.
- `src/services/auth-service.ts` normalizes usernames (trim, lowercase).
