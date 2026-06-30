/**
 * Enhetlig AI-klient — väljer Azure OpenAI eller OpenRouter automatiskt.
 */
import {
  chatDeployment,
  openRouterModel,
  resolveAiProvider,
  type AiProvider,
} from "@/lib/ai/config";
import { azureChatCompletion, azureEmbedText } from "@/lib/ai/azure-openai";
import {
  chatCompletion as openRouterChat,
  embedText as openRouterEmbed,
} from "@/lib/ai/openrouter";

export { isAiConfigured, resolveAiProvider } from "@/lib/ai/config";
export type { AiProvider };

export type ChatKind = "default" | "bible" | "write" | "moderation" | "digest";

function requireProvider(): AiProvider {
  const p = resolveAiProvider();
  if (!p) throw new Error("Ingen AI-provider konfigurerad (Azure OpenAI eller OpenRouter)");
  return p;
}

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  kind: ChatKind = "default"
): Promise<string> {
  const provider = requireProvider();
  if (provider === "azure") {
    return azureChatCompletion(messages, chatDeployment(kind));
  }
  return openRouterChat(messages, openRouterModel(kind));
}

export async function embedText(input: string | string[]): Promise<number[][]> {
  const provider = requireProvider();
  if (provider === "azure") {
    const deployment = process.env.AZURE_OPENAI_EMBED_DEPLOYMENT || "text-embedding-3-small";
    return azureEmbedText(input, deployment);
  }
  return openRouterEmbed(input, openRouterModel("embed"));
}
