import Papa from 'papaparse';

// Loads public/i18n/strings.csv (key,en,es,…). Adding a language = adding a column.
const DEFAULT = 'en';
const STORAGE_KEY = 'lang';

let table = {}; // { en: { key: text }, es: { … } }
let current = DEFAULT;
const listeners = new Set();

export async function loadStrings() {
  const res = await fetch(`${import.meta.env.BASE_URL}i18n/strings.csv`);
  if (!res.ok) throw new Error(`strings.csv: HTTP ${res.status}`);
  const { data, meta } = Papa.parse(await res.text(), { header: true, skipEmptyLines: true });
  const langs = meta.fields.filter((f) => f !== 'key');
  table = Object.fromEntries(langs.map((l) => [l, {}]));
  for (const row of data) for (const l of langs) if (row[l]) table[l][row.key] = row[l];
  current = pickInitial(langs);
  document.documentElement.lang = current;
}

function pickInitial(langs) {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (langs.includes(fromUrl)) return fromUrl;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (langs.includes(stored)) return stored;
  return DEFAULT;
}

export const languages = () => Object.keys(table);
export const lang = () => current;

/** Text for `key` in the current language, falling back to English. */
export function t(key) {
  return table[current]?.[key] ?? table[DEFAULT]?.[key] ?? key;
}

/** Fills [data-i18n] text and [data-i18n-attr="attr:key;attr2:key2"] attributes. */
export function applyTranslations(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  }
}

export function setLang(next) {
  if (!table[next] || next === current) return;
  current = next;
  localStorage.setItem(STORAGE_KEY, next);
  // Keep ?lang in sync so it doesn't override the choice on reload.
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', next);
    history.replaceState(history.state, '', url);
  }
  document.documentElement.lang = next;
  applyTranslations();
  listeners.forEach((fn) => fn(next));
}

export const onLangChange = (fn) => listeners.add(fn);
