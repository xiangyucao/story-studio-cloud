import { getChatGPTUser } from "@/app/chatgpt-auth";
import { ownedWork } from "@/lib/authz";
import {
  createBookDocx,
  createBookMarkdown,
  convertExportText,
  exportLanguage,
  safeExportName,
  type BookExportOptions,
} from "@/lib/book-export";
import { getWorkBundle } from "@/lib/queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to export this work." }, { status: 401 });
  const { id } = await params;
  const work = await ownedWork(id, user.email);
  if (!work) return Response.json({ error: "Work not found." }, { status: 404 });

  try {
    const url = new URL(request.url);
    const bundle = await getWorkBundle(id);
    const requestedIds = (url.searchParams.get("volumes") ?? "").split(",").filter(Boolean);
    const knownIds = new Set(bundle.volumes.map((volume) => volume.id));
    const volumeIds = requestedIds.length ? requestedIds.filter((volumeId) => knownIds.has(volumeId)) : bundle.volumes.map((volume) => volume.id);
    if (!volumeIds.length) return Response.json({ error: "Select at least one volume." }, { status: 400 });
    const language = exportLanguage(work.language);
    const options: BookExportOptions = {
      volumeIds,
      includeToc: url.searchParams.get("toc") !== "false",
      includePremise: url.searchParams.get("premise") === "true",
      includeVolumeSynopses: url.searchParams.get("volumeSynopsis") === "true",
      traditionalChinese: language.startsWith("zh") && url.searchParams.get("script") === "traditional",
    };
    const translatedTitle = safeExportName(convertExportText(work.title, language, options.traditionalChinese));
    const format = url.searchParams.get("format") ?? "docx";

    if (format === "markdown") {
      const markdown = createBookMarkdown(work, bundle.volumes, bundle.chapters, options);
      const filename = `${translatedTitle}.md`;
      return new Response(markdown, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": disposition(filename, "manuscript.md") } });
    }
    if (format !== "docx") return Response.json({ error: "Unsupported export format." }, { status: 400 });
    const document = await createBookDocx(work, bundle.volumes, bundle.chapters, options);
    const filename = `${translatedTitle}.docx`;
    return new Response(document, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": disposition(filename, "manuscript.docx"), "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Export failed." }, { status: 500 });
  }
}

function disposition(filename: string, fallback: string) {
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
