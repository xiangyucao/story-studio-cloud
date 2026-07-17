import Link from "next/link";
import { Brand } from "../ui";
import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import "./studio.css";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireChatGPTUser("/studio");
  return <div className="studio-shell"><aside className="studio-rail"><Brand compact /><nav><Link className="active" href="/studio" title="作品">▤<span>作品</span></Link><Link href="/studio/settings" title="连接">⌁<span>连接</span></Link><Link href="/library" title="小说广场">▱<span>广场</span></Link></nav><Link className="rail-avatar" href="/studio/settings" title={user.displayName}>{user.displayName.slice(0, 1).toUpperCase()}</Link></aside><div className="studio-main"><header className="studio-topbar"><div><span>STORY STUDIO CLOUD</span><b>私人写作空间</b></div><div><span className="private-badge">● 默认私密</span><span className="topbar-user">{user.displayName}</span><Link className="topbar-link" href={chatGPTSignOutPath("/")}>退出</Link></div></header>{children}</div></div>;
}
