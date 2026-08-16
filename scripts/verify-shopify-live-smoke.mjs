import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-shopify-live-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const explicitEnable = process.env.RUNBOOKOS_ENABLE_LIVE_SHOPIFY_SMOKE === "1";
const requiredEnv = ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_TOKEN"];
const smokeDate = "2026-05-17";
const smokeClient = "live-shopify-smoke";

if (!explicitEnable) {
  console.log("shopify live smoke skipped: set RUNBOOKOS_ENABLE_LIVE_SHOPIFY_SMOKE=1 to run against a customer-owned dev store");
  process.exit(0);
}

const missingEnv = requiredEnv.filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`shopify live smoke requires env: ${missingEnv.join(", ")}`);
}

try {
  run(["runbook", "init", workspaceDir]);
  run([
    "runbook",
    "client",
    "create",
    smokeClient,
    workspaceDir,
    "--name",
    "Live Shopify Smoke",
    // Deliberately NOT the real shop domain: the private-data scanner treats
    // real *.myshopify.com domains in workspace files as leaks. Live reads
    // use SHOPIFY_SHOP_DOMAIN from env, never the client record.
    "--website",
    "live-shopify-smoke.example.com",
    "--platform",
    "Shopify",
  ]);
  enableShopifyMcp();
  run(["runbook", "adapters", workspaceDir]);

  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const shopifyServer = mcp.mcpServers.shopify;
  if (!shopifyServer) throw new Error("Generated .mcp.json did not include shopify server");

  const client = new Client({ name: "runbookos-shopify-live-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: shopifyServer.command,
    args: shopifyServer.args,
    stderr: "pipe",
    env: {
      ...process.env,
      RUNBOOKOS_SHOPIFY_AUTH_MODE: "customer_custom_app",
      SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION ?? "2026-04",
    },
  });

  await client.connect(transport);
  try {
    const status = await client.readResource({ uri: "runbook://shopify/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"customer_custom_app\"");
    assertTextIncludes(status.contents[0]?.text, "\"liveReadAvailable\": true");
    assertDoesNotIncludeSecret(status.contents[0]?.text);

    const overview = await client.callTool({ name: "shopify.store_overview", arguments: {} });
    if (overview.isError) throw new Error(toolError("shopify.store_overview", overview));
    assertTextIncludes(overview.content[0]?.text, "\"source\": \"shopify-admin-api\"");
    assertTextIncludes(overview.content[0]?.text, "No customer");
    assertDoesNotIncludeSecret(overview.content[0]?.text);

    const productSearch = await client.callTool({
      name: "shopify.product_search",
      arguments: {
        limit: 5,
      },
    });
    if (productSearch.isError) throw new Error(toolError("shopify.product_search", productSearch));
    assertTextIncludes(productSearch.content[0]?.text, "[");
    assertDoesNotIncludeSecret(productSearch.content[0]?.text);

    const collectionSearch = await client.callTool({
      name: "shopify.collection_search",
      arguments: {
        limit: 5,
      },
    });
    if (collectionSearch.isError) throw new Error(toolError("shopify.collection_search", collectionSearch));
    assertTextIncludes(collectionSearch.content[0]?.text, "[");
    assertDoesNotIncludeSecret(collectionSearch.content[0]?.text);

    const theme = await client.callTool({ name: "shopify.theme_inspect", arguments: {} });
    if (theme.isError) throw new Error(toolError("shopify.theme_inspect", theme));
    assertTextIncludes(theme.content[0]?.text, "\"source\": \"shopify-admin-rest-api\"");
    assertDoesNotIncludeSecret(theme.content[0]?.text);
  } finally {
    await client.close();
  }

  run(["runbook", "verify", workspaceDir]);
  console.log(`shopify live smoke passed: ${redactShopDomain(process.env.SHOPIFY_SHOP_DOMAIN ?? "")}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function enableShopifyMcp() {
  const configPath = path.join(workspaceDir, "runbookos.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  config.mcpServers.shopify = {
    enabled: true,
    env: [
      "RUNBOOKOS_SHOPIFY_AUTH_MODE",
      "SHOPIFY_ADMIN_TOKEN",
      "SHOPIFY_SHOP_DOMAIN",
      "SHOPIFY_API_VERSION",
    ],
  };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function run(args, extraEnv = {}) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function assertFileIncludes(file, expectedValues) {
  const content = fs.readFileSync(file, "utf-8");
  for (const expected of expectedValues) {
    assertTextIncludes(content, expected);
  }
}

function assertTextIncludes(content, expected) {
  if (typeof content !== "string" || !content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}

function assertDoesNotIncludeSecret(content) {
  if (typeof content !== "string") return;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (token && content.includes(token)) {
    throw new Error("Shopify live smoke output included SHOPIFY_ADMIN_TOKEN");
  }
}

function toolError(name, result) {
  const text = result.content?.[0]?.type === "text" ? result.content[0].text : "unknown error";
  return `${name} returned an error: ${text}`;
}

function redactShopDomain(value) {
  const domain = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!domain) return "configured shop";
  const [name, ...rest] = domain.split(".");
  return `${name.slice(0, 2)}***.${rest.join(".") || "myshopify.com"}`;
}
