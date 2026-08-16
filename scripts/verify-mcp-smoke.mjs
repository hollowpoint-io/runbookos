import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-mcp-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);

  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  await smokeWorkspaceServer(mcp.mcpServers.workspace);
  await smokeMemoryServer(mcp.mcpServers.memory);

  run(["runbook", "verify", workspaceDir]);
  console.log(`mcp smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

async function smokeWorkspaceServer(serverConfig) {
  if (!serverConfig) throw new Error("Generated .mcp.json did not include workspace server");

  const client = await connectClient("runbookos-workspace-smoke", serverConfig);
  try {
    const resources = await client.listResources();
    assertResource(resources, "runbook://workspace/runbook");
    assertResource(resources, "runbook://workspace/active-context");
    assertResource(resources, "runbook://workspace/clients");
    assertResource(resources, "runbook://workspace/skills");

    const runbook = await client.readResource({ uri: "runbook://workspace/runbook" });
    assertTextIncludes(runbook.contents[0]?.text, "RunbookOS");

    const skills = await client.readResource({ uri: "runbook://workspace/skills" });
    assertTextIncludes(skills.contents[0]?.text, "shopify-audit");

    const clientRead = await client.callTool({
      name: "workspace.client_read",
      arguments: {
        client: "_template",
        file: "README.md",
      },
    });
    if (clientRead.isError) throw new Error("workspace.client_read returned an error");
    assertTextIncludes(clientRead.content[0]?.text, "# <Client Name>");
    assertTextIncludes(clientRead.content[0]?.text, "## Workstreams");

    const report = await client.callTool({
      name: "workspace.report_write",
      arguments: {
        client: "_template",
        relativePath: "smoke/report.md",
        content: "# Smoke Report\n\nWritten by workspace MCP smoke.\n",
      },
    });
    if (report.isError) throw new Error("workspace.report_write returned an error");
    const reportPath = path.join(workspaceDir, "workspace", "clients", "_template", "reports", "smoke", "report.md");
    assertFileIncludes(reportPath, "Written by workspace MCP smoke.");

    const preview = await client.callTool({
      name: "workspace.approval_preview",
      arguments: {
        title: "Smoke Preview",
        summary: "Preview a public-safe workspace change.",
        changes: ["Write a report artifact only."],
      },
    });
    if (preview.isError) throw new Error("workspace.approval_preview returned an error");
    const previewPath = preview.structuredContent?.path;
    if (typeof previewPath !== "string") throw new Error("workspace.approval_preview did not return a path");
    assertFileIncludes(path.join(workspaceDir, previewPath), "Smoke Preview");

    const traversal = await client.callTool({
      name: "workspace.report_write",
      arguments: {
        client: "_template",
        relativePath: "../../escape.md",
        content: "should not write",
      },
    });
    if (!traversal.isError) throw new Error("workspace.report_write allowed traversal outside reports directory");
  } finally {
    await client.close();
  }
}

async function smokeMemoryServer(serverConfig) {
  if (!serverConfig) throw new Error("Generated .mcp.json did not include memory server");

  const client = await connectClient("runbookos-memory-smoke", serverConfig);
  try {
    const resources = await client.listResources();
    assertResource(resources, "runbook://memory/long-term");
    assertResource(resources, "runbook://memory/daily-index");

    const longTerm = await client.readResource({ uri: "runbook://memory/long-term" });
    assertTextIncludes(longTerm.contents[0]?.text, "# MEMORY.md");

    const append = await client.callTool({
      name: "memory.append_daily",
      arguments: {
        summary: "MCP smoke memory append for demo-commerce.",
        client: "_template",
        task: "mcp-smoke",
        links: ["workspace/clients/_template/reports/smoke/report.md"],
      },
    });
    if (append.isError) throw new Error("memory.append_daily returned an error");
    const memoryPath = append.structuredContent?.path;
    if (typeof memoryPath !== "string") throw new Error("memory.append_daily did not return a path");
    assertFileIncludes(path.join(workspaceDir, memoryPath), "MCP smoke memory append");

    const dailyIndex = await client.readResource({ uri: "runbook://memory/daily-index" });
    assertTextIncludes(dailyIndex.contents[0]?.text, memoryPath);

    const search = await client.callTool({
      name: "memory.search",
      arguments: {
        query: "MCP smoke memory",
        client: "_template",
        limit: 5,
      },
    });
    if (search.isError) throw new Error("memory.search returned an error");
    assertTextIncludes(search.content[0]?.text, "MCP smoke memory append");

    const consolidate = await client.callTool({
      name: "memory.consolidate",
      arguments: {
        client: "_template",
        dryRun: true,
      },
    });
    if (consolidate.isError) throw new Error("memory.consolidate dryRun returned an error");
    assertTextIncludes(consolidate.content[0]?.text, "Memory Consolidation Proposal");

    const nonDryRun = await client.callTool({
      name: "memory.consolidate",
      arguments: {
        dryRun: false,
      },
    });
    if (!nonDryRun.isError) throw new Error("memory.consolidate allowed dryRun=false");
  } finally {
    await client.close();
  }
}

async function connectClient(name, serverConfig) {
  const client = new Client({ name, version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: serverConfig.command,
    args: serverConfig.args,
    stderr: "pipe",
  });
  await client.connect(transport);
  return client;
}

function run(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function assertResource(resources, uri) {
  if (!resources.resources.some((resource) => resource.uri === uri)) {
    throw new Error(`Resource missing: ${uri}`);
  }
}

function assertTextIncludes(content, expected) {
  if (typeof content !== "string" || !content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

function assertFileIncludes(file, expected) {
  if (!fs.existsSync(file)) {
    throw new Error(`Expected file to exist: ${file}`);
  }

  assertTextIncludes(fs.readFileSync(file, "utf-8"), expected);
}
