import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);

async function loadBuilder() {
  const compiled = await build({ entryPoints: [fileURLToPath(new URL("lib/chapter-prompt.ts", root))], bundle: true, platform: "node", format: "esm", target: "node22", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}

const work = { title: "The Glass Meridian", description: "", genre: "Science Fiction", language: "en", premise: "A navigator follows a map that remembers erased worlds.", styleGuide: "Precise, atmospheric prose.", referenceExcerpt: "" };
const volume = { id: "v1", position: 1, title: "The Broken Compass", synopsis: "The voyage begins." };
const chapter = { id: "c1", volumeId: "v1", position: 3, title: "North of Memory", outline: "Mara discovers the impossible latitude but cannot yet solve it.", content: "Rain crossed the observatory windows. Mara solved the map too easily.", targetWords: 3000 };
const bundle = { characters: [{ id: "mara", name: "Mara", role: "Protagonist", description: "A navigator.", personality: "Stubborn", goal: "Find the erased city" }], relationships: [], world: [{ category: "Rule", title: "Erased roads", content: "Roads vanish one day after their maps.", isHardSetting: true }], timeline: [], logicLinks: [{ fromRef: "Broken map", relation: "forces", toRef: "Black Market visit", notes: "A missing variable is required." }] };

test("create prompt starts fresh while modify prompt includes the current manuscript and suggestion", async () => {
  const { buildChapterPrompt } = await loadBuilder();
  const createPrompt = buildChapterPrompt({ work, volume, chapter, bundle, mode: "create" });
  assert.match(createPrompt, /Write a complete new chapter/);
  assert.doesNotMatch(createPrompt, /Mara solved the map too easily/);
  assert.match(createPrompt, /Erased roads/);

  const modifyPrompt = buildChapterPrompt({ work, volume, chapter, bundle, mode: "modify", suggestion: "Leave Mara missing one crucial variable." });
  assert.match(modifyPrompt, /Leave Mara missing one crucial variable/);
  assert.match(modifyPrompt, /Mara solved the map too easily/);
  assert.match(modifyPrompt, /return the full revised chapter, never a patch/);
});

test("the complete prompt scaffold follows the selected writing language", async () => {
  const { buildChapterPrompt } = await loadBuilder();
  const germanPrompt = buildChapterPrompt({ work: { ...work, language: "de" }, volume, chapter, bundle, mode: "create" });
  assert.match(germanPrompt, /# WERK/);
  assert.match(germanPrompt, /# FIGUREN/);
  assert.match(germanPrompt, /# WELT UND HINTERGRUND/);
  assert.match(germanPrompt, /# ABSCHLUSSPRÜFUNG/);
  assert.match(germanPrompt, /Schreibsprache: Deutsch/);
  assert.doesNotMatch(germanPrompt, /# WORK|# FINAL CHECK|Write in:/);

  const traditionalPrompt = buildChapterPrompt({ work: { ...work, language: "zh-TW" }, volume, chapter, bundle, mode: "modify", suggestion: "保留懸念。" });
  assert.match(traditionalPrompt, /# 目前章節位置/);
  assert.match(traditionalPrompt, /# 人物關係/);
  assert.match(traditionalPrompt, /# 最終檢查/);
  assert.match(traditionalPrompt, /寫作語言: 繁體中文/);
  assert.doesNotMatch(traditionalPrompt, /当前章节正文|最终检查|写作语言/);
});
