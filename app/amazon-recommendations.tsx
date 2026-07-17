"use client";

import { useI18n } from "./language-provider";

const associateTag = "storystudio00-20";
const recommendations = [
  { key: "craft", number: "01", query: "books on writing fiction" },
  { key: "structure", number: "02", query: "story structure workbook for writers" },
  { key: "editing", number: "03", query: "editing style guides for writers" },
  { key: "notebooks", number: "04", query: "writers notebook for novel planning" },
] as const;

export function AmazonRecommendations({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return <aside className={`affiliate-shelf ${compact ? "compact" : ""}`} aria-labelledby={`affiliate-title-${compact ? "studio" : "home"}`}>
    <header><div><span className="affiliate-label">{t("affiliate.label")}</span><h2 id={`affiliate-title-${compact ? "studio" : "home"}`}>{t("affiliate.title")}</h2><p>{t("affiliate.intro")}</p></div><small>{t("affiliate.paidLink")} · As an Amazon Associate I earn from qualifying purchases.</small></header>
    <div className="affiliate-grid">{recommendations.map((item) => <a key={item.key} href={amazonSearch(item.query)} target="_blank" rel="sponsored noreferrer"><span>{item.number}</span><div><b>{t(`affiliate.${item.key}`)}</b><small>{t(`affiliate.${item.key}Body`)}</small></div><em>{t("affiliate.browse")} →</em></a>)}</div>
  </aside>;
}

function amazonSearch(query: string) {
  const parameters = new URLSearchParams({ k: query, tag: associateTag });
  return `https://www.amazon.com/s?${parameters}`;
}
