import { html, render } from '../core/html.js';
import { t, errorMessage } from '../core/i18n.js';
import { api } from '../core/api.js';

export default async function moneyView(root) {
  render(root, html`<h1 class="page-title">${t('modules.money.title')}</h1><p class="muted">${t('common.loading')}</p>`);

  let ratesData;
  let currentBase = 'USD';

  async function loadRate(base) {
    try {
      ratesData = await api(`/rates?base=${base}`, { auth: false });
      currentBase = base;
      draw();
    } catch (err) {
      render(root, html`
        <h1 class="page-title">${t('modules.money.title')}</h1>
        <div class="card error">${errorMessage(err)}</div>
      `);
    }
  }

  function draw() {
    const rate = ratesData.rate_to_brl || 5.45;
    const spreads = ratesData.spreads || {};

    render(root, html`
      <h1 class="page-title">${t('modules.money.title')}</h1>
      <p class="muted">${t('money.subtitle')}</p>

      <!-- Calculadora de Conversão -->
      <div class="card money-card">
        <h3>${t('money.calculatorTitle')}</h3>
        <div class="converter-box" style="margin-top:1rem;">
          <div class="form-group">
            <label>${t('money.youHave')}</label>
            <div style="display:flex; gap:0.5rem;">
              <input type="number" id="calc-amount" class="input" value="100" min="1" step="any" style="font-size:1.2rem; font-weight:700;">
              <select id="calc-base" class="input" style="width:110px; font-weight:700;">
                <option value="USD" ${currentBase === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${currentBase === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="ARS" ${currentBase === 'ARS' ? 'selected' : ''}>ARS ($)</option>
                <option value="GBP" ${currentBase === 'GBP' ? 'selected' : ''}>GBP (£)</option>
              </select>
            </div>
          </div>

          <div class="conversion-result" style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-sm); padding:1rem; text-align:center; margin:1rem 0;">
            <span class="small muted">${t('money.estimatedBRL')}</span>
            <div id="calc-result" style="font-size:1.8rem; font-weight:800; color:var(--c-primary); margin:0.25rem 0;">
              R$ ${(100 * rate).toFixed(2)}
            </div>
            <span class="small muted">1 ${currentBase} = R$ ${rate.toFixed(4)}</span>
          </div>

          <!-- Comparação Comercial vs Casa de Câmbio vs Cartão -->
          <div class="spread-comparison" style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.82rem;">
            <div class="fact">
              <span class="muted">${t('money.cashDesk')}</span>
              <strong>~ R$ ${spreads.cash_estimated ? (100 * spreads.cash_estimated).toFixed(2) : '-'}</strong>
              <span class="small muted">${t('money.cashSpreadNote')}</span>
            </div>
            <div class="fact">
              <span class="muted">${t('money.intlCard')}</span>
              <strong>~ R$ ${spreads.card_estimated ? (100 * spreads.card_estimated).toFixed(2) : '-'}</strong>
              <span class="small muted">${t('money.cardSpreadNote')}</span>
            </div>
          </div>

          <p class="small muted" style="margin-top:0.75rem; text-align:right;">
            🕒 ${ratesData.updated_at ? new Date(ratesData.updated_at).toLocaleTimeString() : ''} · ${ratesData.source}
          </p>
        </div>
      </div>

      <!-- Calculadora de Conta, Gorjeta (10%) e Divisão -->
      <div class="card money-card" style="margin-top:1rem;">
        <h3>🧾 Calculadora de Conta &amp; Gorjeta (10%)</h3>
        <p class="small muted" style="margin-top:0.2rem;">No Brasil, restaurantes costumam sugerir 10% de serviço opcional na conta.</p>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:0.75rem; margin-top:0.85rem;">
          <div class="form-group" style="margin:0;">
            <label for="bill-amount">Conta (R$)</label>
            <input type="number" id="bill-amount" class="input" value="150" min="0" step="any">
          </div>
          <div class="form-group" style="margin:0;">
            <label for="bill-people">Pessoas</label>
            <input type="number" id="bill-people" class="input" value="2" min="1" max="50" step="1">
          </div>
          <div class="form-group" style="margin:0; display:flex; align-items:flex-end;">
            <label style="display:flex; align-items:center; gap:0.45rem; cursor:pointer; padding:0.55rem 0.75rem; border:1px solid var(--c-border); border-radius:var(--radius-sm); width:100%; font-weight:600; font-size:0.86rem;">
              <input type="checkbox" id="bill-tip" checked>
              <span>Incluir +10% serviço</span>
            </label>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.65rem; margin-top:0.9rem;">
          <div class="fact" style="text-align:center;">
            <span class="small muted">Total da conta</span>
            <strong id="bill-total-brl" style="font-size:1.15rem; color:var(--c-text);">R$ 165.00</strong>
          </div>
          <div class="fact" style="text-align:center; border-color:var(--c-primary);">
            <span class="small muted">Por pessoa</span>
            <strong id="bill-per-person" style="font-size:1.15rem; color:var(--c-primary-dark);">R$ 82.50</strong>
            <span id="bill-per-person-fx" class="small muted">≈ ${(82.5 / rate).toFixed(2)} ${currentBase}</span>
          </div>
        </div>
      </div>

      <!-- Matriz de Pagamentos Locais no Brasil -->
      <h2>${t('money.paymentMatrixTitle')}</h2>
      
      <div class="card" style="margin-top:0.75rem;">
        <h4>💳 ${t('money.cardsTitle')}</h4>
        <p class="small muted" style="margin-top:0.25rem;">${t('money.cardsDesc')}</p>
      </div>

      <div class="card" style="margin-top:0.75rem;">
        <h4>⚡ ${t('money.pixTitle')}</h4>
        <p class="small muted" style="margin-top:0.25rem;">${t('money.pixDesc')}</p>
      </div>

      <div class="card" style="margin-top:0.75rem;">
        <h4>🍽️ ${t('money.tipTitle')}</h4>
        <p class="small muted" style="margin-top:0.25rem;">${t('money.tipDesc')}</p>
      </div>

      <div class="card" style="margin-top:0.75rem;">
        <h4>💵 ${t('money.cashTitle')}</h4>
        <p class="small muted" style="margin-top:0.25rem;">${t('money.cashDesc')}</p>
      </div>

      <div class="card" style="margin-top:0.75rem;">
        <h4>🏧 ${t('money.atmTitle')}</h4>
        <p class="small muted" style="margin-top:0.25rem;">${t('money.atmDesc')}</p>
      </div>
    `);

    // Eventos da calculadora
    const amountInput = root.querySelector('#calc-amount');
    const resultBox = root.querySelector('#calc-result');
    const baseSelect = root.querySelector('#calc-base');

    amountInput.addEventListener('input', () => {
      const val = parseFloat(amountInput.value) || 0;
      resultBox.textContent = `R$ ${(val * rate).toFixed(2)}`;
    });

    baseSelect.addEventListener('change', () => {
      loadRate(baseSelect.value);
    });

    // Eventos da calculadora de conta e gorjeta
    const billAmountEl = root.querySelector('#bill-amount');
    const billPeopleEl = root.querySelector('#bill-people');
    const billTipEl = root.querySelector('#bill-tip');
    const billTotalEl = root.querySelector('#bill-total-brl');
    const billPerPersonEl = root.querySelector('#bill-per-person');
    const billPerPersonFxEl = root.querySelector('#bill-per-person-fx');

    const updateBill = () => {
      const base = Math.max(0, parseFloat(billAmountEl.value) || 0);
      const people = Math.max(1, parseInt(billPeopleEl.value, 10) || 1);
      const total = billTipEl.checked ? base * 1.1 : base;
      const each = total / people;
      billTotalEl.textContent = `R$ ${total.toFixed(2)}`;
      billPerPersonEl.textContent = `R$ ${each.toFixed(2)}`;
      billPerPersonFxEl.textContent = `≈ ${(each / rate).toFixed(2)} ${currentBase}`;
    };

    billAmountEl.addEventListener('input', updateBill);
    billPeopleEl.addEventListener('input', updateBill);
    billTipEl.addEventListener('change', updateBill);
    updateBill();
  }

  loadRate('USD');
}

