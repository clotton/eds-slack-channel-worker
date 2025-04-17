import * as slack from './slack.js';
import { jsonResponse, errorResponse } from '../utils/response.js';

export async function router(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const search = url.searchParams;

    const { SLACK_BOT_KEY, SLACK_USER_KEY } = env;

    if (path === "/slack/channels") {
        return slack.handleChannels(SLACK_BOT_KEY, search.get("channelName"), search.get("description"));

    } else if (path === "/slack/messageStats") {
        const channelId = search.get("channelId");
        if (!channelId) return errorResponse("Missing channelId");
        return slack.handleMessageStats(SLACK_USER_KEY, channelId);

    } else if (path === "/slack/members") {
        const channelId = search.get("channelId");
        if (!channelId) return errorResponse("Missing channelId");
        return slack.handleMembers(SLACK_BOT_KEY, channelId);

    } else if (path === "/slack/user/info") {
        const userId = search.get("userId");
        if (!userId) return errorResponse("Missing userId");
        return slack.handleUserInfo(SLACK_BOT_KEY, userId);
    }

    return new Response("Not Found", { status: 404, headers: { 'Content-Type': 'text/plain' } });
}
