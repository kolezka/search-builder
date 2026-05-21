import type { EngineKey, QueryNode } from '@search-builder/types';
import { MAX_TREE_DEPTH, treeDepth } from '@search-builder/types';
import { getEngine } from './index';
import type { ValidationError } from './types';

export function validateTree(engine: EngineKey, tree: QueryNode): ValidationError[] {
  const errors: ValidationError[] = [];
  const depth = treeDepth(tree);
  if (depth > MAX_TREE_DEPTH) {
    errors.push({ path: '', message: `Tree depth ${depth} exceeds max ${MAX_TREE_DEPTH}` });
    return errors;
  }
  const adapter = getEngine(engine);
  const operatorKeys = new Set(adapter.operators.map((o) => o.key));
  const walk = (node: QueryNode, path: string): void => {
    if (node.type === 'operator') {
      if (!operatorKeys.has(node.key)) {
        errors.push({ path, message: `Unknown operator '${node.key}' for engine ${engine}` });
        return;
      }
      const err = adapter.validateValue(node.key, node.value);
      if (err) errors.push({ path, message: err });
      return;
    }
    if (node.type === 'group') {
      node.children.forEach((c, i) => walk(c, `${path ? `${path}.` : ''}children[${i}]`));
    }
  };
  walk(tree, '');
  return errors;
}
