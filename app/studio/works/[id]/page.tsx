import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { works } from "@/db/schema";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { getWorkBundle } from "@/lib/queries";
import { Workbench } from "./workbench";

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/studio/works/${id}`);
  const [work] = await getDb()
    .select()
    .from(works)
    .where(and(eq(works.id, id), eq(works.ownerEmail, user.email)))
    .limit(1);
  if (!work) notFound();
  const bundle = await getWorkBundle(work.id);
  return <Workbench initialWork={work} initialBundle={bundle} />;
}
