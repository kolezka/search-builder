import type { QueryNode } from '@search-builder/types';

export type Path = number[];

function isGroup(n: QueryNode): n is QueryNode & { type: 'group'; children: QueryNode[] } {
  return n.type === 'group';
}

export function addChild(root: QueryNode, path: Path, child: QueryNode): QueryNode {
  if (!isGroup(root)) throw new Error('cannot add child to non-group root');
  if (path.length === 0) return { ...root, children: [...root.children, child] };
  const [head, ...rest] = path;
  const newChildren = root.children.slice();
  newChildren[head] = addChild(newChildren[head], rest, child);
  return { ...root, children: newChildren };
}

export function removeAt(root: QueryNode, path: Path): QueryNode {
  if (path.length === 0) throw new Error('cannot remove root');
  if (!isGroup(root)) throw new Error('path traverses non-group');
  const [head, ...rest] = path;
  const newChildren = root.children.slice();
  if (rest.length === 0) newChildren.splice(head, 1);
  else newChildren[head] = removeAt(newChildren[head], rest);
  return { ...root, children: newChildren };
}

export function updateAt(root: QueryNode, path: Path, fn: (node: QueryNode) => QueryNode): QueryNode {
  if (path.length === 0) return fn(root);
  if (!isGroup(root)) throw new Error('path traverses non-group');
  const [head, ...rest] = path;
  const newChildren = root.children.slice();
  newChildren[head] = updateAt(newChildren[head], rest, fn);
  return { ...root, children: newChildren };
}

export function getAt(root: QueryNode, path: Path): QueryNode {
  if (path.length === 0) return root;
  if (!isGroup(root)) throw new Error('path traverses non-group');
  return getAt(root.children[path[0]], path.slice(1));
}

export function moveNode(root: QueryNode, from: Path, to: Path): QueryNode {
  const node = getAt(root, from);
  const removed = removeAt(root, from);
  const adjusted = adjustPath(to, from);
  const parentPath = adjusted.slice(0, -1);
  const idx = adjusted[adjusted.length - 1];
  const parent = getAt(removed, parentPath) as QueryNode & { type: 'group' };
  const newChildren = parent.children.slice();
  newChildren.splice(idx, 0, node);
  return updateAt(removed, parentPath, (p) => ({
    ...(p as { type: 'group'; op: 'AND' | 'OR' }),
    children: newChildren,
  }));
}

function adjustPath(target: Path, removed: Path): Path {
  if (target.length < removed.length) return target;
  for (let i = 0; i < removed.length - 1; i++) {
    if (target[i] !== removed[i]) return target;
  }
  if (target.length === removed.length && target[removed.length - 1] > removed[removed.length - 1]) {
    const next = target.slice();
    next[removed.length - 1]--;
    return next;
  }
  return target;
}
