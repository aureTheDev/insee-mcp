const SIRENE_BASE = "https://api.insee.fr/api-sirene/3.11";
const META_BASE = "https://api.insee.fr/metadonnees/nomenclatures/v1";
const BDM_BASE = "https://api.insee.fr/series/BDM/V1";

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

async function get(url: string, apiKey?: string, accept = "application/json"): Promise<unknown> {
  const headers: Record<string, string> = { Accept: accept };
  if (apiKey) headers["X-INSEE-Api-Key-Integration"] = apiKey;

  const response = await fetch(url, { headers });

  const body = await response.text().catch(() => "");

  if (!response.ok) {
    throw new InseeApiError(response.status, url, body || response.statusText);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("xml") || body.trimStart().startsWith("<")) {
    throw new InseeApiError(response.status, url, `API returned XML instead of JSON (check API key). Body: ${body.slice(0, 200)}`);
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

export function getSireneInformations(token: string | undefined) {
  return get(`${SIRENE_BASE}/informations`, token);
}

export function getLiensSuivants(
  token: string | undefined,
  opts: {
    q?: string;
    tri?: "successeur";
    nombre?: number;
    debut?: number;
    curseur?: string;
  },
) {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.tri) params.set("tri", opts.tri);
  if (opts.nombre !== undefined) params.set("nombre", String(opts.nombre));
  if (opts.debut !== undefined) params.set("debut", String(opts.debut));
  if (opts.curseur) params.set("curseur", opts.curseur);
  const qs = params.toString();
  return get(`${SIRENE_BASE}/siret/liensSuccession${qs ? "?" + qs : ""}`, token);
}

// ── MÉTADONNÉES ────────────────────────────────────────────────────────────

export function getNafClasse(token: string | undefined, code: string) {
  return get(`${META_BASE}/codes/nafr2/classe/${encodeURIComponent(code)}`, token);
}

export function getNafSousClasse(token: string | undefined, code: string) {
  return get(`${META_BASE}/codes/nafr2/sousClasse/${encodeURIComponent(code)}`, token);
}

export function getGeoCommune(token: string | undefined, code: string, date?: string) {
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  return get(`${META_BASE}/geo/commune/${encodeURIComponent(code)}${params}`, token);
}

export function getGeoDepartement(token: string | undefined, code: string, date?: string) {
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  return get(`${META_BASE}/geo/departement/${encodeURIComponent(code)}${params}`, token);
}

export function getGeoRegion(token: string | undefined, code: string, date?: string) {
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  return get(`${META_BASE}/geo/region/${encodeURIComponent(code)}${params}`, token);
}

export function getGeoPays(token: string | undefined, code: string) {
  return get(`${META_BASE}/geo/pays/${encodeURIComponent(code)}`, token);
}

export function listGeoCommunes(token: string | undefined, codeDepartement?: string, date?: string) {
  const params = new URLSearchParams();
  if (codeDepartement) params.set("codeDepartement", codeDepartement);
  if (date) params.set("date", date);
  const qs = params.toString();
  return get(`${META_BASE}/geo/communes${qs ? "?" + qs : ""}`, token);
}

export function listGeoDepartements(token: string | undefined, codeRegion?: string, date?: string) {
  const params = new URLSearchParams();
  if (codeRegion) params.set("codeRegion", codeRegion);
  if (date) params.set("date", date);
  const qs = params.toString();
  return get(`${META_BASE}/geo/departements${qs ? "?" + qs : ""}`, token);
}

export function listGeoRegions(token: string | undefined, date?: string) {
  const params = date ? `?date=${encodeURIComponent(date)}` : "";
  return get(`${META_BASE}/geo/regions${params}`, token);
}

// ── BDM ────────────────────────────────────────────────────────────────────

export function getBdmSeries(
  token: string | undefined,
  idbanks: string[],
  opts: { startPeriod?: string; endPeriod?: string; firstNObservations?: number; lastNObservations?: number },
) {
  const params = new URLSearchParams();
  if (opts.startPeriod) params.set("startPeriod", opts.startPeriod);
  if (opts.endPeriod) params.set("endPeriod", opts.endPeriod);
  if (opts.firstNObservations !== undefined)
    params.set("firstNObservations", String(opts.firstNObservations));
  if (opts.lastNObservations !== undefined)
    params.set("lastNObservations", String(opts.lastNObservations));
  params.set("format", "jsondata");
  const qs = params.toString();
  const id = idbanks.join("+");
  return get(
    `${BDM_BASE}/data/SERIES_BDM/${encodeURIComponent(id)}?${qs}`,
    token,
    "application/vnd.sdmx.data+json;version=1.0.0",
  );
}
