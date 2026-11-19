import { html, render } from '../core/html.js';
import { t, errorMessage, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';

export default async function arrivalView(root) {
  render(root, html`<h1 class="page-title">${t('modules.arrival.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let arrivalData;
  try {
    arrivalData = await api(`/guides/arrival?lang=${getLang()}`, { auth: false });
  } catch (err) {
    render(root, html`<div class="card error">${errorMessage(err)}</div>`);
    return;
  }

  let activeCode = 'GRU';

  function draw() {
    const airport = arrivalData.airports.find((a) => a.code === activeCode) || arrivalData.airports[0];
    const comp = arrivalData.transit_comparator;

    render(root, html`
      <h1 class="page-title">${t('modules.arrival.title')}</h1>
      <p class="muted">${t('arrival.subtitle')}</p>

      <!-- Seletor de Aeroportos -->
      <div class="chips" role="tablist" style="margin:1rem 0;">
        ${arrivalData.airports.map((a) => html`
          <button class="chip" role="tab" data-code="${a.code}" aria-selected="${a.code === activeCode}">
            ${a.code} - ${a.city.split(',')[0]}
          </button>
        `)}
      </div>

      <!-- Detalhes do Aeroporto Ativo -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h2>${airport.name}</h2>
            <p class="small muted">${airport.terminals}</p>
          </div>
          <span class="badge badge-free">${airport.code}</span>
        </div>

        <!-- Passo 1: Imigração -->
        <div style="margin-top:1.25rem;">
          <h4>🛂 ${airport.steps.immigration.title}</h4>
          <p class="small muted" style="margin-top:0.25rem;">${airport.steps.immigration.desc}</p>
        </div>

        <!-- Passo 2: Chip e Dinheiro -->
        <div style="margin-top:1.25rem;">
          <h4>📶 ${airport.steps.sim_and_cash.title}</h4>
          <p class="small muted" style="margin-top:0.25rem;">${airport.steps.sim_and_cash.desc}</p>
        </div>

        <!-- Passo 3: Transporte até a cidade -->
        <div style="margin-top:1.25rem;">
          <h4>🚗 ${airport.steps.transport.title}</h4>
          <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.5rem;">
            ${airport.steps.transport.options.map((opt) => html`
              <div style="background:#f8fafc; border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:0.75rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong>${opt.mode}</strong>
                  <span class="badge badge-free">${opt.cost}</span>
                </div>
                <p class="small" style="margin-top:0.25rem;">📍 <strong>Embarque:</strong> ${opt.pickup}</p>
                <p class="small muted" style="margin-top:0.25rem;">💡 ${opt.tips}</p>
              </div>
            `)}
          </div>
        </div>
      </div>

      <!-- Comparador Interurbano: Avião vs Ônibus Leito -->
      <h2 style="margin-top:2rem;">✈️ 🚌 ${comp.title}</h2>
      <p class="small muted" style="margin:0.25rem 0 1rem 0;">${comp.intro}</p>

      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${comp.comparison.map((c) => html`
          <div class="card">
            <h4>${c.route}</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin:0.75rem 0; font-size:0.85rem;">
              <div class="fact">
                <span>✈️ Avião</span>
                <strong>${c.flight.price}</strong>
                <span class="small muted">${c.flight.desc}</span>
              </div>
              <div class="fact">
                <span>🚌 Ônibus Leito</span>
                <strong>${c.bus.price}</strong>
                <span class="small muted">${c.bus.desc}</span>
              </div>
            </div>
            <div class="note" style="padding:0.5rem 0.75rem; border-radius:var(--radius-sm);">
              <strong>💡 Veredito:</strong> ${c.verdict}
            </div>
          </div>
        `)}
      </div>

      <p class="disclaimer">${arrivalData.disclaimer}</p>
    `);

    root.querySelector('.chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-code]');
      if (btn) {
        activeCode = btn.dataset.code;
        draw();
      }
    });
  }

  draw();
}

