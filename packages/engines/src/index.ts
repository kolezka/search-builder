import type { EngineAdapter, EngineKey } from './types';

export * from './types';
export * from './serialize-helpers';

const adapters: Partial<Record<EngineKey, EngineAdapter>> = {};

export function registerEngine(adapter: EngineAdapter): void {
  adapters[adapter.key] = adapter;
}

export function getEngine(key: EngineKey): EngineAdapter {
  const adapter = adapters[key];
  if (!adapter) throw new Error(`Unknown engine: ${key}`);
  return adapter;
}

export function listEngines(): EngineAdapter[] {
  return Object.values(adapters) as EngineAdapter[];
}
