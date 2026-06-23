import { getConnection, json, readJson } from "./_shared.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await readJson(request);
    const connection = await getConnection("meta");
    const accountId = connection?.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
    const token = connection?.pageAccessToken || connection?.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!accountId || !token) return json({ error: "Instagram is not connected." }, 400);
    if (!body.video_url) return json({ error: "Missing video_url" }, 400);

    const create = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: body.video_url,
        caption: body.caption || "",
        share_to_feed: body.share_to_feed !== false,
        access_token: token,
      }),
    });
    const container = await create.json();
    if (!create.ok || container.error) {
      return json({ error: container.error?.message || "Could not create Instagram container." }, 400);
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(5000);
      const check = await fetch(
        `https://graph.facebook.com/v21.0/${container.id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      );
      const status = await check.json();
      if (status.status_code === "FINISHED") break;
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        return json({ error: status.status || status.status_code }, 400);
      }
    }

    const publish = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media_publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    const published = await publish.json();
    if (!publish.ok || published.error) {
      return json({ error: published.error?.message || "Instagram publish failed." }, 400);
    }
    const detail = await fetch(
      `https://graph.facebook.com/v21.0/${published.id}?fields=permalink&access_token=${encodeURIComponent(token)}`,
    );
    const metadata = await detail.json();
    return json({ ok: true, media_id: published.id, permalink: metadata.permalink });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
