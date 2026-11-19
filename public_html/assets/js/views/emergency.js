import { html, render } from '../core/html.js';
import { t, getLang, pick } from '../core/i18n.js';
import { api } from '../core/api.js';
import { phraseCard, bindPhraseCards } from './phrase-card.js';
import { icon } from '../core/icons.js';
import { EMBASSIES_DATA, EMBASSY_FLAGS, localizeEmbassy, getGoogleMapsCoordsUrl, sanitizeTelHref } from '../core/embassies-data.js';

// Números nacionais de emergência
const NUMBERS = [
  { n: '192', key: 'ambulance', iconName: 'heartPulse' },
  { n: '190', key: 'police', iconName: 'shield' },
  { n: '193', key: 'fire', iconName: 'flame' },
];

// Protocolo médico de urgência e emergência para turistas em 3 idiomas
const HEALTH_GUIDE = {
  pt: {
    title: 'Passou Mal no Brasil? Atendimento de Saúde',
    subtitle: 'Como turista estrangeiro, você tem direito constitucional a atendimento médico de emergência gratuito. Siga este passo a passo de acordo com a gravidade:',
    step1_title: '1. Atendimento de Emergência (100% Gratuito pelo SUS)',
    step1_badge: '100% Grátis',
    samu_title: '🚑 SAMU (Disque 192)',
    samu_call: 'Ligar 192',
    samu_desc: 'Emergências médicas graves (risco de vida): acidentes graves, dor no peito/infarto, falta de ar severa, crises hipertensivas, afogamentos, convulsões ou desmaios. Atendimento móvel por ambulância gratuito 24h por dia.',
    upa_title: '🏥 UPA 24h (Unidade de Pronto Atendimento)',
    upa_desc: 'Problemas agudos sem risco de vida imediato: febre alta persistente, vômitos contínuos/intoxicação alimentar, dores fortes, mal-estar súbito, cortes que precisam de pontos. Procure a UPA 24h mais próxima com seu passaporte ou documento.',
    sus_note: '✓ SUS Universal: O Brasil atende gratuitamente qualquer pessoa em território nacional, incluindo turistas estrangeiros, sem cobrança de taxas em emergências da rede pública.',
    step2_title: '2. Atendimento Particular (Hospitais Privados)',
    step2_badge: 'Pago / Seguro',
    step2_desc: 'Se preferir hospitais privados (maior rapidez, acomodações privativas e suporte bilíngue), o atendimento é pago com cartão de crédito internacional ou faturado diretamente com o seguro-viagem.',
    step3_title: '3. Acionar o Seguro-Viagem',
    step3_badge: 'Seguradora',
    step3_desc: 'Se você contratou seguro-viagem, ligue imediatamente para a central 24h da sua seguradora antes de ir ao hospital. Eles indicarão a clínica credenciada mais próxima. Dica: guarde sempre os laudos médicos, receitas e Notas Fiscais para reembolso.',
    step4_title: '4. Contatar a Embaixada ou Consulado',
    step4_badge: 'Apoio Consular',
    step4_desc: 'Em casos de internações graves, cirurgias complexas, acidentes sérios ou vulnerabilidade, o turista ou acompanhante deve entrar em contato com a embaixada ou consulado do seu país no Brasil para orientações, apoio diplomático e comunicação familiar.',
  },
  en: {
    title: 'Falling Ill in Brazil? Emergency Medical Care',
    subtitle: 'Foreign tourists have constitutional rights to free emergency medical care in Brazil. Follow these essential steps based on severity:',
    step1_title: '1. Emergency Medical Care (100% Free via SUS)',
    step1_badge: '100% Free',
    samu_title: '🚑 SAMU (Dial 192)',
    samu_call: 'Call 192',
    samu_desc: 'Severe life-threatening emergencies: serious accidents, chest pain/heart attack, acute breathing distress, severe hypertension, drowning, seizures. Free 24/7 mobile paramedic ambulance.',
    upa_title: '🏥 UPA 24h (Urgent Care Clinic)',
    upa_desc: 'Acute health issues without immediate life threat: high persistent fever, acute food poisoning/vomiting, severe cramps, sudden illness, cuts needing stitches. Walk into the nearest UPA 24h with your passport.',
    sus_note: '✓ Universal Healthcare (SUS): Brazil legally provides free emergency medical care to anyone on Brazilian soil, including foreign tourists, with zero out-of-pocket charges at public facilities.',
    step2_title: '2. Private Hospitals (Rede Particular)',
    step2_badge: 'Paid / Insurance',
    step2_desc: 'If you prefer private hospital infrastructure (faster service, private rooms, English-speaking staff), you can visit top private hospitals. Costs are paid directly (credit card) or covered by travel insurance.',
    step3_title: '3. Activating Your Travel Insurance',
    step3_badge: 'Insurance',
    step3_desc: 'If you purchased travel insurance, call their 24h emergency hotline immediately. The insurer will direct you to an accredited clinic. Always request and keep medical reports, prescriptions, and official tax receipts (Notas Fiscais) for reimbursement.',
    step4_title: '4. Contacting Your Embassy or Consulate',
    step4_badge: 'Diplomatic Support',
    step4_desc: 'In severe circumstances (major surgeries, prolonged ICU hospitalization, incapacitating accidents, or high vulnerability), contact your home country\'s embassy or consulate in Brazil for diplomatic assistance and family liaison.',
  },
  es: {
    title: '¿Se siente mal en Brasil? Atención Médica de Emergencia',
    subtitle: 'Los turistas extranjeros tienen derecho constitucional a atención médica de emergencia gratuita en Brasil. Siga estos pasos según la gravedad:',
    step1_title: '1. Atención de Emergencia (100% Gratuita por el SUS)',
    step1_badge: '100% Gratis',
    samu_title: '🚑 SAMU (Marque 192)',
    samu_call: 'Llamar 192',
    samu_desc: 'Emergencias médicas graves con riesgo de vida: accidentes severos, dolor en el pecho/infarto, dificultad respiratoria aguda, traumatismos, ahogamientos, convulsiones. Ambulancia gratuita 24 horas.',
    upa_title: '🏥 UPA 24h (Unidad de Pronta Atención)',
    upa_desc: 'Problemas agudos sin riesgo de vida inmediato: fiebre alta persistente, vómitos/intoxicación alimentaria, dolores fuertes, malestar súbito, cortes que requieren puntos. Acuda a la UPA 24h más cercana con su pasaporte.',
    sus_note: '✓ SUS Universal: Brasil atiende gratuitamente a cualquier persona en territorio nacional, incluyendo turistas extranjeros, sin ningún cobro en emergencias de la red pública.',
    step2_title: '2. Atención Particular (Hospitales Privados)',
    step2_badge: 'Pago / Seguro',
    step2_desc: 'Si prefiere hospitales privados (mayor rapidez, habitaciones privadas, personal bilingüe), acuda a un centro privado. La atención es de pago (tarjeta de crédito) o cubierta por su seguro de viaje.',
    step3_title: '3. Activar el Seguro de Viaje',
    step3_badge: 'Aseguradora',
    step3_desc: 'Si contrató seguro de viaje, llame de inmediato a su central 24h antes de acudir al hospital. Le indicarán la clínica acreditada más cercana. Guarde siempre los informes médicos, recetas y facturas (Notas Fiscais).',
    step4_title: '4. Contactar a la Embajada o Consulado',
    step4_badge: 'Apoyo Consular',
    step4_desc: 'En casos de internaciones complejas, cirugías graves, accidentes serios o vulnerabilidad, comuníquese con la embajada o consulado de su país en Brasil para orientación diplomática y contacto familiar.',
  },
};

export default async function emergencyView(root) {
  const lang = getLang() || 'pt';
  const hg = HEALTH_GUIDE[lang] || HEALTH_GUIDE.pt;

  render(root, html`
    <h1 class="page-title">${t('emergency.title')}</h1>
    <p class="muted">${t('emergency.subtitle')}</p>
    
    <!-- Chamada Rápida de Emergência (Discagem Direta) -->
    <div class="sos-list">
      ${NUMBERS.map((x) => html`
        <a class="sos-call" href="tel:${x.n}" aria-label="${t('emergency.call', { n: x.n })}">
          <span class="sos-icon" aria-hidden="true">${icon(x.iconName, { size: 22 })}</span>
          <span class="sos-label">${x.label || t(`emergency.${x.key}`)}</span>
          <span class="sos-number tnum">${x.n}</span>
        </a>`)}
    </div>

    <!-- GUIA DETALHADO DE URGÊNCIA E EMERGÊNCIA MÉDICA PARA TURISTAS -->
    <div style="margin: 1.75rem 0;">
      <h2 class="section-title inline-meta" style="font-size:1.15rem;">
        ${icon('heartPulse', { size: 19 })} <span>${hg.title}</span>
      </h2>
      <p class="muted small" style="margin-top:0.25rem;">
        ${hg.subtitle}
      </p>

      <div style="display:flex; flex-direction:column; gap:0.85rem; margin-top:0.85rem;">
        <!-- Passo 1: SUS / SAMU / UPA -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <h3 style="color:var(--c-primary-dark); font-size:1.02rem; margin:0;">${hg.step1_title}</h3>
            <span class="badge badge-free">${hg.step1_badge}</span>
          </div>
          
          <div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.6rem;">
            <div style="padding:0.7rem 0.85rem; background:var(--c-bg); border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                <strong>${hg.samu_title.replace(/^🚑\s*/, '')}</strong>
                <a class="btn btn-danger inline-meta" href="tel:192" style="padding:0.28rem 0.65rem; font-size:0.75rem;">
                  ${icon('phone', { size: 13 })} <span class="tnum">${hg.samu_call}</span>
                </a>
              </div>
              <p class="small muted" style="margin-top:0.35rem; line-height:1.45;">${hg.samu_desc}</p>
            </div>

            <div style="padding:0.7rem 0.85rem; background:var(--c-bg); border:1px solid var(--c-border); border-radius:var(--radius-sm);">
              <strong>${hg.upa_title.replace(/^🏥\s*/, '')}</strong>
              <p class="small muted" style="margin-top:0.35rem; line-height:1.45;">${hg.upa_desc}</p>
            </div>

            <p class="small inline-meta" style="color:var(--c-primary-dark); font-weight:600; margin:0.2rem 0 0 0; align-items:flex-start;">
              <span style="margin-top:2px;">${icon('check', { size: 15 })}</span>
              <span>${hg.sus_note.replace(/^✓\s*/, '')}</span>
            </p>
          </div>
        </div>

        <!-- Passo 2: Hospitais Privados -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <h3 style="font-size:1.02rem; margin:0;">${hg.step2_title}</h3>
            <span class="guide-badge">${hg.step2_badge}</span>
          </div>
          <p class="small muted" style="margin-top:0.5rem; line-height:1.5;">${hg.step2_desc}</p>
        </div>

        <!-- Passo 3: Seguro-Viagem -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <h3 style="font-size:1.02rem; margin:0;">${hg.step3_title}</h3>
            <span class="badge badge-premium">${hg.step3_badge}</span>
          </div>
          <p class="small muted" style="margin-top:0.5rem; line-height:1.5;">${hg.step3_desc}</p>
        </div>

        <!-- Passo 4: Embaixada ou Consulado -->
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <h3 style="font-size:1.02rem; margin:0;">${hg.step4_title}</h3>
            <span class="badge badge-offline">${hg.step4_badge}</span>
          </div>
          <p class="small muted" style="margin-top:0.5rem; line-height:1.5;">${hg.step4_desc}</p>
          <div style="margin-top:0.65rem;">
            <button type="button" id="btn-scroll-embassies" class="btn btn-light" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
              🏛️ ${pick({ pt: 'Consultar Lista de Embaixadas no Brasil ↓', en: 'View Embassies in Brazil ↓', es: 'Ver Lista de Embajadas en Brasil ↓' })}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CARTÃO DE EMERGÊNCIA PESSOAL (OFFLINE) -->
    <div class="card" style="margin-top:1.75rem; border-left:4px solid var(--c-danger);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <h2 style="font-size:1.1rem; margin:0;">🪪 ${pick({ pt: 'Meu Cartão de Emergência (Offline)', en: 'My Emergency Card (Offline)', es: 'Mi Tarjeta de Emergencia (Sin conexión)' })}</h2>
        <span class="badge badge-offline">${pick({ pt: 'Salvo só no aparelho', en: 'Saved on device only', es: 'Guardado solo en el dispositivo' })}</span>
      </div>
      <p class="small muted" style="margin:0.35rem 0 0.85rem;">${pick({ pt: 'Preencha seus dados essenciais para exibir rapidamente em português para médicos, polícia ou motorista.', en: 'Fill in your essential details to quickly display them in Portuguese to doctors, police or drivers.', es: 'Completa tus datos esenciales para mostrarlos rápidamente en portugués a médicos, policía o conductores.' })}</p>
      <form id="em-card-form" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.65rem;">
        <input type="text" id="ec-name" class="input" placeholder="${pick({ pt: 'Nome completo', en: 'Full name', es: 'Nombre completo' })}">
        <input type="text" id="ec-country" class="input" placeholder="${pick({ pt: 'País / Passaporte', en: 'Country / Passport', es: 'País / Pasaporte' })}">
        <input type="text" id="ec-blood" class="input" placeholder="${pick({ pt: 'Tipo sanguíneo (ex: O+)', en: 'Blood type (e.g. O+)', es: 'Grupo sanguíneo (ej: O+)' })}">
        <input type="text" id="ec-allergies" class="input" placeholder="${pick({ pt: 'Alergias / Medicações', en: 'Allergies / Medications', es: 'Alergias / Medicamentos' })}">
        <input type="text" id="ec-insurance" class="input" placeholder="${pick({ pt: 'Seguro viagem / Apólice / Tel.', en: 'Travel insurance / Policy / Phone', es: 'Seguro de viaje / Póliza / Tel.' })}">
        <input type="text" id="ec-contact" class="input" placeholder="${pick({ pt: 'Contato de emergência', en: 'Emergency contact', es: 'Contacto de emergencia' })}">
        <input type="text" id="ec-hotel" class="input" placeholder="${pick({ pt: 'Endereço do hotel no Brasil', en: 'Hotel address in Brazil', es: 'Dirección del hotel en Brasil' })}" style="grid-column:1 / -1;">
        <div style="grid-column:1 / -1; display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.25rem;">
          <button type="submit" class="btn btn-primary">${pick({ pt: 'Salvar no aparelho', en: 'Save on device', es: 'Guardar en el dispositivo' })}</button>
          <button type="button" id="ec-show-btn" class="btn btn-danger">${pick({ pt: 'Mostrar em Tela Cheia', en: 'Show Full Screen (PT)', es: 'Mostrar en Pantalla Completa (PT)' })}</button>
          <span id="ec-saved-msg" class="small" style="align-self:center; color:var(--c-primary-dark); font-weight:700;"></span>
        </div>
      </form>
    </div>

    <!-- EMBAIXADAS NO BRASIL -->
    <section id="embassies-section" style="margin-top:1.75rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:0.5rem; flex-wrap:wrap;">
        <div>
          <h2 class="section-title inline-meta" style="font-size:1.15rem; margin:0;">
            ${icon('landmark', { size: 19 })} <span>${pick({ pt: 'Embaixadas no Brasil', en: 'Embassies in Brazil', es: 'Embajadas en Brasil' })}</span>
          </h2>
          <p class="muted small" style="margin-top:0.25rem;">
            ${pick({ pt: 'Endereços em Brasília, telefones de plantão, consulados e coordenadas com abertura direta no Google Maps.', en: 'Brasília addresses, emergency hotlines, consulates and coordinates linking directly to Google Maps.', es: 'Direcciones en Brasilia, teléfonos de emergencia, consulados y coordenadas con apertura directa en Google Maps.' })}
          </p>
        </div>
        <span class="badge badge-free tnum">${EMBASSIES_DATA.length} ${pick({ pt: 'países', en: 'countries', es: 'países' })}</span>
      </div>

      <div style="margin-top:0.75rem; display:flex; flex-direction:column; gap:0.65rem;">
        <div class="search-box-row">
          <div class="search-input-wrap">
            <span class="search-icon" aria-hidden="true">${icon('search', { size: 17 })}</span>
            <input type="search" id="embassy-search" placeholder="${pick({ pt: 'Buscar por país, consulado (ex: São Paulo, Itália, US)...', en: 'Search by country or consulate (e.g. São Paulo, Italy, US)...', es: 'Buscar por país o consulado (ej: São Paulo, Italia, US)...' })}">
          </div>
        </div>

        <div class="category-pills-row" id="embassy-region-pills">
          ${[
            { key: 'Todas', label: pick({ pt: 'Todas', en: 'All', es: 'Todas' }) },
            { key: 'América do Sul', label: pick({ pt: 'América do Sul', en: 'South America', es: 'América del Sur' }) },
            { key: 'América do Norte', label: pick({ pt: 'América do Norte', en: 'North America', es: 'América del Norte' }) },
            { key: 'Europa', label: pick({ pt: 'Europa', en: 'Europe', es: 'Europa' }) },
            { key: 'Ásia', label: pick({ pt: 'Ásia', en: 'Asia', es: 'Asia' }) },
          ].map((reg, idx) => html`
            <button type="button" class="category-pill ${idx === 0 ? 'active' : ''}" data-region="${reg.key}">
              <span>${reg.label}</span>
            </button>
          `)}
        </div>
      </div>

      <div id="embassies-list" class="scenic-grid" style="margin-top:0.85rem;"></div>
    </section>

    <!-- FRASES ÚTEIS DE EMERGÊNCIA MÉDICA -->
    <h2 class="section-title inline-meta" style="margin-top:1.75rem; font-size:1.12rem;">
      ${icon('message', { size: 18 })} <span>${t('emergency.phrases')}</span>
    </h2>
    <p class="muted small" style="margin-top:0.25rem;">Toque para ouvir a pronúncia em português ou ampliar na tela para mostrar ao socorrista/médico:</p>
    <div id="em-phrases" class="phrase-list" style="margin-top:0.75rem;"><p class="muted">${t('common.loading')}</p></div>
    
    <p class="disclaimer">${t('emergency.disclaimer')}</p>
  `);

  // Cartão de emergência pessoal (localStorage)
  const EC_KEY = 'dbt_emergency_card';
  const loadCard = () => {
    try { return JSON.parse(localStorage.getItem(EC_KEY) || '{}'); } catch { return {}; }
  };
  const savedCard = loadCard();
  const ecFields = ['name', 'country', 'blood', 'allergies', 'insurance', 'contact', 'hotel'];
  ecFields.forEach((f) => {
    const el = root.querySelector(`#ec-${f}`);
    if (el && savedCard[f]) el.value = savedCard[f];
  });

  const ecForm = root.querySelector('#em-card-form');
  const ecMsg = root.querySelector('#ec-saved-msg');
  ecForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {};
    ecFields.forEach((f) => { payload[f] = (root.querySelector(`#ec-${f}`)?.value || '').trim(); });
    localStorage.setItem(EC_KEY, JSON.stringify(payload));
    if (ecMsg) {
      ecMsg.textContent = pick({ pt: '✓ Salvo offline', en: '✓ Saved offline', es: '✓ Guardado sin conexión' });
      setTimeout(() => { ecMsg.textContent = ''; }, 2500);
    }
  });

  root.querySelector('#ec-show-btn')?.addEventListener('click', () => {
    const d = {};
    ecFields.forEach((f) => { d[f] = (root.querySelector(`#ec-${f}`)?.value || '').trim(); });
    const overlay = document.createElement('div');
    overlay.className = 'big-phrase';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    render(overlay, html`
      <p class="big-pt" style="font-size:1.5rem; margin-bottom:0.75rem;" lang="pt-BR">🪪 FICHA DE EMERGÊNCIA (TURISTA)</p>
      <div style="text-align:left; max-width:540px; width:100%; background:rgba(255,255,255,0.12); padding:1.1rem 1.25rem; border-radius:14px; font-size:1.05rem; line-height:1.65;">
        <div><strong>Nome:</strong> ${d.name || '—'}</div>
        <div><strong>País / Passaporte:</strong> ${d.country || '—'}</div>
        <div><strong>Tipo Sanguíneo:</strong> ${d.blood || '—'}</div>
        <div><strong>Alergias / Medicações:</strong> ${d.allergies || 'Nenhuma informada'}</div>
        <div><strong>Seguro Viagem:</strong> ${d.insurance || '—'}</div>
        <div><strong>Contato de Emergência:</strong> ${d.contact || '—'}</div>
        <div><strong>Hospedagem no Brasil:</strong> ${d.hotel || '—'}</div>
      </div>
      <div class="big-actions" style="margin-top:1.25rem;">
        <button class="btn btn-light" data-action="close">${t('common.close')}</button>
      </div>
    `);
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="close"]') || e.target === overlay) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="close"]')?.focus();
  });

  // Scroll suave para a lista de embaixadas a partir do Passo 4
  root.querySelector('#btn-scroll-embassies')?.addEventListener('click', () => {
    root.querySelector('#embassies-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Renderização e filtros do Diretório de Embaixadas no Brasil
  const embassiesBox = root.querySelector('#embassies-list');
  const embassySearch = root.querySelector('#embassy-search');
  const regionPills = root.querySelectorAll('#embassy-region-pills .category-pill');
  let activeRegion = 'Todas';
  let searchTerm = '';

  function renderEmbassies() {
    if (!embassiesBox) return;
    const q = searchTerm.trim().toLowerCase();
    const list = EMBASSIES_DATA
      .map((rawEmb) => localizeEmbassy(rawEmb, lang))
      .filter((emb) => {
        const matchRegion = activeRegion === 'Todas' || emb.regiao === activeRegion;
        if (!matchRegion) return false;
        if (!q) return true;
        return (
          emb.paisLocal.toLowerCase().includes(q) ||
          emb.pais.pt.toLowerCase().includes(q) ||
          emb.codigo_iso.toLowerCase().includes(q) ||
          emb.nomeLocal.toLowerCase().includes(q) ||
          emb.consulados_principais.some((c) => c.toLowerCase().includes(q)) ||
          emb.observacoesLocal.toLowerCase().includes(q)
        );
      });

    if (!list.length) {
      render(embassiesBox, html`
        <div class="card" style="text-align:center; padding:1.25rem; grid-column:1 / -1;">
          <p class="muted" style="margin:0;">${pick({ pt: 'Nenhuma embaixada encontrada para este filtro.', en: 'No embassy found for this filter.', es: 'No se encontró ninguna embajada para este filtro.' })}</p>
        </div>
      `);
      return;
    }

    render(embassiesBox, html`${list.map((emb) => {
      const flag = EMBASSY_FLAGS[emb.codigo_iso] || '🏳️';
      const mapsUrl = getGoogleMapsCoordsUrl(emb.coordenadas.latitude, emb.coordenadas.longitude);
      return html`
        <article class="card" style="display:flex; flex-direction:column; gap:0.65rem; border-left:4px solid var(--c-primary);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:var(--c-text);">
                ${flag} ${emb.paisLocal} <span class="small muted" style="font-weight:600;">(${emb.codigo_iso})</span>
              </div>
              <div class="small" style="font-weight:600; color:var(--c-primary-dark);">${emb.nomeLocal}</div>
            </div>
            <span class="guide-badge" style="flex-shrink:0;">${emb.regiaoLocal}</span>
          </div>

          <div class="small" style="line-height:1.45;">
            <div><strong>${pick({ pt: 'Endereço:', en: 'Address:', es: 'Dirección:' })}</strong> ${emb.endereco} · <span class="tnum">CEP ${emb.cep}</span></div>
            <div style="margin-top:0.35rem;">
              <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
                 title="${pick({ pt: 'Abrir localização no Google Maps', en: 'Open location in Google Maps', es: 'Abrir ubicación en Google Maps' })}"
                 style="display:inline-flex; align-items:center; gap:0.35rem; padding:0.28rem 0.6rem; border-radius:9999px; background:var(--c-primary-soft); color:var(--c-primary-dark); font-weight:700; font-size:0.78rem; text-decoration:none; border:1px solid rgba(16,185,129,0.3);">
                ${icon('mapPin', { size: 14 })}
                <span class="tnum">${emb.coordenadas.latitude}, ${emb.coordenadas.longitude}</span>
                <span>· Google Maps ↗</span>
              </a>
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:0.45rem;">
            <a class="btn btn-light inline-meta" href="${sanitizeTelHref(emb.telefone)}" style="padding:0.32rem 0.65rem; font-size:0.78rem;">
              ${icon('phone', { size: 13 })} <span class="tnum">${emb.telefone}</span>
            </a>
            ${emb.emergencia ? html`
              <a class="btn btn-danger inline-meta" href="${sanitizeTelHref(emb.emergencia)}" style="padding:0.32rem 0.65rem; font-size:0.78rem;">
                🚨 ${pick({ pt: 'Plantão:', en: 'Emergency:', es: 'Emergencia:' })} <span class="tnum">${emb.emergencia}</span>
              </a>
            ` : ''}
          </div>

          <div class="small muted" style="line-height:1.45;">
            <div><strong>${pick({ pt: 'Horário:', en: 'Hours:', es: 'Horario:' })}</strong> ${emb.horarioLocal}</div>
            <div style="margin-top:0.25rem;"><strong>${pick({ pt: 'Consulados:', en: 'Consulates:', es: 'Consulados:' })}</strong> ${emb.consulados_principais.join(', ')}</div>
          </div>

          <div class="small" style="padding:0.5rem 0.65rem; background:var(--c-bg); border:1px solid var(--c-border); border-radius:var(--radius-sm); line-height:1.4;">
            💡 ${emb.observacoesLocal}
          </div>
        </article>
      `;
    })}`);
  }

  embassySearch?.addEventListener('input', (e) => {
    searchTerm = e.target.value || '';
    renderEmbassies();
  });

  regionPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeRegion = btn.getAttribute('data-region') || 'Todas';
      regionPills.forEach((b) => b.classList.toggle('active', b === btn));
      renderEmbassies();
    });
  });

  renderEmbassies();

  const box = root.querySelector('#em-phrases');
  try {
    const data = await api(`/phrasebook?lang=${getLang()}&category=emergency`, { auth: false });
    render(box, html`${data.phrases.map(phraseCard)}`);
    bindPhraseCards(box, data.phrases);
  } catch {
    render(box, html`<p class="muted">${t('errors.network_error')}</p>`);
  }
}
