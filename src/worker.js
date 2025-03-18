
const options = async (request) => {
    if (request.method === 'OPTIONS') {
      return new Response('', {
        headers: { 'Access-Control-Allow-Origin': "*",
                   'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                   'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                 }
      });
    }
}

export default {
    async fetch(request, env) {
        const SLACK_API_URL = "https://slack.com/api/conversations.list?exclude_archived=true&limit=9999";
        const SLACK_API_KEY = `${env.SLACK_BOT_KEY}`;
        let cursor = null;
        let allChannels = [];

        if (request.method === 'OPTIONS') {
            return options(request);
        }

		const allowedOrigin = "https://main--eds-channel-tracker-worker--clotton.aem"; // Change to your domain
		const originHeader = request.headers.get("Origin");

		if (!originHeader || !originHeader.startsWith(allowedOrigin)) {
			return new Response("Forbidden", {
                status: 403,
                headers: { 'Access-Control-Allow-Origin': "*",
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                }
            });
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
                "Access-Control-Allow-Headers": "Authorization, Content-Type",
                "Content-Type": "application/json"
            }
        });
    }
};
