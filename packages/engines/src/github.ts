import type { QueryNode } from '@search-builder/types';
import { githubOperators } from './operators/github';
import { isEmpty, needsQuoting, quote } from './serialize-helpers';
import type { EngineAdapter } from './types';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    const body = node.exactMatch || needsQuoting(node.value) ? quote(node.value) : node.value;
    return node.negated ? `NOT ${body}` : body;
  }
  if (node.type === 'operator') {
    if (node.value.trim() === '') return '';
    const value = needsQuoting(node.value) ? quote(node.value) : node.value;
    const body = `${node.key}:${value}`;
    return node.negated ? `-${body}` : body;
  }
  const parts: string[] = [];
  for (const c of node.children) {
    if (isEmpty(c)) continue;
    parts.push(serializeNode(c, false));
  }
  const joiner = node.op === 'AND' ? ' ' : ' OR ';
  const joined = parts.filter(Boolean).join(joiner);
  if (isTop) return joined;
  let body = joined;
  if (node.negated) body = `NOT (${joined})`;
  return body;
}

function serializeTree(tree: QueryNode): string {
  return serializeNode(tree, true);
}

function buildUrl(tree: QueryNode): string {
  const q = serializeTree(tree);
  return `https://github.com/search?type=code&q=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'repo') {
    return /^[\w.-]+\/[\w.-]+$/.test(value) ? null : 'Expected owner/name';
  }
  if (operatorKey === 'size' || operatorKey === 'stars' || operatorKey === 'forks') {
    return /^([<>]=?\d+|\d+\.\.\d+|\d+)$/.test(value) ? null : 'Expected number, >n, <n, n..m';
  }
  if (operatorKey === 'created' || operatorKey === 'pushed') {
    return /^([<>]=?)?\d{4}-\d{2}-\d{2}(\.\.\d{4}-\d{2}-\d{2})?$/.test(value)
      ? null
      : 'Expected YYYY-MM-DD or >YYYY-MM-DD or YYYY-MM-DD..YYYY-MM-DD';
  }
  return null;
}

export const github: EngineAdapter = {
  key: 'github',
  name: 'GitHub Code Search',
  icon: 'simple-icons:github',
  baseUrl: 'https://github.com/search',
  queryParam: 'q',
  operators: githubOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
