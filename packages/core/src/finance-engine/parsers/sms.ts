import { applyClassificationToTransaction } from "../classifier";
import { isBrokerClientDeposit, isRegisteredAccount } from "../accounts";
import type { FinancialTransaction, SmsIngestInput } from "../types";

function parseAmount(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

function detectBank(sender: string, text: string): string {
  const combined = `${sender} ${text}`.toUpperCase();
  if (combined.includes("PEOPLESBANK") || combined.includes("PEOPLE'S BANK")) return "People's Bank";
  if (combined.includes("COMBANK") || combined.includes("COMMERCIAL BANK")) return "Commercial Bank";
  if (combined.includes("HNB") || combined.includes("HATTON")) return "HNB";
  if (combined.includes("BOC") || combined.includes("BANK OF CEYLON")) return "BOC";
  return "Unknown";
}

function extractAccountFromSms(text: string): string | undefined {
  const match =
    text.match(/a\/c\s*(?:no\.?|#)?\s*[\*:]*(\d[\d\*]+)/i) ||
    text.match(/account\s*(?:no\.?|#)?\s*[\*:]*(\d[\d\*]+)/i);
  if (!match?.[1]) return undefined;
  const digits = match[1].replace(/\*/g, "");
  return digits.length >= 4 ? digits : undefined;
}

export function parseSmsAlert(input: SmsIngestInput): FinancialTransaction[] {
  const text = input.text.trim();
  const date = input.receivedAt
    ? input.receivedAt.split("T")[0]
    : new Date().toISOString().split("T")[0];
  const bank = detectBank(input.sender, text);
  const accountHint = extractAccountFromSms(text);

  const creditAmount = parseAmount(text, [
    /credited with LKR ([\d,]+\.\d{2})/i,
    /credited by LKR ([\d,]+\.\d{2})/i,
    /received LKR ([\d,]+\.\d{2})/i,
    /deposited LKR ([\d,]+\.\d{2})/i,
    /credit of LKR ([\d,]+\.\d{2})/i,
  ]);

  const debitAmount = parseAmount(text, [
    /debited (?:with|by) LKR ([\d,]+\.\d{2})/i,
    /debited LKR ([\d,]+\.\d{2})/i,
    /paid LKR ([\d,]+\.\d{2})/i,
    /withdrawn LKR ([\d,]+\.\d{2})/i,
    /debit of LKR ([\d,]+\.\d{2})/i,
  ]);

  const amount = creditAmount ?? debitAmount;
  if (!amount) return [];

  const direction = creditAmount ? "credit" : "debit";
  const accountId =
    accountHint && isRegisteredAccount(accountHint) ? accountHint : undefined;

  const tx = applyClassificationToTransaction({
    externalId: `sms:${date}:${input.sender}:${direction}:${amount}`,
    date,
    amountLkr: amount,
    direction,
    transactionType: "UNCATEGORIZED",
    description: text,
    source: "sms",
    accountId,
    counterparty: bank,
    metadata: { sender: input.sender, raw: text, bank },
  });

  if (tx.transactionType === "UNCATEGORIZED" && direction === "credit") {
    if (isBrokerClientDeposit(text)) {
      tx.transactionType = "BROKER_INWARD";
      tx.category = "SMS Client Deposit";
    } else if (accountId) {
      tx.transactionType = "INTERNAL_TRANSFER";
      tx.category = "SMS Transfer In";
    } else {
      tx.transactionType = "BROKER_INWARD";
      tx.category = "SMS Deposit Alert";
    }
  }

  return [tx];
}
