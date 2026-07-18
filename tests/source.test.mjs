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

test("About page and shared footer contain no hard-coded English disclosure", async () => {
  const [about, ui] = await Promise.all([read("app/about/page.tsx"), read("app/ui.tsx")]);
  assert.match(about, /affiliate\.amazonAssociate/);
  assert.match(about, /generateMetadata/);
  assert.match(ui, /footer\.made/);
  assert.match(ui, /nav\.primary/);
  assert.doesNotMatch(about, />As an Amazon Associate/);
  assert.doesNotMatch(ui, />As an Amazon Associate/);
});

test("MCP remains draft-only and uses optimistic chapter revisions", async () => {
  const mcp = await read("app/api/mcp/route.ts");
  assert.match(mcp, /story_get_context/);
  assert.match(mcp, /story_build_chapter_prompt/);
  assert.match(mcp, /includesCurrentDraft/);
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

test("new MCP tokens offer a one-click English Codex setup prompt", async () => {
  const [settings, settingsPage, tokenRoute, promptBuilder] = await Promise.all([
    read("app/studio/settings/settings-client.tsx"),
    read("app/studio/settings/page.tsx"),
    read("app/api/tokens/route.ts"),
    read("lib/mcp-setup-prompt.ts"),
  ]);
  assert.match(settings, /connections\.copySetupPrompt/);
  assert.match(settings, /buildCodexMcpSetupPrompt\(endpoint, createdToken\)/);
  assert.match(settings, /navigator\.clipboard\.writeText/);
  assert.match(promptBuilder, /Please configure the following remote Streamable HTTP MCP server/);
  assert.match(promptBuilder, /Do not modify, delete, or publish any Story Studio data/);
  assert.match(settings, /items\.filter\(\(item\) => item\.id !== id\)/);
  assert.match(settingsPage, /isNull\(apiTokens\.revokedAt\)/);
  assert.match(tokenRoute, /delete\(apiTokens\)/);
  assert.doesNotMatch(tokenRoute, /set\(\{ revokedAt:/);
});

test("chapter editor offers separate create and suggestion-based revision prompts", async () => {
  const [workbench, studioHome, i18n, promptBuilder, writingLanguages, mcp] = await Promise.all([
    read("app/studio/works/[id]/workbench.tsx"),
    read("app/studio/studio-home.tsx"),
    read("lib/i18n.ts"),
    read("lib/chapter-prompt.ts"),
    read("lib/writing-languages.ts"),
    read("app/api/mcp/route.ts"),
  ]);
  assert.match(workbench, /work\.createFromOutline/);
  assert.match(workbench, /work\.modifyWithSuggestion/);
  assert.match(workbench, /revisionSuggestion/);
  assert.match(i18n, /Create new from outline/);
  assert.match(i18n, /Modify with suggestion/);
  assert.match(promptBuilder, /CURRENT CHAPTER MANUSCRIPT/);
  assert.match(promptBuilder, /never a patch, summary, or explanation/);
  assert.match(workbench, /<select name="language"/);
  assert.match(workbench, /writingLanguages\.map/);
  assert.match(studioHome, /writingLanguages\.map/);
  assert.match(writingLanguages, /"zh-TW"/);
  assert.match(writingLanguages, /parseWritingLanguage/);
  assert.match(mcp, /enum: writingLanguageCodes/);
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

test("Writer recommendations are contextual, disclosed, and use configured affiliate links", async () => {
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
  assert.match(component, /https:\/\/www\.sudowrite\.com\/\?via=xiangyu/);
  assert.match(component, /https:\/\/goto\.walmart\.com\/c\/1911899\/565706\/9383/);
  assert.match(component, /rel="sponsored noreferrer"/);
  assert.match(component, /affiliate\.commissionDisclosure/);
  assert.match(component, /affiliate\.trySudowrite/);
  assert.match(component, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(home, /AmazonRecommendations/);
  assert.match(studio, /AmazonRecommendations compact/);
  assert.match(workbench, /AmazonWorkbenchRecommendation/);
  assert.match(component, /id=\{compact \? "studio-writers-shelf" : "writers-shelf"\}/);
  assert.match(footer, /href="\/#writers-shelf"/);
  assert.match(footer, /affiliate\.amazonAssociate/);
  assert.match(i18n, /As an Amazon Associate I earn from qualifying purchases\./);
  assert.match(about, /affiliate\.aboutTitle/);
  assert.match(i18n, /affiliate\.craft/);
  assert.match(i18n, /FICTION AI PARTNER/);
  assert.match(i18n, /WRITING SUPPLIES/);
  assert.match(i18n, /Story Studio may earn a commission at no extra cost to you/);
});
