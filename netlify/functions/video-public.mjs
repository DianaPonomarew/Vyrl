import { openRouterHeaders } from "./_shared.mjs";

export default async (request) => {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing video id", { status: 400 });
    const upstream = await fetch(
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}/content?index=0`,
      { headers: openRouterHeaders() },
    );
    if (!upstream.ok) return new Response(await upstream.text(), { status: upstream.status });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") || "video/mp4",
        "cache-control": "public, max-age=86400",
        "content-disposition": `inline; filename="vyrl-${id}.mp4"`,
      },
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
};
