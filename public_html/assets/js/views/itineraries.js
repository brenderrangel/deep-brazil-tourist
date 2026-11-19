import { html, render } from '../core/html.js';
import { t, getLang, pick, errorMessage, formatDate } from '../core/i18n.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { BRAZIL_SVG } from './brazil-map-svg.js';
import { DESTINATIONS_META } from '../core/destinations-data.js';
import { ARRIVAL_INFO } from '../core/arrival-info.js';
import { icon } from '../core/icons.js';

function getPinnedSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem('btc_pinned_trips') || '[]').map(String));
  } catch {
    return new Set();
  }
}

function togglePinned(id) {
  const set = getPinnedSet();
  const key = String(id);
  if (set.has(key)) set.delete(key);
  else set.add(key);
  localStorage.setItem('btc_pinned_trips', JSON.stringify([...set]));
  return set.has(key);
}

// Mapeamento de UFs para nomes completos
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais',
  PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

// Mapeamento de roteiros para estados (100% das 27 UFs do Brasil)
const ITINERARY_STATE_MAP = {
  1: { ufs: ['RJ'], name: 'Rio de Janeiro (RJ)' },
  2: { ufs: ['SP'], name: 'São Paulo (SP)' },
  3: { ufs: ['MT'], name: 'Pantanal Norte — Cuiabá (MT)' },
  4: { ufs: ['AM'], name: 'Manaus & Rio Negro (AM)' },
  5: { ufs: ['GO'], name: 'Chapada dos Veadeiros (GO)' },
  6: { ufs: ['MG'], name: 'Serra da Mantiqueira & Monte Verde (MG)' },
  7: { ufs: ['BA'], name: 'Chapada Diamantina (BA)' },
  8: { ufs: ['PR'], name: 'Cataratas do Iguaçu (PR)' },
  9: { ufs: ['AC'], name: 'Rio Branco & Xapuri (AC)' },
  10: { ufs: ['AL'], name: 'Maceió & Maragogi (AL)' },
  11: { ufs: ['AP'], name: 'Macapá & Marco Zero (AP)' },
  12: { ufs: ['CE'], name: 'Fortaleza & Jericoacoara (CE)' },
  13: { ufs: ['DF'], name: 'Brasília (DF)' },
  14: { ufs: ['ES'], name: 'Vitória, Vila Velha & Pedra Azul (ES)' },
  15: { ufs: ['MA'], name: 'São Luís & Lençóis Maranhenses (MA)' },
  16: { ufs: ['MS'], name: 'Bonito & Pantanal Sul (MS)' },
  17: { ufs: ['PA'], name: 'Belém & Ilha do Marajó (PA)' },
  18: { ufs: ['PB'], name: 'João Pessoa & Costa do Conde (PB)' },
  19: { ufs: ['PE'], name: 'Recife, Olinda & Porto de Galinhas (PE)' },
  20: { ufs: ['PI'], name: 'Serra da Capivara & Delta do Parnaíba (PI)' },
  21: { ufs: ['RN'], name: 'Natal, Genipabu & Pipa (RN)' },
  22: { ufs: ['RS'], name: 'Gramado, Canela & Vale dos Vinhedos (RS)' },
  23: { ufs: ['RO'], name: 'Porto Velho & Rio Madeira (RO)' },
  24: { ufs: ['RR'], name: 'Boa Vista & Serra do Tepequém (RR)' },
  25: { ufs: ['SC'], name: 'Florianópolis & Costa Esmeralda (SC)' },
  26: { ufs: ['SE'], name: 'Aracaju & Cânion do Xingó (SE)' },
  27: { ufs: ['TO'], name: 'Jalapão & Fervedouros (TO)' },
};

function getItineraryStates(it) {
  if (ITINERARY_STATE_MAP[it.id]) return ITINERARY_STATE_MAP[it.id];
  const regionMap = {
    rio: { ufs: ['RJ'], name: 'Rio de Janeiro (RJ)' },
    saopaulo: { ufs: ['SP'], name: 'São Paulo (SP)' },
    pantanal: { ufs: ['MS', 'MT'], name: 'Pantanal (MS / MT)' },
    amazonia: { ufs: ['AM'], name: 'Amazônia (AM)' },
    centro_oeste: { ufs: ['GO', 'DF'], name: 'Centro-Oeste (GO / DF)' },
    sudeste_interior: { ufs: ['MG'], name: 'Minas Gerais (MG)' },
    nordeste: { ufs: ['BA'], name: 'Nordeste / Bahia (BA)' },
    sul: { ufs: ['PR'], name: 'Sul / Paraná (PR)' },
  };
  return regionMap[it.region] || { ufs: [], name: it.region || '' };
}

export async function itinerariesView(root) {
  render(root, html`<h1 class="page-title">${t('itineraries.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let data;
  try {
    data = await api(`/itineraries?lang=${getLang()}`);
  } catch (err) {
    render(root, html`<h1 class="page-title">${t('itineraries.title')}</h1>
      <div class="card error">${errorMessage(err)} <a href="#/itineraries">${t('common.retry')}</a></div>`);
    return;
  }

  const allItineraries = data.itineraries || [];
  let activeState = null; // UF selecionado no mapa
  let onlySaved = false;

  // Mapeia quais UFs possuem roteiros
  const stateCounts = {};
  allItineraries.forEach((it) => {
    const info = getItineraryStates(it);
    info.ufs.forEach((uf) => {
      stateCounts[uf] = (stateCounts[uf] || 0) + 1;
    });
  });

  function draw() {
    const pinnedSet = getPinnedSet();
    const filtered = allItineraries.filter((it) => {
      const matchState = !activeState || getItineraryStates(it).ufs.includes(activeState);
      const matchSaved = !onlySaved || pinnedSet.has(String(it.id));
      return matchState && matchSaved;
    });

    render(root, html`
      <!-- Top Title Bar -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1rem; gap:0.75rem; flex-wrap:wrap;">
        <div>
          <div class="home-greeting-sub">${pick({ pt: 'Roteiros Curados · Brasil', en: 'Curated Itineraries · Brazil', es: 'Itinerarios Curados · Brasil' })}</div>
          <h1 class="home-greeting-title" style="margin:0;">${pick({ pt: 'Destinos pelo Brasil', en: 'Destinations across Brazil', es: 'Destinos por Brasil' })}</h1>
        </div>
        <button id="btn-toggle-saved" class="category-pill ${onlySaved ? 'active' : ''}" type="button">
          ${icon('bookmark', { size: 14, fill: onlySaved ? 'currentColor' : 'none' })}
          <span class="tnum">${pick({ pt: `Salvos (${pinnedSet.size})`, en: `Saved (${pinnedSet.size})`, es: `Guardados (${pinnedSet.size})` })}</span>
        </button>
      </div>

      ${data.__offline ? html`<p class="badge badge-offline">${t('common.offlineData')}</p>` : ''}

      <a class="concierge-strip" href="#/concierge" style="margin-bottom:1.25rem;">
        <div class="concierge-strip-left">
          <span class="bento-icon bento-icon-emerald" aria-hidden="true">${icon('compass', { size: 19 })}</span>
          <div>
            <div class="bento-title">${pick({ pt: 'Precisa de um roteiro sob medida?', en: 'Need a custom itinerary?', es: '¿Necesitas un itinerario a medida?' })}</div>
            <div class="bento-desc">${pick({ pt: 'Fale com nosso Concierge e especialistas locais', en: 'Chat with our Concierge and local specialists', es: 'Habla con nuestro Concierge y especialistas locales' })}</div>
          </div>
        </div>
        <span class="bento-arrow" aria-hidden="true">${icon('arrowRight', { size: 16 })}</span>
      </a>

      <div class="map-split-layout">
        <!-- MAPA INTERATIVO DE DESTINOS NO BRASIL -->
        <div class="map-card" style="margin-top: 0.75rem; border-radius:var(--radius-lg);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <div style="text-align:left;">
              <h3 class="inline-meta" style="margin:0; font-size:1.05rem; color:var(--c-text); font-weight:700;">
                ${icon('map', { size: 17 })} <span>${pick({ pt: 'Mapa de Destinos', en: 'Destinations Map', es: 'Mapa de Destinos' })}</span>
              </h3>
              <span class="small muted">${pick({ pt: 'Toque em um estado destacado para filtrar', en: 'Tap a highlighted state to filter', es: 'Toca un estado destacado para filtrar' })}</span>
            </div>
            ${activeState ? html`
              <button id="btn-clear-state" class="btn btn-light inline-meta" style="padding:0.35rem 0.75rem; font-size:0.75rem; border-radius:9999px;">
                ${icon('x', { size: 13 })} <span>${pick({ pt: 'Ver Todo o Brasil', en: 'View All Brazil', es: 'Ver Todo Brasil' })}</span>
              </button>
            ` : ''}
          </div>

          <div class="brazil-map-wrapper" id="itineraries-map-host"></div>

          <!-- Indicador do estado selecionado -->
          <div id="state-tooltip">
            ${activeState ? html`
              <div class="map-badge-active" style="background:var(--c-primary-light); color:var(--c-primary-dark); border-color:var(--c-border);">
                ${icon('mapPin', { size: 14 })}
                <span>${STATE_NAMES[activeState] || activeState} (${activeState})</span>
                <span class="small tnum" style="font-weight:normal;">· ${filtered.length} ${pick({ pt: 'roteiro(s)', en: 'itinerary(ies)', es: 'itinerario(s)' })}</span>
              </div>
            ` : html`
              <span class="small muted" style="display:block; margin-top:0.5rem;">
                <strong>${pick({ pt: 'Estados destacados:', en: 'Highlighted states:', es: 'Estados destacados:' })}</strong> ${pick({ pt: 'Com roteiros', en: 'With itineraries', es: 'Con itinerarios' })} · <strong>${pick({ pt: 'Selecionado:', en: 'Selected:', es: 'Seleccionado:' })}</strong> ${pick({ pt: 'Filtro ativo', en: 'Active filter', es: 'Filtro activo' })}
              </span>
            `}
          </div>

          <!-- Atalhos rápidos para estados com roteiros -->
          <div style="display:flex; gap:0.4rem; justify-content:center; flex-wrap:wrap; margin-top:0.85rem;">
            ${Object.keys(stateCounts).sort().map((uf) => html`
              <button class="pill state-pill ${activeState === uf ? 'active' : ''}" data-uf="${uf}" style="font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:9999px;">
                ${uf} (${stateCounts[uf]})
              </button>
            `)}
          </div>
        </div>

        <div>
          <!-- Título da Lista -->
          <div class="section-header-row" style="margin-top:1.5rem;">
            <h2 class="section-title">
              ${activeState
                ? pick({ pt: `Roteiros em ${STATE_NAMES[activeState] || activeState} (${filtered.length})`, en: `Itineraries in ${STATE_NAMES[activeState] || activeState} (${filtered.length})`, es: `Itinerarios en ${STATE_NAMES[activeState] || activeState} (${filtered.length})` })
                : pick({ pt: `Todos os Roteiros (${filtered.length})`, en: `All Itineraries (${filtered.length})`, es: `Todos los Itinerarios (${filtered.length})` })}
            </h2>
          </div>

          ${filtered.length ? '' : html`<p class="muted">${onlySaved ? pick({ pt: 'Nenhum roteiro salvo ainda. Toque no marcador de favorito para salvar.', en: 'No saved itineraries yet. Tap the bookmark icon to save.', es: 'Aún no hay itinerarios guardados. Toca el marcador para guardar.' }) : t('itineraries.empty')}</p>`}
          
          <!-- Lista de Cards Visuais Cênicos -->
          <div class="scenic-grid">
            ${filtered.map((it) => {
      const dest = getItineraryStates(it);
      const isPinned = pinnedSet.has(String(it.id));
      const meta = DESTINATIONS_META[it.id] || {
        cover_image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=800&q=80',
        rating: 4.9,
        reviews: '1k',
        tag: 'Roteiro Curado'
      };

      return html`
                <div class="trip-card-wrap">
                  <a class="trip-card-scenic" href="#/itineraries/${it.id}">
                    <div class="card-cover" style="background-image: url('${meta.cover_image}');">
                      <div class="cover-badge">
                        <span class="badge inline-meta ${it.is_premium ? 'badge-premium' : 'badge-free'}">
                          ${it.locked ? icon('lock', { size: 11 }) : ''}${it.is_premium ? t('common.premium') : t('common.free')}
                        </span>
                      </div>
                      <div class="cover-rating inline-meta tnum">
                        ${icon('star', { size: 12, fill: 'currentColor' })} ${meta.rating}
                      </div>
                      <div class="cover-location inline-meta">
                        ${icon('mapPin', { size: 13 })} ${dest.name}
                      </div>
                    </div>
                    <div class="card-body">
                      <div class="card-title">${it.title}</div>
                      <div class="card-desc">${it.description}</div>
                      <div class="card-footer">
                        <span class="small muted inline-meta tnum">${icon('clock', { size: 13 })} ${t('common.days', { n: it.duration_days })} · ${t(`itineraries.regions.${it.region}`)}</span>
                        <span class="inline-meta" style="color:var(--c-primary-dark); font-weight:700; font-size:0.84rem;">Ver detalhes ${icon('arrowRight', { size: 14 })}</span>
                      </div>
                    </div>
                  </a>
                  <button
                    class="trip-pin-btn ${isPinned ? 'is-pinned' : ''}"
                    data-pin-id="${it.id}"
                    type="button"
                    aria-label="${isPinned ? 'Remover dos salvos' : 'Salvar roteiro'}"
                    aria-pressed="${isPinned ? 'true' : 'false'}"
                    title="${isPinned ? 'Remover dos salvos' : 'Salvar roteiro'}"
                  >
                    ${icon('bookmark', { size: 16, fill: isPinned ? 'currentColor' : 'none' })}
                  </button>
                </div>
              `;
    })}
          </div>
        </div>
      </div>
    `);

    // Injeta o SVG no wrapper do mapa
    const mapHost = root.querySelector('#itineraries-map-host');
    if (mapHost) {
      mapHost.innerHTML = BRAZIL_SVG;

      mapHost.querySelectorAll('.state').forEach((path) => {
        const uf = path.getAttribute('id');
        const count = stateCounts[uf] || 0;

        if (count > 0) {
          path.classList.add('has-itinerary');
          path.setAttribute('title', `${STATE_NAMES[uf] || uf}: ${count} roteiro(s) cadastrado(s)`);
        } else {
          path.setAttribute('title', `${STATE_NAMES[uf] || uf}: sem roteiro cadastrado`);
        }

        if (activeState === uf) {
          path.classList.add('selected');
        }

        path.addEventListener('click', (e) => {
          e.stopPropagation();
          if (count > 0) {
            activeState = (activeState === uf) ? null : uf;
            draw();
          } else {
            const tipEl = root.querySelector('#state-tooltip');
            if (tipEl) {
              tipEl.innerHTML = `<span class="small" style="color:var(--c-warning); font-weight:600;">📍 ${STATE_NAMES[uf] || uf}: Nenhum roteiro fixo ainda. Peça um roteiro personalizado ao nosso Concierge!</span>`;
            }
          }
        });
      });
    }

    // Eventos dos botões de atalho
    root.querySelector('#btn-toggle-saved')?.addEventListener('click', () => {
      onlySaved = !onlySaved;
      draw();
    });

    root.querySelectorAll('.trip-pin-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePinned(btn.dataset.pinId);
        draw();
      });
    });

    root.querySelectorAll('.state-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const uf = btn.getAttribute('data-uf');
        activeState = (activeState === uf) ? null : uf;
        draw();
      });
    });

    root.querySelector('#btn-clear-state')?.addEventListener('click', () => {
      activeState = null;
      draw();
    });
  }

  draw();
}

export async function itineraryView(root, { params }) {
  render(root, html`<p class="muted">${t('common.loading')}</p>`);
  let it;
  try {
    it = (await api(`/itineraries/${encodeURIComponent(params.id)}?lang=${getLang()}`)).itinerary;
  } catch (err) {
    render(root, html`<a class="back" href="#/itineraries">← ${t('common.back')}</a>
      <div class="card error">${errorMessage(err)}</div>`);
    return;
  }

  const c = it.content;
  const destInfo = getItineraryStates(it);
  const meta = DESTINATIONS_META[it.id] || {
    cover_image: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=900&q=80',
    rating: 4.9,
    reviews: '1.2k',
    weather: '26°C',
    weather_desc: 'Agradável',
    highlights: ['Pontos Turísticos Clássicos 📸', 'Passeios ao Ar Livre 🌿', 'Gastronomia Regional 🍲']
  };

  let activeTab = 'days'; // 'days' | 'logistics' | 'tips' | 'map'

  function renderDetail() {
    render(root, html`
      <!-- Hero Cover Cênico com Imagem em Alta Resolução (Estilo Tela 3 de Referência) -->
      <div class="detail-hero-wrap" style="background-image: url('${meta.cover_image}');">
        <div class="floating-hero-actions">
          <a class="floating-btn" href="#/itineraries" title="Voltar">←</a>
          <div style="display:flex; gap:0.5rem;">
            <button class="floating-btn" id="btn-share-itinerary" title="Compartilhar">↗</button>
            <button class="floating-btn" id="btn-fav-itinerary" title="Favoritar">❤️</button>
          </div>
        </div>

        <div class="hero-bottom-info">
          <div class="hero-bottom-title">${it.title}</div>
          <div class="hero-bottom-meta">
            <span>📍 ${destInfo.name}</span> · <span>⭐ ${meta.rating} (${meta.reviews} avaliações)</span>
          </div>
        </div>
      </div>

      <!-- Social Proof Pill -->
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--c-surface); border:1px solid var(--c-border); border-radius:9999px; padding:0.45rem 1rem; margin-bottom:1.25rem; box-shadow:var(--shadow-sm);">
        <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.82rem; color:var(--c-muted); font-weight:600;">
          <span>👥 +${meta.reviews} viajantes já fizeram</span>
        </div>
        <a class="badge badge-free" href="#/concierge" style="text-decoration:none !important; font-size:0.75rem;">
          Consultar Guia ✨
        </a>
      </div>

      <!-- Triade de Estatísticas Rápidas (Pills Coloridos) -->
      <div class="stat-triad">
        <div class="stat-pill-card">
          <div class="stat-icon-wrap orange">☀️</div>
          <div class="stat-pill-val">${c?.best_season || meta.best_season || 'Ano todo'}</div>
          <div class="stat-pill-lbl">Melhor Época</div>
        </div>

        <div class="stat-pill-card">
          <div class="stat-icon-wrap green">💰</div>
          <div class="stat-pill-val">${c?.estimated_cost ? c.estimated_cost.split(' ')[0] + ' ' + (c.estimated_cost.split(' ')[1] || '') : meta.cost}</div>
          <div class="stat-pill-lbl">Custo Médio</div>
        </div>

        <div class="stat-pill-card">
          <div class="stat-icon-wrap cyan">⏱️</div>
          <div class="stat-pill-val">${it.duration_days} Dias</div>
          <div class="stat-pill-lbl">Duração</div>
        </div>
      </div>

      <!-- Controle Segmentado de Abas -->
      <div class="segmented-control">
        <button class="segment-btn ${activeTab === 'days' ? 'active' : ''}" data-tab="days">
          📅 Dia a Dia
        </button>
        <button class="segment-btn ${activeTab === 'logistics' ? 'active' : ''}" data-tab="logistics">
          🚗 Como Chegar
        </button>
        <button class="segment-btn ${activeTab === 'tips' ? 'active' : ''}" data-tab="tips">
          💡 Dicas
        </button>
        <button class="segment-btn ${activeTab === 'map' ? 'active' : ''}" data-tab="map">
          🗺️ Mapa
        </button>
      </div>

      <!-- Conteúdo da Aba Selecionada -->
      ${it.locked ? html`
        <div class="card locked" style="border-radius:var(--radius-lg); margin-top:1rem;">
          <p class="lock-icon" aria-hidden="true">🔒</p>
          <h3>${t('itineraries.unlock')}</h3>
          <p class="muted">${store.isLoggedIn ? t('itineraries.lockedMsg') : t('itineraries.loginToUnlock')}</p>
          ${store.isLoggedIn ? '' : html`<a class="btn btn-primary" href="#/login?next=/itineraries/${it.id}" style="margin-top:0.75rem;">${t('auth.login')}</a>`}
        </div>
      ` : html`
        <!-- Descrição e Destaques Visuais -->
        <div style="margin-bottom:1.25rem;">
          <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:0.35rem;">Sobre o Destino</h3>
          <p style="font-size:0.92rem; color:var(--c-muted); line-height:1.6; margin-bottom:0.75rem;">${it.description}</p>
          
          <!-- Destaques Pills -->
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            ${(meta.highlights || []).map((h) => html`
              <span class="pill" style="font-size:0.78rem; padding:0.3rem 0.65rem; border-radius:9999px;">
                ${h}
              </span>
            `)}
          </div>
        </div>

        <!-- ABA 1: DIA A DIA -->
        ${activeTab === 'days' ? html`
          <div class="days" style="margin:0;">
            ${(c.days || []).map((d) => html`
              <div class="day" style="border-radius:var(--radius-lg); margin-bottom:0.85rem; box-shadow:var(--shadow-sm);">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                  <span class="badge badge-free" style="font-size:0.75rem;">Dia ${d.day}</span>
                  <h3 style="margin:0; font-size:1.05rem; color:var(--c-text); font-weight:800;">${d.title}</h3>
                </div>
                <ul style="margin:0; padding-left:1.2rem; color:var(--c-muted); font-size:0.88rem; line-height:1.6;">
                  ${(d.items || []).map((i) => html`<li>${i}</li>`)}
                </ul>
              </div>
            `)}
          </div>
        ` : ''}

        <!-- ABA 2: LOGÍSTICA & COMO CHEGAR -->
        ${activeTab === 'logistics' ? (() => {
          const arrival = ARRIVAL_INFO[it.id] || null;
          return html`
            <div style="display:flex; flex-direction:column; gap:0.85rem;">
              ${arrival ? html`
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.75rem;">
                  <div class="card" style="border-radius:var(--radius-lg); padding:1rem; margin:0; border-left:4px solid var(--c-primary);">
                    <div style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--c-muted); font-weight:700; margin-bottom:0.25rem;">
                      ✈️ Voo saindo de São Paulo
                    </div>
                    <div style="font-size:0.95rem; font-weight:700; color:var(--c-text); line-height:1.4;">
                      ${arrival.flight_sp}
                    </div>
                  </div>
                  <div class="card" style="border-radius:var(--radius-lg); padding:1rem; margin:0; border-left:4px solid #0284c7;">
                    <div style="font-size:0.74rem; text-transform:uppercase; letter-spacing:0.04em; color:var(--c-muted); font-weight:700; margin-bottom:0.25rem;">
                      ✈️ Voo saindo do Rio de Janeiro
                    </div>
                    <div style="font-size:0.95rem; font-weight:700; color:var(--c-text); line-height:1.4;">
                      ${arrival.flight_rj}
                    </div>
                  </div>
                </div>

                <div class="card" style="border-radius:var(--radius-lg); padding:1.15rem; margin:0;">
                  <div style="font-size:0.78rem; font-weight:700; color:var(--c-primary-dark); margin-bottom:0.35rem;">
                    🛫 Aeroporto(s) de referência: <span style="color:var(--c-text); font-weight:600;">${arrival.airport}</span>
                  </div>
                  <h3 style="font-size:1.05rem; margin:0.5rem 0 0.4rem; color:var(--c-primary-dark); font-weight:800;">
                    🚗 Como Chegar & Logística de Acesso
                  </h3>
                  <p style="font-size:0.92rem; line-height:1.6; color:var(--c-text); margin:0;">
                    ${arrival.how_to_get}
                  </p>
                  ${c.logistics ? html`
                    <p style="font-size:0.86rem; line-height:1.55; color:var(--c-muted); margin:0.65rem 0 0; padding-top:0.65rem; border-top:1px solid var(--c-border);">
                      ${c.logistics}
                    </p>
                  ` : ''}
                </div>

                <div class="card" style="border-radius:var(--radius-lg); padding:1rem 1.15rem; margin:0;">
                  <h3 style="font-size:0.95rem; margin:0 0 0.35rem; color:var(--c-text); font-weight:800;">
                    🚕 Deslocamento no Destino
                  </h3>
                  <p style="font-size:0.88rem; line-height:1.55; color:var(--c-muted); margin:0;">
                    ${arrival.local_transport}
                  </p>
                </div>
              ` : html`
                <div class="card" style="border-radius:var(--radius-lg); padding:1.25rem;">
                  <h3 style="font-size:1.05rem; margin-bottom:0.5rem; color:var(--c-primary-dark); font-weight:800;">🚗 Logística de Acesso & Transporte</h3>
                  <p style="font-size:0.92rem; line-height:1.6; color:var(--c-text); margin:0;">
                    ${c.logistics || 'Consulte nosso Concierge para opções de voos diretos e traslados executivos privativos.'}
                  </p>
                </div>
              `}
            </div>
          `;
        })() : ''}

        <!-- ABA 3: DICAS DO ESPECIALISTA -->
        ${activeTab === 'tips' ? html`
          <div class="card note" style="border-radius:var(--radius-lg); padding:1.25rem;">
            <h3 style="font-size:1.05rem; margin-bottom:0.5rem; font-weight:800;">💡 Dicas Importantes de Viagem</h3>
            <ul style="margin:0; padding-left:1.2rem; line-height:1.6; font-size:0.9rem;">
              ${(c.tips || []).map((tip) => html`<li style="margin-bottom:0.35rem;">${tip}</li>`)}
            </ul>
          </div>
        ` : ''}

        <!-- ABA 4: MAPA -->
        ${activeTab === 'map' ? html`
          <div class="card" style="border-radius:var(--radius-lg); padding:1.25rem; text-align:center;">
            <h3 style="font-size:1.05rem; margin-bottom:0.25rem; font-weight:800;">📍 Localização Geográfica: ${destInfo.name}</h3>
            <span class="small muted">Estado destacado em verde no mapa oficial do Brasil</span>
            <div id="detail-mini-map-host" class="brazil-map-wrapper" style="max-width:240px; margin:1rem auto;"></div>
          </div>
        ` : ''}
      `}

      <!-- Barra de Ação Fixa Flutuante (Sticky Bottom CTA Bar - Estilo Tela 3) -->
      <div class="sticky-bottom-action">
        <div class="sticky-action-inner">
          <div>
            <div style="font-size:0.75rem; color:var(--c-muted); font-weight:600;">Status do Roteiro</div>
            <div style="font-size:1.15rem; font-weight:800; color:var(--c-primary-dark);">
              ${it.is_premium ? '★ Premium' : '100% Grátis'}
            </div>
          </div>
          <a class="btn btn-primary" href="#/concierge" style="padding:0.7rem 1.4rem; font-size:0.95rem; border-radius:9999px; font-weight:800; box-shadow:0 6px 18px rgba(0,194,101,0.35);">
            Falar com Concierge →
          </a>
        </div>
      </div>
    `);

    // Tab buttons click
    root.querySelectorAll('.segment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        renderDetail();
      });
    });

    // Se estiver na aba mapa, monta o SVG
    if (activeTab === 'map') {
      const mapEl = root.querySelector('#detail-mini-map-host');
      if (mapEl) {
        mapEl.innerHTML = BRAZIL_SVG;
        mapEl.querySelectorAll('.state').forEach((p) => {
          const uf = p.getAttribute('id');
          if (destInfo.ufs.includes(uf)) {
            p.classList.add('selected');
          } else {
            p.style.fill = '#cbd5e1';
          }
        });
      }
    }

    // Share / Favorite feedback
    root.querySelector('#btn-share-itinerary')?.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: it.title, url: window.location.href });
      } else {
        alert('Link copiado para compartilhar!');
      }
    });

    root.querySelector('#btn-fav-itinerary')?.addEventListener('click', (e) => {
      e.target.innerText = '💖';
      alert('Roteiro salvo nos seus favoritos!');
    });
  }

  renderDetail();
}
