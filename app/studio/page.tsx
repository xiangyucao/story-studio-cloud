import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chapters, works } from "@/db/schema";
import { requireChatGPTUser } from "../chatgpt-auth";
import { StudioHome } from "./studio-home";

export default async function StudioPage() {
  const user = await requireChatGPTUser("/studio");
  const db = getDb();
  const workRows = await db.select().from(works).where(eq(works.ownerEmail, user.email)).orderBy(desc(works.updatedAt));
  const chapterRows = await db.select({ workId: chapters.workId, content: chapters.content }).from(chapters);
  const data = workRows.map((work) => ({ ...work, chapterCount: chapterRows.filter((chapter) => chapter.workId === work.id).length, wordCount: chapterRows.filter((chapter) => chapter.workId === work.id).reduce((sum, chapter) => sum + chapter.content.trim().split(/\s+|(?<=[\u3400-\u9fff])/).filter(Boolean).length, 0) }));
  return <StudioHome initialWorks={data} displayName={user.displayName} />;
}
