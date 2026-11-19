const LANG_MAP = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
};

const PREFERRED_VOICE_PATTERNS = [
  /natural/i,
  /online/i,
  /google/i,
  /microsoft.*(thalita|francisca|antonio|aria|jenny|elvira|dalia)/i,
  /luciana|felipe|fernanda|samantha|daniel|monica|paulina/i,
];

let cachedVoices = [];

function loadVoices() {
  if (!('speechSynthesis' in window)) return [];
  const list = window.speechSynthesis.getVoices();
  if (list.length) cachedVoices = list;
  return cachedVoices;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function normalizeLangTag(lang) {
  if (!lang) return 'pt-BR';
  const low = String(lang).toLowerCase();
  if (LANG_MAP[low]) return LANG_MAP[low];
  return lang;
}

export function pickBestVoice(lang) {
  const voices = loadVoices();
  if (!voices.length) return null;

  const target = normalizeLangTag(lang).toLowerCase();
  const base = target.split('-')[0];

  const candidates = voices.filter((v) => {
    const vl = (v.lang || '').toLowerCase();
    return vl === target || vl.startsWith(`${base}-`) || vl === base;
  });

  if (!candidates.length) return null;

  const scoreVoice = (v) => {
    let score = 0;
    const vl = (v.lang || '').toLowerCase();
    if (vl === target) score += 20;
    if (!v.localService) score += 10;
    PREFERRED_VOICE_PATTERNS.forEach((rx, idx) => {
      if (rx.test(v.name || '')) score += 30 - idx * 3;
    });
    return score;
  };

  return [...candidates].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export function cleanSpeechText(text) {
  return String(text || '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSpeechRate() {
  const mode = localStorage.getItem('btc_speech_pace') || 'natural';
  return mode === 'slow' ? 0.78 : 0.95;
}

export function setSpeechPace(mode) {
  localStorage.setItem('btc_speech_pace', mode === 'slow' ? 'slow' : 'natural');
}

export function getSpeechPace() {
  return localStorage.getItem('btc_speech_pace') === 'slow' ? 'slow' : 'natural';
}

export function speakText(text, { lang = 'pt-BR', rate = null, pitch = 1.0, triggerEl = null } = {}) {
  if (!('speechSynthesis' in window)) return;
  const cleaned = cleanSpeechText(text);
  if (!cleaned) return;

  const targetLang = normalizeLangTag(lang);
  const u = new SpeechSynthesisUtterance(cleaned);
  u.lang = targetLang;
  u.rate = rate ?? getSpeechRate();
  u.pitch = pitch;

  const voice = pickBestVoice(targetLang);
  if (voice) u.voice = voice;

  if (triggerEl) {
    document.querySelectorAll('.is-speaking').forEach((el) => el.classList.remove('is-speaking'));
    triggerEl.classList.add('is-speaking');
    u.onend = () => triggerEl.classList.remove('is-speaking');
    u.onerror = () => triggerEl.classList.remove('is-speaking');
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
