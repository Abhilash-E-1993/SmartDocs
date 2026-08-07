# SmartDocs

> An AI-powered knowledge workspace — understand, explore, and interact with your personal knowledge sources.

---

## Project Overview

SmartDocs is an AI-powered knowledge workspace inspired by NotebookLM. It transforms documents, websites, YouTube videos, markdown files, and text into an intelligent workspace where every response is grounded in the user's uploaded knowledge.

This repository is a **monorepo** containing the frontend web application and the backend API server, developed independently inside the same repository.

**Current status:** application foundation complete — Clerk authentication, user sync with MongoDB, dashboard, and full workspace management (create / rename / delete / switch). Document uploads, AI chat, sources and memory arrive in upcoming milestones.

---

## Tech Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, Tailwind CSS 4        |
| Routing        | TanStack Router (file-based, type-safe)           |
| Server State   | TanStack Query (optimistic updates)               |
| UI Components  | shadcn/ui, Radix UI, Lucide icons                 |
| Forms          | React Hook Form + Zod                             |
| Notifications  | Sonner                                            |
| Command Menu   | CMDK (⌘K)                                         |
| Backend        | Node.js, Express 5, TypeScript                    |
| Database       | MongoDB + Mongoose                                |
| Authentication | Clerk (`@clerk/clerk-react` + `@clerk/express`)   |
| Validation     | Zod (shared frontend + backend)                   |
| Logging        | Pino                                              |
| Code Quality   | ESLint (flat config), Prettier                    |
| Monorepo       | npm workspaces, concurrently                      |

> The full approved stack is defined in `docs/01-tech-stack.md` and is frozen — do not substitute technologies. AI-related packages (OpenAI, Pinecone, Inngest, …) are intentionally not installed yet.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.19
- **npm** >= 10
- **MongoDB** running locally (`mongod`) or a MongoDB Atlas connection string
- A free **Clerk** application (<https://dashboard.clerk.com>)

### Install

From the repository root:

```bash
npm install
```

This single command installs dependencies for the root and both workspaces (`apps/web` and `apps/api`).

### Environment Setup

Copy the example environment files and fill in values:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

#### `apps/api/.env`

| Variable                | Description               | Example                               |
| ----------------------- | ------------------------- | ------------------------------------- |
| `PORT`                  | Port the API runs on      | `5000`                                |
| `NODE_ENV`              | Node environment          | `development`                         |
| `CLIENT_URL`            | Frontend origin (CORS)    | `http://localhost:5173`               |
| `MONGODB_URI`           | MongoDB connection string | `mongodb://localhost:27017/smartdocs` |
| `CLERK_SECRET_KEY`      | Clerk secret key          | `sk_test_…`                           |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key     | `pk_test_…`                           |

#### `apps/web/.env`

| Variable                     | Description           | Example                 |
| ---------------------------- | --------------------- | ----------------------- |
| `VITE_API_URL`               | Base URL of the API   | `http://localhost:5000` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | `pk_test_…`             |

> Never commit real `.env` files. Only `.env.example` files with placeholder values belong in the repository.
>
> If Clerk keys are missing, the web app renders a setup screen and the API answers protected routes with a `503` envelope — the servers never crash or hang.

### Run

```bash
npm run dev
```

- Web: <http://localhost:5173>
- API: <http://localhost:5000> (health check: <http://localhost:5000/health>)

---

## Folder Structure

```text
smartdocs/
├── apps/
│   ├── web/                          # React + Vite frontend
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn components only (never modified)
│   │   │   │   ├── layout/           # AppShell, AppSidebar, TopNav, CommandMenu, …
│   │   │   │   ├── common/           # EmptyState, ErrorState, ConfirmDialog, …
│   │   │   │   └── markdown/
│   │   │   ├── features/
│   │   │   │   ├── auth/             # hooks/ (user sync)
│   │   │   │   ├── dashboard/        # components/ (DashboardView, skeletons)
│   │   │   │   ├── workspace/        # components/ hooks/ types/
│   │   │   │   ├── sources/ chat/ citations/ memory/ settings/
│   │   │   ├── hooks/                # useTheme, useMobile, useKeyboardShortcut
│   │   │   ├── services/             # API layer (axios + TanStack Query)
│   │   │   ├── lib/                  # axios, clerk, query-client, utils (cn)
│   │   │   ├── providers/            # Theme, Query, AuthBridge
│   │   │   ├── routes/               # TanStack Router pages (file-based)
│   │   │   ├── types/                # api, user, workspace
│   │   │   ├── utils/                # formatDate, initials
│   │   │   ├── styles/globals.css    # Tailwind v4 + shadcn theme tokens
│   │   │   ├── App.tsx               # Provider composition
│   │   │   └── main.tsx              # Entry point
│   │   ├── components.json           # shadcn config
│   │   └── .env.example
│   │
│   └── api/                          # Express + TypeScript backend
│       ├── src/
│       │   ├── config/               # env, logger, clerk
│       │   ├── middleware/           # auth, error handler, validation
│       │   ├── modules/
│       │   │   ├── auth/             # User.ts, service.ts, controller.ts, routes.ts, types.ts
│       │   │   ├── workspace/        # Workspace.ts, service.ts, controller.ts, routes.ts, types.ts
│       │   │   └── health/           # controller.ts, routes.ts
│       │   ├── services/             # (external providers — future)
│       │   ├── jobs/                 # (Inngest jobs — future)
│       │   ├── database/             # Mongo connection
│       │   ├── validators/           # Zod schemas
│       │   ├── utils/                # ApiError, api-response, async-handler
│       │   ├── types/                # express.d.ts augmentation
│       │   ├── app.ts                # Express app setup
│       │   └── server.ts             # Bootstrap + graceful shutdown
│       └── .env.example
│
├── docs/                             # Architecture & product documentation
├── package.json                      # Root scripts + workspaces
└── README.md
```

---

## API

All protected routes require a Clerk session token (`Authorization: Bearer <token>`) and return a consistent envelope:

```jsonc
// success
{ "success": true, "data": { /* … */ } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

| Method   | Route             | Description                                  |
| -------- | ----------------- | -------------------------------------------- |
| `GET`    | `/health`         | Liveness + MongoDB connection state (public) |
| `GET`    | `/auth/me`        | Sync + return the current user               |
| `GET`    | `/workspaces`     | List my workspaces                           |
| `POST`   | `/workspaces`     | Create a workspace                           |
| `GET`    | `/workspaces/:id` | Get one workspace (owner only)               |
| `PATCH`  | `/workspaces/:id` | Rename a workspace                           |
| `DELETE` | `/workspaces/:id` | Delete a workspace                           |

On first sign-in, the frontend calls `GET /auth/me`; the backend verifies the Clerk token and creates the MongoDB user document if it does not exist yet.

---

## Available Scripts

Run from the **repository root**:

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `npm install`          | Install all dependencies (root + workspaces) |
| `npm run dev`          | Start API and web dev servers together       |
| `npm run dev:api`      | Start only the API dev server                |
| `npm run dev:web`      | Start only the web dev server                |
| `npm run build`        | Build both apps for production               |
| `npm run lint`         | Lint both apps                               |
| `npm run format`       | Format both apps with Prettier               |
| `npm run format:check` | Check formatting without writing             |

---

## Development Commands

```bash
# Start both apps (API on :5000, web on :5173)
npm run dev

# Lint everything
npm run lint

# Format everything
npm run format

# Production build of both apps
npm run build
```

