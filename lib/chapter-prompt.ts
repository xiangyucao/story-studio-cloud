export type ChapterPromptMode = "create" | "modify";

export type PromptWork = {
  title: string;
  description?: string | null;
  genre?: string | null;
  language?: string | null;
  premise?: string | null;
  styleGuide?: string | null;
  referenceExcerpt?: string | null;
};

export type PromptVolume = { id: string; position: number; title: string; synopsis?: string | null };
export type PromptChapter = { id: string; volumeId: string; position: number; title: string; outline?: string | null; content?: string | null; targetWords: number };
export type PromptBundle = {
  characters: { id: string; name: string; role?: string | null; description?: string | null; personality?: string | null; goal?: string | null }[];
  relationships: { sourceCharacterId: string; targetCharacterId: string; relationship?: string | null; description?: string | null }[];
  world: { category?: string | null; title: string; content?: string | null; isHardSetting: boolean }[];
  timeline: { position: number; timeLabel?: string | null; title: string; content?: string | null }[];
  logicLinks: { fromRef: string; relation: string; toRef: string; notes?: string | null }[];
};

type PromptLocale = { role: string; create: string; modify: string; rules: string; suggestion: string; currentDraft: string; revisionRule: string };

const localePrompts: Record<string, PromptLocale> = {
  en: { role: "You are a professional long-form fiction writer.", create: "Write a complete new chapter from the outline and context below.", modify: "Revise the complete current chapter according to the author's suggestion below.", rules: "Do not add a chapter heading. Preserve continuity and hard settings. Output only the complete chapter prose.", suggestion: "AUTHOR'S REVISION SUGGESTION", currentDraft: "CURRENT CHAPTER MANUSCRIPT", revisionRule: "Keep effective passages unless the suggestion requires changing them. Resolve the requested issue throughout the chapter; return the full revised chapter, never a patch, summary, or explanation." },
  de: { role: "Du bist ein professioneller Autor für lange Romane.", create: "Schreibe anhand der folgenden Gliederung und des Kontexts ein vollständiges neues Kapitel.", modify: "Überarbeite das vollständige aktuelle Kapitel gemäß dem folgenden Vorschlag des Autors.", rules: "Füge keine Kapitelüberschrift hinzu. Bewahre Kontinuität und feste Weltregeln. Gib nur den vollständigen Kapiteltext aus.", suggestion: "ÜBERARBEITUNGSVORSCHLAG DES AUTORS", currentDraft: "AKTUELLES KAPITELMANUSKRIPT", revisionRule: "Bewahre gelungene Passagen, sofern der Vorschlag keine Änderung verlangt. Setze die Änderung im gesamten Kapitel um und gib immer das vollständige überarbeitete Kapitel aus, nie einen Patch oder eine Erklärung." },
  es: { role: "Eres un novelista profesional de ficción larga.", create: "Escribe un capítulo nuevo y completo a partir del esquema y el contexto siguientes.", modify: "Revisa el capítulo actual completo según la sugerencia del autor.", rules: "No añadas el título del capítulo. Mantén la continuidad y las reglas fijas del mundo. Devuelve solo la prosa completa.", suggestion: "SUGERENCIA DE REVISIÓN DEL AUTOR", currentDraft: "MANUSCRITO ACTUAL DEL CAPÍTULO", revisionRule: "Conserva los pasajes eficaces salvo que la sugerencia exija cambiarlos. Aplica la revisión en todo el capítulo y devuelve el capítulo completo, nunca un parche, resumen o explicación." },
  fr: { role: "Vous êtes un romancier professionnel spécialisé dans les récits longs.", create: "Rédigez un nouveau chapitre complet à partir du plan et du contexte ci-dessous.", modify: "Révisez l'intégralité du chapitre actuel selon la suggestion de l'auteur ci-dessous.", rules: "N'ajoutez pas de titre de chapitre. Respectez la continuité et les règles immuables. Retournez uniquement le texte complet du chapitre.", suggestion: "SUGGESTION DE RÉVISION DE L'AUTEUR", currentDraft: "MANUSCRIT ACTUEL DU CHAPITRE", revisionRule: "Conservez les passages réussis sauf si la suggestion exige de les modifier. Appliquez la révision dans tout le chapitre et retournez le chapitre complet, jamais un correctif, un résumé ou une explication." },
  ja: { role: "あなたは長編小説を執筆するプロの作家です。", create: "以下のアウトラインと文脈に基づいて、新しい章を完全な形で執筆してください。", modify: "以下の作者の提案に従って、現在の章全体を改稿してください。", rules: "章タイトルを付けず、連続性と厳格な世界設定を守り、章本文だけを完全な形で出力してください。", suggestion: "作者の修正指示", currentDraft: "現在の章本文", revisionRule: "指示で変更が必要な箇所以外の優れた文章は残してください。章全体で問題を解決し、差分・要約・説明ではなく、改稿後の章全文を返してください。" },
  pt: { role: "Você é um romancista profissional de ficção longa.", create: "Escreva um capítulo novo e completo com base no esboço e no contexto abaixo.", modify: "Revise o capítulo atual completo de acordo com a sugestão do autor abaixo.", rules: "Não adicione o título do capítulo. Preserve a continuidade e as regras rígidas do mundo. Retorne apenas a prosa completa.", suggestion: "SUGESTÃO DE REVISÃO DO AUTOR", currentDraft: "MANUSCRITO ATUAL DO CAPÍTULO", revisionRule: "Preserve os trechos eficazes, salvo quando a sugestão exigir mudanças. Resolva a questão em todo o capítulo e devolva o capítulo completo, nunca um patch, resumo ou explicação." },
  ko: { role: "당신은 장편소설을 쓰는 전문 작가입니다.", create: "아래 개요와 맥락을 바탕으로 새로운 장 전체를 작성하세요.", modify: "아래 작가의 수정 제안에 따라 현재 장 전체를 고쳐 쓰세요.", rules: "장 제목을 추가하지 말고, 연속성과 확정 설정을 지키며, 완성된 장 본문만 출력하세요.", suggestion: "작가의 수정 제안", currentDraft: "현재 장 원고", revisionRule: "제안에서 변경을 요구하지 않는 좋은 문장은 유지하세요. 장 전체에서 요청한 문제를 해결하고, 패치·요약·설명이 아닌 수정된 장 전문을 반환하세요." },
  zh: { role: "你是一名专业的长篇小说作家。", create: "请根据下面的大纲与上下文，重新创作一个完整的新章节。", modify: "请按照下面作者给出的修改建议，修改当前章节全文。", rules: "不要输出章节标题；保持前后连续，严格遵守硬设定；只输出完整正文。", suggestion: "作者修改建议", currentDraft: "当前章节正文", revisionRule: "除非修改建议要求变动，否则保留已有的有效段落。修改必须贯穿全文并真正解决问题；请输出修改后的完整章节，不要输出差异、摘要或解释。" },
};

export function buildChapterPrompt({ work, volume, chapter, bundle, mode, suggestion = "" }: { work: PromptWork; volume?: PromptVolume; chapter: PromptChapter; bundle: PromptBundle; mode: ChapterPromptMode; suggestion?: string }) {
  const languageKey = Object.keys(localePrompts).find((key) => (work.language || "").toLowerCase().startsWith(key)) ?? "zh";
  const language = localePrompts[languageKey];
  const names = new Map(bundle.characters.map((item) => [item.id, item.name]));
  const charactersText = bundle.characters.map((item) => `- ${item.name} (${item.role || "role unspecified"}): ${item.description || ""}\n  Personality: ${item.personality || ""}\n  Goal: ${item.goal || ""}`).join("\n") || "- None provided";
  const relationshipsText = bundle.relationships.map((item) => `- ${names.get(item.sourceCharacterId) || item.sourceCharacterId} —${item.relationship || "related to"}→ ${names.get(item.targetCharacterId) || item.targetCharacterId}: ${item.description || ""}`).join("\n") || "- None provided";
  const worldText = bundle.world.map((item) => `- [${item.isHardSetting ? "HARD" : item.category || "SETTING"}] ${item.title}: ${item.content || ""}`).join("\n") || "- None provided";
  const timelineText = bundle.timeline.map((item) => `- ${item.timeLabel || item.position} · ${item.title}: ${item.content || ""}`).join("\n") || "- None provided";
  const logicText = bundle.logicLinks.map((item) => `- ${item.fromRef} —${item.relation}→ ${item.toRef}: ${item.notes || ""}`).join("\n") || "- None provided";
  const revisionSection = mode === "modify" ? `\n\n# ${language.suggestion}\n${suggestion.trim() || "[Enter a specific revision suggestion]"}\n\n${language.revisionRule}\n\n# ${language.currentDraft}\n${chapter.content?.trim() || "[No current manuscript provided]"}` : "";
  return `${language.role}\n\n${mode === "modify" ? language.modify : language.create}\n${language.rules}\nWrite in: ${work.language || "the language implied by the outline"}\nTarget length: about ${chapter.targetWords} words/characters.\n\n# WORK\nTitle: ${work.title}\nGenre: ${work.genre || "Unspecified"}\nPremise: ${work.premise || work.description || ""}\nStyle guide: ${work.styleGuide || "Follow the tone implied by the outline."}\nReference excerpt (imitate only high-level style, never copy phrases):\n${work.referenceExcerpt || "None provided"}\n\n# CURRENT LOCATION\nVolume ${volume?.position ?? "?"}: ${volume?.title ?? ""}\nVolume synopsis: ${volume?.synopsis ?? ""}\nChapter ${chapter.position}: ${chapter.title}\nChapter outline:\n${chapter.outline || "No outline provided; infer a restrained scene from the premise."}${revisionSection}\n\n# CHARACTERS\n${charactersText}\n\n# RELATIONSHIPS\n${relationshipsText}\n\n# WORLD & BACKGROUND\n${worldText}\n\n# TIMELINE\n${timelineText}\n\n# LOGIC CHAINS\n${logicText}\n\n# FINAL CHECK\nMake every action causally motivated. Do not contradict established facts. End with forward momentum. Output only the complete chapter prose, without a heading or commentary.`;
}
