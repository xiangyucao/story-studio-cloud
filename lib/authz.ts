import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens, works } from "@/db/schema";

export async function ownedWork(workId: string, ownerEmail: string) {
  const [work] = await getDb()
    .select()
    .from(works)
    .where(and(eq(works.id, workId), eq(works.ownerEmail, ownerEmail)))
    .limit(1);
  return work ?? null;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function ownerFromBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token.startsWith("ss_live_") || token.length < 24) return null;
  const tokenHash = await sha256(token);
  const db = getDb();
  const [record] = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
    .limit(1);
  if (!record) return null;
  await db
    .update(apiTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiTokens.id, record.id));
  return record.ownerEmail;
}
