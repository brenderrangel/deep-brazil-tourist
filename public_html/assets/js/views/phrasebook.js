import { html, render } from '../core/html.js';
import { t, getLang, errorMessage } from '../core/i18n.js';
import { api } from '../core/api.js';
import { phraseCard, bindPhraseCards, getFavPhrases } from './phrase-card.js';
import { icon } from '../core/icons.js';
import { getSpeechPace, setSpeechPace } from '../core/speech.js';

export default async function phrasebookView(root, { query }) {
  render(root, html`<h1 class="page-title">${t('phrasebook.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let data;
  try {
    data = await api(`/phrasebook?lang=${getLang()}`, { auth: false });
  } catch (err) {
    render(root, html`
      <h1 class="page-title">${t('phrasebook.title')}</h1>
      <div class="card error">${errorMessage(err)} <a href="#/phrasebook">${t('common.retry')}</a></div>`);
    return;
  }

  let category = query.c && (query.c === 'favs' || data.categories.includes(query.c)) ? query.c : 'all';
  let term = '';
  let pace = getSpeechPace();

  render(root, html`
    <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:0.75rem; flex-wrap:wrap; margin-bottom:0.75rem;">
      <div>
        <h1 class="page-title" style="margin-bottom:0.15rem;">${t('phrasebook.title')}</h1>
        <p class="muted small tnum" style="margin:0;">${data.phrases.length} frases essenciais com pronúncia</p>
      </div>
      <div class="segmented-control voice-pace-control" role="group" aria-label="Ritmo da voz" style="margin:0; width:fit-content;">
        <button type="button" class="segment-btn seg-btn ${pace === 'natural' ? 'active' : ''}" data-pace="natural">
          ${icon('volume2', { size: 14 })}
          <span>Voz natural</span>
        </button>
        <button type="button" class="segment-btn seg-btn ${pace === 'slow' ? 'active' : ''}" data-pace="slow">
          ${icon('clock', { size: 14 })}
          <span>Devagar</span>
        </button>
      </div>
    </div>

    ${data.__offline ? html`<p class="badge badge-offline">${t('common.offlineData')}</p>` : ''}

    <div class="search-box-row" style="margin-bottom:0.85rem;">
      <div class="search-input-wrap">
        <span class="search-icon" aria-hidden="true">${icon('search', { size: 17 })}</span>
        <input type="search" id="pb-search" placeholder="${t('phrasebook.search')}" aria-label="${t('phrasebook.search')}">
      </div>
    </div>

    <div class="chips" role="tablist">
      ${['all', 'favs', ...data.categories].map((c) => html`
        <button class="chip" role="tab" data-cat="${c}">${c === 'favs' ? '★ Favoritas' : t(`phrasebook.categories.${c}`)}</button>`)}
    </div>
    <p class="muted small">${t('phrasebook.hint')}</p>
    <div id="pb-list" class="phrase-list"></div>
  `);

  const list = root.querySelector('#pb-list');
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const draw = () => {
    root.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === category)));
    const q = norm(term);
    const favs = category === 'favs' ? getFavPhrases() : null;
    const items = data.phrases.filter((p) =>
      (category === 'all' || (category === 'favs' ? favs.has(String(p.id)) : p.category === category)) &&
      (!q || norm(`${p.pt} ${p.text}`).includes(q)));
    render(list, items.length ? html`${items.map(phraseCard)}` : html`<p class="muted">${t('phrasebook.empty')}</p>`);
  };

  root.querySelectorAll('[data-pace]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pace = btn.dataset.pace;
      setSpeechPace(pace);
      root.querySelectorAll('[data-pace]').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  root.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) { category = b.dataset.cat; draw(); }
  });
  root.querySelector('#pb-search').addEventListener('input', (e) => { term = e.target.value; draw(); });
  bindPhraseCards(list, data.phrases);
  draw();
}
