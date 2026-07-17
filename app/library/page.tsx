import type { Metadata } from "next";
import Link from "next/link";
import { getPublicWorks } from "@/lib/queries";
import { getChatGPTUser } from "../chatgpt-auth";
import { SiteFooter, SiteHeader } from "../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "小说广场" };

export default async function LibraryPage() {
  const [user, books] = await Promise.all([getChatGPTUser(), getPublicWorks(48)]);
  return <div className="page-shell"><SiteHeader user={user} /><main className="wrap"><header className="interior-hero"><span className="kicker">Community bookshelf</span><h1>小说广场</h1><p>这里仅展示作者主动公开的作品。阅读不需要登录；创作和发布需要作者登录。</p></header>
    {books.length === 0 ? <div className="empty-state"><h2>书架还很安静</h2><p>第一批朋友的公开作品会出现在这里。登录工作台，你也可以成为第一位作者。</p></div> : <div className="public-library-grid">{books.map((book) => <Link href={`/read/${book.slug}`} className="public-book" key={book.id}><div className="public-book-cover"><span>{book.genre}</span><b>{book.title}</b><small>{book.language}</small></div><div><h2>{book.title}</h2><p>{book.description || "作者还没有填写简介。"}</p><span>阅读作品 →</span></div></Link>)}</div>}
  </main><SiteFooter /></div>;
}
