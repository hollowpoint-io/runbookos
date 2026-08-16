import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-shopify-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);
  run(["runbook", "integrations", "setup", "shopify", workspaceDir, "--mode", "fixture"]);
  run(["runbook", "integrations", "doctor", "shopify", workspaceDir]);
  assertShopifyConfigEnabled();
  runExpectFailure(
    ["runbook", "integrations", "doctor", "shopify", workspaceDir],
    "missing env: SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_TOKEN",
    { RUNBOOKOS_SHOPIFY_AUTH_MODE: "customer_custom_app" },
  );
  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const shopifyServer = mcp.mcpServers.shopify;
  if (!shopifyServer) throw new Error("Generated .mcp.json did not include shopify server");

  const client = new Client({ name: "runbookos-shopify-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: shopifyServer.command,
    args: shopifyServer.args,
    stderr: "pipe",
  });

  await client.connect(transport);
  try {
    const resources = await client.listResources();
    assertResource(resources, "runbook://shopify/status");
    assertResource(resources, "runbook://shopify/fixture-store");

    const status = await client.readResource({ uri: "runbook://shopify/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"fixture\"");
    assertTextIncludes(status.contents[0]?.text, "\"readOnly\": true");

    const fixture = await client.readResource({ uri: "runbook://shopify/fixture-store" });
    assertTextIncludes(fixture.contents[0]?.text, "Demo Commerce");
    assertTextIncludes(fixture.contents[0]?.text, "Everyday Tote");

    const overview = await client.callTool({ name: "shopify.store_overview", arguments: {} });
    if (overview.isError) throw new Error("shopify.store_overview returned an error");
    assertTextIncludes(overview.content[0]?.text, "\"products\": 4");
    assertTextIncludes(overview.content[0]?.text, "\"customerDataIncluded\": false");

    const productSearch = await client.callTool({
      name: "shopify.product_search",
      arguments: {
        query: "desk",
        limit: 10,
      },
    });
    if (productSearch.isError) throw new Error("shopify.product_search returned an error");
    assertTextIncludes(productSearch.content[0]?.text, "Desk Lamp");

    const collectionSearch = await client.callTool({
      name: "shopify.collection_search",
      arguments: {
        query: "home",
        limit: 10,
      },
    });
    if (collectionSearch.isError) throw new Error("shopify.collection_search returned an error");
    assertTextIncludes(collectionSearch.content[0]?.text, "Home Office");

    const theme = await client.callTool({ name: "shopify.theme_inspect", arguments: {} });
    if (theme.isError) throw new Error("shopify.theme_inspect returned an error");
    assertTextIncludes(theme.content[0]?.text, "Baseline Demo Theme");
    assertTextIncludes(theme.content[0]?.text, "No visible trust messaging");
  } finally {
    await client.close();
  }

  await assertCustomerCustomAppRequiresCredentials(shopifyServer);
  await assertReservedModeRefusesLiveReads(shopifyServer, "oauth_managed_app");

  run(["runbook", "verify", workspaceDir]);
  console.log(`shopify smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

async function assertCustomerCustomAppRequiresCredentials(shopifyServer) {
  const client = new Client({ name: "runbookos-shopify-customer-custom-app-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: shopifyServer.command,
    args: shopifyServer.args,
    stderr: "pipe",
    env: {
      RUNBOOKOS_SHOPIFY_AUTH_MODE: "customer_custom_app",
    },
  });

  await client.connect(transport);
  try {
    const result = await client.callTool({ name: "shopify.store_overview", arguments: {} });
    if (!result.isError) {
      throw new Error("shopify.store_overview should require custom app credentials");
    }
    assertTextIncludes(result.content[0]?.text, "Missing required Shopify custom app env");
  } finally {
    await client.close();
  }
}

async function assertReservedModeRefusesLiveReads(shopifyServer, authMode) {
  const client = new Client({ name: `runbookos-shopify-${authMode}-smoke`, version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: shopifyServer.command,
    args: shopifyServer.args,
    stderr: "pipe",
    env: {
      RUNBOOKOS_SHOPIFY_AUTH_MODE: authMode,
    },
  });

  await client.connect(transport);
  try {
    const result = await client.callTool({ name: "shopify.store_overview", arguments: {} });
    if (!result.isError) {
      throw new Error(`shopify.store_overview should refuse auth mode ${authMode}`);
    }
    assertTextIncludes(result.content[0]?.text, `Shopify auth mode ${authMode} is not implemented`);
  } finally {
    await client.close();
  }
}

function assertShopifyConfigEnabled() {
  const configPath = path.join(workspaceDir, "runbookos.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (!config.mcpServers.shopify?.enabled) {
    throw new Error("Shopify setup should enable the Shopify MCP config");
  }
  for (const envName of ["RUNBOOKOS_SHOPIFY_AUTH_MODE", "SHOPIFY_ADMIN_TOKEN", "SHOPIFY_SHOP_DOMAIN", "SHOPIFY_API_VERSION"]) {
    if (!config.mcpServers.shopify.env.includes(envName)) {
      throw new Error(`Shopify setup should include env name ${envName}`);
    }
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

function runExpectFailure(args, expectedText, extraEnv = {}) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    encoding: "utf-8",
  });

  if (result.status === 0) {
    throw new Error(`Expected command to fail: pnpm ${args.join(" ")}`);
  }

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (!output.includes(expectedText)) {
    throw new Error(`Expected failed command output to include ${expectedText}, got: ${output}`);
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
