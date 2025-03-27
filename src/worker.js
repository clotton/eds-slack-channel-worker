export default {
  async fetch(request, env) {
    const SLACK_API_KEY = `${env.SLACK_BOT_KEY}`;
    const allowedOrigin = "https://main--eds-channel-tracker--aemdemos.aem";
    const originHeader = request.headers.get("Origin");
    const baseUrl = new URL(request.url);
    const url = new URL('/slack/channels', baseUrl);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type'
        }
      });
    }

    if (originHeader && !originHeader.startsWith(allowedOrigin)) {
      return new Response("Forbidden", {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type"
        }
      });
    }

    if (url.pathname === "/slack/channels") {
      return handleChannels(SLACK_API_KEY);
    } else if (url.pathname === "/slack/lastmessage") {
      return handleLastMessage(SLACK_API_KEY,"C06NL0BADDK");
    }
    else {
      return new Response("Not Found", { status: 404 });
    }
  }
};

async function handleChannels(token) {
  const SLACK_API_URL = "https://slack.com/api/conversations.list?exclude_archived=true&limit=9999";

  let cursor = null;
  let allChannels = [];

  do {
    const url = cursor ? `${SLACK_API_URL}&cursor=${cursor}` : SLACK_API_URL;
    let response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!data.ok) {
      return new Response(JSON.stringify({ error: data.error }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type"
        }
      });
    }

    allChannels.push(...data.channels.filter((ch) => (ch.name.startsWith("aem-") && ch.purpose?.value?.includes("Edge Delivery"))));

    cursor = data.response_metadata?.next_cursor || null;
  } while (cursor);

  console.log("Total channels found:", allChannels.length);

  return new Response(JSON.stringify(allChannels), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json"
    }
  });
}

async function handleLastMessage(token, channelId) {
  const url = `https://slack.com/api/conversations.history?channel=${channelId}&limit=1`;

  let response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json();

  if (!data.ok) {
    return new Response(JSON.stringify({ error: data.error }), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type"
      }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Content-Type": "application/json"
    }
  });
}
