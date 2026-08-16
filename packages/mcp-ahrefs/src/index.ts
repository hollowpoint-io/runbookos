#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseRunbookConfig, type RunbookConfig } from "@runbookos/config";
import { authHint, fetchWithRetry } from "@runbookos/core";
import { z } from "zod";

export interface AhrefsKeyword {
  keyword: string;
  country: string;
  volume: number;
  difficulty: number;
  cpc?: number;
  intent: "commercial" | "informational" | "transactional" | "navigational";
  parentTopic?: string;
  currentPosition?: number;
  currentUrl?: string;
}

export interface AhrefsSiteOverview {
  domain: string;
  country: string;
  domainRating: number;
  organicTraffic: number;
  organicKeywords: number;
  referringDomains: number;
  topCompetitors: string[];
}

export interface AhrefsOrganicKeyword extends AhrefsKeyword {
  url: string;
  traffic: number;
  position: number;
}

export interface AhrefsTopPage {
  url: string;
  title: string;
  traffic: number;
  keywords: number;
  topKeyword: string;
  opportunityNote: string;
}

export interface AhrefsCompetitorGap {
  keyword: string;
  country: string;
  volume: number;
  difficulty: number;
  targetPosition?: number;
  competitors: Array<{
    domain: string;
    position: number;
    url: string;
  }>;
  opportunity: "create" | "refresh" | "optimize";
}

export interface AhrefsFixture {
  capturedAt: string;
  source: "public-demo-fixture";
  target: {
    domain: string;
    market: string;
    clientName: string;
  };
  keywordOverview: AhrefsKeyword[];
  matchingTerms: AhrefsKeyword[];
  siteOverview: AhrefsSiteOverview;
  organicKeywords: AhrefsOrganicKeyword[];
  topPages: AhrefsTopPage[];
  competitorGap: AhrefsCompetitorGap[];
  limits: {
    maxRowsPerTool: number;
    paidApiUnitsUsed: 0;
    liveData: false;
  };
}

interface AhrefsContext {
  root: string;
  config?: RunbookConfig;
  fixturePath?: string;
  authMode: AhrefsAuthMode;
  provider: AhrefsDataProvider;
}

type AhrefsContextBase = Omit<AhrefsContext, "provider">;
export type AhrefsAuthMode = "fixture" | "api_token";

export interface AhrefsProviderStatus {
  mode: AhrefsAuthMode;
  activeDataSource: "fixture" | "live";
  configured: boolean;
  liveReadAvailable: boolean;
  requiredEnv: string[];
  missingEnv: string[];
  credentialsPersistedByRunbookOS: false;
  fixturePath?: string;
  safety: {
    readOnly: true;
    writesImplemented: false;
    paidApiCallsImplemented: boolean;
    maxLiveRowsPerCall: number;
    credentialsPersistedByRunbookOS: false;
  };
  notes: string[];
}

export interface AhrefsDataProvider {
  status(): Promise<AhrefsProviderStatus>;
  fixtureData(client?: string): Promise<AhrefsFixture>;
  keywordOverview(input: { keyword?: string; country?: string; limit: number; client?: string }): Promise<AhrefsToolResult<AhrefsKeyword>>;
  keywordMatchingTerms(input: { seed?: string; country?: string; limit: number; client?: string }): Promise<AhrefsToolResult<AhrefsKeyword>>;
  siteOverview(input: { domain?: string; country?: string; client?: string }): Promise<AhrefsSiteOverview & AhrefsMetadata>;
  siteOrganicKeywords(input: { domain?: string; country?: string; limit: number; client?: string }): Promise<AhrefsToolResult<AhrefsOrganicKeyword>>;
  siteTopPages(input: { domain?: string; country?: string; limit: number; client?: string }): Promise<AhrefsToolResult<AhrefsTopPage>>;
  competitorGap(input: { domain?: string; country?: string; limit: number; client?: string }): Promise<AhrefsToolResult<AhrefsCompetitorGap>>;
}

interface AhrefsMetadata {
  source: string;
  mode: AhrefsAuthMode;
  retrievedAt: string;
  requestedDomain?: string;
  requestedCountry?: string;
  endpoint?: string;
  apiUnitBoundary?: string;
}

interface AhrefsToolResult<T> extends AhrefsMetadata {
  rows: T[];
  limit: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const textResult = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

export async function createAhrefsMcpServer(workspaceRoot = resolveWorkspaceRoot()): Promise<McpServer> {
  const context = await loadAhrefsContext(workspaceRoot);
  const server = new McpServer({
    name: "@runbookos/mcp-ahrefs",
    version: "0.1.0",
  });

  registerAhrefsResources(server, context);
  registerAhrefsTools(server, context);

  return server;
}

export async function createAhrefsDataProviderForWorkspace(
  workspaceRoot: string,
  options: { authMode?: AhrefsAuthMode; fixturePath?: string } = {},
): Promise<AhrefsDataProvider> {
  const context = await loadAhrefsContextBase(path.resolve(workspaceRoot), options);
  return createAhrefsDataProvider(context);
}

async function main() {
  const server = await createAhrefsMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerAhrefsResources(server: McpServer, context: AhrefsContext) {
  server.registerResource(
    "Ahrefs status",
    "runbook://ahrefs/status",
    {
      description: "Current Ahrefs MCP mode and safety boundary.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "runbook://ahrefs/status",
        mimeType: "application/json",
        text: JSON.stringify(await context.provider.status(), null, 2),
      }],
    }),
  );

  server.registerResource(
    "Ahrefs fixture data",
    "runbook://ahrefs/fixture-data",
    {
      description: "Fixture-backed public-safe Ahrefs-like SEO dataset.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "runbook://ahrefs/fixture-data",
        mimeType: "application/json",
        text: JSON.stringify(await context.provider.fixtureData(), null, 2),
      }],
    }),
  );
}

function registerAhrefsTools(server: McpServer, context: AhrefsContext) {
  server.registerTool(
    "ahrefs.keyword_overview",
    {
      title: "Ahrefs keyword overview",
      description: "Read fixture-backed keyword overview rows.",
      inputSchema: {
        keyword: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ keyword, country, limit, client }) => {
      const result = await context.provider.keywordOverview({ keyword, country, limit, client });
      return textResult(JSON.stringify(result.rows, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "ahrefs.keyword_matching_terms",
    {
      title: "Ahrefs keyword matching terms",
      description: "Read fixture-backed matching keyword ideas for a seed.",
      inputSchema: {
        seed: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ seed, country, limit, client }) => {
      const result = await context.provider.keywordMatchingTerms({ seed, country, limit, client });
      return textResult(JSON.stringify(result.rows, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "ahrefs.site_overview",
    {
      title: "Ahrefs site overview",
      description: "Read fixture-backed domain overview metrics.",
      inputSchema: {
        domain: z.string().optional(),
        country: z.string().optional(),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ domain, country, client }) => {
      const result = await context.provider.siteOverview({ domain, country, client });
      return textResult(JSON.stringify(result, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "ahrefs.site_organic_keywords",
    {
      title: "Ahrefs organic keywords",
      description: "Read fixture-backed organic keyword rows for a domain.",
      inputSchema: {
        domain: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ domain, country, limit, client }) => {
      const result = await context.provider.siteOrganicKeywords({ domain, country, limit, client });
      return textResult(JSON.stringify(result.rows, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "ahrefs.site_top_pages",
    {
      title: "Ahrefs top pages",
      description: "Read fixture-backed top organic pages for a domain.",
      inputSchema: {
        domain: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ domain, country, limit, client }) => {
      const result = await context.provider.siteTopPages({ domain, country, limit, client });
      return textResult(JSON.stringify(result.rows, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "ahrefs.competitor_gap",
    {
      title: "Ahrefs competitor gap",
      description: "Read fixture-backed competitor keyword gap rows.",
      inputSchema: {
        domain: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(25),
        client: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ domain, country, limit, client }) => {
      const result = await context.provider.competitorGap({ domain, country, limit, client });
      return textResult(JSON.stringify(result.rows, null, 2), result as unknown as Record<string, unknown>);
    },
  );
}

class FixtureAhrefsDataProvider implements AhrefsDataProvider {
  constructor(private context: AhrefsContextBase) {}

  async status(): Promise<AhrefsProviderStatus> {
    const fixturePath = await findFixturePath(this.context).catch(() => undefined);
    const hasToken = Boolean(process.env.AHREFS_API_TOKEN);
    return {
      mode: "fixture",
      activeDataSource: "fixture",
      configured: Boolean(fixturePath),
      liveReadAvailable: false,
      requiredEnv: [],
      missingEnv: [],
      credentialsPersistedByRunbookOS: false,
      fixturePath,
      safety: {
        readOnly: true,
        writesImplemented: false,
        paidApiCallsImplemented: false,
        maxLiveRowsPerCall: 0,
        credentialsPersistedByRunbookOS: false,
      },
      notes: [
        "Fixture mode uses public demo data and does not call Ahrefs.",
        "No Ahrefs API units are consumed in fixture mode.",
        hasToken ? "AHREFS_API_TOKEN is present but ignored because fixture mode is active." : undefined,
      ].filter((note): note is string => Boolean(note)),
    };
  }

  async fixtureData(client?: string): Promise<AhrefsFixture> {
    return this.loadFixture(client);
  }

  async keywordOverview(input: { keyword?: string; country?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    return this.rows(
      fixture,
      fixture.keywordOverview
        .filter((row) => countryMatches(row.country, input.country))
        .filter((row) => !input.keyword || row.keyword.toLowerCase().includes(input.keyword.toLowerCase()))
        .slice(0, input.limit),
      input,
    );
  }

  async keywordMatchingTerms(input: { seed?: string; country?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    return this.rows(
      fixture,
      fixture.matchingTerms
        .filter((row) => countryMatches(row.country, input.country))
        .filter((row) => !input.seed || row.keyword.toLowerCase().includes(input.seed.toLowerCase()) || row.parentTopic?.toLowerCase().includes(input.seed.toLowerCase()))
        .slice(0, input.limit),
      input,
    );
  }

  async siteOverview(input: { domain?: string; country?: string; client?: string }): Promise<AhrefsSiteOverview & AhrefsMetadata> {
    const fixture = await this.loadFixture(input.client);
    return {
      ...fixture.siteOverview,
      source: fixtureSource(this.context, input.client),
      mode: "fixture",
      retrievedAt: fixture.capturedAt,
      requestedDomain: input.domain ?? fixture.target.domain,
      requestedCountry: input.country ?? fixture.target.market,
    };
  }

  async siteOrganicKeywords(input: { domain?: string; country?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    return this.rows(
      fixture,
      fixture.organicKeywords
        .filter((row) => countryMatches(row.country, input.country))
        .slice(0, input.limit),
      input,
    );
  }

  async siteTopPages(input: { domain?: string; country?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    return this.rows(fixture, fixture.topPages.slice(0, input.limit), input);
  }

  async competitorGap(input: { domain?: string; country?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    return this.rows(
      fixture,
      fixture.competitorGap
        .filter((row) => countryMatches(row.country, input.country))
        .slice(0, input.limit),
      input,
    );
  }

  private async loadFixture(client?: string): Promise<AhrefsFixture> {
    const file = await findFixturePath(this.context, client);
    return JSON.parse(await fs.readFile(file, "utf-8")) as AhrefsFixture;
  }

  private rows<T>(fixture: AhrefsFixture, rows: T[], input: { domain?: string; country?: string; limit: number; client?: string }): AhrefsToolResult<T> {
    return {
      rows,
      source: fixtureSource(this.context, input.client),
      mode: "fixture",
      retrievedAt: fixture.capturedAt,
      requestedDomain: input.domain ?? fixture.target.domain,
      requestedCountry: input.country ?? fixture.target.market,
      limit: input.limit,
    };
  }
}

class AhrefsApiTokenDataProvider implements AhrefsDataProvider {
  private client: AhrefsApiClient;

  constructor(private context: AhrefsContextBase) {
    this.client = new AhrefsApiClient();
  }

  async status(): Promise<AhrefsProviderStatus> {
    const missingEnv = requiredLiveEnv().filter((name) => !process.env[name]);
    return {
      mode: "api_token",
      activeDataSource: "live",
      configured: missingEnv.length === 0,
      liveReadAvailable: missingEnv.length === 0,
      requiredEnv: requiredLiveEnv(),
      missingEnv,
      credentialsPersistedByRunbookOS: false,
      safety: {
        readOnly: true,
        writesImplemented: false,
        paidApiCallsImplemented: true,
        maxLiveRowsPerCall: maxLiveRowsPerCall(),
        credentialsPersistedByRunbookOS: false,
      },
      notes: [
        "Live reads use AHREFS_API_TOKEN from runtime env.",
        "RunbookOS does not persist Ahrefs credentials.",
        "Every live request applies a hard row cap before calling Ahrefs.",
        "Ahrefs API responses can consume paid API units; keep limits explicit.",
        "competitor_gap remains fixture-only until a stable live contract is mapped.",
      ],
    };
  }

  async fixtureData(): Promise<AhrefsFixture> {
    throw new Error("runbook://ahrefs/fixture-data is only available in fixture mode.");
  }

  async keywordOverview(input: { keyword?: string; country?: string; limit: number }) {
    if (!input.keyword) throw new Error("ahrefs.keyword_overview in api_token mode requires keyword.");
    const rows = await this.client.keywordOverview({
      keyword: input.keyword,
      country: normalizeCountry(input.country),
      limit: clampLiveLimit(input.limit),
    });
    return liveRows(rows, {
      endpoint: "/v3/keywords-explorer/overview",
      requestedCountry: normalizeCountry(input.country),
      limit: clampLiveLimit(input.limit),
    });
  }

  async keywordMatchingTerms(input: { seed?: string; country?: string; limit: number }) {
    if (!input.seed) throw new Error("ahrefs.keyword_matching_terms in api_token mode requires seed.");
    const rows = await this.client.keywordMatchingTerms({
      seed: input.seed,
      country: normalizeCountry(input.country),
      limit: clampLiveLimit(input.limit),
    });
    return liveRows(rows, {
      endpoint: "/v3/keywords-explorer/matching-terms",
      requestedCountry: normalizeCountry(input.country),
      limit: clampLiveLimit(input.limit),
    });
  }

  async siteOverview(input: { domain?: string; country?: string }): Promise<AhrefsSiteOverview & AhrefsMetadata> {
    const domain = requiredDomain(input.domain);
    const country = normalizeCountry(input.country);
    const [domainRating, metrics] = await Promise.all([
      this.client.domainRating({ domain }),
      this.client.metrics({ domain, country }),
    ]);
    return {
      domain,
      country,
      domainRating,
      organicTraffic: metrics.organicTraffic,
      organicKeywords: metrics.organicKeywords,
      referringDomains: 0,
      topCompetitors: [],
      source: "ahrefs-api-v3",
      mode: "api_token",
      retrievedAt: new Date().toISOString(),
      requestedDomain: domain,
      requestedCountry: country,
      endpoint: "/v3/site-explorer/domain-rating + /v3/site-explorer/metrics",
      apiUnitBoundary: liveApiUnitBoundary(),
    };
  }

  async siteOrganicKeywords(input: { domain?: string; country?: string; limit: number }) {
    const domain = requiredDomain(input.domain);
    const country = normalizeCountry(input.country);
    const limit = clampLiveLimit(input.limit);
    const rows = await this.client.organicKeywords({ domain, country, limit });
    return liveRows(rows, {
      endpoint: "/v3/site-explorer/organic-keywords",
      requestedDomain: domain,
      requestedCountry: country,
      limit,
    });
  }

  async siteTopPages(input: { domain?: string; country?: string; limit: number }) {
    const domain = requiredDomain(input.domain);
    const country = normalizeCountry(input.country);
    const limit = clampLiveLimit(input.limit);
    const rows = await this.client.topPages({ domain, country, limit });
    return liveRows(rows, {
      endpoint: "/v3/site-explorer/top-pages",
      requestedDomain: domain,
      requestedCountry: country,
      limit,
    });
  }

  async competitorGap(input: { domain?: string; country?: string; limit: number }): Promise<AhrefsToolResult<AhrefsCompetitorGap>> {
    throw new Error(`ahrefs.competitor_gap live mode is not implemented yet. Use fixture mode or combine organic-competitors/top-pages in a future approved wrapper. Requested ${input.domain ?? "domain"} ${input.country ?? ""} limit ${input.limit}.`);
  }
}

class AhrefsApiClient {
  private baseUrl = "https://api.ahrefs.com/v3";

  async domainRating(input: { domain: string }): Promise<number> {
    const json = await this.get("/site-explorer/domain-rating", {
      target: input.domain,
      date: ahrefsDate(),
      protocol: "both",
      output: "json",
    });
    const domainRating = recordValue(json, "domain_rating");
    return numberValue(domainRating.domain_rating, 0);
  }

  async metrics(input: { domain: string; country: string }): Promise<{ organicTraffic: number; organicKeywords: number }> {
    const json = await this.get("/site-explorer/metrics", {
      target: input.domain,
      mode: "subdomains",
      country: input.country,
      date: ahrefsDate(),
      volume_mode: "monthly",
      output: "json",
    });
    const metrics = recordValue(json, "metrics");
    return {
      organicTraffic: numberValue(metrics.org_traffic, 0),
      organicKeywords: numberValue(metrics.org_keywords, 0),
    };
  }

  async organicKeywords(input: { domain: string; country: string; limit: number }): Promise<AhrefsOrganicKeyword[]> {
    const json = await this.get("/site-explorer/organic-keywords", {
      target: input.domain,
      mode: "subdomains",
      country: input.country,
      date: ahrefsDate(),
      volume_mode: "monthly",
      limit: String(input.limit),
      order_by: "sum_traffic:desc",
      select: [
        "keyword",
        "keyword_country",
        "volume",
        "keyword_difficulty",
        "cpc",
        "is_commercial",
        "is_informational",
        "is_transactional",
        "is_navigational",
        "best_position",
        "best_position_url",
        "sum_traffic",
      ].join(","),
      output: "json",
    });
    return arrayValue(json.keywords).map((row) => mapLiveOrganicKeyword(row));
  }

  async topPages(input: { domain: string; country: string; limit: number }): Promise<AhrefsTopPage[]> {
    const json = await this.get("/site-explorer/top-pages", {
      target: input.domain,
      mode: "subdomains",
      country: input.country,
      date: ahrefsDate(),
      volume_mode: "monthly",
      limit: String(input.limit),
      order_by: "sum_traffic:desc",
      select: [
        "url",
        "top_keyword",
        "sum_traffic",
        "keywords",
        "top_keyword_best_position_title",
      ].join(","),
      output: "json",
    });
    return arrayValue(json.pages).map((row) => ({
      url: stringFrom(row.url),
      title: stringFrom(row.top_keyword_best_position_title) || stringFrom(row.url),
      traffic: numberValue(row.sum_traffic, 0),
      keywords: numberValue(row.keywords, 0),
      topKeyword: stringFrom(row.top_keyword),
      opportunityNote: "Live Ahrefs top-page row; review page intent, internal links, and refresh opportunities before recommending changes.",
    }));
  }

  async keywordOverview(input: { keyword: string; country: string; limit: number }): Promise<AhrefsKeyword[]> {
    const json = await this.get("/keywords-explorer/overview", {
      country: input.country,
      keywords: input.keyword,
      limit: String(input.limit),
      select: [
        "keyword",
        "volume",
        "difficulty",
        "cpc",
        "intents",
        "parent_topic",
      ].join(","),
      output: "json",
    });
    return arrayValue(json.keywords).map((row) => mapLiveKeyword(row, input.country));
  }

  async keywordMatchingTerms(input: { seed: string; country: string; limit: number }): Promise<AhrefsKeyword[]> {
    const json = await this.get("/keywords-explorer/matching-terms", {
      country: input.country,
      keywords: input.seed,
      match_mode: "terms",
      limit: String(input.limit),
      order_by: "volume:desc",
      select: [
        "keyword",
        "volume",
        "difficulty",
        "cpc",
        "intents",
        "parent_topic",
      ].join(","),
      output: "json",
    });
    return arrayValue(json.keywords).map((row) => mapLiveKeyword(row, input.country));
  }

  private async get(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const token = process.env.AHREFS_API_TOKEN;
    if (!token) throw new Error("Missing required Ahrefs env: AHREFS_API_TOKEN.");

    const url = new URL(`${this.baseUrl}${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }

    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }, { label: "Ahrefs API" });

    const text = await response.text();
    const parsed = parseJsonObject(text);
    if (!response.ok) {
      const hint = authHint(response.status, "Ahrefs API", ["AHREFS_API_TOKEN"]);
      const message = hint ?? (stringFrom(parsed.error) || `Ahrefs API request failed with HTTP ${response.status}`);
      throw new Error(`${message} (${endpoint})`);
    }
    return parsed;
  }
}

async function loadAhrefsContext(workspaceRoot: string): Promise<AhrefsContext> {
  const context = await loadAhrefsContextBase(path.resolve(workspaceRoot));
  return {
    ...context,
    provider: createAhrefsDataProvider(context),
  };
}

async function loadAhrefsContextBase(
  workspaceRoot: string,
  options: { authMode?: AhrefsAuthMode; fixturePath?: string } = {},
): Promise<AhrefsContextBase> {
  const configPath = path.join(workspaceRoot, "runbookos.config.json");
  const config = await fs.readFile(configPath, "utf-8")
    .then((raw) => parseRunbookConfig(JSON.parse(raw)))
    .catch(() => undefined);

  return {
    root: workspaceRoot,
    config,
    fixturePath: options.fixturePath,
    authMode: options.authMode ?? parseAhrefsAuthMode(process.env.RUNBOOKOS_AHREFS_AUTH_MODE),
  };
}

function createAhrefsDataProvider(context: AhrefsContextBase): AhrefsDataProvider {
  if (context.authMode === "api_token") return new AhrefsApiTokenDataProvider(context);
  return new FixtureAhrefsDataProvider(context);
}

async function findFixturePath(context: AhrefsContextBase, client?: string): Promise<string> {
  const candidates = [
    client ? clientFixturePath(context, client) : undefined,
    context.fixturePath,
    process.env.RUNBOOKOS_AHREFS_FIXTURE,
    safeJoin(repoRoot, "examples/fixtures/ahrefs-demo-seo.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const resolved = path.resolve(context.root, candidate);
    if (await exists(resolved)) return resolved;
  }

  throw new Error("No Ahrefs fixture found. Set RUNBOOKOS_AHREFS_FIXTURE or add workspace/clients/<client>/data/ahrefs-fixtures.json.");
}

function clientFixturePath(context: AhrefsContextBase, client: string): string | undefined {
  const clientRoot = context.config?.workspace.clientRoot ?? "workspace/clients";
  return safeJoin(context.root, path.join(clientRoot, client, "data", "ahrefs-fixtures.json"));
}

function fixtureSource(context: AhrefsContextBase, client?: string): string {
  if (client) return `workspace client fixture for ${client}`;
  if (context.fixturePath) return "configured fixture path";
  if (process.env.RUNBOOKOS_AHREFS_FIXTURE) return "RUNBOOKOS_AHREFS_FIXTURE";
  return "public demo fixture";
}

function countryMatches(rowCountry: string, requestedCountry?: string): boolean {
  return !requestedCountry || rowCountry.toLowerCase() === requestedCountry.toLowerCase();
}

function parseAhrefsAuthMode(value: string | undefined): AhrefsAuthMode {
  if (!value || value === "fixture") return "fixture";
  if (value === "api_token") return "api_token";
  throw new Error("RUNBOOKOS_AHREFS_AUTH_MODE must be `fixture` or `api_token`.");
}

function requiredLiveEnv(): string[] {
  return ["RUNBOOKOS_AHREFS_AUTH_MODE", "AHREFS_API_TOKEN"];
}

function maxLiveRowsPerCall(): number {
  const raw = Number.parseInt(process.env.RUNBOOKOS_AHREFS_MAX_ROWS ?? "25", 10);
  if (!Number.isFinite(raw)) return 25;
  return Math.max(1, Math.min(raw, 100));
}

function clampLiveLimit(limit: number): number {
  return Math.max(1, Math.min(limit, maxLiveRowsPerCall()));
}

function liveApiUnitBoundary(): string {
  return `Live Ahrefs API request with max ${maxLiveRowsPerCall()} rows per call; Ahrefs may charge API units by endpoint and selected fields.`;
}

function liveRows<T>(
  rows: T[],
  input: {
    endpoint: string;
    requestedDomain?: string;
    requestedCountry?: string;
    limit: number;
  },
): AhrefsToolResult<T> {
  return {
    rows,
    source: "ahrefs-api-v3",
    mode: "api_token",
    retrievedAt: new Date().toISOString(),
    requestedDomain: input.requestedDomain,
    requestedCountry: input.requestedCountry,
    endpoint: input.endpoint,
    apiUnitBoundary: liveApiUnitBoundary(),
    limit: input.limit,
  };
}

function requiredDomain(value: string | undefined): string {
  const domain = value?.trim();
  if (!domain) throw new Error("Ahrefs live site tools require domain.");
  return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function normalizeCountry(value: string | undefined): string {
  return (value ?? "gb").trim().toLowerCase();
}

function ahrefsDate(): string {
  if (process.env.RUNBOOKOS_AHREFS_DATE) return process.env.RUNBOOKOS_AHREFS_DATE;
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 2);
  return date.toISOString().slice(0, 10);
}

function mapLiveKeyword(row: Record<string, unknown>, country: string): AhrefsKeyword {
  return {
    keyword: stringFrom(row.keyword),
    country,
    volume: numberValue(row.volume, 0),
    difficulty: numberValue(row.difficulty, 0),
    cpc: optionalCpc(row.cpc),
    intent: liveIntent(recordValue(row, "intents")),
    parentTopic: stringFrom(row.parent_topic) || undefined,
  };
}

function mapLiveOrganicKeyword(row: Record<string, unknown>): AhrefsOrganicKeyword {
  return {
    keyword: stringFrom(row.keyword),
    country: stringFrom(row.keyword_country).toLowerCase(),
    volume: numberValue(row.volume, 0),
    difficulty: numberValue(row.keyword_difficulty, 0),
    cpc: optionalCpc(row.cpc),
    intent: liveIntent(row),
    parentTopic: undefined,
    currentPosition: optionalNumber(row.best_position),
    currentUrl: stringFrom(row.best_position_url) || undefined,
    url: stringFrom(row.best_position_url),
    traffic: numberValue(row.sum_traffic, 0),
    position: numberValue(row.best_position, 0),
  };
}

function liveIntent(row: Record<string, unknown>): AhrefsKeyword["intent"] {
  if (row.transactional === true || row.is_transactional === true) return "transactional";
  if (row.commercial === true || row.is_commercial === true) return "commercial";
  if (row.navigational === true || row.is_navigational === true) return "navigational";
  return "informational";
}

function optionalCpc(value: unknown): number | undefined {
  const cpc = optionalNumber(value);
  return typeof cpc === "number" ? cpc / 100 : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function recordValue(value: unknown, key?: string): Record<string, unknown> {
  const target = key ? (value as Record<string, unknown> | undefined)?.[key] : value;
  return target && typeof target === "object" && !Array.isArray(target)
    ? target as Record<string, unknown>
    : {};
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text) as unknown;
    return recordValue(parsed);
  } catch {
    return {};
  }
}

function resolveWorkspaceRoot(): string {
  const args = process.argv.slice(2);
  const workspaceIndex = args.indexOf("--workspace");
  if (workspaceIndex >= 0 && args[workspaceIndex + 1]) {
    return path.resolve(args[workspaceIndex + 1]);
  }
  return path.resolve(process.env.RUNBOOKOS_WORKSPACE_DIR ?? process.cwd());
}

function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) return relativePath;
  const resolved = path.resolve(root, relativePath);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes root: ${relativePath}`);
  }
  return resolved;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
