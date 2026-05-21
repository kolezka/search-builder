import { describe, expect, test } from 'bun:test';
import { rateLimit } from '../src/auth/rate-limit';

describe('rateLimit', () => {
  test('allows up to N hits then blocks', () => {
    const limiter = rateLimit({ max: 3, windowMs: 60_000 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check('ip-1')).toEqual({ allowed: true, remaining: 0 });
    expect(limiter.check('ip-1').allowed).toBe(false);
  });
  test('separate keys do not share budget', () => {
    const limiter = rateLimit({ max: 1, windowMs: 60_000 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('b').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
  });
  test('window expiry resets', async () => {
    const limiter = rateLimit({ max: 1, windowMs: 10 });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(limiter.check('a').allowed).toBe(true);
  });
});
