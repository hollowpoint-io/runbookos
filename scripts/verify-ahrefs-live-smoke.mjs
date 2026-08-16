import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-ahrefs-live-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const explicitEnable = process.env.RUNBOOKOS_ENABLE_LIVE_AHREFS_SMOKE === "1";
const requiredEnv = ["AHREFS_API_TOKEN", "AHREFS_LIVE_TEST_DOMAIN"];

if (!explicitEnable) {
  console.log("ahrefs live smoke skipped: set RUNBOOKOS_ENABLE_LIVE_AHREFS_SMOKE=1 to run against your Ahrefs API token");
  process.exit(0);
}

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`ahrefs live smoke requires env: ${missingEnv.join(", ")}`);
}

try {
  run(["runbook", "init", workspaceDir]);
  enableAhrefsMcp();
  run(["runbook", "adapters", workspaceDir]);

  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const ahrefsServer = mcp.mcpServers.ahrefs;
  if (!ahrefsServer) throw new Error("Generated .mcp.json did not include ahrefs server");

  const client = new Client({ name: "runbookos-ahrefs-live-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: ahrefsServer.command,
    args: ahrefsServer.args,
    stderr: "pipe",
    env: {
      ...process.env,
      RUNBOOKOS_AHREFS_AUTH_MODE: "api_token",
      RUNBOOKOS_AHREFS_MAX_ROWS: "3",
    },
  });

  await client.connect(transport);
  try {
    const status = await client.readResource({ uri: "runbook://ahrefs/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"api_token\"");
    assertTextIncludes(status.contents[0]?.text, "\"liveReadAvailable\": true");
    assertTextIncludes(status.contents[0]?.text, "\"maxLiveRowsPerCall\": 3");
    assertDoesNotIncludeSecret(status.contents[0]?.text);

    const overview = await client.callTool({
      name: "ahrefs.site_overview",
      arguments: {
        domain: process.env.AHREFS_LIVE_TEST_DOMAIN,
        country: process.env.AHREFS_LIVE_TEST_COUNTRY ?? "gb",
      },
    });
    if (overview.isError) throw new Error(toolError("ahrefs.site_overview", overview));
    assertTextIncludes(overview.content[0]?.text, "\"source\": \"ahrefs-api-v3\"");
    assertTextIncludes(overview.content[0]?.text, "\"apiUnitBoundary\"");
    assertDoesNotIncludeSecret(overview.content[0]?.text);

    const topPages = await client.callTool({
      name: "ahrefs.site_top_pages",
      arguments: {
        domain: process.env.AHREFS_LIVE_TEST_DOMAIN,
        country: process.env.AHREFS_LIVE_TEST_COUNTRY ?? "gb",
        limit: 3,
      },
    });
    if (topPages.isError) throw new Error(toolError("ahrefs.site_top_pages", topPages));
    assertTextIncludes(topPages.content[0]?.text, "[");
    assertDoesNotIncludeSecret(topPages.content[0]?.text);
  } finally {
    await client.close();
  }

  run(["runbook", "verify", workspaceDir]);
  console.log(`ahrefs live smoke passed: ${redactDomain(process.env.AHREFS_LIVE_TEST_DOMAIN ?? "")}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function enableAhrefsMcp() {
  const configPath = path.join(workspaceDir, "runbookos.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  config.mcpServers.ahrefs = {
    enabled: true,
    env: [
      "RUNBOOKOS_AHREFS_AUTH_MODE",
      "RUNBOOKOS_AHREFS_MAX_ROWS",
      "RUNBOOKOS_AHREFS_DATE",
      "AHREFS_API_TOKEN",
    ],
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
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

function assertTextIncludes(content, expected) {
  if (typeof content !== "string" || !content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

function assertDoesNotIncludeSecret(content) {
  if (typeof content !== "string") return;
  const token = process.env.AHREFS_API_TOKEN;
  if (token && content.includes(token)) {
    throw new Error("Ahrefs live smoke output included AHREFS_API_TOKEN");
  }
}

function toolError(name, result) {
  const text = result.content?.[0]?.type === "text" ? result.content[0].text : "unknown error";
  return `${name} returned an error: ${text}`;
}

function redactDomain(value) {
  const domain = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain) return "configured domain";
  const [name, ...rest] = domain.split(".");
  return `${name.slice(0, 2)}***.${rest.join(".") || "domain"}`;
}
