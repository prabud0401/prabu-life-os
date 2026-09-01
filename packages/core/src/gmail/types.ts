export interface GmailCredentials {
  access_token?: string;
  refresh_token: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  [key: string]: unknown;
}

export interface GmailOAuthKeys {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}
