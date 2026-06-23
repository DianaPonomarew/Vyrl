import { json, openRouterHeaders } from "./_shared.mjs";

export default async () => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/videos/models", {
      headers: openRouterHeaders(),
    });
    return json(await response.json(), response.status);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
