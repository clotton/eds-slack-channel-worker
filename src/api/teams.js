
const getTeam = async (displayName, bearer) => {
    const params = new URLSearchParams({
        '$filter': `(displayName eq '${displayName}')`,
        '$select': 'id,displayName,createdDateTime',
    });

    const headers = {
        ConsistencyLevel: 'eventual',
        Authorization: `Bearer ${bearer}`,
    };

    const url = `https://graph.microsoft.com/v1.0/groups?${params}`

    const res = await fetch(url, {
        method: 'GET',
        headers,
    });

    const json = await res.json();
    if (json.value && json.value.length > 0) {
        return json.value[0];
    }

    return null;
}

const getTeamMembers = async (data) => {
    let { id, name, bearer } = data;
    if (!id && name) {
        const team = await getTeam(name, data.bearer);
        if (!team) return null;
        id = team.id;
    }

    const headers = {
        ConsistencyLevel: 'eventual',
        Authorization: `Bearer ${bearer}`,
    };

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

    return null;
}

const getAllTeams = async (data) => {
    const headers = {
        Authorization: `Bearer ${data.bearer}`,
    };

    const url = `https://graph.microsoft.com/v1.0/teams`;

    const res = await fetch(url, {
        method: 'GET',
        headers,
    });

    const json = await res.json();
    if (json && json.value) {
        return json.value.filter(o => o.visibility !== 'private').map(o => {
            return {
                id: o.id,
                displayName: o.displayName,
                description: o.description,
            };
        });
    }

    return null;
}

const getChannels = async (teamId, bearer) => {
    const headers = {
        Authorization: `Bearer ${bearer}`,
    };

    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;

    const res = await fetch(url, {
        method: 'GET',
        headers,
    });

    const json = await res.json();
    if (json && json.value) {
        return json.value;
    }

    return null;
}

const getChannelActivityStats = async (teamId, channelId, bearer) => {
    const headers = {
        Authorization: `Bearer ${bearer}`,
    };

    const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=50&$expand=replies`;

    const res = await fetch(url, {
        method: 'GET',
        headers,
    });

    const json = await res.json();
    if (json && json.value) {
        let lastActivity = null;
        let total = 0;
        json.value.filter(o => o.messageType === 'message' && !o.deletedDateTime).map(o => {
            const d = new Date(o.lastModifiedDateTime);
            total++;
            if (d > lastActivity) {
                lastActivity = d;
            }
            if (o.replies) {
                o.replies.forEach(r => {
                    const rd = new Date(r.lastModifiedDateTime);
                    total++;
                    if (rd > lastActivity) {
                        lastActivity = rd;
                    }
                });
            }
        });
        return  {
            lastActivity,
            total,
        };
    }

    return null;
}

export {
    getTeam,
    getTeamMembers,
    getAllTeams,
    getChannels,
    getChannelActivityStats,
}
