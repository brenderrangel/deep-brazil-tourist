import { html, render } from '../core/html.js';
import { store } from '../core/store.js';
import { DESTINATIONS_META } from '../core/destinations-data.js';
import { icon } from '../core/icons.js';
import { t, getLang, pick } from '../core/i18n.js';

export default function homeView(root) {
  const userName = store.user?.name ? store.user.name.split(' ')[0] : null;
  const destinations = Object.values(DESTINATIONS_META);
  const featured = destinations[0];
  const lang = getLang();

  let activeCategory = 'all';

  function renderCards(listEl) {
    const filteredDestinations = activeCategory === 'all'
      ? destinations
      : destinations.filter((d) => d.category === activeCategory);

    render(listEl, html`
      ${filteredDestinations.map((d, idx) => html`
        <a
          class="recommended-card card-enter"
          href="#/itineraries/${d.id}"
          style="background-image: url('${d.cover_image}'); animation-delay: ${Math.min(idx * 45, 220)}ms;"
        >
          <div class="recommended-badge-top">
            ${icon('star', { size: 12, fill: 'currentColor' })}
            <span class="tnum">${d.rating}</span>
          </div>
          <div>
            <span class="recommended-tag">${lang === 'pt' ? d.tag : (d.tag_en || d.tag)}</span>
            <div class="recommended-title">${d.title}</div>
            <div class="recommended-subtitle">
              <span class="inline-meta">${icon('mapPin', { size: 13 })} ${d.location}</span>
              <span aria-hidden="true">·</span>
              <span class="inline-meta tnum">${icon('clock', { size: 13 })} ${d.duration}</span>
            </div>
          </div>
        </a>
      `)}
    `);
  }

  function renderSearchResults(resultsEl, query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsEl.classList.add('hidden');
      render(resultsEl, html``);
      return;
    }

    const matches = destinations.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.location.toLowerCase().includes(q) ||
      d.tag.toLowerCase().includes(q) ||
      (d.tag_en && d.tag_en.toLowerCase().includes(q))
    ).slice(0, 5);

    resultsEl.classList.remove('hidden');

    if (!matches.length) {
      render(resultsEl, html`
        <div class="search-popover-empty">
          <span>${pick({ pt: `Nenhum roteiro encontrado para "${query.trim()}".`, en: `No itinerary found for "${query.trim()}".`, es: `No se encontró ningún itinerario para "${query.trim()}".` })}</span>
          <a href="#/itineraries">${pick({ pt: 'Ver todos os 27 estados', en: 'View all 27 states', es: 'Ver los 27 estados' })} ${icon('arrowUpRight', { size: 13 })}</a>
        </div>
      `);
      return;
    }

    render(resultsEl, html`
      ${matches.map((d) => html`
        <a class="search-popover-item" href="#/itineraries/${d.id}">
          <img class="search-popover-thumb" src="${d.cover_image}" alt="" loading="lazy" />
          <div class="search-popover-info">
            <div class="search-popover-title">${d.title}</div>
            <div class="search-popover-meta tnum">${d.location} · ${d.duration}</div>
          </div>
          <span class="search-popover-arrow" aria-hidden="true">${icon('arrowUpRight', { size: 15 })}</span>
        </a>
      `)}
    `);
  }

  render(root, html`
    <!-- Hero Editorial de Abertura -->
    ${featured ? html`
      <a class="editorial-hero" href="#/itineraries/${featured.id}" style="background-image: url('${featured.cover_image}');">
        <div class="editorial-hero-top">
          <span class="editorial-kicker">
            ${userName
              ? pick({ pt: `Olá, ${userName} · Destaque`, en: `Hello, ${userName} · Featured`, es: `Hola, ${userName} · Destacado` })
              : pick({ pt: 'Guia Editorial · Destaque', en: 'Editorial Guide · Featured', es: 'Guía Editorial · Destacado' })}
          </span>
          <span class="editorial-rating tnum">
            ${icon('star', { size: 12, fill: 'currentColor' })} ${featured.rating}
          </span>
        </div>
        <div class="editorial-hero-bottom">
          <h1 class="editorial-hero-title">${featured.title}</h1>
          <div class="editorial-hero-meta">
            <span class="inline-meta">${icon('mapPin', { size: 14 })} ${featured.location}</span>
            <span aria-hidden="true">·</span>
            <span class="inline-meta tnum">${icon('clock', { size: 14 })} ${featured.duration}</span>
            <span aria-hidden="true">·</span>
            <span class="tnum">${featured.weather}</span>
          </div>
          <span class="editorial-hero-cta">
            ${pick({ pt: 'Explorar roteiro', en: 'Explore itinerary', es: 'Explorar itinerario' })} ${icon('arrowRight', { size: 15 })}
          </span>
        </div>
      </a>
    ` : ''}

    <!-- Busca Instantânea + Atalho de Mapa -->
    <div class="search-wrap-rel">
      <div class="search-box-row">
        <div class="search-input-wrap">
          <span class="search-icon" aria-hidden="true">${icon('search', { size: 17 })}</span>
          <input
            id="home-search-input"
            type="search"
            autocomplete="off"
            placeholder="${pick({ pt: 'Buscar destinos, cidades ou temas...', en: 'Search destinations, cities or themes...', es: 'Buscar destinos, ciudades o temas...' })}"
            aria-label="${pick({ pt: 'Buscar destinos', en: 'Search destinations', es: 'Buscar destinos' })}"
          />
        </div>
        <button id="home-filter-btn" class="search-filter-btn" title="${pick({ pt: 'Explorar no mapa', en: 'Explore on map', es: 'Explorar en el mapa' })}" aria-label="${pick({ pt: 'Explorar roteiros no mapa', en: 'Explore itineraries on map', es: 'Explorar itinerarios en el mapa' })}">
          ${icon('map', { size: 18 })}
        </button>
      </div>
      <div id="home-search-results" class="search-popover hidden" role="listbox" aria-label="Sugestões de destinos"></div>
    </div>

    <!-- Categorias -->
    <div class="section-header-row">
      <h2 class="section-title">${pick({ pt: 'Explorar por tema', en: 'Explore by theme', es: 'Explorar por tema' })}</h2>
      <a class="section-see-all" href="#/itineraries">
        ${pick({ pt: '27 estados', en: '27 states', es: '27 estados' })} ${icon('arrowUpRight', { size: 14 })}
      </a>
    </div>
    <div class="category-scroll" role="tablist" aria-label="Categorias de destinos">
      <button class="category-pill active" data-cat="all" role="tab" aria-selected="true">
        ${icon('globe', { size: 15 })} <span>${pick({ pt: 'Todos', en: 'All', es: 'Todos' })}</span>
      </button>
      <button class="category-pill" data-cat="beach" role="tab" aria-selected="false">
        ${icon('waves', { size: 15 })} <span>${pick({ pt: 'Praias', en: 'Beaches', es: 'Playas' })}</span>
      </button>
      <button class="category-pill" data-cat="nature" role="tab" aria-selected="false">
        ${icon('trees', { size: 15 })} <span>${pick({ pt: 'Ecoturismo', en: 'Ecotourism', es: 'Ecoturismo' })}</span>
      </button>
      <button class="category-pill" data-cat="culture" role="tab" aria-selected="false">
        ${icon('landmark', { size: 15 })} <span>${pick({ pt: 'Cultura', en: 'Culture', es: 'Cultura' })}</span>
      </button>
      <a class="category-pill" href="#/food">
        ${icon('utensils', { size: 15 })} <span>${pick({ pt: 'Sabores', en: 'Flavors', es: 'Sabores' })}</span>
      </a>
    </div>

    <!-- Roteiros em Destaque -->
    <div class="section-header-row">
      <h2 class="section-title">${pick({ pt: 'Roteiros em destaque', en: 'Featured itineraries', es: 'Itinerarios destacados' })}</h2>
      <a class="section-see-all" href="#/itineraries">
        ${pick({ pt: 'Ver mapa', en: 'View map', es: 'Ver mapa' })} ${icon('arrowUpRight', { size: 14 })}
      </a>
    </div>
    <div id="home-recommended-list" class="recommended-scroll"></div>

    <!-- Guias & Ferramentas (Editorial Grid) -->
    <div class="section-header-row">
      <h2 class="section-title">${pick({ pt: 'Guias & Ferramentas', en: 'Guides & Tools', es: 'Guías y Herramientas' })}</h2>
      <span class="small muted">${pick({ pt: 'Uso offline', en: 'Offline ready', es: 'Uso sin conexión' })}</span>
    </div>
    <div class="guides-grid">
      <a class="guide-card" href="#/ebook">
        <div class="guide-card-top">
          <span class="guide-icon guide-icon-emerald" aria-hidden="true">${icon('bookOpen', { size: 19 })}</span>
          <span class="guide-badge">PDF &amp; Web</span>
        </div>
        <div class="guide-title">${t('modules.ebook.title')}</div>
        <div class="guide-desc tnum">${t('modules.ebook.desc')}</div>
      </a>

      <a class="guide-card guide-card-photo" href="#/food">
        <div class="guide-card-top">
          <span class="guide-icon guide-icon-amber" aria-hidden="true">${icon('utensils', { size: 19 })}</span>
          <span class="guide-badge tnum">${pick({ pt: '16 pratos', en: '16 dishes', es: '16 platos' })}</span>
        </div>
        <div class="guide-title">${t('modules.food.title')}</div>
        <div class="guide-desc">${t('modules.food.desc')}</div>
      </a>

      <a class="guide-card" href="#/money">
        <div class="guide-card-top">
          <span class="guide-icon guide-icon-blue" aria-hidden="true">${icon('coins', { size: 19 })}</span>
          <span class="guide-badge tnum">USD · EUR · ARS</span>
        </div>
        <div class="guide-title">${t('modules.money.title')}</div>
        <div class="guide-desc">${t('modules.money.desc')}</div>
      </a>
    </div>

    <!-- Utilidades do Viajante (Bento Grid + SpotlightCard) -->
    <div class="section-header-row" style="margin-top:1.5rem;">
      <h2 class="section-title">${pick({ pt: 'Utilidades do Viajante', en: 'Traveler Utilities', es: 'Utilidades del Viajero' })}</h2>
    </div>
    <div class="bento-grid" style="margin-bottom:1.25rem;">
      <a class="spotlight-card bento-wide bento-sos" href="#/emergency" style="--spotlight-color: rgba(220, 38, 38, 0.09);">
        <div class="bento-top">
          <span class="bento-icon bento-icon-red" aria-hidden="true">${icon('shieldAlert', { size: 19 })}</span>
          <span class="bento-pill-tag tnum">192 · 190 · 193</span>
        </div>
        <div class="bento-body">
          <div class="bento-title">${t('modules.emergency.title')}</div>
          <div class="bento-desc">${t('modules.emergency.desc')}</div>
        </div>
        <span class="bento-arrow" aria-hidden="true">${icon('arrowUpRight', { size: 15 })}</span>
      </a>

      <a class="spotlight-card" href="#/phrasebook">
        <div class="bento-top">
          <span class="bento-icon bento-icon-emerald" aria-hidden="true">${icon('message', { size: 19 })}</span>
          <span class="bento-arrow" aria-hidden="true">${icon('arrowUpRight', { size: 15 })}</span>
        </div>
        <div class="bento-body">
          <div class="bento-title">${t('modules.phrasebook.title')}</div>
          <div class="bento-desc">${t('modules.phrasebook.desc')}</div>
        </div>
      </a>

      <a class="spotlight-card" href="#/arrival">
        <div class="bento-top">
          <span class="bento-icon bento-icon-amber" aria-hidden="true">${icon('plane', { size: 19 })}</span>
          <span class="bento-arrow" aria-hidden="true">${icon('arrowUpRight', { size: 15 })}</span>
        </div>
        <div class="bento-body">
          <div class="bento-title">${t('modules.arrival.title')}</div>
          <div class="bento-desc tnum">${t('modules.arrival.desc')}</div>
        </div>
      </a>

      <a class="spotlight-card bento-wide" href="#/entry">
        <div class="bento-top">
          <span class="bento-icon bento-icon-blue" aria-hidden="true">${icon('fileCheck', { size: 19 })}</span>
          <span class="bento-pill-tag">${pick({ pt: 'Documentação', en: 'Documents', es: 'Documentación' })}</span>
        </div>
        <div class="bento-body">
          <div class="bento-title">${t('modules.entry.title')}</div>
          <div class="bento-desc">${t('modules.entry.desc')}</div>
        </div>
        <span class="bento-arrow" aria-hidden="true">${icon('arrowUpRight', { size: 15 })}</span>
      </a>
    </div>

    <!-- Curadoria Humana / Concierge -->
    <a class="concierge-strip" href="#/concierge">
      <div class="concierge-strip-left">
        <span class="bento-icon bento-icon-emerald" aria-hidden="true">${icon('compass', { size: 19 })}</span>
        <div>
          <div class="bento-title">${pick({ pt: 'Precisa de um roteiro sob medida?', en: 'Need a custom itinerary?', es: '¿Necesitas un itinerario a medida?' })}</div>
          <div class="bento-desc">${pick({ pt: 'Fale com a curadoria local do Concierge', en: 'Chat with our local Concierge curators', es: 'Habla con nuestros curadores locales de Concierge' })}</div>
        </div>
      </div>
      <span class="bento-arrow" aria-hidden="true">${icon('arrowRight', { size: 16 })}</span>
    </a>
  `);

  const listEl = root.querySelector('#home-recommended-list');
  renderCards(listEl);

  const catButtons = root.querySelectorAll('.category-pill[data-cat]');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextCat = btn.getAttribute('data-cat');
      if (nextCat === activeCategory) return;
      activeCategory = nextCat;
      catButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      renderCards(listEl);
    });
  });

  const searchInput = root.querySelector('#home-search-input');
  const resultsEl = root.querySelector('#home-search-results');

  searchInput?.addEventListener('input', (e) => {
    renderSearchResults(resultsEl, e.target.value);
  });

  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      resultsEl.classList.add('hidden');
      searchInput.blur();
    } else if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (q) {
        navigate(`/itineraries?q=${encodeURIComponent(q)}`);
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target) || !e.target.closest('.search-wrap-rel')) {
      resultsEl?.classList.add('hidden');
    }
  });

  root.querySelector('#home-filter-btn')?.addEventListener('click', () => {
    navigate('/itineraries');
  });

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    root.querySelectorAll('.spotlight-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });
    });
  }
}
