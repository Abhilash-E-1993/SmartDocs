# Deployment Guide

SmartDocs is a monorepo with two deployable parts:

| Part                  | Where      | Why                                                              |
| --------------------- | ---------- | ---------------------------------------------------------------- |
| `apps/web` (Vite SPA) | **Vercel** | Static frontend — Vercel's specialty                             |
| `apps/api` (Express)  | **Railway** (or Render) | Persistent Node server — SSE chat streaming and Inngest background jobs need long-lived processes, which Vercel serverless functions don't support |

Supporting services: **MongoDB Atlas** (database), **Inngest Cloud** (background jobs), **Clerk** (auth, production instance).

## 1. MongoDB Atlas

1. Create a free cluster at <https://cloud.mongodb.com>.
2. Database Access → add a user (username + password).
3. Network Access → allow `0.0.0.0/0` (Railway uses dynamic IPs).
4. Copy the connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/smartdocs`.

## 2. API → Railway

1. Push this repo to GitHub, then <https://railway.app> → **New Project → Deploy from GitHub repo**.
2. In the service settings set **Root Directory** to `apps/api`.
3. Railway auto-detects Node: build = `npm run build`, start = `npm start` (the `engines` field pins Node 20+).
4. Add variables (Settings → Variables):

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `https://<your-app>.vercel.app` (add after step 4; comma-separated for multiple) |
   | `MONGODB_URI` | Atlas connection string |
   | `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` | production (`live`) keys |
   | `CLOUDINARY_*`, `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `MEM0_API_KEY` | your service keys |
   | `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | from step 3 |

   (`PORT` is injected by Railway automatically.)
5. Settings → Networking → **Generate Domain** → note `https://<api>.up.railway.app`.
6. Verify: open `https://<api>.up.railway.app/health`.

## 3. Inngest Cloud

1. <https://app.inngest.com> → create an app → get the **Event Key** and **Signing Key** → add them to the Railway variables above.
2. Apps → **Sync app** with URL `https://<api>.up.railway.app/api/inngest` — the PDF/URL/YouTube processing functions appear and run on uploads.

## 4. Web → Vercel

1. <https://vercel.com> → **Add New → Project** → import the same GitHub repo.
2. Set **Root Directory** to `apps/web` (Framework Preset "Vite", build/output auto-detected; `vercel.json` in that folder adds the SPA fallback so refreshing `/dashboard` etc. never 404s).
3. Add Environment Variables:

   | Key | Value |
   | --- | --- |
   | `VITE_API_URL` | `https://<api>.up.railway.app` |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` |

4. Deploy → note `https://<your-app>.vercel.app`.
5. Go back to Railway and set `CLIENT_URL=https://<your-app>.vercel.app` (required — CORS will block the frontend otherwise).

## 5. Clerk production

1. Clerk dashboard → your app → switch to the **production** instance.
2. Add `https://<your-app>.vercel.app` to the allowed domains.
3. Use the production `pk_live_…` / `sk_live_…` keys in Vercel and Railway respectively.

## Final smoke test

1. Open the Vercel URL → sign up/in (Clerk).
2. Create a workspace, upload a PDF → status flips to *Ready* (Inngest + Pinecone working).
3. Ask a question → answer streams with citations (SSE through Railway working).
