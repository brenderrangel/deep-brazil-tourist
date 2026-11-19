import { html, render } from '../core/html.js';
import { t, errorMessage, getLang, pick } from '../core/i18n.js';
import { api } from '../core/api.js';
import { BRAZIL_SVG } from './brazil-map-svg.js';
import { icon } from '../core/icons.js';
import { speakText } from '../core/speech.js';

// Nomes completos dos estados do Brasil para legenda e auxílio ao turista estrangeiro
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

export default async function foodView(root) {
  render(root, html`<h1 class="page-title">Sabores do Brasil</h1><p class="muted">${t('common.loading')}</p>`);

  let data;
  try {
    data = await api(`/food-guide?lang=${getLang()}`, { auth: false });
  } catch (err) {
    render(root, html`<div class="card error">${errorMessage(err)}</div>`);
    return;
  }

  let activeCategory = 'all';
  let activeState = null; // UF selecionado (ex: 'MG', 'BA', 'SP') ou null para todos
  let searchTerm = '';

  const categories = data.categories || {};
  const items = data.items || [];

  // Mapeia quais estados possuem pratos cadastrados no guia
  const statesWithFood = new Set(items.map((i) => i.state_uf).filter(Boolean));

  function speakWord(text, triggerEl = null) {
    speakText(text, { lang: 'pt-BR', triggerEl });
  }

  function draw() {
    const q = searchTerm.toLowerCase();
    const filtered = items.filter((it) => {
      const matchCat = activeCategory === 'all' || it.category === activeCategory;
      const matchState = !activeState || it.state_uf === activeState;
      const matchSearch =
        !q ||
        it.name_pt.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q) ||
        (it.state_name && it.state_name.toLowerCase().includes(q)) ||
        (it.state_uf && it.state_uf.toLowerCase() === q);
      return matchCat && matchState && matchSearch;
    });

    render(root, html`
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h1 class="page-title">${t('modules.food.title')}</h1>
          <p class="muted">${pick({ pt: 'Explore pratos típicos por estado e localize no mapa as origens de cada iguaria.', en: 'Explore typical dishes by state and locate each specialty on the map.', es: 'Explora platos típicos por estado y ubica en el mapa el origen de cada especialidad.' })}</p>
        </div>
      </div>

      <div class="map-split-layout" style="margin-top:0.75rem;">
        <!-- MAPA INTERATIVO DO BRASIL -->
        <div class="map-card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div style="text-align:left;">
              <h3 class="inline-meta" style="margin:0; font-size:1.05rem; color:var(--c-text);">
                ${icon('map', { size: 17 })} <span>${pick({ pt: 'Mapa Gastronômico do Brasil', en: 'Brazil Gastronomy Map', es: 'Mapa Gastronómico de Brasil' })}</span>
              </h3>
              <span class="small muted">${pick({ pt: 'Toque no mapa para filtrar os pratos típicos de cada estado', en: 'Tap the map to filter typical dishes by state', es: 'Toca el mapa para filtrar los platos típicos de cada estado' })}</span>
            </div>
            ${activeState ? html`
              <button id="btn-clear-state" class="btn btn-light inline-meta" style="padding:0.3rem 0.65rem; font-size:0.75rem;">
                ${icon('x', { size: 13 })} <span>${pick({ pt: 'Ver Todo o Brasil', en: 'View All Brazil', es: 'Ver Todo Brasil' })}</span>
              </button>
            ` : ''}
          </div>

          <div class="brazil-map-wrapper" id="svg-host"></div>

          <!-- Indicador do estado selecionado -->
          <div id="state-tooltip">
            ${activeState ? html`
              <div class="map-badge-active">
                ${icon('mapPin', { size: 14 })}
                <span>${STATE_NAMES[activeState] || activeState} (${activeState})</span>
                <span class="small tnum" style="font-weight:normal;">· ${filtered.length} ${pick({ pt: 'prato(s) típico(s)', en: 'typical dish(es)', es: 'plato(s) típico(s)' })}</span>
              </div>
            ` : html`
              <span class="small muted" style="display:block; margin-top:0.5rem;">
                <strong>${pick({ pt: 'Destaque em verde:', en: 'Green highlight:', es: 'Destacado en verde:' })}</strong> ${pick({ pt: 'Estados com culinária no guia', en: 'States in the guide', es: 'Estados con gastronomía en la guía' })} · <strong>${pick({ pt: 'Âmbar:', en: 'Amber:', es: 'Ámbar:' })}</strong> ${pick({ pt: 'Selecionado', en: 'Selected', es: 'Seleccionado' })}
              </span>
            `}
          </div>

          <!-- Atalhos rápidos para estados populares do e-book -->
          <div style="display:flex; gap:0.35rem; justify-content:center; flex-wrap:wrap; margin-top:0.75rem;">
            <span class="small muted" style="width:100%; font-size:0.75rem;">${pick({ pt: 'Ou selecione pelo estado:', en: 'Or select by state:', es: 'O selecciona por estado:' })}</span>
            ${['BA', 'MG', 'RJ', 'SP', 'CE', 'PR', 'RS', 'PA', 'AM'].map((uf) => html`
              <button class="chip ${activeState === uf ? 'chip-active' : ''}" data-uf-pill="${uf}" style="font-size:0.75rem; padding:0.25rem 0.6rem; font-weight:600;">
                ${uf} · ${STATE_NAMES[uf] ? STATE_NAMES[uf].split(' ')[0] : uf}
              </button>
            `)}
          </div>
        </div>

        <div>
          <!-- Barra de Pesquisa e Filtros de Categoria -->
          <div class="search-box-row" style="margin-bottom:0.85rem;">
            <div class="search-input-wrap">
              <span class="search-icon" aria-hidden="true">${icon('search', { size: 17 })}</span>
              <input
                type="search"
                id="food-search"
                placeholder="${pick({ pt: 'Buscar por prato, ingrediente ou estado...', en: 'Search by dish, ingredient or state...', es: 'Buscar por plato, ingrediente o estado...' })}"
                value="${searchTerm}"
                aria-label="${pick({ pt: 'Buscar pratos', en: 'Search dishes', es: 'Buscar platos' })}"
              />
            </div>
          </div>

          <div class="category-scroll" style="margin-bottom:1.25rem;">
            <button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
              ${icon('globe', { size: 14 })} <span>${pick({ pt: `Todos (${items.length})`, en: `All (${items.length})`, es: `Todos (${items.length})` })}</span>
            </button>
            ${Object.entries(categories).map(([key, label]) => html`
              <button class="category-pill ${activeCategory === key ? 'active' : ''}" data-cat="${key}">
                ${icon('utensils', { size: 14 })} <span>${label}</span>
              </button>
            `)}
          </div>

          <!-- Lista de Pratos Filtrados -->
          <div class="scenic-grid" id="dishes-container">
        ${filtered.length ? filtered.map((it) => html`
          <div class="card ${activeState === it.state_uf ? 'card-highlighted' : ''}" style="margin-bottom:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
              <div>
                <span class="badge badge-free">${categories[it.category] || it.category}</span>
                
                <!-- Tag interativa do Estado de Origem -->
                ${it.state_uf ? html`
                  <button class="link-btn btn-focus-state inline-meta" data-uf="${it.state_uf}" style="margin-left:0.4rem; font-size:0.75rem; text-decoration:none;" title="Ver localização no mapa do Brasil">
                    ${icon('mapPin', { size: 13 })} <strong>[${it.state_uf}] ${it.state_name}</strong>
                  </button>
                ` : ''}

                <h3 style="margin-top:0.4rem; font-size:1.12rem; color:var(--c-text);">${it.name_pt}</h3>
                <p class="small" style="color:var(--c-accent-blue); font-weight:600;">Pronúncia: <em>${it.phonetic}</em></p>
              </div>
              <button class="icon-btn btn-speak" data-text="${it.name_pt}" aria-label="Ouvir pronúncia" title="Ouvir em Português">
                ${icon('volume2', { size: 17 })}
              </button>
            </div>

            <p class="small" style="margin-top:0.6rem; line-height:1.5;">${it.description}</p>

            <div style="margin-top:0.65rem; padding-top:0.6rem; border-top:1px dashed var(--c-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
              <span class="small muted inline-meta">${icon('compass', { size: 14 })} <span><strong>Onde provar:</strong> ${it.where_to_try}</span></span>
              <div style="display:flex; gap:0.25rem; flex-wrap:wrap;">
                ${it.tags.map((tag) => html`<span class="guide-badge" style="text-transform:none;">#${tag}</span>`)}
              </div>
            </div>
          </div>
        `) : html`
          <div class="card" style="text-align:center; padding:1.5rem;">
            <p class="muted">Nenhum prato encontrado para este filtro.</p>
            ${activeState ? html`<button id="btn-reset-filter" class="btn btn-primary" style="margin-top:0.5rem; font-size:0.85rem;">Ver todos os estados</button>` : ''}
          </div>
        `}
      </div>
      </div>
      </div>
    `);

    // Injeta o SVG no container imediatamente (sem fetch assíncrono)
    const svgHost = root.querySelector('#svg-host');
    if (svgHost && BRAZIL_SVG) {
      svgHost.innerHTML = BRAZIL_SVG;
      setupMapInteractivity(svgHost);
    }

    // Eventos
    root.querySelector('#food-search')?.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      draw();
      root.querySelector('#food-search').focus();
    });

    root.querySelectorAll('.category-pill[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-cat');
        draw();
      });
    });

    root.querySelector('#btn-clear-state')?.addEventListener('click', () => {
      activeState = null;
      draw();
    });

    root.querySelector('#btn-reset-filter')?.addEventListener('click', () => {
      activeState = null;
      draw();
    });

    root.querySelectorAll('[data-uf-pill]').forEach((b) => {
      b.addEventListener('click', () => {
        const uf = b.dataset.ufPill;
        activeState = activeState === uf ? null : uf;
        draw();
      });
    });

    root.querySelectorAll('.btn-focus-state').forEach((b) => {
      b.addEventListener('click', () => {
        activeState = b.dataset.uf;
        draw();
        root.querySelector('.map-card')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    root.querySelectorAll('.btn-speak').forEach((b) => {
      b.addEventListener('click', () => {
        speakWord(b.dataset.text, b);
      });
    });
  }

  function setupMapInteractivity(container) {
    const stateElements = container.querySelectorAll('.state, polygon[id], path[id]');
    stateElements.forEach((el) => {
      const uf = el.id;
      if (!uf) return;

      // Adiciona classe visual nos estados com gastronomia cadastrada
      if (statesWithFood.has(uf)) {
        el.classList.add('has-food');
      }

      // Adiciona classe visual no estado ativo
      if (activeState === uf) {
        el.classList.add('selected');
      }

      // Adiciona title nativo SVG para acessibilidade e tooltip simples
      const stateName = STATE_NAMES[uf] || uf;
      el.setAttribute('title', `${stateName} (${uf})`);

      // Clique no estado no mapa
      el.addEventListener('click', () => {
        activeState = activeState === uf ? null : uf;
        draw();
      });
    });
  }

  draw();
}
