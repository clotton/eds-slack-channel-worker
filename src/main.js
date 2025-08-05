import { router } from './api/router.js';
import { corsHeaders } from './utils/cors.js';
import * as slack from "./api/slack";

async function handleCronJob(env) {
  const res = await slack.handleChannels(env.SLACK_BOT_KEY, "Message Stats Cron Job", '', '', env);
  const channels = await res.json();
  console.log(`Found ${channels.length} channels for stats collection`);

  for (const channel of channels) {
    console.log(`Adding channel ${channel.id}) to stats queue`);
    await env.SLACK_STATS_QUEUE.send({
      channelId: channel.id
    });
  }
}

async function processSlackStats(channelId, env) {
  const response = await slack.getMessageStats(env.SLACK_USER_KEY, channelId);
  if (!response.ok) return;

  const stats = await response.json();

  const key = channelId;
  const newValue = JSON.stringify(stats);
  const existing = await env.SLACK_KV.get(key);

  if (existing !== newValue) {
    console.log(`Updated stats for channel ${channelId}:  ${newValue}`);
    await env.SLACK_KV.put(key, newValue);
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCronJob(env));
  },

  async queue(batch, env, ctx) {
    for (const msg of batch.messages) {
      const { channelId } = typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
      await processSlackStats(channelId, env);
    }
  },

  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const originHeader = request.headers.get("Origin");
    const allowedOrigin = "eds-channel-tracker--aemdemos.aem";
    if (originHeader && !originHeader.includes(allowedOrigin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders() });
    }
    return router(request, env);
  }
};
