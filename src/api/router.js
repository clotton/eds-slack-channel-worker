import * as slack from './slack.js';
import * as teams from './teams.js';
import {errorResponse} from '../utils/response.js';
import{authenticate} from '../utils/auth.js';

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
                return slack.handleMessageStats(SLACK_USER_KEY, channelId);
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
    // Teams routes
    if (segments[0] === 'teams') {
        const bearer = await authenticate(env);

        switch (segments[1]) {
            case 'teamMembers': {
                const teamId = search.get("teamId");
                const name = search.get("teamName");
                if (!teamId && !name) return errorResponse("Missing teamId or teamName");
                return teams.getTeamMembers({ id: teamId, name, bearer:bearer});
            }
            case 'allTeams': {
                const nameFilter = search.get("nameFilter");
                const descriptionFilter = search.get("descriptionFilter");
                return teams.getAllTeams(bearer, nameFilter, descriptionFilter);
            }
            case 'team': {
                const teamId =  search.get("teamId");
                if (!teamId) return errorResponse("Missing teamId");
                return teams.getTeam(teamId, bearer);
            }
            case 'channels': {
                const teamId = search.get("teamId");
                if (!teamId) return errorResponse("Missing teamId");
                return teams.getChannels(teamId, bearer);
            }
            case 'channelStats': {
                const teamId = search.get("teamId");
                const channelId = search.get("channelId");
                if (!teamId || !channelId) return errorResponse("Missing teamId or channelId");
                return teams.getChannelActivityStats(teamId, channelId, bearer);
            }
        }
    }

    return new Response("Not Found", { status: 404, headers: { 'Content-Type': 'text/plain' } });
}
