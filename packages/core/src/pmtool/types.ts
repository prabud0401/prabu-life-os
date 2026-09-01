export interface PmTask {
  id: string | number;
  title: string;
  status?: string;
  project?: string;
  sprint?: string;
  assignee?: string;
  description?: string;
  priority?: string;
  deadline?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PmTaskFilter {
  status?: string;
  project?: string;
  sprint?: string;
  assignee?: string;
  query?: string;
  limit?: number;
}

export interface PmToolConfig {
  baseUrl: string;
  mcpUrl?: string;
  token?: string;
}
