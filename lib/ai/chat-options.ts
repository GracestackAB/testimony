export type ChatOptions = {
  temperature?: number;
  maxTokens?: number;
};

export const CHAT_DEFAULTS: Required<ChatOptions> = {
  temperature: 0.3,
  maxTokens: 1200,
};
