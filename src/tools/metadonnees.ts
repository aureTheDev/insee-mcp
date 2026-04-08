import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getNafSousClasse,
  getGeoDepartement,
  getGeoRegion,
  listGeoDepartements,
  listGeoRegions,
  InseeApiError,
} from "../insee-client.js";

function formatError(err: unknown): string {
  if (err instanceof InseeApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

const DATE_SCHEMA = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe("Reference date YYYY-MM-DD (defaults to today)");

export function registerMetadonneesTools(server: McpServer, getToken: () => Promise<string | undefined>) {
  // ── NAF ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "meta_get_naf_sous_classe",
    {
      title: "Decode an APE/NAF sub-class code",
      description:
        "Returns the label and details of a NAF rev.2 sub-class (5-character code with letter, e.g. '62.01Z'). " +
        "This is the most granular NAF level and the one stored in SIRENE (activitePrincipaleUniteLegale / activitePrincipaleEtablissement).",
      inputSchema: {
        code: z
          .string()
          .describe("NAF rev.2 sub-class code (e.g. '62.01Z' or '6201Z')"),
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

  // ── COG – single entity ──────────────────────────────────────────────────

  server.registerTool(
    "meta_get_departement",
    {
      title: "Validate and get département info",
      description:
        "Returns the name and metadata of a French département by its official code (e.g. '75', '69', '971' for Guadeloupe). " +
        "Use this to validate a département code or retrieve its region.",
      inputSchema: {
        code: z.string().describe("Département code (e.g. '75', '13', '2A', '971')"),
        date: DATE_SCHEMA,
      },
    },
    async ({ code, date }) => {
      try {
        const data = await getGeoDepartement(await getToken(), code, date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "meta_get_region",
    {
      title: "Validate and get région info",
      description:
        "Returns the name and metadata of a French région by its official code (e.g. '11' for Île-de-France, '84' for Auvergne-Rhône-Alpes). " +
        "Use this to validate a région code.",
      inputSchema: {
        code: z.string().describe("Région code (2 digits, e.g. '11', '84', '93')"),
        date: DATE_SCHEMA,
      },
    },
    async ({ code, date }) => {
      try {
        const data = await getGeoRegion(await getToken(), code, date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  // ── COG – lists ──────────────────────────────────────────────────────────

  server.registerTool(
    "meta_list_departements",
    {
      title: "List French départements, optionally filtered by région",
      description:
        "Returns the list of French départements. When codeRegion is provided, only the départements " +
        "belonging to that région are returned (e.g. codeRegion='11' → 8 Île-de-France départements).",
      inputSchema: {
        codeRegion: z
          .string()
          .optional()
          .describe("Filter by région code (e.g. '11' for Île-de-France, '84' for Auvergne-Rhône-Alpes)"),
        date: DATE_SCHEMA,
      },
    },
    async ({ codeRegion, date }) => {
      try {
        const data = await listGeoDepartements(await getToken(), codeRegion, date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "meta_list_regions",
    {
      title: "List all French régions",
      description: "Returns all French régions with their official codes and names. Use codes to build territorial breakdowns for commercial teams.",
      inputSchema: {
        date: DATE_SCHEMA,
      },
    },
    async ({ date }) => {
      try {
        const data = await listGeoRegions(await getToken(), date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );
}
