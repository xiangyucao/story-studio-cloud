import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens } from "@/db/schema";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { sha256 } from "@/lib/authz";
import { createId } from "@/lib/ids";

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const base64 = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `ss_live_${base64}`;
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const body = await request.json() as { name?: string };
  const name = body.name?.trim().slice(0, 80) || "我的 Codex";
  const token = randomToken(); const now = new Date().toISOString();
  const record = { id: createId("tok"), ownerEmail: user.email, name, tokenPrefix: token.slice(0, 16), tokenHash: await sha256(token), createdAt: now };
  await getDb().insert(apiTokens).values(record);
  return Response.json({ token, record: { id: record.id, name, tokenPrefix: record.tokenPrefix, createdAt: now, lastUsedAt: null, revokedAt: null } }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "需要登录" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "缺少令牌 id" }, { status: 400 });
  await getDb().update(apiTokens).set({ revokedAt: new Date().toISOString() }).where(and(eq(apiTokens.id, id), eq(apiTokens.ownerEmail, user.email), isNull(apiTokens.revokedAt)));
  return new Response(null, { status: 204 });
}
