import { baseUrl, json, openRouterHeaders } from "./_shared.mjs";

export default async (request) => {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return json({ error: "Missing video id" }, 400);
    const response = await fetch(`https://openrouter.ai/api/v1/videos/${encodeURIComponent(id)}`, {
      headers: openRouterHeaders(request),
    });
    const result = await response.json();
    if (result.status === "completed") {
      result.public_url = `${baseUrl()}/api/video/public/${encodeURIComponent(id)}`;
    }
    return json(result, response.status);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
