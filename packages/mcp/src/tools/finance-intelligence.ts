import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  classifyTransaction,
  ingestEmailNotification,
  ingestSmsAlert,
  REGISTERED_ACCOUNTS,
  runFinancialReconciliation,
} from "@prabu-life-os/core";

export const runFinancialReconciliationTool: Tool = {
  name: "run_financial_reconciliation",
  description:
    "Run full financial reconciliation across salary, living expenses, broker pass-through, fees, and inter-account transfers. Returns summary, scenario analysis (base/happy/worst), and markdown report.",
  inputSchema: {
    type: "object",
    properties: {
      fromDate: { type: "string", description: "Start date YYYY-MM-DD" },
      toDate: { type: "string", description: "End date YYYY-MM-DD" },
      includeNotionSalary: {
        type: "boolean",
        description: "Merge Wise salary totals from Notion when ledger has no salary rows (default true).",
      },
    },
  },
};

export const ingestSmsAlertTool: Tool = {
  name: "ingest_sms_alert",
  description:
    "Parse and store a bank SMS deposit alert (People's Bank, HNB, Commercial Bank, BOC). Use for mobile/Tasker webhook payloads.",
  inputSchema: {
    type: "object",
    required: ["sender", "text"],
    properties: {
      sender: { type: "string", description: "SMS sender ID (e.g. PEOPLESBANK)" },
      text: { type: "string", description: "Full SMS body text" },
      receivedAt: { type: "string", description: "ISO timestamp when SMS arrived" },
    },
  },
};

export const ingestFinanceEmailTool: Tool = {
  name: "ingest_finance_email",
  description:
    "Parse and store a finance email notification (Wise salary, bill payment, card payment, fund transfer, Google Play, Uber).",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string" },
      subject: { type: "string" },
      body: { type: "string" },
      receivedAt: { type: "string" },
      messageId: { type: "string" },
    },
  },
};

export const classifyTransactionTool: Tool = {
  name: "classify_transaction",
  description:
    "Classify a single transaction using Prabu's account rules (self-transfer net-zero, broker pass-through, living expenses, fees).",
  inputSchema: {
    type: "object",
    required: ["description", "amountLkr", "direction"],
    properties: {
      description: { type: "string" },
      subject: { type: "string" },
      from: { type: "string" },
      amountLkr: { type: "number" },
      direction: { type: "string", enum: ["credit", "debit"] },
      accountId: { type: "string" },
      counterparty: { type: "string" },
    },
  },
};

export const listRegisteredAccountsTool: Tool = {
  name: "list_registered_accounts",
  description: "List all registered bank accounts, wallets, and cards for Prabudeva Udayasooriyan.",
  inputSchema: { type: "object", properties: {} },
};

export const financeIntelligenceTools: Tool[] = [
  runFinancialReconciliationTool,
  ingestSmsAlertTool,
  ingestFinanceEmailTool,
  classifyTransactionTool,
  listRegisteredAccountsTool,
];

export async function handleFinanceIntelligenceTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "run_financial_reconciliation": {
        const report = await runFinancialReconciliation({
          fromDate: args.fromDate as string | undefined,
          toDate: args.toDate as string | undefined,
          includeNotionSalary: args.includeNotionSalary !== false,
        });
        return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
      }
      case "ingest_sms_alert": {
        const result = await ingestSmsAlert({
          sender: args.sender as string,
          text: args.text as string,
          receivedAt: args.receivedAt as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "ingest_finance_email": {
        const result = await ingestEmailNotification({
          from: args.from as string | undefined,
          subject: args.subject as string | undefined,
          body: args.body as string | undefined,
          receivedAt: args.receivedAt as string | undefined,
          messageId: args.messageId as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "classify_transaction": {
        const tx = classifyTransaction({
          description: args.description as string,
          subject: args.subject as string | undefined,
          from: args.from as string | undefined,
          amountLkr: Number(args.amountLkr),
          direction: args.direction as "credit" | "debit",
          accountId: args.accountId as string | undefined,
          counterparty: args.counterparty as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(tx, null, 2) }] };
      }
      case "list_registered_accounts": {
        return {
          content: [{ type: "text", text: JSON.stringify(REGISTERED_ACCOUNTS, null, 2) }],
        };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown finance intelligence tool: ${name}` }],
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
