export type TransactionDirection = "credit" | "debit";

export type TransactionType =
  | "SALARY_INFLOW"
  | "INTERNAL_TRANSFER"
  | "BROKER_INWARD"
  | "BROKER_OUTWARD"
  | "BROKER_PARTNER_PAYOUT"
  | "PERSONAL_LIVING_EXPENSE"
  | "BANKING_FEE"
  | "CARD_REPAYMENT"
  | "CARD_POS_SPEND"
  | "ATM_WITHDRAWAL"
  | "LOAN_GIVEN"
  | "LOAN_RECEIVED"
  | "LOAN_REPAYMENT"
  | "PAWN_PAYMENT"
  | "UNCATEGORIZED";

export type DataSource =
  | "gmail"
  | "outlook"
  | "sms"
  | "mobile"
  | "manual"
  | "notion"
  | "statement_pdf";

export interface FinancialTransaction {
  id?: string;
  externalId?: string;
  date: string;
  amountLkr: number;
  amountUsd?: number;
  direction: TransactionDirection;
  transactionType: TransactionType;
  category?: string;
  description: string;
  source: DataSource;
  accountId?: string;
  counterparty?: string;
  feeLkr?: number;
  metadata?: Record<string, unknown>;
}

export interface FinancialSummary {
  salaryUsd: number;
  salaryLkr: number;
  livingExpensesLkr: number;
  bankingFeesLkr: number;
  brokerInwardLkr: number;
  brokerOutwardLkr: number;
  brokerPartnerPayoutLkr: number;
  brokerNetPositionLkr: number;
  selfTransfersLkr: number;
  pairedSelfTransfersLkr: number;
  duplicateTransfersExcludedLkr: number;
  cardRepaymentsLkr: number;
  cardPosSpendLkr: number;
  atmWithdrawalsLkr: number;
  loansGivenLkr: number;
  loansReceivedLkr: number;
  loanRepaymentsLkr: number;
  pawnPaymentsLkr: number;
  netPersonalSavingsLkr: number;
  transactionCount: number;
  periodStart?: string;
  periodEnd?: string;
}

export interface ScenarioAssumptions {
  salaryMultiplier: number;
  expenseMultiplier: number;
  feeMultiplier: number;
  salaryDelayDays?: number;
  unexpectedExpenseLkr?: number;
}

export interface ScenarioResult {
  scenario: "base" | "happy" | "worst";
  label: string;
  assumptions: ScenarioAssumptions;
  projectedSalaryLkr: number;
  projectedExpensesLkr: number;
  projectedFeesLkr: number;
  projectedNetSavingsLkr: number;
  notes: string[];
}

export interface ReconciliationReport {
  generatedAt: string;
  summary: FinancialSummary;
  scenarios: ScenarioResult[];
  transactions: FinancialTransaction[];
  markdown: string;
}

export interface SmsIngestInput {
  sender: string;
  text: string;
  receivedAt?: string;
}

export interface EmailIngestInput {
  from?: string;
  subject?: string;
  body?: string;
  receivedAt?: string;
  messageId?: string;
}
