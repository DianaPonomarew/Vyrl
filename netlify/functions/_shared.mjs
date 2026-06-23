import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export const baseUrl = () => (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");

export const randomId = () => crypto.randomBytes(24).toString("hex");

export const stateStore = () => getStore("vyrl-oauth-state");
export const connectionStore = () => getStore("vyrl-connections");
export const scheduleStore = () => getStore("vyrl-schedules");

export async function saveConnection(provider, value) {
  await connectionStore().setJSON(provider, {
    ...value,
    provider,
    updatedAt: new Date().toISOString(),
  });
}

export async function getConnection(provider) {
  return connectionStore().get(provider, { type: "json" });
}

export function publicConnection(connection) {
  if (!connection) return null;
  return {
    provider: connection.provider,
    account: connection.account || connection.pageName || connection.channelTitle || "Connected account",
    accountId: connection.accountId || connection.pageId || connection.channelId || null,
    updatedAt: connection.updatedAt,
  };
}

export function openRouterHeaders() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured in Netlify.");
  return {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    "http-referer": baseUrl() || "https://vyrl.app",
    "x-openrouter-title": "vyrl",
  };
}

export const encodeBasic = (id, secret) =>
  Buffer.from(`${id}:${secret}`).toString("base64");
