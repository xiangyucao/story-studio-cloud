"use client";

import { useI18n } from "./language-provider";

const associateTag = "storystudio00-20";
const sudowriteAffiliateUrl = "https://www.sudowrite.com/?via=xiangyu";
const walmartWritingSuppliesUrl = "https://goto.walmart.com/c/1911899/565706/9383?veh=aff&sourceid=imp_000011112222333344&u=https%3A%2F%2Fwww.walmart.com%2Fsearch%3Fq%3Dwriting%2520supplies";
const recommendations = [
  { key: "craft", number: "01", query: "books on writing fiction" },
  { key: "structure", number: "02", query: "story structure workbook for writers" },
  { key: "editing", number: "03", query: "editing style guides for writers" },
  { key: "notebooks", number: "04", query: "writers notebook for novel planning" },
] as const;

export function AmazonRecommendations({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return <aside id={compact ? "studio-writers-shelf" : "writers-shelf"} className={`affiliate-shelf ${compact ? "compact" : ""}`} aria-labelledby={`affiliate-title-${compact ? "studio" : "home"}`}>
    <header><div><span className="affiliate-label">{t("affiliate.label")}</span><h2 id={`affiliate-title-${compact ? "studio" : "home"}`}>{t("affiliate.title")}</h2><p>{t("affiliate.intro")}</p></div><small>{t("affiliate.commissionDisclosure")} As an Amazon Associate I earn from qualifying purchases.</small></header>
    <div className="affiliate-partner-grid">
      <a className="affiliate-featured" href={sudowriteAffiliateUrl} target="_blank" rel="sponsored noreferrer">
        <div><span>{t("affiliate.sudowriteLabel")}</span><b>{t("affiliate.sudowrite")}</b><small>{t("affiliate.sudowriteBody")}</small></div>
        <em>{t("affiliate.trySudowrite")} →</em>
      </a>
      <a className="affiliate-featured walmart" href={walmartWritingSuppliesUrl} target="_blank" rel="sponsored noreferrer">
        <div><span>{t("affiliate.walmartLabel")}</span><b>{t("affiliate.walmart")}</b><small>{t("affiliate.walmartBody")}</small></div>
        <em>{t("affiliate.shopWalmart")} →</em>
      </a>
    </div>
    <div className="affiliate-grid">{recommendations.map((item) => <a key={item.key} href={amazonSearch(item.query)} target="_blank" rel="sponsored noreferrer"><span>{item.number}</span><div><b>{t(`affiliate.${item.key}`)}</b><small>{t(`affiliate.${item.key}Body`)}</small></div><em>{t("affiliate.browse")} →</em></a>)}</div>
  </aside>;
}

export function AmazonWorkbenchRecommendation() {
  const { t } = useI18n();
  return <aside className="affiliate-workbench" aria-label={t("affiliate.shelf")}>
    <span>{t("affiliate.label")}</span>
    <b>{t("affiliate.title")}</b>
    <a className="affiliate-workbench-featured" href={sudowriteAffiliateUrl} target="_blank" rel="sponsored noreferrer"><strong>{t("affiliate.sudowrite")}</strong><small>{t("affiliate.trySudowrite")} ↗</small></a>
    <a className="affiliate-workbench-featured walmart" href={walmartWritingSuppliesUrl} target="_blank" rel="sponsored noreferrer"><strong>{t("affiliate.walmart")}</strong><small>{t("affiliate.shopWalmart")} ↗</small></a>
    <div>
      <a href={amazonSearch("books on writing fiction")} target="_blank" rel="sponsored noreferrer">{t("affiliate.craft")} ↗</a>
      <a href={amazonSearch("editing style guides for writers")} target="_blank" rel="sponsored noreferrer">{t("affiliate.editing")} ↗</a>
    </div>
    <small>{t("affiliate.commissionDisclosure")} As an Amazon Associate I earn from qualifying purchases.</small>
  </aside>;
}

function amazonSearch(query: string) {
  const parameters = new URLSearchParams({ k: query, tag: associateTag });
  return `https://www.amazon.com/s?${parameters}`;
}
