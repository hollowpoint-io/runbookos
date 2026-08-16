#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseRunbookConfig, type RunbookConfig } from "@runbookos/config";
import { authHint, fetchWithRetry } from "@runbookos/core";
import { z } from "zod";

export interface ShopifyFixture {
  store: {
    domain: string;
    name: string;
    currency?: string;
    theme?: {
      name?: string;
      version?: string;
      issues?: string[];
    };
  };
  products: Array<{
    handle: string;
    title: string;
    status: string;
    vendor?: string;
    type?: string;
    tags?: string[];
    price?: number;
    compareAtPrice?: number;
    inventory?: number;
    seoTitle?: string;
    seoDescription?: string;
    imageAltCoverage?: string;
    merchandisingNote?: string;
  }>;
  collections: Array<{
    handle: string;
    title: string;
    productCount: number;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    imageAltCoverage?: string;
  }>;
  navigation?: {
    menus?: Array<{
      title: string;
      itemCount: number;
      orphanedHandles?: string[];
    }>;
  };
  content?: {
    pages?: Array<{
      handle: string;
      title: string;
      status: string;
      hasSeoFields?: boolean;
    }>;
    blogPostCount?: number;
  };
  performance?: {
    mobileSpeedScore?: number;
    largestContentfulPaintSeconds?: number;
    brokenLinks?: number;
  };
  operations: {
    redirectsChecked?: boolean;
    marketsConfigured?: boolean;
    analyticsConfigured?: boolean;
    customerDataIncluded?: boolean;
    policiesConfigured?: string[];
    appCount?: number;
  };
}

interface ShopifyContext {
  root: string;
  config?: RunbookConfig;
  fixturePath?: string;
  authMode: ShopifyAuthMode;
  provider: ShopifyDataProvider;
}

export type ShopifyAuthMode = "fixture" | "customer_custom_app" | "oauth_managed_app";
type ShopifyContextBase = Omit<ShopifyContext, "provider">;

export interface ShopifyCredentialProvider {
  mode: ShopifyAuthMode;
  describe(): ShopifyCredentialStatus;
  assertReady(): void;
}

export interface ShopifyCredentialStatus {
  mode: ShopifyAuthMode;
  activeDataSource: "fixture" | "live";
  configured: boolean;
  liveReadAvailable: boolean;
  requiredEnv: string[];
  missingEnv: string[];
  credentialsPersistedByRunbookOS: false;
  setup: string;
}

export interface ShopifyDataProvider {
  mode: ShopifyAuthMode;
  status(): Promise<ShopifyProviderStatus>;
  fixtureStore(client?: string): Promise<ShopifyFixture>;
  storeOverview(client?: string): Promise<Record<string, unknown>>;
  productSearch(input: { query?: string; status?: string; limit: number; client?: string }): Promise<{
    products: ShopifyFixture["products"];
    source: string;
    mode: ShopifyAuthMode;
  }>;
  collectionSearch(input: { query?: string; limit: number; client?: string }): Promise<{
    collections: ShopifyFixture["collections"];
    source: string;
    mode: ShopifyAuthMode;
  }>;
  themeInspect(client?: string): Promise<Record<string, unknown>>;
}

export interface ShopifyProviderStatus extends ShopifyCredentialStatus {
  fixturePath?: string;
  safety: {
    readOnly: true;
    excludedData: string[];
    writesImplemented: false;
    credentialsPersistedByRunbookOS: false;
  };
  notes: string[];
}

interface ShopifyLiveCredentials {
  shopDomain: string;
  adminToken: string;
  apiVersion: string;
}

interface ShopifyGraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

interface ShopifyProductNode {
  handle: string;
  title: string;
  status?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  totalInventory?: number | null;
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  featuredMedia?: {
    alt?: string | null;
  } | null;
  priceRangeV2?: {
    minVariantPrice?: {
      amount?: string;
      currencyCode?: string;
    };
    maxVariantPrice?: {
      amount?: string;
      currencyCode?: string;
    };
  };
}

interface ShopifyCollectionNode {
  handle: string;
  title: string;
  description?: string;
  seo?: {
    title?: string | null;
    description?: string | null;
  } | null;
  image?: {
    altText?: string | null;
  } | null;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

const textResult = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

export async function createShopifyMcpServer(workspaceRoot = resolveWorkspaceRoot()): Promise<McpServer> {
  const context = await loadShopifyContext(workspaceRoot);
  const server = new McpServer({
    name: "@runbookos/mcp-shopify",
    version: "0.1.0",
  });

  registerShopifyResources(server, context);
  registerShopifyTools(server, context);

  return server;
}

export async function createShopifyDataProviderForWorkspace(
  workspaceRoot: string,
  options: { authMode?: ShopifyAuthMode; fixturePath?: string } = {},
): Promise<ShopifyDataProvider> {
  const context = await loadShopifyContextBase(path.resolve(workspaceRoot), options);
  return createShopifyDataProvider(context);
}

async function main() {
  const server = await createShopifyMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerShopifyResources(server: McpServer, context: ShopifyContext) {
  server.registerResource(
    "Shopify status",
    "runbook://shopify/status",
    {
      description: "Current Shopify MCP mode and safety boundary.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "runbook://shopify/status",
        mimeType: "application/json",
        text: JSON.stringify(await context.provider.status(), null, 2),
      }],
    }),
  );

  server.registerResource(
    "Shopify fixture store",
    "runbook://shopify/fixture-store",
    {
      description: "Fixture-backed public-safe Shopify store snapshot.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "runbook://shopify/fixture-store",
        mimeType: "application/json",
        text: JSON.stringify(await context.provider.fixtureStore(), null, 2),
      }],
    }),
  );
}

function registerShopifyTools(server: McpServer, context: ShopifyContext) {
  server.registerTool(
    "shopify.store_overview",
    {
      title: "Shopify store overview",
      description: "Read a public-safe store overview from fixture data.",
      inputSchema: {
        client: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ client }) => {
      const overview = await context.provider.storeOverview(client);
      return textResult(JSON.stringify(overview, null, 2), { overview });
    },
  );

  server.registerTool(
    "shopify.product_search",
    {
      title: "Shopify product search",
      description: "Search public-safe product fixture fields.",
      inputSchema: {
        query: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(25),
        client: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ query, status, limit, client }) => {
      const result = await context.provider.productSearch({ query, status, limit, client });
      return textResult(JSON.stringify(result.products, null, 2), result);
    },
  );

  server.registerTool(
    "shopify.collection_search",
    {
      title: "Shopify collection search",
      description: "Search public-safe collection fixture fields.",
      inputSchema: {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(25),
        client: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ query, limit, client }) => {
      const result = await context.provider.collectionSearch({ query, limit, client });
      return textResult(JSON.stringify(result.collections, null, 2), result);
    },
  );

  server.registerTool(
    "shopify.theme_inspect",
    {
      title: "Shopify theme inspect",
      description: "Read fixture theme metadata and known theme issues.",
      inputSchema: {
        client: z.string().optional(),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ client }) => {
      const theme = await context.provider.themeInspect(client);
      return textResult(JSON.stringify(theme, null, 2), { theme });
    },
  );
}

async function findFixturePath(context: ShopifyContextBase, client?: string): Promise<string> {
  const candidates = [
    client ? clientFixturePath(context, client) : undefined,
    context.fixturePath,
    process.env.RUNBOOKOS_SHOPIFY_FIXTURE,
    safeJoin(repoRoot, "examples/fixtures/shopify-demo-store.json"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const resolved = path.resolve(context.root, candidate);
    if (await exists(resolved)) return resolved;
  }

  throw new Error("No Shopify fixture found. Set RUNBOOKOS_SHOPIFY_FIXTURE or add workspace/clients/<client>/data/shopify-fixtures.json.");
}

function clientFixturePath(context: ShopifyContextBase, client: string): string | undefined {
  const clientRoot = context.config?.workspace.clientRoot ?? "workspace/clients";
  return safeJoin(context.root, path.join(clientRoot, client, "data", "shopify-fixtures.json"));
}

function productMatches(product: ShopifyFixture["products"][number], query: string): boolean {
  const text = [
    product.handle,
    product.title,
    product.vendor,
    product.type,
    product.seoTitle,
    product.seoDescription,
    ...(product.tags ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes(query.toLowerCase());
}

function collectionMatches(collection: ShopifyFixture["collections"][number], query: string): boolean {
  const text = [
    collection.handle,
    collection.title,
    collection.description,
    collection.seoTitle,
    collection.seoDescription,
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes(query.toLowerCase());
}

function fixtureSource(context: ShopifyContextBase, client?: string): string {
  if (client) return `workspace client fixture for ${client}`;
  if (context.fixturePath) return "configured fixture path";
  if (process.env.RUNBOOKOS_SHOPIFY_FIXTURE) return "RUNBOOKOS_SHOPIFY_FIXTURE";
  return "public demo fixture";
}

class FixtureCredentialProvider implements ShopifyCredentialProvider {
  mode: ShopifyAuthMode = "fixture";

  describe(): ShopifyCredentialStatus {
    return {
      mode: this.mode,
      activeDataSource: "fixture",
      configured: true,
      liveReadAvailable: false,
      requiredEnv: [],
      missingEnv: [],
      credentialsPersistedByRunbookOS: false,
      setup: "Uses public fixture data and ignores Shopify credential env vars.",
    };
  }

  assertReady() {}
}

class CustomerCustomAppCredentialProvider implements ShopifyCredentialProvider {
  mode: ShopifyAuthMode = "customer_custom_app";

  describe(): ShopifyCredentialStatus {
    const requiredEnv = ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_TOKEN"];
    const missingEnv = requiredEnv.filter((name) => !process.env[name]);
    return {
      mode: this.mode,
      activeDataSource: "live",
      configured: missingEnv.length === 0,
      liveReadAvailable: missingEnv.length === 0,
      requiredEnv,
      missingEnv,
      credentialsPersistedByRunbookOS: false,
      setup: "Customer supplies their own custom app token through env or secret manager.",
    };
  }

  assertReady() {
    const status = this.describe();
    if (status.missingEnv.length > 0) {
      throw new Error(`Missing required Shopify custom app env: ${status.missingEnv.join(", ")}.`);
    }
    normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN ?? "");
  }

  credentials(): ShopifyLiveCredentials {
    this.assertReady();
    return {
      shopDomain: normalizeShopDomain(process.env.SHOPIFY_SHOP_DOMAIN ?? ""),
      adminToken: process.env.SHOPIFY_ADMIN_TOKEN ?? "",
      apiVersion: process.env.SHOPIFY_API_VERSION ?? "2026-04",
    };
  }
}

class OAuthManagedAppCredentialProvider implements ShopifyCredentialProvider {
  mode: ShopifyAuthMode = "oauth_managed_app";

  describe(): ShopifyCredentialStatus {
    const requiredEnv = ["RUNBOOKOS_SHOPIFY_OAUTH_SESSION"];
    return {
      mode: this.mode,
      activeDataSource: "live",
      configured: false,
      liveReadAvailable: false,
      requiredEnv,
      missingEnv: requiredEnv,
      credentialsPersistedByRunbookOS: false,
      setup: "Future managed app install/token-exchange flow. Requires a backend auth service and encrypted per-shop token storage.",
    };
  }

  assertReady() {
    throw new Error(reservedModeError(this.mode));
  }
}

class FixtureShopifyDataProvider implements ShopifyDataProvider {
  mode: ShopifyAuthMode = "fixture";

  constructor(
    private context: ShopifyContextBase,
    private credentials: ShopifyCredentialProvider,
  ) {}

  async status(): Promise<ShopifyProviderStatus> {
    const fixturePath = await findFixturePath(this.context).catch(() => undefined);
    const credentialStatus = this.credentials.describe();
    const hasIgnoredShopifyEnv = Boolean(process.env.SHOPIFY_SHOP_DOMAIN || process.env.SHOPIFY_ADMIN_TOKEN);
    return {
      ...credentialStatus,
      configured: Boolean(fixturePath),
      fixturePath,
      safety: shopifySafetyBoundary(),
      notes: [
        "Fixture mode is the only implemented mode in the public package right now.",
        hasIgnoredShopifyEnv
          ? "Shopify env vars are present but ignored because auth mode is fixture."
          : undefined,
      ].filter((note): note is string => Boolean(note)),
    };
  }

  async fixtureStore(client?: string): Promise<ShopifyFixture> {
    return this.loadFixture(client);
  }

  async storeOverview(client?: string): Promise<Record<string, unknown>> {
    const fixture = await this.loadFixture(client);
    return {
      source: fixtureSource(this.context, client),
      retrievedAt: new Date().toISOString(),
      mode: this.mode,
      limits: "No customer, order, payment, token, or private client data.",
      store: fixture.store,
      counts: {
        products: fixture.products.length,
        activeProducts: fixture.products.filter((product) => product.status === "active").length,
        collections: fixture.collections.length,
        blogPosts: fixture.content?.blogPostCount ?? 0,
      },
      operations: fixture.operations,
      performance: fixture.performance,
    };
  }

  async productSearch(input: { query?: string; status?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    const products = fixture.products
      .filter((product) => !input.status || product.status === input.status)
      .filter((product) => !input.query || productMatches(product, input.query))
      .slice(0, input.limit);
    return {
      products,
      source: fixtureSource(this.context, input.client),
      mode: this.mode,
    };
  }

  async collectionSearch(input: { query?: string; limit: number; client?: string }) {
    const fixture = await this.loadFixture(input.client);
    const collections = fixture.collections
      .filter((collection) => !input.query || collectionMatches(collection, input.query))
      .slice(0, input.limit);
    return {
      collections,
      source: fixtureSource(this.context, input.client),
      mode: this.mode,
    };
  }

  async themeInspect(client?: string): Promise<Record<string, unknown>> {
    const fixture = await this.loadFixture(client);
    return {
      source: fixtureSource(this.context, client),
      mode: this.mode,
      theme: fixture.store.theme ?? {},
      navigation: fixture.navigation ?? {},
      performance: fixture.performance ?? {},
    };
  }

  private async loadFixture(client?: string): Promise<ShopifyFixture> {
    this.credentials.assertReady();
    const file = await findFixturePath(this.context, client);
    return JSON.parse(await fs.readFile(file, "utf-8")) as ShopifyFixture;
  }
}

class CustomerCustomAppShopifyDataProvider implements ShopifyDataProvider {
  mode: ShopifyAuthMode = "customer_custom_app";

  constructor(private credentialsProvider: CustomerCustomAppCredentialProvider) {}

  async status(): Promise<ShopifyProviderStatus> {
    return {
      ...this.credentialsProvider.describe(),
      safety: shopifySafetyBoundary(),
      notes: [
        "Live reads use the customer's custom app Admin API token from runtime env.",
        "RunbookOS does not persist Shopify credentials.",
        "This provider only reads shop, product, collection, and theme metadata.",
        "Customer, order, payment, and token objects are excluded.",
      ],
    };
  }

  async fixtureStore(): Promise<ShopifyFixture> {
    throw new Error("runbook://shopify/fixture-store is only available in fixture mode.");
  }

  async storeOverview(): Promise<Record<string, unknown>> {
    const credentials = this.credentialsProvider.credentials();
    const client = new ShopifyAdminClient(credentials);
    const data = await client.graphql<{
      shop: {
        name: string;
        myshopifyDomain?: string;
        currencyCode?: string;
        primaryDomain?: {
          host?: string;
          url?: string;
        } | null;
      };
      products: { edges: Array<{ node: ShopifyProductNode }> };
      collections: { edges: Array<{ node: ShopifyCollectionNode }> };
    }>(`
      query RunbookOSOverview($productLimit: Int!, $collectionLimit: Int!) {
        shop {
          name
          myshopifyDomain
          currencyCode
          primaryDomain {
            host
            url
          }
        }
        products(first: $productLimit) {
          edges {
            node {
              handle
              title
              status
              vendor
              productType
              tags
              totalInventory
              seo {
                title
                description
              }
              featuredMedia {
                alt
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
        collections(first: $collectionLimit) {
          edges {
            node {
              handle
              title
              description
              seo {
                title
                description
              }
              image {
                altText
              }
            }
          }
        }
      }
    `, {
      productLimit: 25,
      collectionLimit: 25,
    });

    const products = data.products.edges.map((edge) => mapLiveProduct(edge.node));
    const collections = data.collections.edges.map((edge) => mapLiveCollection(edge.node));
    return {
      source: "shopify-admin-api",
      retrievedAt: new Date().toISOString(),
      mode: this.mode,
      limits: "Read-only shop/product/collection metadata. No customer, order, payment, token, or private app data.",
      store: {
        domain: data.shop.myshopifyDomain ?? credentials.shopDomain,
        name: data.shop.name,
        currency: data.shop.currencyCode,
        primaryDomain: data.shop.primaryDomain,
      },
      counts: {
        products: products.length,
        activeProducts: products.filter((product) => product.status === "active").length,
        collections: collections.length,
      },
      sample: {
        products,
        collections,
      },
    };
  }

  async productSearch(input: { query?: string; status?: string; limit: number }) {
    const credentials = this.credentialsProvider.credentials();
    const client = new ShopifyAdminClient(credentials);
    const data = await client.graphql<{
      products: { edges: Array<{ node: ShopifyProductNode }> };
    }>(`
      query RunbookOSProductSearch($first: Int!, $query: String) {
        products(first: $first, query: $query) {
          edges {
            node {
              handle
              title
              status
              vendor
              productType
              tags
              totalInventory
              seo {
                title
                description
              }
              featuredMedia {
                alt
              }
              priceRangeV2 {
                minVariantPrice {
                  amount
                  currencyCode
                }
                maxVariantPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `, {
      first: input.limit,
      query: input.query ?? null,
    });

    const products = data.products.edges
      .map((edge) => mapLiveProduct(edge.node))
      .filter((product) => !input.status || product.status === input.status.toLowerCase());
    return {
      products,
      source: "shopify-admin-api",
      mode: this.mode,
    };
  }

  async collectionSearch(input: { query?: string; limit: number }) {
    const credentials = this.credentialsProvider.credentials();
    const client = new ShopifyAdminClient(credentials);
    const data = await client.graphql<{
      collections: { edges: Array<{ node: ShopifyCollectionNode }> };
    }>(`
      query RunbookOSCollectionSearch($first: Int!, $query: String) {
        collections(first: $first, query: $query) {
          edges {
            node {
              handle
              title
              description
              seo {
                title
                description
              }
              image {
                altText
              }
            }
          }
        }
      }
    `, {
      first: input.limit,
      query: input.query ?? null,
    });

    return {
      collections: data.collections.edges.map((edge) => mapLiveCollection(edge.node)),
      source: "shopify-admin-api",
      mode: this.mode,
    };
  }

  async themeInspect(): Promise<Record<string, unknown>> {
    const credentials = this.credentialsProvider.credentials();
    const client = new ShopifyAdminClient(credentials);
    const themes = await client.rest<{ themes?: Array<Record<string, unknown>> }>("themes.json");
    return {
      source: "shopify-admin-rest-api",
      retrievedAt: new Date().toISOString(),
      mode: this.mode,
      limits: "Read-only theme metadata via Admin REST API. Theme assets are not fetched.",
      themes: themes.themes ?? [],
    };
  }
}

class ReservedLiveShopifyDataProvider implements ShopifyDataProvider {
  mode: ShopifyAuthMode;

  constructor(private credentials: ShopifyCredentialProvider) {
    this.mode = credentials.mode;
  }

  async status(): Promise<ShopifyProviderStatus> {
    return {
      ...this.credentials.describe(),
      safety: shopifySafetyBoundary(),
      notes: [
        "This mode is intentionally reserved and refuses live reads until implemented.",
        "Use fixture mode for public-safe demos.",
        "Do not put private custom app tokens in repository files.",
      ],
    };
  }

  async fixtureStore(): Promise<ShopifyFixture> {
    throw new Error(reservedModeError(this.mode));
  }

  async storeOverview(): Promise<Record<string, unknown>> {
    throw new Error(reservedModeError(this.mode));
  }

  async productSearch(): Promise<{ products: ShopifyFixture["products"]; source: string; mode: ShopifyAuthMode }> {
    throw new Error(reservedModeError(this.mode));
  }

  async collectionSearch(): Promise<{ collections: ShopifyFixture["collections"]; source: string; mode: ShopifyAuthMode }> {
    throw new Error(reservedModeError(this.mode));
  }

  async themeInspect(): Promise<Record<string, unknown>> {
    throw new Error(reservedModeError(this.mode));
  }
}

class ShopifyAdminClient {
  private graphqlEndpoint: string;
  private restBase: string;

  constructor(private credentials: ShopifyLiveCredentials) {
    this.graphqlEndpoint = `https://${credentials.shopDomain}/admin/api/${credentials.apiVersion}/graphql.json`;
    this.restBase = `https://${credentials.shopDomain}/admin/api/${credentials.apiVersion}`;
  }

  async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetchWithRetry(this.graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.credentials.adminToken,
      },
      body: JSON.stringify({ query, variables }),
    }, {
      label: "Shopify GraphQL",
      // Shopify reports query-cost throttling as HTTP 200 + errors[].extensions.code THROTTLED.
      isRetryableResponse: async (probe) => {
        if (!probe.ok) return false;
        try {
          const body = await probe.json() as ShopifyGraphqlResponse<unknown>;
          return Boolean(body.errors?.some((error) => error.extensions?.code === "THROTTLED"));
        } catch {
          return false;
        }
      },
    });
    const body = await response.json() as ShopifyGraphqlResponse<T>;
    if (!response.ok || body.errors?.length) {
      throw new Error(formatShopifyApiError(response.status, body.errors));
    }
    if (!body.data) throw new Error("Shopify GraphQL response did not include data.");
    return body.data;
  }

  async rest<T>(relativePath: string): Promise<T> {
    const response = await fetchWithRetry(`${this.restBase}/${relativePath}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.credentials.adminToken,
      },
    }, { label: "Shopify REST" });
    const body = await response.json() as T | { errors?: unknown };
    if (!response.ok) {
      const errorBody = body as { errors?: unknown };
      const hint = authHint(response.status, "Shopify REST", ["SHOPIFY_ADMIN_TOKEN"]);
      throw new Error(hint ?? `Shopify REST request failed with HTTP ${response.status}: ${JSON.stringify(errorBody.errors ?? errorBody)}`);
    }
    return body as T;
  }
}

function createShopifyCredentialProvider(mode: ShopifyAuthMode): ShopifyCredentialProvider {
  if (mode === "fixture") return new FixtureCredentialProvider();
  if (mode === "customer_custom_app") return new CustomerCustomAppCredentialProvider();
  return new OAuthManagedAppCredentialProvider();
}

function createShopifyDataProvider(context: ShopifyContextBase): ShopifyDataProvider {
  const credentials = createShopifyCredentialProvider(context.authMode);
  if (context.authMode === "fixture") return new FixtureShopifyDataProvider(context, credentials);
  if (credentials instanceof CustomerCustomAppCredentialProvider) {
    return new CustomerCustomAppShopifyDataProvider(credentials);
  }
  return new ReservedLiveShopifyDataProvider(credentials);
}

function shopifySafetyBoundary() {
  return {
    readOnly: true as const,
    excludedData: ["customers", "orders", "payments", "tokens"],
    writesImplemented: false as const,
    credentialsPersistedByRunbookOS: false as const,
  };
}

function reservedModeError(mode: ShopifyAuthMode): string {
  return [
    `Shopify auth mode ${mode} is not implemented in this public package yet.`,
    `Use RUNBOOKOS_SHOPIFY_AUTH_MODE=fixture for public-safe demo reads.`,
    `Do not put private custom app tokens in repository files.`,
  ].join(" ");
}

function normalizeShopDomain(value: string): string {
  const trimmed = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const domain = trimmed.includes(".") ? trimmed : `${trimmed}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)) {
    throw new Error("SHOPIFY_SHOP_DOMAIN must be a myshopify.com shop domain or shop subdomain.");
  }
  return domain.toLowerCase();
}

function mapLiveProduct(product: ShopifyProductNode): ShopifyFixture["products"][number] {
  const price = Number(product.priceRangeV2?.minVariantPrice?.amount);
  return {
    handle: product.handle,
    title: product.title,
    status: (product.status ?? "unknown").toLowerCase(),
    vendor: product.vendor,
    type: product.productType,
    tags: product.tags ?? [],
    price: Number.isFinite(price) ? price : undefined,
    inventory: typeof product.totalInventory === "number" ? product.totalInventory : undefined,
    seoTitle: product.seo?.title ?? undefined,
    seoDescription: product.seo?.description ?? undefined,
    imageAltCoverage: product.featuredMedia?.alt ? "complete" : "missing",
  };
}

function mapLiveCollection(collection: ShopifyCollectionNode): ShopifyFixture["collections"][number] {
  return {
    handle: collection.handle,
    title: collection.title,
    productCount: 0,
    description: collection.description,
    seoTitle: collection.seo?.title ?? undefined,
    seoDescription: collection.seo?.description ?? undefined,
    imageAltCoverage: collection.image?.altText ? "complete" : "missing",
  };
}

function formatShopifyApiError(status: number, errors: Array<{ message: string }> | undefined): string {
  const hint = authHint(status, "Shopify GraphQL", ["SHOPIFY_ADMIN_TOKEN"]);
  if (hint) return hint;
  if (errors && errors.length > 0) {
    return `Shopify GraphQL request failed with HTTP ${status}: ${errors.map((error) => error.message).join("; ")}`;
  }
  return `Shopify GraphQL request failed with HTTP ${status}.`;
}

async function loadShopifyContext(root: string): Promise<ShopifyContext> {
  const context = await loadShopifyContextBase(root, {
    fixturePath: readFixtureArg(process.argv.slice(2)),
    authMode: readAuthMode(),
  });
  return {
    ...context,
    provider: createShopifyDataProvider(context),
  };
}

async function loadShopifyContextBase(
  root: string,
  options: { authMode?: ShopifyAuthMode; fixturePath?: string },
): Promise<ShopifyContextBase> {
  const configPath = safeJoin(root, "runbookos.config.json");
  const config = await fs.readFile(configPath, "utf-8")
    .then((raw) => parseRunbookConfig(JSON.parse(raw)))
    .catch(() => undefined);

  const context = {
    root,
    config,
    fixturePath: options.fixturePath,
    authMode: options.authMode ?? readAuthMode(),
  };
  return context;
}

function readAuthMode(): ShopifyAuthMode {
  const value = process.env.RUNBOOKOS_SHOPIFY_AUTH_MODE ?? "fixture";
  if (value === "fixture" || value === "customer_custom_app" || value === "oauth_managed_app") {
    return value;
  }
  throw new Error("RUNBOOKOS_SHOPIFY_AUTH_MODE must be fixture, customer_custom_app, or oauth_managed_app.");
}

function resolveWorkspaceRoot(): string {
  const argRoot = readWorkspaceArg(process.argv.slice(2));
  return path.resolve(argRoot ?? process.env.RUNBOOKOS_WORKSPACE_DIR ?? process.cwd());
}

function readWorkspaceArg(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--workspace" || arg === "--workspace-dir") {
      return args[index + 1];
    }
    if (arg.startsWith("--workspace=")) return arg.slice("--workspace=".length);
    if (arg.startsWith("--workspace-dir=")) return arg.slice("--workspace-dir=".length);
  }
  return undefined;
}

function readFixtureArg(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--fixture" || arg === "--fixture-path") {
      return args[index + 1];
    }
    if (arg.startsWith("--fixture=")) return arg.slice("--fixture=".length);
    if (arg.startsWith("--fixture-path=")) return arg.slice("--fixture-path=".length);
  }
  return undefined;
}

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false);
}

function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes allowed root: ${relativePath}`);
  }
  return target;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
