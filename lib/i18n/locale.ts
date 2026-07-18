export const LOCALE_STORAGE_KEY = "ahiaulo-locale";

export type LocaleCode = "en" | "ig";

export type LocaleDefinition = {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  flag: string;
};

/** Registry — add languages here as AhiaUlo expands. */
export const LOCALES: LocaleDefinition[] = [
  { code: "en", label: "English", nativeLabel: "English", flag: "🇬🇧" },
  { code: "ig", label: "Igbo", nativeLabel: "Igbo", flag: "🇳🇬" },
];

export const DEFAULT_LOCALE: LocaleCode = "en";

export function isLocaleCode(value: string | null | undefined): value is LocaleCode {
  return LOCALES.some((locale) => locale.code === value);
}

export function getLocaleDefinition(code: LocaleCode): LocaleDefinition {
  return LOCALES.find((locale) => locale.code === code) ?? LOCALES[0];
}

export function getStoredLocale(): LocaleCode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocaleCode(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function persistLocale(code: LocaleCode) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    // Ignore storage failures.
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = code === "ig" ? "ig" : "en";
    document.documentElement.dataset.locale = code;
    window.dispatchEvent(
      new CustomEvent(LOCALE_CHANGE_EVENT, { detail: { locale: code } }),
    );
  }
}

export const LOCALE_CHANGE_EVENT = "ahiaulo-locale-change";

export const localeInitScript = `(function(){try{var k=${JSON.stringify(LOCALE_STORAGE_KEY)};var s=localStorage.getItem(k);var t=s==="en"||s==="ig"?s:"en";document.documentElement.dataset.locale=t;document.documentElement.lang=t==="ig"?"ig":"en";}catch(e){}})();`;
