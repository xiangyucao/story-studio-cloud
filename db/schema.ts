import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const works = sqliteTable("works", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  genre: text("genre").notNull().default("未分类"),
  language: text("language").notNull().default("zh-CN"),
  premise: text("premise").notNull().default(""),
  styleGuide: text("style_guide").notNull().default(""),
  referenceExcerpt: text("reference_excerpt").notNull().default(""),
  coverKey: text("cover_key"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [
  uniqueIndex("works_slug_unique").on(table.slug),
  index("works_owner_updated_idx").on(table.ownerEmail, table.updatedAt),
  index("works_published_updated_idx").on(table.isPublished, table.updatedAt),
]);

export const volumes = sqliteTable("volumes", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull().default(""),
  ...timestamps,
}, (table) => [
  uniqueIndex("volumes_work_position_unique").on(table.workId, table.position),
  index("volumes_work_idx").on(table.workId),
]);

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  volumeId: text("volume_id").notNull().references(() => volumes.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  outline: text("outline").notNull().default(""),
  content: text("content").notNull().default(""),
  targetWords: integer("target_words").notNull().default(3000),
  status: text("status").notNull().default("outline"),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  revision: integer("revision").notNull().default(1),
  ...timestamps,
}, (table) => [
  uniqueIndex("chapters_volume_position_unique").on(table.volumeId, table.position),
  index("chapters_work_idx").on(table.workId),
]);

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  description: text("description").notNull().default(""),
  personality: text("personality").notNull().default(""),
  goal: text("goal").notNull().default(""),
  ...timestamps,
}, (table) => [index("characters_work_idx").on(table.workId)]);

export const characterRelationships = sqliteTable("character_relationships", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  sourceCharacterId: text("source_character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  targetCharacterId: text("target_character_id").notNull().references(() => characters.id, { onDelete: "cascade" }),
  relationship: text("relationship").notNull(),
  description: text("description").notNull().default(""),
  ...timestamps,
}, (table) => [index("relationships_work_idx").on(table.workId)]);

export const worldEntries = sqliteTable("world_entries", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("背景"),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  isHardSetting: integer("is_hard_setting", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [index("world_entries_work_idx").on(table.workId)]);

export const timelineEvents = sqliteTable("timeline_events", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  timeLabel: text("time_label").notNull().default(""),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  ...timestamps,
}, (table) => [index("timeline_work_idx").on(table.workId)]);

export const logicLinks = sqliteTable("logic_links", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => works.id, { onDelete: "cascade" }),
  fromRef: text("from_ref").notNull(),
  relation: text("relation").notNull(),
  toRef: text("to_ref").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("active"),
  ...timestamps,
}, (table) => [index("logic_links_work_idx").on(table.workId)]);

export const apiTokens = sqliteTable("api_tokens", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  name: text("name").notNull(),
  tokenPrefix: text("token_prefix").notNull(),
  tokenHash: text("token_hash").notNull(),
  lastUsedAt: text("last_used_at"),
  revokedAt: text("revoked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("api_tokens_hash_unique").on(table.tokenHash),
  index("api_tokens_owner_idx").on(table.ownerEmail),
]);
