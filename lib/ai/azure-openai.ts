/**
 * Azure OpenAI — chat + embeddings via deployment-namn.
 */

const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-08-01-preview";

function endpoint(): string {
  const base = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, "");
  if (!base) throw new Error("AZURE_OPENAI_ENDPOINT saknas");
  return base;
}

function apiKey(): string {
  const key = process.env.AZURE_OPENAI_API_KEY;
  if (!key) throw new Error("AZURE_OPENAI_API_KEY saknas");
  return key;
}

function deploymentUrl(deployment: string, path: "chat/completions" | "embeddings"): string {
  return `${endpoint()}/openai/deployments/${encodeURIComponent(deployment)}/${path}?api-version=${API_VERSION}`;
}

export async function azureChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  deployment: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const res = await fetch(deploymentUrl(deployment, "chat/completions"), {
    method: "POST",
    headers: {
      "api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1200,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure OpenAI chat ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

export async function azureEmbedText(
  input: string | string[],
  deployment: string
): Promise<number[][]> {
  const res = await fetch(deploymentUrl(deployment, "embeddings"), {
    method: "POST",
    headers: {
      "api-key": apiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure OpenAI embed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  return (json.data || []).map((d) => d.embedding);
}
