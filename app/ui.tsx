import Link from "next/link";
import type { ChatGPTUser } from "./chatgpt-auth";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? "compact" : ""}`} href="/"><span className="brand-mark">S</span><span><b>Story Studio</b>{!compact && <small>Cloud</small>}</span></Link>;
}

export function SiteHeader({ user }: { user: ChatGPTUser | null }) {
  return <header className="site-header"><div className="wrap header-inner"><Brand /><nav aria-label="主导航"><Link href="/#workflow">功能</Link><Link href="/library">小说广场</Link><Link href="/about">关于与免责</Link></nav><div className="header-actions">{user ? <><Link className="text-user" href="/studio">{user.displayName}</Link><Link className="button small quiet" href={chatGPTSignOutPath("/")}>退出</Link></> : <><Link className="login-link" href={chatGPTSignInPath("/studio")}>登录</Link><Link className="button small primary" href={chatGPTSignInPath("/studio")}>开始写作</Link></>}</div></div></header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="wrap footer-grid"><div><Brand /><p>把结构留给工具，把选择留给作者。</p></div><div><b>产品</b><Link href="/studio">写作工作台</Link><Link href="/library">小说广场</Link></div><div><b>说明</b><Link href="/about">免责声明</Link><Link href="/about#privacy">隐私与内容责任</Link></div><div className="footer-note"><b>重要说明</b><p>本站只提供作品管理、提示词整理和 MCP 读写能力，不提供或转售任何 AI 模型服务。</p></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Story Studio Cloud</span><span>Made for stories, not for lock-in.</span></div></footer>;
}
