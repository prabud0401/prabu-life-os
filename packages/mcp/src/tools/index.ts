import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { outlookTools, handleOutlookTool } from "./outlook";
import { financeTools, handleFinanceTool } from "./finance";
import { pmToolTools, handlePmToolTool } from "./pmtool";
import { teamsTools, handleTeamsTool } from "./teams";
import { gmailTools, handleGmailTool } from "./gmail";
import { financeIntelligenceTools, handleFinanceIntelligenceTool } from "./finance-intelligence";

export const allTools: Tool[] = [
  ...outlookTools,
  ...financeTools,
  ...financeIntelligenceTools,
  ...teamsTools,
  ...pmToolTools,
  ...gmailTools,
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

  // Financial Intelligence Agent tools
  if (financeIntelligenceTools.some((t) => t.name === name)) {
    return handleFinanceIntelligenceTool(name, args);
  }

  // Teams tools
  if (teamsTools.some((t) => t.name === name)) {
    return handleTeamsTool(name, args);
  }

  // PM Tool tools
  if (pmToolTools.some((t) => t.name === name)) {
    return handlePmToolTool(name, args);
  }

  // Gmail tools
  if (gmailTools.some((t) => t.name === name)) {
    return handleGmailTool(name, args);
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
export * from "./gmail";
export * from "./finance-intelligence";

