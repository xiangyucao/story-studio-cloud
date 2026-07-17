import type { Metadata } from "next";
import { getChatGPTUser } from "../chatgpt-auth";
import { SiteFooter, SiteHeader } from "../ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "关于与免责声明" };

export default async function AboutPage() {
  const user = await getChatGPTUser();
  return <div className="page-shell"><SiteHeader user={user} /><main><header className="interior-hero wrap"><span className="kicker">About & disclaimer</span><h1>这是一张写作桌，<br />不是内容的作者。</h1><p>Story Studio Cloud 是非商业的作品架构与文稿管理工具。我们希望朋友们能自由选择自己的 AI、保留自己的数据，并清楚理解 AI 辅助创作的边界。</p></header><div className="legal-copy wrap">
    <section><h2>工具定位</h2><p>本站提供大纲、章节、人物、关系、世界观、时间线、逻辑链、提示词整理、导入导出、公开阅读及 MCP 读写等管理能力。本站本身不提供、转售或代理任何大语言模型服务，也不会替用户承担 ChatGPT、Codex、Gemini、本地模型或其他第三方服务的费用。</p></section>
    <section><h2>内容责任</h2><p>用户应当对自己上传、生成、编辑和发布的内容负责，包括事实准确性、版权、商标、隐私、名誉及适用法律。AI 输出可能存在错误、偏见、重复、虚构或与他人作品相似的内容；发布前应由作者本人检查。</p></section>
    <section><h2>不作保证</h2><p>本站不保证 AI 生成内容的质量、连贯性、原创性、可出版性或商业结果，也不构成法律、出版、医疗、投资或其他专业建议。服务按现状提供，可能因测试、维护或托管限制而暂时不可用。</p></section>
    <section id="privacy"><h2>隐私与默认可见性</h2><ul><li>作品默认仅作者本人可见。</li><li>只有作者主动发布的作品和章节才会出现在小说广场。</li><li>外部模型提示词由用户主动复制；本站不会在后台替用户发送。</li><li>MCP 访问令牌只在创建时显示一次，可随时撤销；请勿分享给他人。</li></ul></section>
    <section><h2>举报与下架</h2><p>若公开作品侵犯你的合法权益，请提供作品链接、权利说明和可核验的联系方式。项目正式公开前会补充专用联系邮箱；收到合理通知后，我们可以临时隐藏相关内容并联系发布者核实。</p></section>
  </div></main><SiteFooter /></div>;
}
