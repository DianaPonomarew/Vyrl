import { getStore } from "@netlify/blobs";
import {
  baseUrl,
  getConnection,
  openRouterHeaders,
  scheduleStore,
} from "./_shared.mjs";

const jobStore = () => getStore("vyrl-scheduled-jobs");

function zonedParts(zone = "Europe/Berlin") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone === "local" ? "Europe/Berlin" : zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

async function createContent(schedule) {
  const prompt = `Create a specific, useful social video package in ${schedule.language || "German"}.
Topic: ${schedule.topic}
Audience: ${schedule.audience || "interested viewers"}
Goal: ${schedule.contentGoal || "teach"}
Voice: ${schedule.voice || "direct"}
Must include: ${schedule.mustInclude || "concrete examples"}
Avoid: ${schedule.avoidContent || "generic filler and invented claims"}
Return valid JSON only:
{"caption":"platform-ready caption","video_prompt":"English 9:16 text-to-video prompt with action, camera, lighting and no text or logos"}`;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.55,
      max_tokens: 1200,
      plugins: schedule.webResearch ? [{ id: "web", max_results: 5 }] : undefined,
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || "Scheduled content generation failed");
  return JSON.parse(result.choices?.[0]?.message?.content || "{}");
}

async function chooseModel() {
  const response = await fetch("https://openrouter.ai/api/v1/videos/models", {
    headers: openRouterHeaders(),
  });
  const result = await response.json();
  const models = (result.data || []).filter((model) => (model.supported_aspect_ratios || []).includes("9:16"));
  return models.find((model) => (model.supported_resolutions || []).includes("1080p")) || models[0];
}

async function submitVideo(prompt, duration = 4) {
  const model = await chooseModel();
  if (!model) throw new Error("No vertical OpenRouter video model is currently available");
  const response = await fetch("https://openrouter.ai/api/v1/videos", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: model.id,
      prompt,
      duration: Math.max(4, Math.min(Number(duration), 15)),
      resolution: (model.supported_resolutions || []).includes("1080p") ? "1080p" : "720p",
      aspect_ratio: "9:16",
      generate_audio: true,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(result.error?.message || "Scheduled video generation failed");
  return result.id;
}

async function publishInstagram(videoUrl, caption) {
  const connection = await getConnection("meta");
  const accountId = connection?.instagramAccountId || process.env.INSTAGRAM_ACCOUNT_ID;
  const token = connection?.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!accountId || !token) throw new Error("Instagram is not connected");
  const created = await fetch(`https://graph.facebook.com/v21.0/${accountId}/media`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: token,
    }),
  }).then((response) => response.json());
  if (!created.id) throw new Error(created.error?.message || "Could not create scheduled Instagram container");
  return created.id;
}

export default async () => {
  try {
    const schedule = await scheduleStore().get("default", { type: "json" });
    if (!schedule?.enabled) return;
    const now = zonedParts(schedule.zone);
    const current = await jobStore().get("default", { type: "json" });

    if (current?.status === "video_pending") {
      const response = await fetch(`https://openrouter.ai/api/v1/videos/${current.videoId}`, {
        headers: openRouterHeaders(),
      });
      const video = await response.json();
      if (video.status === "completed") {
        const publicUrl = `${baseUrl()}/api/video/public/${encodeURIComponent(current.videoId)}`;
        const containerId = await publishInstagram(publicUrl, current.caption);
        await jobStore().setJSON("default", {
          ...current,
          status: "instagram_processing",
          containerId,
          publicUrl,
          updatedAt: new Date().toISOString(),
        });
      } else if (["failed", "cancelled", "expired"].includes(video.status)) {
        await jobStore().setJSON("default", { ...current, status: "failed", error: video.error || video.status });
      }
      return;
    }

    if (current?.status === "instagram_processing") {
      const connection = await getConnection("meta");
      const token = connection?.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
      const status = await fetch(
        `https://graph.facebook.com/v21.0/${current.containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      ).then((response) => response.json());
      if (status.status_code === "FINISHED") {
        const publish = await fetch(
          `https://graph.facebook.com/v21.0/${connection.instagramAccountId}/media_publish`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ creation_id: current.containerId, access_token: token }),
          },
        ).then((response) => response.json());
        await jobStore().setJSON("default", {
          ...current,
          status: publish.id ? "published" : "failed",
          mediaId: publish.id,
          error: publish.error?.message,
          updatedAt: new Date().toISOString(),
        });
      }
      return;
    }

    const [hour, minute] = String(schedule.time || "18:30").split(":").map(Number);
    const [nowHour, nowMinute] = now.time.split(":").map(Number);
    const closeEnough = nowHour === hour && Math.abs(nowMinute - minute) < 15;
    if (!closeEnough || current?.runDate === now.date) return;

    const content = await createContent(schedule);
    const videoId = await submitVideo(content.video_prompt, schedule.duration || 4);
    await jobStore().setJSON("default", {
      status: "video_pending",
      runDate: now.date,
      videoId,
      caption: content.caption,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    await jobStore().setJSON("last-error", {
      error: error.message,
      createdAt: new Date().toISOString(),
    });
  }
};
