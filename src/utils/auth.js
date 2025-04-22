export const authenticate = async (env) => {
  const authData = {
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    grant_type: 'client_credentials',
    resource: 'https://graph.microsoft.com',
    scope: 'https://graphs.microsoft.com/.default'
  };
  const formData = new FormData();
  for(let key in authData) {
    formData.append(key, authData[key]);
  }

  const authUrl = 'https://login.microsoftonline.com/36fb8e1d-a891-493f-96d0-3038e4e9291c/oauth2/token';
  const authRes = await fetch(authUrl, {
    method: 'POST',
    body: formData,
  });
  if (authRes.status === 200) {
    const auth = await authRes.json();
    return auth.access_token;
  }
  return null;
}
