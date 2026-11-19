// Estado de autenticação persistido no localStorage.
const KEY = 'btc.auth';
const listeners = new Set();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

let state = load();

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get accessToken() { return state.accessToken || null; },
  get refreshToken() { return state.refreshToken || null; },
  get user() { return state.user || null; },
  get isLoggedIn() { return Boolean(state.refreshToken); },

  setSession({ access_token, refresh_token, user }) {
    state = { accessToken: access_token, refreshToken: refresh_token, user: user ?? state.user };
    persist();
  },
  setUser(user) {
    state = { ...state, user };
    persist();
  },
  clear() {
    state = {};
    persist();
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

