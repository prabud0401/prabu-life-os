import { Client } from "@microsoft/microsoft-graph-client";
import { createGraphClient, getAccessToken } from "@prabu-life-os/shared";
import { initTeamsConfig, getTeamsAuthConfig } from "./config";
import type {
  ChannelSummary,
  ChatSummary,
  MessageSummary,
  TeamSummary,
} from "./types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function mapMessage(m: {
  id: string;
  createdDateTime?: string;
  from?: { user?: { displayName?: string }; application?: { displayName?: string } };
  body?: { content?: string; contentType?: string };
}): MessageSummary {
  const rawBody = m.body?.content || "";
  const body = m.body?.contentType === "html" ? stripHtml(rawBody) : rawBody;
  return {
    id: m.id,
    createdAt: m.createdDateTime || "",
    from:
      m.from?.user?.displayName ?? m.from?.application?.displayName ?? "unknown",
    body,
  };
}

export async function getTeamsGraphClient(): Promise<Client> {
  try {
    getTeamsAuthConfig();
  } catch {
    await initTeamsConfig();
  }

  const token = await getAccessToken(getTeamsAuthConfig());
  if (!token) {
    throw new Error(
      "Teams is not authenticated. Run npm run auth:token:bridge -- --teams"
    );
  }

  return createGraphClient(token);
}

export async function listTeams(): Promise<TeamSummary[]> {
  const client = await getTeamsGraphClient();
  const response = await client.api("/me/joinedTeams").get();
  return (response.value || []).map((t: { id: string; displayName?: string; description?: string }) => ({
    id: t.id,
    displayName: t.displayName || "(unnamed team)",
    description: t.description || "",
  }));
}

export async function listChannels(teamId: string): Promise<ChannelSummary[]> {
  if (!teamId) throw new Error("Missing required parameter: teamId");
  const client = await getTeamsGraphClient();
  const response = await client
    .api(`/teams/${teamId}/channels?$select=id,displayName,description,membershipType`)
    .get();
  return (response.value || []).map(
    (c: {
      id: string;
      displayName?: string;
      description?: string;
      membershipType?: string;
    }) => ({
      id: c.id,
      displayName: c.displayName || "(unnamed channel)",
      description: c.description || "",
      membershipType: c.membershipType || "standard",
    })
  );
}

export async function listChannelMessages(
  teamId: string,
  channelId: string,
  count = 10
): Promise<MessageSummary[]> {
  if (!teamId || !channelId) {
    throw new Error("Missing required parameters: teamId, channelId");
  }
  const client = await getTeamsGraphClient();
  const top = Math.min(Number(count) || 10, 50);
  const response = await client
    .api(
      `/teams/${teamId}/channels/${channelId}/messages?$top=${top}&$orderby=createdDateTime desc`
    )
    .get();
  return (response.value || []).map(mapMessage);
}

export async function listChats(count = 20): Promise<ChatSummary[]> {
  const client = await getTeamsGraphClient();
  const top = Math.min(Number(count) || 20, 50);
  const response = await client.api(`/me/chats?$top=${top}`).get();
  return (response.value || []).map(
    (c: {
      id: string;
      topic?: string;
      chatType?: string;
      createdDateTime?: string;
      lastUpdatedDateTime?: string;
    }) => ({
      id: c.id,
      topic: c.topic || "(no topic)",
      chatType: c.chatType || "unknown",
      createdAt: c.createdDateTime || "",
      lastUpdatedAt: c.lastUpdatedDateTime || "",
    })
  );
}

export async function listChatMessages(
  chatId: string,
  count = 20
): Promise<MessageSummary[]> {
  if (!chatId) throw new Error("Missing required parameter: chatId");
  const client = await getTeamsGraphClient();
  const top = Math.min(Number(count) || 20, 50);
  const response = await client
    .api(`/me/chats/${chatId}/messages?$top=${top}&$orderby=createdDateTime desc`)
    .get();
  return (response.value || []).map(mapMessage);
}
