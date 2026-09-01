export interface EmailSummary {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  preview: string;
  isRead: boolean;
  hasAttachments: boolean;
}

export interface EmailFull extends EmailSummary {
  to: string[];
  cc: string[];
  bodyText: string;
}

export interface MailFolder {
  id: string;
  name: string;
  unreadCount: number;
  totalCount: number;
}

export interface ListEmailsOptions {
  folder?: string;
  count?: number;
  since?: string;
}

export interface SearchEmailsOptions {
  query: string;
  count?: number;
}
