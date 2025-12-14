/**
 * AI要約プロンプトテンプレート
 * 3つの要約スタイル（short, medium, long）に対応
 */

export type SummarizeLevel = "short" | "medium" | "long";

interface PromptTemplate {
  system: string;
  user: (content: string, language: "ja" | "en") => string;
}

/**
 * 要約プロンプトテンプレート
 */
export const SUMMARIZE_PROMPTS: Record<SummarizeLevel, PromptTemplate> = {
  short: {
    system: `You are a professional summarization assistant. Generate concise, accurate summaries.
Follow these rules:
- Extract the main point ONLY
- Be extremely concise (1-2 sentences max)
- Focus on the core idea
- Do not add your own opinions
- Maintain the original language (Japanese or English)`,
    user: (content: string, language: "ja" | "en") => {
      if (language === "ja") {
        return `以下のノートの内容を1〜2文で要約してください。最も重要なポイントだけを抽出してください。

ノート内容:
${content}

要約:`;
      } else {
        return `Summarize the following note in 1-2 sentences. Extract only the most important point.

Note content:
${content}

Summary:`;
      }
    },
  },

  medium: {
    system: `You are a professional summarization assistant. Generate balanced, informative summaries.
Follow these rules:
- Include main points and supporting details
- Keep it concise but informative (3-5 sentences)
- Organize information logically
- Do not add your own opinions
- Maintain the original language (Japanese or English)`,
    user: (content: string, language: "ja" | "en") => {
      if (language === "ja") {
        return `以下のノートの内容を3〜5文で要約してください。主要なポイントと重要な詳細を含めてください。

ノート内容:
${content}

要約:`;
      } else {
        return `Summarize the following note in 3-5 sentences. Include main points and important details.

Note content:
${content}

Summary:`;
      }
    },
  },

  long: {
    system: `You are a professional summarization assistant. Generate comprehensive, structured summaries.
Follow these rules:
- Include all major points and key details
- Organize with bullet points or sections if needed
- Preserve important context and nuances
- Keep it informative (5-10 sentences or bullets)
- Do not add your own opinions
- Maintain the original language (Japanese or English)`,
    user: (content: string, language: "ja" | "en") => {
      if (language === "ja") {
        return `以下のノートの内容を包括的に要約してください。主要なポイントと重要な詳細をすべて含め、必要に応じて箇条書きや段落で構成してください。

ノート内容:
${content}

要約:`;
      } else {
        return `Provide a comprehensive summary of the following note. Include all major points and key details, organizing with bullet points or paragraphs as needed.

Note content:
${content}

Summary:`;
      }
    },
  },
};

/**
 * 言語検出（簡易版）
 * 日本語文字が含まれていれば日本語、なければ英語
 */
export function detectLanguage(text: string): "ja" | "en" {
  const japaneseRegex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/;
  return japaneseRegex.test(text) ? "ja" : "en";
}

/**
 * プロンプト生成
 */
export function generateSummarizePrompt(
  content: string,
  level: SummarizeLevel,
): { system: string; user: string } {
  const language = detectLanguage(content);
  const template = SUMMARIZE_PROMPTS[level];

  return {
    system: template.system,
    user: template.user(content, language),
  };
}
