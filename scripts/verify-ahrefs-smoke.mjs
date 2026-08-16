import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-ahrefs-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);
  enableAhrefsMcp();
  run(["runbook", "adapters", workspaceDir]);

  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const ahrefsServer = mcp.mcpServers.ahrefs;
  if (!ahrefsServer) throw new Error("Generated .mcp.json did not include ahrefs server");
  if (ahrefsServer.command !== "node") {
    throw new Error(`Expected local ahrefs command to use node, got ${ahrefsServer.command}`);
  }
  assertTextIncludes(ahrefsServer.args.join(" "), "packages/mcp-ahrefs/dist/index.js");

  const client = new Client({ name: "runbookos-ahrefs-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: ahrefsServer.command,
    args: ahrefsServer.args,
    stderr: "pipe",
  });

  await client.connect(transport);
  try {
    const resources = await client.listResources();
    assertResource(resources, "runbook://ahrefs/status");
    assertResource(resources, "runbook://ahrefs/fixture-data");

    const status = await client.readResource({ uri: "runbook://ahrefs/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"fixture\"");
    assertTextIncludes(status.contents[0]?.text, "\"paidApiCallsImplemented\": false");

    const fixture = await client.readResource({ uri: "runbook://ahrefs/fixture-data" });
    assertTextIncludes(fixture.contents[0]?.text, "demo-commerce.example");
    assertTextIncludes(fixture.contents[0]?.text, "desk lamp");

    const overview = await client.callTool({
      name: "ahrefs.site_overview",
      arguments: { domain: "demo-commerce.example", country: "gb" },
    });
    if (overview.isError) throw new Error("ahrefs.site_overview returned an error");
    assertTextIncludes(overview.content[0]?.text, "\"domainRating\": 22");

    const matchingTerms = await client.callTool({
      name: "ahrefs.keyword_matching_terms",
      arguments: { seed: "desk", country: "gb", limit: 10 },
    });
    if (matchingTerms.isError) throw new Error("ahrefs.keyword_matching_terms returned an error");
    assertTextIncludes(matchingTerms.content[0]?.text, "best desk lamp for home office");

    const topPages = await client.callTool({
      name: "ahrefs.site_top_pages",
      arguments: { domain: "demo-commerce.example", country: "gb", limit: 10 },
    });
    if (topPages.isError) throw new Error("ahrefs.site_top_pages returned an error");
    assertTextIncludes(topPages.content[0]?.text, "Everyday Tote");

    const gap = await client.callTool({
      name: "ahrefs.competitor_gap",
      arguments: { domain: "demo-commerce.example", country: "gb", limit: 10 },
    });
    if (gap.isError) throw new Error("ahrefs.competitor_gap returned an error");
    assertTextIncludes(gap.content[0]?.text, "small desk lamp");
  } finally {
    await client.close();
  }

  await assertApiTokenModeRequiresCredentials(ahrefsServer);

  run(["runbook", "verify", workspaceDir]);
  console.log(`ahrefs smoke passed: ${workspaceDir}`);
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
    env: [],
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

async function assertApiTokenModeRequiresCredentials(ahrefsServer) {
  const client = new Client({ name: "runbookos-ahrefs-api-token-required-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: ahrefsServer.command,
    args: ahrefsServer.args,
    stderr: "pipe",
    env: {
      RUNBOOKOS_AHREFS_AUTH_MODE: "api_token",
    },
  });

  await client.connect(transport);
  try {
    const status = await client.readResource({ uri: "runbook://ahrefs/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"api_token\"");
    assertTextIncludes(status.contents[0]?.text, "\"liveReadAvailable\": false");

    const result = await client.callTool({
      name: "ahrefs.site_overview",
      arguments: {
        domain: "demo-commerce.example",
        country: "gb",
      },
    });
    if (!result.isError) {
      throw new Error("ahrefs.site_overview should require AHREFS_API_TOKEN in api_token mode");
    }
    assertTextIncludes(result.content[0]?.text, "Missing required Ahrefs env");
  } finally {
    await client.close();
  }
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
