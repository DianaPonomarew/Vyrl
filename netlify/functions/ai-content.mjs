import { json, openRouterHeaders, readJson } from "./_shared.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await readJson(request);
    const payload = {
      model: body.model || "openrouter/auto",
      messages: body.messages || [],
      max_tokens: Math.min(Number(body.max_tokens || 2600), 5000),
      temperature: body.temperature ?? 0.55,
      ...(body.response_format ? { response_format: body.response_format } : {}),
      ...(body.web_search
        ? {
            plugins: [{ id: "web", max_results: body.web_results || 6 }],
            web_search_options: { search_context_size: body.search_context_size || "medium" },
          }
        : {}),
    };
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: openRouterHeaders(request),
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    return json(result, response.status);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
