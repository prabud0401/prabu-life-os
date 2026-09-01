export interface TeamSummary {
  id: string;
  displayName: string;
  description: string;
}

export interface ChannelSummary {
  id: string;
  displayName: string;
  description: string;
  membershipType: string;
}

export interface ChatSummary {
  id: string;
  topic: string;
  chatType: string;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface MessageSummary {
  id: string;
  createdAt: string;
  from: string;
  body: string;
}
