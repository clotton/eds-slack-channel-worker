import { router } from './api/router.js';
import { corsHeaders } from './utils/cors.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const originHeader = request.headers.get("Origin");
    const allowedOrigin = "eds-channel-tracker--aemdemos.aem";
    if (originHeader && !originHeader.includes(allowedOrigin)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders() });
    }
    return router(request, env);
  }
};
