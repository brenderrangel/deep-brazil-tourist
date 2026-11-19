// Cliente da API REST: JWT no cabeçalho, renovação automática via refresh token.
import { store } from './store.js';

const BASE = '/api';

export class ApiError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let refreshing = null;

async function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh_token: store.refreshToken }),
        });
        if (!res.ok) return false;
        store.setSession(await res.json());
        return true;
      } catch {
        return false;
      }
    })();
    refreshing.finally(() => { refreshing = null; });
  }
  return refreshing;
}

export async function api(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && store.accessToken) headers.Authorization = `Bearer ${store.accessToken}`;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error');
  }

  if (res.status === 401 && auth && retry && store.refreshToken) {
    if (await refreshSession()) return api(path, { method, body, auth, retry: false });
    store.clear();
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || `http_${res.status}`, e.message, e.fields || {});
  }
  // resposta servida do cache offline pelo Service Worker
  if (res.headers.get('X-From-Cache') === '1' && data && typeof data === 'object') {
    Object.defineProperty(data, '__offline', { value: true });
  }
  return data;
}

export async function logout() {
  const refresh_token = store.refreshToken;
  store.clear();
  if ('caches' in window) await caches.delete('btc-api-v1');
  if (refresh_token) {
    api('/auth/logout', { method: 'POST', body: { refresh_token }, auth: false }).catch(() => {});
  }
}

