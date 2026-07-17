import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  chapters,
  characters,
  characterRelationships,
  logicLinks,
  timelineEvents,
  volumes,
  worldEntries,
  works,
} from "@/db/schema";

export async function getPublicWorks(limit = 12) {
  try {
    return await getDb()
      .select()
      .from(works)
      .where(eq(works.isPublished, true))
      .orderBy(desc(works.updatedAt))
      .limit(limit);
  } catch {
    return [];
  }
}

export async function getWorkBundle(workId: string) {
  const db = getDb();
  const [volumeRows, chapterRows, characterRows, relationshipRows, worldRows, timelineRows, logicRows] = await Promise.all([
    db.select().from(volumes).where(eq(volumes.workId, workId)).orderBy(asc(volumes.position)),
    db.select().from(chapters).where(eq(chapters.workId, workId)).orderBy(asc(chapters.position)),
    db.select().from(characters).where(eq(characters.workId, workId)).orderBy(asc(characters.createdAt)),
    db.select().from(characterRelationships).where(eq(characterRelationships.workId, workId)).orderBy(asc(characterRelationships.createdAt)),
    db.select().from(worldEntries).where(eq(worldEntries.workId, workId)).orderBy(asc(worldEntries.createdAt)),
    db.select().from(timelineEvents).where(eq(timelineEvents.workId, workId)).orderBy(asc(timelineEvents.position)),
    db.select().from(logicLinks).where(eq(logicLinks.workId, workId)).orderBy(asc(logicLinks.createdAt)),
  ]);
  return { volumes: volumeRows, chapters: chapterRows, characters: characterRows, relationships: relationshipRows, world: worldRows, timeline: timelineRows, logicLinks: logicRows };
}
