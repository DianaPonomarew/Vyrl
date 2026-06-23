import {
  baseUrl,
  encodeBasic,
  json,
  saveConnection,
  stateStore,
} from "./_shared.mjs";

async function postForm(url, values, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    body: new URLSearchParams(values),
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error_description || data.error?.message || data.message || "OAuth token exchange failed");
  }
  return data;
}

async function connectMeta(code, redirectUri) {
  const token = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri: redirectUri,
      code,
    })}`,
  ).then((response) => response.json());
  if (token.error) throw new Error(token.error.message);
  const pages = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(token.access_token)}`,
  ).then((response) => response.json());
  if (pages.error) throw new Error(pages.error.message);
  const page = pages.data?.find((item) => item.instagram_business_account) || pages.data?.[0];
  if (!page) throw new Error("No manageable Facebook Page was found.");
  return {
    accessToken: token.access_token,
    pageAccessToken: page.access_token,
    pageId: page.id,
    pageName: page.name,
    instagramAccountId: page.instagram_business_account?.id || null,
    instagramUsername: page.instagram_business_account?.username || null,
    account: page.instagram_business_account?.username
      ? `@${page.instagram_business_account.username} · ${page.name}`
      : page.name,
  };
}

async function connectTikTok(code, redirectUri) {
  const token = await postForm("https://open.tiktokapis.com/v2/oauth/token/", {
    client_key: process.env.TIKTOK_CLIENT_KEY,
    client_secret: process.env.TIKTOK_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  const profile = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((response) => response.json());
  return {
    ...token,
    openId: token.open_id || profile.data?.user?.open_id,
    account: profile.data?.user?.display_name || "TikTok account",
  };
}

async function connectLinkedIn(code, redirectUri) {
  const token = await postForm("https://www.linkedin.com/oauth/v2/accessToken", {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });
  const profile = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((response) => response.json());
  return { ...token, accountId: profile.sub, account: profile.name || "LinkedIn account" };
}

async function connectGoogle(code, redirectUri) {
  const token = await postForm("https://oauth2.googleapis.com/token", {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const channel = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true", {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((response) => response.json());
  const item = channel.items?.[0];
  return {
    ...token,
    channelId: item?.id,
    channelTitle: item?.snippet?.title,
    account: item?.snippet?.title || "YouTube channel",
  };
}

async function connectX(code, redirectUri, verifier) {
  const token = await postForm(
    "https://api.x.com/2/oauth2/token",
    {
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: process.env.X_CLIENT_ID,
    },
    process.env.X_CLIENT_SECRET
      ? { authorization: `Basic ${encodeBasic(process.env.X_CLIENT_ID, process.env.X_CLIENT_SECRET)}` }
      : {},
  );
  const profile = await fetch("https://api.x.com/2/users/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
  }).then((response) => response.json());
  return { ...token, accountId: profile.data?.id, account: profile.data?.username ? `@${profile.data.username}` : "X account" };
}

export default async (request) => {
  try {
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider");
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!provider || !state || !code) return json({ error: "Incomplete OAuth callback" }, 400);
    const stored = await stateStore().get(state, { type: "json" });
    if (!stored || stored.provider !== provider || Date.now() - stored.createdAt > 15 * 60 * 1000) {
      return json({ error: "Invalid or expired OAuth state" }, 400);
    }
    await stateStore().delete(state);
    const redirectUri = `${baseUrl()}/api/oauth/${provider}/callback`;
    const connection =
      provider === "meta" ? await connectMeta(code, redirectUri)
      : provider === "tiktok" ? await connectTikTok(code, redirectUri)
      : provider === "linkedin" ? await connectLinkedIn(code, redirectUri)
      : provider === "google" ? await connectGoogle(code, redirectUri)
      : provider === "x" ? await connectX(code, redirectUri, stored.verifier)
      : null;
    if (!connection) return json({ error: "Unsupported provider" }, 400);
    await saveConnection(provider, connection);
    const destination = new URL(stored.returnTo || `${baseUrl()}/`);
    destination.searchParams.set("oauth_connected", provider);
    destination.searchParams.set("account_name", connection.account || "Connected");
    return Response.redirect(destination.toString(), 302);
  } catch (error) {
    const destination = new URL(baseUrl() || "https://example.com");
    destination.searchParams.set("oauth_error", error.message);
    return Response.redirect(destination.toString(), 302);
  }
};
