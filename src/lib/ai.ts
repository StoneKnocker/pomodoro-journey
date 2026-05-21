import type { AiConfig } from "./types";
import type { Language } from "./i18n";
import { reportSystemPrompt } from "./i18n";

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export function hasAiConfig(config: AiConfig): boolean {
  return Boolean(config.baseUrl.trim() && config.apiKey.trim() && config.model.trim());
}

export async function generateAiText(config: AiConfig, prompt: string, lang: Language): Promise<string> {
  if (!hasAiConfig(config)) {
    throw new Error("AI configuration is incomplete");
  }

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: reportSystemPrompt(lang)
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI returned empty content");
  }
  return content;
}
