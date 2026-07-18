import { getDb } from "@/db";
import { userActivity, userDailyActivity } from "@/db/schema";
import { sha256 } from "@/lib/authz";

export async function recordUserActivity(email: string) {
  const now = new Date().toISOString();
  const activityDate = now.slice(0, 10);
  const userKey = await sha256(email.trim().toLowerCase());
  const db = getDb();

  await db.batch([
    db.insert(userActivity).values({ userKey, firstSeenAt: now, lastSeenAt: now }).onConflictDoUpdate({
      target: userActivity.userKey,
      set: { lastSeenAt: now },
    }),
    db.insert(userDailyActivity).values({ userKey, activityDate, firstSeenAt: now }).onConflictDoNothing(),
  ]);
}

export function usageTimeRanges() {
  const now = Date.now();
  const dateForDaysAgo = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
  return {
    thirtyDaysAgo: new Date(now - 30 * 86_400_000).toISOString(),
    sevenDaysAgo: new Date(now - 7 * 86_400_000).toISOString(),
    today: dateForDaysAgo(0),
    chartStart: dateForDaysAgo(13),
    chartDates: Array.from({ length: 14 }, (_, index) => dateForDaysAgo(13 - index)),
  };
}
