/**
 * Enhetlig AI-klient — väljer Azure OpenAI eller OpenRouter automatiskt.
 */
import {
  chatDeployment,
  chatProfessorDeployment,
  openRouterModel,
  openRouterProfessorModel,
  resolveAiProvider,
  type AiProvider,
} from "@/lib/ai/config";
import { azureChatCompletion, azureEmbedText } from "@/lib/ai/azure-openai";
import {
  chatCompletion as openRouterChat,
  embedText as openRouterEmbed,
} from "@/lib/ai/openrouter";
import type { ChatOptions } from "@/lib/ai/chat-options";

export { isAiConfigured, resolveAiProvider } from "@/lib/ai/config";
export type { AiProvider };
export type { ChatOptions };

export type ChatKind = "default" | "bible" | "bible-professor" | "write" | "moderation" | "digest";

function requireProvider(): AiProvider {
  const p = resolveAiProvider();
  if (!p) throw new Error("Ingen AI-provider konfigurerad (Azure OpenAI eller OpenRouter)");
  return p;
}

function resolveModel(kind: ChatKind): string {
  if (kind === "bible-professor") return openRouterProfessorModel();
  if (kind === "bible") return openRouterModel("bible");
  if (kind === "write") return openRouterModel("write");
  if (kind === "moderation") return openRouterModel("moderation");
  if (kind === "digest") return openRouterModel("digest");
  return openRouterModel("default");
}

function resolveAzureDeployment(kind: ChatKind): string {
  if (kind === "bible-professor") return chatProfessorDeployment();
  if (kind === "bible") return chatDeployment("bible");
  if (kind === "write") return chatDeployment("write");
  if (kind === "moderation") return chatDeployment("moderation");
  if (kind === "digest") return chatDeployment("digest");
  return chatDeployment("default");
}

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  kind: ChatKind = "default",
  options?: ChatOptions
): Promise<string> {
  const provider = requireProvider();
  if (provider === "azure") {
    return azureChatCompletion(messages, resolveAzureDeployment(kind), options);
  }
  return openRouterChat(messages, resolveModel(kind), options);
}

export async function embedText(input: string | string[]): Promise<number[][]> {
  const provider = requireProvider();
  if (provider === "azure") {
    const deployment = process.env.AZURE_OPENAI_EMBED_DEPLOYMENT || "text-embedding-3-small";
    return azureEmbedText(input, deployment);
  }
  return openRouterEmbed(input, openRouterModel("embed"));
}
