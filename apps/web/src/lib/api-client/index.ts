import { env as publicEnv } from '$env/dynamic/public';
import type {
  EngineKey,
  FolderDto,
  OperatorSpec,
  QueryCreate,
  QueryFullDto,
  QueryListDto,
  QueryUpdate,
  StatsDto,
  TagDto,
} from '@search-builder/types';
import { type ApiError, ApiResponseError } from './types';

const API_BASE = (publicEnv.PUBLIC_API_BASE ?? '').replace(/\/$/, '');

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string>) },
    credentials: 'include',
  });
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) throw new ApiResponseError(res.status, body as ApiError);
  return body as T;
}

export const api = {
  auth: {
    me: () => req<{ authenticated: boolean }>('/api/auth/me'),
    login: (password: string) =>
      req<{ authenticated: boolean }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    logout: () => req<void>('/api/auth/logout', { method: 'POST' }),
    changePassword: (old: string, new_: string) =>
      req<{ ok: true }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ old, new: new_ }),
      }),
  },
  engines: {
    list: () =>
      req<
        Array<{
          key: EngineKey;
          name: string;
          icon: string;
          baseUrl: string;
          queryParam: string;
          operators: OperatorSpec[];
        }>
      >('/api/engines'),
  },
  folders: {
    list: () => req<FolderDto[]>('/api/folders'),
    create: (input: { name: string; color?: string }) =>
      req<{ id: string }>('/api/folders', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, patch: { name?: string; color?: string }) =>
      req<{ ok: true }>(`/api/folders/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string) => req<void>(`/api/folders/${id}`, { method: 'DELETE' }),
    restore: (id: string) => req<{ ok: true }>(`/api/folders/${id}/restore`, { method: 'POST' }),
  },
  queries: {
    list: (params: Record<string, string | undefined> = {}) => {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][],
      );
      const path = `/api/queries${qs.size ? `?${qs}` : ''}`;
      return req<QueryListDto[]>(path);
    },
    get: (id: string) => req<QueryFullDto>(`/api/queries/${id}`),
    create: (input: QueryCreate) =>
      req<{ id: string }>('/api/queries', { method: 'POST', body: JSON.stringify(input) }),
    update: (id: string, patch: QueryUpdate) =>
      req<{ ok: true }>(`/api/queries/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    remove: (id: string, hard = false) =>
      req<void>(`/api/queries/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' }),
    restore: (id: string) => req<{ ok: true }>(`/api/queries/${id}/restore`, { method: 'POST' }),
    touch: (id: string) => req<void>(`/api/queries/${id}/touch`, { method: 'POST' }),
    duplicate: (id: string) => req<{ id: string }>(`/api/queries/${id}/duplicate`, { method: 'POST' }),
  },
  tags: {
    list: () => req<TagDto[]>('/api/tags'),
    remove: (id: string) => req<void>(`/api/tags/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list: () =>
      req<
        Array<{
          id: string;
          name: string;
          description: string;
          engine: EngineKey;
          category: string | null;
          tree: import('@search-builder/types').QueryNode;
        }>
      >('/api/templates'),
    instantiate: (id: string, body: { name?: string; folder_id?: string | null } = {}) =>
      req<{ id: string }>(`/api/templates/${id}/instantiate`, { method: 'POST', body: JSON.stringify(body) }),
  },
  stats: {
    get: () => req<StatsDto>('/api/stats'),
  },
};

export { ApiResponseError };
