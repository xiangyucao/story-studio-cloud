import Link from "next/link";
import type { Metadata } from "next";
import { getChatGPTUser, chatGPTSignInPath } from "./chatgpt-auth";
import { getPublicWorks } from "@/lib/queries";
import { Brand, SiteFooter, SiteHeader } from "./ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Story Studio Cloud — 免费的 AI 小说管理工作台",
  description: "管理大纲、人物、世界观与章节，把提示词交给你自己的 AI。",
};

const demoBooks = [
  { id: "demo-1", slug: "", title: "风暴以南", genre: "奇幻冒险", language: "中文", description: "失去名字的航海师，沿着一张每天都会变化的海图寻找故乡。", color: "violet" },
  { id: "demo-2", slug: "", title: "The Glass Orchard", genre: "Speculative fiction", language: "English", description: "Every memory grows on a tree. Mara is the first thief who can taste a lie.", color: "amber" },
  { id: "demo-3", slug: "", title: "凌晨四点的月台", genre: "都市悬疑", language: "中文", description: "末班车之后，那座月台只接待尚未作出选择的人。", color: "sage" },
];

export default async function Home() {
  const [user, published] = await Promise.all([getChatGPTUser(), getPublicWorks(6)]);
  const books = published.length ? published.map((book, index) => ({ ...book, color: ["violet", "amber", "sage"][index % 3] })) : demoBooks;

  return (
    <div className="site-page">
      <SiteHeader user={user} />
      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" />模型归你，故事也归你</div>
            <h1>把散落的灵感，<br /><em>长成一本书。</em></h1>
            <p className="hero-lede">一处安静的写作工作台，替你管理大纲、人物关系、世界观、逻辑链和章节版本。复制完整提示词到任意大模型，也可以让你自己的 Codex 通过 MCP 协助创作。</p>
            <div className="hero-actions">
              <Link className="button primary" href={user ? "/studio" : chatGPTSignInPath("/studio")}>{user ? "进入我的工作台" : "使用 ChatGPT 登录"}<span aria-hidden>→</span></Link>
              <Link className="button quiet" href="/library">先逛逛小说广场</Link>
            </div>
            <p className="microcopy">免费管理工具 · 不代购模型额度 · 作品默认私密</p>
          </div>
          <div className="hero-art" aria-label="Story Studio 工作台预览">
            <div className="ink-orbit orbit-one" />
            <div className="ink-orbit orbit-two" />
            <div className="manuscript-card">
              <div className="manuscript-top"><Brand compact /><span className="status-pill">已保存</span></div>
              <div className="manuscript-body">
                <aside className="mini-tree">
                  <b>第一卷 · 潮汐线</b>
                  <span className="active">01　失物招领处</span>
                  <span>02　逆流的钟</span>
                  <span>03　无名航路</span>
                  <b>第二卷 · 雾之城</b>
                </aside>
                <article className="mini-paper">
                  <small>CHAPTER 01</small>
                  <h3>失物招领处</h3>
                  <p>雨水沿着站台的铁骨落下，像一封迟到了很多年的信。</p>
                  <p>周眠在第四盏灯下停住。那只没有影子的行李箱，正轻轻敲着自己的锁。</p>
                  <i />
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="promise-strip">
          <div className="wrap promise-grid">
            <div><strong>01</strong><span><b>先搭骨架</b>卷、章和建议字数清楚排好</span></div>
            <div><strong>02</strong><span><b>再补记忆</b>人物、设定、时间线随章节取用</span></div>
            <div><strong>03</strong><span><b>最后交给 AI</b>完整提示词由你决定发给谁</span></div>
          </div>
        </section>

        <section className="section wrap" id="workflow">
          <div className="section-heading">
            <div><span className="kicker">A calmer way to write</span><h2>AI 可以很强，写作流程不必很乱。</h2></div>
            <p>我们只负责把上下文整理好。你的模型、额度、原稿和发布决定，始终由你掌握。</p>
          </div>
          <div className="feature-grid">
            <article className="feature-card featured"><span className="feature-no">01</span><h3>故事树，而不是文件堆</h3><p>卷和章可以展开收起；大纲变化时，准确标记哪些章节需要重写。</p><div className="tree-sketch"><b>⌄ 第一卷　风从旧世界来</b><span>├ 01　火车穿过落日</span><span className="marked">├ 02　无人记得的车站　需更新</span><span>└ 03　蓝色行李箱</span></div></article>
            <article className="feature-card"><span className="feature-no">02</span><h3>上下文有边界</h3><p>按章节组合人物、关系、场景、时间线和逻辑链，不必把整本书反复塞给模型。</p><div className="tag-cloud"><span>人物 4</span><span>关系 6</span><span>硬设定 3</span><span>前文摘要</span></div></article>
            <article className="feature-card"><span className="feature-no">03</span><h3>任何模型都能接</h3><p>复制提示词到 ChatGPT、Gemini 或本地模型；也可以开放 MCP，让你自己的 Codex 读写草稿。</p><div className="model-row"><span>ChatGPT</span><span>Gemini</span><span>Local</span><span>Codex / MCP</span></div></article>
          </div>
        </section>

        <section className="library-preview" id="library">
          <div className="wrap">
            <div className="section-heading light"><div><span className="kicker">Community bookshelf</span><h2>朋友愿意公开的故事，<br />会在这里相遇。</h2></div><Link className="text-link" href="/library">浏览全部作品 →</Link></div>
            <div className="book-grid">
              {books.map((book) => <Link className="book-card" href={book.slug ? `/read/${book.slug}` : "/library"} key={book.id}><div className={`book-cover ${book.color}`}><span>{book.genre}</span><b>{book.title}</b><small>{book.language}</small></div><div className="book-meta"><h3>{book.title}</h3><p>{book.description || "作者还没有填写作品简介。"}</p><span>开始阅读　→</span></div></Link>)}
            </div>
          </div>
        </section>

        <section className="cta wrap">
          <div><span className="kicker">Your story, your tools</span><h2>下一章，从一个清楚的念头开始。</h2><p>没有平台模型账单，也没有被锁住的格式。先免费建立你的第一部作品。</p></div>
          <Link className="button paper" href={user ? "/studio" : chatGPTSignInPath("/studio")}>打开写作工作台 <span>→</span></Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
