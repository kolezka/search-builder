import type { EngineKey, OperatorSpec, QueryNode } from '@search-builder/types';

export type ValidationError = { path: string; message: string };

export type EngineAdapter = {
  key: EngineKey;
  name: string;
  icon: string;
  baseUrl: string;
  queryParam: string;
  operators: OperatorSpec[];
  serializeTree: (tree: QueryNode) => string;
  buildUrl: (tree: QueryNode) => string;
  validateValue: (operatorKey: string, value: string) => string | null;
};

export type { EngineKey, OperatorSpec, QueryNode };
