import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens } from "@/db/schema";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ConnectionSettings } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireChatGPTUser("/studio/settings");
  const tokens = await getDb().select({ id: apiTokens.id, name: apiTokens.name, tokenPrefix: apiTokens.tokenPrefix, createdAt: apiTokens.createdAt, lastUsedAt: apiTokens.lastUsedAt }).from(apiTokens).where(and(eq(apiTokens.ownerEmail, user.email), isNull(apiTokens.revokedAt))).orderBy(desc(apiTokens.createdAt));
  return <ConnectionSettings initialTokens={tokens} />;
}
