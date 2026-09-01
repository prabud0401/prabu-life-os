import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  listTeams,
  listChannels,
  listChannelMessages,
  listChats,
  listChatMessages,
} from "@prabu-life-os/core";

export const listTeamsTool: Tool = {
  name: "list_teams",
  description: "List Microsoft Teams you are a member of.",
  inputSchema: { type: "object", properties: {} },
};

export const listChannelsTool: Tool = {
  name: "list_channels",
  description: "List channels in a Microsoft Team.",
  inputSchema: {
    type: "object",
    required: ["teamId"],
    properties: {
      teamId: { type: "string", description: "Team ID from list_teams" },
    },
  },
};

export const listChannelMessagesTool: Tool = {
  name: "list_channel_messages",
  description: "List recent messages in a Teams channel.",
  inputSchema: {
    type: "object",
    required: ["teamId", "channelId"],
    properties: {
      teamId: { type: "string" },
      channelId: { type: "string" },
      count: { type: "number", description: "Max messages (default 10)" },
    },
  },
};

export const listChatsTool: Tool = {
  name: "list_chats",
  description: "List your Teams chats.",
  inputSchema: {
    type: "object",
    properties: {
      count: { type: "number", description: "Max chats (default 20)" },
    },
  },
};

export const listChatMessagesTool: Tool = {
  name: "list_chat_messages",
  description: "List recent messages in a Teams chat.",
  inputSchema: {
    type: "object",
    required: ["chatId"],
    properties: {
      chatId: { type: "string" },
      count: { type: "number", description: "Max messages (default 20)" },
    },
  },
};

export const teamsTools: Tool[] = [
  listTeamsTool,
  listChannelsTool,
  listChannelMessagesTool,
  listChatsTool,
  listChatMessagesTool,
];

export async function handleTeamsTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let result: unknown;
    switch (name) {
      case "list_teams":
        result = await listTeams();
        break;
      case "list_channels":
        result = await listChannels(String(args.teamId));
        break;
      case "list_channel_messages":
        result = await listChannelMessages(
          String(args.teamId),
          String(args.channelId),
          args.count !== undefined ? Number(args.count) : undefined
        );
        break;
      case "list_chats":
        result = await listChats(
          args.count !== undefined ? Number(args.count) : undefined
        );
        break;
      case "list_chat_messages":
        result = await listChatMessages(
          String(args.chatId),
          args.count !== undefined ? Number(args.count) : undefined
        );
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown teams tool: ${name}` }],
          isError: true,
        };
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: (err as Error).message }],
      isError: true,
    };
  }
}
