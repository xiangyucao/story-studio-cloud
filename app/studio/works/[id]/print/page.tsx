import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import { convertExportText, exportLanguage, selectedBook, stripLeadingChapterHeading } from "@/lib/book-export";
import { getWorkBundle } from "@/lib/queries";
import { PrintActions } from "./print-actions";
import "./print.css";

const labels: Record<string, { manuscript: string; contents: string; print: string; back: string }> = {
  en: { manuscript: "STORY STUDIO MANUSCRIPT", contents: "Contents", print: "Print / Save as PDF", back: "Back to studio" },
  de: { manuscript: "STORY STUDIO MANUSKRIPT", contents: "Inhalt", print: "Drucken / Als PDF speichern", back: "Zurück zum Studio" },
  es: { manuscript: "MANUSCRITO DE STORY STUDIO", contents: "Contenido", print: "Imprimir / Guardar como PDF", back: "Volver al estudio" },
  fr: { manuscript: "MANUSCRIT STORY STUDIO", contents: "Sommaire", print: "Imprimer / Enregistrer en PDF", back: "Retour au studio" },
  ja: { manuscript: "STORY STUDIO 原稿", contents: "目次", print: "印刷 / PDF に保存", back: "スタジオに戻る" },
  pt: { manuscript: "MANUSCRITO STORY STUDIO", contents: "Sumário", print: "Imprimir / Salvar como PDF", back: "Voltar ao estúdio" },
  ko: { manuscript: "STORY STUDIO 원고", contents: "목차", print: "인쇄 / PDF로 저장", back: "스튜디오로 돌아가기" },
  "zh-CN": { manuscript: "STORY STUDIO 书稿", contents: "目录", print: "打印 / 另存为 PDF", back: "返回工作台" },
  "zh-TW": { manuscript: "STORY STUDIO 書稿", contents: "目錄", print: "列印 / 另存為 PDF", back: "返回工作台" },
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/studio/works/${id}`);
  const work = await ownedWork(id, user.email);
  return { title: work?.title ?? "Story Studio" };
}

export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireChatGPTUser(`/studio/works/${id}`);
  const work = await ownedWork(id, user.email);
  if (!work) notFound();
  const bundle = await getWorkBundle(id);
  const rawVolumes = typeof query.volumes === "string" ? query.volumes.split(",").filter(Boolean) : [];
  const volumeIds = rawVolumes.length ? rawVolumes : bundle.volumes.map((volume) => volume.id);
  const groups = selectedBook(bundle.volumes, bundle.chapters, volumeIds);
  const language = exportLanguage(work.language);
  const copy = labels[language] ?? labels.en;
  const traditional = language.startsWith("zh") && query.script === "traditional";
  const includeToc = query.toc !== "false";
  const includePremise = query.premise === "true";
  const includeVolumeSynopses = query.volumeSynopsis === "true";
  const t = (value: string) => convertExportText(value, language, traditional);
  return <main className={`print-book language-${language}`}>
    <PrintActions backHref={`/studio/works/${id}`} printLabel={copy.print} backLabel={copy.back} />
    <article>
      <section className="print-cover"><span>{t(copy.manuscript)}</span><h1>{t(work.title)}</h1>{work.genre && <p>{t(work.genre)}</p>}{includePremise && work.premise && <div>{t(work.premise)}</div>}</section>
      {includeToc && <section className="print-toc"><span>{t(copy.contents).toLocaleUpperCase(language)}</span><h1>{t(copy.contents)}</h1>{groups.map((group) => <div key={group.volume.id}><strong>{t(group.volume.title)}</strong>{group.chapters.map((chapter) => <p key={chapter.id}>{t(chapter.title)}</p>)}</div>)}</section>}
      {groups.map((group) => <div key={group.volume.id}>
        <section className="print-volume"><span>VOLUME {group.volume.position}</span><h1>{t(group.volume.title)}</h1>{includeVolumeSynopses && group.volume.synopsis && <p>{t(group.volume.synopsis)}</p>}</section>
        {group.chapters.map((chapter) => <section className="print-chapter" key={chapter.id}><header><span>CHAPTER {chapter.position}</span><h2>{t(chapter.title)}</h2></header><div>{stripLeadingChapterHeading(chapter.content, chapter.title).split(/\r?\n\s*\r?\n|\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => <p key={index}>{t(paragraph)}</p>)}</div></section>)}
      </div>)}
    </article>
  </main>;
}
