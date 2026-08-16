import path from "node:path";
import type { RunbookConfig } from "./schema.js";

export interface AdapterGenerationOptions {
  workspaceDir?: string;
  packageRoot?: string;
  mcpCommandMode?: "local" | "published";
}

interface McpServerCommand {
  command: string;
  args: string[];
}

const localMcpServers = new Set(["workspace", "memory", "shopify", "ahrefs", "gmail"]);

export function generateAgentsMd(config: RunbookConfig): string {
  return [
    `# ${config.name} Agent Instructions`,
    ``,
    `You are operating inside a RunbookOS workspace.`,
    ``,
    `## Startup`,
    `Before doing meaningful work, read the smallest sufficient context set and say what you are using. Default order:`,
    `- \`${config.memory.activeContextFile}\` for current cross-client context`,
    `- \`USER.md\` for user and business preferences`,
    `- \`SOUL.md\` for operating principles and approval posture`,
    `- \`RUNBOOK.md\` for workspace operating rules`,
    `- \`AGENCY.md\` for agency/FDE defaults when present`,
    `- Client dashboard files under \`${config.workspace.clientRoot}/<client>/README.md\``,
    `- Relevant workstream files and skill files for the active task`,
    ``,
    `## Skill Activation`,
    `- DO NOT OVERBUILD: before adding code, commands, packages, or workflow layers, ask whether the agent can do the work by reading a skill file.`,
    `- If a user asks for a known vertical or repeatable job, inspect \`skills/\` before inventing a process.`,
    `- Execute directly from the relevant \`SKILL.md\`; do not look for a workflow runner or schedule command.`,
    `- When a skill requires an MCP server that is not enabled, stop and report the missing integration plus the setup command instead of faking results.`,
    ``,
    `## Write Boundaries`,
    ...config.workspace.allowedWriteRoots.map((root) => `- Allowed: \`${root}/\``),
    `- Never persist credentials, API keys, customer data, or private tokens.`,
    `- Keep raw exports under client \`data/\` folders and interpreted work under reports, operations, or workstreams.`,
    ``,
    `## Approval And Live Data Boundaries`,
    `- Treat external actions, paid API use, publishing, outreach, credential-dependent work, and live data mutations as approval-gated.`,
    `- Live credentials must come from runtime env or a secret manager, never workspace files.`,
    `- For Shopify and similar systems, read-only review can produce reports and dry-run plans; mutations require an approval preview and rollback notes first.`,
    `- Label data source clearly: fixture, demo, live API, manual input, or inference.`,
    ``,
    `## Image Generation`,
    `- For Codex image work, prefer Codex-native image generation/editing when the active session exposes it.`,
    `- For Claude image work, use the image-generation skill to describe the desired output and route to the available generation path.`,
    `- Record prompt, source assets, output path, and provenance in the client workspace; no separate RunbookOS image routing command exists.`,
    ``,
    `## Model Tiers`,
    `Use provider-neutral tiers in plans: \`deep\`, \`balanced\`, \`fast\`.`,
    ``,
    `## Session Wrap-Up`,
    `When the user asks to wrap up, or after a meaningful state change:`,
    `- Update daily memory under \`${config.memory.dailyLogDir}/YYYY-MM-DD.md\`.`,
    `- Update touched client dashboards and workstream READMEs.`,
    `- Update \`${config.memory.activeContextFile}\` when the next action, blocker, or active client changed.`,
    `- Record approval preview paths, generated artifact paths, and unresolved blockers.`,
    `- Do not write wrap-up notes for trivial read-only checks unless they change durable state.`,
  ].join("\n");
}

export function generateClaudeMd(config: RunbookConfig): string {
  return [
    `# ${config.name} - Claude Adapter`,
    ``,
    `This file is generated from RunbookOS config. Keep provider-neutral rules in \`RUNBOOK.md\`.`,
    ``,
    generateAgentsMd(config),
    ``,
    `## Claude Notes`,
    `- Prefer task agents for bounded data collection if available.`,
    `- Use MCP tools only when the required server is enabled for this workspace.`,
    `- If MCP write helpers fail in non-interactive contexts, direct file writes are acceptable only inside configured RunbookOS write roots.`,
    `- Keep generated artifacts and wrap-up notes concise enough for the next provider session to resume without private side context.`,
  ].join("\n");
}

export function generateClaudeMcpJson(config: RunbookConfig, options: AdapterGenerationOptions = {}): string {
  const mcpServers: Record<string, Record<string, unknown>> = {};

  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (!server.enabled) continue;
    const command = resolveMcpServerCommand(name, server, options);
    mcpServers[name] = {
      command: command.command,
      args: command.args,
      env: Object.fromEntries(server.env.map((envName) => [envName, `$${envName}`])),
    };
  }

  return JSON.stringify({ mcpServers }, null, 2);
}

export function generateCodexConfig(config: RunbookConfig, options: AdapterGenerationOptions = {}): string {
  const lines = [
    `# Generated by RunbookOS`,
    `model = "${config.modelTiers.balanced.codex ?? "gpt-5.4"}"`,
    `approval_policy = "on-request"`,
    `sandbox_mode = "workspace-write"`,
    ``,
  ];

  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (!server.enabled) continue;
    const command = resolveMcpServerCommand(name, server, options);
    lines.push(`[mcp_servers.${name}]`);
    lines.push(`command = ${tomlString(command.command)}`);
    lines.push(`args = [${command.args.map(tomlString).join(", ")}]`);
    lines.push(`# Configure env for ${name} in your private workspace.`);
    for (const envName of server.env) {
      lines.push(`# env.${envName} = "$${envName}"`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

export function generateCodexSkill(args: {
  id: string;
  title: string;
  description: string;
  instructions: string;
}): string {
  return [
    `---`,
    `name: ${yamlString(args.id)}`,
    `description: ${yamlString(args.description)}`,
    `---`,
    ``,
    args.instructions.trim(),
    ``,
  ].join("\n");
}

export function generateStartupHook(config: RunbookConfig): string {
  return [
    `#!/usr/bin/env bash`,
    `set -euo pipefail`,
    `ROOT="\${RUNBOOKOS_WORKSPACE_DIR:-$(pwd)}"`,
    `for file in "${config.memory.activeContextFile}" "SOUL.md" "USER.md" "RUNBOOK.md" "AGENCY.md"; do`,
    `  if [ -f "$ROOT/$file" ]; then`,
    `    echo "=== $file ==="`,
    `    cat "$ROOT/$file"`,
    `    echo`,
    `  fi`,
    `done`,
    `echo "=== RunbookOS startup checklist ==="`,
    `echo "- Pick the relevant client and skill before loading extra context."`,
    `echo "- Check skills/ for repeatable work."`,
    `echo "- Keep writes inside configured workspace roots."`,
    `echo "- Use approval previews before external actions or mutations."`,
    `echo "- For Gmail/email work, use runbook gmail auth for browser OAuth and keep tokens runtime-only."`,
    `echo "- For image work, use the image-generation skill and record provenance in the client workspace."`,
    `echo "- Wrap up with daily memory, dashboard, and active context updates when state changes."`,
  ].join("\n");
}

function resolveMcpServerCommand(
  name: string,
  server: RunbookConfig["mcpServers"][string],
  options: AdapterGenerationOptions,
): McpServerCommand {
  if (server?.command) {
    return {
      command: server.command,
      args: server.args ?? [],
    };
  }

  if (
    options.mcpCommandMode === "local"
    && options.packageRoot
    && options.workspaceDir
    && localMcpServers.has(name)
  ) {
    return {
      command: "node",
      args: [
        path.join(options.packageRoot, "packages", `mcp-${name}`, "dist", "index.js"),
        "--workspace",
        options.workspaceDir,
      ],
    };
  }

  return {
    command: "npx",
    args: ["-y", `@runbookos/mcp-${name}`],
  };
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function yamlString(value: string): string {
  return JSON.stringify(value);
}
