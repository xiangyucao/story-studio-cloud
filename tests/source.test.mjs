import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public landing page explains the product and its model boundary", async () => {
  const [page, footer, about, i18n, layout, provider, readme] = await Promise.all([read("app/page.tsx"), read("app/ui.tsx"), read("app/about/page.tsx"), read("lib/i18n.ts"), read("app/layout.tsx"), read("app/language-provider.tsx"), read("README.md")]);
  assert.match(page, /home\.headline/);
  assert.match(page, /home\.chatgpt/);
  assert.match(footer, /footer\.boundary/);
  assert.match(about, /about\.contentTitle/);
  assert.match(about, /about\.warrantyTitle/);
  assert.match(i18n, /defaultLocale: UiLocale = "en"/);
  assert.match(i18n, /Turn scattered ideas/);
  assert.match(i18n, /"zh-CN"/);
  assert.match(i18n, /"ja"/);
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(provider, /ui_locale=/);
  assert.match(provider, /localStorage\.setItem\("story-studio-ui-locale"/);
  assert.match(footer, /github\.com\/xiangyucao\/story-studio/);
  assert.match(about, /story-studio-cloud\/issues/);
  assert.match(about, /story-studio-cloud\/discussions/);
  assert.match(about, /security\/advisories\/new/);
  assert.match(readme, /^# Story Studio Cloud/m);
  assert.match(readme, /original \[Story Studio desktop edition\]/);
});

test("MCP remains draft-only and uses optimistic chapter revisions", async () => {
  const mcp = await read("app/api/mcp/route.ts");
  assert.match(mcp, /story_get_context/);
  assert.match(mcp, /story_create_work/);
  assert.match(mcp, /story_update_work/);
  assert.match(mcp, /story_manage_outline/);
  assert.match(mcp, /story_manage_context/);
  assert.match(mcp, /story_save_chapter/);
  assert.match(mcp, /expectedRevision/);
  assert.match(mcp, /confirmDelete/);
  assert.match(mcp, /confirmTitle/);
  assert.match(mcp, /不能发布章节/);
  assert.doesNotMatch(mcp, /isPublished:\s*true/);
  assert.match(mcp, /isPublished:\s*false/);
  assert.doesNotMatch(mcp, /delete\(works\)/);
});

test("structured data has ownership and private-by-default fields", async () => {
  const [schema, studio, workPage, studioCss] = await Promise.all([
    read("db/schema.ts"),
    read("app/studio/page.tsx"),
    read("app/studio/works/[id]/page.tsx"),
    read("app/studio/studio.css"),
  ]);
  assert.match(schema, /ownerEmail/);
  assert.match(schema, /isPublished[^\n]+default\(false\)/);
  assert.match(schema, /tokenHash/);
  assert.match(schema, /isHardSetting/);
  assert.match(studio, /where\(eq\(works\.ownerEmail, user\.email\)\)/);
  assert.match(studio, /inArray\(chapters\.workId/);
  assert.match(workPage, /eq\(works\.ownerEmail, user\.email\)/);
  assert.match(studioCss, /Comfortable typography for high-resolution displays/);
  assert.match(studioCss, /\.manuscript-editor \{ font-size: 19px/);
});
