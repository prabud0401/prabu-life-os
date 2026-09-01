import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  listEmails,
  getEmail,
  searchEmails,
  listFolders,
} from "@prabu-life-os/core";

export const listEmailsTool: Tool = {
  name: "list_emails",
  description:
    "List recent emails from your Outlook mailbox. Returns subject, sender, date, preview, and read status.",
  inputSchema: {
    type: "object",
    properties: {
      folder: {
        type: "string",
        description:
          "Folder to read from. Use 'inbox', 'sentitems', 'drafts', or any folder name. Default: inbox.",
      },
      count: {
        type: "number",
        description: "Number of emails to return (default: 10, max: 50).",
      },
      since: {
        type: "string",
        description:
          "Only return emails received after this ISO 8601 date (e.g. '2024-01-15T00:00:00Z').",
      },
    },
  },
};

export const getEmailTool: Tool = {
  name: "get_email",
  description:
    "Get the full content of a specific email by its ID. Returns body text, all recipients, and metadata.",
  inputSchema: {
    type: "object",
    required: ["id"],
    properties: {
      id: {
        type: "string",
        description: "The email ID (from list_emails or search_emails).",
      },
    },
  },
};

export const searchEmailsTool: Tool = {
  name: "search_emails",
  description:
    "Search emails in your Outlook mailbox by keyword. Searches subject, body, and sender.",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description: "Search keyword or phrase.",
      },
      count: {
        type: "number",
        description: "Maximum number of results to return (default: 10, max: 25).",
      },
    },
  },
};

export const listFoldersTool: Tool = {
  name: "list_folders",
  description:
    "List all mailbox folders with unread and total message counts. Use this to discover folder names for list_emails.",
  inputSchema: {
    type: "object",
    properties: {},
  },
};

export const outlookTools: Tool[] = [
  listEmailsTool,
  getEmailTool,
  searchEmailsTool,
  listFoldersTool,
];

export async function handleOutlookTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "list_emails": {
        const emails = await listEmails({
          folder: args.folder as string | undefined,
          count: args.count !== undefined ? Number(args.count) : undefined,
          since: args.since as string | undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(emails, null, 2) }],
        };
      }
      case "get_email": {
        const email = await getEmail(args.id as string);
        return {
          content: [{ type: "text", text: JSON.stringify(email, null, 2) }],
        };
      }
      case "search_emails": {
        const emails = await searchEmails({
          query: args.query as string,
          count: args.count !== undefined ? Number(args.count) : undefined,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(emails, null, 2) }],
        };
      }
      case "list_folders": {
        const folders = await listFolders();
        return {
          content: [{ type: "text", text: JSON.stringify(folders, null, 2) }],
        };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown Outlook tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: (err as Error).message }],
      isError: true,
    };
  }
}
