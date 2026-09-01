import { searchEmails, getEmail } from "../outlook/service";
import { ingestEmailNotification } from "./engine";
import { ingestPdfAttachmentsFromOutlookMessage } from "./sync-attachments";

const FINANCE_QUERIES = [
  "Bill Payment",
  "Card Payment",
  "Fund transfer",
  "Transfer sent",
  "statement attachment:pdf",
];

export async function syncFinanceEmailsFromOutlook(options: {
  maxPerQuery?: number;
  since?: string;
} = {}): Promise<{
  inserted: number;
  skipped: number;
  messagesProcessed: number;
  pdfInserted: number;
  pdfSkipped: number;
  errors: string[];
}> {
  const maxPerQuery = options.maxPerQuery ?? 15;
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;
  let pdfInserted = 0;
  let pdfSkipped = 0;
  let messagesProcessed = 0;
  const seenIds = new Set<string>();

  for (const query of FINANCE_QUERIES) {
    try {
      const messages = await searchEmails({
        query,
        count: maxPerQuery,
      });

      for (const msg of messages) {
        if (seenIds.has(msg.id)) continue;
        seenIds.add(msg.id);

        if (options.since && msg.receivedAt && msg.receivedAt < options.since) {
          continue;
        }

        messagesProcessed++;

        try {
          const full = await getEmail(msg.id);
          const ingest = await ingestEmailNotification({
            from: full.from,
            subject: full.subject,
            body: full.bodyText,
            messageId: full.id,
            receivedAt: full.receivedAt,
          });
          inserted += ingest.inserted;
          skipped += ingest.skipped;

          const pdfResult = await ingestPdfAttachmentsFromOutlookMessage({
            id: full.id,
            hasAttachments: full.hasAttachments,
          });
          pdfInserted += pdfResult.inserted;
          pdfSkipped += pdfResult.skipped;
          errors.push(...pdfResult.errors);
        } catch (err) {
          errors.push(`Message ${msg.id}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors.push(`Query "${query}": ${(err as Error).message}`);
    }
  }

  return {
    inserted,
    skipped,
    messagesProcessed,
    pdfInserted,
    pdfSkipped,
    errors,
  };
}
