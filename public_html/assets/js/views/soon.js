import { html, render } from '../core/html.js';
import { t } from '../core/i18n.js';

export function soonView(root, { params }) {
  const key = params.key || 'arrival';
  render(root, html`
    <a class="back" href="#/">← ${t('common.back')}</a>
    <div class="card" style="margin-top:1rem; text-align:center; padding:2rem 1.5rem;">
      <span style="font-size:3rem; display:block; margin-bottom:1rem;" aria-hidden="true">⏳</span>
      <h1 class="page-title">${t(`modules.${key}.title`)}</h1>
      <span class="badge badge-free" style="margin-bottom:1rem; display:inline-block;">${t('common.comingSoon')}</span>
      <p style="color:var(--c-muted); max-width:480px; margin:0 auto 1.5rem auto; line-height:1.5;">
        ${t(`coming.${key}`)}
      </p>
      <a class="btn btn-primary" href="#/">${t('common.goHome')}</a>
    </div>
  `);
}

export function notFoundView(root) {
  render(root, html`
    <div class="card" style="margin-top:2rem; text-align:center; padding:2rem 1.5rem;">
      <h1 class="page-title">${t('common.notFound')}</h1>
      <p class="muted" style="margin-bottom:1.5rem;">404</p>
      <a class="btn btn-primary" href="#/">${t('common.goHome')}</a>
    </div>
  `);
}

