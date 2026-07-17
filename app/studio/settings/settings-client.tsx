"use client";

import { FormEvent, useState } from "react";

type TokenRow = { id: string; name: string; tokenPrefix: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };

export function ConnectionSettings({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [createdToken, setCreatedToken] = useState("");
  const [busy, setBusy] = useState(false);
  async function createToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const name = String(new FormData(event.currentTarget).get("name") || "我的 Codex");
    const response = await fetch("/api/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const result = await response.json() as { token?: string; record?: TokenRow };
    setBusy(false); if (result.token && result.record) { setCreatedToken(result.token); setTokens((items) => [result.record!, ...items]); event.currentTarget.reset(); }
  }
  async function revoke(id: string) { const response = await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (response.ok) setTokens((items) => items.map((item) => item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item)); }
  const endpoint = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp`;
  return <main className="studio-dashboard connection-page"><section className="dashboard-heading"><div><span className="studio-kicker">CONNECTIONS</span><h1>连接你自己的 AI</h1><p>站点不提供模型。你可以复制提示词，或允许自己的 Codex 通过 MCP 读写草稿。</p></div></section>
    <section className="connection-grid"><article className="connection-card"><div className="connection-icon">⇧</div><span className="studio-kicker">COPY & PASTE</span><h2>外部模型</h2><p>在章节编辑器点击“按大纲生成 AI 提示词”，再粘贴到 ChatGPT、Gemini 或本地模型。结果直接贴回正文并保存。</p><ul><li>不需要 API Key</li><li>不会从本站扣除模型额度</li><li>适合任何支持长文本的模型</li></ul></article>
      <article className="connection-card accent"><div className="connection-icon">⌁</div><span className="studio-kicker">REMOTE MCP</span><h2>Codex 连接</h2><p>令牌让你自己的 Codex 查看作品结构、读取上下文和保存章节草稿。消耗的是使用者自己的 Codex 额度。</p><div className="endpoint-box"><small>MCP endpoint</small><code>{endpoint}</code></div></article></section>
    <section className="token-section"><div className="token-heading"><div><h2>访问令牌</h2><p>令牌只在创建后显示一次。它等同于工作台钥匙，请勿发给别人。</p></div><form onSubmit={createToken}><input name="name" aria-label="令牌名称" placeholder="例如：家里电脑的 Codex" /><button className="studio-button primary" disabled={busy}>{busy ? "正在创建…" : "生成新令牌"}</button></form></div>
      {createdToken && <div className="new-token"><div><b>请现在复制并安全保存</b><code>{createdToken}</code></div><button className="studio-button primary" onClick={() => navigator.clipboard.writeText(createdToken)}>复制令牌</button></div>}
      <div className="token-list">{tokens.length ? tokens.map((token) => <div className={token.revokedAt ? "revoked" : ""} key={token.id}><div><b>{token.name}</b><code>{token.tokenPrefix}••••••••••••</code></div><div><span>{token.revokedAt ? "已撤销" : token.lastUsedAt ? `最近使用 ${new Date(token.lastUsedAt).toLocaleDateString()}` : "尚未使用"}</span>{!token.revokedAt && <button onClick={() => revoke(token.id)}>撤销</button>}</div></div>) : <div className="token-empty">尚未创建令牌。</div>}</div>
    </section>
    <section className="mcp-guide"><h2>Codex 能做什么？</h2><div><span>01</span><p><b>读取作品结构</b>列出卷、章、大纲与版本号</p></div><div><span>02</span><p><b>读取相关上下文</b>人物、关系、世界观、时间线和逻辑链</p></div><div><span>03</span><p><b>保存章节草稿</b>带版本检查写回，避免覆盖你刚做的修改</p></div><aside>安全边界：MCP 不能删除作品，也不能自动公开章节。发布始终要在网页工作台完成。</aside></section>
  </main>;
}
