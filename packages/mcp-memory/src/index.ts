#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseRunbookConfig, type RunbookConfig } from "@runbookos/config";
import { z } from "zod";

export interface MemoryMcpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown" | "application/json";
}

export interface MemoryMcpTool {
  name: string;
  description: string;
  safety: "read-only" | "writes-memory";
  inputSchema: Record<string, unknown>;
}

export const memoryResources: MemoryMcpResource[] = [
  {
    uri: "runbook://memory/long-term",
    name: "Long-term memory",
    description: "Canonical durable memory from MEMORY.md.",
    mimeType: "text/markdown",
  },
  {
    uri: "runbook://memory/daily-index",
    name: "Daily memory index",
    description: "Available daily memory logs.",
    mimeType: "application/json",
  },
];

export const memoryTools: MemoryMcpTool[] = [
  {
    name: "memory.search",
    description: "Search workspace memory files for relevant context.",
    safety: "read-only",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: { type: "string" },
        client: { type: "string" },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "memory.append_daily",
    description: "Append a concise note to the configured daily memory log.",
    safety: "writes-memory",
    inputSchema: {
      type: "object",
      required: ["summary"],
      properties: {
        summary: { type: "string" },
        client: { type: "string" },
        task: { type: "string" },
        links: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
  {
    name: "memory.consolidate",
    description: "Prepare a proposed long-term memory update from daily logs.",
    safety: "writes-memory",
    inputSchema: {
      type: "object",
      properties: {
        since: { type: "string" },
        client: { type: "string" },
        dryRun: { type: "boolean", default: true },
      },
    },
  },
];

interface MemoryContext {
  root: string;
  config: RunbookConfig;
  memoryRoot: string;
  allowedWriteRoots: string[];
}

interface DailyLogEntry {
  date: string;
  path: string;
}

interface SearchMatch {
  path: string;
  line: number;
  preview: string;
}

const textResult = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

export async function createMemoryMcpServer(workspaceRoot = resolveWorkspaceRoot()): Promise<McpServer> {
  const context = await loadMemoryContext(workspaceRoot);
  const server = new McpServer({
    name: "@runbookos/mcp-memory",
    version: "0.1.0",
  });

  registerMemoryResources(server, context);
  registerMemoryTools(server, context);

  return server;
}

async function main() {
  const server = await createMemoryMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerMemoryResources(server: McpServer, context: MemoryContext) {
  for (const resource of memoryResources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        description: resource.description,
        mimeType: resource.mimeType,
      },
      async () => ({
        contents: [{
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: await readMemoryResource(context, resource.uri),
        }],
      }),
    );
  }
}

function registerMemoryTools(server: McpServer, context: MemoryContext) {
  server.registerTool(
    "memory.search",
    {
      title: "Search memory",
      description: "Search workspace memory files for relevant context.",
      inputSchema: {
        query: z.string().min(1),
        client: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ query, client, limit }) => {
      const matches = await searchMemory(context, query, client, limit);
      return textResult(renderSearchMatches(matches), { matches });
    },
  );

  server.registerTool(
    "memory.append_daily",
    {
      title: "Append daily memory",
      description: "Append a concise note to the configured daily memory log.",
      inputSchema: {
        summary: z.string().min(1),
        client: z.string().optional(),
        task: z.string().optional(),
        links: z.array(z.string()).default([]),
      },
      annotations: {
        destructiveHint: false,
      },
    },
    async ({ summary, client, task, links }) => {
      const target = todayDailyLogPath(context);
      assertAllowedWrite(context, target);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await ensureDailyLogHeader(target);
      const entry = renderDailyAppend({ summary, client, task, links });
      await fs.appendFile(target, entry);
      const workspacePath = path.relative(context.root, target);
      return textResult(`Appended daily memory to ${workspacePath}`, {
        path: workspacePath,
        summary,
        client,
        task,
        links,
      });
    },
  );

  server.registerTool(
    "memory.consolidate",
    {
      title: "Consolidate memory",
      description: "Prepare a proposed long-term memory update from daily logs.",
      inputSchema: {
        since: z.string().optional(),
        client: z.string().optional(),
        dryRun: z.boolean().default(true),
      },
      annotations: {
        destructiveHint: false,
      },
    },
    async ({ since, client, dryRun }) => {
      if (!dryRun) {
        return {
          content: [{
            type: "text" as const,
            text: "memory.consolidate only supports dryRun=true until approval handling is implemented.",
          }],
          isError: true,
        };
      }

      const proposal = await renderConsolidationProposal(context, since, client);
      return textResult(proposal, { dryRun: true, since, client });
    },
  );
}

async function readMemoryResource(context: MemoryContext, uri: string): Promise<string> {
  switch (uri) {
    case "runbook://memory/long-term":
      return fs.readFile(safeJoin(context.root, context.config.memory.longTermFile), "utf-8");
    case "runbook://memory/daily-index":
      return JSON.stringify(await listDailyLogs(context), null, 2);
    default:
      throw new Error(`Unknown memory resource: ${uri}`);
  }
}

async function listDailyLogs(context: MemoryContext): Promise<DailyLogEntry[]> {
  const files = await collectMarkdownFiles(context.memoryRoot).catch(() => []);
  return files
    .map((file) => {
      const base = path.basename(file, ".md");
      return {
        date: base,
        path: path.relative(context.root, file),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

async function searchMemory(
  context: MemoryContext,
  query: string,
  client: string | undefined,
  limit: number,
): Promise<SearchMatch[]> {
  const files = await searchableFiles(context, client);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches: SearchMatch[] = [];

  for (const file of files) {
    const text = await fs.readFile(file, "utf-8").catch(() => "");
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const lower = line.toLowerCase();
      if (!terms.every((term) => lower.includes(term))) continue;
      matches.push({
        path: path.relative(context.root, file),
        line: index + 1,
        preview: line.trim(),
      });
      if (matches.length >= limit) return matches;
    }
  }

  return matches;
}

async function searchableFiles(context: MemoryContext, client: string | undefined): Promise<string[]> {
  const files = [
    safeJoin(context.root, context.config.memory.longTermFile),
    safeJoin(context.root, context.config.memory.activeContextFile),
    ...await collectMarkdownFiles(context.memoryRoot).catch(() => []),
  ];

  if (client) {
    const clientDashboard = safeJoin(
      safeJoin(context.root, context.config.workspace.clientRoot),
      `${client}/README.md`,
    );
    files.push(clientDashboard);
  }

  return [...new Set(files)];
}

async function renderConsolidationProposal(
  context: MemoryContext,
  since: string | undefined,
  client: string | undefined,
): Promise<string> {
  const logs = await listDailyLogs(context);
  const filtered = logs.filter((log) => (!since || log.date >= since));
  const snippets: string[] = [];

  for (const log of filtered.slice(0, 20)) {
    const file = safeJoin(context.root, log.path);
    const text = await fs.readFile(file, "utf-8").catch(() => "");
    const lines = text
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("-"))
      .filter((line) => !client || line.toLowerCase().includes(client.toLowerCase()))
      .slice(0, 12);
    if (lines.length === 0) continue;
    snippets.push([`## ${log.date}`, ...lines].join("\n"));
  }

  return [
    `# Memory Consolidation Proposal`,
    ``,
    `Dry run: true`,
    since ? `Since: ${since}` : `Since: all daily logs`,
    client ? `Client: ${client}` : `Client: all`,
    ``,
    `## Candidate Notes`,
    ``,
    snippets.length > 0 ? snippets.join("\n\n") : `No matching daily memory notes found.`,
    ``,
    `## Next Step`,
    ``,
    `Review these notes and manually update ${context.config.memory.longTermFile} with only durable decisions, lessons, project status, or preferences.`,
    ``,
  ].join("\n");
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = safeJoin(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

async function loadMemoryContext(root: string): Promise<MemoryContext> {
  const configPath = safeJoin(root, "runbookos.config.json");
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(configPath, "utf-8")));
  const memoryRoot = safeJoin(root, config.memory.dailyLogDir);
  const allowedWriteRoots = config.workspace.allowedWriteRoots.map((allowedRoot) => safeJoin(root, allowedRoot));

  return {
    root,
    config,
    memoryRoot,
    allowedWriteRoots,
  };
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

function todayDailyLogPath(context: MemoryContext, date = new Date()): string {
  return safeJoin(context.memoryRoot, `${date.toISOString().slice(0, 10)}.md`);
}

async function ensureDailyLogHeader(file: string) {
  try {
    await fs.access(file);
  } catch {
    const date = path.basename(file, ".md");
    await fs.writeFile(file, [`# Session Log - ${date}`, ``, `## Appended Notes`, ``].join("\n"));
  }
}

function renderDailyAppend(input: {
  summary: string;
  client?: string;
  task?: string;
  links: string[];
}): string {
  const parts = [
    `- ${new Date().toISOString()}: ${input.summary}`,
    input.client ? `  - Client: ${input.client}` : undefined,
    input.task ? `  - Task: ${input.task}` : undefined,
    ...input.links.map((link) => `  - Link: ${link}`),
  ].filter((part): part is string => Boolean(part));

  return `${parts.join("\n")}\n`;
}

function renderSearchMatches(matches: SearchMatch[]): string {
  if (matches.length === 0) return "No memory matches found.";
  return matches
    .map((match) => `${match.path}:${match.line}: ${match.preview}`)
    .join("\n");
}

function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);
  assertInside(resolvedRoot, target, `Path escapes allowed root: ${relativePath}`);
  return target;
}

function assertAllowedWrite(context: MemoryContext, target: string) {
  const resolvedTarget = path.resolve(target);
  if (context.allowedWriteRoots.some((root) => isInside(root, resolvedTarget))) return;
  const rel = path.relative(context.root, resolvedTarget);
  throw new Error(`Write target is outside configured allowedWriteRoots: ${rel}`);
}

function assertInside(root: string, target: string, message: string) {
  if (!isInside(root, target)) throw new Error(message);
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
