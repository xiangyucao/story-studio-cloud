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

test("story memory JSON is portable, previewed, and explicitly applied", async () => {
  const [route, workbench] = await Promise.all([
    read("app/api/works/[id]/context-json/route.ts"),
    read("app/studio/works/[id]/workbench.tsx"),
  ]);
  assert.match(route, /source: names\.get/);
  assert.match(route, /target: names\.get/);
  assert.match(route, /logicChains/);
  assert.match(route, /mode === "preview"/);
  assert.match(route, /confirmReplace !== true/);
  assert.match(route, /expectedUpdatedAt !== auth\.work\.updatedAt/);
  assert.match(route, /db\.batch/);
  assert.match(workbench, /memory\.jsonImport/);
  assert.match(workbench, /memory\.jsonExport/);
  assert.match(workbench, /memoryJsonExample/);
});

test("book export offers Word, print/PDF, Markdown, backup, and reader-facing options", async () => {
  const [route, helper, workbench, printPage, printActions] = await Promise.all([
    read("app/api/works/[id]/export/route.ts"),
    read("lib/book-export.ts"),
    read("app/studio/works/[id]/workbench.tsx"),
    read("app/studio/works/[id]/print/page.tsx"),
    read("app/studio/works/[id]/print/print-actions.tsx"),
  ]);
  assert.match(route, /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/);
  assert.match(route, /safeExportName/);
  assert.match(helper, /InternalHyperlink/);
  assert.match(helper, /stripLeadingChapterHeading/);
  assert.match(workbench, /exportIncludeToc/);
  assert.match(workbench, /exportIncludeVolumeSynopses/);
  assert.match(workbench, /format === "print"/);
  assert.match(workbench, /backup/);
  assert.match(printPage, /PrintActions/);
  assert.match(printActions, /window\.print/);
});

test("Amazon recommendations are contextual, disclosed, and use the configured associate tag", async () => {
  const [component, home, studio, workbench, footer, about, i18n] = await Promise.all([
    read("app/amazon-recommendations.tsx"),
    read("app/page.tsx"),
    read("app/studio/studio-home.tsx"),
    read("app/studio/works/[id]/workbench.tsx"),
    read("app/ui.tsx"),
    read("app/about/page.tsx"),
    read("lib/i18n.ts"),
  ]);
  assert.match(component, /storystudio00-20/);
  assert.match(component, /rel="sponsored noreferrer"/);
  assert.match(component, /affiliate\.paidLink/);
  assert.match(component, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(home, /AmazonRecommendations/);
  assert.match(studio, /AmazonRecommendations compact/);
  assert.match(workbench, /AmazonWorkbenchRecommendation/);
  assert.match(component, /id=\{compact \? "studio-writers-shelf" : "writers-shelf"\}/);
  assert.match(footer, /href="\/#writers-shelf"/);
  assert.match(footer, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(about, /affiliate\.aboutTitle/);
  assert.match(i18n, /affiliate\.craft/);
  assert.match(i18n, /Paid links/);
});
