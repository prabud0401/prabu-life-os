import { applyClassificationToTransaction } from "../classifier";
import type { EmailIngestInput, FinancialTransaction } from "../types";

function parseAmount(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  return parseFloat(match[1].replace(/,/g, ""));
}

function todayFromInput(receivedAt?: string): string {
  if (receivedAt) return receivedAt.split("T")[0];
  return new Date().toISOString().split("T")[0];
}

export function parseEmailNotification(input: EmailIngestInput): FinancialTransaction[] {
  const body = input.body || "";
  const subject = input.subject || "";
  const from = input.from || "";
  const date = todayFromInput(input.receivedAt);
  const baseMeta = { subject, from, messageId: input.messageId };
  const results: FinancialTransaction[] = [];

  if (subject.includes("Transfer sent") && from.toLowerCase().includes("blueoceansp")) {
    const amtUsd = parseAmount(body, /\$([\d,]+\.\d{2})/);
    const amtLkr =
      parseAmount(body, /LKR\s*([\d,]+\.\d{2})/i) ||
      parseAmount(body, /([\d,]+\.\d{2})\s*LKR/i);
    if (amtLkr) {
      results.push(
        applyClassificationToTransaction({
          externalId: input.messageId ? `email:${input.messageId}` : undefined,
          date,
          amountLkr: amtLkr,
          amountUsd: amtUsd ?? undefined,
          direction: "credit",
          transactionType: "SALARY_INFLOW",
          category: "Salary",
          description: subject || "Wise salary transfer",
          source: from.toLowerCase().includes("gmail") ? "gmail" : "outlook",
          metadata: baseMeta,
        })
      );
    }
    return results;
  }

  if (subject.includes("Bill Payment")) {
    const amt = parseAmount(body, /Amount LKR:\s*([\d,]+\.\d{2})/i);
    if (amt) {
      results.push(
        applyClassificationToTransaction({
          externalId: input.messageId ? `email:${input.messageId}` : undefined,
          date,
          amountLkr: amt,
          direction: "debit",
          transactionType: "PERSONAL_LIVING_EXPENSE",
          description: subject,
          source: "gmail",
          metadata: baseMeta,
        })
      );
    }
    return results;
  }

  if (subject.includes("Card Payment")) {
    const amt = parseAmount(body, /Amount LKR:\s*([\d,]+\.\d{2})/i);
    const fee = parseAmount(body, /Fees.*LKR:\s*([\d,]+\.\d{2})/i) ?? 0;
    if (amt) {
      results.push(
        applyClassificationToTransaction({
          externalId: input.messageId ? `email:${input.messageId}:card` : undefined,
          date,
          amountLkr: amt,
          direction: "debit",
          transactionType: "CARD_REPAYMENT",
          description: subject,
          source: "gmail",
          accountId: "4544885475",
          feeLkr: fee,
          metadata: baseMeta,
        })
      );
      if (fee > 0) {
        results.push({
          externalId: input.messageId ? `email:${input.messageId}:fee` : undefined,
          date,
          amountLkr: fee,
          direction: "debit",
          transactionType: "BANKING_FEE",
          category: "Transfer Fee",
          description: `Card payment fee — ${subject}`,
          source: "gmail",
          metadata: baseMeta,
        });
      }
    }
    return results;
  }

  if (subject.includes("Fund transfer")) {
    const amt = parseAmount(body, /Amount LKR:\s*([\d,]+\.\d{2})/i);
    const fee = parseAmount(body, /Fees.*LKR:\s*([\d,]+\.\d{2})/i) ?? 0;
    if (amt) {
      const classified = applyClassificationToTransaction({
        externalId: input.messageId ? `email:${input.messageId}` : undefined,
        date,
        amountLkr: amt,
        direction: "debit",
        transactionType: "UNCATEGORIZED",
        description: body.slice(0, 200) || subject,
        source: "gmail",
        feeLkr: fee,
        metadata: baseMeta,
      });
      results.push(classified);
      if (fee > 0) {
        results.push({
          externalId: input.messageId ? `email:${input.messageId}:fee` : undefined,
          date,
          amountLkr: fee,
          direction: "debit",
          transactionType: "BANKING_FEE",
          category: "Transfer Fee",
          description: `Fund transfer fee — ${subject}`,
          source: "gmail",
          metadata: baseMeta,
        });
      }
    }
    return results;
  }

  if (/google play|uber/i.test(subject) || /google play|uber/i.test(body)) {
    const amt =
      parseAmount(body, /(?:LKR|රු\.)\s*([\d,]+\.\d{2})/i) ||
      parseAmount(body, /Amount LKR:\s*([\d,]+\.\d{2})/i);
    if (amt) {
      results.push(
        applyClassificationToTransaction({
          externalId: input.messageId ? `email:${input.messageId}` : undefined,
          date,
          amountLkr: amt,
          direction: "debit",
          transactionType: "PERSONAL_LIVING_EXPENSE",
          description: subject || body.slice(0, 120),
          source: "gmail",
          metadata: baseMeta,
        })
      );
    }
  }

  return results;
}
