import { html, render } from '../core/html.js';
import { t, errorMessage, fieldError, getLang } from '../core/i18n.js';
import { api } from '../core/api.js';
import { store } from '../core/store.js';
import { navigate } from '../core/router.js';

export function loginView(root, { query }) {
  render(root, html`
    <div class="card auth-card">
      <h1 class="page-title">${t('auth.login')}</h1>
      <form id="form-login" novalidate>
        <div id="login-error" class="form-error hidden"></div>
        <div class="form-group">
          <label for="f-email">${t('auth.email')}</label>
          <input type="email" id="f-email" class="input" required autocomplete="email">
          <div class="field-error" id="err-email"></div>
        </div>
        <div class="form-group">
          <label for="f-pass">${t('auth.password')}</label>
          <input type="password" id="f-pass" class="input" required autocomplete="current-password">
          <div class="field-error" id="err-pass"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${t('auth.login')}</button>
      </form>
      <div class="auth-links">
        <a href="#/forgot-password">${t('auth.forgot')}</a>
        <span>·</span>
        <a href="#/register">${t('auth.noAccount')}</a>
      </div>
    </div>
  `);

  const form = root.querySelector('#form-login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = root.querySelector('#login-error');
    errBox.classList.add('hidden');

    const email = root.querySelector('#f-email').value.trim();
    const password = root.querySelector('#f-pass').value;

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      store.setSession(data);
      navigate(query.next || '/');
    } catch (err) {
      errBox.textContent = errorMessage(err);
      errBox.classList.remove('hidden');
    }
  });
}

export function registerView(root) {
  render(root, html`
    <div class="card auth-card">
      <h1 class="page-title">${t('auth.register')}</h1>
      <form id="form-register" novalidate>
        <div id="reg-error" class="form-error hidden"></div>
        <div class="form-group">
          <label for="r-name">${t('auth.name')}</label>
          <input type="text" id="r-name" class="input" required autocomplete="name">
          <div class="field-error" id="err-name"></div>
        </div>
        <div class="form-group">
          <label for="r-email">${t('auth.email')}</label>
          <input type="email" id="r-email" class="input" required autocomplete="email">
          <div class="field-error" id="err-email"></div>
        </div>
        <div class="form-group">
          <label for="r-pass">${t('auth.password')}</label>
          <input type="password" id="r-pass" class="input" required autocomplete="new-password">
          <span class="small muted">${t('auth.passwordHint')}</span>
          <div class="field-error" id="err-password"></div>
        </div>
        <div class="form-group">
          <label for="r-country">${t('auth.country')}</label>
          <input type="text" id="r-country" class="input" value="US" maxlength="50">
        </div>
        <div class="form-check">
          <input type="checkbox" id="r-terms" required>
          <label for="r-terms">${t('auth.acceptTerms')}</label>
          <div class="field-error" id="err-accept_terms"></div>
        </div>
        <div class="form-check">
          <input type="checkbox" id="r-privacy" required>
          <label for="r-privacy">${t('auth.acceptPrivacy')}</label>
          <div class="field-error" id="err-accept_privacy"></div>
        </div>
        <div class="form-check">
          <input type="checkbox" id="r-market">
          <label for="r-market">${t('auth.marketing')}</label>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${t('auth.register')}</button>
      </form>
      <div class="auth-links">
        <a href="#/login">${t('auth.haveAccount')}</a>
      </div>
    </div>
  `);

  const form = root.querySelector('#form-register');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    root.querySelectorAll('.field-error').forEach((el) => { el.textContent = ''; });
    const errBox = root.querySelector('#reg-error');
    errBox.classList.add('hidden');

    const body = {
      name: root.querySelector('#r-name').value.trim(),
      email: root.querySelector('#r-email').value.trim(),
      password: root.querySelector('#r-pass').value,
      country_of_origin: root.querySelector('#r-country').value.trim() || 'US',
      preferred_language: getLang(),
      accept_terms: root.querySelector('#r-terms').checked,
      accept_privacy: root.querySelector('#r-privacy').checked,
      marketing_opt_in: root.querySelector('#r-market').checked,
    };

    try {
      const data = await api('/auth/register', { method: 'POST', body, auth: false });
      store.setSession(data);
      navigate('/');
    } catch (err) {
      if (err.fields) {
        Object.keys(err.fields).forEach((f) => {
          const el = root.querySelector(`#err-${f}`);
          if (el) el.textContent = fieldError(err, f);
        });
      }
      errBox.textContent = errorMessage(err);
      errBox.classList.remove('hidden');
    }
  });
}

export function forgotPasswordView(root) {
  render(root, html`
    <div class="card auth-card">
      <h1 class="page-title">${t('auth.forgotTitle')}</h1>
      <div id="forgot-notice" class="card note hidden"></div>
      <form id="form-forgot">
        <div class="form-group">
          <label for="f-email">${t('auth.email')}</label>
          <input type="email" id="f-email" class="input" required>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${t('auth.sendLink')}</button>
      </form>
      <div class="auth-links">
        <a href="#/login">← ${t('auth.login')}</a>
      </div>
    </div>
  `);

  root.querySelector('#form-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = root.querySelector('#f-email').value.trim();
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
      const notice = root.querySelector('#forgot-notice');
      notice.textContent = t('auth.forgotSent');
      notice.classList.remove('hidden');
      root.querySelector('#form-forgot').classList.add('hidden');
    } catch (err) {
      alert(errorMessage(err));
    }
  });
}

export function resetPasswordView(root, { query }) {
  const token = query.token || '';
  render(root, html`
    <div class="card auth-card">
      <h1 class="page-title">${t('auth.resetTitle')}</h1>
      <div id="reset-done" class="card note hidden">
        ${t('auth.resetDone')}
        <div style="margin-top:0.75rem;"><a class="btn btn-primary" href="#/login">${t('auth.login')}</a></div>
      </div>
      <form id="form-reset">
        <div class="form-group">
          <label for="r-newpass">${t('auth.newPassword')}</label>
          <input type="password" id="r-newpass" class="input" required>
          <span class="small muted">${t('auth.passwordHint')}</span>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${t('common.save')}</button>
      </form>
    </div>
  `);

  root.querySelector('#form-reset').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = root.querySelector('#r-newpass').value;
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false });
      root.querySelector('#form-reset').classList.add('hidden');
      root.querySelector('#reset-done').classList.remove('hidden');
    } catch (err) {
      alert(errorMessage(err));
    }
  });
}

export async function verifyEmailView(root, { query }) {
  render(root, html`<p class="muted">${t('common.loading')}</p>`);
  const token = query.token || '';
  try {
    await api('/auth/verify-email', { method: 'POST', body: { token }, auth: false });
    render(root, html`
      <div class="card auth-card">
        <h1 class="page-title">${t('auth.verifyTitle')}</h1>
        <p class="badge badge-free" style="display:inline-block;margin:1rem 0;">✓ ${t('auth.verifyOk')}</p>
        <div><a class="btn btn-primary" href="#/">${t('common.goHome')}</a></div>
      </div>
    `);
  } catch {
    render(root, html`
      <div class="card auth-card">
        <h1 class="page-title">${t('auth.verifyTitle')}</h1>
        <p class="form-error">${t('auth.verifyFail')}</p>
        <div><a class="btn btn-light" href="#/">${t('common.goHome')}</a></div>
      </div>
    `);
  }
}

