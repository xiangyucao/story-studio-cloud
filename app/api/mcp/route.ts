import { and, asc, desc, eq } from "drizzle-orm";
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
import { ownerFromBearer, ownedWork } from "@/lib/authz";
import { getWorkBundle } from "@/lib/queries";
import { createId, createSlug } from "@/lib/ids";
import { buildChapterPrompt, type ChapterPromptMode } from "@/lib/chapter-prompt";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
type Db = ReturnType<typeof getDb>;
const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, mcp-protocol-version" };

const workFields = {
  workId: { type: "string", description: "作品 ID。先用 story_list_works 获取。" },
  title: { type: "string", maxLength: 160 },
  description: { type: "string" },
  genre: { type: "string" },
  language: { type: "string" },
  premise: { type: "string" },
  styleGuide: { type: "string" },
  referenceExcerpt: { type: "string" },
};

const tools = [
  { name: "story_list_works", description: "列出当前作者的全部作品及发布状态。", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "story_create_work", description: "创建一部默认私密的新作品，并建立第一卷和第一章。不能自动发布。", inputSchema: { type: "object", properties: { title: workFields.title, description: workFields.description, genre: workFields.genre, language: workFields.language, premise: workFields.premise, styleGuide: workFields.styleGuide, referenceExcerpt: workFields.referenceExcerpt, volumeTitle: { type: "string" }, volumeSynopsis: { type: "string" }, chapterTitle: { type: "string" }, chapterOutline: { type: "string" }, targetWords: { type: "integer", minimum: 100, maximum: 30000 } }, required: ["title"], additionalProperties: false } },
  { name: "story_update_work", description: "修改作品标题、简介、类型、写作语言、核心构想、风格指南或参考范本。不会发布或删除作品。只传需要修改的字段。", inputSchema: { type: "object", properties: workFields, required: ["workId"], additionalProperties: false } },
  { name: "story_list_outline", description: "读取一部作品的卷、章、大纲、字数目标和章节版本号。", inputSchema: { type: "object", properties: { workId: workFields.workId }, required: ["workId"], additionalProperties: false } },
  {
    name: "story_manage_outline",
    description: "新增、修改、移动或删除卷和章节。修改章节必须带上最新 expectedRevision；删除必须 confirmDelete=true 且 confirmTitle 与当前标题完全一致。不能发布。",
    inputSchema: {
      type: "object",
      properties: {
        workId: workFields.workId,
        kind: { type: "string", enum: ["volume", "chapter"] },
        action: { type: "string", enum: ["create", "update", "delete"] },
        id: { type: "string", description: "更新或删除时的卷/章 ID。" },
        volumeId: { type: "string", description: "新建章节所属卷，或把章节移动到的新卷。" },
        title: { type: "string" },
        synopsis: { type: "string", description: "卷简介。" },
        outline: { type: "string", description: "章节大纲。" },
        targetWords: { type: "integer", minimum: 100, maximum: 30000 },
        position: { type: "integer", minimum: 1, description: "希望放置的一基序号；省略则保持原位或追加到末尾。" },
        expectedRevision: { type: "integer", minimum: 1, description: "修改章节时由 story_list_outline 读取的最新版本号。" },
        confirmDelete: { type: "boolean" },
        confirmTitle: { type: "string" },
      },
      required: ["workId", "kind", "action"],
      additionalProperties: false,
    },
  },
  { name: "story_get_context", description: "读取作品基石、人物关系、世界观、时间线和逻辑链，用于保持创作连续性。", inputSchema: { type: "object", properties: { workId: workFields.workId }, required: ["workId"], additionalProperties: false } },
  {
    name: "story_manage_context",
    description: "新增、修改或删除人物、人物关系、世界设定、时间线事件和逻辑链。更新只传需要修改的字段；删除必须显式传 confirmDelete=true。",
    inputSchema: {
      type: "object",
      properties: {
        workId: workFields.workId,
        kind: { type: "string", enum: ["character", "relationship", "world", "timeline", "logic"] },
        action: { type: "string", enum: ["create", "update", "delete"] },
        id: { type: "string", description: "更新或删除时的条目 ID。" },
        name: { type: "string" }, role: { type: "string" }, description: { type: "string" }, personality: { type: "string" }, goal: { type: "string" },
        sourceCharacterId: { type: "string" }, targetCharacterId: { type: "string" }, relationship: { type: "string" },
        category: { type: "string" }, title: { type: "string" }, content: { type: "string" }, isHardSetting: { type: "boolean" },
        position: { type: "integer", minimum: 1 }, timeLabel: { type: "string" },
        fromRef: { type: "string" }, relation: { type: "string" }, toRef: { type: "string" }, notes: { type: "string" }, status: { type: "string" },
        confirmDelete: { type: "boolean" },
      },
      required: ["workId", "kind", "action"],
      additionalProperties: false,
    },
  },
  { name: "story_get_chapter", description: "读取单章标题、大纲、正文和版本号。", inputSchema: { type: "object", properties: { workId: workFields.workId, chapterId: { type: "string" } }, required: ["workId", "chapterId"], additionalProperties: false } },
  { name: "story_build_chapter_prompt", description: "为单章生成提示词。mode=create 时根据大纲创作全新章节；mode=modify 时必须提供 suggestion，并把当前正文和完整故事上下文放入改写提示词。只返回提示词，不调用模型、不修改正文。", inputSchema: { type: "object", properties: { workId: workFields.workId, chapterId: { type: "string" }, mode: { type: "string", enum: ["create", "modify"] }, suggestion: { type: "string", description: "mode=modify 时必填，说明需要如何修改当前章节。" } }, required: ["workId", "chapterId", "mode"], additionalProperties: false } },
  { name: "story_save_chapter", description: "保存章节草稿。必须提供刚读取的 expectedRevision；若网页端已更新，工具会拒绝覆盖。不能发布章节。", inputSchema: { type: "object", properties: { workId: workFields.workId, chapterId: { type: "string" }, content: { type: "string" }, title: { type: "string" }, outline: { type: "string" }, expectedRevision: { type: "integer" } }, required: ["workId", "chapterId", "content", "expectedRevision"], additionalProperties: false } },
];

export async function OPTIONS() { return new Response(null, { status: 204, headers }); }
export async function GET() { return Response.json({ name: "Story Studio Cloud MCP", transport: "Streamable HTTP", endpoint: "/api/mcp" }, { headers }); }

export async function POST(request: Request) {
  const owner = await ownerFromBearer(request);
  if (!owner) return Response.json({ error: "invalid_token", error_description: "需要有效的 Story Studio 访问令牌" }, { status: 401, headers: { ...headers, "www-authenticate": "Bearer" } });
  let rpc: Rpc;
  try { rpc = await request.json() as Rpc; } catch { return rpcError(null, -32700, "Parse error"); }
  if (rpc.jsonrpc !== "2.0" || !rpc.method) return rpcError(rpc.id ?? null, -32600, "Invalid Request");
  if (rpc.method === "notifications/initialized") return new Response(null, { status: 202, headers });
  if (rpc.method === "initialize") return rpcResult(rpc.id, { protocolVersion: request.headers.get("mcp-protocol-version") || "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "story-studio-cloud", version: "0.3.0" }, instructions: "读取和管理作者自己的故事结构与私人章节草稿。可以生成新写或按建议修改的章节提示词。不得声称已发布内容，也不能通过 MCP 发布或删除整部作品。" });
  if (rpc.method === "ping") return rpcResult(rpc.id, {});
  if (rpc.method === "tools/list") return rpcResult(rpc.id, { tools });
  if (rpc.method !== "tools/call" || !rpc.params?.name) return rpcError(rpc.id ?? null, -32601, "Method not found");
  try {
    const value = await callTool(owner, rpc.params.name, rpc.params.arguments ?? {});
    return rpcResult(rpc.id, { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed";
    return rpcResult(rpc.id, { content: [{ type: "text", text: message }], isError: true });
  }
}

async function callTool(owner: string, name: string, args: Record<string, unknown>) {
  const db = getDb();
  if (name === "story_list_works") return { works: await db.select({ id: works.id, title: works.title, description: works.description, genre: works.genre, language: works.language, isPublished: works.isPublished, updatedAt: works.updatedAt }).from(works).where(eq(works.ownerEmail, owner)).orderBy(asc(works.title)) };
  if (name === "story_create_work") return createWork(db, owner, args);

  const workId = requiredString(args.workId, "workId");
  const work = await ownedWork(workId, owner);
  if (!work) throw new Error("作品不存在或无权访问");

  if (name === "story_update_work") {
    const patch: Partial<typeof works.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (args.title !== undefined) {
      const title = requiredString(args.title, "title").trim();
      if (title.length > 160) throw new Error("title 不能超过 160 个字符");
      patch.title = title;
    }
    for (const field of ["description", "genre", "language", "premise", "styleGuide", "referenceExcerpt"] as const) {
      if (args[field] !== undefined) patch[field] = requiredString(args[field], field, true).trim();
    }
    if (Object.keys(patch).length === 1) throw new Error("没有可更新的作品字段");
    const [updated] = await db.update(works).set(patch).where(and(eq(works.id, workId), eq(works.ownerEmail, owner))).returning();
    return { updated: true, work: updated };
  }

  if (name === "story_list_outline") return listOutline(db, work);
  if (name === "story_manage_outline") return manageOutline(db, workId, args);
  if (name === "story_get_context") {
    const bundle = await getWorkBundle(workId);
    return { work: { id: work.id, title: work.title, description: work.description, genre: work.genre, language: work.language, premise: work.premise, styleGuide: work.styleGuide, referenceExcerpt: work.referenceExcerpt }, characters: bundle.characters, relationships: bundle.relationships, world: bundle.world, timeline: bundle.timeline, logicLinks: bundle.logicLinks };
  }
  if (name === "story_manage_context") return manageContext(db, workId, args);

  const chapterId = requiredString(args.chapterId, "chapterId");
  const [chapter] = await db.select().from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.workId, workId))).limit(1);
  if (!chapter) throw new Error("章节不存在");
  if (name === "story_get_chapter") return { chapter };
  if (name === "story_build_chapter_prompt") {
    const mode = enumString(args.mode, "mode", ["create", "modify"]) as ChapterPromptMode;
    const suggestion = mode === "modify" ? requiredString(args.suggestion, "suggestion").trim() : "";
    const bundle = await getWorkBundle(workId);
    const volume = bundle.volumes.find((item) => item.id === chapter.volumeId);
    const prompt = buildChapterPrompt({ work, volume, chapter, bundle, mode, suggestion });
    return { mode, workId, chapterId, chapterRevision: chapter.revision, includesCurrentDraft: mode === "modify", prompt, nextStep: "把模型返回的完整章节正文通过 story_save_chapter 保存，并使用这里的 chapterRevision 作为 expectedRevision。" };
  }
  if (name === "story_save_chapter") {
    const expectedRevision = integer(args.expectedRevision, "expectedRevision");
    if (chapter.revision !== expectedRevision) throw new Error(`版本冲突：当前版本是 ${chapter.revision}，请重新读取后再保存。`);
    const patch: { content: string; title?: string; outline?: string; status: string; revision: number; updatedAt: string } = { content: requiredString(args.content, "content", true), status: "draft", revision: chapter.revision + 1, updatedAt: new Date().toISOString() };
    if (typeof args.title === "string") patch.title = args.title.trim();
    if (typeof args.outline === "string") patch.outline = args.outline.trim();
    const [saved] = await db.update(chapters).set(patch).where(and(eq(chapters.id, chapterId), eq(chapters.workId, workId), eq(chapters.revision, expectedRevision))).returning();
    if (!saved) throw new Error("保存时出现版本冲突，请重新读取。");
    await touchWork(db, workId);
    return { saved: true, chapter: { id: saved.id, title: saved.title, revision: saved.revision, updatedAt: saved.updatedAt } };
  }
  throw new Error(`未知工具：${name}`);
}

async function createWork(db: Db, owner: string, args: Record<string, unknown>) {
  const title = requiredString(args.title, "title").trim();
  if (title.length > 160) throw new Error("title 不能超过 160 个字符");
  const language = optionalString(args.language) || "en";
  const now = new Date().toISOString();
  const workId = createId("wrk"), volumeId = createId("vol"), chapterId = createId("chp");
  const volumeTitle = optionalString(args.volumeTitle) || (language.startsWith("zh") ? "第一卷" : "Volume One");
  const chapterTitle = optionalString(args.chapterTitle) || (language.startsWith("zh") ? "未命名章节" : "Untitled Chapter");
  const targetWords = boundedInteger(args.targetWords, 3000, 100, 30000);
  await db.batch([
    db.insert(works).values({ id: workId, ownerEmail: owner, title, slug: createSlug(title), description: optionalString(args.description), genre: optionalString(args.genre) || "Uncategorized", language, premise: optionalString(args.premise), styleGuide: optionalString(args.styleGuide), referenceExcerpt: optionalString(args.referenceExcerpt), isPublished: false, createdAt: now, updatedAt: now }),
    db.insert(volumes).values({ id: volumeId, workId, position: 1, title: volumeTitle, synopsis: optionalString(args.volumeSynopsis), createdAt: now, updatedAt: now }),
    db.insert(chapters).values({ id: chapterId, workId, volumeId, position: 1, title: chapterTitle, outline: optionalString(args.chapterOutline), content: "", targetWords, status: "outline", isPublished: false, revision: 1, createdAt: now, updatedAt: now }),
  ]);
  return { created: true, work: { id: workId, title, isPublished: false }, volume: { id: volumeId, title: volumeTitle }, chapter: { id: chapterId, title: chapterTitle, revision: 1 } };
}

async function listOutline(db: Db, work: typeof works.$inferSelect) {
  const [volumeRows, chapterRows] = await Promise.all([
    db.select().from(volumes).where(eq(volumes.workId, work.id)).orderBy(asc(volumes.position)),
    db.select({ id: chapters.id, volumeId: chapters.volumeId, position: chapters.position, title: chapters.title, outline: chapters.outline, targetWords: chapters.targetWords, status: chapters.status, revision: chapters.revision, updatedAt: chapters.updatedAt }).from(chapters).where(eq(chapters.workId, work.id)).orderBy(asc(chapters.position)),
  ]);
  return { work: { id: work.id, title: work.title, language: work.language }, volumes: volumeRows.map((volume) => ({ ...volume, chapters: chapterRows.filter((chapter) => chapter.volumeId === volume.id) })) };
}

async function manageOutline(db: Db, workId: string, args: Record<string, unknown>) {
  const kind = enumString(args.kind, "kind", ["volume", "chapter"]);
  const action = enumString(args.action, "action", ["create", "update", "delete"]);
  const now = new Date().toISOString();

  if (kind === "volume") {
    if (action === "create") {
      const [last] = await db.select({ position: volumes.position }).from(volumes).where(eq(volumes.workId, workId)).orderBy(desc(volumes.position)).limit(1);
      const [created] = await db.insert(volumes).values({ id: createId("vol"), workId, position: (last?.position ?? 0) + 1, title: requiredString(args.title, "title").trim(), synopsis: optionalString(args.synopsis), createdAt: now, updatedAt: now }).returning();
      if (args.position !== undefined) await reorderVolumes(db, workId, created.id, boundedInteger(args.position, created.position, 1, 100000));
      await touchWork(db, workId, now);
      return { action, kind, item: (await volumeById(db, workId, created.id)) };
    }
    const id = requiredString(args.id, "id");
    const current = await volumeById(db, workId, id);
    if (!current) throw new Error("卷不存在");
    if (action === "delete") {
      requireDelete(args, current.title);
      const chapterRows = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.volumeId, id));
      await db.delete(volumes).where(and(eq(volumes.id, id), eq(volumes.workId, workId)));
      await normalizeVolumes(db, workId);
      await touchWork(db, workId, now);
      return { action, kind, deleted: { id, title: current.title, chaptersDeleted: chapterRows.length }, warning: "该卷及卷内全部章节正文已删除" };
    }
    const patch: Partial<typeof volumes.$inferInsert> = { updatedAt: now };
    if (args.title !== undefined) patch.title = requiredString(args.title, "title").trim();
    if (args.synopsis !== undefined) patch.synopsis = requiredString(args.synopsis, "synopsis", true).trim();
    if (Object.keys(patch).length === 1 && args.position === undefined) throw new Error("没有可更新的卷字段");
    if (Object.keys(patch).length > 1) await db.update(volumes).set(patch).where(and(eq(volumes.id, id), eq(volumes.workId, workId)));
    if (args.position !== undefined) await reorderVolumes(db, workId, id, boundedInteger(args.position, current.position, 1, 100000));
    await touchWork(db, workId, now);
    return { action, kind, item: await volumeById(db, workId, id) };
  }

  if (action === "create") {
    const volumeId = requiredString(args.volumeId, "volumeId");
    await assertVolume(db, workId, volumeId);
    const [last] = await db.select({ position: chapters.position }).from(chapters).where(eq(chapters.volumeId, volumeId)).orderBy(desc(chapters.position)).limit(1);
    const [created] = await db.insert(chapters).values({ id: createId("chp"), workId, volumeId, position: (last?.position ?? 0) + 1, title: requiredString(args.title, "title").trim(), outline: optionalString(args.outline), content: "", targetWords: boundedInteger(args.targetWords, 3000, 100, 30000), status: "outline", isPublished: false, revision: 1, createdAt: now, updatedAt: now }).returning();
    if (args.position !== undefined) await reorderChapters(db, workId, volumeId, created.id, boundedInteger(args.position, created.position, 1, 100000));
    await touchWork(db, workId, now);
    return { action, kind, item: await chapterById(db, workId, created.id) };
  }

  const id = requiredString(args.id, "id");
  const current = await chapterById(db, workId, id);
  if (!current) throw new Error("章节不存在");
  if (action === "delete") {
    requireDelete(args, current.title);
    await db.delete(chapters).where(and(eq(chapters.id, id), eq(chapters.workId, workId)));
    await normalizeChapters(db, workId, current.volumeId);
    await touchWork(db, workId, now);
    return { action, kind, deleted: { id, title: current.title }, warning: "该章节及其正文已删除" };
  }

  const expectedRevision = integer(args.expectedRevision, "expectedRevision");
  if (expectedRevision !== current.revision) throw new Error(`版本冲突：当前版本是 ${current.revision}，请重新读取大纲后再修改。`);
  const nextVolumeId = args.volumeId === undefined ? current.volumeId : requiredString(args.volumeId, "volumeId");
  if (nextVolumeId !== current.volumeId) await assertVolume(db, workId, nextVolumeId);
  const patch: Partial<typeof chapters.$inferInsert> = { revision: current.revision + 1, updatedAt: now };
  if (args.title !== undefined) patch.title = requiredString(args.title, "title").trim();
  if (args.outline !== undefined) patch.outline = requiredString(args.outline, "outline", true).trim();
  if (args.targetWords !== undefined) patch.targetWords = boundedInteger(args.targetWords, current.targetWords, 100, 30000);
  const moving = nextVolumeId !== current.volumeId;
  if (moving) {
    patch.volumeId = nextVolumeId;
    patch.position = -Math.max(1, Date.now());
  }
  if (Object.keys(patch).length === 2 && !moving && args.position === undefined) throw new Error("没有可更新的章节字段");
  const [updated] = await db.update(chapters).set(patch).where(and(eq(chapters.id, id), eq(chapters.workId, workId), eq(chapters.revision, expectedRevision))).returning();
  if (!updated) throw new Error("保存时出现版本冲突，请重新读取大纲。");
  if (moving) {
    await normalizeChapters(db, workId, current.volumeId);
    await reorderChapters(db, workId, nextVolumeId, id, boundedInteger(args.position, 100000, 1, 100000));
  } else if (args.position !== undefined) {
    await reorderChapters(db, workId, current.volumeId, id, boundedInteger(args.position, current.position, 1, 100000));
  }
  await touchWork(db, workId, now);
  return { action, kind, item: await chapterById(db, workId, id) };
}

async function manageContext(db: Db, workId: string, args: Record<string, unknown>) {
  const kind = enumString(args.kind, "kind", ["character", "relationship", "world", "timeline", "logic"]);
  const action = enumString(args.action, "action", ["create", "update", "delete"]);
  const now = new Date().toISOString();

  if (action === "delete") {
    if (args.confirmDelete !== true) throw new Error("删除需要 confirmDelete=true");
    const id = requiredString(args.id, "id");
    const deleted = await deleteContextItem(db, workId, kind, id);
    if (!deleted) throw new Error("条目不存在");
    if (kind === "timeline") await normalizeTimeline(db, workId);
    await touchWork(db, workId, now);
    return { action, kind, deleted };
  }

  if (kind === "character") {
    if (action === "create") {
      const [item] = await db.insert(characters).values({ id: createId("chr"), workId, name: requiredString(args.name, "name").trim(), role: optionalString(args.role), description: optionalString(args.description), personality: optionalString(args.personality), goal: optionalString(args.goal), createdAt: now, updatedAt: now }).returning();
      await touchWork(db, workId, now); return { action, kind, item };
    }
    const id = requiredString(args.id, "id"), patch: Partial<typeof characters.$inferInsert> = { updatedAt: now };
    if (args.name !== undefined) patch.name = requiredString(args.name, "name").trim();
    for (const field of ["role", "description", "personality", "goal"] as const) if (args[field] !== undefined) patch[field] = requiredString(args[field], field, true).trim();
    if (Object.keys(patch).length === 1) throw new Error("没有可更新的字段");
    const [item] = await db.update(characters).set(patch).where(and(eq(characters.id, id), eq(characters.workId, workId))).returning();
    if (!item) throw new Error("人物不存在");
    await touchWork(db, workId, now); return { action, kind, item };
  }

  if (kind === "relationship") {
    const id = action === "update" ? requiredString(args.id, "id") : "";
    const current = action === "update" ? await relationshipById(db, workId, id) : undefined;
    if (action === "update" && !current) throw new Error("人物关系不存在");
    const sourceCharacterId = args.sourceCharacterId === undefined ? current?.sourceCharacterId : requiredString(args.sourceCharacterId, "sourceCharacterId");
    const targetCharacterId = args.targetCharacterId === undefined ? current?.targetCharacterId : requiredString(args.targetCharacterId, "targetCharacterId");
    if (!sourceCharacterId || !targetCharacterId) throw new Error("sourceCharacterId 和 targetCharacterId 不能为空");
    await assertRelationshipCharacters(db, workId, sourceCharacterId, targetCharacterId);
    if (action === "create") {
      const [item] = await db.insert(characterRelationships).values({ id: createId("rel"), workId, sourceCharacterId, targetCharacterId, relationship: requiredString(args.relationship, "relationship").trim(), description: optionalString(args.description), createdAt: now, updatedAt: now }).returning();
      await touchWork(db, workId, now); return { action, kind, item };
    }
    const patch: Partial<typeof characterRelationships.$inferInsert> = { sourceCharacterId, targetCharacterId, updatedAt: now };
    if (args.relationship !== undefined) patch.relationship = requiredString(args.relationship, "relationship").trim();
    if (args.description !== undefined) patch.description = requiredString(args.description, "description", true).trim();
    if (args.relationship === undefined && args.description === undefined && args.sourceCharacterId === undefined && args.targetCharacterId === undefined) throw new Error("没有可更新的字段");
    const [item] = await db.update(characterRelationships).set(patch).where(and(eq(characterRelationships.id, id), eq(characterRelationships.workId, workId))).returning();
    if (!item) throw new Error("人物关系不存在");
    await touchWork(db, workId, now); return { action, kind, item };
  }

  if (kind === "world") {
    if (action === "create") {
      const [item] = await db.insert(worldEntries).values({ id: createId("wld"), workId, category: optionalString(args.category) || "背景", title: requiredString(args.title, "title").trim(), content: optionalString(args.content), isHardSetting: args.isHardSetting === true, createdAt: now, updatedAt: now }).returning();
      await touchWork(db, workId, now); return { action, kind, item };
    }
    const id = requiredString(args.id, "id"), patch: Partial<typeof worldEntries.$inferInsert> = { updatedAt: now };
    if (args.category !== undefined) patch.category = requiredString(args.category, "category").trim();
    if (args.title !== undefined) patch.title = requiredString(args.title, "title").trim();
    if (args.content !== undefined) patch.content = requiredString(args.content, "content", true).trim();
    if (args.isHardSetting !== undefined) patch.isHardSetting = Boolean(args.isHardSetting);
    if (Object.keys(patch).length === 1) throw new Error("没有可更新的字段");
    const [item] = await db.update(worldEntries).set(patch).where(and(eq(worldEntries.id, id), eq(worldEntries.workId, workId))).returning();
    if (!item) throw new Error("世界设定不存在");
    await touchWork(db, workId, now); return { action, kind, item };
  }

  if (kind === "timeline") {
    if (action === "create") {
      const [last] = await db.select({ position: timelineEvents.position }).from(timelineEvents).where(eq(timelineEvents.workId, workId)).orderBy(desc(timelineEvents.position)).limit(1);
      const [item] = await db.insert(timelineEvents).values({ id: createId("evt"), workId, position: (last?.position ?? 0) + 1, timeLabel: optionalString(args.timeLabel), title: requiredString(args.title, "title").trim(), content: optionalString(args.content), createdAt: now, updatedAt: now }).returning();
      if (args.position !== undefined) await reorderTimeline(db, workId, item.id, boundedInteger(args.position, item.position, 1, 100000));
      await touchWork(db, workId, now); return { action, kind, item: await timelineById(db, workId, item.id) };
    }
    const id = requiredString(args.id, "id"), current = await timelineById(db, workId, id); if (!current) throw new Error("时间线事件不存在");
    const patch: Partial<typeof timelineEvents.$inferInsert> = { updatedAt: now };
    if (args.timeLabel !== undefined) patch.timeLabel = requiredString(args.timeLabel, "timeLabel", true).trim();
    if (args.title !== undefined) patch.title = requiredString(args.title, "title").trim();
    if (args.content !== undefined) patch.content = requiredString(args.content, "content", true).trim();
    if (Object.keys(patch).length > 1) await db.update(timelineEvents).set(patch).where(and(eq(timelineEvents.id, id), eq(timelineEvents.workId, workId)));
    if (args.position !== undefined) await reorderTimeline(db, workId, id, boundedInteger(args.position, current.position, 1, 100000));
    if (Object.keys(patch).length === 1 && args.position === undefined) throw new Error("没有可更新的时间线字段");
    await touchWork(db, workId, now); return { action, kind, item: await timelineById(db, workId, id) };
  }

  if (action === "create") {
    const [item] = await db.insert(logicLinks).values({ id: createId("lnk"), workId, fromRef: requiredString(args.fromRef, "fromRef").trim(), relation: requiredString(args.relation, "relation").trim(), toRef: requiredString(args.toRef, "toRef").trim(), notes: optionalString(args.notes), status: optionalString(args.status) || "active", createdAt: now, updatedAt: now }).returning();
    await touchWork(db, workId, now); return { action, kind, item };
  }
  const id = requiredString(args.id, "id"), patch: Partial<typeof logicLinks.$inferInsert> = { updatedAt: now };
  for (const field of ["fromRef", "relation", "toRef"] as const) if (args[field] !== undefined) patch[field] = requiredString(args[field], field).trim();
  for (const field of ["notes", "status"] as const) if (args[field] !== undefined) patch[field] = requiredString(args[field], field, true).trim();
  if (Object.keys(patch).length === 1) throw new Error("没有可更新的字段");
  const [item] = await db.update(logicLinks).set(patch).where(and(eq(logicLinks.id, id), eq(logicLinks.workId, workId))).returning();
  if (!item) throw new Error("逻辑链不存在");
  await touchWork(db, workId, now); return { action, kind, item };
}

async function deleteContextItem(db: Db, workId: string, kind: string, id: string) {
  if (kind === "character") { const [item] = await db.delete(characters).where(and(eq(characters.id, id), eq(characters.workId, workId))).returning(); return item; }
  if (kind === "relationship") { const [item] = await db.delete(characterRelationships).where(and(eq(characterRelationships.id, id), eq(characterRelationships.workId, workId))).returning(); return item; }
  if (kind === "world") { const [item] = await db.delete(worldEntries).where(and(eq(worldEntries.id, id), eq(worldEntries.workId, workId))).returning(); return item; }
  if (kind === "timeline") { const [item] = await db.delete(timelineEvents).where(and(eq(timelineEvents.id, id), eq(timelineEvents.workId, workId))).returning(); return item; }
  const [item] = await db.delete(logicLinks).where(and(eq(logicLinks.id, id), eq(logicLinks.workId, workId))).returning(); return item;
}

async function assertRelationshipCharacters(db: Db, workId: string, source: string, target: string) {
  if (source === target) throw new Error("人物不能与自己建立关系");
  const [sourceRow, targetRow] = await Promise.all([
    db.select({ id: characters.id }).from(characters).where(and(eq(characters.id, source), eq(characters.workId, workId))).limit(1),
    db.select({ id: characters.id }).from(characters).where(and(eq(characters.id, target), eq(characters.workId, workId))).limit(1),
  ]);
  if (!sourceRow[0] || !targetRow[0]) throw new Error("关系两端的人物必须属于当前作品");
}

async function assertVolume(db: Db, workId: string, id: string) { if (!await volumeById(db, workId, id)) throw new Error("卷不存在"); }
async function volumeById(db: Db, workId: string, id: string) { const [item] = await db.select().from(volumes).where(and(eq(volumes.id, id), eq(volumes.workId, workId))).limit(1); return item; }
async function chapterById(db: Db, workId: string, id: string) { const [item] = await db.select().from(chapters).where(and(eq(chapters.id, id), eq(chapters.workId, workId))).limit(1); return item; }
async function timelineById(db: Db, workId: string, id: string) { const [item] = await db.select().from(timelineEvents).where(and(eq(timelineEvents.id, id), eq(timelineEvents.workId, workId))).limit(1); return item; }
async function relationshipById(db: Db, workId: string, id: string) { const [item] = await db.select().from(characterRelationships).where(and(eq(characterRelationships.id, id), eq(characterRelationships.workId, workId))).limit(1); return item; }

async function reorderVolumes(db: Db, workId: string, id: string, position: number) {
  const rows = await db.select({ id: volumes.id }).from(volumes).where(eq(volumes.workId, workId)).orderBy(asc(volumes.position));
  await assignVolumePositions(db, workId, placeId(rows.map((row) => row.id), id, position));
}
async function normalizeVolumes(db: Db, workId: string) { const rows = await db.select({ id: volumes.id }).from(volumes).where(eq(volumes.workId, workId)).orderBy(asc(volumes.position)); await assignVolumePositions(db, workId, rows.map((row) => row.id)); }
async function reorderChapters(db: Db, workId: string, volumeId: string, id: string, position: number) {
  const rows = await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.workId, workId), eq(chapters.volumeId, volumeId))).orderBy(asc(chapters.position));
  await assignChapterPositions(db, workId, placeId(rows.map((row) => row.id), id, position));
}
async function normalizeChapters(db: Db, workId: string, volumeId: string) { const rows = await db.select({ id: chapters.id }).from(chapters).where(and(eq(chapters.workId, workId), eq(chapters.volumeId, volumeId))).orderBy(asc(chapters.position)); await assignChapterPositions(db, workId, rows.map((row) => row.id)); }
async function reorderTimeline(db: Db, workId: string, id: string, position: number) { const rows = await db.select({ id: timelineEvents.id }).from(timelineEvents).where(eq(timelineEvents.workId, workId)).orderBy(asc(timelineEvents.position)); await assignTimelinePositions(db, workId, placeId(rows.map((row) => row.id), id, position)); }
async function normalizeTimeline(db: Db, workId: string) { const rows = await db.select({ id: timelineEvents.id }).from(timelineEvents).where(eq(timelineEvents.workId, workId)).orderBy(asc(timelineEvents.position)); await assignTimelinePositions(db, workId, rows.map((row) => row.id)); }

function placeId(ids: string[], id: string, position: number) { const ordered = ids.filter((value) => value !== id); ordered.splice(Math.min(Math.max(position - 1, 0), ordered.length), 0, id); return ordered; }
async function assignVolumePositions(db: Db, workId: string, ids: string[]) {
  for (let index = 0; index < ids.length; index += 1) await db.update(volumes).set({ position: -(index + 1) }).where(and(eq(volumes.id, ids[index]), eq(volumes.workId, workId)));
  for (let index = 0; index < ids.length; index += 1) await db.update(volumes).set({ position: index + 1 }).where(and(eq(volumes.id, ids[index]), eq(volumes.workId, workId)));
}
async function assignChapterPositions(db: Db, workId: string, ids: string[]) {
  for (let index = 0; index < ids.length; index += 1) await db.update(chapters).set({ position: -(index + 1) }).where(and(eq(chapters.id, ids[index]), eq(chapters.workId, workId)));
  for (let index = 0; index < ids.length; index += 1) await db.update(chapters).set({ position: index + 1 }).where(and(eq(chapters.id, ids[index]), eq(chapters.workId, workId)));
}
async function assignTimelinePositions(db: Db, workId: string, ids: string[]) {
  for (let index = 0; index < ids.length; index += 1) await db.update(timelineEvents).set({ position: -(index + 1) }).where(and(eq(timelineEvents.id, ids[index]), eq(timelineEvents.workId, workId)));
  for (let index = 0; index < ids.length; index += 1) await db.update(timelineEvents).set({ position: index + 1 }).where(and(eq(timelineEvents.id, ids[index]), eq(timelineEvents.workId, workId)));
}

async function touchWork(db: Db, workId: string, updatedAt = new Date().toISOString()) { await db.update(works).set({ updatedAt }).where(eq(works.id, workId)); }
function requireDelete(args: Record<string, unknown>, title: string) { if (args.confirmDelete !== true) throw new Error("删除需要 confirmDelete=true"); if (args.confirmTitle !== title) throw new Error("confirmTitle 必须与当前标题完全一致"); }
function requiredString(value: unknown, label: string, allowEmpty = false) { if (typeof value !== "string" || (!allowEmpty && !value.trim())) throw new Error(`${label} 必须是字符串`); return value; }
function optionalString(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function integer(value: unknown, label: string) { const result = Number(value); if (!Number.isInteger(result)) throw new Error(`${label} 必须是整数`); return result; }
function boundedInteger(value: unknown, fallback: number, min: number, max: number) { if (value === undefined) return fallback; return Math.min(max, Math.max(min, integer(value, "数值"))); }
function enumString(value: unknown, label: string, allowed: string[]) { const result = requiredString(value, label); if (!allowed.includes(result)) throw new Error(`${label} 必须是 ${allowed.join(" / ")}`); return result; }
function rpcResult(id: Rpc["id"], result: unknown) { return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers }); }
function rpcError(id: Rpc["id"], code: number, message: string) { return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32700 ? 400 : 200, headers }); }
