import { describe, expect, test } from 'bun:test';
import type { QueryNode } from '@search-builder/types';
import { shodan } from '../src/shodan';

const T = (value: string, opts: Partial<{ exactMatch: boolean; negated: boolean }> = {}): QueryNode => ({
  type: 'term',
  value,
  ...opts,
});
const OP = (key: string, value: string, negated = false): QueryNode => ({
  type: 'operator',
  key,
  value,
  negated,
});
const G = (op: 'AND' | 'OR', children: QueryNode[], negated = false): QueryNode => ({
  type: 'group',
  op,
  children,
  negated,
});

describe('shodan.serializeTree', () => {
  test('operator inline', () => {
    expect(shodan.serializeTree(G('AND', [OP('port', '80')]))).toBe('port:80');
  });
  test('term and operator combined', () => {
    expect(shodan.serializeTree(G('AND', [T('apache'), OP('port', '443')]))).toBe('apache port:443');
  });
  test('negated operator prefixes with minus', () => {
    expect(shodan.serializeTree(G('AND', [OP('country', 'CN', true)]))).toBe('-country:CN');
  });
  test('OR group wraps in parens', () => {
    expect(shodan.serializeTree(G('AND', [G('OR', [OP('port', '3389'), OP('port', '5900')])]))).toBe(
      '(port:3389 OR port:5900)',
    );
  });
  test('CVE query', () => {
    expect(shodan.serializeTree(G('AND', [OP('vuln', 'CVE-2021-44228')]))).toBe('vuln:CVE-2021-44228');
  });
  test('complex network search', () => {
    const tree = G('AND', [
      OP('country', 'PL'),
      G('OR', [OP('port', '22'), OP('port', '23')]),
      OP('has_screenshot', 'true'),
    ]);
    expect(shodan.serializeTree(tree)).toBe('country:PL (port:22 OR port:23) has_screenshot:true');
  });
});

describe('shodan.buildUrl', () => {
  test('encodes query', () => {
    const tree = G('AND', [OP('port', '80'), OP('country', 'PL')]);
    expect(shodan.buildUrl(tree)).toBe(
      `https://www.shodan.io/search?query=${encodeURIComponent('port:80 country:PL')}`,
    );
  });
});

describe('shodan.validateValue', () => {
  test('port accepts number, list, range', () => {
    expect(shodan.validateValue('port', '80')).toBeNull();
    expect(shodan.validateValue('port', '80,443')).toBeNull();
    expect(shodan.validateValue('port', '8000-8100')).toBeNull();
    expect(shodan.validateValue('port', 'abc')).not.toBeNull();
  });
  test('country requires 2 uppercase letters', () => {
    expect(shodan.validateValue('country', 'PL')).toBeNull();
    expect(shodan.validateValue('country', 'pl')).not.toBeNull();
    expect(shodan.validateValue('country', 'POL')).not.toBeNull();
  });
  test('http.status requires number 100-599', () => {
    expect(shodan.validateValue('http.status', '200')).toBeNull();
    expect(shodan.validateValue('http.status', '999')).not.toBeNull();
  });
  test('vuln expects CVE pattern', () => {
    expect(shodan.validateValue('vuln', 'CVE-2021-44228')).toBeNull();
    expect(shodan.validateValue('vuln', '44228')).not.toBeNull();
  });
  test('before/after expect DD/MM/YYYY', () => {
    expect(shodan.validateValue('before', '01/01/2024')).toBeNull();
    expect(shodan.validateValue('before', '2024-01-01')).not.toBeNull();
  });
});
