"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useI18n } from "../language-provider";

type WorkCard = {
  id: string; title: string; description: string; genre: string; language: string;
  slug: string; isPublished: boolean; updatedAt: string; chapterCount: number; wordCount: number;
};

export function StudioHome({ initialWorks, displayName }: { initialWorks: WorkCard[]; displayName: string }) {
  const { locale, t } = useI18n();
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
    if (!response.ok || !result.work) { setError(t("dashboard.createFailed")); return; }
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
    if(!response.ok||!result.workId){setError(t("dashboard.importFailed"));return;} window.location.href=`/studio/works/${result.workId}`;
  }

  return <main className="studio-dashboard"><section className="dashboard-heading"><div><span className="studio-kicker">{t("dashboard.kicker")}</span><h1>{greeting(t)}, {displayName.split(/[ @]/)[0]}</h1><p>{t("dashboard.intro")}</p></div><div className="dashboard-actions"><label className="studio-button quiet">{importing?t("dashboard.importing"):t("dashboard.import")}<input type="file" accept="application/json,.json" onChange={importBackup} disabled={importing} hidden /></label><button className="studio-button primary" onClick={() => setCreating(true)}>{t("dashboard.new")}</button></div></section>{error&&<p className="dashboard-error">{error}</p>}
    <section className="dashboard-stats"><div><span>{t("dashboard.works")}</span><b>{works.length}</b></div><div><span>{t("dashboard.chapters")}</span><b>{works.reduce((sum, work) => sum + work.chapterCount, 0)}</b></div><div><span>{t("dashboard.words")}</span><b>{works.reduce((sum, work) => sum + work.wordCount, 0).toLocaleString(locale)}</b></div><div><span>{t("dashboard.published")}</span><b>{works.filter((work) => work.isPublished).length}</b></div></section>
    {works.length ? <section className="work-card-grid">{works.map((work, index) => <article className="work-card" key={work.id}><Link className={`work-card-cover cover-${index % 4}`} href={`/studio/works/${work.id}`}><small>{work.genre}</small><b>{work.title}</b><span>{work.language}</span></Link><div className="work-card-copy"><div className="work-card-title"><div><span>{work.isPublished ? t("dashboard.publicWork") : t("dashboard.privateDraft")}</span><h2><Link href={`/studio/works/${work.id}`}>{work.title}</Link></h2></div><button className="icon-button danger" title={t("dashboard.deleteTitle")} onClick={() => setDeleting(work)}>×</button></div><p>{work.description || t("dashboard.noDescription")}</p><div className="work-card-foot"><span>{work.chapterCount} {t("dashboard.chapterUnit")} · {work.wordCount.toLocaleString(locale)} {t("dashboard.wordUnit")}</span><Link href={`/studio/works/${work.id}`}>{t("dashboard.continue")}</Link></div></div></article>)}</section> : <section className="dashboard-empty"><div className="empty-mark">✦</div><h2>{t("dashboard.emptyTitle")}</h2><p>{t("dashboard.emptyBody")}</p><button className="studio-button primary" onClick={() => setCreating(true)}>{t("dashboard.emptyButton")}</button></section>}
    {creating && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCreating(false); }}><section className="studio-modal" role="dialog" aria-modal="true" aria-labelledby="new-work-title"><button className="modal-close" onClick={() => setCreating(false)} aria-label={t("common.close")}>×</button><span className="studio-kicker">NEW MANUSCRIPT</span><h2 id="new-work-title">{t("dashboard.newTitle")}</h2><p>{t("dashboard.newIntro")}</p><form onSubmit={createWork}><label>{t("dashboard.workTitle")}<input required name="title" placeholder={t("dashboard.titlePlaceholder")} autoFocus /></label><div className="field-row"><label>{t("dashboard.genre")}<input name="genre" placeholder={t("dashboard.genrePlaceholder")} /></label><label>{t("dashboard.writingLanguage")}<select name="language" defaultValue="en"><option value="en">English</option><option value="zh-CN">简体中文</option><option value="zh-TW">繁體中文</option><option value="de">Deutsch</option><option value="es">Español</option><option value="fr">Français</option><option value="ja">日本語</option><option value="pt">Português</option><option value="ko">한국어</option></select></label></div><label>{t("dashboard.premise")}<textarea name="description" rows={3} placeholder={t("dashboard.premisePlaceholder")} /></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="studio-button quiet" onClick={() => setCreating(false)}>{t("common.cancel")}</button><button className="studio-button primary" disabled={busy}>{busy ? t("dashboard.creating") : t("dashboard.createOpen")}</button></div></form></section></div>}
    {deleting && <div className="modal-backdrop" onMouseDown={(event)=>{if(event.currentTarget===event.target)setDeleting(null)}}><section className="studio-modal delete-modal" role="alertdialog" aria-modal="true"><div className="delete-symbol">!</div><h2>{t("dashboard.deleteQuestion",{title:deleting.title})}</h2><p>{t("dashboard.deleteBody")}</p><div className="modal-actions"><button className="studio-button quiet" onClick={()=>setDeleting(null)}>{t("dashboard.keep")}</button><button className="studio-button danger-fill" onClick={deleteWork}>{t("dashboard.deletePermanent")}</button></div></section></div>}
  </main>;
}

function greeting(t: (key: string) => string) { const hour = new Date().getHours(); return hour < 11 ? t("dashboard.morning") : hour < 18 ? t("dashboard.afternoon") : t("dashboard.evening"); }
