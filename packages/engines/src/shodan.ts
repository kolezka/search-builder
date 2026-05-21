import type { QueryNode } from '@search-builder/types';
import { shodanOperators } from './operators/shodan';
import { isEmpty, needsQuoting, quote } from './serialize-helpers';
import type { EngineAdapter } from './types';

function serializeNode(node: QueryNode, isTop: boolean): string {
  if (node.type === 'term') {
    if (node.value.trim() === '') return '';
    const body = node.exactMatch || needsQuoting(node.value) ? quote(node.value) : node.value;
    return node.negated ? `-${body}` : body;
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
  return `https://www.shodan.io/search?query=${encodeURIComponent(q)}`;
}

function validateValue(operatorKey: string, value: string): string | null {
  if (operatorKey === 'port') {
    return /^(\d+)(,\d+)*$|^\d+-\d+$/.test(value) ? null : 'Expected number, comma-list, or range';
  }
  if (operatorKey === 'country') {
    return /^[A-Z]{2}$/.test(value) ? null : 'Expected 2-letter uppercase ISO-2';
  }
  if (operatorKey === 'http.status') {
    const n = Number(value);
    return Number.isInteger(n) && n >= 100 && n <= 599 ? null : 'Expected HTTP status 100-599';
  }
  if (operatorKey === 'vuln') {
    return /^CVE-\d{4}-\d{4,}$/.test(value) ? null : 'Expected CVE-YYYY-NNNN';
  }
  if (operatorKey === 'before' || operatorKey === 'after') {
    return /^\d{2}\/\d{2}\/\d{4}$/.test(value) ? null : 'Expected DD/MM/YYYY';
  }
  if (operatorKey === 'asn') {
    return /^AS\d+$/.test(value) ? null : 'Expected AS#####';
  }
  return null;
}

export const shodan: EngineAdapter = {
  key: 'shodan',
  name: 'Shodan',
  icon: 'simple-icons:shodan',
  baseUrl: 'https://www.shodan.io/search',
  queryParam: 'query',
  operators: shodanOperators,
  serializeTree,
  buildUrl,
  validateValue,
};
