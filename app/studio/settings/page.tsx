import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { apiTokens } from "@/db/schema";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ConnectionSettings } from "./settings-client";

export default async function SettingsPage() {
  const user = await requireChatGPTUser("/studio/settings");
  const tokens = await getDb().select({ id: apiTokens.id, name: apiTokens.name, tokenPrefix: apiTokens.tokenPrefix, createdAt: apiTokens.createdAt, lastUsedAt: apiTokens.lastUsedAt, revokedAt: apiTokens.revokedAt }).from(apiTokens).where(eq(apiTokens.ownerEmail, user.email)).orderBy(desc(apiTokens.createdAt));
  return <ConnectionSettings initialTokens={tokens} />;
}
