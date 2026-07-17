import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chapters, volumes, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import { createId } from "@/lib/ids";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const { id } = await params;
  if (!await ownedWork(id, user.email)) return Response.json({ error: "作品不存在" }, { status: 404 });
  const body = await request.json() as { type?: string; volumeId?: string; title?: string; synopsis?: string; outline?: string };
  const db = getDb(); const now = new Date().toISOString();
  if (body.type === "volume") {
    const [last] = await db.select({ position: volumes.position }).from(volumes).where(eq(volumes.workId, id)).orderBy(desc(volumes.position)).limit(1);
    const [volume] = await db.insert(volumes).values({ id: createId("vol"), workId: id, position: (last?.position ?? 0) + 1, title: body.title?.trim() || `第 ${(last?.position ?? 0) + 1} 卷`, synopsis: body.synopsis?.trim() || "", createdAt: now, updatedAt: now }).returning();
    await db.update(works).set({ updatedAt: now }).where(eq(works.id, id));
    return Response.json({ volume }, { status: 201 });
  }
  if (body.type === "chapter" && body.volumeId) {
    const [volume] = await db.select().from(volumes).where(and(eq(volumes.id, body.volumeId), eq(volumes.workId, id))).limit(1);
    if (!volume) return Response.json({ error: "卷不存在" }, { status: 404 });
    const [last] = await db.select({ position: chapters.position }).from(chapters).where(eq(chapters.volumeId, body.volumeId)).orderBy(desc(chapters.position)).limit(1);
    const [chapter] = await db.insert(chapters).values({ id: createId("chp"), workId: id, volumeId: body.volumeId, position: (last?.position ?? 0) + 1, title: body.title?.trim() || "未命名章节", outline: body.outline?.trim() || "", content: "", targetWords: 3000, status: "outline", revision: 1, createdAt: now, updatedAt: now }).returning();
    await db.update(works).set({ updatedAt: now }).where(eq(works.id, id));
    return Response.json({ chapter }, { status: 201 });
  }
  return Response.json({ error: "不支持的操作" }, { status: 400 });
}
