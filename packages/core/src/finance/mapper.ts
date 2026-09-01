import type { NotionPageSummary, NotionTransactionInput } from "../notion/types";
import type { WiseTransfer } from "./types";

export function extractTransferIdFromText(
  name?: string,
  notes?: string,
  transferId?: string
): string | undefined {
  if (transferId?.trim()) {
    return transferId.trim();
  }

  const combined = `${name || ""} ${notes || ""}`;
  const match = combined.match(/#([0-9]{6,12})/);
  return match ? match[1] : undefined;
}

export function buildNotionInputFromTransfer(
  transfer: WiseTransfer
): NotionTransactionInput {
  return {
    name: transfer.name,
    date: transfer.date,
    amount: transfer.amount,
    currency: "USD",
    type: transfer.type,
    category: transfer.category,
    source: transfer.source,
    notes: transfer.notes,
    transferId: transfer.transferNumber,
    amountLkr: transfer.amountLkr,
  };
}

export function mapNotionPageToTransfer(page: NotionPageSummary): WiseTransfer {
  const transferId = extractTransferIdFromText(
    page.name,
    page.notes,
    page.transferId
  );

  const lkrFromNotes = page.notes?.match(/LKR\s*([0-9,.]+)/i);
  const amountLkr =
    page.amountLkr ??
    (page.currency === "LKR" && page.amount && page.amount > 2000
      ? page.amount
      : lkrFromNotes
      ? parseFloat(lkrFromNotes[1].replace(/,/g, ""))
      : undefined);

  const rateMatch = page.notes?.match(/Rate:\s*1\s*USD\s*=\s*([0-9,.]+)\s*LKR/i);
  const rate = rateMatch ? parseFloat(rateMatch[1].replace(/,/g, "")) : undefined;

  let amountUsd = page.amount || 0;
  if (page.currency === "LKR") {
    if (page.amount && page.amount > 2000) {
      amountUsd = rate
        ? Math.round((page.amount / rate) * 100) / 100
        : Math.round((page.amount / 303.02) * 100) / 100;
    } else if (page.amount && page.amount < 2000) {
      // Legacy mislabeled rows stored USD in Amount with Currency=LKR
      amountUsd = page.amount;
    }
  }

  const resolvedLkr =
    amountLkr ??
    (rate
      ? Math.round(amountUsd * rate * 100) / 100
      : undefined);

  return {
    name: page.name,
    type: "Income",
    category: (page.category as WiseTransfer["category"]) || "Salary",
    source: (page.source as WiseTransfer["source"]) || "Outlook",
    amount: amountUsd,
    currency: "USD",
    amountLkr: resolvedLkr,
    rate,
    date: page.date || "",
    notes: page.notes || "",
    transferNumber: transferId,
  };
}

export function needsNotionRepair(
  page: NotionPageSummary,
  canonical?: WiseTransfer
): boolean {
  if (!canonical) {
    return false;
  }

  const hasTransferId = Boolean(
    page.transferId?.trim() || extractTransferIdFromText(page.name, page.notes)
  );
  const currencyWrong = page.currency !== "USD";
  const amountLkrMissing = page.amountLkr == null;
  const transferIdMissing = !page.transferId?.trim();
  const amountMismatch =
    page.amount != null &&
    Math.abs((page.amount || 0) - canonical.amount) > 0.01 &&
    page.currency === "USD";

  return (
    currencyWrong ||
    amountLkrMissing ||
    transferIdMissing ||
    !hasTransferId ||
    amountMismatch
  );
}
