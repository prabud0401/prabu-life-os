import { downloadAttachment } from "../gmail/service";
import {
  downloadEmailAttachment,
  listEmailAttachments,
} from "../outlook/service";
import { ingestBankStatementPdf } from "./parsers/pdf";

function isPdfAttachment(filename: string, mimeType?: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    mimeType?.toLowerCase() === "application/pdf" ||
    mimeType?.toLowerCase() === "application/x-pdf"
  );
}

export async function ingestPdfAttachmentsFromGmailMessage(message: {
  id: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    attachmentId: string;
  }>;
}): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const attachment of message.attachments || []) {
    if (!isPdfAttachment(attachment.filename, attachment.mimeType)) {
      continue;
    }

    try {
      const buffer = await downloadAttachment({
        messageId: message.id,
        attachmentId: attachment.attachmentId,
      });
      const result = await ingestBankStatementPdf({ pdfBuffer: buffer });
      inserted += result.inserted;
      skipped += result.skipped;
    } catch (err) {
      errors.push(`${attachment.filename}: ${(err as Error).message}`);
    }
  }

  return { inserted, skipped, errors };
}

export async function ingestPdfAttachmentsFromOutlookMessage(message: {
  id: string;
  hasAttachments?: boolean;
}): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  if (!message.hasAttachments) {
    return { inserted, skipped, errors };
  }

  const attachments = await listEmailAttachments(message.id);

  for (const attachment of attachments) {
    if (!isPdfAttachment(attachment.name, attachment.contentType)) {
      continue;
    }

    try {
      const buffer = await downloadEmailAttachment(message.id, attachment.id);
      const result = await ingestBankStatementPdf({ pdfBuffer: buffer });
      inserted += result.inserted;
      skipped += result.skipped;
    } catch (err) {
      errors.push(`${attachment.name}: ${(err as Error).message}`);
    }
  }

  return { inserted, skipped, errors };
}
