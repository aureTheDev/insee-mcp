import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getBdmSeries, InseeApiError } from "../insee-client.js";

function formatError(err: unknown): string {
  if (err instanceof InseeApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function registerBdmTools(server: McpServer, getToken: () => Promise<string | undefined>) {
  server.registerTool(
    "bdm_get_series",
    {
      title: "Get BDM time series data by idbank",
      description:
        "Returns time series data from the INSEE Macroeconomic Data Bank (BDM). " +
        "Each series is identified by a unique idbank (e.g. '001694056' for French GDP). " +
        "Up to 400 series can be fetched in one call by providing multiple idbanks. " +
        "Returns SDMX-compliant JSON with observations indexed by period (e.g. '2023-Q1', '2023-01'). " +
        "Common idbanks: 001694056 (PIB volume), 001763195 (IPC inflation), 010564905 (unemployment rate).",
      inputSchema: {
        idbanks: z
          .array(z.string())
          .min(1)
          .max(400)
          .describe("List of BDM idbank identifiers (e.g. ['001694056', '001763195'])"),
        startPeriod: z
          .string()
          .optional()
          .describe(
            "Start of the time range. Format depends on frequency: annual '2010', quarterly '2010-Q1', monthly '2010-01'",
          ),
        endPeriod: z
          .string()
          .optional()
          .describe("End of the time range (same format as startPeriod)"),
        lastNObservations: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Return only the last N observations per series"),
        firstNObservations: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Return only the first N observations per series"),
      },
    },
    async ({ idbanks, startPeriod, endPeriod, lastNObservations, firstNObservations }) => {
      try {
        const data = await getBdmSeries(await getToken(), idbanks, {
          startPeriod,
          endPeriod,
          lastNObservations,
          firstNObservations,
        });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatError(err) }], isError: true };
      }
    },
  );
}
