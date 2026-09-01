import { applyClassificationToTransaction } from "../classifier";
import type { FinancialTransaction, SmsIngestInput } from "../types";

function parseCreditAmount(text: string): number | null {
  const patterns = [
    /credited with LKR ([\d,]+\.\d{2})/i,
    /credited by LKR ([\d,]+\.\d{2})/i,
    /received LKR ([\d,]+\.\d{2})/i,
    /deposited LKR ([\d,]+\.\d{2})/i,
  ];
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

export function parseSmsAlert(input: SmsIngestInput): FinancialTransaction[] {
  const amount = parseCreditAmount(input.text);
  if (!amount) return [];

  const bank = detectBank(input.sender, input.text);
  const date = input.receivedAt
    ? input.receivedAt.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const tx = applyClassificationToTransaction({
    externalId: `sms:${date}:${input.sender}:${amount}`,
    date,
    amountLkr: amount,
    direction: "credit",
    transactionType: "UNCATEGORIZED",
    description: input.text.trim(),
    source: "sms",
    counterparty: bank,
    metadata: { sender: input.sender, raw: input.text },
  });

  if (tx.transactionType === "UNCATEGORIZED") {
    tx.transactionType = "BROKER_INWARD";
    tx.category = "SMS Deposit Alert";
  }

  return [tx];
}
