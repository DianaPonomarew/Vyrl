# vyrl 🎬

> Turn one idea into daily Reels — automatically.
> AI script · AI video · auto-post to Instagram (and more).

Built with OpenRouter, Netlify Functions, and the Meta Graph API.

---

## Quick Start (5 minutes)

### 1 — Fork & connect to Netlify

```
GitHub → Fork this repo
Netlify → Add new site → Import from GitHub → select your fork
```

Netlify reads `netlify.toml` automatically. No build command needed.

### 2 — Add your OpenRouter key

In Netlify: **Site configuration → Environment variables → Add variable**

```
Key:   OPENROUTER_API_KEY
Value: sk-or-v1-...        ← get one at openrouter.ai/settings/keys
```

Then: **Deploys → Trigger deploy** (variables only take effect after a redeploy).

### 3 — Open your site and test

Go to your Netlify URL, pick a topic, click **✨ Create content now**.
Script, caption, viral score and an AI video should appear within ~1 minute.

That's it for the basic flow. Instagram posting needs one more step →

---

## Instagram Setup

Instagram publishing requires a Meta Developer App.

### Create the Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Choose **Business** type
3. Add the **Instagram** product
4. Under **Instagram → API setup**: connect your Instagram Professional Account

### Add OAuth redirect URL

In your Meta App: **Facebook Login → Settings → Valid OAuth Redirect URIs**

```
https://YOUR-SITE.netlify.app/api/oauth/meta/callback
```

Replace `YOUR-SITE` with your actual Netlify subdomain.

### Add Meta credentials to Netlify

```
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
```

Redeploy after saving.

### Connect in vyrl

Open your vyrl site → **Step 2 → ⚙️ Advanced → Connect Meta** → sign in with Facebook.
vyrl will find your Instagram account automatically.

---

## Local Development

```bash
npm install          # or: pnpm install
npx netlify login
npx netlify dev      # starts local server at localhost:8888
```

Create a `.env` file (copy from `.env.example`) and add your keys there.
Never commit `.env`.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ | AI content + video generation |
| `META_APP_ID` | For Instagram | Meta Developer App ID |
| `META_APP_SECRET` | For Instagram | Meta Developer App Secret |
| `TIKTOK_CLIENT_KEY` | Optional | TikTok content posting |
| `TIKTOK_CLIENT_SECRET` | Optional | TikTok content posting |
| `LINKEDIN_CLIENT_ID` | Optional | LinkedIn posting |
| `LINKEDIN_CLIENT_SECRET` | Optional | LinkedIn posting |
| `GOOGLE_CLIENT_ID` | Optional | YouTube Shorts |
| `GOOGLE_CLIENT_SECRET` | Optional | YouTube Shorts |
| `X_CLIENT_ID` | Optional | X (Twitter) posting |
| `X_CLIENT_SECRET` | Optional | X (Twitter) posting |
| `INSTAGRAM_ACCESS_TOKEN` | Fallback | Manual token (skip if using OAuth) |
| `INSTAGRAM_ACCOUNT_ID` | Fallback | Manual account ID (skip if using OAuth) |

---

## How the Scheduler Works

`netlify/functions/scheduled-post.mjs` runs every 15 minutes (configured in `netlify.toml`).

At the scheduled time it:
1. Generates a script + video prompt via OpenRouter
2. Submits a video generation job
3. Polls for completion across later runs
4. Exposes the video via `/api/video/public/:id` (so Instagram can fetch it)
5. Creates the Instagram Reel container
6. Publishes on the next poll once the container status is `FINISHED`

This staged approach avoids Netlify's function timeout limit.

---

## Project Structure

```
vyrl/
├── index.html                  # entire frontend (single file)
├── netlify.toml                # routes + scheduler config
├── package.json
├── .env.example
└── netlify/
    └── functions/
        ├── _shared.mjs         # helpers: auth, storage, OpenRouter
        ├── ai-content.mjs      # POST /api/ai-content
        ├── video-create.mjs    # POST /api/video/create
        ├── video-models.mjs    # GET  /api/video/models
        ├── video-status.mjs    # GET  /api/video/status
        ├── video-public.mjs    # GET  /api/video/public/:id  ← public stream for Instagram
        ├── publish-instagram.mjs # POST /api/publish/instagram
        ├── connections.mjs     # GET  /api/connections
        ├── config-status.mjs   # GET  /api/config-status
        ├── oauth-start.mjs     # GET  /api/oauth/:provider/start
        ├── oauth-callback.mjs  # GET  /api/oauth/:provider/callback
        ├── schedule.mjs        # POST /api/schedule
        └── scheduled-post.mjs  # runs every 15 min (Netlify Scheduled Function)
```

---

## Known Limitations

- **Instagram only** for automated posting out of the box. OAuth foundations for TikTok, LinkedIn, YouTube and X are included but their publish implementations need platform-specific API approval.
- **Single-user** — Netlify Blobs stores one owner's schedule and connections. Multi-user SaaS needs authentication + per-user storage.
- **Video costs money** — OpenRouter video generation is pay-per-use (~$0.10–$0.25/video depending on model and length).
- **Scheduled Functions** only run on production deploys, not in local dev or preview branches.

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS — single file, no build step
- **Backend**: Netlify Functions (Node.js ESM)
- **AI**: OpenRouter (content + video)
- **Storage**: Netlify Blobs (OAuth tokens, schedule)
- **Video delivery**: Netlify Function streaming proxy
- **Publishing**: Meta Graph API v21

---

Made with 💜 by [NEXORA AI](https://nexora-ai-solutions.netlify.app)
