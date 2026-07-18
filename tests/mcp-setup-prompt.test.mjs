import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);

async function loadBuilder() {
  const compiled = await build({ entryPoints: [fileURLToPath(new URL("lib/mcp-setup-prompt.ts", root))], bundle: true, platform: "node", format: "esm", target: "node22", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}

test("Codex setup prompt includes the endpoint, secret handling, discovery, and a read-only check", async () => {
  const { buildCodexMcpSetupPrompt } = await loadBuilder();
  const prompt = buildCodexMcpSetupPrompt("https://example.com/api/mcp", "ss_live_example");
  assert.match(prompt, /remote Streamable HTTP MCP server/);
  assert.match(prompt, /Server URL: https:\/\/example\.com\/api\/mcp/);
  assert.match(prompt, /Bearer token: ss_live_example/);
  assert.match(prompt, /bearer_token_env_var = "STORY_STUDIO_TOKEN"/);
  assert.match(prompt, /Read the server instructions and all available tool schemas/);
  assert.match(prompt, /read-only test by listing my Story Studio works/);
  assert.match(prompt, /Do not modify, delete, or publish any Story Studio data/);
});
