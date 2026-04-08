import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSireneTools } from "./tools/sirene.js";
import { registerMetadonneesTools } from "./tools/metadonnees.js";

const apiKey = process.env.INSEE_API_KEY;
if (!apiKey) {
  process.stderr.write(
    "Error: INSEE_API_KEY environment variable is required.\n" +
    "Get your key at https://api.insee.fr\n",
  );
  process.exit(1);
}

const getToken = async () => apiKey;

const server = new McpServer({
  name: "insee-mcp",
  version: "1.1.0",
});

registerSireneTools(server, getToken);
registerMetadonneesTools(server, getToken);

const transport = new StdioServerTransport();
await server.connect(transport);
