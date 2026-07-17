import {
  AlignmentType,
  Bookmark,
  Document,
  HeadingLevel,
  InternalHyperlink,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import { Converter } from "opencc-js";

export type ExportWork = {
  title: string;
  genre: string;
  language: string;
  premise: string;
};

export type ExportVolume = {
  id: string;
  position: number;
  title: string;
  synopsis: string;
};

export type ExportChapter = {
  id: string;
  volumeId: string;
  position: number;
  title: string;
  content: string;
};

export type BookExportOptions = {
  volumeIds: string[];
  includeToc: boolean;
  includePremise: boolean;
  includeVolumeSynopses: boolean;
  traditionalChinese: boolean;
};

type ExportLocale = {
  contents: string;
  genre: string;
  exportedBy: string;
  dateLocale: string;
  font: string;
};

const locales: Record<string, ExportLocale> = {
  en: { contents: "Contents", genre: "Genre", exportedBy: "Exported by Story Studio", dateLocale: "en-US", font: "Times New Roman" },
  de: { contents: "Inhalt", genre: "Genre", exportedBy: "Exportiert mit Story Studio", dateLocale: "de-DE", font: "Times New Roman" },
  es: { contents: "Contenido", genre: "Género", exportedBy: "Exportado por Story Studio", dateLocale: "es-ES", font: "Times New Roman" },
  fr: { contents: "Sommaire", genre: "Genre", exportedBy: "Exporté par Story Studio", dateLocale: "fr-FR", font: "Times New Roman" },
  ja: { contents: "目次", genre: "ジャンル", exportedBy: "Story Studio から書き出し", dateLocale: "ja-JP", font: "Yu Mincho" },
  pt: { contents: "Sumário", genre: "Gênero", exportedBy: "Exportado pelo Story Studio", dateLocale: "pt-BR", font: "Times New Roman" },
  it: { contents: "Indice", genre: "Genere", exportedBy: "Esportato da Story Studio", dateLocale: "it-IT", font: "Times New Roman" },
  ko: { contents: "목차", genre: "장르", exportedBy: "Story Studio에서 내보냄", dateLocale: "ko-KR", font: "Malgun Gothic" },
  "zh-CN": { contents: "目录", genre: "类型", exportedBy: "由 Story Studio 导出", dateLocale: "zh-CN", font: "Microsoft YaHei" },
  "zh-TW": { contents: "目錄", genre: "類型", exportedBy: "由 Story Studio 匯出", dateLocale: "zh-TW", font: "Microsoft JhengHei" },
};

const toTraditional = Converter({ from: "cn", to: "tw" });

export function convertExportText(value: string, language: string, traditionalChinese: boolean) {
  return traditionalChinese && exportLanguage(language).startsWith("zh") ? toTraditional(value || "") : value || "";
}

export function exportLanguage(value: string) {
  const language = value.trim().toLowerCase();
  if (language.startsWith("zh-tw") || language.startsWith("zh-hant")) return "zh-TW";
  if (language.startsWith("zh")) return "zh-CN";
  return Object.keys(locales).find((code) => code !== "zh-CN" && code !== "zh-TW" && language.startsWith(code)) ?? "en";
}

export function safeExportName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").slice(0, 100) || "manuscript";
}

export function stripLeadingChapterHeading(content: string, title: string) {
  const lines = content.trim().split(/\r?\n/);
  while (lines[0]?.trim() === "" || /^```(?:markdown|text)?$/i.test(lines[0]?.trim() ?? "")) lines.shift();
  const first = lines[0]?.trim().replace(/^#{1,6}\s*/, "") ?? "";
  const normalized = (value: string) => value.toLocaleLowerCase().replace(/[\s:：.\-–—]+/g, "");
  const numberedHeading = /^(?:chapter\s+\d+|第\s*[0-9一二三四五六七八九十百零〇两]+\s*章)(?:\s*[:：.\-–—]\s*.*)?$/i.test(first);
  if (numberedHeading || (first && normalized(first) === normalized(title))) lines.shift();
  while (lines[0]?.trim() === "") lines.shift();
  if (lines.at(-1)?.trim() === "```") lines.pop();
  return lines.join("\n").trim();
}

export function selectedBook(
  volumes: ExportVolume[],
  chapters: ExportChapter[],
  volumeIds: string[],
) {
  const selected = new Set(volumeIds);
  return volumes
    .filter((volume) => selected.has(volume.id))
    .sort((a, b) => a.position - b.position)
    .map((volume) => ({
      volume,
      chapters: chapters
        .filter((chapter) => chapter.volumeId === volume.id && chapter.content.trim())
        .sort((a, b) => a.position - b.position),
    }))
    .filter((group) => group.chapters.length > 0);
}

export async function createBookDocx(
  work: ExportWork,
  volumes: ExportVolume[],
  chapters: ExportChapter[],
  options: BookExportOptions,
) {
  const language = exportLanguage(work.language);
  const locale = locales[language];
  const t = (value: string) => convertExportText(value, language, options.traditionalChinese);
  const groups = selectedBook(volumes, chapters, options.volumeIds);
  if (!groups.length) throw new Error("No written chapters were selected for export.");

  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2600, after: 500 }, children: [new TextRun({ text: t(work.title), bold: true, size: 44, font: locale.font })] }),
    ...(work.genre ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${t(locale.genre)}: ${t(work.genre)}`, color: "777777", size: 22, font: locale.font })] })] : []),
    ...(options.includePremise && work.premise ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 500 }, children: [new TextRun({ text: t(work.premise), size: 22, font: locale.font })] })] : []),
  ];

  if (options.includeToc) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 240 }, children: [new TextRun({ text: t(locale.contents), bold: true, font: locale.font })] }));
    groups.forEach((group, groupIndex) => {
      const volumeBookmark = `volume_${groupIndex + 1}`;
      children.push(new Paragraph({ keepNext: true, spacing: { before: groupIndex ? 100 : 0, after: 20, line: 240 }, children: [new InternalHyperlink({ anchor: volumeBookmark, children: [new TextRun({ text: t(group.volume.title), bold: true, size: 22, color: "2F2925", font: locale.font })] })] }));
      group.chapters.forEach((chapter, chapterIndex) => {
        children.push(new Paragraph({ indent: { left: 420 }, spacing: { after: 0, line: 240 }, children: [new InternalHyperlink({ anchor: `${volumeBookmark}_chapter_${chapterIndex + 1}`, children: [new TextRun({ text: t(chapter.title), size: 20, color: "5F5751", font: locale.font })] })] }));
      });
    });
  }

  groups.forEach((group, groupIndex) => {
    const volumeBookmark = `volume_${groupIndex + 1}`;
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new Bookmark({ id: volumeBookmark, children: [new TextRun({ text: t(group.volume.title), bold: true, font: locale.font })] })] }));
    if (options.includeVolumeSynopses && group.volume.synopsis) {
      children.push(new Paragraph({ spacing: { after: 500 }, children: [new TextRun({ text: t(group.volume.synopsis), italics: true, color: "666666", font: locale.font })] }));
    }
    group.chapters.forEach((chapter, chapterIndex) => {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: chapterIndex > 0, children: [new Bookmark({ id: `${volumeBookmark}_chapter_${chapterIndex + 1}`, children: [new TextRun({ text: t(chapter.title), bold: true, font: locale.font })] })] }));
      const prose = stripLeadingChapterHeading(chapter.content, chapter.title);
      prose.split(/\r?\n\s*\r?\n|\r?\n/).map((text) => text.trim()).filter(Boolean).forEach((text) => {
        children.push(new Paragraph({ spacing: { line: 360, after: 180 }, indent: { firstLine: 480 }, children: [new TextRun({ text: t(text), size: 24, font: locale.font })] }));
      });
    });
  });
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: `${t(locale.exportedBy)} · ${new Date().toLocaleDateString(locale.dateLocale)}`, color: "888888", size: 18, font: locale.font })] }));

  const document = new Document({
    features: { updateFields: true },
    styles: { default: { document: { run: { font: locale.font, size: 24 }, paragraph: { spacing: { line: 360 } } } } },
    sections: [{ properties: { page: { margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 } } }, children }],
  });
  return Packer.toBlob(document);
}

export function createBookMarkdown(
  work: ExportWork,
  volumes: ExportVolume[],
  chapters: ExportChapter[],
  options: BookExportOptions,
) {
  const language = exportLanguage(work.language);
  const locale = locales[language];
  const t = (value: string) => convertExportText(value, language, options.traditionalChinese);
  const groups = selectedBook(volumes, chapters, options.volumeIds);
  if (!groups.length) throw new Error("No written chapters were selected for export.");
  const anchor = (value: string) => t(value).trim().toLocaleLowerCase().replace(/\s+/g, "-").replace(/[^\p{Letter}\p{Number}\-_]/gu, "");
  return [
    `# ${t(work.title)}`,
    work.genre ? `> ${t(locale.genre)}: ${t(work.genre)}` : "",
    options.includePremise ? t(work.premise) : "",
    ...(options.includeToc ? [`## ${t(locale.contents)}`, ...groups.flatMap((group) => [`- [${t(group.volume.title)}](#${anchor(group.volume.title)})`, ...group.chapters.map((chapter) => `  - [${t(chapter.title)}](#${anchor(chapter.title)})`)])] : []),
    ...groups.flatMap((group) => [
      `\n## ${t(group.volume.title)}`,
      options.includeVolumeSynopses && group.volume.synopsis ? `> ${t(group.volume.synopsis)}` : "",
      ...group.chapters.flatMap((chapter) => [`\n### ${t(chapter.title)}`, t(stripLeadingChapterHeading(chapter.content, chapter.title))]),
    ]),
  ].filter(Boolean).join("\n\n");
}
