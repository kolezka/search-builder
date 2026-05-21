import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { addChild, removeAt, updateAt, moveNode } from '../src/lib/builder/node-ops';

const G = (children: QueryNode[]): QueryNode => ({ type: 'group', op: 'AND', children });
const T = (v: string): QueryNode => ({ type: 'term', value: v });

describe('node-ops', () => {
  test('addChild appends to group at path', () => {
    const t = G([T('a')]);
    const next = addChild(t, [], T('b'));
    expect((next as { children: QueryNode[] }).children.map((c) => (c as { value: string }).value)).toEqual(['a', 'b']);
  });
  test('removeAt removes child by index path', () => {
    const t = G([T('a'), T('b'), T('c')]);
    const next = removeAt(t, [1]);
    expect((next as { children: QueryNode[] }).children.map((c) => (c as { value: string }).value)).toEqual(['a', 'c']);
  });
  test('updateAt replaces node deeply', () => {
    const t = G([G([T('inner')])]);
    const next = updateAt(t, [0, 0], (n) => ({ ...(n as { type: 'term'; value: string }), value: 'updated' }));
    const inner = ((next as { children: QueryNode[] }).children[0] as { children: QueryNode[] }).children[0];
    expect((inner as { value: string }).value).toBe('updated');
  });
  test('moveNode moves between groups', () => {
    const t = G([G([T('a'), T('b')]), G([])]);
    const next = moveNode(t, [0, 0], [1, 0]);
    const left = (next as { children: QueryNode[] }).children[0] as { children: QueryNode[] };
    const right = (next as { children: QueryNode[] }).children[1] as { children: QueryNode[] };
    expect(left.children.map((c) => (c as { value: string }).value)).toEqual(['b']);
    expect(right.children.map((c) => (c as { value: string }).value)).toEqual(['a']);
  });
});
