import { html, render } from '../core/html.js';
import { t, errorMessage, formatDate, setLang, getLang, pick, LANGS } from '../core/i18n.js';
import { api, logout } from '../core/api.js';
import { store } from '../core/store.js';
import { navigate } from '../core/router.js';
import { applyTheme, getTheme } from '../app.js';

export default async function accountView(root, { query = {} } = {}) {
  if (!store.isLoggedIn) {
    navigate('/login?next=/account');
    return;
  }

  render(root, html`<h1 class="page-title">${t('account.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let checkoutNotice = null;
  if (query.checkout === 'success' && query.session_id) {
    try {
      const verify = await api('/payments/verify-session', {
        method: 'POST',
        body: { session_id: query.session_id },
      });
      if (verify.activated) {
        checkoutNotice = {
          type: 'success',
          text: pick({
            pt: 'Pagamento confirmado! Seu acesso Premium já está ativo.',
            en: 'Payment confirmed! Your Premium access is now active.',
            es: '¡Pago confirmado! Tu acceso Premium ya está activo.',
          }),
        };
      }
    } catch {
      checkoutNotice = {
        type: 'info',
        text: pick({
          pt: 'Pagamento em processamento pelo Stripe. Atualize a página em alguns segundos.',
          en: 'Payment is being processed by Stripe. Refresh in a few seconds.',
          es: 'Pago en procesamiento por Stripe. Actualiza en unos segundos.',
        }),
      };
    }
  } else if (query.checkout === 'cancel') {
    checkoutNotice = {
      type: 'info',
      text: pick({
        pt: 'Checkout cancelado. Nenhuma cobrança foi realizada.',
        en: 'Checkout canceled. No charge was made.',
        es: 'Pago cancelado. No se realizó ningún cargo.',
      }),
    };
  }

  let me;
  let plansData = { stripe_configured: false, plans: [] };
  try {
    const [meRes, plansRes] = await Promise.all([
      api('/me'),
      api('/payments/plans', { auth: false }).catch(() => ({ stripe_configured: false, plans: [] })),
    ]);
    me = meRes.user;
    plansData = plansRes;
    store.setUser(me);
  } catch (err) {
    render(root, html`
      <h1 class="page-title">${t('account.title')}</h1>
      <div class="card error">${errorMessage(err)}</div>
      <button id="btn-logout-fallback" class="btn btn-light">${t('auth.logout')}</button>
    `);
    root.querySelector('#btn-logout-fallback').addEventListener('click', async () => {
      await logout();
      navigate('/');
    });
    return;
  }

  render(root, html`
    <h1 class="page-title">${t('account.title')}</h1>

    ${checkoutNotice ? html`
      <div class="card ${checkoutNotice.type === 'success' ? '' : 'note'}" style="margin-bottom:1rem; border-left:4px solid ${checkoutNotice.type === 'success' ? 'var(--c-primary)' : '#eab308'};">
        <strong>${checkoutNotice.text}</strong>
      </div>
    ` : ''}

    <div class="card profile-card">
      <div class="profile-header">
        <div>
          <h2>${me.name}</h2>
          <p class="muted">${me.email}</p>
        </div>
        <div>
          <span class="badge ${me.is_premium ? 'badge-premium' : 'badge-free'}">
            ${me.is_premium ? '★ Premium' : t('account.free')}
          </span>
          ${me.role === 'admin' ? html`<span class="badge badge-premium" style="margin-left:4px;">ADMIN</span>` : ''}
        </div>
      </div>

      ${me.role === 'admin' ? html`
        <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px dashed var(--c-border);">
          <a class="btn btn-primary btn-block" href="#/admin" style="font-size:0.9rem;">⚙️ Abrir Painel Administrativo</a>
        </div>
      ` : ''}

      <div class="profile-info">
        <p>
          ${me.is_premium
      ? t('account.premiumActive', { date: formatDate(me.premium_until) })
      : t('account.upgradeSoon')}
        </p>
        <p class="small muted">
          ${me.email_verified ? `✓ ${t('account.emailVerified')}` : `⚠️ ${t('account.emailNotVerified')}`}
          ${!me.email_verified ? html` · <button id="btn-resend-verify" class="link-btn">${t('account.resendVerification')}</button>` : ''}
        </p>
        <div id="verify-sent-msg" class="small badge badge-free hidden" style="margin-top:0.5rem;">${t('account.verificationSent')}</div>
      </div>
    </div>

    <!-- Planos Premium / Stripe Checkout -->
    <div class="card" id="plans" style="border-left:4px solid var(--c-primary);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <h3 style="margin:0;">★ ${pick({ pt: 'Planos Premium', en: 'Premium Plans', es: 'Planes Premium' })}</h3>
        <span class="badge badge-premium">Stripe Checkout</span>
      </div>
      <p class="small muted" style="margin:0.35rem 0 0.85rem;">
        ${pick({
        pt: 'Desbloqueie todos os 27 roteiros pelo Brasil e acesso direto ao Concierge Humano.',
        en: 'Unlock all 27 Brazil state itineraries and direct access to our Human Concierge.',
        es: 'Desbloquea los 27 itinerarios por Brasil y acceso directo a nuestro Concierge Humano.',
      })}
      </p>

      ${plansData.plans && plansData.plans.length ? html`
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(210px, 1fr)); gap:0.75rem;">
          ${plansData.plans.map((plan) => {
        const lang = getLang();
        const label = (plan.label && (plan.label[lang] || plan.label.en || plan.label.pt)) || plan.type;
        return html`
              <div style="padding:0.85rem; border:1px solid var(--c-border); border-radius:var(--radius-sm); background:var(--c-bg); display:flex; flex-direction:column; justify-content:space-between; gap:0.6rem;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; gap:0.35rem;">
                    <strong>${label}</strong>
                    ${plan.badge ? html`<span class="badge badge-free" style="font-size:0.7rem;">${plan.badge}</span>` : ''}
                  </div>
                  <div class="tnum" style="font-size:1.35rem; font-weight:800; color:var(--c-primary-dark); margin-top:0.25rem;">
                    ${plan.currency} ${Number(plan.amount).toFixed(2)}
                  </div>
                  <div class="small muted">${t('common.days', { n: plan.days })} · ${plan.mode === 'subscription' ? pick({ pt: 'Renovação automática', en: 'Auto-renews', es: 'Renovación automática' }) : pick({ pt: 'Pagamento único', en: 'One-time pass', es: 'Pago único' })}</div>
                </div>
                <button type="button" class="btn btn-primary btn-stripe-checkout" data-price-id="${plan.price_id}" ${!plansData.stripe_configured ? 'disabled' : ''}>
                  ${plansData.stripe_configured
            ? pick({ pt: 'Assinar com Stripe', en: 'Pay with Stripe', es: 'Pagar con Stripe' })
            : pick({ pt: 'Aguardando chave Stripe', en: 'Stripe key pending', es: 'Clave Stripe pendiente' })}
                </button>
              </div>
            `;
      })}
        </div>
      ` : ''}

      ${me.is_premium ? html`
        <div style="margin-top:0.85rem;">
          <button type="button" id="btn-stripe-portal" class="btn btn-light">
            💳 ${pick({ pt: 'Gerenciar Assinatura / Faturas (Stripe)', en: 'Manage Billing / Invoices (Stripe)', es: 'Gestionar Suscripción / Facturas (Stripe)' })}
          </button>
        </div>
      ` : ''}
    </div>

    <div class="card">
      <h3>${t('nav.language')}</h3>
      <div class="form-group" style="margin-top:0.75rem;">
        <select id="acc-lang" class="input">
          ${Object.entries(LANGS).map(([k, name]) => html`
            <option value="${k}" ${k === getLang() ? 'selected' : ''}>${name}</option>
          `)}
        </select>
      </div>
    </div>

    <div class="card">
      <h3>🎨 Modo Escuro / Tema</h3>
      <p class="small muted" style="margin-top:0.25rem;">Alterne entre o tema claro e escuro a qualquer momento pelo botão 🌙 no topo ou abaixo.</p>
      <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
        <button id="theme-btn-light" class="btn ${getTheme() === 'light' ? 'btn-primary' : 'btn-light'}" style="flex:1;">
          ☀️ Modo Claro
        </button>
        <button id="theme-btn-dark" class="btn ${getTheme() === 'dark' ? 'btn-primary' : 'btn-light'}" style="flex:1;">
          🌙 Modo Escuro
        </button>
      </div>
    </div>

    <div class="card">
      <h3>${t('account.privacy')}</h3>
      <p class="small muted">${t('app.name')} respeita a LGPD e o GDPR.</p>
      <div class="privacy-actions" style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
        <button id="btn-export" class="btn btn-light">📥 ${t('account.export')}</button>
        <button id="btn-delete" class="btn btn-danger">🗑️ ${t('account.delete')}</button>
      </div>
      <div id="delete-box" class="card note hidden" style="margin-top:1rem; border-color:var(--c-red);">
        <p><strong>${t('account.deleteConfirm')}</strong></p>
        <div class="form-group">
          <input type="password" id="del-pass" class="input" placeholder="${t('auth.password')}">
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button id="btn-confirm-delete" class="btn btn-danger">${t('account.delete')}</button>
          <button id="btn-cancel-delete" class="btn btn-light">${t('common.cancel')}</button>
        </div>
      </div>
    </div>

    <div style="margin-top:1.5rem; text-align:center;">
      <button id="btn-logout" class="btn btn-light btn-block">🚪 ${t('auth.logout')}</button>
    </div>
  `);

  // Stripe Checkout & Customer Portal
  root.querySelectorAll('.btn-stripe-checkout').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const priceId = btn.getAttribute('data-price-id');
      if (!priceId) return;
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = t('common.loading');
      try {
        const res = await api('/payments/checkout', { method: 'POST', body: { price_id: priceId } });
        if (res.checkout_url) {
          window.location.href = res.checkout_url;
        }
      } catch (err) {
        alert(errorMessage(err));
        btn.disabled = false;
        btn.textContent = orig;
      }
    });
  });

  root.querySelector('#btn-stripe-portal')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const res = await api('/payments/portal', { method: 'POST' });
      if (res.portal_url) {
        window.location.href = res.portal_url;
      }
    } catch (err) {
      alert(errorMessage(err));
      btn.disabled = false;
    }
  });

  // Idioma
  root.querySelector('#acc-lang').addEventListener('change', async (e) => {
    const lang = e.target.value;
    await setLang(lang);
    try {
      await api('/me', { method: 'PUT', body: { preferred_language: lang } });
    } catch { }
    navigate('/account');
  });

  // Modo Escuro / Claro
  const btnLight = root.querySelector('#theme-btn-light');
  const btnDark = root.querySelector('#theme-btn-dark');
  function updateThemeButtons(current) {
    if (btnLight && btnDark) {
      if (current === 'light') {
        btnLight.className = 'btn btn-primary';
        btnDark.className = 'btn btn-light';
      } else {
        btnLight.className = 'btn btn-light';
        btnDark.className = 'btn btn-primary';
      }
    }
  }

  btnLight?.addEventListener('click', () => {
    applyTheme('light');
    updateThemeButtons('light');
    const headerBtn = document.querySelector('#global-theme-toggle');
    if (headerBtn) {
      headerBtn.innerHTML = '🌙';
      headerBtn.title = 'Modo Escuro';
    }
  });

  btnDark?.addEventListener('click', () => {
    applyTheme('dark');
    updateThemeButtons('dark');
    const headerBtn = document.querySelector('#global-theme-toggle');
    if (headerBtn) {
      headerBtn.innerHTML = '☀️';
      headerBtn.title = 'Modo Claro';
    }
  });

  // Atualiza se o usuário alternar pelo header enquanto estiver na tela
  window.addEventListener('btc_theme_changed', (e) => {
    updateThemeButtons(e.detail.theme);
  });

  // Reenviar verificação
  const btnResend = root.querySelector('#btn-resend-verify');
  if (btnResend) {
    btnResend.addEventListener('click', async () => {
      btnResend.disabled = true;
      try {
        await api('/auth/resend-verification', { method: 'POST' });
        root.querySelector('#verify-sent-msg').classList.remove('hidden');
      } catch (err) {
        alert(errorMessage(err));
        btnResend.disabled = false;
      }
    });
  }

  // Exportar dados
  root.querySelector('#btn-export').addEventListener('click', async () => {
    try {
      const data = await api('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brasil-companion-dados-${me.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(errorMessage(err));
    }
  });

  // Excluir conta
  const delBox = root.querySelector('#delete-box');
  root.querySelector('#btn-delete').addEventListener('click', () => {
    delBox.classList.remove('hidden');
    root.querySelector('#del-pass').focus();
  });
  root.querySelector('#btn-cancel-delete').addEventListener('click', () => {
    delBox.classList.add('hidden');
  });
  root.querySelector('#btn-confirm-delete').addEventListener('click', async () => {
    const password = root.querySelector('#del-pass').value;
    if (!password) return;
    try {
      await api('/me', { method: 'DELETE', body: { password } });
      alert(t('account.deleted'));
      await logout();
      navigate('/');
    } catch (err) {
      alert(errorMessage(err));
    }
  });

  // Sair
  root.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout();
    navigate('/');
  });
}

