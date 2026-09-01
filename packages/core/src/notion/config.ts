import "dotenv/config";

export interface NotionConfig {
  token?: string;
  databaseId: string;
  dataSourceId: string;
}

const DEFAULT_DATABASE_ID = "44ec9720-556c-4e49-a28b-eac28a487e30";
const DEFAULT_DATA_SOURCE_ID = "33423467-e1d3-4ebf-bd10-adfbe7e56b1d";

export function getNotionConfig(): NotionConfig {
  return {
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID || DEFAULT_DATABASE_ID,
    dataSourceId: process.env.NOTION_DATA_SOURCE_ID || DEFAULT_DATA_SOURCE_ID,
  };
}
