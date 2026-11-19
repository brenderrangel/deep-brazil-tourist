// Roteador por hash (#/rota/:param?query) – funciona em qualquer hospedagem estática.
const routes = [];
let notFoundView = null;
let onChange = () => {};

export function route(pattern, view) {
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$'
  );
  routes.push({ regex, keys, view });
}

export function notFound(view) { notFoundView = view; }
export function onRouteChange(fn) { onChange = fn; }

export function navigate(path) {
  if (location.hash === `#${path}`) resolve();
  else location.hash = path;
}

export function currentPath() {
  return (location.hash.slice(1) || '/').split('?')[0];
}

export async function resolve() {
  const hash = location.hash.slice(1) || '/';
  const [path, qs = ''] = hash.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));

  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      return onChange(r.view, { params, query, path });
    }
  }
  return onChange(notFoundView, { params: {}, query, path });
}

export function startRouter() {
  window.addEventListener('hashchange', resolve);
  return resolve();
}

