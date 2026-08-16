#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseRunbookConfig, type RunbookConfig } from "@runbookos/config";
import { z } from "zod";

export interface WorkspaceMcpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown" | "application/json";
}

export interface WorkspaceMcpTool {
  name: string;
  description: string;
  safety: "read-only" | "writes-workspace" | "requires-approval";
  inputSchema: Record<string, unknown>;
}

export const workspaceResources: WorkspaceMcpResource[] = [
  {
    uri: "runbook://workspace/runbook",
    name: "Workspace runbook",
    description: "Provider-neutral operating instructions from RUNBOOK.md.",
    mimeType: "text/markdown",
  },
  {
    uri: "runbook://workspace/active-context",
    name: "Active context",
    description: "Current working context shared by all providers.",
    mimeType: "text/markdown",
  },
  {
    uri: "runbook://workspace/clients",
    name: "Client index",
    description: "List of client workspaces and dashboard paths.",
    mimeType: "application/json",
  },
  {
    uri: "runbook://workspace/skills",
    name: "Skill registry",
    description: "Installed skill files available to agents.",
    mimeType: "application/json",
  },
];

export const workspaceTools: WorkspaceMcpTool[] = [
  {
    name: "workspace.client_read",
    description: "Read a client dashboard or context file from the configured client root.",
    safety: "read-only",
    inputSchema: {
      type: "object",
      required: ["client"],
      properties: {
        client: { type: "string" },
        file: { type: "string", default: "README.md" },
      },
    },
  },
  {
    name: "workspace.report_write",
    description: "Write a generated report under a client reports directory.",
    safety: "writes-workspace",
    inputSchema: {
      type: "object",
      required: ["client", "relativePath", "content"],
      properties: {
        client: { type: "string" },
        relativePath: { type: "string" },
        content: { type: "string" },
      },
    },
  },
  {
    name: "workspace.approval_preview",
    description: "Create a human-readable preview before a mutating agent step.",
    safety: "requires-approval",
    inputSchema: {
      type: "object",
      required: ["title", "summary", "changes"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        changes: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
];

interface WorkspaceContext {
  root: string;
  config: RunbookConfig;
  clientRoot: string;
  allowedWriteRoots: string[];
}

interface ClientIndexEntry {
  id: string;
  path: string;
  dashboard: string;
}

interface SkillIndexEntry {
  id: string;
  title: string;
  version: string;
  modelTier: string;
  triggers: string[];
  path: string;
}

const textResult = (text: string, structuredContent?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

export async function createWorkspaceMcpServer(workspaceRoot = resolveWorkspaceRoot()): Promise<McpServer> {
  const context = await loadWorkspaceContext(workspaceRoot);
  const server = new McpServer({
    name: "@runbookos/mcp-workspace",
    version: "0.1.0",
  });

  registerWorkspaceResources(server, context);
  registerWorkspaceTools(server, context);

  return server;
}

async function main() {
  const server = await createWorkspaceMcpServer();
  await server.connect(new StdioServerTransport());
}

function registerWorkspaceResources(server: McpServer, context: WorkspaceContext) {
  for (const resource of workspaceResources) {
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
          text: await readWorkspaceResource(context, resource.uri),
        }],
      }),
    );
  }
}

function registerWorkspaceTools(server: McpServer, context: WorkspaceContext) {
  server.registerTool(
    "workspace.client_read",
    {
      title: "Read client file",
      description: "Read a client dashboard or context file from the configured client root.",
      inputSchema: {
        client: z.string().min(1),
        file: z.string().default("README.md"),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ client, file }) => {
      const clientDir = safeJoin(context.clientRoot, client);
      const target = safeJoin(clientDir, file);
      const relativePath = path.relative(context.root, target);
      const content = await fs.readFile(target, "utf-8");
      return textResult(content, { path: relativePath });
    },
  );

  server.registerTool(
    "workspace.report_write",
    {
      title: "Write client report",
      description: "Write a generated report under a client reports directory.",
      inputSchema: {
        client: z.string().min(1),
        relativePath: z.string().min(1),
        content: z.string(),
      },
      annotations: {
        destructiveHint: false,
      },
    },
    async ({ client, relativePath, content }) => {
      const clientDir = safeJoin(context.clientRoot, client);
      const reportsDir = safeJoin(clientDir, "reports");
      const target = safeJoin(reportsDir, relativePath);
      assertAllowedWrite(context, target);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
      const workspacePath = path.relative(context.root, target);
      return textResult(`Wrote report to ${workspacePath}`, { path: workspacePath });
    },
  );

  server.registerTool(
    "workspace.approval_preview",
    {
      title: "Create approval preview",
      description: "Create a human-readable preview before a mutating agent step.",
      inputSchema: {
        title: z.string().min(1),
        summary: z.string().min(1),
        changes: z.array(z.string()).default([]),
      },
      annotations: {
        destructiveHint: false,
      },
    },
    async ({ title, summary, changes }) => {
      const approvalRoot = safeJoin(context.root, "outbox/approvals");
      const target = safeJoin(approvalRoot, `${timestampSlug()}-${slugify(title)}.md`);
      assertAllowedWrite(context, target);
      const content = renderApprovalPreview(title, summary, changes);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content);
      const workspacePath = path.relative(context.root, target);
      return textResult(`Created approval preview at ${workspacePath}`, {
        path: workspacePath,
        title,
        changes,
      });
    },
  );
}

async function readWorkspaceResource(context: WorkspaceContext, uri: string): Promise<string> {
  switch (uri) {
    case "runbook://workspace/runbook":
      return fs.readFile(safeJoin(context.root, "RUNBOOK.md"), "utf-8");
    case "runbook://workspace/active-context":
      return fs.readFile(safeJoin(context.root, context.config.memory.activeContextFile), "utf-8");
    case "runbook://workspace/clients":
      return JSON.stringify(await listClients(context), null, 2);
    case "runbook://workspace/skills":
      return JSON.stringify(await listSkills(context), null, 2);
    default:
      throw new Error(`Unknown workspace resource: ${uri}`);
  }
}

async function listClients(context: WorkspaceContext): Promise<ClientIndexEntry[]> {
  const entries = await fs.readdir(context.clientRoot, { withFileTypes: true }).catch(() => []);
  const clients: ClientIndexEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const clientDir = safeJoin(context.clientRoot, entry.name);
    clients.push({
      id: entry.name,
      path: path.relative(context.root, clientDir),
      dashboard: path.relative(context.root, safeJoin(clientDir, "README.md")),
    });
  }

  return clients.sort((a, b) => a.id.localeCompare(b.id));
}

async function listSkills(context: WorkspaceContext): Promise<SkillIndexEntry[]> {
  const skillRoot = safeJoin(context.root, "skills");
  const entries = await fs.readdir(skillRoot, { withFileTypes: true }).catch(() => []);
  const skills: SkillIndexEntry[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const file = safeJoin(skillRoot, path.join(entry.name, "skill.json"));
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.id !== "string" || typeof parsed.title !== "string") continue;
    skills.push({
      id: parsed.id,
      title: parsed.title,
      version: typeof parsed.version === "string" ? parsed.version : "0.1.0",
      modelTier: typeof parsed.modelTier === "string" ? parsed.modelTier : "balanced",
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers.filter((item) => typeof item === "string") : [],
      path: path.relative(context.root, path.dirname(file)),
    });
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

async function loadWorkspaceContext(root: string): Promise<WorkspaceContext> {
  const configPath = safeJoin(root, "runbookos.config.json");
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(configPath, "utf-8")));
  const clientRoot = safeJoin(root, config.workspace.clientRoot);
  const allowedWriteRoots = config.workspace.allowedWriteRoots.map((allowedRoot) => safeJoin(root, allowedRoot));

  return {
    root,
    config,
    clientRoot,
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

function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);
  assertInside(resolvedRoot, target, `Path escapes allowed root: ${relativePath}`);
  return target;
}

function assertAllowedWrite(context: WorkspaceContext, target: string) {
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

function renderApprovalPreview(title: string, summary: string, changes: string[]): string {
  return [
    `# ${title}`,
    ``,
    `Status: Pending approval`,
    ``,
    `## Summary`,
    ``,
    summary,
    ``,
    `## Proposed Changes`,
    ``,
    ...changes.map((change) => `- ${change}`),
    ``,
  ].join("\n");
}

function timestampSlug(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:]/g, "-");
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "approval";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
