/** AI-provider: Azure OpenAI (prod) eller OpenRouter (fallback). */

export type AiProvider = "azure" | "openrouter";

export function resolveAiProvider(): AiProvider | null {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "azure" || explicit === "openrouter") return explicit;

  if (process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
    return "azure";
  }
  if (process.env.OPENROUTER_API_KEY) {
    return "openrouter";
  }
  return null;
}

/** True om minst en AI-provider är konfigurerad. */
export function isAiConfigured(): boolean {
  return resolveAiProvider() !== null;
}

export function chatDeployment(kind: "default" | "bible" | "write" | "moderation" | "digest"): string {
  const byKind: Record<string, string | undefined> = {
    bible: process.env.AZURE_OPENAI_BIBLE_DEPLOYMENT,
    write: process.env.AZURE_OPENAI_WRITE_DEPLOYMENT,
    moderation: process.env.AZURE_OPENAI_MODERATION_DEPLOYMENT,
    digest: process.env.AZURE_OPENAI_DIGEST_DEPLOYMENT,
  };
  return (
    byKind[kind] ||
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ||
    "gpt-4.1-mini"
  );
}

/** Stronger model for Bibel-AI professor mode (falls back to bible deployment). */
export function chatProfessorDeployment(): string {
  return (
    process.env.AZURE_OPENAI_BIBLE_PROFESSOR_DEPLOYMENT ||
    process.env.AZURE_OPENAI_BIBLE_DEPLOYMENT ||
    process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ||
    "gpt-4.1-mini"
  );
}

export function openRouterModel(
  kind: "default" | "bible" | "write" | "moderation" | "digest" | "embed"
): string {
  const map: Record<string, string | undefined> = {
    bible: process.env.OPENROUTER_BIBLE_MODEL,
    write: process.env.OPENROUTER_WRITE_MODEL,
    moderation: process.env.OPENROUTER_MODERATION_MODEL,
    digest: process.env.OPENROUTER_DIGEST_MODEL,
    embed: process.env.OPENROUTER_EMBED_MODEL,
  };
  const defaults: Record<string, string> = {
    default: "openai/gpt-4o-mini",
    bible: "openai/gpt-4o-mini",
    write: "openai/gpt-4o-mini",
    moderation: "openai/gpt-4o-mini",
    digest: "openai/gpt-4o-mini",
    embed: "openai/text-embedding-3-small",
  };
  return map[kind] || process.env.OPENROUTER_CHAT_MODEL || defaults[kind];
}

export function openRouterProfessorModel(): string {
  return (
    process.env.OPENROUTER_BIBLE_PROFESSOR_MODEL ||
    process.env.OPENROUTER_BIBLE_MODEL ||
    "openai/gpt-4o"
  );
}
