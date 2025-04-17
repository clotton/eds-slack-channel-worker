import { corsHeaders } from './cors.js';

export function jsonResponse(data) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
        }
    });
}

export function errorResponse(error) {
    return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: {
            ...corsHeaders(),
            "Content-Type": "application/json"
        }
    });
}

export async function handleApiResponse(response) {
    const data = await response.json();
    if (!response.ok || !data.ok) {
        throw new Error(data.error || response.statusText);
    }
    return data;
}
