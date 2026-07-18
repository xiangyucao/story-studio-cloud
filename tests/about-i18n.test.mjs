import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

const root = new URL("../", import.meta.url);

async function loadI18n() {
  const compiled = await build({ entryPoints: [fileURLToPath(new URL("lib/i18n.ts", root))], bundle: true, platform: "node", format: "esm", target: "node22", write: false });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
}

test("the complete About page follows every supported interface language", async () => {
  const { supportedLocales, translate } = await loadI18n();
  const keys = [
    "about.kicker", "about.title", "about.intro", "about.toolTitle", "about.toolBody",
    "about.contentTitle", "about.contentBody", "about.warrantyTitle", "about.warrantyBody",
    "about.privacyTitle", "about.private1", "about.private2", "about.private3", "about.private4",
    "about.reportTitle", "about.reportBody", "about.localTitle", "about.localBody", "about.localLink",
    "about.contactTitle", "about.contactBody", "about.discussionTitle", "about.discussionBody",
    "about.issueTitle", "about.issueBody", "about.securityTitle", "about.securityBody",
    "affiliate.aboutTitle", "affiliate.aboutBody", "affiliate.amazonAssociate", "footer.made", "nav.primary",
  ];
  for (const { code } of supportedLocales) {
    for (const key of keys) assert.notEqual(translate(code, key), key, `${code} is missing ${key}`);
    if (code !== "en") {
      for (const key of ["about.title", "about.toolTitle", "about.contentTitle", "about.warrantyTitle", "about.privacyTitle", "about.reportTitle", "affiliate.amazonAssociate", "footer.made"]) {
        assert.notEqual(translate(code, key), translate("en", key), `${code} still falls back to English for ${key}`);
      }
    }
  }
});
