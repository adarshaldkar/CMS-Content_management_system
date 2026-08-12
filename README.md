# CMS Platform

Secure, CMS-driven editorial content platform.

## Documentation

All specifications live in [`docs/`](./docs/). Start with [`docs/README.md`](./docs/README.md).

**Locked stack:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

## Phase 1 — Foundation (current)

```text
cms-platform/
├── client/          React + TypeScript + Vite + Tailwind
├── server/          NestJS + TypeScript
├── docs/            Project specifications
└── docker-compose.yml
```

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop (for PostgreSQL + MongoDB)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start databases
npm run docker:up

# 3. Configure server environment
cp .env.example server/.env

# 4. Run client + server
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/api
- **Health:** http://localhost:3000/api/health

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server concurrently |
| `npm run dev:client` | Vite dev server only |
| `npm run dev:server` | NestJS watch mode only |
| `npm run build` | Production build both packages |
| `npm run docker:up` | Start PostgreSQL + MongoDB |
| `npm run docker:down` | Stop containers |

## Implementation phases

See [`docs/README.md`](./docs/README.md) for the full phased plan. **Do not skip phases.**
