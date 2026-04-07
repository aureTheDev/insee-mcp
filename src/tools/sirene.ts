import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getSiren,
  getSiret,
  searchSiren,
  searchSiret,
  getSireneInformations,
  getLiensSuivants,
  InseeApiError,
} from "../insee-client.js";

function formatError(err: unknown): string {
  if (err instanceof InseeApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function registerSireneTools(server: McpServer, getToken: () => Promise<string | undefined>) {
  server.registerTool(
    "sirene_get_siren",
    {
      title: "Lookup a company by SIREN",
      description:
        "Returns the legal unit (unité légale) identified by its 9-digit SIREN number from the SIRENE directory.",
      inputSchema: {
        siren: z
          .string()
          .length(9)
          .regex(/^\d{9}$/, "SIREN must be exactly 9 digits")
          .describe("9-digit SIREN number"),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Historical date YYYY-MM-DD (returns data as of that date)"),
        champs: z
          .string()
          .optional()
          .describe("Comma-separated fields to return (e.g. 'siren,denominationUniteLegale')"),
        masquerValeursNulles: z
          .boolean()
          .optional()
          .describe("Hide null fields (true) or show them (false, default)"),
      },
    },
    async ({ siren, date, champs, masquerValeursNulles }) => {
      try {
        const data = await getSiren(await getToken(), siren, { date, champs, masquerValeursNulles });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "sirene_get_siret",
    {
      title: "Lookup an establishment by SIRET",
      description:
        "Returns the establishment (établissement) identified by its 14-digit SIRET number from the SIRENE directory.",
      inputSchema: {
        siret: z
          .string()
          .length(14)
          .regex(/^\d{14}$/, "SIRET must be exactly 14 digits")
          .describe("14-digit SIRET number"),
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Historical date YYYY-MM-DD"),
        champs: z.string().optional().describe("Comma-separated fields to return"),
        masquerValeursNulles: z.boolean().optional().describe("Hide null fields"),
      },
    },
    async ({ siret, date, champs, masquerValeursNulles }) => {
      try {
        const data = await getSiret(await getToken(), siret, { date, champs, masquerValeursNulles });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "sirene_search_companies",
    {
      title: "Search companies (SIREN) with multi-criteria query",
      description:
        "Search legal units in SIRENE using Lucene-like query syntax. " +
        "Examples: q='denominationUniteLegale:\"RENAULT\"', q='codePostalEtablissement:75001 AND etatAdministratifUniteLegale:A'. " +
        "Returns paginated results.",
      inputSchema: {
        q: z.string().optional().describe("Lucene query (e.g. 'denominationUniteLegale:\"BNP\"')"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Historical date YYYY-MM-DD"),
        champs: z.string().optional().describe("Comma-separated fields to return"),
        masquerValeursNulles: z.boolean().optional().describe("Hide null fields"),
        facetteChamp: z
          .string()
          .optional()
          .describe("Comma-separated fields for facet counts (e.g. 'categorieEntreprise')"),
        tri: z.string().optional().describe("Sort fields (default: siren)"),
        nombre: z.number().int().min(1).max(1000).default(20).describe("Number of results (1-1000)"),
        debut: z.number().int().min(0).default(0).describe("Starting offset"),
        curseur: z.string().optional().describe("Cursor for deep pagination"),
      },
    },
    async ({ q, date, champs, masquerValeursNulles, facetteChamp, tri, nombre, debut, curseur }) => {
      try {
        const data = await searchSiren(await getToken(), {
          q, date, champs, masquerValeursNulles,
          "facette.champ": facetteChamp,
          tri, nombre, debut, curseur,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "sirene_search_establishments",
    {
      title: "Search establishments (SIRET) with multi-criteria query",
      description:
        "Search establishments in SIRENE using Lucene-like query syntax. " +
        "Examples: q='codePostalEtablissement:75001', q='activitePrincipaleEtablissement:62.01Z AND etatAdministratifEtablissement:A'.",
      inputSchema: {
        q: z.string().optional().describe("Lucene query"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Historical date YYYY-MM-DD"),
        champs: z.string().optional().describe("Comma-separated fields to return"),
        masquerValeursNulles: z.boolean().optional().describe("Hide null fields"),
        facetteChamp: z.string().optional().describe("Comma-separated fields for facet counts"),
        tri: z.string().optional().describe("Sort fields (default: siren)"),
        nombre: z.number().int().min(1).max(1000).default(20).describe("Number of results"),
        debut: z.number().int().min(0).default(0).describe("Starting offset"),
        curseur: z.string().optional().describe("Cursor for deep pagination"),
      },
    },
    async ({ q, date, champs, masquerValeursNulles, facetteChamp, tri, nombre, debut, curseur }) => {
      try {
        const data = await searchSiret(await getToken(), {
          q, date, champs, masquerValeursNulles,
          "facette.champ": facetteChamp,
          tri, nombre, debut, curseur,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "sirene_get_informations",
    {
      title: "Get SIRENE service status and last update dates",
      description:
        "Returns service state (UP/DOWN), version, last update dates for legal units and establishments.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await getSireneInformations(await getToken());
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );

  server.registerTool(
    "sirene_get_succession_links",
    {
      title: "Get succession links between establishments",
      description:
        "Returns predecessor/successor relationships between establishments. " +
        "Query example: q='siretEtablissementPredecesseur:12345678901234'. " +
        "Set tri='successeur' to sort by successor instead of predecessor.",
      inputSchema: {
        q: z.string().optional().describe("Lucene query to filter succession links"),
        tri: z
          .literal("successeur")
          .optional()
          .describe("Sort by successor SIRET instead of predecessor"),
        nombre: z.number().int().min(1).max(1000).default(20).describe("Number of results"),
        debut: z.number().int().min(0).default(0).describe("Starting offset"),
        curseur: z.string().optional().describe("Cursor for deep pagination"),
      },
    },
    async ({ q, tri, nombre, debut, curseur }) => {
      try {
        const data = await getLiensSuivants(await getToken(), { q, tri, nombre, debut, curseur });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );
}
