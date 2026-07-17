import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public landing page explains the product and its model boundary", async () => {
  const [page, footer, about] = await Promise.all([read("app/page.tsx"), read("app/ui.tsx"), read("app/about/page.tsx")]);
  assert.match(page, /把散落的灵感/);
  assert.match(page, /使用 ChatGPT 登录/);
  assert.match(footer, /不提供或转售任何 AI 模型服务/);
  assert.match(about, /内容责任/);
  assert.match(about, /不作保证/);
});

test("MCP remains draft-only and uses optimistic chapter revisions", async () => {
  const mcp = await read("app/api/mcp/route.ts");
  assert.match(mcp, /story_get_context/);
  assert.match(mcp, /story_save_chapter/);
  assert.match(mcp, /expectedRevision/);
  assert.match(mcp, /不能发布章节/);
  assert.doesNotMatch(mcp, /isPublished:\s*true/);
});

test("structured data has ownership and private-by-default fields", async () => {
  const schema = await read("db/schema.ts");
  assert.match(schema, /ownerEmail/);
  assert.match(schema, /isPublished[^\n]+default\(false\)/);
  assert.match(schema, /tokenHash/);
  assert.match(schema, /isHardSetting/);
});
