import type { QueryNode } from '@search-builder/types';
import { googleOperators } from './operators/google';
import { isEmpty, needsQuoting, quote } from './serialize-helpers';
import type { EngineAdapter } from './types';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    const body = node.exactMatch
      ? quote(node.value)
      : needsQuoting(node.value)
        ? quote(node.value)
        : node.value;
    return node.negated ? `-${body}` : body;
  }
  if (node.type === 'operator') {
    if (node.value.trim() === '') return '';
    const value = needsQuoting(node.value) ? quote(node.value) : node.value;
    const body = `${node.key}:${value}`;
    return node.negated ? `-${body}` : body;
  }
  // group
  const parts: string[] = [];
  const children = node.children;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (isEmpty(c)) continue;
    // Special: AROUND inlines as macro between siblings of an AND group
    if (
      node.op === 'AND' &&
      c.type === 'operator' &&
      c.key === 'AROUND' &&
      !c.negated &&
      i > 0 &&
      i < children.length - 1
    ) {
      parts.push(`AROUND(${c.value})`);
      continue;
    }
    parts.push(serializeNode(c, false));
  }
  const joiner = node.op === 'AND' ? ' ' : ' OR ';
  const joined = parts.filter(Boolean).join(joiner);
  if (isTop) return joined;
  const wrap = node.op === 'OR' || parts.length > 1;
  let body = wrap ? `(${joined})` : joined;
  if (node.negated) body = `-${body}`;
  return body;
}

function serializeTree(tree: QueryNode): string {
  return serializeNode(tree, true);
}

function buildUrl(tree: QueryNode): string {
  const q = serializeTree(tree);
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'before' || operatorKey === 'after') {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : 'Expected YYYY-MM-DD';
  }
  if (operatorKey === 'AROUND') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return 'Expected positive integer';
    return null;
  }
  if (operatorKey === 'daterange') {
    return /^\d{7}-\d{7}$/.test(value) ? null : 'Expected Julian range like 2459580-2459700';
  }
  return null;
}

export const google: EngineAdapter = {
  key: 'google',
  name: 'Google',
  icon: 'simple-icons:google',
  baseUrl: 'https://www.google.com/search',
  queryParam: 'q',
  operators: googleOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
