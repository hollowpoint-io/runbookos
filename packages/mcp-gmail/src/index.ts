#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseRunbookConfig, type RunbookConfig } from "@runbookos/config";
import { authHint, fetchWithRetry } from "@runbookos/core";
import { z } from "zod";

interface GmailContext {
  root: string;
  config?: RunbookConfig;
  provider: GmailDataProvider;
}

type GmailContextBase = Omit<GmailContext, "provider">;

export type GmailAuthMode = "oauth";

export interface GmailMessageSummary {
  id: string;
  threadId?: string;
  snippet?: string;
  labels?: string[];
  headers: {
    from?: string;
    to?: string;
    cc?: string;
    subject?: string;
    date?: string;
  };
}

export interface GmailDraftResult {
  draftId: string;
  messageId?: string;
  createdAt: string;
  toCount: number;
  ccCount: number;
  subject: string;
  sent: false;
}

export interface GmailProviderStatus {
  mode: GmailAuthMode;
  activeDataSource: "live";
  configured: boolean;
  liveReadAvailable: boolean;
  draftCreateAvailable: boolean;
  sendAvailable: false;
  requiredEnv: string[];
  optionalEnv: string[];
  missingEnv: string[];
  credentialsPersistedByRunbookOS: false;
  safety: {
    readOnly: false;
    metadataOnlyReads: true;
    draftCreateImplemented: boolean;
    sendImplemented: false;
    credentialsPersistedByRunbookOS: false;
    excludedData: string[];
  };
  notes: string[];
}

export interface GmailDataProvider {
  status(): Promise<GmailProviderStatus>;
  search(input: { query?: string; limit: number }): Promise<{ messages: GmailMessageSummary[]; source: string; retrievedAt: string; limit: number }>;
  messageMetadata(input: { messageId: string }): Promise<GmailMessageSummary & { source: string; retrievedAt: string }>;
  createDraft(input: { to: string[]; cc?: string[]; subject: string; bodyText: string }): Promise<GmailDraftResult>;
}

export interface GmailOAuthUrlInput {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: string[];
}

export interface GmailOAuthTokenInput {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}

export interface GmailOAuthTokenResult {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}

interface GmailMessageListResponse {
  messages?: Array<{ id?: string; threadId?: string }>;
}

interface GmailMessageResponse {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
  };
}

interface GmailDraftResponse {
  id?: string;
  message?: {
    id?: string;
  };
}

const gmailBaseUrl = "https://gmail.googleapis.com/gmail/v1";
export const gmailOAuthScopes = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
];

const textResult = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

export async function createGmailMcpServer(workspaceRoot = resolveWorkspaceRoot()): Promise<McpServer> {
  const context = await loadGmailContext(workspaceRoot);
  const server = new McpServer({
    name: "@runbookos/mcp-gmail",
    version: "0.1.0",
  });

  registerGmailResources(server, context);
  registerGmailTools(server, context);

  return server;
}

export async function createGmailDataProviderForWorkspace(workspaceRoot: string): Promise<GmailDataProvider> {
  const context = await loadGmailContextBase(path.resolve(workspaceRoot));
  return createGmailDataProvider(context);
}

export function buildGmailOAuthUrl(input: GmailOAuthUrlInput): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", (input.scopes ?? gmailOAuthScopes).join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeGmailAuthorizationCode(input: GmailOAuthTokenInput): Promise<GmailOAuthTokenResult> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      code: input.code,
      grant_type: "authorization_code",
    }),
  });
  const text = await response.text();
  const parsed = parseJsonObject(text);
  if (!response.ok) {
    const message = stringFrom(parsed.error_description) || stringFrom(parsed.error) || `Gmail OAuth code exchange failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  return {
    accessToken: stringFrom(parsed.access_token) || undefined,
    refreshToken: stringFrom(parsed.refresh_token) || undefined,
    expiresIn: numberFrom(parsed.expires_in),
    scope: stringFrom(parsed.scope) || undefined,
    tokenType: stringFrom(parsed.token_type) || undefined,
  };
}

async function main() {
  const server = await createGmailMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerGmailResources(server: McpServer, context: GmailContext) {
  server.registerResource(
    "Gmail status",
    "runbook://gmail/status",
    {
      description: "Current Gmail MCP credential state and safety boundary.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "runbook://gmail/status",
        mimeType: "application/json",
        text: JSON.stringify(await context.provider.status(), null, 2),
      }],
    }),
  );
}

function registerGmailTools(server: McpServer, context: GmailContext) {
  server.registerTool(
    "gmail.search",
    {
      title: "Gmail search",
      description: "Search Gmail and return message metadata and snippets only.",
      inputSchema: {
        query: z.string().optional(),
        limit: z.number().int().min(1).max(25).default(10),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const result = await context.provider.search({ query, limit });
      return textResult(JSON.stringify(result.messages, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "gmail.message_metadata",
    {
      title: "Gmail message metadata",
      description: "Read Gmail metadata and snippet for one message. Full bodies and attachments are not returned.",
      inputSchema: {
        messageId: z.string().min(1),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ messageId }) => {
      const result = await context.provider.messageMetadata({ messageId });
      return textResult(JSON.stringify(result, null, 2), result as unknown as Record<string, unknown>);
    },
  );

  server.registerTool(
    "gmail.draft_create",
    {
      title: "Gmail draft create",
      description: "Create a Gmail draft without sending it.",
      inputSchema: {
        to: z.array(z.string().email()).min(1).max(20),
        cc: z.array(z.string().email()).max(20).optional(),
        subject: z.string().min(1).max(200),
        bodyText: z.string().min(1).max(20000),
      },
      annotations: { destructiveHint: false },
    },
    async ({ to, cc, subject, bodyText }) => {
      const result = await context.provider.createDraft({ to, cc, subject, bodyText });
      return textResult(JSON.stringify(result, null, 2), result as unknown as Record<string, unknown>);
    },
  );
}

class OAuthGmailDataProvider implements GmailDataProvider {
  private client = new GmailApiClient();

  async status(): Promise<GmailProviderStatus> {
    const missingEnv = requiredGmailEnv().filter((name) => !process.env[name]);
    return {
      mode: "oauth",
      activeDataSource: "live",
      configured: missingEnv.length === 0,
      liveReadAvailable: missingEnv.length === 0,
      draftCreateAvailable: missingEnv.length === 0,
      sendAvailable: false,
      requiredEnv: requiredGmailEnv(),
      optionalEnv: ["GMAIL_USER_EMAIL"],
      missingEnv,
      credentialsPersistedByRunbookOS: false,
      safety: {
        readOnly: false,
        metadataOnlyReads: true,
        draftCreateImplemented: true,
        sendImplemented: false,
        credentialsPersistedByRunbookOS: false,
        excludedData: [
          "OAuth tokens",
          "full message bodies by default",
          "attachments",
          "bulk mailbox exports",
          "send actions",
        ],
      },
      notes: [
        "Gmail uses OAuth credentials from runtime env only.",
        "Search and message reads return metadata and snippets, not full bodies or attachments.",
        "Draft creation is implemented; sending is intentionally not implemented.",
        process.env.GMAIL_USER_EMAIL ? "GMAIL_USER_EMAIL is present for operator display only." : undefined,
      ].filter((note): note is string => Boolean(note)),
    };
  }

  async search(input: { query?: string; limit: number }) {
    this.assertReady();
    const limit = Math.max(1, Math.min(input.limit, 25));
    const listed = await this.client.listMessages({ query: input.query, limit });
    const messages = await Promise.all(
      (listed.messages ?? [])
        .map((message) => message.id)
        .filter((id): id is string => Boolean(id))
        .slice(0, limit)
        .map((messageId) => this.client.messageMetadata(messageId)),
    );
    return {
      messages,
      source: "gmail-api-v1",
      retrievedAt: new Date().toISOString(),
      limit,
    };
  }

  async messageMetadata(input: { messageId: string }) {
    this.assertReady();
    return {
      ...await this.client.messageMetadata(input.messageId),
      source: "gmail-api-v1",
      retrievedAt: new Date().toISOString(),
    };
  }

  async createDraft(input: { to: string[]; cc?: string[]; subject: string; bodyText: string }): Promise<GmailDraftResult> {
    this.assertReady();
    const createdAt = new Date().toISOString();
    const draft = await this.client.createDraft({
      raw: encodeMimeMessage({
        to: input.to,
        cc: input.cc ?? [],
        subject: input.subject,
        bodyText: input.bodyText,
      }),
    });
    return {
      draftId: draft.id ?? "",
      messageId: draft.message?.id,
      createdAt,
      toCount: input.to.length,
      ccCount: input.cc?.length ?? 0,
      subject: input.subject,
      sent: false,
    };
  }

  private assertReady() {
    const missingEnv = requiredGmailEnv().filter((name) => !process.env[name]);
    if (missingEnv.length > 0) {
      throw new Error(`Missing required Gmail env: ${missingEnv.join(", ")}.`);
    }
  }
}

class GmailApiClient {
  async listMessages(input: { query?: string; limit: number }): Promise<GmailMessageListResponse> {
    const url = new URL(`${gmailBaseUrl}/users/me/messages`);
    if (input.query) url.searchParams.set("q", input.query);
    url.searchParams.set("maxResults", String(input.limit));
    return this.request(url, { method: "GET" });
  }

  async messageMetadata(messageId: string): Promise<GmailMessageSummary> {
    const url = new URL(`${gmailBaseUrl}/users/me/messages/${encodeURIComponent(messageId)}`);
    url.searchParams.set("format", "metadata");
    for (const header of ["From", "To", "Cc", "Subject", "Date"]) {
      url.searchParams.append("metadataHeaders", header);
    }
    const json = await this.request<GmailMessageResponse>(url, { method: "GET" });
    return mapMessageSummary(json);
  }

  async createDraft(input: { raw: string }): Promise<GmailDraftResponse> {
    const url = new URL(`${gmailBaseUrl}/users/me/drafts`);
    return this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { raw: input.raw } }),
    });
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    let response = await this.send(url, init, await getAccessToken());

    // A 401 with a cached token usually means Google revoked it early — refresh once and retry.
    if (response.status === 401) {
      invalidateAccessToken();
      response = await this.send(url, init, await getAccessToken());
    }

    const text = await response.text();
    const parsed = parseJsonObject(text);
    if (!response.ok) {
      const error = recordValue(parsed.error);
      const hint = authHint(response.status, "Gmail API", ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"]);
      const message = hint ?? (stringFrom(error.message) || `Gmail API request failed with HTTP ${response.status}`);
      throw new Error(message);
    }
    return parsed as T;
  }

  private async send(url: URL, init: RequestInit, accessToken: string): Promise<Response> {
    return fetchWithRetry(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...init.headers,
      },
    }, { label: "Gmail API" });
  }
}

let cachedAccessToken: { value: string; expiresAtMs: number } | undefined;

function invalidateAccessToken(): void {
  cachedAccessToken = undefined;
}

async function getAccessToken(): Promise<string> {
  // Reuse the access token until shortly before expiry instead of a full
  // OAuth refresh round-trip on every Gmail call.
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAtMs - 60_000) {
    return cachedAccessToken.value;
  }

  const response = await fetchWithRetry("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("GMAIL_CLIENT_ID"),
      client_secret: requiredEnv("GMAIL_CLIENT_SECRET"),
      refresh_token: requiredEnv("GMAIL_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  }, { label: "Gmail OAuth" });
  const text = await response.text();
  const parsed = parseJsonObject(text);
  if (!response.ok) {
    const detail = stringFrom(parsed.error_description) || stringFrom(parsed.error);
    const message = detail === "invalid_grant" || stringFrom(parsed.error) === "invalid_grant"
      ? "Gmail OAuth refresh token is expired or revoked (invalid_grant). Re-run `runbook gmail auth <dir>` to mint a new GMAIL_REFRESH_TOKEN."
      : detail || `Gmail OAuth refresh failed with HTTP ${response.status}`;
    throw new Error(message);
  }
  const token = stringFrom(parsed.access_token);
  if (!token) throw new Error("Gmail OAuth refresh did not return an access token.");
  const expiresInSeconds = Number(parsed.expires_in);
  cachedAccessToken = {
    value: token,
    expiresAtMs: Date.now() + (Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds : 3600) * 1000,
  };
  return token;
}

async function loadGmailContext(workspaceRoot: string): Promise<GmailContext> {
  const context = await loadGmailContextBase(path.resolve(workspaceRoot));
  return {
    ...context,
    provider: createGmailDataProvider(context),
  };
}

async function loadGmailContextBase(workspaceRoot: string): Promise<GmailContextBase> {
  const configPath = path.join(workspaceRoot, "runbookos.config.json");
  const config = await fs.readFile(configPath, "utf-8")
    .then((raw) => parseRunbookConfig(JSON.parse(raw)))
    .catch(() => undefined);

  return {
    root: workspaceRoot,
    config,
  };
}

function createGmailDataProvider(_context: GmailContextBase): GmailDataProvider {
  return new OAuthGmailDataProvider();
}

function requiredGmailEnv(): string[] {
  return ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"];
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required Gmail env: ${name}.`);
  return value;
}

function mapMessageSummary(message: GmailMessageResponse): GmailMessageSummary {
  const headers = message.payload?.headers ?? [];
  return {
    id: message.id ?? "",
    threadId: message.threadId,
    snippet: message.snippet,
    labels: message.labelIds,
    headers: {
      from: headerValue(headers, "from"),
      to: headerValue(headers, "to"),
      cc: headerValue(headers, "cc"),
      subject: headerValue(headers, "subject"),
      date: headerValue(headers, "date"),
    },
  };
}

function headerValue(headers: Array<{ name?: string; value?: string }>, name: string): string | undefined {
  return headers.find((header) => header.name?.toLowerCase() === name)?.value;
}

function encodeMimeMessage(input: { to: string[]; cc: string[]; subject: string; bodyText: string }): string {
  const lines = [
    `To: ${input.to.join(", ")}`,
    input.cc.length > 0 ? `Cc: ${input.cc.join(", ")}` : undefined,
    `Subject: ${sanitizeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.bodyText,
  ].filter((line): line is string => line !== undefined);

  return Buffer.from(lines.join("\r\n"), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text) as unknown;
    return recordValue(parsed);
  } catch {
    return {};
  }
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringFrom(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberFrom(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveWorkspaceRoot(): string {
  const args = process.argv.slice(2);
  const workspaceIndex = args.indexOf("--workspace");
  if (workspaceIndex >= 0 && args[workspaceIndex + 1]) {
    return path.resolve(args[workspaceIndex + 1]);
  }
  return path.resolve(process.env.RUNBOOKOS_WORKSPACE_DIR ?? process.cwd());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
