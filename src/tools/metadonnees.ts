import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getNafSousClasse, InseeApiError } from "../insee-client.js";

function formatError(err: unknown): string {
  if (err instanceof InseeApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function registerMetadonneesTools(server: McpServer, getToken: () => Promise<string | undefined>) {
  server.registerTool(
    "meta_get_naf_sous_classe",
    {
      title: "Decode an APE/NAF sub-class code",
      description:
        "Returns the label and details of a NAF rev.2 sub-class (5-character code with letter, e.g. '62.01Z'). " +
        "This is the most granular NAF level and the one stored in SIRENE " +
        "(activitePrincipaleUniteLegale / activitePrincipaleEtablissement).",
      inputSchema: {
        code: z.string().describe("NAF rev.2 sub-class code (e.g. '62.01Z' or '6201Z')"),
      },
    },
    async ({ code }) => {
      try {
        const data = await getNafSousClasse(await getToken(), code);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );
}
