import type { Metadata } from "next";
import Link from "next/link";
import { getPublicWorks } from "@/lib/queries";
import { getChatGPTUser } from "../chatgpt-auth";
import { SiteFooter, SiteHeader } from "../ui";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Community Library" };

export default async function LibraryPage() {
  const [user, books, locale] = await Promise.all([getChatGPTUser(), getPublicWorks(48), getUiLocale()]); const t=(key:string)=>translate(locale,key);
  return <div className="page-shell"><SiteHeader user={user} /><main className="wrap"><header className="interior-hero"><span className="kicker">{t("library.kicker")}</span><h1>{t("library.title")}</h1><p>{t("library.intro")}</p></header>
    {books.length === 0 ? <div className="empty-state"><h2>{t("library.emptyTitle")}</h2><p>{t("library.emptyBody")}</p></div> : <div className="public-library-grid">{books.map((book) => <Link href={`/read/${book.slug}`} className="public-book" key={book.id}><div className="public-book-cover"><span>{book.genre}</span><b>{book.title}</b><small>{book.language}</small></div><div><h2>{book.title}</h2><p>{book.description || t("library.noDescription")}</p><span>{t("library.read")}</span></div></Link>)}</div>}
  </main><SiteFooter /></div>;
}
