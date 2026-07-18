"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "../../language-provider";
import { buildCodexMcpSetupPrompt } from "@/lib/mcp-setup-prompt";

type TokenRow = { id: string; name: string; tokenPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export function ConnectionSettings({ initialTokens }: { initialTokens: TokenRow[] }) {
  const { locale, t } = useI18n();
  const [tokens, setTokens] = useState(initialTokens);
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState<"token" | "prompt" | "">("");
  const [busy, setBusy] = useState(false);
  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const name = String(new FormData(event.currentTarget).get("name") || "My Codex");
    const response = await fetch("/api/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json() as { token?: string; record?: TokenRow };
    setBusy(false); if (result.token && result.record) { setCreatedToken(result.token); setTokens((items) => [result.record!, ...items]); event.currentTarget.reset(); }
  }
  async function revoke(id: string) { const response = await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (response.ok) setTokens((items) => items.map((item) => item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item)); }
  const endpoint = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;
  async function copy(value: string, type: "token" | "prompt") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied((current) => current === type ? "" : current), 2200);
  }
  return <main className="studio-dashboard connection-page"><section className="dashboard-heading"><div><span className="studio-kicker">{t("connections.kicker")}</span><h1>{t("connections.title")}</h1><p>{t("connections.intro")}</p></div></section>
    <section className="connection-grid"><article className="connection-card"><div className="connection-icon">⇧</div><span className="studio-kicker">COPY & PASTE</span><h2>{t("connections.external")}</h2><p>{t("connections.externalBody")}</p><ul><li>{t("connections.noKey")}</li><li>{t("connections.noCredits")}</li><li>{t("connections.anyModel")}</li></ul></article>
      <article className="connection-card accent"><div className="connection-icon">⌁</div><span className="studio-kicker">REMOTE MCP</span><h2>{t("connections.codex")}</h2><p>{t("connections.codexBody")}</p><div className="endpoint-box"><small>MCP endpoint</small><code>{endpoint}</code></div></article></section>
    <section className="token-section"><div className="token-heading"><div><h2>{t("connections.tokens")}</h2><p>{t("connections.tokensBody")}</p></div><form onSubmit={createToken}><input name="name" aria-label={t("connections.tokenName")} placeholder={t("connections.tokenPlaceholder")} /><button className="studio-button primary" disabled={busy}>{busy ? t("connections.creating") : t("connections.create")}</button></form></div>
      {createdToken && <div className="new-token"><div className="new-token-secret"><div><b>{t("connections.copyNow")}</b><code>{createdToken}</code></div><button className="studio-button quiet" onClick={() => copy(createdToken, "token")}>{copied === "token" ? t("connections.copied") : t("connections.copy")}</button></div><div className="codex-setup-copy"><div><b>{t("connections.setupPromptTitle")}</b><p>{t("connections.setupPromptBody")}</p><small>{t("connections.setupPromptSecurity")}</small></div><button className="studio-button primary" onClick={() => copy(buildCodexMcpSetupPrompt(endpoint, createdToken), "prompt")}>{copied === "prompt" ? t("connections.setupPromptCopied") : t("connections.copySetupPrompt")}</button></div></div>}
      <div className="token-list">{tokens.length ? tokens.map((token) => <div className={token.revokedAt ? "revoked" : ""} key={token.id}><div><b>{token.name}</b><code>{token.tokenPrefix}••••••••••••</code></div><div><span>{token.revokedAt ? t("connections.revoked") : token.lastUsedAt ? t("connections.lastUsed",{date:new Date(token.lastUsedAt).toLocaleDateString(locale)}) : t("connections.neverUsed")}</span>{!token.revokedAt && <button onClick={() => revoke(token.id)}>{t("connections.revoke")}</button>}</div></div>) : <div className="token-empty">{t("connections.empty")}</div>}</div>
    </section>
    <section className="mcp-guide"><h2>{t("connections.what")}</h2><div><span>01</span><p><b>{t("connections.readStructure")}</b>{t("connections.readStructureBody")}</p></div><div><span>02</span><p><b>{t("connections.readContext")}</b>{t("connections.readContextBody")}</p></div><div><span>03</span><p><b>{t("connections.saveDrafts")}</b>{t("connections.saveDraftsBody")}</p></div><aside>{t("connections.safety")}</aside></section>
  </main>;
}
