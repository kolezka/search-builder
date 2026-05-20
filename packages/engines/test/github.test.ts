import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { github } from '../src/github';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({ type: 'operator', key, value, negated });
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({ type: 'group', op, children, negated });

describe('github.serializeTree', () => {
  test('terms AND-joined by space', () => {
    expect(github.serializeTree(G('AND', [T('TODO'), T('fixme')]))).toBe('TODO fixme');
  });

  test('operator inline', () => {
    expect(github.serializeTree(G('AND', [OP('language', 'typescript')]))).toBe('language:typescript');
  });

  test('negated operator prefixes with minus', () => {
    expect(github.serializeTree(G('AND', [OP('language', 'javascript', true)]))).toBe('-language:javascript');
  });

  test('OR group of operators', () => {
    expect(
      github.serializeTree(G('AND', [G('OR', [OP('language', 'typescript'), OP('language', 'javascript')])])),
    ).toBe('language:typescript OR language:javascript');
  });

  test('negated term uses NOT prefix', () => {
    expect(github.serializeTree(G('AND', [T('foo', { negated: true })]))).toBe('NOT foo');
  });

  test('exact-match term quoted', () => {
    expect(github.serializeTree(G('AND', [T('hello world', { exactMatch: true })]))).toBe('"hello world"');
  });

  test('complex query', () => {
    const tree = G('AND', [
      OP('repo', 'kolezka/search-builder'),
      OP('language', 'typescript'),
      OP('path', 'src/'),
      T('TODO'),
    ]);
    expect(github.serializeTree(tree)).toBe('repo:kolezka/search-builder language:typescript path:src/ TODO');
  });
});

describe('github.buildUrl', () => {
  test('url shape', () => {
    const tree = G('AND', [OP('language', 'typescript'), T('TODO')]);
    expect(github.buildUrl(tree)).toBe(
      `https://github.com/search?type=code&q=${encodeURIComponent('language:typescript TODO')}`,
    );
  });
});

describe('github.validateValue', () => {
  test('repo expects owner/name', () => {
    expect(github.validateValue('repo', 'torvalds/linux')).toBeNull();
    expect(github.validateValue('repo', 'just-a-name')).not.toBeNull();
  });
  test('size accepts comparison strings', () => {
    expect(github.validateValue('size', '>10000')).toBeNull();
    expect(github.validateValue('size', '100..200')).toBeNull();
    expect(github.validateValue('size', 'abc')).not.toBeNull();
  });
});
