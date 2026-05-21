import type { EngineKey, OperatorSpec } from '@search-builder/types';
import { writable } from 'svelte/store';
import { api } from '../api-client';

export type EngineMeta = {
	key: EngineKey;
	name: string;
	icon: string;
	baseUrl: string;
	queryParam: string;
	operators: OperatorSpec[];
};

export const enginesStore = writable<EngineMeta[]>([]);

let loaded = false;
export async function loadEngines(): Promise<void> {
	if (loaded) return;
	const list = await api.engines.list();
	enginesStore.set(list);
	loaded = true;
}
