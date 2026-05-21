import { changePasswordSchema, loginSchema } from '@search-builder/types';
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { requireSession } from '../auth/middleware';
import { setPasswordHash, verifyPassword } from '../auth/password';
import { rateLimit } from '../auth/rate-limit';
import { createSession, deleteOtherSessions, deleteSession, getValidSession } from '../auth/sessions';
import { env } from '../env';

const loginLimiter = rateLimit({ max: 5, windowMs: 15 * 60 * 1000 });

export const authRoute = new Hono();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'Lax' as const,
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  };
}

authRoute.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'unknown';
  const limit = loginLimiter.check(ip);
  if (!limit.allowed) {
    return c.json({ error: 'too many attempts', code: 'rate_limited', retry_after: limit.retryAfter }, 429);
  }
  const body = loginSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  }
  const ok = await verifyPassword(body.data.password);
  if (!ok) return c.json({ error: 'invalid credentials', code: 'unauthorized' }, 401);
  const session = await createSession();
  setCookie(c, 'sid', session.id, cookieOptions());
  return c.json({ authenticated: true, expires_at: session.expires_at });
});

authRoute.post('/logout', async (c) => {
  const sid = getCookie(c, 'sid');
  if (sid) await deleteSession(sid);
  deleteCookie(c, 'sid', { path: '/' });
  return c.body(null, 204);
});

authRoute.get('/me', async (c) => {
  const sid = getCookie(c, 'sid');
  if (!sid) return c.json({ authenticated: false });
  const session = await getValidSession(sid);
  return c.json({ authenticated: !!session });
});

authRoute.post('/change-password', requireSession, async (c) => {
  const session = c.get('session');
  const body = changePasswordSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: 'invalid body', code: 'validation_error', issues: body.error.issues }, 400);
  }
  const ok = await verifyPassword(body.data.old);
  if (!ok) return c.json({ error: 'invalid credentials', code: 'unauthorized' }, 401);
  await setPasswordHash(body.data.new);
  await deleteOtherSessions(session.id);
  return c.json({ ok: true });
});
