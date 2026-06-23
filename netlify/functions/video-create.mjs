import { json, openRouterHeaders, readJson } from "./_shared.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await readJson(request);
    const response = await fetch("https://openrouter.ai/api/v1/videos", {
      method: "POST",
      headers: openRouterHeaders(request),
      body: JSON.stringify({
        model: body.model,
        prompt: body.prompt,
        duration: body.duration,
        resolution: body.resolution,
        aspect_ratio: body.aspect_ratio || "9:16",
        generate_audio: body.generate_audio !== false,
      }),
    });
    return json(await response.json(), response.status);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
