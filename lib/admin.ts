import { env } from "cloudflare:workers";

function configuredAdminEmails() {
  const value = String((env as unknown as Record<string, unknown>).STORY_STUDIO_ADMIN_EMAILS ?? "");
  return new Set(value.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export function isAdminEmail(email: string) {
  return configuredAdminEmails().has(email.trim().toLowerCase());
}
