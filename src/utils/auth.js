let cachedBearerToken = null;

export const authenticate = async (env) => {
    if (cachedBearerToken) return cachedBearerToken;

    const authData = {
        client_id: env.CLIENT_ID,
        client_secret: env.CLIENT_SECRET,
        grant_type: 'client_credentials',
        resource: 'https://graph.microsoft.com',
        scope: 'https://graphs.microsoft.com/.default'
    };
    const formData = new URLSearchParams(authData);
    const response = await fetch(env.AUTH_URL, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) return null;

    const data = await response.json();
    cachedBearerToken = data.access_token; // Cache the token
    return cachedBearerToken;
}
