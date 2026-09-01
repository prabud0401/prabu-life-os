import { searchMessages, readMessage } from "../gmail/service";
import { ingestEmailNotification } from "./engine";

const FINANCE_QUERIES = [
  'subject:"Bill Payment"',
  'subject:"Card Payment"',
  'subject:"Fund transfer"',
  'from:brbangalore@blueoceansp.ai subject:"Transfer sent"',
];

export async function syncFinanceEmailsFromGmail(options: {
  maxPerQuery?: number;
  since?: string;
} = {}): Promise<{
  inserted: number;
  skipped: number;
  messagesProcessed: number;
  errors: string[];
}> {
  const maxPerQuery = options.maxPerQuery ?? 15;
  const errors: string[] = [];
  let inserted = 0;
  let skipped = 0;
  let messagesProcessed = 0;
  const seenIds = new Set<string>();

  for (const baseQuery of FINANCE_QUERIES) {
    const query = options.since
      ? `${baseQuery} after:${options.since.replace(/-/g, "/")}`
      : baseQuery;

    try {
      const result = await searchMessages({ query, maxResults: maxPerQuery });

      for (const msg of result.messages) {
        if (seenIds.has(msg.id)) continue;
        seenIds.add(msg.id);
        messagesProcessed++;

        try {
          const full = await readMessage({ messageId: msg.id });
          const ingest = await ingestEmailNotification({
            from: full.from,
            subject: full.subject,
            body: full.body || full.htmlBody,
            messageId: msg.id,
            receivedAt: full.date,
          });
          inserted += ingest.inserted;
          skipped += ingest.skipped;
        } catch (err) {
          errors.push(`Message ${msg.id}: ${(err as Error).message}`);
        }
      }
    } catch (err) {
      errors.push(`Query "${query}": ${(err as Error).message}`);
    }
  }

  return { inserted, skipped, messagesProcessed, errors };
}
