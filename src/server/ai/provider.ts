export type AiMessage = { role: "system" | "user"; content: string };

export type AiCompletion = {
  provider: string;
  model: string;
  text: string;
};

export interface AiProvider {
  id: string;
  complete(messages: AiMessage[]): Promise<AiCompletion>;
}

export function getAiProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) return openAiProvider;
  if (process.env.ANTHROPIC_API_KEY) return anthropicProvider;
  return heuristicProvider;
}

const heuristicProvider: AiProvider = {
  id: "heuristic",
  async complete(messages) {
    const last = messages[messages.length - 1]?.content || "";
    return {
      provider: "heuristic",
      model: "rules-v1",
      text: `Heuristic summary (no LLM key configured).\n\n${last.slice(0, 800)}\n\nTreat every conclusion as reviewable. Do not convert inferences into facts.`,
    };
  },
};

const openAiProvider: AiProvider = {
  id: "openai",
  async complete(messages) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages,
        temperature: 0.2,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[]; model: string };
    return { provider: "openai", model: data.model, text: data.choices[0]?.message.content || "" };
  },
};

const anthropicProvider: AiProvider = {
  id: "anthropic",
  async complete(messages) {
    const system = messages.find((m) => m.role === "system")?.content;
    const user = messages.filter((m) => m.role === "user");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system,
        messages: user,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const data = (await res.json()) as { content: { text: string }[]; model: string };
    return { provider: "anthropic", model: data.model, text: data.content[0]?.text || "" };
  },
};
