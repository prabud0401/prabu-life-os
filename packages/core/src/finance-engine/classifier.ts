import { isBrokerCounterparty, isRegisteredAccount } from "./accounts";
import type { FinancialTransaction, TransactionType } from "./types";

const UTILITY_KEYWORDS = [
  "ceb",
  "electricity",
  "nwsdb",
  "water board",
  "dialog fixed",
  "dialog broadband",
  "dialog mobile",
  "dialog postpaid",
];

const SUBSCRIPTION_KEYWORDS = [
  "google play",
  "google ai pro",
  "youtube premium",
  "uber one",
  "netflix",
  "spotify",
];

const TRANSPORT_KEYWORDS = ["uber", "pickme", "pick me"];

const BROKER_OUTWARD_KEYWORDS = ["udaya broker", "udaya", "broker"];

export function classifyDescription(input: {
  description: string;
  subject?: string;
  from?: string;
  amountLkr: number;
  direction: "credit" | "debit";
  accountId?: string;
  counterparty?: string;
}): { transactionType: TransactionType; category?: string; feeLkr?: number } {
  const text = `${input.subject || ""} ${input.description} ${input.counterparty || ""}`.toLowerCase();
  const from = (input.from || "").toLowerCase();

  if (
    (input.subject?.includes("Transfer sent") && from.includes("blueoceansp")) ||
    from.includes("wise.com") ||
    text.includes("wise transfer")
  ) {
    return { transactionType: "SALARY_INFLOW", category: "Salary" };
  }

  if (input.subject?.includes("Bill Payment") || UTILITY_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Utilities & Bills" };
  }

  if (SUBSCRIPTION_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Subscriptions" };
  }

  if (TRANSPORT_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Transport" };
  }

  if (input.subject?.includes("Card Payment") || text.includes("card payment")) {
    return { transactionType: "CARD_REPAYMENT", category: "Credit Card Settlement" };
  }

  if (
    input.subject?.includes("Fund transfer") &&
    (BROKER_OUTWARD_KEYWORDS.some((k) => text.includes(k)) || text.includes("broker"))
  ) {
    return { transactionType: "BROKER_OUTWARD", category: "Broker Disbursement" };
  }

  if (
    text.includes("cash dep") ||
    text.includes("charles place") ||
    text.includes("rental fee") ||
    isBrokerCounterparty(text)
  ) {
    return { transactionType: "BROKER_INWARD", category: "Client Deposit" };
  }

  if (text.includes("justpay") && input.direction === "debit") {
    return { transactionType: "INTERNAL_TRANSFER", category: "Self Transfer" };
  }

  if (
    input.counterparty &&
    isRegisteredAccount(input.counterparty) &&
    input.accountId &&
    isRegisteredAccount(input.accountId)
  ) {
    return { transactionType: "INTERNAL_TRANSFER", category: "Self Transfer" };
  }

  if (input.direction === "debit" && text.includes("fee")) {
    return { transactionType: "BANKING_FEE", category: "Banking Fee" };
  }

  if (input.direction === "debit") {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "General Spend" };
  }

  return { transactionType: "UNCATEGORIZED" };
}

export function applyClassificationToTransaction(
  tx: FinancialTransaction
): FinancialTransaction {
  const classified = classifyDescription({
    description: tx.description,
    subject: typeof tx.metadata?.subject === "string" ? tx.metadata.subject : undefined,
    from: typeof tx.metadata?.from === "string" ? tx.metadata.from : undefined,
    amountLkr: tx.amountLkr,
    direction: tx.direction,
    accountId: tx.accountId,
    counterparty: tx.counterparty,
  });

  return {
    ...tx,
    transactionType: classified.transactionType,
    category: classified.category,
    feeLkr: classified.feeLkr ?? tx.feeLkr,
  };
}
