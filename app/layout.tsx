import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Story Studio Cloud", template: "%s · Story Studio Cloud" },
  description: "免费的 AI 小说架构与写作管理工具。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
