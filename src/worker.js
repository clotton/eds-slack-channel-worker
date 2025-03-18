/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */


const options = async (request) => {
    if (request.method === 'OPTIONS') {
      return new Response('', {
        headers: { 'Access-Control-Allow-Origin': "*",
                   'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                   'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
                 }
      });
    }
    return new Response('Not found', {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': "*",
                 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                 'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
               }
    });
  };

export default {
    async fetch(request, env) {
        const SLACK_API_URL = "https://slack.com/api/conversations.list?exclude_archived=true&limit=9999";
        const SLACK_API_KEY = `${env.SLACK_BOT_KEY}`;
        let cursor = null;
        let allChannels = [];

        if (request.method === 'OPTIONS') {
            return options(request);
        }

		const allowedOrigin = "https://main--eds-channel-tracker--clotton.aem"; // Change to your domain
		const originHeader = request.headers.get("Origin");

		if (!originHeader || !originHeader.startsWith(allowedOrigin)) {
			return new Response("Forbidden", { status: 403 });
		}

        do {
            const url = cursor ? `${SLACK_API_URL}&cursor=${cursor}` : SLACK_API_URL;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ` + SLACK_API_KEY,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();
            if (!data.ok) {
                return new Response(JSON.stringify({ error: data.error }), { status: 400 });
            }

            for (const item in data.channels){
              // @ts-ignore
              console.log("item.id:"+ item.id);
              // @ts-ignore
              const url2 = `https://slack.com/api/conversations.history?channel=C06SFM04GAU&limit=1`;

              // Make the second request with query parameters in the URL
              const response2 = await fetch(url2, {
                  method: "GET",
                  headers: {
                    "Authorization": `Bearer ` + SLACK_API_KEY,
                    "Content-Type": "application/json"
                  }
              });

              const data2 = await response2.json();
              // Check if the second request was successful
              if (!data2.ok) {
                  // @ts-ignore
                  console.error(`Failed to fetch last activity for channel ${item.id}: ${data2.error}`);
                  continue;  // Skip this channel if there's an error
              }

              // Extract the timestamp of the latest message
              const latest_message = data2.messages[0] || {};  // Default to an empty object if no messages
              const last_activity_timestamp = latest_message.ts ? parseFloat(latest_message.ts) : null;

              // Merge data
              const mergedItem = {
                // @ts-ignore
                ...item,
                last_activity_timestamp
              };

              console.log("mergedItem:", mergedItem);
              // Only push channels starting with "aem-"
          //    if (mergedItem.name.startsWith("aem-")) {
          //      allChannels.push(mergedItem);
          //  }
            }
            allChannels.push(...data.channels.filter(ch => ch.name.startsWith("aem-")));

            // Get next cursor if there are more channels
            cursor = data.response_metadata?.next_cursor || null;

        } while (cursor); // Continue fetching if there's a next_cursor

        console.log("Total channels found:", allChannels.length);

        // Return filtered list with proper CORS headers
        return new Response(JSON.stringify(allChannels), {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Authorization, Content-Type, x-api-key",
                "Content-Type": "application/json"
            }
        });
    }
};
