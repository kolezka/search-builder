import { z } from 'zod';
import { ENGINE_KEYS } from './engines';

export type QueryNode = GroupNode | TermNode | OperatorNode;

export type GroupNode = {
  type: 'group';
  op: 'AND' | 'OR';
  negated?: boolean;
  children: QueryNode[];
};

export type TermNode = {
  type: 'term';
  value: string;
  exactMatch?: boolean;
  negated?: boolean;
};

export type OperatorNode = {
  type: 'operator';
  key: string;
  value: string;
  negated?: boolean;
};

export const MAX_TREE_DEPTH = 8;

const baseTermNode = z.object({
  type: z.literal('term'),
  value: z.string(),
  exactMatch: z.boolean().optional(),
  negated: z.boolean().optional(),
});

const baseOperatorNode = z.object({
  type: z.literal('operator'),
  key: z.string().min(1),
  value: z.string(),
  negated: z.boolean().optional(),
});

export const queryNodeSchema: z.ZodType<QueryNode> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({
      type: z.literal('group'),
      op: z.enum(['AND', 'OR']),
      negated: z.boolean().optional(),
      children: z.array(queryNodeSchema),
    }),
    baseTermNode,
    baseOperatorNode,
  ]),
);

export const engineKeySchema = z.enum(ENGINE_KEYS);

export function treeDepth(node: QueryNode): number {
  if (node.type !== 'group') return 1;
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(treeDepth));
}
