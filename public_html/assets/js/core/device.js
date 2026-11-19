/**
 * Detecção reativa de dispositivo, tamanho de tela, orientação e modo de entrada.
 * Atualiza os atributos `data-device`, `data-orientation`, `data-input` e `data-pwa`
 * no elemento raiz (<html>) para adaptação automática da interface.
 */

const listeners = new Set();

function computeDeviceInfo() {
  const width = window.innerWidth || document.documentElement.clientWidth || 375;
  const height = window.innerHeight || document.documentElement.clientHeight || 667;

  let type = 'mobile';
  if (width < 380) {
    type = 'mobile-sm';
  } else if (width < 768) {
    type = 'mobile';
  } else if (width < 1024) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  const orientation = width > height ? 'landscape' : 'portrait';

  const isTouch =
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    'ontouchstart' in window ||
    (navigator.maxTouchPoints > 0);

  const isStandalone =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean(window.navigator.standalone);

  return {
    type,
    width,
    height,
    orientation,
    input: isTouch ? 'touch' : 'mouse',
    isMobile: type === 'mobile' || type === 'mobile-sm',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    isStandalone,
  };
}

let currentInfo = computeDeviceInfo();

function applyDeviceAttributes(info) {
  const root = document.documentElement;
  root.setAttribute('data-device', info.type);
  root.setAttribute('data-orientation', info.orientation);
  root.setAttribute('data-input', info.input);
  root.setAttribute('data-pwa', info.isStandalone ? 'true' : 'false');
}

function handleViewportChange() {
  const next = computeDeviceInfo();
  const changed =
    next.type !== currentInfo.type ||
    next.orientation !== currentInfo.orientation ||
    next.input !== currentInfo.input;

  currentInfo = next;
  applyDeviceAttributes(currentInfo);

  if (changed) {
    listeners.forEach((fn) => {
      try {
        fn(currentInfo);
      } catch (e) {
        console.warn('Erro em listener de device:', e);
      }
    });
  }
}

export function initDeviceDetection() {
  currentInfo = computeDeviceInfo();
  applyDeviceAttributes(currentInfo);

  let rafId = null;
  const onResize = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(handleViewportChange);
  };

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  return currentInfo;
}

export function getDeviceInfo() {
  return currentInfo;
}

export function onDeviceChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

