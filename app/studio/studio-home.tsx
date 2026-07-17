"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";

type WorkCard = {
  id: string; title: string; description: string; genre: string; language: string;
  slug: string; isPublished: boolean; updatedAt: string; chapterCount: number; wordCount: number;
};

export function StudioHome({ initialWorks, displayName }: { initialWorks: WorkCard[]; displayName: string }) {
  const [works, setWorks] = useState(initialWorks);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState<WorkCard | null>(null);

  async function createWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/works", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json() as { work?: WorkCard; error?: string };
    setBusy(false);
    if (!response.ok || !result.work) { setError(result.error || "创建失败"); return; }
    window.location.href = `/studio/works/${result.work.id}`;
  }

  async function deleteWork() {
    if (!deleting) return;
    const response = await fetch(`/api/works/${deleting.id}`, { method: "DELETE" });
    if (response.ok) { setWorks((items) => items.filter((item) => item.id !== deleting.id)); setDeleting(null); }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0]; event.target.value=""; if(!file)return; setImporting(true); setError("");
    const response=await fetch("/api/import",{method:"POST",headers:{"content-type":"application/json"},body:await file.text()});
    const result=await response.json() as {workId?:string;error?:string}; setImporting(false);
    if(!response.ok||!result.workId){setError(result.error||"导入失败");return;} window.location.href=`/studio/works/${result.workId}`;
  }

  return <main className="studio-dashboard"><section className="dashboard-heading"><div><span className="studio-kicker">MY MANUSCRIPTS</span><h1>{greeting()}，{displayName.split(/[ @]/)[0]}</h1><p>每一部作品都是独立空间。它们默认只有你能看到。</p></div><div className="dashboard-actions"><label className="studio-button quiet">{importing?"正在导入…":"⇩ 导入本地完整备份"}<input type="file" accept="application/json,.json" onChange={importBackup} disabled={importing} hidden /></label><button className="studio-button primary" onClick={() => setCreating(true)}>＋ 新建作品</button></div></section>{error&&<p className="dashboard-error">{error}</p>}
    <section className="dashboard-stats"><div><span>作品</span><b>{works.length}</b></div><div><span>章节</span><b>{works.reduce((sum, work) => sum + work.chapterCount, 0)}</b></div><div><span>累计字数</span><b>{works.reduce((sum, work) => sum + work.wordCount, 0).toLocaleString()}</b></div><div><span>已公开</span><b>{works.filter((work) => work.isPublished).length}</b></div></section>
    {works.length ? <section className="work-card-grid">{works.map((work, index) => <article className="work-card" key={work.id}><Link className={`work-card-cover cover-${index % 4}`} href={`/studio/works/${work.id}`}><small>{work.genre}</small><b>{work.title}</b><span>{work.language}</span></Link><div className="work-card-copy"><div className="work-card-title"><div><span>{work.isPublished ? "公开作品" : "私人草稿"}</span><h2><Link href={`/studio/works/${work.id}`}>{work.title}</Link></h2></div><button className="icon-button danger" title="删除作品" onClick={() => setDeleting(work)}>×</button></div><p>{work.description || "还没有作品简介。打开工作台继续完善。"}</p><div className="work-card-foot"><span>{work.chapterCount} 章 · {work.wordCount.toLocaleString()} 字</span><Link href={`/studio/works/${work.id}`}>继续写作 →</Link></div></div></article>)}</section> : <section className="dashboard-empty"><div className="empty-mark">✦</div><h2>你的第一部作品，从这里开始</h2><p>先建立一个名字。系统会替你准备第一卷和第一章，之后再逐步添加人物、世界观和逻辑线。</p><button className="studio-button primary" onClick={() => setCreating(true)}>建立第一部作品</button></section>}
    {creating && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreating(false); }}><section className="studio-modal" role="dialog" aria-modal="true" aria-labelledby="new-work-title"><button className="modal-close" onClick={() => setCreating(false)} aria-label="关闭">×</button><span className="studio-kicker">NEW MANUSCRIPT</span><h2 id="new-work-title">建立新作品</h2><p>这里只建立空白结构，不会调用任何 AI。</p><form onSubmit={createWork}><label>作品名<input required name="title" placeholder="例如：风暴以南" autoFocus /></label><div className="field-row"><label>类型<input name="genre" placeholder="奇幻 / 悬疑 / Romance" /></label><label>写作语言<select name="language" defaultValue="zh-CN"><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option><option value="fr">Français</option><option value="ja">日本語</option><option value="pt">Português</option><option value="ko">한국어</option></select></label></div><label>一句话构想<textarea name="description" rows={3} placeholder="主角是谁，他想要什么，最大的阻碍是什么？" /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="studio-button quiet" onClick={() => setCreating(false)}>取消</button><button className="studio-button primary" disabled={busy}>{busy ? "正在建立…" : "建立并打开"}</button></div></form></section></div>}
    {deleting && <div className="modal-backdrop" onMouseDown={(event)=>{if(event.currentTarget===event.target)setDeleting(null)}}><section className="studio-modal delete-modal" role="alertdialog" aria-modal="true"><div className="delete-symbol">!</div><h2>删除《{deleting.title}》？</h2><p>大纲、人物、设定和全部正文都会永久删除，公开阅读页也会立即消失。完整备份不会自动保留。</p><div className="modal-actions"><button className="studio-button quiet" onClick={()=>setDeleting(null)}>保留作品</button><button className="studio-button danger-fill" onClick={deleteWork}>确认永久删除</button></div></section></div>}
  </main>;
}

function greeting() { const hour = new Date().getHours(); return hour < 11 ? "早上好" : hour < 18 ? "下午好" : "晚上好"; }
