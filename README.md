# vyrl – Netlify deployment

This package contains the website and the server-side pieces required for a real deployment:

- OpenRouter content generation through a Netlify Function
- OpenRouter video creation and status polling
- a public streaming URL that Instagram can fetch
- Instagram publishing through the Meta Graph API
- one-click OAuth foundations for Meta, TikTok, LinkedIn, YouTube and X
- a persistent daily schedule stored with Netlify Blobs
- a scheduled function that creates content, waits for the video and publishes later

## Recommended deployment

Do **not** use Netlify Drop for the final app. Drag-and-drop can publish the HTML, but a Git-connected project is easier to update and install dependencies for.

1. Put the complete folder in a new GitHub repository.
2. In Netlify, choose **Add new project → Import an existing project**.
3. Select the repository.
4. Netlify reads `netlify.toml`; no build command is required.
5. Deploy once.
6. Open **Project configuration → Environment variables** and add the variables listed below.
7. Redeploy after saving variables.

For a temporary preview, you can zip this folder and use Netlify Drop. Functions and dependencies are most reliable through Git or the Netlify CLI.

## Required environment variable

```text
OPENROUTER_API_KEY
```

Add the OpenRouter key only in Netlify. Do not paste it into `index.html`.
Trigger a fresh production deploy after adding or changing environment variables.

## Meta / Instagram setup

Create a Meta developer app and add:

```text
META_APP_ID
META_APP_SECRET
```

In the Meta app, configure this exact OAuth redirect URL:

```text
https://YOUR-SITE.netlify.app/api/oauth/meta/callback
```

The app requests permissions for Facebook Pages, Instagram publishing and Threads. Meta may require App Review before people outside the developer/tester list can connect.

After deployment, select Instagram in vyrl, open **Connections**, and click **Connect Meta**.

## Optional social OAuth apps

Only configure the platforms you intend to use:

```text
TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
X_CLIENT_ID
X_CLIENT_SECRET
```

Use these callback URLs:

```text
https://YOUR-SITE.netlify.app/api/oauth/tiktok/callback
https://YOUR-SITE.netlify.app/api/oauth/linkedin/callback
https://YOUR-SITE.netlify.app/api/oauth/google/callback
https://YOUR-SITE.netlify.app/api/oauth/x/callback
```

Provider review, approved scopes and paid API access may still be required. The package cannot create or approve developer apps for you.

## Scheduler behavior

Netlify runs `scheduled-post` every 15 minutes:

1. At the chosen time, it creates the content and submits a video job.
2. A later run checks the video status.
3. When ready, it exposes the video through the server and creates the Instagram Reel container.
4. A later run publishes the processed Reel.

This staged approach avoids waiting for several minutes inside one serverless function.

## Important limitations

- The current automated scheduler publishes to Instagram first. The OAuth foundations and credential storage for the other platforms are included, but their individual publishing implementations still depend on provider approval and product-specific upload APIs.
- Scheduled Functions run on published production deploys.
- Social providers can change permissions and review requirements.
- OpenRouter video generation costs money and requires account credit.
- A single Netlify project currently stores one owner’s schedule and connections. A public multi-user SaaS needs authentication and per-user storage.

## Files

```text
index.html
netlify.toml
package.json
netlify/functions/
```

Never commit a real `.env` file or API secret.
