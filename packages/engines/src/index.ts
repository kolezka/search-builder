import { github } from './github';
import { google } from './google';
import { shodan } from './shodan';
import type { EngineAdapter, EngineKey } from './types';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = { google, github, shodan };

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}

export { google, github, shodan };
export { validateTree } from './validate-tree';
