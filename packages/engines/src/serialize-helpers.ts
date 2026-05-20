import type { QueryNode } from '@search-builder/types';

export function needsQuoting(value: string): boolean {
  return /\s/.test(value) || value.length === 0;
}

export function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function isEmpty(node: QueryNode): boolean {
  if (node.type === 'group') return node.children.every(isEmpty);
  if (node.type === 'term') return node.value.trim() === '';
  return node.value.trim() === '';
}
