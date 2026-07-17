import { getDb } from "@/db";
import { chapters, characters, characterRelationships, logicLinks, timelineEvents, volumes, worldEntries, works } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createId, createSlug } from "@/lib/ids";

type LegacyBackup = {
  format: "story-studio-project-backup"; version: number;
  project: { title: string; genre?: string; premise?: string; styleGuide?: string; referenceText?: string; writingLanguage?: string };
  outline?: Array<{ sourceId: string; sourceParentId: string | null; type: "volume" | "chapter" | "scene"; title: string; summary?: string; position?: number; revision?: number }>;
  chapters?: Array<{ sourceId: string; sourceOutlineNodeId: string | null; title: string; content?: string; summary?: string; status?: string; position?: number; targetWordCount?: number; basedOnOutlineRevision?: number }>;
  characters?: Array<{ sourceId: string; name: string; role?: string; description?: string; goal?: string; fear?: string; secret?: string; voice?: string }>;
  relationships?: Array<{ sourceCharacterId: string; targetCharacterId: string; type?: string; description?: string }>;
  worldEntries?: Array<{ category?: string; name: string; description?: string; isCanon?: boolean; isHardSetting?: boolean }>;
  events?: Array<{ title: string; storyTime?: string; description?: string; causes?: string; consequences?: string }>;
};

type CloudBackup = {
  format: "story-studio-cloud-backup"; version: 1;
  work: { title: string; description?: string; genre?: string; language?: string; premise?: string; styleGuide?: string; referenceExcerpt?: string };
  volumes?: Array<{ id: string; position: number; title: string; synopsis?: string }>;
  chapters?: Array<{ id: string; volumeId: string; position: number; title: string; outline?: string; content?: string; targetWords?: number; status?: string; revision?: number }>;
  characters?: Array<{ id: string; name: string; role?: string; description?: string; personality?: string; goal?: string }>;
  relationships?: Array<{ sourceCharacterId: string; targetCharacterId: string; relationship?: string; description?: string }>;
  world?: Array<{ category?: string; title: string; content?: string; isHardSetting?: boolean }>;
  timeline?: Array<{ position?: number; timeLabel?: string; title: string; content?: string }>;
  logicLinks?: Array<{ fromRef: string; relation: string; toRef: string; notes?: string; status?: string }>;
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > 20 * 1024 * 1024) return Response.json({ error: "云端导入暂不接受超过 20 MB 的备份；请先移除内嵌插画。" }, { status: 413 });
  let parsed: LegacyBackup | CloudBackup;
  try { parsed = JSON.parse(raw) as LegacyBackup | CloudBackup; } catch { return Response.json({ error: "JSON 无法解析" }, { status: 400 }); }
  if (parsed.format === "story-studio-cloud-backup") return importCloudBackup(parsed, user.email);
  const backup = parsed;
  if (backup.format !== "story-studio-project-backup" || backup.version !== 1 || !backup.project?.title) return Response.json({ error: "请选择本地 Story Studio 导出的完整作品备份（版本 1）" }, { status: 400 });
  const now = new Date().toISOString(); const workId = createId("wrk"); const db = getDb();
  await db.insert(works).values({ id: workId, ownerEmail: user.email, title: `${backup.project.title}（云端副本）`, slug: createSlug(backup.project.title), description: backup.project.premise || "", genre: backup.project.genre || "未分类", language: backup.project.writingLanguage || "zh-CN", premise: backup.project.premise || "", styleGuide: backup.project.styleGuide || "", referenceExcerpt: backup.project.referenceText || "", isPublished: false, createdAt: now, updatedAt: now });
  const outline = backup.outline ?? [];
  const legacyVolumes = outline.filter((item) => item.type === "volume").sort((a,b) => (a.position ?? 0) - (b.position ?? 0));
  const volumeMap = new Map<string,string>();
  const volumeRows = legacyVolumes.length ? legacyVolumes : [{ sourceId: "fallback", sourceParentId: null, type: "volume" as const, title: "第一卷", summary: "", position: 1 }];
  for (let index = 0; index < volumeRows.length; index++) { const item = volumeRows[index]; const id = createId("vol"); volumeMap.set(item.sourceId,id); await db.insert(volumes).values({ id, workId, position: index+1, title: item.title, synopsis: item.summary || "", createdAt: now, updatedAt: now }); }
  const chapterNodeById = new Map(outline.filter((item) => item.type === "chapter").map((item) => [item.sourceId,item]));
  const chapterMap = new Map<string,string>();
  for (const item of backup.chapters ?? []) {
    const node = item.sourceOutlineNodeId ? chapterNodeById.get(item.sourceOutlineNodeId) : undefined;
    const volumeId = (node?.sourceParentId && volumeMap.get(node.sourceParentId)) || volumeMap.values().next().value;
    if (!volumeId) continue;
    const id = createId("chp"); chapterMap.set(item.sourceId,id);
    await db.insert(chapters).values({ id, workId, volumeId, position: Math.max(1,item.position || node?.position || 1), title: item.title, outline: node?.summary || item.summary || "", content: item.content || "", targetWords: item.targetWordCount || 3000, status: item.status || (item.content ? "draft" : "outline"), isPublished: false, revision: Math.max(1,item.basedOnOutlineRevision || node?.revision || 1), createdAt: now, updatedAt: now });
  }
  if (!(backup.chapters?.length)) { const volumeId = volumeMap.values().next().value; if (volumeId) await db.insert(chapters).values({ id: createId("chp"), workId, volumeId, position: 1, title: "未命名章节", outline: "", content: "", targetWords: 3000, status: "outline", revision: 1, createdAt: now, updatedAt: now }); }
  const characterMap = new Map<string,string>();
  for (const item of backup.characters ?? []) { if (!item.name) continue; const id=createId("chr"); characterMap.set(item.sourceId,id); const extras=[item.fear&&`恐惧：${item.fear}`,item.secret&&`秘密：${item.secret}`,item.voice&&`语言风格：${item.voice}`].filter(Boolean).join("\n"); await db.insert(characters).values({ id,workId,name:item.name,role:item.role||"",description:[item.description,extras].filter(Boolean).join("\n"),personality:"",goal:item.goal||"",createdAt:now,updatedAt:now }); }
  for (const item of backup.relationships ?? []) { const sourceCharacterId=characterMap.get(item.sourceCharacterId),targetCharacterId=characterMap.get(item.targetCharacterId); if(sourceCharacterId&&targetCharacterId) await db.insert(characterRelationships).values({id:createId("rel"),workId,sourceCharacterId,targetCharacterId,relationship:item.type||"关系",description:item.description||"",createdAt:now,updatedAt:now}); }
  for (const item of backup.worldEntries ?? []) { if(item.name) await db.insert(worldEntries).values({id:createId("wld"),workId,category:item.category||"背景",title:item.name,content:item.description||"",isHardSetting:Boolean(item.isHardSetting??item.isCanon),createdAt:now,updatedAt:now}); }
  let eventPosition=0; for (const item of backup.events ?? []) { if(item.title) { eventPosition++; await db.insert(timelineEvents).values({id:createId("evt"),workId,position:eventPosition,timeLabel:item.storyTime||"",title:item.title,content:[item.description,item.causes&&`原因：${item.causes}`,item.consequences&&`结果：${item.consequences}`].filter(Boolean).join("\n"),createdAt:now,updatedAt:now}); } }
  return Response.json({ workId, title: backup.project.title, imported: { volumes: volumeRows.length, chapters: backup.chapters?.length ?? 0, characters: backup.characters?.length ?? 0, world: backup.worldEntries?.length ?? 0, timeline: backup.events?.length ?? 0 } }, { status: 201 });
}

async function importCloudBackup(backup: CloudBackup, ownerEmail: string) {
  if (backup.version !== 1 || !backup.work?.title) return Response.json({ error: "云端备份版本无效" }, { status: 400 });
  const db=getDb(),now=new Date().toISOString(),workId=createId("wrk");
  await db.insert(works).values({id:workId,ownerEmail,title:`${backup.work.title}（副本）`,slug:createSlug(backup.work.title),description:backup.work.description||"",genre:backup.work.genre||"未分类",language:backup.work.language||"zh-CN",premise:backup.work.premise||"",styleGuide:backup.work.styleGuide||"",referenceExcerpt:backup.work.referenceExcerpt||"",isPublished:false,createdAt:now,updatedAt:now});
  const volumeMap=new Map<string,string>();
  const sourceVolumes=(backup.volumes?.length?backup.volumes:[{id:"fallback",position:1,title:"第一卷",synopsis:""}]).sort((a,b)=>a.position-b.position);
  for(const item of sourceVolumes){const id=createId("vol");volumeMap.set(item.id,id);await db.insert(volumes).values({id,workId,position:item.position,title:item.title,synopsis:item.synopsis||"",createdAt:now,updatedAt:now});}
  for(const item of backup.chapters??[]){const volumeId=volumeMap.get(item.volumeId)||volumeMap.values().next().value;if(!volumeId)continue;await db.insert(chapters).values({id:createId("chp"),workId,volumeId,position:item.position,title:item.title,outline:item.outline||"",content:item.content||"",targetWords:item.targetWords||3000,status:item.status||"draft",isPublished:false,revision:Math.max(1,item.revision||1),createdAt:now,updatedAt:now});}
  if(!(backup.chapters?.length)){const volumeId=volumeMap.values().next().value;if(volumeId)await db.insert(chapters).values({id:createId("chp"),workId,volumeId,position:1,title:"未命名章节",outline:"",content:"",targetWords:3000,status:"outline",isPublished:false,revision:1,createdAt:now,updatedAt:now});}
  const characterMap=new Map<string,string>();for(const item of backup.characters??[]){if(!item.name)continue;const id=createId("chr");characterMap.set(item.id,id);await db.insert(characters).values({id,workId,name:item.name,role:item.role||"",description:item.description||"",personality:item.personality||"",goal:item.goal||"",createdAt:now,updatedAt:now});}
  for(const item of backup.relationships??[]){const sourceCharacterId=characterMap.get(item.sourceCharacterId),targetCharacterId=characterMap.get(item.targetCharacterId);if(sourceCharacterId&&targetCharacterId)await db.insert(characterRelationships).values({id:createId("rel"),workId,sourceCharacterId,targetCharacterId,relationship:item.relationship||"关系",description:item.description||"",createdAt:now,updatedAt:now});}
  for(const item of backup.world??[]){if(item.title)await db.insert(worldEntries).values({id:createId("wld"),workId,category:item.category||"背景",title:item.title,content:item.content||"",isHardSetting:Boolean(item.isHardSetting),createdAt:now,updatedAt:now});}
  for(const item of backup.timeline??[]){if(item.title)await db.insert(timelineEvents).values({id:createId("evt"),workId,position:item.position||1,timeLabel:item.timeLabel||"",title:item.title,content:item.content||"",createdAt:now,updatedAt:now});}
  for(const item of backup.logicLinks??[]){if(item.fromRef&&item.toRef)await db.insert(logicLinks).values({id:createId("lnk"),workId,fromRef:item.fromRef,relation:item.relation||"导致",toRef:item.toRef,notes:item.notes||"",status:item.status||"active",createdAt:now,updatedAt:now});}
  return Response.json({workId,title:backup.work.title,imported:{volumes:sourceVolumes.length,chapters:backup.chapters?.length??0,characters:backup.characters?.length??0,world:backup.world?.length??0,timeline:backup.timeline?.length??0,logicLinks:backup.logicLinks?.length??0}},{status:201});
}
