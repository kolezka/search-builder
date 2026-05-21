import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { getValidSession } from './sessions';

declare module 'hono' {
  interface ContextVariableMap {
    session: { id: string; expires_at: number };
  }
}

export const requireSession: MiddlewareHandler = async (c, next) => {
  const sid = getCookie(c, 'sid');
  if (!sid) return c.json({ error: 'unauthorized', code: 'unauthorized' }, 401);
  const session = await getValidSession(sid);
  if (!session) return c.json({ error: 'unauthorized', code: 'unauthorized' }, 401);
  c.set('session', session);
  await next();
};

export function getSession(c: Context) {
  return c.get('session');
}
