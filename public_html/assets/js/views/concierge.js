import { html, render } from '../core/html.js';
import { t, errorMessage, formatDate } from '../core/i18n.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { navigate } from '../core/router.js';

export default async function conciergeView(root) {
  if (!store.isLoggedIn) {
    navigate('/login?next=/concierge');
    return;
  }

  render(root, html`<h1 class="page-title">✨ Concierge de Roteiros</h1><p class="muted">${t('common.loading')}</p>`);

  let data;
  try {
    data = await api('/concierge/requests');
  } catch (err) {
    render(root, html`<div class="card error">${errorMessage(err)}</div>`);
    return;
  }

  const isPremium = data.is_premium;
  const requests = data.requests || [];

  render(root, html`
    <a class="back" href="#/itineraries">← ${t('common.back')}</a>
    <h1 class="page-title">✨ Concierge de Roteiros</h1>
    <p class="muted">Consultoria de viagem assíncrona com especialistas locais. Tire dúvidas de segurança, logística e receba ajustes personalizados no seu roteiro.</p>

    ${!isPremium ? html`
      <div class="card locked" style="margin-top:1.25rem;">
        <span class="lock-icon" aria-hidden="true">💎</span>
        <h3>Benefício Exclusivo Premium</h3>
        <p class="small muted" style="margin:0.5rem auto 1.25rem auto; max-width:440px;">
          O Concierge é um atendimento humano dedicado que responde em até 24 horas úteis, adaptando seus planos de viagem no Brasil às suas preferências e orçamento.
        </p>
        <a class="btn btn-primary" href="#/itineraries">Ver Planos Premium (Em breve)</a>
      </div>
    ` : html`
      <!-- Formulário de Nova Consulta para Usuário Premium -->
      <div class="card" style="margin-top:1.25rem; border-left:4px solid var(--c-primary);">
        <h3>Solicitar Consultoria de Roteiro</h3>
        <p class="small muted">Preencha os detalhes e nossa equipe responderá com recomendações verificadas.</p>

        <form id="form-concierge" style="margin-top:1rem;">
          <div class="form-group">
            <label for="c-dest">Destino / Cidade de interesse no Brasil</label>
            <input type="text" id="c-dest" class="input" placeholder="Ex: Amazônia & Manaus, Chapada dos Veadeiros, Rota das Emoções" required>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
            <div class="form-group">
              <label for="c-dates">Datas estimadas</label>
              <input type="text" id="c-dates" class="input" placeholder="Ex: 10 a 20 de Julho">
            </div>
            <div class="form-group">
              <label for="c-travelers">Nº de Viajantes</label>
              <input type="number" id="c-travelers" class="input" value="2" min="1" max="20">
            </div>
          </div>

          <div class="form-group">
            <label for="c-budget">Perfil de Orçamento</label>
            <select id="c-budget" class="input">
              <option value="budget">Mochilão / Econômico (Hostels e ônibus)</option>
              <option value="moderate" selected>Moderado (Pousadas charmosas e passeios guiados)</option>
              <option value="luxury">Alto Padrão / Ecoturismo de Luxo (Lodges e aéreos privativos)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="c-interests">Interesses Principais</label>
            <input type="text" id="c-interests" class="input" placeholder="Ex: Ecoturismo, avistamento de animais, praias, gastronomia">
          </div>

          <div class="form-group">
            <label for="c-msg">Suas dúvidas ou necessidades especiais</label>
            <textarea id="c-msg" class="input" rows="4" placeholder="Descreva o que gostaria de vivenciar, dúvidas sobre aluguel de carro, estradas, segurança ou melhor época..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block">Enviar Pedido de Consultoria</button>
        </form>
      </div>
    `}

    <!-- Histórico de Solicitações do Usuário -->
    <h2 style="margin-top:2rem;">Histórico de Consultorias</h2>
    <div style="display:flex; flex-direction:column; gap:1rem; margin-top:0.75rem;">
      ${requests.length ? requests.map((r) => html`
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="badge ${r.status === 'answered' ? 'badge-free' : (r.status === 'in_review' ? 'badge-premium' : 'badge-offline')}">
                ${r.status === 'answered' ? '✓ Respondido' : (r.status === 'in_review' ? 'Em análise' : '⏳ Aguardando Especialista')}
              </span>
              <h3 style="margin-top:0.4rem;">${r.destination}</h3>
              <p class="small muted">Enviado em: ${formatDate(r.created_at)} · Viajantes: ${r.travelers_count}</p>
            </div>
          </div>

          <p class="small" style="background:#f8fafc; border:1px solid var(--c-border); padding:0.6rem; border-radius:var(--radius-sm); margin-top:0.75rem;">
            <strong>Sua mensagem:</strong> ${r.message}
          </p>

          ${r.status === 'answered' && r.response_text ? html`
            <div class="card note" style="margin-top:0.75rem; background:#ecfdf5; border-color:#10b981;">
              <strong style="color:var(--c-primary-dark);">💡 Resposta do Especialista Local:</strong>
              <p style="white-space:pre-wrap; margin-top:0.5rem; font-size:0.9rem; line-height:1.6;">${r.response_text}</p>
              <p class="small muted" style="margin-top:0.5rem; text-align:right;">Respondido em ${formatDate(r.answered_at)}</p>
            </div>
          ` : html`
            <p class="small muted" style="margin-top:0.5rem;">⏱️ Prazo de resposta: até 24 horas úteis.</p>
          `}
        </div>
      `) : html`
        <div class="card" style="text-align:center; padding:1.5rem;">
          <p class="muted">Nenhuma solicitação enviada ainda.</p>
        </div>
      `}
    </div>
  `);

  if (isPremium) {
    const form = root.querySelector('#form-concierge');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        destination: root.querySelector('#c-dest').value.trim(),
        travel_dates: root.querySelector('#c-dates').value.trim(),
        travelers_count: parseInt(root.querySelector('#c-travelers').value, 10) || 1,
        budget_level: root.querySelector('#c-budget').value,
        interests: root.querySelector('#c-interests').value.trim(),
        message: root.querySelector('#c-msg').value.trim(),
      };

      try {
        await api('/concierge/requests', { method: 'POST', body });
        alert('Sua solicitação foi enviada! Nosso concierge responderá em até 24h úteis.');
        conciergeView(root);
      } catch (err) {
        alert(errorMessage(err));
      }
    });
  }
}

