import Link from "next/link";
import type { Metadata } from "next";
import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { getPublicWorks } from "@/lib/queries";
import { Brand, SiteFooter, SiteHeader } from "./ui";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { AmazonRecommendations } from "./amazon-recommendations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Story Studio Cloud — Free AI-assisted novel workspace",
  description: "Manage outlines, characters, worlds, and chapters, then use the AI model you choose.",
};

const demoBooks = [
  { id: "demo-1", slug: "", title: "风暴以南", genre: "奇幻冒险", language: "中文", description: "失去名字的航海师，沿着一张每天都会变化的海图寻找故乡。", color: "violet" },
  { id: "demo-2", slug: "", title: "The Glass Orchard", genre: "Speculative fiction", language: "English", description: "Every memory grows on a tree. Mara is the first thief who can taste a lie.", color: "amber" },
  { id: "demo-3", slug: "", title: "凌晨四点的月台", genre: "都市悬疑", language: "中文", description: "末班车之后，那座月台只接待尚未作出选择的人。", color: "sage" },
];

export default async function Home() {
  const [user, published, locale] = await Promise.all([getChatGPTUser(), getPublicWorks(6), getUiLocale()]);
  const t = (key: string) => translate(locale, key);
  const books = published.length ? published.map((book, index) => ({ ...book, color: ["violet", "amber", "sage"][index % 3] })) : demoBooks;

  return (
    <div className="site-page">
      <SiteHeader user={user} />
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />{t("home.eyebrow")}</div>
            <h1>{t("home.headline")}<br /><em>{t("home.headlineEm")}</em></h1>
            <p className="hero-lede">{t("home.lede")}</p>
            <div className="hero-actions">
              <Link className="button primary" href={user ? "/studio" : chatGPTSignInPath("/studio")}>{user ? t("home.enter") : t("home.chatgpt")}<span aria-hidden>→</span></Link>
              <Link className="button quiet" href="/library">{t("home.explore")}</Link>
            </div>
            <p className="microcopy">{t("home.microcopy")}</p>
          </div>
          <div className="hero-art" aria-label="Story Studio workspace preview">
            <div className="ink-orbit orbit-one" />
            <div className="ink-orbit orbit-two" />
            <div className="manuscript-card">
              <div className="manuscript-top"><Brand compact /><span className="status-pill">{t("home.saved")}</span></div>
              <div className="manuscript-body">
                <aside className="mini-tree">
                  <b>{t("home.demoVolume1")}</b>
                  <span className="active">{t("home.demoChapter1")}</span>
                  <span>{t("home.demoChapter2")}</span>
                  <span>{t("home.demoChapter3")}</span>
                  <b>{t("home.demoVolume2")}</b>
                </aside>
                <article className="mini-paper">
                  <small>CHAPTER 01</small>
                  <h3>{t("home.demoTitle")}</h3>
                  <p>{t("home.demoP1")}</p>
                  <p>{t("home.demoP2")}</p>
                  <i />
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="promise-strip">
          <div className="wrap promise-grid">
            <div><strong>01</strong><span><b>{t("home.step1Title")}</b>{t("home.step1Body")}</span></div>
            <div><strong>02</strong><span><b>{t("home.step2Title")}</b>{t("home.step2Body")}</span></div>
            <div><strong>03</strong><span><b>{t("home.step3Title")}</b>{t("home.step3Body")}</span></div>
          </div>
        </section>

        <section className="section wrap" id="workflow">
          <div className="section-heading">
            <div><span className="kicker">{t("home.workflowKicker")}</span><h2>{t("home.workflowTitle")}</h2></div>
            <p>{t("home.workflowBody")}</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card featured"><span className="feature-no">01</span><h3>{t("home.feature1Title")}</h3><p>{t("home.feature1Body")}</p><div className="tree-sketch"><b>{t("home.treeVolume")}</b><span>{t("home.tree1")}</span><span className="marked">{t("home.tree2")}</span><span>{t("home.tree3")}</span></div></article>
            <article className="feature-card"><span className="feature-no">02</span><h3>{t("home.feature2Title")}</h3><p>{t("home.feature2Body")}</p><div className="tag-cloud"><span>{t("home.tagCharacters")}</span><span>{t("home.tagRelations")}</span><span>{t("home.tagRules")}</span><span>{t("home.tagSummary")}</span></div></article>
            <article className="feature-card"><span className="feature-no">03</span><h3>{t("home.feature3Title")}</h3><p>{t("home.feature3Body")}</p><div className="model-row"><span>ChatGPT</span><span>Gemini</span><span>Local</span><span>Codex / MCP</span></div></article>
          </div>
        </section>

        <section className="wrap affiliate-home"><AmazonRecommendations /></section>

        <section className="library-preview" id="library">
          <div className="wrap">
            <div className="section-heading light"><div><span className="kicker">{t("home.libraryKicker")}</span><h2>{t("home.libraryTitle")}</h2></div><Link className="text-link" href="/library">{t("home.browse")}</Link></div>
            <div className="book-grid">
              {books.map((book) => <Link className="book-card" href={book.slug ? `/read/${book.slug}` : "/library"} key={book.id}><div className={`book-cover ${book.color}`}><span>{book.genre}</span><b>{book.title}</b><small>{book.language}</small></div><div className="book-meta"><h3>{book.title}</h3><p>{book.description || t("home.noDescription")}</p><span>{t("home.read")}</span></div></Link>)}
            </div>
          </div>
        </section>

        <section className="cta wrap">
          <div><span className="kicker">{t("home.ctaKicker")}</span><h2>{t("home.ctaTitle")}</h2><p>{t("home.ctaBody")}</p></div>
          <Link className="button paper" href={user ? "/studio" : chatGPTSignInPath("/studio")}>{t("home.ctaButton")} <span>→</span></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
