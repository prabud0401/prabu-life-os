import { getPmToolConfig, isPmToolConfigured } from "./config";
import type { PmTask, PmTaskFilter } from "./types";
import { logger } from "@prabu-life-os/shared";

function getHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function listMyTasks(filter: PmTaskFilter = {}): Promise<PmTask[]> {
  const config = getPmToolConfig();
  if (!config.token) {
    throw new Error(
      "PM_MCP_TOKEN is not configured. Please set PM_MCP_TOKEN in your environment or .env file."
    );
  }

  const queryParams = new URLSearchParams();
  if (filter.status) queryParams.set("status", filter.status);
  if (filter.project) queryParams.set("project", filter.project);
  if (filter.sprint) queryParams.set("sprint", filter.sprint);
  if (filter.assignee) queryParams.set("assignee", filter.assignee);
  if (filter.limit) queryParams.set("limit", String(filter.limit));

  const url = `${config.baseUrl}/tasks${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(config.token),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PM Tool API request failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.tasks)) {
      return data.tasks;
    }
    if (Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (err) {
    logger.error(`Error fetching tasks from PM tool: ${(err as Error).message}`);
    throw err;
  }
}

export async function getTask(taskId: string | number): Promise<PmTask> {
  const config = getPmToolConfig();
  if (!config.token) {
    throw new Error(
      "PM_MCP_TOKEN is not configured. Please set PM_MCP_TOKEN in your environment or .env file."
    );
  }

  const url = `${config.baseUrl}/tasks/${encodeURIComponent(String(taskId))}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(config.token),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PM Tool API request failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    return (data.task || data) as PmTask;
  } catch (err) {
    logger.error(`Error fetching task ${taskId} from PM tool: ${(err as Error).message}`);
    throw err;
  }
}

export async function searchTasks(query: string, project?: string): Promise<PmTask[]> {
  const config = getPmToolConfig();
  if (!config.token) {
    throw new Error(
      "PM_MCP_TOKEN is not configured. Please set PM_MCP_TOKEN in your environment or .env file."
    );
  }

  const queryParams = new URLSearchParams({ q: query });
  if (project) {
    queryParams.set("project", project);
  }

  const url = `${config.baseUrl}/tasks/search?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: getHeaders(config.token),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PM Tool API search failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data.tasks)) {
      return data.tasks;
    }
    if (Array.isArray(data.results)) {
      return data.results;
    }
    return [];
  } catch (err) {
    logger.error(`Error searching tasks in PM tool: ${(err as Error).message}`);
    throw err;
  }
}
