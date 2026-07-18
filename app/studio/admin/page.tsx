import { notFound } from "next/navigation";
import { count, desc, gte, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens, chapters, userActivity, userDailyActivity, works } from "@/db/schema";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { isAdminEmail } from "@/lib/admin";
import { sha256 } from "@/lib/authz";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import { usageTimeRanges } from "@/lib/usage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [user, locale] = await Promise.all([requireChatGPTUser("/studio/admin"), getUiLocale()]);
  if (!isAdminEmail(user.email)) notFound();

  const db = getDb();
  const { thirtyDaysAgo, sevenDaysAgo, today, chartStart, chartDates } = usageTimeRanges();

  const [activityRows, workOwners, tokenOwners, workStatsRows, chapterStatsRows, tokenStatsRows, dailyRows] = await Promise.all([
    db.select().from(userActivity),
    db.selectDistinct({ email: works.ownerEmail }).from(works),
    db.selectDistinct({ email: apiTokens.ownerEmail }).from(apiTokens).where(isNull(apiTokens.revokedAt)),
    db.select({ total: count(), published: sql<number>`sum(case when ${works.isPublished} = 1 then 1 else 0 end)` }).from(works),
    db.select({ total: count(), drafted: sql<number>`sum(case when length(trim(${chapters.content})) > 0 then 1 else 0 end)` }).from(chapters),
    db.select({ total: count() }).from(apiTokens).where(isNull(apiTokens.revokedAt)),
    db.select({ activityDate: userDailyActivity.activityDate, users: count() }).from(userDailyActivity).where(gte(userDailyActivity.activityDate, chartStart)).groupBy(userDailyActivity.activityDate).orderBy(desc(userDailyActivity.activityDate)),
  ]);

  const knownUserKeys = new Set(activityRows.map((row) => row.userKey));
  for (const row of [...workOwners, ...tokenOwners]) knownUserKeys.add(await sha256(row.email.trim().toLowerCase()));

  const workStats = workStatsRows[0] ?? { total: 0, published: 0 };
  const chapterStats = chapterStatsRows[0] ?? { total: 0, drafted: 0 };
  const dailyMap = new Map(dailyRows.map((row) => [row.activityDate, Number(row.users)]));
  const daily = chartDates.map((date) => ({ date, users: dailyMap.get(date) ?? 0 }));
  const maxDaily = Math.max(1, ...daily.map((day) => day.users));
  const dateFormatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  const stats = [
    ["admin.totalUsers", knownUserKeys.size],
    ["admin.activeToday", activityRows.filter((row) => row.lastSeenAt.slice(0, 10) === today).length],
    ["admin.active7", activityRows.filter((row) => row.lastSeenAt >= sevenDaysAgo).length],
    ["admin.active30", activityRows.filter((row) => row.lastSeenAt >= thirtyDaysAgo).length],
    ["admin.totalWorks", Number(workStats.total)],
    ["admin.totalChapters", Number(chapterStats.total)],
    ["admin.draftedChapters", Number(chapterStats.drafted ?? 0)],
    ["admin.publishedWorks", Number(workStats.published ?? 0)],
    ["admin.mcpTokens", Number(tokenStatsRows[0]?.total ?? 0)],
  ] as const;

  return <main className="studio-dashboard admin-page">
    <section className="dashboard-heading"><div><span className="studio-kicker">{t("admin.kicker")}</span><h1>{t("admin.title")}</h1><p>{t("admin.intro")}</p></div></section>
    <section className="admin-stat-grid">{stats.map(([label, value]) => <article key={label}><span>{t(label)}</span><b>{value.toLocaleString(locale)}</b></article>)}</section>
    <section className="admin-chart-card">
      <div><h2>{t("admin.activityTitle")}</h2><p>{t("admin.activityBody")}</p></div>
      <div className="admin-chart" role="img" aria-label={t("admin.activityTitle")}>
        {daily.map((day) => <div className="admin-bar-column" key={day.date} title={t("admin.activeCount", { count: day.users })}><span>{day.users || ""}</span><i style={{ height: `${Math.max(day.users ? 8 : 2, day.users / maxDaily * 100)}%` }} /><small>{dateFormatter.format(new Date(`${day.date}T00:00:00Z`))}</small></div>)}
      </div>
    </section>
    <aside className="admin-privacy-note"><b>{t("admin.privacyTitle")}</b><p>{t("admin.privacyBody")}</p></aside>
  </main>;
}
