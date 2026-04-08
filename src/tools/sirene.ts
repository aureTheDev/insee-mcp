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

const LUCENE_400_HINT =
  "\n\nHint: Fields that change over time (denominationUniteLegale, activitePrincipaleUniteLegale, " +
  "etatAdministratifUniteLegale, codePostalEtablissement, activitePrincipaleEtablissement, etc.) " +
  "must be wrapped in periode(): e.g. periode(denominationUniteLegale:AIRBUS) " +
  "or periode(activitePrincipaleEtablissement:62.01Z). " +
  "Only identifiers (siren, siret, trancheEffectifs) accept direct field:value syntax.";

function formatError(err: unknown): string {
  if (err instanceof InseeApiError) {
    if (err.status === 400) return err.message + LUCENE_400_HINT;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

const SIREN_SEARCH_DESCRIPTION =
  "Search legal units (entreprises) in SIRENE using Lucene query syntax.\n" +
  "IMPORTANT — two query modes:\n" +
  "  • Identifier fields (siren, trancheEffectifs): direct syntax → siren:12345678\n" +
  "  • Period fields (change over time): must wrap in periode() → periode(denominationUniteLegale:AIRBUS)\n" +
  "Common period fields: denominationUniteLegale, categorieJuridiqueUniteLegale, " +
  "activitePrincipaleUniteLegale, etatAdministratifUniteLegale (A=active, C=ceased).\n" +
  "Examples:\n" +
  "  q='periode(denominationUniteLegale:\"BNP PARIBAS\")'\n" +
  "  q='periode(activitePrincipaleUniteLegale:62.01Z) AND periode(etatAdministratifUniteLegale:A)'";

const SIRET_SEARCH_DESCRIPTION =
  "Search establishments (établissements) in SIRENE using Lucene query syntax.\n" +
  "IMPORTANT — two query modes:\n" +
  "  • Identifier fields (siret, siren, codeCommune): direct syntax\n" +
  "  • Period fields (change over time): must wrap in periode() → periode(codePostalEtablissement:75001)\n" +
  "Common period fields: codePostalEtablissement, activitePrincipaleEtablissement, " +
  "etatAdministratifEtablissement (A=active, F=closed), denominationUsuelleEtablissement.\n" +
  "Examples:\n" +
  "  q='periode(codePostalEtablissement:75001) AND periode(activitePrincipaleEtablissement:62.01Z)'\n" +
  "  q='siren:123456789 AND periode(etatAdministratifEtablissement:A)'";

export function registerSireneTools(server: McpServer, getToken: () => Promise<string | undefined>) {
  server.registerTool(
    "sirene_get_siren",
    {
      title: "Qualify a prospect / enrich CRM by SIREN",
      description:
        "Returns the legal unit (unité légale) identified by its 9-digit SIREN number: legal form, NAF code, " +
        "workforce bracket, administrative status, and registered office SIRET.",
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
      title: "Get establishment detail by SIRET (address, workforce, status)",
      description:
        "Returns the establishment (établissement) identified by its 14-digit SIRET number: " +
        "full address, NAF code, workforce bracket, administrative status, and whether it is the registered office (siège social).",
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
      title: "Search companies by name or sector (SIREN)",
      description: SIREN_SEARCH_DESCRIPTION,
      inputSchema: {
        q: z.string().optional().describe(
          "Lucene query. Period fields require periode() wrapper. " +
          "Example: periode(denominationUniteLegale:\"RENAULT\")",
        ),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Historical date YYYY-MM-DD"),
        champs: z.string().optional().describe("Comma-separated fields to return"),
        masquerValeursNulles: z.boolean().optional().describe("Hide null fields"),
        facetteChamp: z
          .string()
          .optional()
          .describe("Fields for facet counts (e.g. 'categorieEntreprise')"),
        tri: z.string().optional().describe("Sort fields (default: siren)"),
        nombre: z.number().int().min(1).max(1000).default(20).describe("Number of results (1-1000)"),
        debut: z.number().int().min(0).default(0).describe("Starting offset for pagination"),
        curseur: z.string().optional().describe("Cursor for deep pagination (>1000 results)"),
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
      title: "Search establishments by sector / geography (SIRET)",
      description: SIRET_SEARCH_DESCRIPTION,
      inputSchema: {
        q: z.string().optional().describe(
          "Lucene query. Period fields require periode() wrapper. " +
          "Example: periode(codePostalEtablissement:75001)",
        ),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Historical date YYYY-MM-DD"),
        champs: z.string().optional().describe("Comma-separated fields to return"),
        masquerValeursNulles: z.boolean().optional().describe("Hide null fields"),
        facetteChamp: z.string().optional().describe("Fields for facet counts"),
        tri: z.string().optional().describe("Sort fields (default: siren)"),
        nombre: z.number().int().min(1).max(1000).default(20).describe("Number of results"),
        debut: z.number().int().min(0).default(0).describe("Starting offset for pagination"),
        curseur: z.string().optional().describe("Cursor for deep pagination (>1000 results)"),
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
      title: "Monitor SIRENE API health",
      description:
        "Returns service state (UP/DOWN), version, and last update dates for legal units and establishments. " +
        "Use this to check API availability before bulk operations.",
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
      title: "Track acquisitions / transfers between establishments",
      description:
        "Returns predecessor/successor relationships between establishments. " +
        "Use this to follow mergers, acquisitions, or address transfers in a portfolio. " +
        "Query example: q='siretEtablissementPredecesseur:12345678901234'. " +
        "Set tri='successeur' to sort by successor instead of predecessor.",
      inputSchema: {
        q: z.string().optional().describe(
          "Lucene query — use siretEtablissementPredecesseur or siretEtablissementSuccesseur. " +
          "Example: q='siretEtablissementPredecesseur:12345678901234'",
        ),
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
