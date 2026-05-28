# nextjs-graphql-starter

Next.js + GraphQL starter with Apollo, Prisma, SQLite, JWT auth, and shadcn/ui.

## Stack

- **Framework**: Next.js 16 (App Router)
- **GraphQL**: Apollo Server 5 (API) + Apollo Client 4 (client)
- **Database**: Prisma 7 + SQLite via better-sqlite3
- **UI**: shadcn/ui (Radix), Tailwind CSS v4
- **Auth**: JWT via jose (no passwords — any username can log in)
- **Testing**: Vitest
- **Pkg manager**: pnpm

## Quickstart

```bash
pnpm install
pnpm db:push
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Login with any email to get started.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm typecheck` | TypeScript check (`tsc --noEmit`) |
| `pnpm lint` | ESLint |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm db:push` | Apply Prisma schema changes + regenerate client |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm codegen` | Regenerate GraphQL TS types (requires dev server running) |
| `pnpm jwt:generate` | Generate a dev JWT |

To verify everything before committing:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Environment

Copy `.env.example` to `.env`:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite database path |
| `JWT_SECRET` | `dev-secret` | HMAC key for JWT signing |
| `GRAPHQL_PLAYGROUND_ENABLED` | `true` | Apollo Sandbox at `/graphql` |
| `GRAPHQL_AUTH_BYPASS_LOCAL` | `false` | Set `true` to skip auth in dev |

## Project structure

```
src/
├── app/             # Next.js pages + GraphQL API route
│   ├── graphql/     #   Apollo handler (GET + POST)
│   └── page.tsx     #   Main app page
├── components/      # React components (shadcn/ui)
├── graphql/         # GraphQL layer
│   ├── schema/      #   TypeDefs (tagged template strings)
│   ├── resolvers/   #   Resolvers
│   └── server.ts    #   Apollo Server setup
├── services/        # Business logic (auth, notes)
├── lib/             # Utilities (prisma client, auth, cursor, env)
├── generated/       # Generated code (gitignored)
│   ├── prisma/      #   Prisma client
│   └── graphql.ts   #   GraphQL codegen types
└── test/            # Test setup
```

## Architecture

### GraphQL

- Single endpoint at `POST /graphql` (Apollo Server 5 via `@as-integrations/next`).
- Schema is defined as TypeScript tagged template strings in `src/graphql/schema/`.
- Resolvers are plain objects merged in `src/graphql/resolvers/index.ts`.
- Apollo Sandbox available at `/graphql` in dev.

### Auth

- `login` mutation accepts any `username` string and returns a JWT (1h expiry).
- Protected queries/mutations require `Authorization: Bearer <token>` header.
- Set `GRAPHQL_AUTH_BYPASS_LOCAL=true` to skip auth during local development.

### Database

- Single `Note` model with `id`, `ownerUsername`, `title`, `content`, `createdAt`, `updatedAt`.
- Run `pnpm db:push` after schema changes (custom script with `sqlite3` — not `prisma db push`).

### Pagination

Cursor-based pagination on the `notes` query. Sort and filter are applied in-memory after fetching the user's notes from SQLite.
