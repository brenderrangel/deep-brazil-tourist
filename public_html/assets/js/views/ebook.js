import { html, render } from '../core/html.js';
import { t } from '../core/i18n.js';

export default function ebookView(root) {
  render(root, html`
    <a class="back" href="#/">← ${t('common.back')}</a>
    <div class="card" style="margin-top:0.5rem; border:2px solid var(--c-primary); background:#ffffff; padding:1.5rem;">
      <div style="display:flex; gap:1.25rem; align-items:flex-start; flex-wrap:wrap;">
        <div style="background:linear-gradient(135deg, #059669, #0284c7); color:#ffffff; padding:2rem 1.5rem; border-radius:var(--radius-md); text-align:center; min-width:180px; box-shadow:var(--shadow-md);">
          <span style="font-size:3rem; display:block;" aria-hidden="true">📖</span>
          <span class="badge" style="background:#ffffff; color:#0f172a; margin-top:0.5rem;">Edição Completa</span>
          <h3 style="color:#ffffff; margin-top:0.5rem; font-size:1.1rem; line-height:1.2;">Discover Brazil</h3>
          <p class="small" style="color:#e0f2fe; margin-top:0.25rem;">95 Páginas Ilustradas</p>
        </div>

        <div style="flex:1; min-width:240px;">
          <span class="badge badge-premium">E-book Oficial & Guia de Bolso</span>
          <h1 class="page-title" style="margin-top:0.5rem; font-size:1.5rem;">Descubra o Brasil: Uma Aventura Inesquecível</h1>
          <p class="small muted" style="line-height:1.6;">
            O guia definitivo para viajantes estrangeiros com tudo o que você precisa saber para planejar sua jornada dos sonhos: praias secretas, gastronomia típica, vida noturna, serras e montanhas da Mantiqueira, ecoturismo na Amazônia e no Pantanal.
          </p>
          <div style="margin-top:1rem; display:flex; gap:0.5rem; align-items:center;">
            <a class="btn btn-primary" href="#/itineraries">Adquirir Bundle com App Premium</a>
          </div>
        </div>
      </div>

      <!-- O que está incluído no E-book -->
      <h3 style="margin-top:2rem;">O que você vai encontrar nos 11 Capítulos:</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:0.75rem; font-size:0.85rem;">
        <div class="fact">
          <strong>01. Introdução ao Brasil</strong>
          <span class="small muted">História, cultura miscigenada e requisitos de viagem.</span>
        </div>
        <div class="fact">
          <strong>02. Principais Metrópoles</strong>
          <span class="small muted">São Paulo, Rio, Salvador, Brasília, Fortaleza e Curitiba.</span>
        </div>
        <div class="fact">
          <strong>03. Pontos Icônicos</strong>
          <span class="small muted">Cataratas do Iguaçu, Teatro Amazonas e Chapadas.</span>
        </div>
        <div class="fact">
          <strong>04. Praias Paradisíacas</strong>
          <span class="small muted">Fernando de Noronha, Jericoacoara, Búzios e Florianópolis.</span>
        </div>
        <div class="fact">
          <strong>05. Montanhas & Natureza</strong>
          <span class="small muted">Serra da Mantiqueira, Monte Verde, trilhas e cânions.</span>
        </div>
        <div class="fact">
          <strong>06. Guia Culinário Completo</strong>
          <span class="small muted">Pratos tradicionais, comida de rua, sobremesas e caipirinhas.</span>
        </div>
        <div class="fact">
          <strong>07. Vida Noturna</strong>
          <span class="small muted">Lapa, Vila Madalena, Rio Vermelho e clubes beira-mar.</span>
        </div>
        <div class="fact">
          <strong>08. Experiências Culturais</strong>
          <span class="small muted">Carnaval, samba de raiz, capoeira e feiras locais.</span>
        </div>
        <div class="fact">
          <strong>09. Informações Práticas</strong>
          <span class="small muted">Transporte, segurança, voltagem e gorjetas.</span>
        </div>
        <div class="fact">
          <strong>10. Roteiros de 7 a 14 Dias</strong>
          <span class="small muted">Itinerários dia a dia para cidades e ecoturismo no Pantanal.</span>
        </div>
      </div>

      <div class="card note" style="margin-top:1.5rem; background:#ecfdf5; border-color:#059669;">
        <strong>💡 Dica do Viajante:</strong> Leve o E-book em PDF no seu celular para leitura durante voos e sem sinal de internet, e use este WebApp para consultas rápidas, tradução com áudio e atendimento do Concierge!
      </div>
    </div>
  `);
}

