import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  syncSalaryToNotion,
  getIncomeSummary,
} from "@prabu-life-os/core";

export const syncSalaryToNotionTool: Tool = {
  name: "sync_salary_to_notion",
  description:
    "Fetch salary transfer emails (Wise forwards from Barath in Outlook), parse amounts/transfer IDs, and sync them to Notion Transactions database with deduplication.",
  inputSchema: {
    type: "object",
    properties: {
      dryRun: {
        type: "boolean",
        description:
          "If true (default), returns parsed transfers and preview without writing to Notion. Set to false to insert rows into Notion.",
      },
      force: {
        type: "boolean",
        description:
          "If true, bypasses Notion duplicate check and inserts all found transfers.",
      },
      since: {
        type: "string",
        description:
          "Only sync transfers on or after this date (ISO format YYYY-MM-DD).",
      },
      count: {
        type: "number",
        description: "Maximum number of transfers to process.",
      },
    },
  },
};

export const getIncomeSummaryTool: Tool = {
  name: "get_income_summary",
  description:
    "Get an aggregated income summary (lifetime totals in USD & LKR, transfer counts, Salary vs Bonus breakdown, and monthly statistics).",
  inputSchema: {
    type: "object",
    properties: {
      fromDate: {
        type: "string",
        description: "Filter summary from this date (YYYY-MM-DD).",
      },
      toDate: {
        type: "string",
        description: "Filter summary up to this date (YYYY-MM-DD).",
      },
    },
  },
};

export const financeTools: Tool[] = [
  syncSalaryToNotionTool,
  getIncomeSummaryTool,
];

export async function handleFinanceTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "sync_salary_to_notion": {
        const dryRun = args.dryRun !== false; // defaults to true unless explicitly false
        const force = Boolean(args.force);
        const since = args.since as string | undefined;
        const count = args.count !== undefined ? Number(args.count) : undefined;

        const result = await syncSalaryToNotion({
          dryRun,
          force,
          since,
          count,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_income_summary": {
        const fromDate = args.fromDate as string | undefined;
        const toDate = args.toDate as string | undefined;

        const summary = await getIncomeSummary({ fromDate, toDate });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown finance tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: (err as Error).message }],
      isError: true,
    };
  }
}
