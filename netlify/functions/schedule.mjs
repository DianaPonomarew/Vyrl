import { json, readJson, scheduleStore } from "./_shared.mjs";

export default async (request) => {
  if (request.method === "GET") {
    return json((await scheduleStore().get("default", { type: "json" })) || null);
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = await readJson(request);
  await scheduleStore().setJSON("default", { ...body, updatedAt: new Date().toISOString() });
  return json({ ok: true });
};
