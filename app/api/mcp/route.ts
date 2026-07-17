import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chapters, volumes, works } from "@/db/schema";
import { ownerFromBearer, ownedWork } from "@/lib/authz";
import { getWorkBundle } from "@/lib/queries";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type, mcp-protocol-version" };
const tools = [
  { name: "story_list_works", description: "列出当前作者的全部作品及发布状态。", inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "story_list_outline", description: "读取一部作品的卷、章、大纲、字数目标和章节版本号。", inputSchema: { type: "object", properties: { workId: { type: "string" } }, required: ["workId"], additionalProperties: false } },
  { name: "story_get_context", description: "读取作品基石、人物关系、世界观、时间线和逻辑链，用于保持创作连续性。", inputSchema: { type: "object", properties: { workId: { type: "string" } }, required: ["workId"], additionalProperties: false } },
  { name: "story_get_chapter", description: "读取单章标题、大纲、正文和版本号。", inputSchema: { type: "object", properties: { workId: { type: "string" }, chapterId: { type: "string" } }, required: ["workId", "chapterId"], additionalProperties: false } },
  { name: "story_save_chapter", description: "保存章节草稿。必须提供刚读取的 expectedRevision；若网页端已更新，工具会拒绝覆盖。不能发布章节。", inputSchema: { type: "object", properties: { workId: { type: "string" }, chapterId: { type: "string" }, content: { type: "string" }, title: { type: "string" }, outline: { type: "string" }, expectedRevision: { type: "integer" } }, required: ["workId", "chapterId", "content", "expectedRevision"], additionalProperties: false } },
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
  if (rpc.method === "initialize") return rpcResult(rpc.id, { protocolVersion: request.headers.get("mcp-protocol-version") || "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "story-studio-cloud", version: "0.1.0" }, instructions: "读取作品上下文并保存私人草稿。不得声称已发布内容。" });
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
  const workId = requiredString(args.workId, "workId");
  const work = await ownedWork(workId, owner); if (!work) throw new Error("作品不存在或无权访问");
  if (name === "story_list_outline") {
    const [volumeRows, chapterRows] = await Promise.all([db.select().from(volumes).where(eq(volumes.workId, workId)).orderBy(asc(volumes.position)), db.select({ id: chapters.id, volumeId: chapters.volumeId, position: chapters.position, title: chapters.title, outline: chapters.outline, targetWords: chapters.targetWords, status: chapters.status, revision: chapters.revision, updatedAt: chapters.updatedAt }).from(chapters).where(eq(chapters.workId, workId)).orderBy(asc(chapters.position))]);
    return { work: { id: work.id, title: work.title, language: work.language }, volumes: volumeRows.map((volume) => ({ ...volume, chapters: chapterRows.filter((chapter) => chapter.volumeId === volume.id) })) };
  }
  if (name === "story_get_context") { const bundle = await getWorkBundle(workId); return { work: { id: work.id, title: work.title, description: work.description, genre: work.genre, language: work.language, premise: work.premise, styleGuide: work.styleGuide, referenceExcerpt: work.referenceExcerpt }, characters: bundle.characters, relationships: bundle.relationships, world: bundle.world, timeline: bundle.timeline, logicLinks: bundle.logicLinks }; }
  const chapterId = requiredString(args.chapterId, "chapterId");
  const [chapter] = await db.select().from(chapters).where(and(eq(chapters.id, chapterId), eq(chapters.workId, workId))).limit(1); if (!chapter) throw new Error("章节不存在");
  if (name === "story_get_chapter") return { chapter };
  if (name === "story_save_chapter") {
    const expectedRevision = Number(args.expectedRevision); if (!Number.isInteger(expectedRevision)) throw new Error("expectedRevision 必须是整数");
    if (chapter.revision !== expectedRevision) throw new Error(`版本冲突：当前版本是 ${chapter.revision}，请重新读取后再保存。`);
    const patch: { content: string; title?: string; outline?: string; status: string; revision: number; updatedAt: string } = { content: requiredString(args.content, "content", true), status: "draft", revision: chapter.revision + 1, updatedAt: new Date().toISOString() };
    if (typeof args.title === "string") patch.title = args.title;
    if (typeof args.outline === "string") patch.outline = args.outline;
    const [saved] = await db.update(chapters).set(patch).where(and(eq(chapters.id, chapterId), eq(chapters.workId, workId), eq(chapters.revision, expectedRevision))).returning();
    if (!saved) throw new Error("保存时出现版本冲突，请重新读取。 ");
    await db.update(works).set({ updatedAt: new Date().toISOString() }).where(eq(works.id, workId));
    return { saved: true, chapter: { id: saved.id, title: saved.title, revision: saved.revision, updatedAt: saved.updatedAt } };
  }
  throw new Error(`未知工具：${name}`);
}

function requiredString(value: unknown, label: string, allowEmpty = false) { if (typeof value !== "string" || (!allowEmpty && !value.trim())) throw new Error(`${label} 必须是字符串`); return value; }
function rpcResult(id: Rpc["id"], result: unknown) { return Response.json({ jsonrpc: "2.0", id: id ?? null, result }, { headers }); }
function rpcError(id: Rpc["id"], code: number, message: string) { return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32700 ? 400 : 200, headers }); }
