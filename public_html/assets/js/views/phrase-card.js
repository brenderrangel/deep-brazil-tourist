import { html, render } from '../core/html.js';
import { t, getLang } from '../core/i18n.js';
import { icon } from '../core/icons.js';
import { speakText } from '../core/speech.js';

const FAV_KEY = 'dbt_fav_phrases';

export function getFavPhrases() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]').map(String));
  } catch {
    return new Set();
  }
}

export function toggleFavPhrase(id) {
  const favs = getFavPhrases();
  const key = String(id);
  if (favs.has(key)) favs.delete(key);
  else favs.add(key);
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  return favs.has(key);
}

export function phraseCard(p) {
  const uiLang = getLang();
  const hasForeignAudio = uiLang !== 'pt' && p.text;
  const isFav = getFavPhrases().has(String(p.id));

  return html`
    <article class="phrase-card" data-id="${p.id}">
      <button class="phrase-main" data-action="show" aria-label="${t('phrasebook.show')}">
        <span class="phrase-pt" lang="pt-BR">${p.pt}</span>
        ${uiLang !== 'pt' ? html`<span class="phrase-own">${p.text}</span>` : ''}
        ${p.phonetic ? html`<span class="phrase-phonetic">${p.phonetic}</span>` : ''}
      </button>
      <div class="phrase-actions">
        <button
          class="icon-btn ${isFav ? 'is-fav' : ''}"
          data-action="fav"
          aria-label="Favoritar"
          title="Favoritar frase"
          style="${isFav ? 'color:#f59e0b; border-color:#fcd34d;' : ''}"
        >
          <span>${isFav ? '★' : '☆'}</span>
        </button>
        ${hasForeignAudio ? html`
          <button
            class="icon-btn icon-btn-lang"
            data-action="listen-own"
            aria-label="${uiLang.toUpperCase()}"
            title="${uiLang.toUpperCase()}"
          >
            <span class="tnum">${uiLang.toUpperCase()}</span>
          </button>
        ` : ''}
        <button class="icon-btn" data-action="listen" aria-label="${t('phrasebook.listen')}" title="${t('phrasebook.listen')}">
          ${icon('volume2', { size: 18 })}
        </button>
      </div>
    </article>`;
}

/** Toca o áudio gravado; sem áudio, usa a síntese de voz natural no idioma escolhido. */
export function speak(p, triggerEl = null, lang = 'pt-BR') {
  if (lang === 'pt-BR' && p.audio_url) {
    if (triggerEl) {
      triggerEl.classList.add('is-speaking');
      setTimeout(() => triggerEl.classList.remove('is-speaking'), 1400);
    }
    const audio = new Audio(p.audio_url);
    audio.addEventListener('ended', () => triggerEl?.classList.remove('is-speaking'));
    audio.play().catch(() => {});
    return;
  }

  const text = lang === 'pt-BR' ? p.pt : (p.text || p.pt);
  speakText(text, { lang, triggerEl });
}

/** Modo "mostrar ao interlocutor": frase em português em tela cheia. */
export function showLarge(p) {
  const uiLang = getLang();
  const overlay = document.createElement('div');
  overlay.className = 'big-phrase';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  render(overlay, html`
    <p class="big-pt" lang="pt-BR">${p.pt}</p>
    ${uiLang !== 'pt' ? html`<p class="big-own">${p.text}</p>` : ''}
    <div class="big-actions">
      <button class="btn btn-light inline-meta" data-action="listen">${icon('volume2', { size: 17 })} ${t('phrasebook.listen')}</button>
      ${uiLang !== 'pt' ? html`
        <button class="btn btn-light inline-meta" data-action="listen-own">${icon('volume2', { size: 17 })} ${uiLang.toUpperCase()}</button>
      ` : ''}
      <button class="btn btn-light" data-action="close">${t('common.close')}</button>
    </div>`);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const action = btn?.dataset.action;
    if (action === 'listen') speak(p, btn, 'pt-BR');
    else if (action === 'listen-own') speak(p, btn, uiLang);
    else close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
  overlay.querySelector('[data-action="close"]').focus();
}

export function bindPhraseCards(container, phrases) {
  const byId = new Map(phrases.map((p) => [String(p.id), p]));
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const card = e.target.closest('.phrase-card');
    if (!btn || !card) return;
    const p = byId.get(card.dataset.id);
    if (!p) return;
    if (btn.dataset.action === 'listen') speak(p, btn, 'pt-BR');
    if (btn.dataset.action === 'listen-own') speak(p, btn, getLang());
    if (btn.dataset.action === 'show') showLarge(p);
    if (btn.dataset.action === 'fav') {
      const nowFav = toggleFavPhrase(p.id);
      btn.classList.toggle('is-fav', nowFav);
      btn.style.color = nowFav ? '#f59e0b' : '';
      btn.style.borderColor = nowFav ? '#fcd34d' : '';
      btn.innerHTML = `<span>${nowFav ? '★' : '☆'}</span>`;
    }
  });
}
