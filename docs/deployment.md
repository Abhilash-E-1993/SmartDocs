# Deployment Guide

SmartDocs is a monorepo with two deployable parts:

| Part                  | Where      | Why                                                                                                                                                |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` (Vite SPA) | **Vercel** | Static frontend — Vercel's specialty                                                                                                               |
| `apps/api` (Express)  | **Render** | Persistent Node server — SSE chat streaming and Inngest background jobs need long-lived processes, which Vercel serverless functions don't support |

Supporting services: **MongoDB Atlas** (database), **Inngest Cloud** (background jobs), **Clerk** (auth, production instance).

## 1. MongoDB Atlas

1. Create a free cluster at <https://cloud.mongodb.com>.
2. Database Access → add a user (username + password).
3. Network Access → allow `0.0.0.0/0` (Railway uses dynamic IPs).
4. Copy the connection string: `mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/smartdocs`.

## 2. API → Render

1. Push this repo to GitHub, then <https://dashboard.render.com> → **New → Web Service** → connect the repo. (A ready-made `render.yaml` Blueprint exists at the repo root if you prefer **New → Blueprint** instead.)
2. Settings — **leave Root Directory empty** (the monorepo builds from the root via npm workspaces):
   - **Build Command:** `npm install && npm run build --workspace @smartdocs/api`
   - **Start Command:** `node apps/api/dist/server.js`
   - **Health Check Path:** `/health`
3. Add environment variables (Environment tab):

   | Key                                                                                                              | Value                                                                            |
   | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
   | `NODE_ENV`                                                                                                       | `production`                                                                     |
   | `CLIENT_URL`                                                                                                     | `https://<your-app>.vercel.app` (add after step 4; comma-separated for multiple) |
   | `MONGODB_URI`                                                                                                    | Atlas connection string                                                          |
   | `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY`                                                                     | production (`live`) keys                                                         |
   | `CLOUDINARY_*`, `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `MEM0_API_KEY` | your service keys                                                                |
   | `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`                                                                      | from step 3                                                                      |

   (`PORT` is injected by Render automatically — the API already reads it.)

4. Deploy → note the URL: `https://<api>.onrender.com`.
5. Verify: open `https://<api>.onrender.com/health` (first hit can take ~50s on the free plan — cold start).

> **Free-plan note:** Render free services sleep after 15 min idle. To keep the API warm, point a free <https://uptimerobot.com> monitor at `https://<api>.onrender.com/health` every 5 minutes.

## 3. Inngest Cloud

1. <https://app.inngest.com> → create an app → get the **Event Key** and **Signing Key** → add them to the Render variables above.
2. Apps → **Sync app** with URL `https://<api>.onrender.com/api/inngest` — the PDF/URL/YouTube processing functions appear and run on uploads.

## 4. Web → Vercel

1. <https://vercel.com> → **Add New → Project** → import the same GitHub repo.
2. Set **Root Directory** to `apps/web` (Framework Preset "Vite", build/output auto-detected; `vercel.json` in that folder adds the SPA fallback so refreshing `/dashboard` etc. never 404s).
3. Add Environment Variables:

   | Key                          | Value                        |
   | ---------------------------- | ---------------------------- |
   | `VITE_API_URL`               | `https://<api>.onrender.com` |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…`                  |

4. Deploy → note `https://<your-app>.vercel.app`.
5. Go back to Render and set `CLIENT_URL=https://<your-app>.vercel.app` (required — CORS will block the frontend otherwise).

## 5. Clerk production

1. Clerk dashboard → your app → switch to the **production** instance.
2. Add `https://<your-app>.vercel.app` to the allowed domains.
3. Use the production `pk_live_…` / `sk_live_…` keys in Vercel and Railway respectively.

## Final smoke test

1. Open the Vercel URL → sign up/in (Clerk).
2. Create a workspace, upload a PDF → status flips to _Ready_ (Inngest + Pinecone working).
3. Ask a question → answer streams with citations (SSE through Railway working).
