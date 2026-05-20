import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { google } from '../src/google';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({ type: 'operator', key, value, negated });
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({ type: 'group', op, children, negated });

describe('google.serializeTree', () => {
  test('single term', () => {
    expect(google.serializeTree(G('AND', [T('hello')]))).toBe('hello');
  });

  test('exact match quotes the term', () => {
    expect(google.serializeTree(G('AND', [T('hello world', { exactMatch: true })]))).toBe('"hello world"');
  });

  test('negated term prefixes with minus', () => {
    expect(google.serializeTree(G('AND', [T('spam', { negated: true })]))).toBe('-spam');
  });

  test('operator inline', () => {
    expect(google.serializeTree(G('AND', [OP('site', 'example.com')]))).toBe('site:example.com');
  });

  test('operator value with space gets quoted', () => {
    expect(google.serializeTree(G('AND', [OP('intitle', 'admin login')]))).toBe('intitle:"admin login"');
  });

  test('negated operator prefixes with minus', () => {
    expect(google.serializeTree(G('AND', [OP('site', 'github.com', true)]))).toBe('-site:github.com');
  });

  test('OR group is parenthesised', () => {
    expect(
      google.serializeTree(G('AND', [G('OR', [OP('intitle', 'admin'), OP('intitle', 'login')])])),
    ).toBe('(intitle:admin OR intitle:login)');
  });

  test('nested AND inside top AND inlines without extra parens', () => {
    expect(google.serializeTree(G('AND', [T('a'), G('AND', [T('b'), T('c')])]))).toBe('a (b c)');
  });

  test('negated group wraps in -(...)', () => {
    expect(google.serializeTree(G('AND', [G('OR', [T('a'), T('b')], true)]))).toBe('-(a OR b)');
  });

  test('AROUND renders specially when used between two terms in same group', () => {
    expect(
      google.serializeTree(G('AND', [T('claude'), OP('AROUND', '3'), T('anthropic')])),
    ).toBe('claude AROUND(3) anthropic');
  });

  test('complex realistic query', () => {
    const tree = G('AND', [
      G('OR', [OP('intitle', 'admin'), OP('intitle', 'login')]),
      OP('filetype', 'php'),
      OP('site', 'github.com', true),
    ]);
    expect(google.serializeTree(tree)).toBe('(intitle:admin OR intitle:login) filetype:php -site:github.com');
  });
});

describe('google.buildUrl', () => {
  test('encodes spaces and operators', () => {
    const tree = G('AND', [OP('intitle', 'admin login'), OP('site', 'example.com')]);
    const url = google.buildUrl(tree);
    expect(url.startsWith('https://www.google.com/search?q=')).toBe(true);
    expect(decodeURIComponent(url.split('q=')[1])).toBe('intitle:"admin login" site:example.com');
  });
});

describe('google.validateValue', () => {
  test('before/after accept YYYY-MM-DD', () => {
    expect(google.validateValue('before', '2024-01-01')).toBeNull();
    expect(google.validateValue('before', '01-01-2024')).not.toBeNull();
  });
  test('AROUND accepts positive integer', () => {
    expect(google.validateValue('AROUND', '3')).toBeNull();
    expect(google.validateValue('AROUND', '0')).not.toBeNull();
    expect(google.validateValue('AROUND', '-2')).not.toBeNull();
    expect(google.validateValue('AROUND', 'abc')).not.toBeNull();
  });
  test('unknown operator returns null (no opinion)', () => {
    expect(google.validateValue('unknown_op_xyz', 'foo')).toBeNull();
  });
});
