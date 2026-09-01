import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { outlookTools, handleOutlookTool } from "./outlook";
import { financeTools, handleFinanceTool } from "./finance";
import { pmToolTools, handlePmToolTool } from "./pmtool";
import { teamsTools, handleTeamsTool } from "./teams";

export const allTools: Tool[] = [
  ...outlookTools,
  ...financeTools,
  ...teamsTools,
  ...pmToolTools,
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  // Outlook tools
  if (outlookTools.some((t) => t.name === name)) {
    return handleOutlookTool(name, args);
  }

  // Finance tools
  if (financeTools.some((t) => t.name === name)) {
    return handleFinanceTool(name, args);
  }

  // Teams tools
  if (teamsTools.some((t) => t.name === name)) {
    return handleTeamsTool(name, args);
  }

  // PM Tool tools
  if (pmToolTools.some((t) => t.name === name)) {
    return handlePmToolTool(name, args);
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}

export * from "./outlook";
export * from "./finance";
export * from "./pmtool";
export * from "./teams";

