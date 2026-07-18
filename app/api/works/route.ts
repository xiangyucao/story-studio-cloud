import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chapters, volumes, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createId, createSlug } from "@/lib/ids";
import { defaultOutlineTitles, parseWritingLanguage } from "@/lib/writing-languages";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const rows = await getDb().select().from(works).where(eq(works.ownerEmail, user.email)).orderBy(desc(works.updatedAt));
  return Response.json({ works: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const body = await request.json() as { title?: string; description?: string; genre?: string; language?: string };
  const title = body.title?.trim();
  if (!title) return Response.json({ error: "请填写作品名" }, { status: 400 });
  if (title.length > 160) return Response.json({ error: "作品名不能超过 160 个字符" }, { status: 400 });
  const language = parseWritingLanguage(body.language ?? "en");
  if (!language) return Response.json({ error: "请选择支持的写作语言" }, { status: 400 });
  const defaultTitles = defaultOutlineTitles(language);
  const now = new Date().toISOString();
  const workId = createId("wrk");
  const volumeId = createId("vol");
  const chapterId = createId("chp");
  const work = { id: workId, ownerEmail: user.email, title, slug: createSlug(title), description: body.description?.trim() ?? "", genre: body.genre?.trim() || "Uncategorized", language, createdAt: now, updatedAt: now };
  const db = getDb();
  await db.batch([
    db.insert(works).values(work),
    db.insert(volumes).values({ id: volumeId, workId, position: 1, title: defaultTitles.volume, synopsis: "", createdAt: now, updatedAt: now }),
    db.insert(chapters).values({ id: chapterId, workId, volumeId, position: 1, title: defaultTitles.chapter, outline: "", content: "", targetWords: 3000, status: "outline", revision: 1, createdAt: now, updatedAt: now }),
  ]);
  return Response.json({ work: { ...work, chapterCount: 1, wordCount: 0, isPublished: false } }, { status: 201 });
}
