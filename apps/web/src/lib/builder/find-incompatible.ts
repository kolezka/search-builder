import { getEngine } from '@search-builder/engines';
import type { EngineKey, OperatorSpec, QueryNode } from '@search-builder/types';

export function findIncompatibleOperators(tree: QueryNode, target: EngineKey): string[] {
  const valid = new Set(getEngine(target).operators.map((o: OperatorSpec) => o.key));
  const out: string[] = [];
  const walk = (n: QueryNode): void => {
    if (n.type === 'operator' && !valid.has(n.key)) out.push(n.key);
    if (n.type === 'group') n.children.forEach(walk);
  };
  walk(tree);
  return [...new Set(out)];
}

export function stripIncompatibleOperators(tree: QueryNode, target: EngineKey): QueryNode {
  const valid = new Set(getEngine(target).operators.map((o: OperatorSpec) => o.key));
  const walk = (n: QueryNode): QueryNode | null => {
    if (n.type === 'operator') return valid.has(n.key) ? n : null;
    if (n.type === 'group') {
      const children = n.children.map(walk).filter((c): c is QueryNode => c !== null);
      return { ...n, children };
    }
    return n;
  };
  return (walk(tree) as QueryNode) ?? { type: 'group', op: 'AND', children: [] };
}
