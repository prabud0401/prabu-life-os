import { getIncomeSummary } from "../finance/service";
import { notifyNotableTransactions } from "../notifications/push";
import { applyClassificationToTransaction } from "./classifier";
import { parseEmailNotification } from "./parsers/email";
import { parseSmsAlert } from "./parsers/sms";
import { listTransactions, saveTransactions } from "./store";
import { buildScenarioAnalysis } from "./scenarios";
import { formatReconciliationMarkdown } from "./report";
import {
  isExcludedFromSummary,
  isPairedInternalTransfer,
  prepareTransactionsForSummary,
} from "./transfer-dedup";
import type {
  EmailIngestInput,
  FinancialSummary,
  FinancialTransaction,
  ReconciliationReport,
  SmsIngestInput,
} from "./types";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function summarizeTransactions(
  transactions: FinancialTransaction[],
  options: { fromDate?: string; toDate?: string } = {}
): FinancialSummary {
  let filtered = transactions;
  if (options.fromDate) filtered = filtered.filter((t) => t.date >= options.fromDate!);
  if (options.toDate) filtered = filtered.filter((t) => t.date <= options.toDate!);

  const prepared = prepareTransactionsForSummary(filtered);

  const summary: FinancialSummary = {
    salaryUsd: 0,
    salaryLkr: 0,
    livingExpensesLkr: 0,
    bankingFeesLkr: 0,
    brokerInwardLkr: 0,
    brokerOutwardLkr: 0,
    brokerPartnerPayoutLkr: 0,
    brokerNetPositionLkr: 0,
    selfTransfersLkr: 0,
    pairedSelfTransfersLkr: 0,
    duplicateTransfersExcludedLkr: 0,
    cardRepaymentsLkr: 0,
    cardPosSpendLkr: 0,
    atmWithdrawalsLkr: 0,
    loansGivenLkr: 0,
    loansReceivedLkr: 0,
    loanRepaymentsLkr: 0,
    pawnPaymentsLkr: 0,
    netPersonalSavingsLkr: 0,
    transactionCount: prepared.filter((t) => !isExcludedFromSummary(t)).length,
    periodStart: filtered.length ? filtered[filtered.length - 1].date : options.fromDate,
    periodEnd: filtered.length ? filtered[0].date : options.toDate,
  };

  for (const tx of prepared) {
    if (isExcludedFromSummary(tx)) {
      summary.duplicateTransfersExcludedLkr += tx.amountLkr;
      continue;
    }

    const amount = tx.amountLkr;
    switch (tx.transactionType) {
      case "SALARY_INFLOW":
        summary.salaryLkr += amount;
        summary.salaryUsd += tx.amountUsd || 0;
        break;
      case "PERSONAL_LIVING_EXPENSE":
        summary.livingExpensesLkr += amount;
        break;
      case "BANKING_FEE":
        summary.bankingFeesLkr += amount;
        break;
      case "BROKER_INWARD":
        summary.brokerInwardLkr += amount;
        break;
      case "BROKER_OUTWARD":
        summary.brokerOutwardLkr += amount;
        break;
      case "BROKER_PARTNER_PAYOUT":
        summary.brokerPartnerPayoutLkr += amount;
        summary.brokerOutwardLkr += amount;
        break;
      case "INTERNAL_TRANSFER":
        if (isPairedInternalTransfer(tx)) {
          summary.pairedSelfTransfersLkr += amount;
        } else {
          summary.selfTransfersLkr += amount;
        }
        break;
      case "CARD_POS_SPEND":
        summary.cardPosSpendLkr += amount;
        summary.livingExpensesLkr += amount;
        break;
      case "ATM_WITHDRAWAL":
        summary.atmWithdrawalsLkr += amount;
        summary.livingExpensesLkr += amount;
        break;
      case "LOAN_GIVEN":
        summary.loansGivenLkr += amount;
        break;
      case "LOAN_RECEIVED":
        summary.loansReceivedLkr += amount;
        break;
      case "LOAN_REPAYMENT":
        summary.loanRepaymentsLkr += amount;
        break;
      case "PAWN_PAYMENT":
        summary.pawnPaymentsLkr += amount;
        summary.livingExpensesLkr += amount;
        break;
      default:
        break;
    }
    if (tx.feeLkr) summary.bankingFeesLkr += tx.feeLkr;
  }

  summary.salaryLkr = round2(summary.salaryLkr);
  summary.salaryUsd = round2(summary.salaryUsd);
  summary.livingExpensesLkr = round2(summary.livingExpensesLkr);
  summary.bankingFeesLkr = round2(summary.bankingFeesLkr);
  summary.brokerInwardLkr = round2(summary.brokerInwardLkr);
  summary.brokerOutwardLkr = round2(summary.brokerOutwardLkr);
  summary.brokerPartnerPayoutLkr = round2(summary.brokerPartnerPayoutLkr);
  summary.brokerNetPositionLkr = round2(
    summary.brokerInwardLkr - summary.brokerOutwardLkr
  );
  summary.selfTransfersLkr = round2(summary.selfTransfersLkr);
  summary.pairedSelfTransfersLkr = round2(summary.pairedSelfTransfersLkr / 2);
  summary.duplicateTransfersExcludedLkr = round2(summary.duplicateTransfersExcludedLkr);
  summary.cardRepaymentsLkr = round2(summary.cardRepaymentsLkr);
  summary.cardPosSpendLkr = round2(summary.cardPosSpendLkr);
  summary.atmWithdrawalsLkr = round2(summary.atmWithdrawalsLkr);
  summary.loansGivenLkr = round2(summary.loansGivenLkr);
  summary.loansReceivedLkr = round2(summary.loansReceivedLkr);
  summary.loanRepaymentsLkr = round2(summary.loanRepaymentsLkr);
  summary.pawnPaymentsLkr = round2(summary.pawnPaymentsLkr);
  summary.netPersonalSavingsLkr = round2(
    summary.salaryLkr - summary.livingExpensesLkr - summary.bankingFeesLkr
  );

  return summary;
}

async function notifyInsertedTransactions(
  insertedTransactions: FinancialTransaction[]
): Promise<void> {
  if (insertedTransactions.length === 0) return;
  await notifyNotableTransactions(insertedTransactions).catch(() => {});
}

export async function ingestSmsAlert(input: SmsIngestInput) {
  const parsed = parseSmsAlert(input);
  const result = await saveTransactions(parsed);
  await notifyInsertedTransactions(result.insertedTransactions);
  return { parsed, inserted: result.inserted, skipped: result.skipped };
}

export async function ingestEmailNotification(input: EmailIngestInput) {
  const parsed = parseEmailNotification(input);
  const result = await saveTransactions(parsed);
  await notifyInsertedTransactions(result.insertedTransactions);
  return { parsed, inserted: result.inserted, skipped: result.skipped };
}

export function classifyTransaction(input: {
  description: string;
  subject?: string;
  from?: string;
  amountLkr: number;
  direction: "credit" | "debit";
  accountId?: string;
  counterparty?: string;
}): FinancialTransaction {
  return applyClassificationToTransaction({
    date: new Date().toISOString().split("T")[0],
    amountLkr: input.amountLkr,
    direction: input.direction,
    transactionType: "UNCATEGORIZED",
    description: input.description,
    source: "manual",
    accountId: input.accountId,
    counterparty: input.counterparty,
    metadata: { subject: input.subject, from: input.from },
  });
}

export async function buildReconciliationReport(options: {
  fromDate?: string;
  toDate?: string;
  includeNotionSalary?: boolean;
} = {}): Promise<ReconciliationReport> {
  const transactions = await listTransactions({
    fromDate: options.fromDate,
    toDate: options.toDate,
  });

  const prepared = prepareTransactionsForSummary(transactions);
  const summary = summarizeTransactions(transactions, options);

  if (options.includeNotionSalary !== false && summary.salaryLkr === 0) {
    try {
      const income = await getIncomeSummary({
        fromDate: options.fromDate,
        toDate: options.toDate,
      });
      summary.salaryLkr = income.totalLkr;
      summary.salaryUsd = income.totalUsd;
      summary.netPersonalSavingsLkr = round2(
        summary.salaryLkr - summary.livingExpensesLkr - summary.bankingFeesLkr
      );
    } catch {
      // keep ledger-only summary
    }
  }

  const scenarios = buildScenarioAnalysis(summary);
  const markdown = formatReconciliationMarkdown(summary, scenarios, prepared);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    scenarios,
    transactions: prepared,
    markdown,
  };
}

export async function runFinancialReconciliation(options: {
  fromDate?: string;
  toDate?: string;
  includeNotionSalary?: boolean;
} = {}) {
  return buildReconciliationReport(options);
}
