import { html, render } from './core/html.js';
import { detectLang, setLang, t, getLang, pick, LANGS } from './core/i18n.js';
import { route, notFound, onRouteChange, startRouter, currentPath } from './core/router.js';
import { store } from './core/store.js';
import { initDeviceDetection } from './core/device.js';
import { icon, iconHtml } from './core/icons.js';

initDeviceDetection();

import homeView from './views/home.js';
import phrasebookView from './views/phrasebook.js';
import emergencyView from './views/emergency.js';
import { itinerariesView, itineraryView } from './views/itineraries.js';
import arrivalView from './views/arrival.js';
import moneyView from './views/money.js';
import entryView from './views/entry.js';
import foodView from './views/food.js';
import ebookView from './views/ebook.js';
import conciergeView from './views/concierge.js';
import adminView from './views/admin.js';
import { loginView, registerView, forgotPasswordView, resetPasswordView, verifyEmailView } from './views/auth.js';
import accountView from './views/account.js';
import { soonView, notFoundView } from './views/soon.js';

const appEl = document.querySelector('#app');

// Gerenciamento de Tema (Modo Claro / Modo Escuro)
function getSavedTheme() {
  const saved = localStorage.getItem('btc_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let currentTheme = getSavedTheme();

export function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('btc_theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#0b1120' : '#059669');
  }
}

export function toggleTheme() {
  const next = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function getTheme() {
  return currentTheme;
}

// Aplica o tema imediatamente na inicialização
applyTheme(currentTheme);

function renderShell(contentView, routeData) {
  const path = routeData.path;
  const isSos = path === '/emergency';

  render(appEl, html`
    <header class="app-header">
      <a class="brand" href="#/">
        <span class="brand-mark" aria-hidden="true">${icon('compass', { size: 18 })}</span>
        <span>${t('app.name')}</span>
      </a>
      <div class="header-actions">
        <button id="global-theme-toggle" class="theme-toggle-btn"
          aria-label="${currentTheme === 'dark' ? pick({ pt: 'Mudar para tema claro', en: 'Switch to light mode', es: 'Cambiar a modo claro' }) : pick({ pt: 'Mudar para tema escuro', en: 'Switch to dark mode', es: 'Cambiar a modo oscuro' })}"
          title="${currentTheme === 'dark' ? pick({ pt: 'Modo Claro', en: 'Light Mode', es: 'Modo Claro' }) : pick({ pt: 'Modo Escuro', en: 'Dark Mode', es: 'Modo Oscuro' })}">
          ${icon(currentTheme === 'dark' ? 'sun' : 'moon', { size: 17 })}
        </button>
        <select id="global-lang-select" class="lang-select" aria-label="${t('nav.language')}">
          ${Object.entries(LANGS).map(([k, name]) => html`
            <option value="${k}" ${k === getLang() ? 'selected' : ''}>${k.toUpperCase()}</option>
          `)}
        </select>
        <a href="#/account" class="theme-toggle-btn" title="${t('account.title')}" aria-label="${t('account.title')}" style="text-decoration:none !important;">
          ${icon(store.isLoggedIn ? 'user' : 'logIn', { size: 17 })}
        </a>
      </div>
    </header>

    <div id="offline-bar" class="offline-banner ${navigator.onLine ? 'hidden' : ''}">
      ${icon('alertTriangle', { size: 15 })} <span>${t('common.offline')}</span>
    </div>

    <main class="container" id="main-content"></main>

    <nav class="bottom-nav" aria-label="Navegação principal">
      <a href="#/" class="sidebar-brand" aria-label="${t('app.name')}">
        <span class="brand-mark brand-mark-lg" aria-hidden="true">${icon('compass', { size: 20 })}</span>
        <span class="sidebar-brand-text">
          <span class="sidebar-brand-title">Deep Brazil</span>
          <span class="sidebar-brand-sub">TOURIST</span>
        </span>
      </a>
      <a href="#/" class="nav-item ${path === '/' ? 'active' : ''}">
        <span class="icon" aria-hidden="true">${icon('home', { size: 20 })}</span>
        <span>${t('nav.home')}</span>
      </a>
      <a href="#/phrasebook" class="nav-item ${path.startsWith('/phrasebook') ? 'active' : ''}">
        <span class="icon" aria-hidden="true">${icon('message', { size: 20 })}</span>
        <span>${t('nav.phrases')}</span>
      </a>
      <a href="#/emergency" class="nav-item nav-sos ${isSos ? 'active' : ''}">
        <span class="icon" aria-hidden="true">${icon('shieldAlert', { size: 20 })}</span>
        <span>${t('nav.sos')}</span>
      </a>
      <a href="#/itineraries" class="nav-item ${path.startsWith('/itineraries') ? 'active' : ''}">
        <span class="icon" aria-hidden="true">${icon('map', { size: 20 })}</span>
        <span>${t('nav.trips')}</span>
      </a>
      <a href="#/account" class="nav-item ${path === '/account' || path === '/login' || path === '/register' ? 'active' : ''}">
        <span class="icon" aria-hidden="true">${icon('user', { size: 20 })}</span>
        <span>${store.isLoggedIn ? t('nav.account') : t('auth.login')}</span>
      </a>
    </nav>
  `);

  // Bind do botão de alternância de tema escuro/claro
  const themeBtn = appEl.querySelector('#global-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = toggleTheme();
      themeBtn.innerHTML = iconHtml(next === 'dark' ? 'sun' : 'moon', { size: 17 });
      themeBtn.title = next === 'dark' ? 'Modo Claro' : 'Modo Escuro';
      themeBtn.setAttribute('aria-label', next === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
      window.dispatchEvent(new CustomEvent('btc_theme_changed', { detail: { theme: next } }));
    });
  }

  // Bind do seletor rápido de idiomas no header
  const langSel = appEl.querySelector('#global-lang-select');
  langSel.addEventListener('change', async (e) => {
    await setLang(e.target.value);
    renderShell(contentView, routeData);
  });

  // Renderiza a view filha dentro de #main-content
  const main = appEl.querySelector('#main-content');
  if (typeof contentView === 'function') {
    contentView(main, routeData);
  }
}

// Rotas do PWA
route('/', homeView);
route('/phrasebook', phrasebookView);
route('/emergency', emergencyView);
route('/itineraries', itinerariesView);
route('/itineraries/:id', itineraryView);
route('/arrival', arrivalView);
route('/money', moneyView);
route('/entry', entryView);
route('/food', foodView);
route('/ebook', ebookView);
route('/concierge', conciergeView);
route('/admin', adminView);
route('/soon/:key', soonView);
route('/login', loginView);
route('/register', registerView);
route('/forgot-password', forgotPasswordView);
route('/reset-password', resetPasswordView);
route('/verify-email', verifyEmailView);
route('/account', accountView);
notFound(notFoundView);

let hasRenderedOnce = false;

onRouteChange((view, data) => {
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const update = () => {
    renderShell(view, data);
    window.scrollTo(0, 0);
  };

  if (hasRenderedOnce && !prefersReduced && typeof document.startViewTransition === 'function') {
    document.startViewTransition(update);
  } else {
    update();
  }
  hasRenderedOnce = true;
});

// Detecção online/offline
window.addEventListener('online', () => {
  document.querySelector('#offline-bar')?.classList.add('hidden');
});
window.addEventListener('offline', () => {
  document.querySelector('#offline-bar')?.classList.remove('hidden');
});

// Registro do Service Worker para suporte a cache offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update();
    }).catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// Inicialização
(async function init() {
  const initialLang = detectLang();
  await setLang(initialLang);
  startRouter();
})();

