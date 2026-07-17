import Link from "next/link";
import { Brand } from "../ui";
import { LanguageSwitcher } from "../language-provider";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { getUiLocale } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n";
import "./studio.css";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const [user, locale] = await Promise.all([requireChatGPTUser("/studio"), getUiLocale()]); const t=(key:string)=>translate(locale,key);
  return <div className="studio-shell"><aside className="studio-rail"><Brand compact /><nav><Link className="active" href="/studio" title={t("studio.navWorks")}>▤<span>{t("studio.navWorks")}</span></Link><Link href="/studio/settings" title={t("studio.navConnections")}>⌁<span>{t("studio.navConnections")}</span></Link><Link href="/library" title={t("studio.navLibrary")}>▱<span>{t("studio.navLibrary")}</span></Link></nav><Link className="rail-avatar" href="/studio/settings" title={user.displayName}>{user.displayName.slice(0, 1).toUpperCase()}</Link></aside><div className="studio-main"><header className="studio-topbar"><div><span>STORY STUDIO CLOUD</span><b>{t("studio.privateSpace")}</b></div><div><LanguageSwitcher compact /><span className="private-badge">● {t("studio.privateDefault")}</span><span className="topbar-user">{user.displayName}</span><Link className="topbar-link" href={chatGPTSignOutPath("/")}>{t("auth.logout")}</Link></div></header>{children}</div></div>;
}
