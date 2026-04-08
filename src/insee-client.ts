const SIRENE_BASE = "https://api.insee.fr/api-sirene/3.11";
const META_BASE = "https://api.insee.fr/metadonnees/V1";

export class InseeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(`INSEE API ${status} on ${endpoint}: ${message}`);
    this.name = "InseeApiError";
  }
}

async function get(url: string, apiKey?: string): Promise<unknown> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers["X-INSEE-Api-Key-Integration"] = apiKey;

  const response = await fetch(url, { headers });
  const body = await response.text().catch(() => "");

  if (!response.ok) {
    throw new InseeApiError(response.status, url, body || response.statusText);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("xml") || body.trimStart().startsWith("<")) {
    throw new InseeApiError(
      response.status,
      url,
      `API returned XML instead of JSON (check API key). Body: ${body.slice(0, 200)}`,
    );
  }

  return JSON.parse(body);
}

// ── SIRENE ─────────────────────────────────────────────────────────────────

export function getSiren(
  token: string | undefined,
  siren: string,
  opts?: { date?: string; champs?: string; masquerValeursNulles?: boolean },
) {
  const params = new URLSearchParams();
  if (opts?.date) params.set("date", opts.date);
  if (opts?.champs) params.set("champs", opts.champs);
  if (opts?.masquerValeursNulles !== undefined)
    params.set("masquerValeursNulles", String(opts.masquerValeursNulles));
  const qs = params.toString();
  return get(`${SIRENE_BASE}/siren/${encodeURIComponent(siren)}${qs ? "?" + qs : ""}`, token);
}

export function getSiret(
  token: string | undefined,
  siret: string,
  opts?: { date?: string; champs?: string; masquerValeursNulles?: boolean },
) {
  const params = new URLSearchParams();
  if (opts?.date) params.set("date", opts.date);
  if (opts?.champs) params.set("champs", opts.champs);
  if (opts?.masquerValeursNulles !== undefined)
    params.set("masquerValeursNulles", String(opts.masquerValeursNulles));
  const qs = params.toString();
  return get(`${SIRENE_BASE}/siret/${encodeURIComponent(siret)}${qs ? "?" + qs : ""}`, token);
}

export function searchSiren(
  token: string | undefined,
  opts: {
    q?: string;
    date?: string;
    champs?: string;
    masquerValeursNulles?: boolean;
    "facette.champ"?: string;
    tri?: string;
    nombre?: number;
    debut?: number;
    curseur?: string;
  },
) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.date) params.set("date", opts.date);
  if (opts.champs) params.set("champs", opts.champs);
  if (opts.masquerValeursNulles !== undefined)
    params.set("masquerValeursNulles", String(opts.masquerValeursNulles));
  if (opts["facette.champ"]) params.set("facette.champ", opts["facette.champ"]);
  if (opts.tri) params.set("tri", opts.tri);
  if (opts.nombre !== undefined) params.set("nombre", String(opts.nombre));
  if (opts.debut !== undefined) params.set("debut", String(opts.debut));
  if (opts.curseur) params.set("curseur", opts.curseur);
  const qs = params.toString();
  return get(`${SIRENE_BASE}/siren${qs ? "?" + qs : ""}`, token);
}

export function searchSiret(
  token: string | undefined,
  opts: {
    q?: string;
    date?: string;
    champs?: string;
    masquerValeursNulles?: boolean;
    "facette.champ"?: string;
    tri?: string;
    nombre?: number;
    debut?: number;
    curseur?: string;
  },
) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.date) params.set("date", opts.date);
  if (opts.champs) params.set("champs", opts.champs);
  if (opts.masquerValeursNulles !== undefined)
    params.set("masquerValeursNulles", String(opts.masquerValeursNulles));
  if (opts["facette.champ"]) params.set("facette.champ", opts["facette.champ"]);
  if (opts.tri) params.set("tri", opts.tri);
  if (opts.nombre !== undefined) params.set("nombre", String(opts.nombre));
  if (opts.debut !== undefined) params.set("debut", String(opts.debut));
  if (opts.curseur) params.set("curseur", opts.curseur);
  const qs = params.toString();
  return get(`${SIRENE_BASE}/siret${qs ? "?" + qs : ""}`, token);
}

// ── MÉTADONNÉES ────────────────────────────────────────────────────────────

export function getNafSousClasse(token: string | undefined, code: string) {
  return get(`${META_BASE}/codes/nafr2/sousClasse/${encodeURIComponent(code)}`, token);
}
