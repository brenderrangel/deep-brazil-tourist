import { html, render } from '../core/html.js';
import { t, errorMessage, formatDate } from '../core/i18n.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { navigate } from '../core/router.js';

export default async function adminView(root) {
  if (!store.isLoggedIn || store.user?.role !== 'admin') {
    render(root, html`
      <div class="card error" style="margin-top:2rem; text-align:center;">
        <h2>403 - Acesso Negado</h2>
        <p class="muted" style="margin:0.5rem 0 1rem 0;">Apenas administradores podem acessar esta área.</p>
        <a class="btn btn-primary" href="#/">Ir para o início</a>
      </div>
    `);
    return;
  }

  render(root, html`<h1 class="page-title">⚙️ Painel Administrativo</h1><p class="muted">Carregando métricas...</p>`);

  let activeTab = 'overview';
  let statsData, phrasesData, itinerariesData, purchasesData, webhooksData, usersData;

  async function loadData() {
    try {
      statsData = await api('/admin/stats');
      renderDashboard();
    } catch (err) {
      render(root, html`<div class="card error">${errorMessage(err)}</div>`);
    }
  }

  function renderDashboard() {
    const m = statsData.metrics;

    render(root, html`
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h1 class="page-title" style="margin:0;">⚙️ Painel Administrativo</h1>
          <p class="small muted">Perfil: <strong>${store.user.email}</strong> (Admin)</p>
        </div>
        <a class="btn btn-light" href="#/account">Voltar à Conta</a>
      </div>

      <!-- Abas de Navegação Admin -->
      <div class="chips" role="tablist" style="margin-bottom:1rem;">
        <button class="chip" data-tab="overview" aria-selected="${activeTab === 'overview'}">📊 Visão Geral</button>
        <button class="chip" data-tab="phrases" aria-selected="${activeTab === 'phrases'}">💬 Frases (${m.total_phrases})</button>
        <button class="chip" data-tab="itineraries" aria-selected="${activeTab === 'itineraries'}">🗺️ Roteiros (${m.total_itineraries})</button>
        <button class="chip" data-tab="concierge" aria-selected="${activeTab === 'concierge'}">✨ Concierge</button>
        <button class="chip" data-tab="audit" aria-selected="${activeTab === 'audit'}">💳 Compras & Webhooks</button>
      </div>

      <div id="admin-tab-content"></div>
    `);

    root.querySelector('.chips').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (btn) {
        activeTab = btn.dataset.tab;
        renderDashboard();
        switchTab();
      }
    });

    switchTab();
  }

  async function switchTab() {
    const container = root.querySelector('#admin-tab-content');
    if (activeTab === 'overview') {
      const m = statsData.metrics;
      render(container, html`
        <div class="facts" style="grid-template-columns:1fr 1fr; margin-bottom:1rem;">
          <div class="fact">
            <span class="muted">Total de Usuários</span>
            <strong style="font-size:1.5rem;">${m.total_users}</strong>
          </div>
          <div class="fact">
            <span class="muted">Usuários Premium Ativos</span>
            <strong style="font-size:1.5rem; color:var(--c-primary);">${m.premium_users}</strong>
          </div>
          <div class="fact">
            <span class="muted">Compras Registradas</span>
            <strong style="font-size:1.5rem;">${m.total_purchases}</strong>
          </div>
          <div class="fact">
            <span class="muted">Eventos Webhook Processados</span>
            <strong style="font-size:1.5rem;">${m.webhooks_received}</strong>
          </div>
        </div>

        <div class="card">
          <h3>Últimos Usuários Cadastrados</h3>
          <div id="admin-users-list" style="margin-top:0.75rem;"><p class="small muted">Carregando usuários...</p></div>
        </div>
      `);

      try {
        const u = await api('/admin/users');
        const box = container.querySelector('#admin-users-list');
        render(box, html`
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${u.users.slice(0, 10).map((usr) => html`
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--c-border); padding:0.4rem 0; font-size:0.85rem;">
                <div>
                  <strong>${usr.name}</strong> <span class="muted">(${usr.email})</span>
                  ${usr.role === 'admin' ? html`<span class="badge badge-premium" style="margin-left:4px;">ADMIN</span>` : ''}
                </div>
                <div>
                  <span class="badge ${usr.is_premium ? 'badge-premium' : 'badge-free'}">
                    ${usr.is_premium ? '★ Premium' : 'Free'}
                  </span>
                </div>
              </div>
            `)}
          </div>
        `);
      } catch {}
    } else if (activeTab === 'phrases') {
      render(container, html`<p class="small muted">Carregando frases...</p>`);
      try {
        phrasesData = await api('/admin/phrases');
        renderPhrasesTab(container);
      } catch (err) {
        render(container, html`<div class="card error">${errorMessage(err)}</div>`);
      }
    } else if (activeTab === 'itineraries') {
      render(container, html`<p class="small muted">Carregando roteiros...</p>`);
      try {
        itinerariesData = await api('/admin/itineraries');
        renderItinerariesTab(container);
      } catch (err) {
        render(container, html`<div class="card error">${errorMessage(err)}</div>`);
      }
    } else if (activeTab === 'concierge') {
      render(container, html`<p class="small muted">Carregando solicitações de concierge...</p>`);
      try {
        const cData = await api('/admin/concierge');
        renderConciergeTab(container, cData.requests);
      } catch (err) {
        render(container, html`<div class="card error">${errorMessage(err)}</div>`);
      }
    } else if (activeTab === 'audit') {
      render(container, html`<p class="small muted">Carregando compras e webhooks...</p>`);
      try {
        purchasesData = await api('/admin/purchases');
        webhooksData = await api('/admin/webhooks');
        renderAuditTab(container);
      } catch (err) {
        render(container, html`<div class="card error">${errorMessage(err)}</div>`);
      }
    }
  }

  function renderPhrasesTab(container) {
    render(container, html`
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>Gestão do Fraselário</h3>
        <button id="btn-new-phrase" class="btn btn-primary" style="font-size:0.85rem; padding:0.4rem 0.8rem;">+ Nova Frase</button>
      </div>

      <!-- Formulário de Criação (oculto por padrão) -->
      <div id="box-create-phrase" class="card hidden" style="border:2px solid var(--c-primary); margin-bottom:1.5rem;">
        <h4>Cadastrar Nova Frase</h4>
        <form id="form-create-phrase" style="margin-top:0.75rem;">
          <div class="form-group">
            <label>Categoria</label>
            <select id="p-cat" class="input">
              <option value="general">Geral</option>
              <option value="dining">Restaurante</option>
              <option value="transport">Transporte</option>
              <option value="emergency">Emergência</option>
              <option value="shopping">Compras</option>
              <option value="health">Saúde</option>
            </select>
          </div>
          <div class="form-group">
            <label>Português (Frase dita no Brasil)</label>
            <input type="text" id="p-pt" class="input" placeholder="Ex: Onde fica a praia?" required>
          </div>
          <div class="form-group">
            <label>Inglês (Tradução)</label>
            <input type="text" id="p-en" class="input" placeholder="Ex: Where is the beach?" required>
          </div>
          <div class="form-group">
            <label>Fonética para falantes de Inglês (Guia de pronúncia)</label>
            <input type="text" id="p-pho-en" class="input" placeholder="Ex: OHN-jee FEE-kah ah PRY-ah?">
          </div>
          <div class="form-group">
            <label>Espanhol (Tradução)</label>
            <input type="text" id="p-es" class="input" placeholder="Ex: ¿Dónde está la playa?">
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button type="submit" class="btn btn-primary">Salvar Frase</button>
            <button type="button" id="btn-cancel-phrase" class="btn btn-light">Cancelar</button>
          </div>
        </form>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.75rem;">
        ${phrasesData.phrases.map((p) => html`
          <div class="card" style="margin-bottom:0; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span class="badge badge-free">${p.category}</span>
              <p style="font-weight:700; margin-top:0.25rem;">🇧🇷 ${p.translations.pt}</p>
              <p class="small muted">🇺🇸 ${p.translations.en} ${p.phonetics.en ? html`· 🗣 ${p.phonetics.en}` : ''}</p>
              ${p.translations.es ? html`<p class="small muted">🇪🇸 ${p.translations.es}</p>` : ''}
            </div>
            <div>
              <button class="btn btn-danger btn-del-phrase" data-id="${p.id}" style="padding:0.3rem 0.6rem; font-size:0.75rem;">Excluir</button>
            </div>
          </div>
        `)}
      </div>
    `);

    const createBox = container.querySelector('#box-create-phrase');
    container.querySelector('#btn-new-phrase').addEventListener('click', () => {
      createBox.classList.remove('hidden');
    });
    container.querySelector('#btn-cancel-phrase').addEventListener('click', () => {
      createBox.classList.add('hidden');
    });

    container.querySelector('#form-create-phrase').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = {
        category: container.querySelector('#p-cat').value,
        pt: container.querySelector('#p-pt').value.trim(),
        en: container.querySelector('#p-en').value.trim(),
        phonetic_en: container.querySelector('#p-pho-en').value.trim(),
        es: container.querySelector('#p-es').value.trim(),
      };
      try {
        await api('/admin/phrases', { method: 'POST', body });
        switchTab();
      } catch (err) {
        alert(errorMessage(err));
      }
    });

    container.querySelectorAll('.btn-del-phrase').forEach((b) => {
      b.addEventListener('click', async () => {
        if (!confirm('Deseja excluir esta frase?')) return;
        try {
          await api(`/admin/phrases/${b.dataset.id}`, { method: 'DELETE' });
          switchTab();
        } catch (err) {
          alert(errorMessage(err));
        }
      });
    });
  }

  function renderItinerariesTab(container) {
    render(container, html`
      <h3>Gestão de Roteiros e Curadoria</h3>
      <p class="small muted" style="margin:0.25rem 0 1rem 0;">Controle de publicação e datas de revisão periódica de conteúdo.</p>

      <div style="display:flex; flex-direction:column; gap:0.85rem;">
        ${itinerariesData.itineraries.map((it) => html`
          <div class="card" style="margin-bottom:0;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span class="badge ${it.is_premium ? 'badge-premium' : 'badge-free'}">
                  ${it.is_premium ? 'Premium' : 'Gratuito'}
                </span>
                <span class="badge ${it.is_published ? 'badge-free' : 'badge-offline'}" style="margin-left:4px;">
                  ${it.is_published ? '✓ Publicado' : 'Rascunho (Oculto)'}
                </span>
                <h4 style="margin-top:0.4rem;">${it.title_pt || it.title_en}</h4>
                <p class="small muted">${it.description_pt}</p>
                <p class="small muted" style="margin-top:0.25rem;">
                  Região: <strong>${it.region}</strong> · Duração: <strong>${it.duration_days} dias</strong> · Última revisão: ${it.content_updated_at ? formatDate(it.content_updated_at) : 'N/A'}
                </p>
              </div>
              <div>
                <button class="btn ${it.is_published ? 'btn-light' : 'btn-primary'} btn-toggle-pub" data-id="${it.id}" data-pub="${it.is_published}" style="font-size:0.75rem; padding:0.4rem 0.7rem;">
                  ${it.is_published ? 'Despublicar' : 'Publicar'}
                </button>
              </div>
            </div>
          </div>
        `)}
      </div>
    `);

    container.querySelectorAll('.btn-toggle-pub').forEach((b) => {
      b.addEventListener('click', async () => {
        const id = b.dataset.id;
        const currentPub = b.dataset.pub === 'true';
        try {
          await api(`/admin/itineraries/${id}/publish`, {
            method: 'PUT',
            body: { is_published: !currentPub },
          });
          switchTab();
        } catch (err) {
          alert(errorMessage(err));
        }
      });
    });
  }

  function renderConciergeTab(container, requests) {
    render(container, html`
      <h3>Atendimento do Concierge de Roteiros</h3>
      <p class="small muted">Responda às consultorias humanas de viajantes (SLA de 24h úteis).</p>

      <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
        ${requests.length ? requests.map((r) => html`
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span class="badge ${r.status === 'answered' ? 'badge-free' : 'badge-premium'}">
                  ${r.status === 'answered' ? '✓ Respondido' : 'Pendente de Resposta'}
                </span>
                <h4 style="margin-top:0.4rem;">${r.destination}</h4>
                <p class="small muted">Viajante: <strong>${r.user_name}</strong> (${r.user_email}) · Orçamento: ${r.budget_level} · Datas: ${r.travel_dates || 'Flexíveis'}</p>
              </div>
            </div>

            <p class="small" style="background:#f8fafc; border:1px solid var(--c-border); padding:0.6rem; border-radius:var(--radius-sm); margin:0.75rem 0;">
              <strong>Mensagem do Viajante:</strong><br>${r.message}
            </p>

            ${r.status === 'answered' ? html`
              <div class="note" style="padding:0.6rem; border-radius:var(--radius-sm); font-size:0.85rem;">
                <strong>Resposta enviada:</strong><br>${r.response_text}
              </div>
            ` : html`
              <form class="form-answer-concierge" data-id="${r.id}">
                <div class="form-group" style="margin-bottom:0.5rem;">
                  <label class="small">Redigir Resposta e Recomendações do Concierge:</label>
                  <textarea class="input text-response" rows="3" placeholder="Sugira rotas, melhor logística, nomes de guias locais e cuidados..." required></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Enviar Resposta ao Viajante</button>
              </form>
            `}
          </div>
        `) : html`<p class="small muted">Nenhuma solicitação de concierge pendente.</p>`}
      </div>
    `);

    container.querySelectorAll('.form-answer-concierge').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.dataset.id;
        const response_text = form.querySelector('.text-response').value.trim();
        try {
          await api(`/admin/concierge/${id}/answer`, {
            method: 'PUT',
            body: { response_text },
          });
          alert('Resposta enviada com sucesso ao viajante!');
          switchTab();
        } catch (err) {
          alert(errorMessage(err));
        }
      });
    });
  }

  function renderAuditTab(container) {
    render(container, html`
      <h3>Auditoria Financeira e Webhooks</h3>

      <div class="card" style="margin-top:1rem;">
        <h4>Últimas Compras</h4>
        ${purchasesData.purchases.length ? html`
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
            ${purchasesData.purchases.map((pc) => html`
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--c-border); padding:0.4rem 0; font-size:0.85rem;">
                <div>
                  <strong>${pc.user_name}</strong> <span class="muted">(${pc.user_email})</span>
                  <div class="small muted">Plano: ${pc.plan_type} · Período: ${formatDate(pc.start)} a ${formatDate(pc.end)}</div>
                </div>
                <div style="text-align:right;">
                  <strong>${pc.currency} ${pc.amount.toFixed(2)}</strong>
                  <div><span class="badge ${pc.status === 'active' ? 'badge-free' : 'badge-offline'}">${pc.status}</span></div>
                </div>
              </div>
            `)}
          </div>
        ` : html`<p class="small muted" style="margin-top:0.5rem;">Nenhuma compra registrada até o momento.</p>`}
      </div>

      <div class="card" style="margin-top:1rem;">
        <h4>Log de Webhooks Recebidos (Idempotência)</h4>
        ${webhooksData.webhooks.length ? html`
          <div style="display:flex; flex-direction:column; gap:0.4rem; margin-top:0.5rem; font-family:monospace; font-size:0.8rem;">
            ${webhooksData.webhooks.map((w) => html`
              <div style="background:#f8fafc; border:1px solid var(--c-border); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); display:flex; justify-content:space-between;">
                <span><strong>${w.event_type}</strong> (${w.event_id})</span>
                <span class="muted">${new Date(w.processed_at).toLocaleString()}</span>
              </div>
            `)}
          </div>
        ` : html`<p class="small muted" style="margin-top:0.5rem;">Nenhum webhook registrado no log.</p>`}
      </div>
    `);
  }

  loadData();
}

