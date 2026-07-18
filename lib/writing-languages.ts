export const writingLanguages = [
  { code: "en", label: "English" },
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "ja", label: "日本語" },
  { code: "pt", label: "Português" },
  { code: "ko", label: "한국어" },
] as const;

export type WritingLanguageCode = (typeof writingLanguages)[number]["code"];

export const writingLanguageCodes = writingLanguages.map((language) => language.code);

const aliases: Record<string, WritingLanguageCode> = {
  en: "en",
  english: "en",
  "en-us": "en",
  "en-gb": "en",
  zh: "zh-CN",
  chinese: "zh-CN",
  "simplified chinese": "zh-CN",
  "简体中文": "zh-CN",
  "中文（简体）": "zh-CN",
  "zh-cn": "zh-CN",
  "zh-hans": "zh-CN",
  "traditional chinese": "zh-TW",
  "繁體中文": "zh-TW",
  "繁体中文": "zh-TW",
  "中文（繁體）": "zh-TW",
  "zh-tw": "zh-TW",
  "zh-hant": "zh-TW",
  es: "es",
  spanish: "es",
  español: "es",
  de: "de",
  german: "de",
  deutsch: "de",
  fr: "fr",
  french: "fr",
  français: "fr",
  ja: "ja",
  japanese: "ja",
  "日本語": "ja",
  pt: "pt",
  portuguese: "pt",
  português: "pt",
  "pt-br": "pt",
  "pt-pt": "pt",
  ko: "ko",
  korean: "ko",
  "한국어": "ko",
};

export function parseWritingLanguage(value: unknown): WritingLanguageCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (aliases[normalized]) return aliases[normalized];
  const prefix = writingLanguages.find((language) => normalized.startsWith(`${language.code.toLowerCase()}-`));
  return prefix?.code ?? null;
}

export function normalizeWritingLanguage(value: unknown, fallback: WritingLanguageCode = "en"): WritingLanguageCode {
  return parseWritingLanguage(value) ?? fallback;
}

export function defaultOutlineTitles(language: WritingLanguageCode) {
  const titles: Record<WritingLanguageCode, { volume: string; chapter: string }> = {
    en: { volume: "Volume One", chapter: "Untitled Chapter" },
    "zh-CN": { volume: "第一卷", chapter: "未命名章节" },
    "zh-TW": { volume: "第一卷", chapter: "未命名章節" },
    es: { volume: "Volumen uno", chapter: "Capítulo sin título" },
    de: { volume: "Band eins", chapter: "Unbenanntes Kapitel" },
    fr: { volume: "Tome un", chapter: "Chapitre sans titre" },
    ja: { volume: "第一巻", chapter: "無題の章" },
    pt: { volume: "Volume um", chapter: "Capítulo sem título" },
    ko: { volume: "제1권", chapter: "제목 없는 장" },
  };
  return titles[language];
}
