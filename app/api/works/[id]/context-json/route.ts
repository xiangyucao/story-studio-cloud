import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { characters, characterRelationships, logicLinks, timelineEvents, worldEntries, works } from "@/db/schema";
import { ownedWork } from "@/lib/authz";
import { createId } from "@/lib/ids";
import { getWorkBundle } from "@/lib/queries";

type CharacterJson = { name: string; role: string; description: string; personality: string; goal: string };
type RelationshipJson = { source: string; target: string; relationship: string; description: string };
type WorldJson = { category: string; title: string; content: string; isHardSetting: boolean };
type TimelineJson = { position: number; timeLabel: string; title: string; content: string };
type LogicJson = { fromRef: string; relation: string; toRef: string; notes: string; status: string };
type MemoryJson = {
  characters?: CharacterJson[];
  relationships?: RelationshipJson[];
  world?: WorldJson[];
  timeline?: TimelineJson[];
  logicChains?: LogicJson[];
};
type Category = keyof MemoryJson;
type Bundle = Awaited<ReturnType<typeof getWorkBundle>>;
type PreviewItem = { category: Category; label: string; change: "added" | "updated" | "unchanged" | "deleted" };

async function authorize(id: string) {
  const user = await getChatGPTUser();
  if (!user) return { error: Response.json({ error: "需要登录" }, { status: 401 }) };
  const work = await ownedWork(id, user.email);
  if (!work) return { error: Response.json({ error: "作品不存在" }, { status: 404 }) };
  return { work };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  const bundle = await getWorkBundle(id);
  const data = portableBundle(bundle);
  const filename = `${safeFilename(auth.work.title)}-story-memory.json`;
  return Response.json({ schemaVersion: 1, work: { title: auth.work.title, language: auth.work.language }, ...data }, {
    headers: { "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  try {
    const body = await request.json() as { mode?: string; data?: unknown; expectedUpdatedAt?: string; confirmReplace?: boolean };
    const input = parseMemoryJson(body.data);
    const bundle = await getWorkBundle(id);
    const preview = buildPreview(bundle, input);
    if (body.mode === "preview") return Response.json({ expectedUpdatedAt: auth.work.updatedAt, ...preview });
    if (body.mode !== "apply") return Response.json({ error: "mode 必须是 preview 或 apply" }, { status: 400 });
    if (body.confirmReplace !== true) return Response.json({ error: "需要确认全量替换" }, { status: 400 });
    if (body.expectedUpdatedAt !== auth.work.updatedAt) return Response.json({ error: "作品在预览后已经改变，请重新预览" }, { status: 409 });
    await applyImport(id, bundle, input);
    const [updatedWork] = await getDb().select({ updatedAt: works.updatedAt }).from(works).where(eq(works.id, id)).limit(1);
    return Response.json({ applied: true, bundle: await getWorkBundle(id), updatedAt: updatedWork.updatedAt, ...preview });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "JSON 导入失败" }, { status: 400 });
  }
}

function parseMemoryJson(raw: unknown): MemoryJson {
  let value = raw;
  if (typeof value === "string") {
    const text = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    if (!text) throw new Error("请粘贴 JSON 或选择 JSON 文件");
    try { value = JSON.parse(text); } catch { throw new Error("JSON 格式无效，请检查逗号、引号和括号"); }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("顶层必须是 JSON 对象");
  const source = value as Record<string, unknown>;
  const result: MemoryJson = {};
  if (Object.hasOwn(source, "characters")) result.characters = parseArray(source.characters, "characters", 5000, parseCharacter);
  if (Object.hasOwn(source, "relationships")) result.relationships = parseArray(source.relationships, "relationships", 10000, parseRelationship);
  if (Object.hasOwn(source, "world")) result.world = parseArray(source.world, "world", 5000, parseWorld);
  if (Object.hasOwn(source, "timeline")) result.timeline = parseArray(source.timeline, "timeline", 10000, parseTimeline).sort((a, b) => a.position - b.position);
  if (Object.hasOwn(source, "logicChains")) result.logicChains = parseArray(source.logicChains, "logicChains", 10000, parseLogic);
  if (!Object.keys(result).length) throw new Error("JSON 至少需要 characters、relationships、world、timeline 或 logicChains 中的一个数组");
  assertUnique(result.characters, characterKey, "人物姓名");
  assertUnique(result.relationships, relationshipKey, "人物关系");
  assertUnique(result.world, worldKey, "世界观名称");
  assertUnique(result.timeline, timelineKey, "时间线顺序");
  assertUnique(result.logicChains, logicKey, "逻辑链");
  return result;
}

function parseCharacter(value: unknown, index: number): CharacterJson { const row = record(value, "characters", index); return { name: required(row.name, `characters[${index}].name`), role: optional(row.role), description: optional(row.description), personality: optional(row.personality), goal: optional(row.goal) }; }
function parseRelationship(value: unknown, index: number): RelationshipJson { const row = record(value, "relationships", index); const source = required(row.source, `relationships[${index}].source`), target = required(row.target, `relationships[${index}].target`); if (norm(source) === norm(target)) throw new Error(`relationships[${index}] 不能连接同一个人物`); return { source, target, relationship: required(row.relationship, `relationships[${index}].relationship`), description: optional(row.description) }; }
function parseWorld(value: unknown, index: number): WorldJson { const row = record(value, "world", index); return { category: optional(row.category) || "背景", title: required(row.title, `world[${index}].title`), content: optional(row.content), isHardSetting: row.isHardSetting === true }; }
function parseTimeline(value: unknown, index: number): TimelineJson { const row = record(value, "timeline", index); const position = Number(row.position); if (!Number.isInteger(position) || position < 1) throw new Error(`timeline[${index}].position 必须是大于 0 的整数`); return { position, timeLabel: optional(row.timeLabel), title: required(row.title, `timeline[${index}].title`), content: optional(row.content) }; }
function parseLogic(value: unknown, index: number): LogicJson { const row = record(value, "logicChains", index); return { fromRef: required(row.fromRef, `logicChains[${index}].fromRef`), relation: required(row.relation, `logicChains[${index}].relation`), toRef: required(row.toRef, `logicChains[${index}].toRef`), notes: optional(row.notes), status: optional(row.status) || "active" }; }

function portableBundle(bundle: Bundle) {
  const names = new Map(bundle.characters.map((item) => [item.id, item.name]));
  return {
    characters: bundle.characters.map(({ name, role, description, personality, goal }) => ({ name, role, description, personality, goal })),
    relationships: bundle.relationships.map((item) => ({ source: names.get(item.sourceCharacterId) || item.sourceCharacterId, target: names.get(item.targetCharacterId) || item.targetCharacterId, relationship: item.relationship, description: item.description })),
    world: bundle.world.map(({ category, title, content, isHardSetting }) => ({ category, title, content, isHardSetting })),
    timeline: bundle.timeline.map(({ position, timeLabel, title, content }) => ({ position, timeLabel, title, content })),
    logicChains: bundle.logicLinks.map(({ fromRef, relation, toRef, notes, status }) => ({ fromRef, relation, toRef, notes, status })),
  };
}

function buildPreview(bundle: Bundle, input: MemoryJson) {
  const current = portableBundle(bundle);
  const items: PreviewItem[] = [];
  if (input.characters) items.push(...diffCategory("characters", current.characters, input.characters, characterKey, (item) => item.name));
  if (input.relationships) {
    items.push(...diffCategory("relationships", current.relationships, input.relationships, relationshipKey, relationshipLabel));
  } else if (input.characters) {
    const remainingNames = new Set(input.characters.map((item) => norm(item.name)));
    const surviving = current.relationships.filter((item) => remainingNames.has(norm(item.source)) && remainingNames.has(norm(item.target)));
    items.push(...diffCategory("relationships", current.relationships, surviving, relationshipKey, relationshipLabel));
  }
  if (input.world) items.push(...diffCategory("world", current.world, input.world, worldKey, (item) => `${item.category} · ${item.title}`));
  if (input.timeline) items.push(...diffCategory("timeline", current.timeline, input.timeline, timelineKey, (item) => `${item.position}. ${item.title}`));
  if (input.logicChains) items.push(...diffCategory("logicChains", current.logicChains, input.logicChains, logicKey, (item) => `${item.fromRef} → ${item.toRef}`));
  const categories = Object.keys(input) as Category[];
  if (items.some((item) => item.category === "relationships") && !categories.includes("relationships")) categories.push("relationships");
  const summary = categories.map((category) => ({
    category,
    added: items.filter((item) => item.category === category && item.change === "added").length,
    updated: items.filter((item) => item.category === category && item.change === "updated").length,
    unchanged: items.filter((item) => item.category === category && item.change === "unchanged").length,
    deleted: items.filter((item) => item.category === category && item.change === "deleted").length,
  }));
  return { provided: Object.keys(input), summary, items: items.slice(0, 250), totalItems: items.length, truncated: items.length > 250 };
}

function diffCategory<T>(category: Category, before: T[], after: T[], key: (item: T) => string, label: (item: T) => string) {
  const oldMap = new Map(before.map((item) => [key(item), item]));
  const newMap = new Map(after.map((item) => [key(item), item]));
  const result: PreviewItem[] = [];
  for (const [itemKey, item] of newMap) result.push({ category, label: label(item), change: !oldMap.has(itemKey) ? "added" : same(oldMap.get(itemKey), item) ? "unchanged" : "updated" });
  for (const [itemKey, item] of oldMap) if (!newMap.has(itemKey)) result.push({ category, label: label(item), change: "deleted" });
  return result;
}

async function applyImport(workId: string, bundle: Bundle, input: MemoryJson) {
  const db = getDb();
  const now = new Date().toISOString();
  const beforeCharacterOps: BatchItem<"sqlite">[] = [];
  const relationshipOps: BatchItem<"sqlite">[] = [];
  const characterDeleteOps: BatchItem<"sqlite">[] = [];
  const otherOps: BatchItem<"sqlite">[] = [];
  const oldCharacters = new Map(bundle.characters.map((item) => [characterKey(item), item]));
  const finalCharacterIds = new Map(bundle.characters.map((item) => [norm(item.name), item.id]));

  if (input.characters) {
    finalCharacterIds.clear();
    const nextKeys = new Set(input.characters.map(characterKey));
    for (const item of input.characters) {
      const key = characterKey(item), old = oldCharacters.get(key), id = old?.id || createId("chr");
      finalCharacterIds.set(norm(item.name), id);
      if (!old) beforeCharacterOps.push(db.insert(characters).values({ id, workId, ...item, createdAt: now, updatedAt: now }));
      else if (!same(portableCharacter(old), item)) beforeCharacterOps.push(db.update(characters).set({ ...item, updatedAt: now }).where(and(eq(characters.id, old.id), eq(characters.workId, workId))));
    }
    for (const [key, old] of oldCharacters) if (!nextKeys.has(key)) characterDeleteOps.push(db.delete(characters).where(and(eq(characters.id, old.id), eq(characters.workId, workId))));
  }

  if (input.relationships) {
    for (const item of input.relationships) if (!finalCharacterIds.has(norm(item.source)) || !finalCharacterIds.has(norm(item.target))) throw new Error(`关系“${relationshipLabel(item)}”引用了不存在的人物`);
    const currentPortable = portableBundle(bundle).relationships;
    const oldByKey = new Map(currentPortable.map((item, index) => [relationshipKey(item), { row: bundle.relationships[index], item }]));
    const nextKeys = new Set(input.relationships.map(relationshipKey));
    for (const item of input.relationships) {
      const old = oldByKey.get(relationshipKey(item));
      const values = { sourceCharacterId: finalCharacterIds.get(norm(item.source))!, targetCharacterId: finalCharacterIds.get(norm(item.target))!, relationship: item.relationship, description: item.description };
      if (!old) relationshipOps.push(db.insert(characterRelationships).values({ id: createId("rel"), workId, ...values, createdAt: now, updatedAt: now }));
      else if (!same(old.item, item) || old.row.sourceCharacterId !== values.sourceCharacterId || old.row.targetCharacterId !== values.targetCharacterId) relationshipOps.push(db.update(characterRelationships).set({ ...values, updatedAt: now }).where(and(eq(characterRelationships.id, old.row.id), eq(characterRelationships.workId, workId))));
    }
    for (const [key, old] of oldByKey) if (!nextKeys.has(key)) relationshipOps.unshift(db.delete(characterRelationships).where(and(eq(characterRelationships.id, old.row.id), eq(characterRelationships.workId, workId))));
  }

  if (input.world) {
    const oldByKey = new Map(bundle.world.map((item) => [worldKey(item), item])), nextKeys = new Set(input.world.map(worldKey));
    for (const item of input.world) { const old = oldByKey.get(worldKey(item)); if (!old) otherOps.push(db.insert(worldEntries).values({ id: createId("wld"), workId, ...item, createdAt: now, updatedAt: now })); else if (!same(portableWorld(old), item)) otherOps.push(db.update(worldEntries).set({ ...item, updatedAt: now }).where(and(eq(worldEntries.id, old.id), eq(worldEntries.workId, workId)))); }
    for (const [key, old] of oldByKey) if (!nextKeys.has(key)) otherOps.push(db.delete(worldEntries).where(and(eq(worldEntries.id, old.id), eq(worldEntries.workId, workId))));
  }
  if (input.timeline) {
    const oldByKey = new Map(bundle.timeline.map((item) => [timelineKey(item), item])), nextKeys = new Set(input.timeline.map(timelineKey));
    for (const item of input.timeline) { const old = oldByKey.get(timelineKey(item)); if (!old) otherOps.push(db.insert(timelineEvents).values({ id: createId("evt"), workId, ...item, createdAt: now, updatedAt: now })); else if (!same(portableTimeline(old), item)) otherOps.push(db.update(timelineEvents).set({ ...item, updatedAt: now }).where(and(eq(timelineEvents.id, old.id), eq(timelineEvents.workId, workId)))); }
    for (const [key, old] of oldByKey) if (!nextKeys.has(key)) otherOps.push(db.delete(timelineEvents).where(and(eq(timelineEvents.id, old.id), eq(timelineEvents.workId, workId))));
  }
  if (input.logicChains) {
    const oldByKey = new Map(bundle.logicLinks.map((item) => [logicKey(item), item])), nextKeys = new Set(input.logicChains.map(logicKey));
    for (const item of input.logicChains) { const old = oldByKey.get(logicKey(item)); if (!old) otherOps.push(db.insert(logicLinks).values({ id: createId("lnk"), workId, ...item, createdAt: now, updatedAt: now })); else if (!same(portableLogic(old), item)) otherOps.push(db.update(logicLinks).set({ ...item, updatedAt: now }).where(and(eq(logicLinks.id, old.id), eq(logicLinks.workId, workId)))); }
    for (const [key, old] of oldByKey) if (!nextKeys.has(key)) otherOps.push(db.delete(logicLinks).where(and(eq(logicLinks.id, old.id), eq(logicLinks.workId, workId))));
  }

  const operations = [...beforeCharacterOps, ...relationshipOps, ...characterDeleteOps, ...otherOps];
  if (!operations.length) return;
  operations.push(db.update(works).set({ updatedAt: now }).where(eq(works.id, workId)));
  await db.batch(operations as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}

function portableCharacter(item: Bundle["characters"][number]): CharacterJson { return { name: item.name, role: item.role, description: item.description, personality: item.personality, goal: item.goal }; }
function portableWorld(item: Bundle["world"][number]): WorldJson { return { category: item.category, title: item.title, content: item.content, isHardSetting: item.isHardSetting }; }
function portableTimeline(item: Bundle["timeline"][number]): TimelineJson { return { position: item.position, timeLabel: item.timeLabel, title: item.title, content: item.content }; }
function portableLogic(item: Bundle["logicLinks"][number]): LogicJson { return { fromRef: item.fromRef, relation: item.relation, toRef: item.toRef, notes: item.notes, status: item.status }; }
function characterKey(item: { name: string }) { return norm(item.name); }
function relationshipKey(item: { source: string; target: string; relationship: string }) { return `${norm(item.source)}\u0000${norm(item.target)}\u0000${norm(item.relationship)}`; }
function worldKey(item: { category: string; title: string }) { return `${norm(item.category)}\u0000${norm(item.title)}`; }
function timelineKey(item: { position: number }) { return String(item.position); }
function logicKey(item: { fromRef: string; relation: string; toRef: string }) { return `${norm(item.fromRef)}\u0000${norm(item.relation)}\u0000${norm(item.toRef)}`; }
function relationshipLabel(item: RelationshipJson) { return `${item.source} → ${item.target} · ${item.relationship}`; }
function norm(value: string) { return value.trim().toLocaleLowerCase(); }
function same(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }
function safeFilename(value: string) { return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim() || "story"; }
function record(value: unknown, label: string, index: number) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}[${index}] 必须是对象`); return value as Record<string, unknown>; }
function required(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 不能为空`); return value.trim(); }
function optional(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function parseArray<T>(value: unknown, label: string, max: number, parser: (item: unknown, index: number) => T) { if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`); if (value.length > max) throw new Error(`${label} 最多允许 ${max} 条`); return value.map(parser); }
function assertUnique<T>(items: T[] | undefined, key: (item: T) => string, label: string) { if (!items) return; const seen = new Set<string>(); for (const item of items) { const value = key(item); if (seen.has(value)) throw new Error(`${label}存在重复项`); seen.add(value); } }
