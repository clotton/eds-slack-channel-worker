import * as slack from './slack.js';
import { errorResponse } from '../utils/response.js';

export async function router(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const search = url.searchParams;
    const segments = path.split('/').filter(Boolean);

    const { SLACK_BOT_KEY, SLACK_USER_KEY } = env;

    // Slack routes
    if (segments[0] === 'slack') {
        switch (segments[1]) {
            case 'channels':
                return slack.handleChannels(SLACK_BOT_KEY, search.get("channelName"), search.get("description"));
            case 'messageStats': {
                const channelId = search.get("channelId");
                if (!channelId) return errorResponse("Missing channelId");
                return slack.handleMessageStatsRequest(channelId, env);
            }
            case 'members': {
                const channelId = search.get("channelId");
                if (!channelId) return errorResponse("Missing channelId");
                return slack.handleMembers(SLACK_BOT_KEY, channelId);
            }
            case 'user':
                if (segments[2] === 'info') {
                    const userId = search.get("userId");
                    if (!userId) return errorResponse("Missing userId");
                    return slack.handleUserInfo(SLACK_BOT_KEY, userId);
                }
        }
    }

    return new Response("Not Found", { status: 404, headers: { 'Content-Type': 'text/plain' } });
}
