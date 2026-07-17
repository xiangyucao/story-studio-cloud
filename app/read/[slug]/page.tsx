import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { chapters, volumes, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { SiteFooter, SiteHeader } from "@/app/ui";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const [user, workRows, locale] = await Promise.all([getChatGPTUser(), db.select().from(works).where(and(eq(works.slug, slug), eq(works.isPublished, true))).limit(1), getUiLocale()]);
  const t=(key:string)=>translate(locale,key);
  const work = workRows[0];
  if (!work) notFound();
  const [volumeRows, chapterRows] = await Promise.all([
    db.select().from(volumes).where(eq(volumes.workId, work.id)).orderBy(asc(volumes.position)),
    db.select().from(chapters).where(and(eq(chapters.workId, work.id), eq(chapters.isPublished, true))).orderBy(asc(chapters.position)),
  ]);
  return <div className="reader-page"><SiteHeader user={user} /><main className="reader-wrap"><header className="reader-title"><span>{work.genre} · {work.language}</span><h1>{work.title}</h1><p>{work.description || t("reader.noDescription")}</p></header>
    {volumeRows.map((volume) => { const entries = chapterRows.filter((chapter) => chapter.volumeId === volume.id); if (!entries.length) return null; return <section className="reader-volume" key={volume.id}><div className="reader-volume-title"><small>VOLUME {volume.position}</small><h2>{volume.title}</h2></div>{entries.map((chapter) => <article className="reader-chapter" id={chapter.id} key={chapter.id}><small>CHAPTER {chapter.position}</small><h3>{chapter.title}</h3><div>{chapter.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>)}</section>; })}
    {!chapterRows.length && <div className="empty-state">{t("reader.empty")}</div>}
  </main><SiteFooter /></div>;
}
