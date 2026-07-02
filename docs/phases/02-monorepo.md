# Phase 02 — Monorepo Setup

## Structure

```
my_project/
├── apps/
│   ├── api/          (@school/api — NestJS)
│   └── web/          (@school/web — Next.js)
├── packages/
│   ├── shared/       (@school/shared — TypeScript types)
│   └── certificate-layout/  (@school/certificate-layout — PDF layout engine)
├── pnpm-workspace.yaml
├── package.json
└── docker-compose.yml
```

## Commands

```bash
pnpm install          # install all workspaces
pnpm dev              # run api + web concurrently
pnpm build            # build all
pnpm test             # run tests
pnpm lint             # lint all
pnpm db:migrate       # prisma migrate deploy
pnpm db:seed          # seed demo data
```
