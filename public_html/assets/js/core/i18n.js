// i18n: textos de interface em /assets/i18n/{lang}.json
export const LANGS = { en: 'English', es: 'Español', pt: 'Português' };
const KEY = 'btc.lang';

let dict = {};
let current = 'en';

export function detectLang() {
  const saved = localStorage.getItem(KEY);
  if (saved && LANGS[saved]) return saved;
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS[nav] ? nav : 'en';
}

export async function setLang(lang) {
  if (!LANGS[lang]) lang = 'en';
  const res = await fetch(`/assets/i18n/${lang}.json`, { cache: 'no-cache' });
  dict = await res.json();
  current = lang;
  localStorage.setItem(KEY, lang);
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  window.dispatchEvent(new CustomEvent('btc_lang_changed', { detail: { lang } }));
}

export const getLang = () => current;

/** Seleciona texto localizado por idioma ({ pt, en, es }) com fallback seguro. */
export function pick(map) {
  if (!map || typeof map !== 'object') return '';
  return map[current] ?? map.en ?? map.pt ?? '';
}

export function t(key, vars = {}) {
  const value = key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
  if (typeof value !== 'string') return key;
  return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

/** Traduz um erro da API (ApiError) para mensagem amigável. */
export function errorMessage(err) {
  const key = `errors.${err?.code}`;
  const msg = t(key);
  return msg === key ? t('errors.generic') : msg;
}

export function fieldError(err, field) {
  const code = err?.fields?.[field];
  if (!code) return '';
  const key = `fields.${code}`;
  const msg = t(key);
  return msg === key ? t('fields.invalid_value') : msg;
}

export function formatDate(iso, opts = { dateStyle: 'medium' }) {
  if (!iso) return '';
  const locale = current === 'pt' ? 'pt-BR' : current;
  return new Intl.DateTimeFormat(locale, opts).format(new Date(iso));
}

