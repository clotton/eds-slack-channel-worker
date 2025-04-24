let cachedBearerToken = null;
let tokenExpiryTime = null;

export const authenticate = async (env) => {
    const currentTime = Date.now();

    // Check if the token is cached and still valid
    if (cachedBearerToken && tokenExpiryTime && currentTime < tokenExpiryTime) {
        return cachedBearerToken;
    }

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

    if (!response.ok) {
        console.error('Authentication failed:', response.statusText);
        return null;
    }

    const data = await response.json();
    cachedBearerToken = data.access_token; // Cache the token
    tokenExpiryTime = currentTime + (data.expires_in * 1000); // Set expiry time in milliseconds
    return cachedBearerToken;
}
