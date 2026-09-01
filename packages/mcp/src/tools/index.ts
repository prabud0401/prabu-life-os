import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { outlookTools, handleOutlookTool } from "./outlook";

export const allTools: Tool[] = [
  ...outlookTools,
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Outlook tools
  if (outlookTools.some((t) => t.name === name)) {
    return handleOutlookTool(name, args);
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}

export * from "./outlook";
