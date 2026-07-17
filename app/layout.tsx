import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./language-provider";
import { getUiLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
  title: { default: "Story Studio Cloud", template: "%s · Story Studio Cloud" },
  description: "A free AI-assisted workspace for planning, managing, and writing novels.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getUiLocale();
  return <html lang={locale}><body><LanguageProvider initialLocale={locale}>{children}</LanguageProvider></body></html>;
}
