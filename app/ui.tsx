"use client";

import Link from "next/link";
import type { ChatGPTUser } from "./chatgpt-auth";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import { LanguageSwitcher, useI18n } from "./language-provider";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? "compact" : ""}`} href="/"><span className="brand-mark">S</span><span><b>Story Studio</b>{!compact && <small>Cloud</small>}</span></Link>;
}

export function SiteHeader({ user }: { user: ChatGPTUser | null }) {
  const { t } = useI18n();
  return <header className="site-header"><div className="wrap header-inner"><Brand /><nav aria-label={t("nav.primary")}><Link href="/#workflow">{t("nav.features")}</Link><Link className="sponsored-nav" href="/#writers-shelf">{t("affiliate.shelf")}<small>{t("affiliate.paidLink")}</small></Link><Link href="/library">{t("nav.library")}</Link><Link href="/about">{t("nav.about")}</Link></nav><div className="header-actions"><LanguageSwitcher compact />{user ? <><Link className="text-user" href="/studio">{user.displayName}</Link><Link className="button small quiet" href={chatGPTSignOutPath("/")}>{t("auth.logout")}</Link></> : <><Link className="login-link" href={chatGPTSignInPath("/studio")}>{t("auth.login")}</Link><Link className="button small primary" href={chatGPTSignInPath("/studio")}>{t("auth.start")}</Link></>}</div></div></header>;
}

export function SiteFooter() {
  const { t } = useI18n();
  return <footer className="site-footer"><div className="wrap footer-grid"><div><Brand /><p>{t("footer.tagline")}</p></div><div><b>{t("footer.product")}</b><Link href="/studio">{t("footer.studio")}</Link><Link href="/library">{t("footer.library")}</Link><a href="https://github.com/xiangyucao/story-studio" target="_blank" rel="noreferrer">{t("footer.openSource")}</a></div><div><b>{t("footer.notes")}</b><Link href="/about">{t("footer.disclaimer")}</Link><Link href="/about#privacy">{t("footer.privacy")}</Link></div><div className="footer-note"><b>{t("footer.important")}</b><p>{t("footer.boundary")}</p></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Story Studio Cloud</span><span>{t("affiliate.amazonAssociate")}</span><span>{t("footer.made")}</span></div></footer>;
}
