import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chapters, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const { id, chapterId } = await params;
  if (!await ownedWork(id, user.email)) return Response.json({ error: "作品不存在" }, { status: 404 });
  const body = await request.json() as Record<string, unknown>;
  const update: Record<string, string | number | boolean> = {};
  for (const field of ["title", "outline", "content", "status"] as const) if (typeof body[field] === "string") update[field] = body[field] as string;
  if (typeof body.targetWords === "number") update.targetWords = Math.max(100, Math.min(30000, Math.round(body.targetWords)));
  if (typeof body.isPublished === "boolean") update.isPublished = body.isPublished;
  if (typeof body.revision === "number") update.revision = Math.round(body.revision) + 1;
  update.updatedAt = new Date().toISOString();
  const db = getDb();
  const [chapter] = await db.update(chapters).set(update).where(and(eq(chapters.id, chapterId), eq(chapters.workId, id))).returning();
  if (!chapter) return Response.json({ error: "章节不存在" }, { status: 404 });
  await db.update(works).set({ updatedAt: new Date().toISOString() }).where(eq(works.id, id));
  return Response.json({ chapter });
}
