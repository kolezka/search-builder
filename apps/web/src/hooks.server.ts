import type { Handle } from '@sveltejs/kit';

const API_INTERNAL_URL = (process.env.API_INTERNAL_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/')) {
    return resolve(event);
  }

  const upstream = `${API_INTERNAL_URL}${event.url.pathname}${event.url.search}`;
  const { method } = event.request;
  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    return await fetch(upstream, {
      method,
      headers: event.request.headers,
      body: hasBody ? await event.request.arrayBuffer() : undefined,
      redirect: 'manual',
    });
  } catch {
    return new Response(JSON.stringify({ error: 'api_unreachable', code: 'api_unreachable' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
};
