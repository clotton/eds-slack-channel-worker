import { jsonResponse } from '../utils/response.js';
import { isHumanMessage } from '../utils/common.js';

export async function logSearchAttempt({ searchBy, searchName, searchDescription }, env) {
    const webhookUrl = env.SLACK_WEBHOOK_URL; // Replace with your webhook
    const message = {
        text: `👤 *${searchBy}* searched slack for name: *${searchName}* and description: *${searchDescription}*`,
    };
    await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
    });
}

export async function handleChannels(token, searchBy, rawChannelName, rawDescription, env) {
    const SLACK_API_URL = "https://slack.com/api/conversations.list?exclude_archived=true&limit=9999";
    let cursor = null, allChannels = [];

    const channelName = rawChannelName && rawChannelName !== '*' ? rawChannelName.replace(/\*/g, '') : undefined;
    const description = rawDescription && rawDescription !== '*' ? rawDescription.replace(/\*/g, '') : undefined;

    await logSearchAttempt({
        searchBy: searchBy, // Ensure this is set in data
        searchName: channelName,
        searchDescription: description,
    }, env);

    do {
        const apiUrl = cursor ? `${SLACK_API_URL}&cursor=${cursor}` : SLACK_API_URL;
        const response = await fetch(apiUrl, {
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
        const filteredChannels = data.channels.filter((ch) => {
            const matchesName = channelName ? ch.name.toLowerCase().includes(channelName.toLowerCase()) : true;
            const matchesDescription = description ? (ch.purpose?.value || '').toLowerCase().includes(description.toLowerCase()) : true;
            return matchesName && matchesDescription;
        });

        allChannels.push(...filteredChannels);
        cursor = data.response_metadata?.next_cursor || null;
    } while (cursor);

    return jsonResponse(allChannels);
}

export async function handleMessageStatsRequest(channelId, env) {

    if (!channelId) {
        return new Response('Missing channelId', { status: 400 });
    }

    try {
        const raw = await env.SLACK_KV.get(channelId);
        const messageStats = raw ? JSON.parse(raw) : null;
        console.log(`Fetched stats from KV for channel ${channelId}:`, messageStats);
        return jsonResponse(messageStats);
    } catch (err) {
        console.error(`Error fetching stats for channel ${channelId}:`, err);
        return new Response(JSON.stringify({ error: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
}

export async function getMessageStats(token, channelId) {
    const url = `https://slack.com/api/conversations.history?channel=${channelId}&limit=1000`;
    const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60);

    const response = await fetch(url, {
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
    humanMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
    const recentMessages = humanMessages.filter(m => parseFloat(m.ts) >= thirtyDaysAgo);

    return jsonResponse({
        totalMessages: humanMessages.length,
        recentMessageCount: recentMessages.length,
        lastMessageTimestamp: humanMessages.at(-1)?.ts || null
    });
}

export async function handleMembers(token, channelId) {
    const url = `https://slack.com/api/conversations.members?channel=${channelId}`;
    return fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}

export async function handleUserInfo(token, userId) {
    const url = `https://slack.com/api/users.info?user=${userId}`;
    return fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
}
