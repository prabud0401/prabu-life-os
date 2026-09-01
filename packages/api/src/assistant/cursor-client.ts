import { Agent } from "@cursor/sdk";
import type { SDKAgent } from "@cursor/sdk";
import { buildAssistantContext } from "./context";
import { FINANCE_ASSISTANT_SYSTEM_PROMPT } from "./prompt";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatResult {
  reply: string;
  model: string;
  durationMs?: number;
}

function getCursorApiKey(): string {
  const key = process.env.CURSOR_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "CURSOR_API_KEY is not configured. Set it in Railway or your local .env file."
    );
  }
  return key;
}

function getCursorModel(): string {
  return process.env.CURSOR_MODEL?.trim() || "composer-2.5";
}

let activeAgent: SDKAgent | null = null;
let activeAgentPromise: Promise<SDKAgent> | null = null;

async function getOrCreateAgent(): Promise<SDKAgent> {
  if (activeAgent) {
    return activeAgent;
  }

  if (!activeAgentPromise) {
    activeAgentPromise = Agent.create({
      apiKey: getCursorApiKey(),
      model: { id: getCursorModel() },
      cloud: {},
    }).then((agent) => {
      activeAgent = agent;
      return agent;
    });
  }

  return activeAgentPromise;
}

export async function resetAssistantSession(): Promise<void> {
  if (activeAgent) {
    activeAgent.close();
  }
  activeAgent = null;
  activeAgentPromise = null;
}

function buildPrompt(
  userMessage: string,
  history: AssistantChatMessage[],
  liveContext: string
): string {
  const recentHistory = history
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .slice(-6)
    .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
    .join("\n\n");

  const historyBlock = recentHistory ? `\n\n## Recent conversation\n${recentHistory}\n` : "";

  return `${FINANCE_ASSISTANT_SYSTEM_PROMPT}

${liveContext}
${historyBlock}

## Current user question
${userMessage}

Respond as the Financial Intelligence Agent. Use markdown with bold numbers and bullet points where helpful.`;
}

export function isCursorAssistantConfigured(): boolean {
  return Boolean(process.env.CURSOR_API_KEY?.trim());
}

export async function askCursorAssistant(
  userMessage: string,
  history: AssistantChatMessage[] = [],
  options: { resetSession?: boolean } = {}
): Promise<AssistantChatResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    throw new Error("message is required");
  }

  if (options.resetSession) {
    await resetAssistantSession();
  }

  const liveContext = await buildAssistantContext();
  const prompt = buildPrompt(trimmed, history, liveContext);
  const agent = await getOrCreateAgent();
  const startedAt = Date.now();

  try {
    const run = await agent.send(prompt);
    const result = await run.wait();

    if (result.status !== "finished") {
      throw new Error(`Cursor assistant run ended with status: ${result.status}`);
    }

    const reply = (result.result || "").trim();
    if (!reply) {
      throw new Error("Cursor assistant returned an empty response");
    }

    return {
      reply,
      model: getCursorModel(),
      durationMs: Date.now() - startedAt,
    };
  } catch (err) {
    await resetAssistantSession();
    throw err;
  }
}
