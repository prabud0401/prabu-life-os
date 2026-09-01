import type { FinancialTransaction } from "./types";

const PAIR_DATE_WINDOW_DAYS = 3;
const DEDUP_AMOUNT_TOLERANCE = 0.01;

function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return 999;
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= DEDUP_AMOUNT_TOLERANCE;
}

/**
 * Pair internal-transfer debits with matching credits (same amount, within date window).
 * Marks paired rows in metadata so summary counts each transfer once.
 */
export function pairInternalTransfers(
  transactions: FinancialTransaction[]
): FinancialTransaction[] {
  const result = transactions.map((tx) => ({ ...tx, metadata: { ...tx.metadata } }));
  const debits = result
    .map((tx, idx) => ({ tx, idx }))
    .filter(
      ({ tx }) =>
        tx.transactionType === "INTERNAL_TRANSFER" &&
        tx.direction === "debit" &&
        !tx.metadata?.pairedWith
    );
  const credits = result
    .map((tx, idx) => ({ tx, idx }))
    .filter(
      ({ tx }) =>
        tx.transactionType === "INTERNAL_TRANSFER" &&
        tx.direction === "credit" &&
        !tx.metadata?.pairedWith
    );

  for (const debit of debits) {
    const match = credits.find(
      ({ tx, idx }) =>
        !result[idx].metadata?.pairedWith &&
        amountsMatch(tx.amountLkr, debit.tx.amountLkr) &&
        daysBetween(tx.date, debit.tx.date) <= PAIR_DATE_WINDOW_DAYS
    );
    if (!match) continue;

    const pairId = `pair:${debit.tx.date}:${debit.tx.amountLkr}`;
    result[debit.idx].metadata = {
      ...result[debit.idx].metadata,
      pairedWith: match.tx.externalId || match.tx.id || String(match.idx),
      transferPairId: pairId,
    };
    result[match.idx].metadata = {
      ...result[match.idx].metadata,
      pairedWith: debit.tx.externalId || debit.tx.id || String(debit.idx),
      transferPairId: pairId,
    };
  }

  return result;
}

/**
 * Detect cross-source duplicates (same amount, direction, date from email+pdf+sms).
 * Marks duplicates so they are excluded from summary totals.
 */
export function markCrossSourceDuplicates(
  transactions: FinancialTransaction[]
): FinancialTransaction[] {
  const result = transactions.map((tx) => ({ ...tx, metadata: { ...tx.metadata } }));
  const seen = new Map<string, number>();

  for (let i = 0; i < result.length; i++) {
    const tx = result[i];
    if (tx.metadata?.isDuplicate) continue;

    const fingerprint = `${tx.date}|${tx.direction}|${tx.amountLkr.toFixed(2)}|${tx.transactionType}`;
    const existingIdx = seen.get(fingerprint);

    if (existingIdx !== undefined) {
      const existing = result[existingIdx];
      if (existing.source !== tx.source) {
        result[i].metadata = {
          ...result[i].metadata,
          isDuplicate: true,
          duplicateOf: existing.externalId || existing.id || String(existingIdx),
        };
        continue;
      }
    }

    seen.set(fingerprint, i);
  }

  return result;
}

export function prepareTransactionsForSummary(
  transactions: FinancialTransaction[]
): FinancialTransaction[] {
  const paired = pairInternalTransfers(transactions);
  return markCrossSourceDuplicates(paired);
}

export function isExcludedFromSummary(tx: FinancialTransaction): boolean {
  return Boolean(tx.metadata?.isDuplicate);
}

export function isPairedInternalTransfer(tx: FinancialTransaction): boolean {
  return Boolean(tx.metadata?.pairedWith);
}
