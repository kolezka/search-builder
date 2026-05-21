import { writable, derived, get } from 'svelte/store';
import type { EngineKey, QueryNode, QueryFullDto } from '@search-builder/types';
import { api, ApiResponseError } from '$lib/api-client';
import { addChild, removeAt, updateAt, moveNode } from './node-ops';
import type { Path } from './node-ops';

export type BuilderState = {
  id: string | null;
  name: string;
  description: string;
  engine: EngineKey;
  folder_id: string | null;
  tags: string[];
  tree: QueryNode;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  history: QueryNode[];
  future: QueryNode[];
};

const emptyTree = (): QueryNode => ({ type: 'group', op: 'AND', children: [] });

function initial(engine: EngineKey): BuilderState {
  return {
    id: null,
    name: '',
    description: '',
    engine,
    folder_id: null,
    tags: [],
    tree: emptyTree(),
    dirty: false,
    saving: false,
    savedAt: null,
    history: [],
    future: [],
  };
}

export const builderStore = writable<BuilderState>(initial('google'));

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 800;
const HISTORY_LIMIT = 20;

export function setFromServer(full: QueryFullDto): void {
  builderStore.set({
    id: full.id,
    name: full.name,
    description: full.description ?? '',
    engine: full.engine,
    folder_id: full.folder_id,
    tags: full.tags,
    tree: full.tree,
    dirty: false,
    saving: false,
    savedAt: full.updated_at,
    history: [],
    future: [],
  });
}

export function resetForNew(engine: EngineKey): void {
  builderStore.set(initial(engine));
}

function pushHistory(state: BuilderState, before: QueryNode): BuilderState {
  const history = [before, ...state.history].slice(0, HISTORY_LIMIT);
  return { ...state, history, future: [] };
}

export function mutateTree(fn: (tree: QueryNode) => QueryNode): void {
  builderStore.update((s) => {
    const before = s.tree;
    const next = fn(s.tree);
    if (next === before) return s;
    return scheduleSave({ ...pushHistory(s, before), tree: next, dirty: true });
  });
}

export function setField<K extends keyof BuilderState>(key: K, value: BuilderState[K]): void {
  builderStore.update((s) => scheduleSave({ ...s, [key]: value, dirty: true }));
}

export function undo(): void {
  builderStore.update((s) => {
    if (s.history.length === 0) return s;
    const [prev, ...rest] = s.history;
    return scheduleSave({ ...s, tree: prev, history: rest, future: [s.tree, ...s.future], dirty: true });
  });
}

export function redo(): void {
  builderStore.update((s) => {
    if (s.future.length === 0) return s;
    const [next, ...rest] = s.future;
    return scheduleSave({ ...s, tree: next, future: rest, history: [s.tree, ...s.history], dirty: true });
  });
}

export const builderActions = {
  addChild(path: Path, child: QueryNode) {
    mutateTree((t) => addChild(t, path, child));
  },
  removeAt(path: Path) {
    mutateTree((t) => removeAt(t, path));
  },
  updateAt(path: Path, fn: (n: QueryNode) => QueryNode) {
    mutateTree((t) => updateAt(t, path, fn));
  },
  move(from: Path, to: Path) {
    mutateTree((t) => moveNode(t, from, to));
  },
};

function scheduleSave(state: BuilderState): BuilderState {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(persist, DEBOUNCE_MS);
  return state;
}

async function persist(): Promise<void> {
  const s = get(builderStore);
  if (!s.dirty) return;
  builderStore.update((x) => ({ ...x, saving: true }));
  try {
    if (s.id === null) {
      if (s.name.trim().length === 0) {
        builderStore.update((x) => ({ ...x, saving: false }));
        return;
      }
      const { id } = await api.queries.create({
        name: s.name,
        description: s.description || undefined,
        engine: s.engine,
        tree: s.tree,
        folder_id: s.folder_id,
        tags: s.tags,
      });
      builderStore.update((x) => ({ ...x, id, dirty: false, saving: false, savedAt: Date.now() }));
    } else {
      await api.queries.update(s.id, {
        name: s.name,
        description: s.description || undefined,
        engine: s.engine,
        tree: s.tree,
        folder_id: s.folder_id,
        tags: s.tags,
      });
      builderStore.update((x) => ({ ...x, dirty: false, saving: false, savedAt: Date.now() }));
    }
  } catch (err) {
    builderStore.update((x) => ({ ...x, saving: false }));
    if (err instanceof ApiResponseError) console.warn('save failed', err.body);
    else console.warn('save failed', err);
  }
}

export async function forceSave(): Promise<void> {
  if (debounceTimer) clearTimeout(debounceTimer);
  await persist();
}

export const saveStatus = derived(builderStore, ($s) => {
  if ($s.saving) return 'Saving…';
  if ($s.dirty) return 'Unsaved changes';
  if ($s.savedAt) return `Saved ${Math.round((Date.now() - $s.savedAt) / 1000)}s ago`;
  return '';
});
