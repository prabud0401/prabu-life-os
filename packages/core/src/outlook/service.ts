import { Client } from "@microsoft/microsoft-graph-client";
import {
  getAccessToken,
  runDeviceCodeAuth,
  createGraphClient,
} from "@prabu-life-os/shared";
import { initOutlookConfig, getOutlookAuthConfig } from "./config";
import type {
  EmailSummary,
  EmailFull,
  MailFolder,
  ListEmailsOptions,
  SearchEmailsOptions,
} from "./types";

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function getOutlookGraphClient(): Promise<Client> {
  try {
    getOutlookAuthConfig();
  } catch {
    await initOutlookConfig();
  }

  const token = await getAccessToken(getOutlookAuthConfig());
  if (!token) {
    throw new Error(
      "Outlook is not authenticated. Run `npm run auth:outlook` to sign in."
    );
  }

  return createGraphClient(token);
}

export async function authenticateOutlook(): Promise<void> {
  try {
    getOutlookAuthConfig();
  } catch {
    await initOutlookConfig();
  }
  await runDeviceCodeAuth(getOutlookAuthConfig());
}

export async function listEmails(
  options: ListEmailsOptions = {}
): Promise<EmailSummary[]> {
  const client = await getOutlookGraphClient();
  const folder = options.folder || "inbox";
  const count = Math.min(Number(options.count) || 10, 50);

  let url = `/me/mailFolders/${folder}/messages?$top=${count}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments`;
  if (options.since) {
    url += `&$filter=receivedDateTime ge ${options.since}`;
  }

  const response = await client.api(url).get();
  return (response.value || []).map((m: any) => ({
    id: m.id,
    subject: m.subject || "(no subject)",
    from: m.from?.emailAddress?.address ?? "unknown",
    receivedAt: m.receivedDateTime,
    preview: m.bodyPreview || "",
    isRead: Boolean(m.isRead),
    hasAttachments: Boolean(m.hasAttachments),
  }));
}

export async function getEmail(id: string): Promise<EmailFull> {
  if (!id) {
    throw new Error("Missing required parameter: id");
  }

  const client = await getOutlookGraphClient();
  const m = await client
    .api(
      `/me/messages/${id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,isRead,hasAttachments`
    )
    .get();

  const rawBody: string = m.body?.content || "";
  const bodyText =
    m.body?.contentType === "html" ? stripHtml(rawBody) : rawBody;

  return {
    id: m.id,
    subject: m.subject || "(no subject)",
    from: m.from?.emailAddress?.address ?? "unknown",
    to: (m.toRecipients || []).map((r: any) => r.emailAddress?.address),
    cc: (m.ccRecipients || []).map((r: any) => r.emailAddress?.address),
    receivedAt: m.receivedDateTime,
    preview: bodyText.slice(0, 300),
    bodyText,
    isRead: Boolean(m.isRead),
    hasAttachments: Boolean(m.hasAttachments),
  };
}

export async function searchEmails(
  options: SearchEmailsOptions
): Promise<EmailSummary[]> {
  if (!options.query) {
    throw new Error("Missing required parameter: query");
  }

  const client = await getOutlookGraphClient();
  const count = Math.min(Number(options.count) || 10, 25);
  const response = await client
    .api(
      `/me/messages?$search="${options.query}"&$top=${count}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments`
    )
    .get();

  return (response.value || []).map((m: any) => ({
    id: m.id,
    subject: m.subject || "(no subject)",
    from: m.from?.emailAddress?.address ?? "unknown",
    receivedAt: m.receivedDateTime,
    preview: m.bodyPreview || "",
    isRead: Boolean(m.isRead),
    hasAttachments: Boolean(m.hasAttachments),
  }));
}

export async function listFolders(): Promise<MailFolder[]> {
  const client = await getOutlookGraphClient();
  const response = await client
    .api("/me/mailFolders?$select=id,displayName,unreadItemCount,totalItemCount")
    .get();

  return (response.value || []).map((f: any) => ({
    id: f.id,
    name: f.displayName,
    unreadCount: f.unreadItemCount,
    totalCount: f.totalItemCount,
  }));
}

export interface OutlookAttachmentSummary {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export async function listEmailAttachments(
  messageId: string
): Promise<OutlookAttachmentSummary[]> {
  const client = await getOutlookGraphClient();
  const response = await client
    .api(`/me/messages/${messageId}/attachments`)
    .get();

  return (response.value || [])
    .filter((attachment: any) => attachment["@odata.type"] === "#microsoft.graph.fileAttachment")
    .map((attachment: any) => ({
      id: attachment.id,
      name: attachment.name || "attachment",
      contentType: attachment.contentType || "application/octet-stream",
      size: attachment.size || 0,
    }));
}

export async function downloadEmailAttachment(
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const client = await getOutlookGraphClient();
  const attachment = await client
    .api(`/me/messages/${messageId}/attachments/${attachmentId}`)
    .get();

  if (!attachment.contentBytes) {
    throw new Error("Attachment has no downloadable content");
  }

  return Buffer.from(attachment.contentBytes, "base64");
}
