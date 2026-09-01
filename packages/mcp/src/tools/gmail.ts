import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  listMessages,
  readMessage,
  searchMessages,
  sendMessage,
  modifyMessage,
  listLabels,
  createLabel,
  createDraft,
  sendDraft,
} from "@prabu-life-os/core";

export const listMessagesTool: Tool = {
  name: "list_messages",
  description: "List messages in the Gmail inbox or specified labels",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Maximum number of messages to return (default: 20, max: 100)",
      },
      labelIds: {
        type: "array",
        items: { type: "string" },
        description: "Filter by label IDs (e.g., ['INBOX', 'UNREAD'])",
      },
      q: {
        type: "string",
        description: "Gmail search query (e.g., 'from:example@gmail.com')",
      },
      pageToken: {
        type: "string",
        description: "Token for pagination",
      },
    },
  },
};

export const readMessageTool: Tool = {
  name: "read_message",
  description: "Read the full content of a specific email message",
  inputSchema: {
    type: "object",
    required: ["messageId"],
    properties: {
      messageId: { type: "string", description: "The ID of the message to read" },
    },
  },
};

export const searchMessagesTool: Tool = {
  name: "search_messages",
  description: "Search for messages using Gmail search syntax",
  inputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description:
          "Gmail search query (e.g., 'from:user@example.com after:2024/01/01 has:attachment')",
      },
      maxResults: { type: "number", description: "Maximum number of results (default: 20)" },
      pageToken: { type: "string", description: "Token for pagination" },
    },
  },
};

export const sendMessageTool: Tool = {
  name: "send_message",
  description: "Send a new email message",
  inputSchema: {
    type: "object",
    required: ["to", "subject", "body"],
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Email body (plain text)" },
      cc: { type: "string", description: "CC recipients (comma-separated)" },
      bcc: { type: "string", description: "BCC recipients (comma-separated)" },
      threadId: { type: "string", description: "Thread ID to reply to" },
    },
  },
};

export const modifyMessageTool: Tool = {
  name: "modify_message",
  description: "Modify labels on a message (add/remove labels, mark read/unread)",
  inputSchema: {
    type: "object",
    required: ["messageId"],
    properties: {
      messageId: { type: "string", description: "The ID of the message to modify" },
      addLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Label IDs to add (e.g., ['STARRED', 'IMPORTANT'])",
      },
      removeLabelIds: {
        type: "array",
        items: { type: "string" },
        description: "Label IDs to remove (e.g., ['UNREAD'])",
      },
    },
  },
};

export const listLabelsTool: Tool = {
  name: "list_labels",
  description: "List all Gmail labels (system and user-created)",
  inputSchema: { type: "object", properties: {} },
};

export const createLabelTool: Tool = {
  name: "create_label",
  description: "Create a new Gmail label",
  inputSchema: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string", description: "Name for the new label" },
      messageListVisibility: {
        type: "string",
        enum: ["show", "hide"],
        description: "Whether to show messages with this label in the message list",
      },
      labelListVisibility: {
        type: "string",
        enum: ["labelShow", "labelShowIfUnread", "labelHide"],
        description: "How the label appears in the label list",
      },
    },
  },
};

export const createDraftTool: Tool = {
  name: "create_draft",
  description: "Create a draft email (not sent)",
  inputSchema: {
    type: "object",
    required: ["to", "subject", "body"],
    properties: {
      to: { type: "string", description: "Recipient email address" },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Email body (plain text)" },
      cc: { type: "string", description: "CC recipients (comma-separated)" },
      bcc: { type: "string", description: "BCC recipients (comma-separated)" },
      threadId: { type: "string", description: "Thread ID to reply to" },
    },
  },
};

export const sendDraftTool: Tool = {
  name: "send_draft",
  description: "Send an existing draft email",
  inputSchema: {
    type: "object",
    required: ["draftId"],
    properties: {
      draftId: { type: "string", description: "The ID of the draft to send" },
    },
  },
};

export const gmailTools: Tool[] = [
  listMessagesTool,
  readMessageTool,
  searchMessagesTool,
  sendMessageTool,
  modifyMessageTool,
  listLabelsTool,
  createLabelTool,
  createDraftTool,
  sendDraftTool,
];

export async function handleGmailTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case "list_messages": {
        const result = await listMessages({
          maxResults: args.maxResults !== undefined ? Number(args.maxResults) : undefined,
          labelIds: args.labelIds as string[] | undefined,
          q: args.q as string | undefined,
          pageToken: args.pageToken as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "read_message": {
        const result = await readMessage({ messageId: args.messageId as string });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "search_messages": {
        const result = await searchMessages({
          query: args.query as string,
          maxResults: args.maxResults !== undefined ? Number(args.maxResults) : undefined,
          pageToken: args.pageToken as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "send_message": {
        const result = await sendMessage({
          to: args.to as string,
          subject: args.subject as string,
          body: args.body as string,
          cc: args.cc as string | undefined,
          bcc: args.bcc as string | undefined,
          threadId: args.threadId as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "modify_message": {
        const result = await modifyMessage({
          messageId: args.messageId as string,
          addLabelIds: args.addLabelIds as string[] | undefined,
          removeLabelIds: args.removeLabelIds as string[] | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "list_labels": {
        const result = await listLabels();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_label": {
        const result = await createLabel({
          name: args.name as string,
          messageListVisibility: args.messageListVisibility as "show" | "hide" | undefined,
          labelListVisibility: args.labelListVisibility as
            | "labelShow"
            | "labelShowIfUnread"
            | "labelHide"
            | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "create_draft": {
        const result = await createDraft({
          to: args.to as string,
          subject: args.subject as string,
          body: args.body as string,
          cc: args.cc as string | undefined,
          bcc: args.bcc as string | undefined,
          threadId: args.threadId as string | undefined,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      case "send_draft": {
        const result = await sendDraft({ draftId: args.draftId as string });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      default:
        return {
          content: [{ type: "text", text: `Unknown Gmail tool: ${name}` }],
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
