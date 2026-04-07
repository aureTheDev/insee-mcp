import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSireneTools } from "./tools/sirene.js";
import { registerMetadonneesTools } from "./tools/metadonnees.js";
import { registerBdmTools } from "./tools/bdm.js";

// Optional: set INSEE_API_KEY if you subscribed to a plan that requires one.
// For the public keyless plan (30 req/min), no key is needed.
const apiKey = process.env.INSEE_API_KEY;

const getToken = async () => apiKey;

const server = new McpServer({
  name: "insee-mcp",
  version: "1.0.0",
});

registerSireneTools(server, getToken);
registerMetadonneesTools(server, getToken);
registerBdmTools(server, getToken);

const transport = new StdioServerTransport();
await server.connect(transport);
