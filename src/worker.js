export default {
  async fetch(request, env) {
    const { SLACK_BOT_KEY, SLACK_USER_KEY } = env;
    const allowedOrigin = "https://main--eds-channel-tracker--aemdemos.aem";
    const originHeader = request.headers.get("Origin");
    const requestUrl = new URL(request.url);
    const path = requestUrl.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    /*
    if (originHeader && !originHeader.startsWith(allowedOrigin)) {
      return new Response("Forbidden", {
        status: 403,
        headers: corsHeaders()
      });
    }
*/
    if (path === "/slack/channels") {
      return handleChannels(SLACK_BOT_KEY);
    } else if (path === "/slack/lastmessage") {
      const channelId = requestUrl.searchParams.get("channelId");
      if (!channelId) {
        return new Response("Bad Request: Missing channelId", {
          status: 400,
          headers: corsHeaders()
        });
      }
      return handleLastMessage(SLACK_USER_KEY,channelId);
    }
    else {
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

async function handleChannels(token) {
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
    allChannels.push(...data.channels.filter(ch=> ch.name.startsWith("aem-") && ch.purpose?.value?.includes("Edge Delivery")));
    cursor = data.response_metadata?.next_cursor || null;
  } while (cursor);

  console.log("Total channels found:", allChannels.length);
  return jsonResponse(allChannels);
}

async function handleLastMessage(token, channelId) {
  const apiUrl = `https://slack.com/api/conversations.history?channel=${channelId}&limit=1`;
  const response = await fetch(apiUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  //const data = await handleApiResponse(response);
  //return jsonResponse(data.messages?.[0]);
  return response;
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
