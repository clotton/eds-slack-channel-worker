import {jsonResponse} from "../utils/response";
const createHeaders = (bearer, consistencyLevel = 'eventual') => ({
    Authorization: `Bearer ${bearer}`,
    ConsistencyLevel: consistencyLevel,
    "Content-Type": "application/json",
});

const getAllTeams = async (bearer) => {
    const headers = createHeaders(bearer);
    const url = `https://graph.microsoft.com/v1.0/teams`;

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) return response;

    const json = await response.json();
    const allTeams = json?.value?.filter(o => o.visibility !== 'private').map(o => ({
        id: o.id,
        displayName: o.displayName,
        description: o.description,
    })) || [];

    return jsonResponse(allTeams);
};

const getTeam = async (teamId, bearer ) => {
    const headers = createHeaders(bearer);
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}`;
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) return response;

    const { id, createdDateTime, webUrl, summary } = await response.json();
    return jsonResponse({
        id,
        createdDateTime,
        webUrl,
        ownersCount: summary?.ownersCount|| 0,
        membersCount: summary?.membersCount|| 0,
        guestsCount: summary?.guestsCount|| 0,
    });
};

const getChannels = async (teamId, bearer) => {
    const headers = createHeaders(bearer);
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;
    const response = await fetch(url, {
        method: 'GET',
        headers,
    });
    if (!response.ok) return response;

    const data = await response.json();
    return jsonResponse(data || []);
}

const getChannelActivityStats = async (teamId, channelId, bearer) => {
    const headers = createHeaders(bearer);
    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50&$expand=replies`;
    const response = await fetch(url, {
        method: 'GET',
        headers,
    });

    if (!response.ok) return response;

    const json = await response.json();
    if (json && json.value) {
        let lastActivity = null;
        let total = 0;
        let recentMessageCount = 0;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        json.value
          .filter(o => o.messageType === 'message' && !o.deletedDateTime)
          .forEach(o => {
              const messageDate = new Date(o.lastModifiedDateTime);
              total++;
              if (messageDate >= thirtyDaysAgo) {
                  recentMessageCount++;
              }
              if (!lastActivity || messageDate > lastActivity) {
                  lastActivity = messageDate;
              }
              if (o.replies) {
                  o.replies.forEach(r => {
                      const replyDate = new Date(r.lastModifiedDateTime);
                      total++;
                      if (!lastActivity || replyDate > lastActivity) {
                          lastActivity = replyDate;
                      }
                  });
              }
          });

        return jsonResponse({
            lastActivity: lastActivity ? lastActivity.toISOString() : null,
            totalMessages: total,
            recentMessageCount,
        });
    }

    return jsonResponse({ lastActivity: null, totalMessages: 0, recentMessageCount: 0  });
};

const getTeamMembers = async (data) => {
    let { id, name, bearer } = data;
    if (!id && name) {
        const team = await getTeam(id, bearer);
        if (!team) return null;
        id = team.id;
    }
    const headers = createHeaders(bearer);
    const url = `https://graph.microsoft.com/v1.0/teams/${id}/members`

    const res = await fetch(url, {
        method: 'GET',
        headers,
    });

    const json = await res.json();
    if (json.value) {
        return json.value.map(o => {
            return {
                email: o.email,
                displayName: o.displayName,
                role: o.roles && o.roles.length > 0 ? o.roles[0] : 'unknown',
            };
        });
    }

    return jsonResponse([]);
}


export {
    getAllTeams,
    getTeam,
    getChannels,
    getTeamMembers,
    getChannelActivityStats,
}
