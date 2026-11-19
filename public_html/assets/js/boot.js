// Pré-inicialização síncrona (tema + tipo de dispositivo) antes da renderização.
// Arquivo externo porque a CSP de produção (script-src 'self') bloqueia scripts inline.
(function () {
  try {
    var saved = localStorage.getItem('btc_theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta && theme === 'dark') meta.setAttribute('content', '#0b1120');
    var w = window.innerWidth || 375;
    var dev = w < 380 ? 'mobile-sm' : (w < 768 ? 'mobile' : (w < 1024 ? 'tablet' : 'desktop'));
    document.documentElement.setAttribute('data-device', dev);
  } catch (e) { }
})();
