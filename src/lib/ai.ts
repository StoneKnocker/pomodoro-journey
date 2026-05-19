import type { AiConfig } from "./types";

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

export async function generateAiText(config: AiConfig, prompt: string): Promise<string> {
  if (!hasAiConfig(config)) {
    throw new Error("AI 配置不完整");
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
          content: "你是一个严谨的工作记录助手，只基于用户提供的番茄钟记录总结。"
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
    throw new Error(`AI 请求失败：${response.status}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI 返回内容为空");
  }
  return content;
}
