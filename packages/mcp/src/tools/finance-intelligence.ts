import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  classifyTransaction,
  ingestBankStatementPdf,
  ingestEmailNotification,
  ingestSmsAlert,
  REGISTERED_ACCOUNTS,
  runFinancialReconciliation,
  syncFinanceEmailsFromGmail,
  syncFinanceEmailsFromOutlook,
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

export const ingestBankStatementPdfTool: Tool = {
  name: "ingest_bank_statement_pdf",
  description:
    "Parse and store an encrypted or plain bank statement PDF (HNB, BOC, People's Bank, Commercial Bank). Auto-uses known default passwords (HNB: 028020612034, BOC: 7861).",
  inputSchema: {
    type: "object",
    required: ["base64Pdf"],
    properties: {
      base64Pdf: {
        type: "string",
        description: "Base64 encoded string of the bank statement PDF file",
      },
      bank: {
        type: "string",
        enum: ["HNB", "BOC", "PEOPLESBANK", "COMMERCIAL", "AUTO"],
        description: "Bank identifier (default: AUTO)",
      },
      password: {
        type: "string",
        description: "Optional custom password if different from default account password",
      },
      accountId: {
        type: "string",
        description: "Optional account number override",
      },
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

export const syncFinanceEmailsFromGmailTool: Tool = {
  name: "sync_finance_emails_from_gmail",
  description:
    "Search Gmail for People's Bank bill payments, card payments, fund transfers, and Wise salary emails; parse and store them in the financial intelligence ledger.",
  inputSchema: {
    type: "object",
    properties: {
      maxPerQuery: { type: "number", description: "Max messages per search query (default 15)" },
      since: { type: "string", description: "Only emails after YYYY-MM-DD" },
    },
  },
};

export const syncFinanceEmailsFromOutlookTool: Tool = {
  name: "sync_finance_emails_from_outlook",
  description:
    "Search Outlook for People's Pay bill payments, card payments, fund transfers, and Wise salary emails; parse and store them in the financial intelligence ledger.",
  inputSchema: {
    type: "object",
    properties: {
      maxPerQuery: { type: "number", description: "Max messages per search query (default 15)" },
      since: { type: "string", description: "Only emails after YYYY-MM-DD" },
    },
  },
};

export const financeIntelligenceTools: Tool[] = [
  runFinancialReconciliationTool,
  ingestSmsAlertTool,
  ingestFinanceEmailTool,
  ingestBankStatementPdfTool,
  classifyTransactionTool,
  listRegisteredAccountsTool,
  syncFinanceEmailsFromGmailTool,
  syncFinanceEmailsFromOutlookTool,
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
      case "ingest_bank_statement_pdf": {
        const result = await ingestBankStatementPdf({
          base64Pdf: args.base64Pdf as string,
          bank: args.bank as any,
          password: args.password as string | undefined,
          accountId: args.accountId as string | undefined,
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
      case "sync_finance_emails_from_gmail": {
        const result = await syncFinanceEmailsFromGmail({
          maxPerQuery:
            args.maxPerQuery !== undefined ? Number(args.maxPerQuery) : undefined,
          since: args.since as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "sync_finance_emails_from_outlook": {
        const result = await syncFinanceEmailsFromOutlook({
          maxPerQuery:
            args.maxPerQuery !== undefined ? Number(args.maxPerQuery) : undefined,
          since: args.since as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
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
