import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

const MCP_URL = process.env.MCP_URL || "https://prabu-life-os-production.up.railway.app/mcp";
const API_KEY = process.env.PRABU_MCP_API_KEY;

if (!API_KEY) {
  console.error("Set PRABU_MCP_API_KEY");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  requestInit: {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json, text/event-stream",
    },
  },
});

const client = new Client({ name: "gmail-smoke-test", version: "0.1.0" });
await client.connect(transport);

const tools = await client.request({ method: "tools/list", params: {} }, ListToolsResultSchema);
const gmailTools = tools.tools.filter((t) =>
  ["list_messages", "search_messages", "list_labels"].includes(t.name)
);

const labels = await client.request(
  { method: "tools/call", params: { name: "list_labels", arguments: {} } },
  CallToolResultSchema
);

const wise = await client.request(
  {
    method: "tools/call",
    params: {
      name: "search_messages",
      arguments: { query: "from:wise.com", maxResults: 3 },
    },
  },
  CallToolResultSchema
);

await client.close();

console.log(
  JSON.stringify(
    {
      totalTools: tools.tools.length,
      gmailTools: gmailTools.map((t) => t.name),
      listLabelsOk: !labels.isError,
      wiseSearchPreview: wise.content?.[0]?.text?.slice(0, 500),
    },
    null,
    2
  )
);
