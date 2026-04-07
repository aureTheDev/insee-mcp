import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getNafClasse,
  getNafSousClasse,
  getGeoCommune,
  getGeoDepartement,
  getGeoRegion,
  getGeoPays,
  listGeoCommunes,
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
    "meta_get_naf_classe",
    {
      title: "Get NAF rev.2 class details",
      description:
        "Returns the label and details of a NAF rev.2 class (4-character code, e.g. '6201'). " +
        "NAF is the French activity nomenclature used in SIRENE (activitePrincipaleUniteLegale).",
      inputSchema: {
        code: z.string().describe("NAF rev.2 class code (4 characters, e.g. '6201')"),
      },
    },
    async ({ code }) => {
      try {
        const data = await getNafClasse(await getToken(), code);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "meta_get_naf_sous_classe",
    {
      title: "Get NAF rev.2 sub-class details",
      description:
        "Returns the label and details of a NAF rev.2 sub-class (5-character code with letter, e.g. '62.01Z'). " +
        "This is the most granular level used in SIRENE.",
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
    "meta_get_commune",
    {
      title: "Get commune info by COG code",
      description:
        "Returns the name and metadata of a French commune by its official geographic code (COG). " +
        "5-digit code (e.g. '75056' for Paris, '69123' for Lyon).",
      inputSchema: {
        code: z.string().describe("COG commune code (5 digits, e.g. '75056')"),
        date: DATE_SCHEMA,
      },
    },
    async ({ code, date }) => {
      try {
        const data = await getGeoCommune(await getToken(), code, date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "meta_get_departement",
    {
      title: "Get département info by COG code",
      description:
        "Returns the name and metadata of a French département by its official code (e.g. '75', '69', '971' for Guadeloupe).",
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
      title: "Get région info by COG code",
      description:
        "Returns the name and metadata of a French région by its official code (e.g. '11' for Île-de-France, '84' for Auvergne-Rhône-Alpes).",
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

  server.registerTool(
    "meta_get_pays",
    {
      title: "Get country info by COG code",
      description:
        "Returns the name and metadata of a country by its INSEE code (e.g. '99100' for France, '99109' for Germany, '99132' for the UK).",
      inputSchema: {
        code: z.string().describe("INSEE country code (5 digits starting with '99', e.g. '99109')"),
      },
    },
    async ({ code }) => {
      try {
        const data = await getGeoPays(await getToken(), code);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  // ── COG – lists ──────────────────────────────────────────────────────────

  server.registerTool(
    "meta_list_communes",
    {
      title: "List communes, optionally filtered by département",
      description:
        "Returns the list of French communes. Can be filtered by département code. " +
        "Warning: returns thousands of entries when unfiltered.",
      inputSchema: {
        codeDepartement: z
          .string()
          .optional()
          .describe("Filter by département code (e.g. '75', '69')"),
        date: DATE_SCHEMA,
      },
    },
    async ({ codeDepartement, date }) => {
      try {
        const data = await listGeoCommunes(await getToken(), codeDepartement, date);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "meta_list_departements",
    {
      title: "List all French départements",
      description:
        "Returns the list of all French départements. Can be filtered by région code.",
      inputSchema: {
        codeRegion: z
          .string()
          .optional()
          .describe("Filter by région code (e.g. '11' for Île-de-France)"),
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
      description: "Returns the list of all French régions with their codes and names.",
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
