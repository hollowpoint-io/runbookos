import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-adapters-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);
  assertLocalAdapters();
  assertOperationalAdapterGuidance();
  assertCodexSkillsYamlSafe();

  enableMcpServer("context7");
  run(["runbook", "adapters", workspaceDir, "--local-mcp"]);
  assertLocalAdapters();
  assertCodexSkillsYamlSafe();
  assertExternalMcpCommand();

  run(["runbook", "adapters", workspaceDir, "--published-mcp"]);
  assertPublishedAdapters();
  assertExternalMcpCommand();

  run(["runbook", "adapters", workspaceDir, "--local-mcp"]);
  assertLocalAdapters();
  assertCodexSkillsYamlSafe();
  assertExternalMcpCommand();

  console.log(`adapter smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
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

function enableMcpServer(name) {
  const configPath = path.join(workspaceDir, "runbookos.config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (!config.mcpServers?.[name]) {
    throw new Error(`Expected ${name} MCP config placeholder to exist`);
  }
  config.mcpServers[name].enabled = true;
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function assertCodexSkillsYamlSafe() {
  const skillsDir = path.join(workspaceDir, ".agents", "skills");
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    const content = fs.readFileSync(skillPath, "utf-8");
    assertIncludes(content, "---\n");
    const frontmatterEnd = content.indexOf("\n---", 4);
    if (frontmatterEnd === -1) {
      throw new Error(`Codex skill frontmatter is not closed: ${skillPath}`);
    }
    const frontmatter = content.slice(4, frontmatterEnd).trim().split("\n");
    for (const line of frontmatter) {
      if (!/^(name|description): ".+"$/.test(line)) {
        throw new Error(`Codex skill frontmatter should quote YAML string values in ${skillPath}: ${line}`);
      }
    }
  }
}

function assertLocalAdapters() {
  const mcp = readMcpJson();
  assertEqual(mcp.mcpServers.workspace.command, "node", "workspace MCP should use node in local mode");
  assertIncludes(mcp.mcpServers.workspace.args.join(" "), "packages/mcp-workspace/dist/index.js");
  assertIncludes(mcp.mcpServers.memory.args.join(" "), "packages/mcp-memory/dist/index.js");
  if (mcp.mcpServers.approval) {
    throw new Error("approval MCP should not be generated");
  }

  const codexConfig = fs.readFileSync(path.join(workspaceDir, ".codex", "config.toml"), "utf-8");
  assertIncludes(codexConfig, 'command = "node"');
  assertIncludes(codexConfig, "packages/mcp-workspace/dist/index.js");
}

function assertPublishedAdapters() {
  const mcp = readMcpJson();
  assertEqual(mcp.mcpServers.workspace.command, "npx", "workspace MCP should use npx in published mode");
  assertIncludes(mcp.mcpServers.workspace.args.join(" "), "@runbookos/mcp-workspace");
  assertIncludes(mcp.mcpServers.memory.args.join(" "), "@runbookos/mcp-memory");
  if (mcp.mcpServers.approval) {
    throw new Error("approval MCP should not be generated");
  }

  const codexConfig = fs.readFileSync(path.join(workspaceDir, ".codex", "config.toml"), "utf-8");
  assertIncludes(codexConfig, 'command = "npx"');
  assertIncludes(codexConfig, "@runbookos/mcp-workspace");
}

function assertExternalMcpCommand() {
  const mcp = readMcpJson();
  assertEqual(mcp.mcpServers.context7.command, "npx", "external MCP command should use configured command");
  assertIncludes(mcp.mcpServers.context7.args.join(" "), "@upstash/context7-mcp@latest");

  const codexConfig = fs.readFileSync(path.join(workspaceDir, ".codex", "config.toml"), "utf-8");
  assertIncludes(codexConfig, "[mcp_servers.context7]");
  assertIncludes(codexConfig, "@upstash/context7-mcp@latest");
  if (codexConfig.includes("@runbookos/mcp-context7")) {
    throw new Error("external MCP command override should not fall back to @runbookos/mcp-context7");
  }
}

function assertOperationalAdapterGuidance() {
  const agents = fs.readFileSync(path.join(workspaceDir, "AGENTS.md"), "utf-8");
  assertIncludes(agents, "## Skill Activation");
  assertIncludes(agents, "DO NOT OVERBUILD");
  assertIncludes(agents, "If a user asks for a known vertical or repeatable job");
  assertIncludes(agents, "Execute directly from the relevant `SKILL.md`");
  assertIncludes(agents, "## Approval And Live Data Boundaries");
  assertIncludes(agents, "Label data source clearly: fixture, demo, live API, manual input, or inference.");
  assertIncludes(agents, "Update daily memory under `memory/YYYY-MM-DD.md`.");

  const claude = fs.readFileSync(path.join(workspaceDir, "CLAUDE.md"), "utf-8");
  assertIncludes(claude, "If MCP write helpers fail in non-interactive contexts");

  const startupHook = fs.readFileSync(path.join(workspaceDir, ".claude", "hooks", "load-context.sh"), "utf-8");
  assertIncludes(startupHook, "RunbookOS startup checklist");
  assertIncludes(startupHook, "Use approval previews before external actions or mutations.");
  assertIncludes(startupHook, "runbook gmail auth");
}

function readMcpJson() {
  return JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected content to include: ${expected}`);
  }
}
