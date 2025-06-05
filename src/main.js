import { router } from './api/router.js';
import { corsHeaders } from './utils/cors.js';
import * as slack from "./api/slack";

async function handleCronJob(env) {
  const channels = await slack.handleChannels(env.SLACK_BOT_KEY, "aem-", "Edge Delivery");
  for (const channel of channels) {
    await env.SLACK_STATS_QUEUE.send({
      channelId: channel.id
    });
  }
}

async function processSlacktats(channelId, env) {
  const stats = await slack.getMessageStats(env.SLACK_USER_KEY, channelId);
  if (!stats) return;

  const key = channelId;
  const newValue = JSON.stringify(stats);
  const existing = await env.SLACK_KV.get(key);

  if (existing !== newValue) {
    await env.SLACK_KV.put(key, newValue);
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCronJob(env));
  },

  async queue(batch, env, ctx) {
    const chunkSize = 1;
    for (let i = 0; i < batch.messages.length; i += chunkSize) {
      const chunk = batch.messages.slice(i, i + chunkSize);
      ctx.waitUntil(Promise.all(chunk.map(msg =>
          processSlackStats(msg.body.channelId, env)
      )));
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
