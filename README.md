# Story Studio Cloud

Story Studio Cloud 是一个面向朋友和小型写作社群的免费、开源 AI 小说管理工具。它负责管理作品结构与上下文，不提供或转售 AI 模型。

作者可以在同一个工作台里维护：

- 作品基石、类型、语言、风格指南和参考范本
- 卷、章、章节大纲、建议字数和正文版本
- 人物、人物关系、世界观、硬设定、时间线和逻辑链
- 外部模型提示词，以及自己的 Codex 可调用的远程 MCP 工具
- 私人草稿、公开作品主页和逐章发布状态
- 本地 Story Studio 完整备份导入、云端完整 JSON 导出与再次导入

## 设计边界

这是“写作架构与文稿管理工具”，不是模型服务：

1. 站点不持有平台统一的 OpenAI、Gemini 或其他模型 API Key。
2. 外部模型模式只在浏览器中整理提示词，由作者自己复制给模型。
3. MCP 使用作者自己的 Codex 和自己的额度；服务端只读取上下文和保存草稿。
4. 作品默认私密。作品和章节都明确发布后，才会出现在小说广场。
5. MCP 不能删除作品，也不能发布章节；令牌可随时撤销。

详细免责声明见站内 `/about` 页面。

## 核心流程

### 1. 登录与建立作品

作者通过 ChatGPT 登录进入 `/studio`。新建作品时只需要填写作品名、类型、写作语言和一句话构想，系统会自动建立第一卷与第一章，不会调用 AI。

也可以选择“导入本地完整备份”，导入旧版 Story Studio 导出的 `story-studio-project-backup` JSON。导入总是建立新副本，不覆盖现有作品，且默认不公开。

### 2. 先写大纲，再写正文

左侧故事树按卷组织章节。每一章保存：

- 标题与大纲
- 建议字数
- 正文
- 修订版本号
- 是否公开

修改大纲或正文后点击“保存章节”。工作台会更新章节版本号，MCP 写回时也会检查版本，避免覆盖作者刚刚完成的修改。

### 3. 让外部 AI 写作

在章节编辑器点击“按大纲生成 AI 提示词”。系统会组合：

- 作品类型、核心构想、风格指南与参考范本
- 当前卷介绍、章节标题、大纲与建议字数
- 人物、目标、个性和人物关系
- 世界观与硬设定
- 时间线和逻辑链

提示词会根据作品语言使用中文、英文、德语、西班牙语、法语、日语、葡萄牙语或韩语的核心指令。复制到 ChatGPT、Gemini、本地模型等任意工具，把结果贴回正文即可。

站点不会在后台发送提示词，因此不会消耗站点所有者的模型额度。

### 4. 用自己的 Codex 连接

打开“连接”页面，生成一个访问令牌。远程 MCP 入口为：

```text
https://你的域名/api/mcp
```

使用 Bearer token 认证。当前提供：

- `story_list_works`
- `story_list_outline`
- `story_get_context`
- `story_get_chapter`
- `story_save_chapter`

`story_save_chapter` 必须带刚刚读取的 `expectedRevision`。版本不一致时会拒绝覆盖。令牌明文只显示一次，数据库只保存 SHA-256 哈希。

### 5. 公开分享

在作品设置里勾选“公开作品主页”，再逐章勾选“发布本章”。公开读者不需要登录，只会看到同时满足这两个条件的内容。

小说广场没有评论、私信、付费或模型结算功能，第一版只做简单阅读与分享。

## 本地开发

要求 Node.js 22.13 或更高版本。

```bash
npm ci
npm run db:generate
npm run dev
```

打开 `http://localhost:3000`。

项目通过 `.openai/hosting.json` 声明：

- D1 绑定 `DB`：作品、章节、设定和令牌元数据
- R2 绑定 `ASSETS_BUCKET`：后续封面与插画文件

本地未经过 Sites 身份网关时，公开首页仍能正常预览；`/studio` 需要部署环境提供 Sign in with ChatGPT 身份头。

## 验证

```bash
npm run lint
npm test
```

`npm test` 会执行生产构建，并检查公开说明、默认私密、令牌哈希和 MCP 版本保护等关键安全约束。浏览器预览用于补充验证实际渲染结果。

## 数据结构

Drizzle schema 位于 `db/schema.ts`，包括：

- `works`
- `volumes`
- `chapters`
- `characters`
- `character_relationships`
- `world_entries`
- `timeline_events`
- `logic_links`
- `api_tokens`

数据库迁移保存在 `drizzle/`。

## 当前状态

这是云端分支的第一版 MVP。下一步适合补充人物、世界观和逻辑链的可视化编辑器、封面与插画上传、DOCX/PDF 导出，以及更完整的多语言 UI。核心身份隔离、结构化写作、外部模型提示词、公开阅读、备份迁移和 MCP 草稿读写已经建立。

## License

MIT。详见 `LICENSE`。
