/**
 * GET /api/video/public/:id
 *
 * Streams a completed OpenRouter video through Netlify so Instagram
 * can fetch it from a stable, public HTTPS URL (OpenRouter URLs are
 * signed and not directly accessible by Instagram).
 *
 * Uses Cache-Control: public so Netlify CDN can cache repeated requests.
 */
import { openRouterHeaders } from "./_shared.mjs";

export default async (request) => {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return new Response("Missing video id", { status: 400 });

    // Try index 0 first, fall back to checking the job status for the URL
    const upstream = await fetch(
      `https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}/content?index=0`,
      { headers: openRouterHeaders() },
    );

    if (!upstream.ok) {
      // If content endpoint fails, try fetching status for a public_url
      const statusResp = await fetch(
        `https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}`,
        { headers: openRouterHeaders() },
      );
      const status = await statusResp.json();
      const publicUrl = status?.public_url;
      if (publicUrl) {
        // Redirect to the public URL if OpenRouter provided one
        return Response.redirect(publicUrl, 302);
      }
      return new Response(await upstream.text(), { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "video/mp4";
    const contentLength = upstream.headers.get("content-length");

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        ...(contentLength ? { "content-length": contentLength } : {}),
        "cache-control": "public, max-age=86400",
        "content-disposition": `inline; filename="vyrl-${id}.mp4"`,
        // Allow Instagram's servers to fetch this
        "access-control-allow-origin": "*",
      },
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
};
