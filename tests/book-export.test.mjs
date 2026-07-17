import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);

test("Word and Markdown exports contain the selected manuscript without a duplicate chapter heading", async () => {
    const compiled = await build({ entryPoints: [fileURLToPath(new URL("lib/book-export.ts", root))], bundle: true, platform: "node", format: "esm", target: "node22", write: false });
    const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`;
    const { createBookDocx, createBookMarkdown } = await import(moduleUrl);
    const work = { title: "The Glass Meridian", genre: "Science Fiction", language: "en", premise: "A navigator follows a map that remembers erased worlds." };
    const volumes = [{ id: "volume-1", position: 1, title: "Volume I: The Broken Compass", synopsis: "The voyage begins." }];
    const chapters = [{ id: "chapter-1", volumeId: "volume-1", position: 1, title: "Chapter 1: North of Memory", content: "Chapter 1: North of Memory\n\nRain crossed the observatory windows.\n\nMara found the impossible latitude." }];
    const options = { volumeIds: ["volume-1"], includeToc: true, includePremise: false, includeVolumeSynopses: false, traditionalChinese: false };
    const blob = await createBookDocx(work, volumes, chapters, options);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    assert.equal(String.fromCharCode(...bytes.slice(0, 2)), "PK");
    assert.ok(bytes.length > 2_000);
    const markdown = createBookMarkdown(work, volumes, chapters, options);
    assert.match(markdown, /## Contents/);
    assert.match(markdown, /Rain crossed the observatory windows/);
    assert.equal(markdown.match(/Chapter 1: North of Memory/g)?.length, 2, "one TOC entry and one metadata heading; the prose heading is removed");
    if (process.env.EXPORT_SAMPLE_PATH) await writeFile(process.env.EXPORT_SAMPLE_PATH, bytes);
});
