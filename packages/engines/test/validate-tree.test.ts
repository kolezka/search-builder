import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { validateTree } from '../src/validate-tree';

const OP = (key: string, value: string): QueryNode => ({ type: 'operator', key, value });
const T = (value: string): QueryNode => ({ type: 'term', value });
const G = (op: 'AND' | 'OR', children: QueryNode[]): QueryNode => ({ type: 'group', op, children });

describe('validateTree', () => {
  test('valid google tree has no errors', () => {
    const tree = G('AND', [OP('intitle', 'admin'), OP('site', 'example.com')]);
    expect(validateTree('google', tree)).toEqual([]);
  });

  test('unknown operator key fails', () => {
    const tree = G('AND', [OP('nonsense', 'foo')]);
    const errors = validateTree('google', tree);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('Unknown operator');
  });

  test('value validator failure surfaces', () => {
    const tree = G('AND', [OP('before', 'not-a-date')]);
    const errors = validateTree('google', tree);
    expect(errors.length).toBe(1);
    expect(errors[0].message).toContain('YYYY-MM-DD');
  });

  test('depth > 8 fails', () => {
    let leaf: QueryNode = T('x');
    for (let i = 0; i < 9; i++) leaf = G('AND', [leaf]);
    const errors = validateTree('google', leaf);
    expect(errors.some((e) => e.message.includes('depth'))).toBe(true);
  });

  test('reports path for nested errors', () => {
    const tree = G('AND', [G('OR', [OP('nonsense', 'foo')])]);
    const errors = validateTree('google', tree);
    expect(errors[0].path).toBe('children[0].children[0]');
  });
});
