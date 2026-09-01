import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  listMyTasks,
  getTask,
  searchTasks,
  isPmToolConfigured,
} from "@prabu-life-os/core";

export const pmToolTools: Tool[] = [
  {
    name: "list_my_tasks",
    description:
      "List assigned tasks from the PM tool with optional filters for project, status, sprint, or limit.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter tasks by status (e.g. todo, inprogress, done, blocked)",
        },
        project: {
          type: "string",
          description: "Filter tasks by project name or key (e.g. sales, engineering)",
        },
        sprint: {
          type: "string",
          description: "Filter tasks by sprint name (e.g. 'Sprint 11')",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default: 50)",
        },
      },
    },
  },
  {
    name: "get_task",
    description: "Get detailed information for a specific PM task by ID.",
    inputSchema: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "The unique ID or task number (e.g. '2452')",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "search_tasks",
    description: "Search PM tasks by keyword or query string.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword or text query",
        },
        project: {
          type: "string",
          description: "Optional project filter (e.g. sales, engineering)",
        },
      },
      required: ["query"],
    },
  },
];

export async function handlePmToolTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    if (!isPmToolConfigured()) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error:
                  "PM_MCP_TOKEN is not set. Please configure PM_MCP_TOKEN in .env or environment variables.",
                configured: false,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    switch (name) {
      case "list_my_tasks": {
        const tasks = await listMyTasks({
          status: typeof args.status === "string" ? args.status : undefined,
          project: typeof args.project === "string" ? args.project : undefined,
          sprint: typeof args.sprint === "string" ? args.sprint : undefined,
          limit: typeof args.limit === "number" ? args.limit : undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: tasks.length, tasks }, null, 2),
            },
          ],
        };
      }

      case "get_task": {
        const taskId = String(args.taskId || "");
        if (!taskId) {
          return {
            content: [{ type: "text", text: "Error: taskId argument is required." }],
            isError: true,
          };
        }
        const task = await getTask(taskId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case "search_tasks": {
        const query = String(args.query || "");
        if (!query) {
          return {
            content: [{ type: "text", text: "Error: query argument is required." }],
            isError: true,
          };
        }
        const project = typeof args.project === "string" ? args.project : undefined;
        const tasks = await searchTasks(query, project);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ query, count: tasks.length, tasks }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown PM tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { error: (err as Error).message || String(err) },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
