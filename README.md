# Story Studio Cloud

Story Studio Cloud is a free, open-source workspace for planning, managing, writing, and sharing long-form fiction with AI assistance. It keeps the story structure and manuscript organized while leaving the choice of AI model—and the related cost—with each author.

**Live site:** [story-studio-cloud.xiangyucao.chatgpt.site](https://story-studio-cloud.xiangyucao.chatgpt.site)

## Prefer a local app?

The original [Story Studio desktop edition](https://github.com/xiangyucao/story-studio) is also free and open source. It runs on your own computer, stores projects locally with SQLite, and can connect to local language models as well as external AI tools.

Choose the desktop edition when local-first storage, offline work, or a local model is important. Choose Story Studio Cloud when you want account-based private drafts, browser access, public reading pages, and remote MCP access for your own Codex.

## What authors can manage

- A work's premise, genre, writing language, style guide, and reference excerpt
- Volumes, chapters, outlines, target lengths, manuscript text, and revisions
- Characters, relationships, worldbuilding, hard settings, timelines, and logic chains
- Complete prompts for external models and remote MCP tools for the author's own Codex
- Private drafts, public work pages, and chapter-level publishing controls
- Full JSON backup import and export

## Interface languages

The interface defaults to English for a new visitor. The language selector supports:

- English
- Simplified Chinese and Traditional Chinese
- Spanish, German, and French
- Japanese, Portuguese, and Korean

The interface language is separate from each work's **writing language**. Changing the interface does not change the language used for AI writing instructions.

## Product boundaries

Story Studio Cloud is a story-architecture and manuscript-management tool, not a model provider:

1. The site does not hold a shared OpenAI, Gemini, or other model API key.
2. External-model mode assembles a prompt in the browser. The author decides where to paste it.
3. MCP uses the author's own Codex account and allowance. The server only reads authorized story context and saves private drafts.
4. Works are private by default. A work and its individual chapters must both be explicitly published before readers can see them.
5. MCP cannot delete works or publish chapters, and access tokens can be revoked at any time.

See `/about` on the live site for the full disclaimer.

## Core workflow

### 1. Sign in and create a work

Authors sign in with ChatGPT and enter the private studio. Creating a work only requires a title, genre, writing language, and one-sentence premise. Story Studio prepares the first volume and chapter without calling an AI model.

A complete backup exported by the local Story Studio app can also be imported. Every import creates a new private copy and does not overwrite an existing work.

### 2. Outline before drafting

The manuscript tree groups chapters under collapsible volumes. Each chapter stores:

- Title and chapter outline
- Target length
- Manuscript text
- Revision number
- Publishing status

Saving an edited chapter increments its revision. MCP writes use optimistic revision checks so a remote edit cannot silently overwrite a newer browser edit.

### 3. Write with any external AI

Click **Build AI prompt from outline** in the chapter editor. Story Studio composes:

- Genre, premise, style guide, and reference excerpt
- Current volume synopsis, chapter title, outline, and target length
- Characters, goals, personalities, and relationships
- Worldbuilding and hard settings
- Timeline events and logic chains

The core writing instructions follow the work's writing language. Copy the prompt to ChatGPT, Gemini, a local model, or another long-context tool, then paste the resulting prose back into the manuscript.

The site does not send the prompt in the background and does not consume model credits on behalf of the user.

### 4. Connect your own Codex with MCP

Create an access token on the **Connections** page. The remote MCP endpoint is:

```text
https://your-domain.example/api/mcp
```

It uses Bearer-token authentication and currently exposes:

- `story_list_works`
- `story_create_work`
- `story_update_work`
- `story_list_outline`
- `story_manage_outline`
- `story_get_context`
- `story_manage_context`
- `story_get_chapter`
- `story_save_chapter`

`story_save_chapter` requires the most recently read `expectedRevision`. A version mismatch is rejected. The plaintext token is displayed once; only its SHA-256 hash is stored.

`story_create_work` creates only a private work with its first volume and chapter. `story_update_work` can maintain the work foundation and reference excerpt. `story_manage_outline` can add, edit, move, and delete volumes or chapters; chapter edits use revision checks, and destructive deletions require both an explicit confirmation and the exact current title. `story_manage_context` provides create, update, and delete operations for characters, relationships, worldbuilding, timeline events, and logic chains.

MCP still cannot publish a work or chapter, delete an entire work, or make a private draft public. Those actions stay in the signed-in web studio.

### 5. Share a finished story

Enable **Publish work page** in the work settings, then explicitly publish the chapters readers should see. Public readers do not need to sign in, and unpublished chapters remain private.

The community library intentionally has no payments, model billing, private messaging, or comments in the current release.

## Local development

Requires Node.js 22.13 or later.

```bash
npm ci
npm run db:generate
npm run dev
```

Then open `http://localhost:3000`.

The `.openai/hosting.json` file declares:

- D1 binding `DB` for works, chapters, context, and token metadata
- R2 binding `ASSETS_BUCKET` for future cover and illustration files

The public pages can be previewed locally. The private `/studio` routes require the Sign in with ChatGPT identity headers supplied by the deployed Sites environment.

## Validation

```bash
npm run lint
npm test
```

The test command runs a production build and checks the model-service boundary, English default interface, private-by-default data model, token hashing, ownership isolation, and MCP revision protection.

## Data model

The Drizzle schema in `db/schema.ts` contains:

- `works`
- `volumes`
- `chapters`
- `characters`
- `character_relationships`
- `world_entries`
- `timeline_events`
- `logic_links`
- `api_tokens`

Database migrations live in `drizzle/`.

## Community, support, and contributions

- Ask questions, discuss ideas, and share your work in [GitHub Discussions](https://github.com/xiangyucao/story-studio-cloud/discussions).
- Report reproducible bugs or request a clearly scoped feature with the [GitHub Issue forms](https://github.com/xiangyucao/story-studio-cloud/issues/new/choose).
- Report security vulnerabilities privately through [GitHub Security Advisories](https://github.com/xiangyucao/story-studio-cloud/security/advisories/new).
- Read [SUPPORT.md](SUPPORT.md) before posting private story text or credentials.

Pull requests are welcome. This is a spare-time open-source project, so response times and implementation dates cannot be guaranteed.

## License

MIT. See [LICENSE](LICENSE).
