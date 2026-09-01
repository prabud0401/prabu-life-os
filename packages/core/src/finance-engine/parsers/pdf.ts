import { applyClassificationToTransaction } from "../classifier";
import { saveTransactions } from "../store";
import type { FinancialTransaction } from "../types";
import { notifyNotableTransactions } from "../../notifications/push";

export interface BankStatementPdfInput {
  base64Pdf?: string;
  pdfBuffer?: Buffer | Uint8Array;
  rawText?: string;
  bank?: "HNB" | "BOC" | "PEOPLESBANK" | "COMMERCIAL" | "AUTO";
  password?: string;
  accountId?: string;
}

export const BANK_DEFAULT_PASSWORDS: Record<string, string> = {
  HNB: "028020612034",
  BOC: "7861",
};

export const BANK_DEFAULT_ACCOUNTS: Record<string, string> = {
  HNB: "028020612034",
  BOC: "00007861",
  PEOPLESBANK: "045200160086967",
};

function normalizeDate(dStr: string): string {
  const clean = dStr.trim();
  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, "0");
    const day = ymd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  // Match DD-MMM-YYYY (e.g. 15-AUG-2025)
  const dMmmY = clean.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);
  if (dMmmY) {
    const day = dMmmY[1].padStart(2, "0");
    const monthStr = dMmmY[2].toLowerCase();
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const month = months[monthStr] || "01";
    return `${dMmmY[3]}-${month}-${day}`;
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}

function parseNumber(val?: string): number | null {
  if (!val) return null;
  const sanitized = val.replace(/,/g, "").trim();
  const num = parseFloat(sanitized);
  return Number.isNaN(num) ? null : num;
}

/**
 * Extract raw text from a PDF Buffer with optional password
 */
export async function extractTextFromPdfBuffer(
  buffer: Buffer | Uint8Array,
  password?: string
): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    password: password || undefined,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const textPieces: string[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str || "")
      .join(" ");
    textPieces.push(pageText);
  }

  return textPieces.join("\n");
}

/**
 * Parse statement text for Hatton National Bank (HNB)
 */
export function parseHnbStatementText(
  text: string,
  accountId = BANK_DEFAULT_ACCOUNTS.HNB
): FinancialTransaction[] {
  const lines = text.split(/\r?\n/);
  const transactions: FinancialTransaction[] = [];
  let seq = 0;

  // Regex looking for date patterns: DD/MM/YYYY or DD-MM-YYYY or DD-MMM-YYYY
  const dateRegex = /\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})\b/;
  const amountPattern = /([\d,]+\.\d{2})/g;

  for (const rawLine of lines) {
    const dateMatch = rawLine.match(dateRegex);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const date = normalizeDate(dateStr);

    // Extract all numeric amounts from the line
    const amounts = Array.from(rawLine.matchAll(amountPattern)).map((m) =>
      parseNumber(m[1])
    ).filter((n): n is number => n !== null);

    if (amounts.length === 0) continue;

    seq++;
    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | undefined;

    // Typically: [debit|credit, balance] or [debit, credit, balance]
    const isCredit = /\b(?:CR|CREDIT|DEP|DEPOSIT|SALARY|INWARD|INTEREST|DIVIDEND)\b/i.test(rawLine);
    const isDebit = /\b(?:DR|DEBIT|WDL|WITHDRAWAL|PAYMENT|CHQ|ATM|POS|FEE|BILL)\b/i.test(rawLine);

    if (amounts.length >= 2) {
      balance = amounts[amounts.length - 1];
      const transAmount = amounts[amounts.length - 2];

      if (isCredit && !isDebit) {
        credit = transAmount;
      } else if (isDebit && !isCredit) {
        debit = transAmount;
      } else if (isCredit) {
        credit = transAmount;
      } else {
        debit = transAmount;
      }
    } else {
      const transAmount = amounts[0];
      if (isCredit) {
        credit = transAmount;
      } else {
        debit = transAmount;
      }
    }

    const direction = credit != null && credit > 0 ? "credit" : "debit";
    const amountLkr = direction === "credit" ? (credit || 0) : (debit || 0);
    if (amountLkr <= 0) continue;

    // Clean description from line by stripping dates and amounts
    const description = rawLine
      .replace(dateRegex, "")
      .replace(amountPattern, "")
      .replace(/\s+/g, " ")
      .trim() || `HNB statement entry ${date}`;

    const tx: FinancialTransaction = {
      externalId: `pdf:hnb:${date}:${amountLkr}:${direction}:${seq}`,
      date,
      amountLkr,
      direction,
      transactionType: "UNCATEGORIZED",
      description,
      source: "statement_pdf",
      accountId,
      metadata: { bank: "HNB", balance, rawLine },
    };

    transactions.push(applyClassificationToTransaction(tx));
  }

  return transactions;
}

/**
 * Parse statement text for Bank of Ceylon (BOC)
 */
export function parseBocStatementText(
  text: string,
  accountId = BANK_DEFAULT_ACCOUNTS.BOC
): FinancialTransaction[] {
  const lines = text.split(/\r?\n/);
  const transactions: FinancialTransaction[] = [];
  let seq = 0;

  const dateRegex = /\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2}|\d{2}-[A-Za-z]{3}-\d{4})\b/;
  const amountPattern = /([\d,]+\.\d{2})/g;

  for (const rawLine of lines) {
    const dateMatch = rawLine.match(dateRegex);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const date = normalizeDate(dateStr);

    const amounts = Array.from(rawLine.matchAll(amountPattern)).map((m) =>
      parseNumber(m[1])
    ).filter((n): n is number => n !== null);

    if (amounts.length === 0) continue;

    seq++;
    let debit: number | null = null;
    let credit: number | null = null;
    let balance: number | undefined;

    const isCredit = /\b(?:CR|CREDIT|DEP|DEPOSIT|SALARY|INWARD|INTEREST|DIVIDEND)\b/i.test(rawLine);
    const isDebit = /\b(?:DR|DEBIT|WDL|WITHDRAWAL|ATM|POS|FEE|CHQ|BILL)\b/i.test(rawLine);

    if (amounts.length >= 2) {
      balance = amounts[amounts.length - 1];
      const transAmount = amounts[amounts.length - 2];

      if (isCredit && !isDebit) {
        credit = transAmount;
      } else if (isDebit && !isCredit) {
        debit = transAmount;
      } else if (isCredit) {
        credit = transAmount;
      } else {
        debit = transAmount;
      }
    } else {
      const transAmount = amounts[0];
      if (isCredit) {
        credit = transAmount;
      } else {
        debit = transAmount;
      }
    }

    const direction = credit != null && credit > 0 ? "credit" : "debit";
    const amountLkr = direction === "credit" ? (credit || 0) : (debit || 0);
    if (amountLkr <= 0) continue;

    const description = rawLine
      .replace(dateRegex, "")
      .replace(amountPattern, "")
      .replace(/\s+/g, " ")
      .trim() || `BOC statement entry ${date}`;

    const tx: FinancialTransaction = {
      externalId: `pdf:boc:${date}:${amountLkr}:${direction}:${seq}`,
      date,
      amountLkr,
      direction,
      transactionType: "UNCATEGORIZED",
      description,
      source: "statement_pdf",
      accountId,
      metadata: { bank: "BOC", balance, rawLine },
    };

    transactions.push(applyClassificationToTransaction(tx));
  }

  return transactions;
}

/**
 * Universal PDF Bank Statement Parser
 */
export async function parseBankStatementPdf(
  input: BankStatementPdfInput
): Promise<FinancialTransaction[]> {
  let statementText = input.rawText || "";

  if (!statementText && (input.base64Pdf || input.pdfBuffer)) {
    const buffer = input.pdfBuffer
      ? input.pdfBuffer
      : Buffer.from(input.base64Pdf!, "base64");

    const requestedBank = (input.bank || "AUTO").toUpperCase();
    const password =
      input.password ||
      BANK_DEFAULT_PASSWORDS[requestedBank] ||
      undefined;

    statementText = await extractTextFromPdfBuffer(buffer, password);
  }

  if (!statementText.trim()) {
    return [];
  }

  const requestedBank = (input.bank || "AUTO").toUpperCase();
  let detectedBank = requestedBank;

  if (detectedBank === "AUTO") {
    if (/hatton|hnb/i.test(statementText)) {
      detectedBank = "HNB";
    } else if (/bank of ceylon|\bboc\b/i.test(statementText)) {
      detectedBank = "BOC";
    } else {
      detectedBank = "HNB"; // Default
    }
  }

  if (detectedBank === "BOC") {
    return parseBocStatementText(statementText, input.accountId);
  }

  return parseHnbStatementText(statementText, input.accountId);
}

/**
 * Ingest PDF Statement directly into financial ledger
 */
export async function ingestBankStatementPdf(input: BankStatementPdfInput): Promise<{
  parsed: FinancialTransaction[];
  inserted: number;
  skipped: number;
}> {
  const parsed = await parseBankStatementPdf(input);
  const result = await saveTransactions(parsed);

  if (parsed.length > 0) {
    // Notify on notable transactions asynchronously
    notifyNotableTransactions(parsed).catch(() => {});
  }

  return { parsed, ...result };
}
