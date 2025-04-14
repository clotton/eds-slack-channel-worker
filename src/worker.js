/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
export default {
  async fetch(request, env) {
    const { SLACK_BOT_KEY, SLACK_USER_KEY, TURNSTILE_SECRET } = env;
    const allowedOrigin = "eds-channel-tracker--aemdemos.aem";
    const originHeader = request.headers.get("Origin");
    const requestUrl = new URL(request.url);
    const path = requestUrl.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    const { turnstile_token } = await request.json();
    const ip = request.headers.get("CF-Connecting-IP");

    const formData = new FormData();
    formData.append("secret", TURNSTILE_SECRET);
    formData.append("response", turnstile_token);
    formData.append("remoteip", ip);

    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const result = await fetch(url, {
      method: "POST",
      body: formData
    });

    const data = await result.json();
    if (!data.success) {
      return new Response("Unauthorized",
          {
            status: 401,
            headers: corsHeaders()
          });
    }



    /*
    if (originHeader && !originHeader.includes(allowedOrigin)) {
      return new Response("Forbidden", {
        status: 403,
        headers: corsHeaders()
      });
    }
*/
    if (path === "/slack/channels") {
      const channelName = (requestUrl.searchParams.get("channelName") || "aem-").replace(/\*/g, "");
      const description = (requestUrl.searchParams.get("description") || "Edge Delivery").replace(/\*/g, "");

      return handleChannels(SLACK_BOT_KEY, channelName, description);
    } else if (path === "/slack/messageStats") {
      const channelId = requestUrl.searchParams.get("channelId");
      if (!channelId) {
        return new Response("Bad Request: Missing channelId", {
          status: 400,
          headers: corsHeaders()
        });
      }
      return handleMessageStats(SLACK_USER_KEY, channelId);
    } else if (path === "/slack/members") {
      const channelId = requestUrl.searchParams.get("channelId");
      if (!channelId) {
        return new Response("Bad Request: Missing channelId", {
          status: 400,
          headers: corsHeaders()
        });
      }
      return handleMembers(SLACK_BOT_KEY, channelId);
    } else if (path === "/slack/user/info") {
      const userId = requestUrl.searchParams.get("userId");
      if (!userId) {
        return new Response("Bad Request: Missing userId", {
          status: 400,
          headers: corsHeaders()
        });
      }
      return handleUserInfo(SLACK_BOT_KEY,userId);
    } else {
      return new Response("Not Found", {
        status: 404,
        headers: corsHeaders()
      });
    }
  }
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type'
});

const isHumanMessage = (msg) =>
    !msg.subtype && msg.user && !msg.bot_id;

async function handleChannels(token, channelName, description) {
  const SLACK_API_URL = "https://slack.com/api/conversations.list?exclude_archived=true&limit=9999";
  let cursor = null, allChannels = [];

  do {
    const apiUrl = cursor ? `${SLACK_API_URL}&cursor=${cursor}` : SLACK_API_URL;
    let response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await handleApiResponse(response);
    const filteredChannels = data.channels.filter(ch =>
        (!channelName || ch.name.includes(channelName) &&
            (!description || ch.purpose?.value?.includes(description))
        ));
    allChannels.push(...filteredChannels);
    cursor = data.response_metadata?.next_cursor || null;
  } while (cursor);

  console.log("Total channels found:", allChannels.length);
  return jsonResponse(allChannels);
}

async function handleMessageStats(token, channelId) {
  const SLACK_API_URL = `https://slack.com/api/conversations.history?channel=${channelId}&limit=1000`;
  const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60);

  let response = await fetch(SLACK_API_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    return response;
  }

  const data = await response.json();

  const humanMessages = data.messages.filter(isHumanMessage);

  // Sort all messages by timestamp in ascending order
  humanMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  // Filter messages that are 30 days old or newer
  const recentMessages = humanMessages.filter(message => parseFloat(message.ts) >= thirtyDaysAgo);

  const recentMessageCount = recentMessages.length;
  const lastMessageTimestamp = humanMessages.length > 0 ? humanMessages[humanMessages.length - 1].ts : null;
  const totalMessages = humanMessages.length;

  return jsonResponse({ totalMessages, recentMessageCount, lastMessageTimestamp });
}

async function handleMembers(token, channelId) {
  const apiUrl = `https://slack.com/api/conversations.members?channel=${channelId}`;
  return await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
}

async function handleUserInfo(token, userId) {
  const apiUrl = `https://slack.com/api/users.info?user=${userId}`;
  return await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
}

const handleApiResponse = async (response) => {
  const data = await response.json();
  if (!response.ok || !data.ok) {
    return errorResponse(data.error || response.statusText);
  }
  return data;
};

const errorResponse = (error) => new Response(JSON.stringify({ error }), {
  status: 400,
  headers: corsHeaders()
});

const jsonResponse = (data) => new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    ...corsHeaders(),
    "Content-Type": "application/json"
  }
});
