import { html, render } from '../core/html.js';
import { t, errorMessage, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';

const CHECKLIST_ITEMS = [
  { id: 'passport', label: 'Passaporte válido (+ e-Visa para EUA, Canadá e Austrália)' },
  { id: 'vaccine', label: 'Certificado de Febre Amarela (se visitar Amazônia, Pantanal ou áreas rurais)' },
  { id: 'insurance', label: 'Seguro viagem com cobertura médica internacional' },
  { id: 'adapter', label: 'Adaptador de tomada padrão brasileiro (Tipo N — 3 pinos)' },
  { id: 'esim', label: 'eSIM internacional ou chip brasileiro com dados no aeroporto' },
  { id: 'cards', label: 'Cartão internacional sem IOF alto (Wise/Nomad) + pouco dinheiro em espécie' },
  { id: 'apps', label: 'Apps instalados: Uber, 99, iFood e Google Tradutor offline (PT-BR)' },
];

function getChecklistState() {
  try {
    return JSON.parse(localStorage.getItem('dbt_travel_checklist') || '{}');
  } catch {
    return {};
  }
}

export default async function entryView(root) {
  render(root, html`<h1 class="page-title">${t('modules.entry.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let data;
  try {
    data = await api(`/guides/entry-health?lang=${getLang()}`, { auth: false });
  } catch (err) {
    render(root, html`<div class="card error">${errorMessage(err)}</div>`);
    return;
  }

  const rules = data.visa_rules || [];
  const health = data.health_and_vaccines || {};
  const protocol = data.emergency_medical_protocol || null;

  render(root, html`
    <h1 class="page-title">${t('modules.entry.title')}</h1>
    <p class="muted">${t('entry.subtitle')}</p>

    <!-- Checklist Pré-Viagem & Chegada (Offline) -->
    <div class="card" id="entry-checklist-card" style="margin-top:1rem; border-left:4px solid var(--c-primary);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <h3 style="margin:0; font-size:1.05rem;">✅ Checklist Pré-Viagem &amp; Chegada</h3>
        <span id="checklist-progress" class="badge badge-free">0 de ${CHECKLIST_ITEMS.length}</span>
      </div>
      <p class="small muted" style="margin:0.25rem 0 0.75rem;">Salvo automaticamente no seu aparelho (funciona offline).</p>
      <div style="display:flex; flex-direction:column; gap:0.45rem;">
        ${CHECKLIST_ITEMS.map((item) => html`
          <label style="display:flex; align-items:flex-start; gap:0.55rem; cursor:pointer; font-size:0.88rem; line-height:1.4; padding:0.35rem 0.45rem; border-radius:var(--radius-sm);">
            <input type="checkbox" class="entry-check-item" data-check-id="${item.id}" style="margin-top:0.2rem; accent-color:var(--c-primary);">
            <span>${item.label}</span>
          </label>
        `)}
      </div>
    </div>

    <!-- Regras de Visto por Nacionalidade -->
    <h2 style="margin-top:1.5rem;">🛂 ${t('entry.visaRulesTitle')}</h2>
    <div style="display:flex; flex-direction:column; gap:0.85rem; margin-top:0.75rem;">
      ${rules.map((r) => html`
        <div class="card">
          <h4>${r.country_group}</h4>
          <p class="small" style="margin-top:0.35rem;"><strong>Regra:</strong> ${r.requirement}</p>
          <p class="small muted" style="margin-top:0.25rem;">⏳ <strong>Permanência:</strong> ${r.stay_limit}</p>
          <p class="small muted" style="margin-top:0.5rem;">
            🏛️ Fonte: <a href="${r.source_url}" target="_blank" rel="noopener">${r.source} ↗</a>
          </p>
        </div>
      `)}
    </div>

    <!-- Vacinas e Cuidados Gerais -->
    <h2 style="margin-top:2rem;">💉 ${t('entry.healthTitle')}</h2>
    
    <!-- Febre Amarela -->
    <div class="card note" style="margin-top:0.75rem; border-color:#eab308; background:#fefce8;">
      <h4>🌿 ${health.yellow_fever.title}</h4>
      <p class="small" style="margin-top:0.35rem; color:#854d0e;">${health.yellow_fever.status}</p>
      <p class="small muted" style="margin-top:0.35rem;">📄 ${health.yellow_fever.requirement_doc}</p>
      <p class="small muted" style="margin-top:0.5rem;">
        🏛️ Fonte: <a href="${health.yellow_fever.source_url}" target="_blank" rel="noopener">${health.yellow_fever.source} ↗</a>
      </p>
    </div>

    <!-- Seguro Viagem -->
    <div class="card" style="margin-top:0.75rem;">
      <h4>🛡️ ${health.travel_insurance.title}</h4>
      <p class="small muted" style="margin-top:0.35rem;">${health.travel_insurance.status}</p>
    </div>

    <!-- Água Potável -->
    <div class="card" style="margin-top:0.75rem;">
      <h4>💧 ${health.tap_water.title}</h4>
      <p class="small muted" style="margin-top:0.35rem;">${health.tap_water.status}</p>
    </div>

    ${protocol ? html`
      <!-- PROTOCOLO DE URGÊNCIA E EMERGÊNCIA MÉDICA PARA TURISTAS -->
      <div style="margin-top:2.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="margin:0; font-size:1.35rem;">🏥 ${protocol.title}</h2>
            <p class="muted small" style="margin-top:0.25rem;">${protocol.subtitle}</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
          ${protocol.steps.map((st) => html`
            <div class="card" style="border-left: 4px solid var(--c-primary); position:relative;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
                <h3 style="font-size:1.05rem; margin:0; color:var(--c-primary-dark);">
                  ${st.icon} ${st.title}
                </h3>
                <span class="badge ${st.badge_color === 'success' ? 'badge-free' : st.badge_color === 'warning' ? 'badge-premium' : 'badge-light'}" style="flex-shrink:0;">
                  ${st.badge}
                </span>
              </div>

              ${st.items ? html`
                <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
                  ${st.items.map((it) => html`
                    <div style="padding:0.65rem 0.85rem; background:rgba(0,0,0,0.02); border:1px solid var(--c-border); border-radius:var(--radius-sm);">
                      <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${it.channel}</strong>
                        ${it.phone ? html`
                          <a class="btn btn-danger" href="tel:${it.phone}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                            📞 Ligar ${it.phone}
                          </a>
                        ` : ''}
                      </div>
                      <p class="small muted" style="margin-top:0.35rem;">${it.desc}</p>
                    </div>
                  `)}
                </div>
              ` : html`
                <p class="small muted" style="margin-top:0.5rem; line-height:1.5;">${st.desc}</p>
              `}
            </div>
          `)}
        </div>

        <!-- Atalho para tela de SOS com frases de saúde -->
        <div class="card note" style="margin-top:1rem; text-align:center;">
          <p><strong>🚨 Precisa de ajuda médica imediata agora?</strong></p>
          <p class="small muted" style="margin-top:0.25rem;">Acesse a central de emergência para números diretos e frases com áudio em português.</p>
          <a class="btn btn-danger" href="#/emergency" style="margin-top:0.75rem; display:inline-flex;">
            🚑 Abrir Central de Emergência SOS
          </a>
        </div>
      </div>
    ` : ''}

    <p class="disclaimer">${data.legal_disclaimer}</p>
  `);

  const checkState = getChecklistState();
  const progressEl = root.querySelector('#checklist-progress');
  const checkboxes = [...root.querySelectorAll('.entry-check-item')];
  const syncChecklist = () => {
    const done = checkboxes.filter((cb) => cb.checked).length;
    if (progressEl) progressEl.textContent = `${done} de ${CHECKLIST_ITEMS.length}`;
  };
  checkboxes.forEach((cb) => {
    cb.checked = Boolean(checkState[cb.dataset.checkId]);
    cb.addEventListener('change', () => {
      checkState[cb.dataset.checkId] = cb.checked;
      localStorage.setItem('dbt_travel_checklist', JSON.stringify(checkState));
      syncChecklist();
    });
  });
  syncChecklist();
}

