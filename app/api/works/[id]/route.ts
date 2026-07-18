import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import { parseWritingLanguage } from "@/lib/writing-languages";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const { id } = await params;
  if (!await ownedWork(id, user.email)) return Response.json({ error: "作品不存在" }, { status: 404 });
  const body = await request.json() as Record<string, unknown>;
  const allowed: Record<string, string | boolean> = {};
  for (const field of ["title", "description", "genre", "premise", "styleGuide", "referenceExcerpt"] as const) {
    if (typeof body[field] === "string") allowed[field] = (body[field] as string).trim();
  }
  if (body.language !== undefined) {
    const language = parseWritingLanguage(body.language);
    if (!language) return Response.json({ error: "请选择支持的写作语言" }, { status: 400 });
    allowed.language = language;
  }
  if (typeof body.isPublished === "boolean") allowed.isPublished = body.isPublished;
  const [work] = await getDb().update(works).set({ ...allowed, updatedAt: new Date().toISOString() }).where(eq(works.id, id)).returning();
  return Response.json({ work });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const { id } = await params;
  if (!await ownedWork(id, user.email)) return Response.json({ error: "作品不存在" }, { status: 404 });
  await getDb().delete(works).where(eq(works.id, id));
  return new Response(null, { status: 204 });
}
