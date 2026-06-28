import { json } from "./_shared.mjs";

export default async (request) =>
  json({
    openrouter: Boolean(process.env.OPENROUTER_API_KEY || request.headers.get("x-vyrl-openrouter-key")),
    serverOpenrouter: Boolean(process.env.OPENROUTER_API_KEY),
    meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    siteUrl: Boolean(process.env.URL || process.env.DEPLOY_PRIME_URL),
  });
