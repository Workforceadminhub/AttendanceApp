/**
 * i18n scaffold - start replacing hardcoded user-facing strings with t() calls
 * even before deciding on a translation backend. Keeps the messages indexable
 * and makes a future translation pass cheap.
 *
 * For now this is a pass-through: t("Some string") returns "Some string".
 *
 * UPGRADE PATH:
 *   - Pick a runtime: react-i18next (most common), Lingui, or FormatJS/intl
 *   - Replace `messages` below with the chosen library's API
 *   - All call sites stay the same
 *
 * Conventions:
 *   - Use the English string as the key. Avoid template literals (hard to translate).
 *   - For interpolation, pass placeholders explicitly: t("Hello {name}", { name }).
 */

const messages = {
  en: {},
};

let activeLocale = "en";

export function setLocale(locale) {
  if (messages[locale]) activeLocale = locale;
}

export function getLocale() {
  return activeLocale;
}

/**
 * Translate a string. Falls back to the key if not found.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 */
export function t(key, vars) {
  const dict = messages[activeLocale] || {};
  let str = dict[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replaceAll(`{${k}}`, String(v));
    });
  }
  return str;
}

const i18n = { t, setLocale, getLocale };
export default i18n;
