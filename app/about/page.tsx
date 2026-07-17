import type { Metadata } from "next";
import { getChatGPTUser } from "../chatgpt-auth";
import { SiteFooter, SiteHeader } from "../ui";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About & disclaimer" };

export default async function AboutPage() {
  const [user, locale] = await Promise.all([getChatGPTUser(), getUiLocale()]); const t=(key:string)=>translate(locale,key);
  return <div className="page-shell"><SiteHeader user={user} /><main><header className="interior-hero wrap"><span className="kicker">{t("about.kicker")}</span><h1>{t("about.title")}</h1><p>{t("about.intro")}</p></header><div className="legal-copy wrap">
    <section><h2>{t("about.toolTitle")}</h2><p>{t("about.toolBody")}</p></section>
    <section><h2>{t("about.contentTitle")}</h2><p>{t("about.contentBody")}</p></section>
    <section><h2>{t("about.warrantyTitle")}</h2><p>{t("about.warrantyBody")}</p></section>
    <section id="privacy"><h2>{t("about.privacyTitle")}</h2><ul><li>{t("about.private1")}</li><li>{t("about.private2")}</li><li>{t("about.private3")}</li><li>{t("about.private4")}</li></ul></section>
    <section><h2>{t("about.localTitle")}</h2><p>{t("about.localBody")}</p><p><a className="text-link" href="https://github.com/xiangyucao/story-studio" target="_blank" rel="noreferrer">{t("about.localLink")}</a></p></section>
    <section><h2>{t("about.reportTitle")}</h2><p>{t("about.reportBody")}</p></section>
    <section><h2>{t("about.contactTitle")}</h2><p>{t("about.contactBody")}</p><p><a className="text-link" href="https://github.com/xiangyucao/story-studio-cloud/issues" target="_blank" rel="noreferrer">{t("about.contactLink")}</a></p></section>
  </div></main><SiteFooter /></div>;
}
