import {
  extractAccountNumbersFromText,
  findRegisteredAccountId,
  isBrokerClientDeposit,
  isBrokerPartnerPayout,
  isCreditCardAccount,
  isLikelyBrokerOutward,
  isLoanTransaction,
  isRegisteredAccount,
  isSelfTransferDescription,
} from "./accounts";
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
  "mobitel",
  "slt",
];

const SUBSCRIPTION_KEYWORDS = [
  "google play",
  "google ai pro",
  "youtube premium",
  "uber one",
  "netflix",
  "spotify",
  "apple.com",
  "icloud",
];

const TRANSPORT_KEYWORDS = ["uber trip", "uber *", "pickme", "pick me"];

const PAWN_KEYWORDS = [
  "pawn",
  "pawning",
  "lombard",
  "gold loan",
  "jewellery loan",
  "රත්න",
  "සොල්විත",
  "pledge",
  "gold release",
];

const ATM_KEYWORDS = ["atm withdrawal", "atm wdl", "atm cash", "cash withdrawal", "atm dr"];

const CARD_MERCHANT_KEYWORDS = ["pos ", "card purchase", "merchant", "visa purchase", "mastercard"];

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
  const accountIdsInText = extractAccountNumbersFromText(
    `${input.description} ${input.counterparty || ""} ${input.accountId || ""}`
  );

  const counterpartyIsOwnAccount =
    Boolean(input.counterparty) && isRegisteredAccount(input.counterparty!);
  const accountIsOwn = Boolean(input.accountId) && isRegisteredAccount(input.accountId!);
  const transferToOwnCard =
    input.direction === "debit" &&
    (isCreditCardAccount(input.counterparty) ||
      accountIdsInText.some((id) => isCreditCardAccount(id)) ||
      text.includes("4544885475"));

  // 1. Salary / Wise inflow
  if (
    (input.subject?.includes("Transfer sent") && from.includes("blueoceansp")) ||
    from.includes("wise.com") ||
    text.includes("wise transfer") ||
    text.includes("salary inward") ||
    (input.direction === "credit" && text.includes("salary") && !isBrokerClientDeposit(text))
  ) {
    return { transactionType: "SALARY_INFLOW", category: "Salary" };
  }

  // 2. Banking fees
  if (
    input.direction === "debit" &&
    (text.includes("fee") ||
      text.includes("cefts") ||
      text.includes("justpay fee") ||
      text.includes("transfer charge") ||
      (input.amountLkr <= 25 && text.includes("charge")))
  ) {
    return { transactionType: "BANKING_FEE", category: "Transfer Fee" };
  }

  // 3. Broker partner split payouts
  if (input.direction === "debit" && isBrokerPartnerPayout(text)) {
    return { transactionType: "BROKER_PARTNER_PAYOUT", category: "Broker Partner Split" };
  }

  // 4. Broker outward
  if (input.direction === "debit" && isLikelyBrokerOutward(text)) {
    return { transactionType: "BROKER_OUTWARD", category: "Broker Disbursement" };
  }

  // 5. Broker inward
  if (
    input.direction === "credit" &&
    (isBrokerClientDeposit(text) || text.includes("cash dep") || text.includes("cdm"))
  ) {
    return { transactionType: "BROKER_INWARD", category: "Client Deposit" };
  }

  // 6. Credit card top-up (bank → card)
  if (transferToOwnCard && !text.includes("pos") && !text.includes("merchant")) {
    return { transactionType: "CARD_REPAYMENT", category: "Credit Card Top-up" };
  }
  if (input.subject?.includes("Card Payment") || text.includes("card payment")) {
    return { transactionType: "CARD_REPAYMENT", category: "Credit Card Settlement" };
  }

  // 7. Inter-account self-transfers (both sides must be own registered accounts)
  if (
    input.direction === "debit" &&
    (isSelfTransferDescription(text) ||
      (counterpartyIsOwnAccount && accountIsOwn) ||
      (accountIdsInText.length >= 2))
  ) {
    return { transactionType: "INTERNAL_TRANSFER", category: "Self Transfer" };
  }
  if (input.direction === "credit" && accountIsOwn && counterpartyIsOwnAccount) {
    return { transactionType: "INTERNAL_TRANSFER", category: "Self Transfer In" };
  }

  // 8. Card POS spend
  if (
    input.direction === "debit" &&
    (CARD_MERCHANT_KEYWORDS.some((k) => text.includes(k)) ||
      (isCreditCardAccount(input.accountId) && !transferToOwnCard))
  ) {
    return { transactionType: "CARD_POS_SPEND", category: "Card Purchase" };
  }

  // 9. ATM withdrawal
  if (input.direction === "debit" && ATM_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "ATM_WITHDRAWAL", category: "Cash Withdrawal" };
  }

  // 10. Pawn / gold
  if (input.direction === "debit" && PAWN_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PAWN_PAYMENT", category: "Pawn / Gold" };
  }

  // 11. Personal loans
  if (isLoanTransaction(text)) {
    if (input.direction === "debit") {
      if (text.includes("repay") || text.includes("pay back") || text.includes("return loan")) {
        return { transactionType: "LOAN_REPAYMENT", category: "Loan Repayment" };
      }
      return { transactionType: "LOAN_GIVEN", category: "Loan to Friend" };
    }
    if (text.includes("repay") || text.includes("pay back")) {
      return { transactionType: "LOAN_REPAYMENT", category: "Loan Recovery" };
    }
    return { transactionType: "LOAN_RECEIVED", category: "Loan from Friend" };
  }

  // 12. Living expenses
  if (input.subject?.includes("Bill Payment") || UTILITY_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Utilities & Bills" };
  }
  if (SUBSCRIPTION_KEYWORDS.some((k) => text.includes(k))) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Subscriptions" };
  }
  if (TRANSPORT_KEYWORDS.some((k) => text.includes(k)) || text.includes("uber")) {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "Transport" };
  }

  // 13. Credit to own account (internal transfer in)
  if (input.direction === "credit") {
    const ownAccount = findRegisteredAccountId(text) || (accountIsOwn ? input.accountId : undefined);
    if (ownAccount && !isBrokerClientDeposit(text) && !text.includes("salary")) {
      return { transactionType: "INTERNAL_TRANSFER", category: "Self Transfer In" };
    }
  }

  // 14. Generic debit
  if (input.direction === "debit") {
    return { transactionType: "PERSONAL_LIVING_EXPENSE", category: "General Spend" };
  }

  // 15. Large unidentified credits → broker deposit
  if (input.direction === "credit" && input.amountLkr >= 10000) {
    return { transactionType: "BROKER_INWARD", category: "Unidentified Deposit" };
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
    category: classified.category ?? tx.category,
    feeLkr: classified.feeLkr ?? tx.feeLkr,
  };
}
