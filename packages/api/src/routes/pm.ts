import { Router, type Request, type Response } from "express";
import {
  listMyTasks,
  getTask,
  searchTasks,
  isPmToolConfigured,
  getPmToolConfig,
} from "@prabu-life-os/core";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

export const pmRouter = Router();

/**
 * GET /api/pm/health
 * Public or semi-public health check for PM Tool configuration.
 */
pmRouter.get("/health", (_req: Request, res: Response) => {
  const config = getPmToolConfig();
  const configured = isPmToolConfigured();

  res.json({
    status: "ok",
    service: "pm-tool-proxy",
    configured,
    baseUrl: config.mcpUrl || config.baseUrl || null,
    hasToken: Boolean(config.token),
    timestamp: new Date().toISOString(),
  });
});

// Protect data endpoints with authentication middleware
pmRouter.use(requireAuth);

/**
 * GET /api/pm/tasks
 * Forward / retrieve tasks from PM tool.
 * Query params: status, project, sprint, assignee, limit
 */
pmRouter.get("/tasks", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tasks = await listMyTasks({
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      project: typeof req.query.project === "string" ? req.query.project : undefined,
      sprint: typeof req.query.sprint === "string" ? req.query.sprint : undefined,
      assignee: typeof req.query.assignee === "string" ? req.query.assignee : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    });

    res.json({
      count: tasks.length,
      tasks,
    });
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Failed to fetch tasks from PM tool",
    });
  }
});

/**
 * GET /api/pm/tasks/:id
 * Retrieve a specific task by ID.
 */
pmRouter.get("/tasks/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await getTask(req.params.id);
    res.json(task);
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || `Failed to fetch task ${req.params.id}`,
    });
  }
});

/**
 * GET /api/pm/search
 * Search tasks by keyword.
 * Query params: q (required), project (optional)
 */
pmRouter.get("/search", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = String(req.query.q || req.query.query || "");
    if (!query) {
      res.status(400).json({ error: "Missing required query parameter: q" });
      return;
    }
    const project = typeof req.query.project === "string" ? req.query.project : undefined;
    const tasks = await searchTasks(query, project);

    res.json({
      query,
      count: tasks.length,
      tasks,
    });
  } catch (err) {
    res.status(500).json({
      error: (err as Error).message || "Failed to search tasks in PM tool",
    });
  }
});
