import { getConnection, json, publicConnection } from "./_shared.mjs";

export default async () => {
  const providers = ["meta", "tiktok", "linkedin", "google", "x"];
  const entries = await Promise.all(
    providers.map(async (provider) => [provider, publicConnection(await getConnection(provider))]),
  );
  return json(Object.fromEntries(entries.filter(([, value]) => value)));
};
