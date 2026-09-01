import { callPmMcpTool } from "./mcp-client";
import type { PmTask, PmTaskFilter } from "./types";

interface PmTaskListResponse {
  items?: PmTask[];
  tasks?: PmTask[];
  results?: PmTask[];
  pagination?: {
    total?: number;
    has_more?: boolean;
  };
}

function normalizeTasks(data: unknown): PmTask[] {
  if (Array.isArray(data)) {
    return data as PmTask[];
  }
  if (data && typeof data === "object") {
    const payload = data as PmTaskListResponse;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.tasks)) return payload.tasks;
    if (Array.isArray(payload.results)) return payload.results;
  }
  return [];
}

export async function listMyTasks(filter: PmTaskFilter = {}): Promise<PmTask[]> {
  const args: Record<string, unknown> = {};
  if (filter.status) args.status = filter.status;
  if (filter.project) args.project = filter.project;
  if (filter.sprint) args.sprint = filter.sprint;
  if (filter.assignee) args.assignee = filter.assignee;
  if (filter.limit) args.limit = filter.limit;

  const data = await callPmMcpTool<PmTaskListResponse | PmTask[]>("list_my_tasks", args);
  return normalizeTasks(data);
}

export async function getTask(taskId: string | number): Promise<PmTask> {
  const data = await callPmMcpTool<Record<string, unknown>>("get_task", {
    task_id: Number(taskId),
  });
  if (data.task && typeof data.task === "object") {
    return data.task as PmTask;
  }
  return data as PmTask;
}

export async function searchTasks(query: string, project?: string): Promise<PmTask[]> {
  const args: Record<string, unknown> = { query };
  if (project) args.project = project;

  const data = await callPmMcpTool<PmTaskListResponse | PmTask[]>("search_tasks", args);
  return normalizeTasks(data);
}
