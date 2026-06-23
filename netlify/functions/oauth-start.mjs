import crypto from "node:crypto";
import { baseUrl, json, randomId, stateStore } from "./_shared.mjs";

const configs = {
  meta: {
    clientId: () => process.env.META_APP_ID,
    authorize: "https://www.facebook.com/v21.0/dialog/oauth",
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,threads_basic,threads_content_publish",
  },
  tiktok: {
    clientId: () => process.env.TIKTOK_CLIENT_KEY,
    authorize: "https://www.tiktok.com/v2/auth/authorize/",
    scope: "user.info.basic,video.publish,video.upload",
    clientParam: "client_key",
  },
  linkedin: {
    clientId: () => process.env.LINKEDIN_CLIENT_ID,
    authorize: "https://www.linkedin.com/oauth/v2/authorization",
    scope: "openid profile w_member_social",
  },
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    scope: "openid profile https://www.googleapis.com/auth/youtube.upload",
    extras: { access_type: "offline", prompt: "consent" },
  },
  x: {
    clientId: () => process.env.X_CLIENT_ID,
    authorize: "https://twitter.com/i/oauth2/authorize",
    scope: "tweet.read tweet.write users.read offline.access",
    extras: { code_challenge_method: "S256" },
  },
};

const base64url = (buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export default async (request) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider");
  const config = configs[provider];
  if (!config) return json({ error: "Unsupported OAuth provider" }, 400);
  const clientId = config.clientId();
  if (!clientId) return json({ error: `${provider.toUpperCase()} OAuth is not configured in Netlify environment variables.` }, 500);

  const state = randomId();
  const returnTo = url.searchParams.get("return_to") || `${baseUrl()}/`;
  const verifier = provider === "x" ? base64url(crypto.randomBytes(48)) : null;
  const challenge = verifier
    ? base64url(crypto.createHash("sha256").update(verifier).digest())
    : null;
  await stateStore().setJSON(state, { provider, returnTo, verifier, createdAt: Date.now() });

  const redirectUri = `${baseUrl()}/api/oauth/${provider}/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    [config.clientParam || "client_id"]: clientId,
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
    ...(config.extras || {}),
    ...(challenge ? { code_challenge: challenge } : {}),
  });
  return Response.redirect(`${config.authorize}?${params}`, 302);
};
