import { stripHtml } from "../outlook/service";
import type { WiseTransfer } from "./types";

export function parseWiseEmail(message: any): WiseTransfer | null {
  const rawBody: string = message.body?.content || "";
  const bodyText = message.body?.contentType === "html" ? stripHtml(rawBody) : rawBody;
  const subject: string = message.subject || "";

  // Extract Transfer Number (#XXXXXXXXXX)
  let transferNumber: string | undefined = undefined;
  const tnMatch =
    bodyText.match(/Transfer\s+Number:\s*#?([0-9]+)/i) ||
    subject.match(/#([0-9]+)/) ||
    bodyText.match(/#([0-9]{8,12})/);
  if (tnMatch) {
    transferNumber = tnMatch[1];
  }

  // Extract LKR amount
  let amountLkr: number | undefined = undefined;
  const lkrMatch =
    bodyText.match(/([0-9,.]+)\s*LKR\s*(?:is\s*now\s*in|is\s*on\s*its\s*way)/i) ||
    bodyText.match(/([0-9,.]+)\s*LKR/i);
  if (lkrMatch) {
    amountLkr = parseFloat(lkrMatch[1].replace(/,/g, ""));
  }

  // Extract Exchange Rate
  let rate: number | undefined = undefined;
  const rateMatch =
    bodyText.match(/Rate:\s*1\s*USD\s*=\s*([0-9,.]+)\s*LKR/i) ||
    bodyText.match(/(?:The\s+rate\s+was\s+)?1\s*USD\s*=\s*([0-9,.]+)\s*LKR/i);
  if (rateMatch) {
    rate = parseFloat(rateMatch[1].replace(/,/g, ""));
  }

  // Extract Fee
  let feeUsd: number | undefined = undefined;
  const feeMatch = bodyText.match(
    /(?:Wise\s+fee|our\s+fee\s+was):\s*([0-9,.]+)\s*USD/i
  );
  if (feeMatch) {
    feeUsd = parseFloat(feeMatch[1].replace(/,/g, ""));
  }

  // Extract USD amount
  let amountUsd: number | undefined = undefined;
  const usdMatch = bodyText.match(/Amount:\s*([0-9,.]+)\s*USD/i);
  if (usdMatch) {
    amountUsd = parseFloat(usdMatch[1].replace(/,/g, ""));
  } else if (amountLkr && rate) {
    amountUsd = Math.round((amountLkr / rate) * 100) / 100;
  }

  // If we could not extract an amount or transfer number, this might not be a valid transfer email
  if (amountUsd === undefined && amountLkr === undefined && !transferNumber) {
    return null;
  }

  // Determine Category: Bonus or Salary
  const isBonus =
    /year-end|appreciation|bonus|new year/i.test(subject) ||
    /year-end|appreciation|bonus|new year/i.test(bodyText) ||
    (message.receivedDateTime && message.receivedDateTime.startsWith("2026-01-01"));
  const category: "Salary" | "Bonus" = isBonus ? "Bonus" : "Salary";

  // Date formatted as YYYY-MM-DD
  const dateStr = message.receivedDateTime
    ? message.receivedDateTime.split("T")[0]
    : new Date().toISOString().split("T")[0];

  const name = `${category} — Wise #${transferNumber || "Unknown"}`;
  const notesParts = [
    amountLkr
      ? `LKR ${amountLkr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
      : null,
    transferNumber ? `Transfer #${transferNumber}.` : null,
    rate ? `Rate: 1 USD = ${rate} LKR.` : null,
    `Barath FW.`,
  ];
  const notes = notesParts.filter(Boolean).join(" ");

  return {
    transferNumber,
    name,
    type: "Income",
    category,
    source: "Outlook",
    amount: amountUsd || 0,
    currency: "USD",
    amountLkr,
    rate,
    feeUsd,
    date: dateStr,
    notes,
    emailId: message.id,
    receivedAt: message.receivedDateTime,
    subject,
  };
}

export function getHistoricalFirstPayment(): WiseTransfer {
  return {
    transferNumber: "20250804",
    name: "Salary — Initial Payment (Aug 2025)",
    type: "Income",
    category: "Salary",
    source: "Outlook",
    amount: 200.17,
    currency: "USD",
    amountLkr: 60657,
    rate: 303.02,
    date: "2025-08-04",
    notes:
      "Initial payments: 2,482 LKR test + 58,175 LKR main = 60,657 LKR (~$200.17). Earned 89h 18m @ $2.50/hr = $223.25. Outlook email ref 2025-08-04.",
  };
}
