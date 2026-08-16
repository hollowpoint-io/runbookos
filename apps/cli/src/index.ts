#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  type AdapterGenerationOptions,
  generateAgentsMd,
  generateClaudeMcpJson,
  generateClaudeMd,
  generateCodexSkill,
  generateCodexConfig,
  generateStartupHook,
  parseRunbookConfig,
} from "@runbookos/config";
import {
  createAhrefsDataProviderForWorkspace,
  type AhrefsCompetitorGap,
  type AhrefsFixture,
  type AhrefsKeyword,
  type AhrefsOrganicKeyword,
  type AhrefsProviderStatus,
  type AhrefsSiteOverview,
  type AhrefsTopPage,
} from "@runbookos/mcp-ahrefs";
import {
  createGmailDataProviderForWorkspace,
  type GmailProviderStatus,
} from "@runbookos/mcp-gmail";
import {
  createShopifyDataProviderForWorkspace,
  type ShopifyAuthMode,
  type ShopifyFixture,
  type ShopifyProviderStatus,
} from "@runbookos/mcp-shopify";
import { parseGmailAuthArgs, runGmailAuth } from "./commands/gmail.js";
import { listSkillsetsCli, loadSkillsets } from "./commands/skillsets.js";

type JsonRecord = Record<string, unknown>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

async function main() {
  const [, , command, subcommandOrTarget = ".", maybeTarget] = process.argv;

  if (!command || ["help", "-h", "--help"].includes(command)) {
    printHelp();
    return;
  }

  if (command === "init") {
    const options = parseWorkspaceTargetArgs(process.argv.slice(3));
    await initWorkspace(options.targetDir, { mcpCommandMode: options.mcpCommandMode });
    return;
  }

  if (command === "adapters") {
    const options = parseWorkspaceTargetArgs(process.argv.slice(3));
    await generateAdapters(options.targetDir, { mcpCommandMode: options.mcpCommandMode });
    return;
  }

  if (command === "setup") {
    if (subcommandOrTarget === "wizard") {
      await runWorkspaceSetupWizard(path.resolve(maybeTarget ?? "."));
      return;
    }
    if (subcommandOrTarget === "menu") {
      await showWorkspaceSetupMenu(path.resolve(maybeTarget ?? "."));
      return;
    }
    const options = parseWorkspaceSetupArgs(process.argv.slice(3));
    await setupWorkspace(options);
    await showWorkspaceSetupMenu(options.targetDir);
    return;
  }

  if (command === "workspace" && subcommandOrTarget === "setup") {
    if (!maybeTarget) throw new Error("Missing workspace directory. Usage: runbook workspace setup <dir> [--user <name>] [--role <role>] [--agency <name>] [--timezone <tz>]");
    const options = parseWorkspaceSetupArgs([maybeTarget, ...process.argv.slice(5)]);
    await setupWorkspace(options);
    await showWorkspaceSetupMenu(options.targetDir);
    return;
  }

  if (command === "workspace" && subcommandOrTarget === "menu") {
    await showWorkspaceSetupMenu(path.resolve(maybeTarget ?? "."));
    return;
  }

  if (command === "workspace" && subcommandOrTarget === "wizard") {
    await runWorkspaceSetupWizard(path.resolve(maybeTarget ?? "."));
    return;
  }

  if (command === "doctor") {
    await doctorWorkspace(path.resolve(subcommandOrTarget));
    return;
  }

  if (command === "verify") {
    await verifyWorkspace(path.resolve(subcommandOrTarget));
    return;
  }

  if (command === "smoke") {
    await smokeWorkspace(path.resolve(subcommandOrTarget));
    return;
  }

  if (command === "release" && subcommandOrTarget === "check") {
    await checkRelease(parseReleaseCheckArgs(process.argv.slice(4)));
    return;
  }

  if (command === "install" && subcommandOrTarget === "check") {
    await checkInstall();
    return;
  }

  if (command === "skills" && subcommandOrTarget === "list") {
    await listSkills(path.resolve(maybeTarget ?? "."));
    return;
  }

  if (command === "skillsets" && subcommandOrTarget === "list") {
    await listSkillsetsCli(path.resolve(maybeTarget ?? "."));
    return;
  }

  if (command === "client" && subcommandOrTarget === "create") {
    if (!maybeTarget) throw new Error("Missing client slug. Usage: runbook client create <slug> <dir> [--name <name>] [--website <domain>] [--platform <platform>]");
    await createClient(parseClientCreateArgs(process.argv.slice(5), maybeTarget));
    return;
  }

  if (command === "integrations" && subcommandOrTarget === "list") {
    await listIntegrations(parseIntegrationListArgs(process.argv.slice(5), maybeTarget));
    return;
  }

  if (command === "integrations" && subcommandOrTarget === "doctor") {
    if (!maybeTarget) throw new Error("Missing integration id. Usage: runbook integrations doctor <id> <dir>");
    await doctorIntegration(parseIntegrationDoctorArgs(process.argv.slice(5), maybeTarget));
    return;
  }

  if (command === "integrations" && subcommandOrTarget === "setup") {
    if (!maybeTarget) throw new Error("Missing integration id. Usage: runbook integrations setup <id> <dir> [--mode <mode>] [--command <cmd>] [--arg <arg>] [--env <name>]");
    await setupIntegration(parseIntegrationSetupArgs(process.argv.slice(5), maybeTarget));
    return;
  }

  if (command === "credentials" && subcommandOrTarget === "checklist") {
    await showCredentialsChecklist(parseCredentialsChecklistArgs(process.argv.slice(4), maybeTarget ?? "."));
    return;
  }

  if (command === "gmail" && subcommandOrTarget === "auth") {
    await runGmailAuth(parseGmailAuthArgs(process.argv.slice(4), maybeTarget ?? "."));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function printHelp() {
  console.log(`RunbookOS CLI

Usage:
  runbook init <dir>             Create a new workspace from templates
  runbook adapters <dir>         Generate provider adapters
  runbook setup <dir> [options]  Personalize a workspace and show the setup menu
  runbook setup wizard <dir>     Interactive first-run setup
  runbook setup menu <dir>       Show the first-run setup menu
  runbook workspace setup <dir> [options]
  runbook workspace wizard <dir>
  runbook workspace menu <dir>
  runbook doctor <dir>           Check workspace readiness
  runbook verify <dir>           Validate config, skills, adapters, and private-data hygiene
  runbook smoke <dir>            Run a safe first-run workspace smoke test
  runbook install check          Check source-install readiness
  runbook release check [--allow-dirty]  Check public release readiness
  runbook skills list <dir>      List installed skills
  runbook skillsets list <dir>   List installed skillsets
  runbook client create <slug> <dir> [--name <name>] [--website <domain>] [--platform <platform>]
  runbook integrations list <dir> [--enabled]  List configured MCP integrations
  runbook integrations setup <id> <dir> [--mode <mode>] [--command <cmd>] [--arg <arg>] [--env <name>]  Enable and configure one integration
  runbook integrations doctor <id> <dir>  Validate one configured integration
  runbook credentials checklist <dir> [--write-local-env]  Show local credential setup and optional ignored env file
  runbook gmail auth <dir>       Print a clickable Google OAuth URL and exchange the callback code

Options:
  --mcp-command-mode <local|published>  Generate MCP commands for local repo dev or published packages
  --local-mcp                           Alias for --mcp-command-mode local
  --published-mcp                       Alias for --mcp-command-mode published
`);
}

interface WorkspaceTargetOptions {
  targetDir: string;
  mcpCommandMode: "local" | "published";
}

interface WorkspaceSetupOptions {
  targetDir: string;
  userName?: string;
  role?: string;
  agency?: string;
  timezone?: string;
  markets?: string;
  verticals?: string;
  detail?: string;
  communication?: string;
  approval?: string;
  customInstructions?: string;
}

interface PromptSession {
  ask(question: string, fallback: string): Promise<string>;
  close(): void;
}

interface ReleaseCheckOptions {
  allowDirty: boolean;
}

interface IntegrationListOptions {
  targetDir: string;
  enabledOnly: boolean;
}

interface IntegrationDoctorOptions {
  targetDir: string;
  id: string;
}

interface IntegrationSetupOptions {
  targetDir: string;
  id: string;
  mode?: string;
  command?: string;
  args?: string[];
  env?: string[];
}

interface CredentialsChecklistOptions {
  targetDir: string;
  writeLocalEnv: boolean;
}

interface ClientCreateOptions {
  targetDir: string;
  slug: string;
  name?: string;
  website?: string;
  platform?: string;
}

interface IntegrationMetadata {
  status: "working" | "ready-config" | "external-mcp" | "planned" | "recommended";
  category: string;
  description: string;
  docs?: string;
}

const integrationMetadata: Record<string, IntegrationMetadata> = {
  workspace: {
    status: "working",
    category: "core",
    description: "Read runbook/context/client files and write safe reports.",
    docs: "docs/mcp-contracts.md",
  },
  memory: {
    status: "working",
    category: "core",
    description: "Search memory, append daily notes, and prepare dry-run consolidation.",
    docs: "docs/mcp-contracts.md",
  },
  shopify: {
    status: "working",
    category: "ecommerce",
    description: "Fixture mode and customer custom-app read-only Shopify metadata.",
    docs: "docs/shopify-auth.md",
  },
  ahrefs: {
    status: "working",
    category: "research",
    description: "Fixture-backed SEO, keyword, site, top-page, and competitor-gap research.",
    docs: "docs/integrations/ahrefs.md",
  },
  brightdata: {
    status: "external-mcp",
    category: "research",
    description: "Public web data and ecommerce/lead-gen research through Bright Data MCP.",
    docs: "docs/integrations/brightdata.md",
  },
  gmail: {
    status: "working",
    category: "communications",
    description: "OAuth Gmail metadata search and draft creation. Sending is not implemented.",
    docs: "docs/integrations/gmail.md",
  },
  image: {
    status: "planned",
    category: "creative",
    description: "Image generation, manipulation, product image prep, and provenance.",
    docs: "docs/integrations/image.md",
  },
  context7: {
    status: "external-mcp",
    category: "coding",
    description: "Current library/framework docs for coding agents.",
    docs: "docs/integrations/context7.md",
  },
  gsc: {
    status: "planned",
    category: "analytics",
    description: "Google Search Console owned-site query and page data.",
    docs: "docs/integrations/google-search-console.md",
  },
  ga4: {
    status: "planned",
    category: "analytics",
    description: "GA4 traffic and conversion analytics.",
    docs: "docs/integrations/ga4.md",
  },
  github: {
    status: "recommended",
    category: "productivity",
    description: "Repository operations, issues, PRs, and changelogs.",
    docs: "docs/integrations/github.md",
  },
  linear: {
    status: "recommended",
    category: "productivity",
    description: "Agency and product work tracking.",
    docs: "docs/integrations/linear.md",
  },
  notion: {
    status: "recommended",
    category: "knowledge",
    description: "Client knowledge bases and lightweight workspaces.",
    docs: "docs/integrations/notion.md",
  },
  gdrive: {
    status: "recommended",
    category: "knowledge",
    description: "Google Drive and Docs client artifacts.",
    docs: "docs/integrations/google-drive.md",
  },
  firecrawl: {
    status: "recommended",
    category: "research",
    description: "Site crawl and scrape alternative when Bright Data is too heavy.",
    docs: "docs/integrations/firecrawl.md",
  },
  exa: {
    status: "recommended",
    category: "research",
    description: "Web/search/research augmentation.",
    docs: "docs/integrations/exa.md",
  },
  perplexity: {
    status: "recommended",
    category: "research",
    description: "Research augmentation with citations.",
    docs: "docs/integrations/perplexity.md",
  },
  browser: {
    status: "recommended",
    category: "qa",
    description: "Browser/Playwright visual QA and local app verification.",
    docs: "docs/integrations/browser.md",
  },
};

function parseWorkspaceTargetArgs(args: string[]): WorkspaceTargetOptions {
  const positional: string[] = [];
  let mcpCommandMode: "local" | "published" = "local";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--mcp-command-mode") {
      mcpCommandMode = parseMcpCommandMode(args[++index]);
    } else if (arg.startsWith("--mcp-command-mode=")) {
      mcpCommandMode = parseMcpCommandMode(arg.slice("--mcp-command-mode=".length));
    } else if (arg === "--local-mcp") {
      mcpCommandMode = "local";
    } else if (arg === "--published-mcp") {
      mcpCommandMode = "published";
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown workspace option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    targetDir: path.resolve(positional[0] ?? "."),
    mcpCommandMode,
  };
}

function parseMcpCommandMode(value: string | undefined): "local" | "published" {
  if (value === "local" || value === "published") return value;
  throw new Error("MCP command mode must be `local` or `published`.");
}

function parseWorkspaceSetupArgs(args: string[]): WorkspaceSetupOptions {
  const positional: string[] = [];
  const options: WorkspaceSetupOptions = {
    targetDir: ".",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--user" || arg === "--name") {
      options.userName = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--user=")) {
      options.userName = arg.slice("--user=".length);
    } else if (arg.startsWith("--name=")) {
      options.userName = arg.slice("--name=".length);
    } else if (arg === "--role") {
      options.role = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--role=")) {
      options.role = arg.slice("--role=".length);
    } else if (arg === "--agency" || arg === "--company") {
      options.agency = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--agency=")) {
      options.agency = arg.slice("--agency=".length);
    } else if (arg.startsWith("--company=")) {
      options.agency = arg.slice("--company=".length);
    } else if (arg === "--timezone") {
      options.timezone = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--timezone=")) {
      options.timezone = arg.slice("--timezone=".length);
    } else if (arg === "--markets") {
      options.markets = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--markets=")) {
      options.markets = arg.slice("--markets=".length);
    } else if (arg === "--verticals") {
      options.verticals = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--verticals=")) {
      options.verticals = arg.slice("--verticals=".length);
    } else if (arg === "--detail") {
      options.detail = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--detail=")) {
      options.detail = arg.slice("--detail=".length);
    } else if (arg === "--communication") {
      options.communication = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--communication=")) {
      options.communication = arg.slice("--communication=".length);
    } else if (arg === "--approval") {
      options.approval = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--approval=")) {
      options.approval = arg.slice("--approval=".length);
    } else if (arg === "--custom-instructions") {
      options.customInstructions = readOptionValue(args, ++index, arg);
    } else if (arg.startsWith("--custom-instructions=")) {
      options.customInstructions = arg.slice("--custom-instructions=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown workspace setup option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  options.targetDir = path.resolve(positional[0] ?? ".");
  return options;
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
}

function parseReleaseCheckArgs(args: string[]): ReleaseCheckOptions {
  let allowDirty = false;
  for (const arg of args) {
    if (arg === "--allow-dirty") {
      allowDirty = true;
    } else {
      throw new Error(`Unknown release check option: ${arg}`);
    }
  }
  return { allowDirty };
}

async function askWithDefault(
  prompts: PromptSession,
  question: string,
  fallback: string,
): Promise<string> {
  return prompts.ask(question, fallback);
}

function isYes(value: string): boolean {
  return ["y", "yes", "true", "1"].includes(value.trim().toLowerCase());
}

function isNoneLike(value: string): boolean {
  return ["", "none", "none yet", "no", "n/a", "na", "-"].includes(value.trim().toLowerCase());
}

async function createPromptSession(): Promise<PromptSession> {
  if (process.stdin.isTTY) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return {
      ask: async (question, fallback) => {
        const answer = await rl.question(`${question} [${fallback}]: `);
        return answer.trim() || fallback;
      },
      close: () => rl.close(),
    };
  }

  const answers = (await readAllStdin()).split(/\r?\n/);
  let index = 0;
  return {
    ask: async (question, fallback) => {
      const raw = answers[index++] ?? "";
      const answer = raw.trim() || fallback;
      console.log(`${question} [${fallback}]: ${raw}`);
      return answer;
    },
    close: () => {},
  };
}

async function readAllStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function initWorkspace(targetDir: string, options: Pick<AdapterGenerationOptions, "mcpCommandMode"> = {}) {
  const templateDir = path.join(repoRoot, "templates", "workspace");
  await copyDir(templateDir, targetDir);
  await copyDir(path.join(repoRoot, "skills"), path.join(targetDir, "skills"));
  await copyDir(path.join(repoRoot, "skillsets"), path.join(targetDir, "skillsets"));

  const configPath = path.join(targetDir, "runbookos.config.json");
  try {
    await fs.access(configPath);
  } catch {
    await fs.copyFile(path.join(repoRoot, "runbookos.config.example.json"), configPath);
  }

  await generateAdapters(targetDir, options);
  console.log(`RunbookOS workspace created at ${targetDir}`);
}

async function generateAdapters(targetDir: string, options: Pick<AdapterGenerationOptions, "mcpCommandMode"> = {}) {
  const raw = await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8");
  const config = parseRunbookConfig(JSON.parse(raw));
  const adapterOptions = {
    workspaceDir: targetDir,
    packageRoot: repoRoot,
    mcpCommandMode: options.mcpCommandMode ?? "local",
  };

  await fs.mkdir(path.join(targetDir, ".codex"), { recursive: true });
  await fs.writeFile(path.join(targetDir, "AGENTS.md"), generateAgentsMd(config));
  await fs.writeFile(path.join(targetDir, "CLAUDE.md"), generateClaudeMd(config));
  await fs.writeFile(path.join(targetDir, ".mcp.json"), generateClaudeMcpJson(config, adapterOptions));
  await fs.writeFile(path.join(targetDir, ".codex", "config.toml"), generateCodexConfig(config, adapterOptions));
  await generateCodexSkills(targetDir);
  await fs.mkdir(path.join(targetDir, ".claude", "hooks"), { recursive: true });
  await fs.writeFile(path.join(targetDir, ".claude", "hooks", "load-context.sh"), generateStartupHook(config));
  await fs.chmod(path.join(targetDir, ".claude", "hooks", "load-context.sh"), 0o755).catch(() => {});

  console.log(`Generated provider adapters in ${targetDir}`);
}

async function generateCodexSkills(targetDir: string) {
  const skills = await loadSkills(targetDir);
  const codexRoot = path.join(targetDir, ".agents", "skills");
  await fs.mkdir(codexRoot, { recursive: true });

  for (const skill of skills) {
    const skillDir = path.join(codexRoot, skill.id);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), generateCodexSkill({
      id: skill.id,
      title: skill.title,
      description: skill.triggers.length > 0
        ? `Use for: ${skill.triggers.join(", ")}.`
        : skill.title,
      instructions: skill.instructions,
    }));
  }
}

async function setupWorkspace(options: WorkspaceSetupOptions) {
  const configPath = path.join(options.targetDir, "runbookos.config.json");
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(configPath, "utf-8")));
  const profile = {
    userName: options.userName ?? "Workspace Owner",
    role: options.role ?? "Operator",
    agency: options.agency ?? config.name.replace(/\s+Workspace$/i, ""),
    timezone: options.timezone ?? "UTC",
    markets: options.markets ?? "Define primary markets",
    verticals: options.verticals ?? "Shopify product listing, collection content, theme audits, SEO research, competitor analysis, content writing, lead generation",
    detail: options.detail ?? "Concise with enough context to act",
    communication: options.communication ?? "Direct, practical, and explicit about blockers",
    approval: options.approval ?? "Ask before external actions, credential use, publishing, or destructive changes",
    customInstructions: options.customInstructions,
  };

  const rawConfig = JSON.parse(await fs.readFile(configPath, "utf-8")) as JsonRecord;
  rawConfig.name = `${profile.agency} Workspace`;
  await fs.writeFile(configPath, `${JSON.stringify(rawConfig, null, 2)}\n`);

  await updateWorkspaceUserFile(path.join(options.targetDir, "USER.md"), profile);
  await updateWorkspaceAgencyFile(path.join(options.targetDir, "AGENCY.md"), profile);
  await updateWorkspaceRunbookFile(path.join(options.targetDir, "RUNBOOK.md"), profile);
  await updateWorkspaceSoulFile(path.join(options.targetDir, "SOUL.md"), profile);
  await updateWorkspaceActiveContext(path.join(options.targetDir, config.memory.activeContextFile), profile);
  await generateAdapters(options.targetDir);

  console.log(`Workspace setup updated: ${path.relative(process.cwd(), options.targetDir) || "."}`);
  console.log(`Workspace name: ${profile.agency} Workspace`);
  console.log("Credentials written: no");
}

async function runWorkspaceSetupWizard(targetDir: string) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const prompts = await createPromptSession();

  try {
    console.log("RunbookOS Setup Wizard");
    console.log("");
    console.log("Press Enter to accept a suggestion. Credentials are never requested or written here.");
    console.log("");

    const userName = await askWithDefault(prompts, "Your name or team", "Workspace Owner");
    const role = await askWithDefault(prompts, "Role", "Agency operator");
    const agency = await askWithDefault(prompts, "Agency or company", config.name.replace(/\s+Workspace$/i, ""));
    const timezone = await askWithDefault(prompts, "Timezone", "Europe/London");
    const markets = await askWithDefault(prompts, "Primary markets", "UK, US, EU");
    const verticals = await askWithDefault(prompts, "Active verticals / skill lanes", "Shopify product listing, collection content, theme audits, SEO research, competitor analysis, content writing, lead generation");
    const detail = await askWithDefault(prompts, "Preferred detail level", "Concise decisions with links to evidence");
    const communication = await askWithDefault(prompts, "Communication style", "Direct, practical, and action-oriented");
    const approval = await askWithDefault(prompts, "Approval rule", "Ask before external actions, publishing, credentials, or destructive changes");
    const skillAdjustments = await askWithDefault(prompts, "Any skill adjustments to record now?", "None yet; I will amend skills as the workspace learns.");
    const customInstruction = await askWithDefault(prompts, "Custom agent instruction to add now", "State assumptions, identify blockers, and keep client dashboards current.");
    const customInstructions = [
      customInstruction,
      `Starter skill lanes: ${verticals}.`,
      isNoneLike(skillAdjustments) ? undefined : `Skill adjustments: ${skillAdjustments}`,
    ].filter(Boolean).join(" ");

    await setupWorkspace({
      targetDir,
      userName,
      role,
      agency,
      timezone,
      markets,
      verticals,
      detail,
      communication,
      approval,
      customInstructions,
    });

    const clientSlug = parseClientSlug(await askWithDefault(prompts, "First client slug", "demo-client"));
    const clientDir = safeWorkspaceJoin(targetDir, path.join(config.workspace.clientRoot, clientSlug));
    if (await exists(clientDir)) {
      console.log(`Client exists, skipping create: ${path.relative(targetDir, clientDir)}`);
    } else {
      const clientName = await askWithDefault(prompts, "First client name", titleFromSlug(clientSlug));
      const website = await askWithDefault(prompts, "Client website/domain", "demo-commerce.example");
      const platform = await askWithDefault(prompts, "Client platform", "Shopify");
      await createClient({
        targetDir,
        slug: clientSlug,
        name: clientName,
        website,
        platform,
      });
    }

    const enableShopify = await askWithDefault(prompts, "Enable Shopify fixture integration now? yes/no", "yes");
    if (isYes(enableShopify)) {
      await setupIntegration({
        targetDir,
        id: "shopify",
        mode: "fixture",
      });
    }

    const enableGmail = await askWithDefault(prompts, "Enable Gmail integration wiring now? yes/no", "yes");
    if (isYes(enableGmail)) {
      await setupIntegration({
        targetDir,
        id: "gmail",
        mode: "oauth",
      });
      console.log(`Gmail browser auth is a separate private step: pnpm runbook gmail auth ${formatCliPath(targetDir)}`);
    }

    await showWorkspaceSetupMenu(targetDir);
  } finally {
    prompts.close();
  }
}

async function showWorkspaceSetupMenu(targetDir: string) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const clients = await listWorkspaceClientSlugs(targetDir, config.workspace.clientRoot);
  const enabledIntegrations = Object.entries(config.mcpServers)
    .filter(([, server]) => server.enabled)
    .map(([id]) => id)
    .sort();
  const profileConfigured = await isWorkspaceProfileConfigured(path.join(targetDir, "USER.md"));
  const adaptersGenerated = await Promise.all([
    exists(path.join(targetDir, "AGENTS.md")),
    exists(path.join(targetDir, "CLAUDE.md")),
    exists(path.join(targetDir, ".codex", "config.toml")),
    exists(path.join(targetDir, ".mcp.json")),
  ]).then((results) => results.every(Boolean));
  const displayDir = path.relative(process.cwd(), targetDir) || ".";
  console.log(`RunbookOS Setup Menu`);
  console.log(``);
  console.log(`Workspace: ${config.name}`);
  console.log(`Path: ${displayDir}`);
  console.log(`Profile: ${profileConfigured ? "configured" : "needs setup"}`);
  console.log(`Clients: ${clients.length > 0 ? clients.join(", ") : "none yet"}`);
  console.log(`Enabled integrations: ${enabledIntegrations.join(", ") || "none"}`);
  console.log(`Adapters: ${adaptersGenerated ? "generated" : "missing"}`);
  console.log(``);
  console.log(`1. Personalize this workspace`);
  console.log(`   pnpm runbook workspace setup ${displayDir} --user "<Your Name>" --role "<Your Role>" --agency "<Agency or Company>" --timezone "<Timezone>"`);
  console.log(`2. Add a client`);
  console.log(`   pnpm runbook client create <client-slug> ${displayDir} --name "<Client Name>" --website <domain> --platform Shopify`);
  console.log(`3. Enable starter integrations`);
  console.log(`   pnpm runbook integrations setup shopify ${displayDir} --mode fixture`);
  console.log(`   pnpm runbook integrations setup shopify ${displayDir} --mode customer_custom_app`);
  console.log(`   pnpm runbook integrations setup ahrefs ${displayDir} --mode fixture`);
  console.log(`   pnpm runbook integrations setup brightdata ${displayDir}`);
  console.log(`   pnpm runbook integrations setup gmail ${displayDir}`);
  console.log(`4. Connect runtime credentials`);
  console.log(`   pnpm runbook integrations doctor shopify ${displayDir}`);
  console.log(`   pnpm runbook integrations doctor ahrefs ${displayDir}`);
  console.log(`   pnpm runbook integrations doctor brightdata ${displayDir}`);
  console.log(`   pnpm runbook gmail auth ${displayDir}`);
  console.log(`   pnpm runbook integrations doctor gmail ${displayDir}`);
  console.log(`   pnpm runbook credentials checklist ${displayDir} --write-local-env`);
  console.log(`5. Customize skills and verticals`);
  console.log(`   pnpm runbook skills list ${displayDir}`);
  console.log(`   pnpm runbook skillsets list ${displayDir}`);
  console.log(`   open ${path.join(displayDir, "CUSTOMIZATION.md")}`);
  console.log(`   edit ${path.join(displayDir, "skills")}/<skill>/SKILL.md`);
  console.log(`6. Check readiness`);
  console.log(`   pnpm runbook doctor ${displayDir}`);
  console.log(`7. Open the workspace in Claude Code or Codex`);
  console.log(`   read RUNBOOK.md, USER.md, ACTIVE_CONTEXT.md, and the relevant skills/<skill>/SKILL.md`);
  console.log(`8. Run a safe readiness smoke`);
  console.log(`   pnpm runbook smoke ${displayDir}`);
  console.log(``);
  console.log(`Suggested next: ${suggestWorkspaceSetupNextStep(displayDir, profileConfigured, clients.length, enabledIntegrations, adaptersGenerated)}`);
}

async function updateWorkspaceUserFile(file: string, profile: {
  userName: string;
  role: string;
  agency: string;
  markets: string;
  verticals: string;
  detail: string;
  communication: string;
  approval: string;
}) {
  let content = await fs.readFile(file, "utf-8");
  content = replaceMarkdownListValue(content, "Name", profile.userName);
  content = replaceMarkdownListValue(content, "Role", profile.role);
  content = replaceMarkdownListValue(content, "Company", profile.agency);
  content = replaceMarkdownListValue(content, "Primary markets", profile.markets);
  content = replaceMarkdownListValue(content, "Active verticals", profile.verticals);
  content = replaceMarkdownListValue(content, "Preferred level of detail", profile.detail);
  content = replaceMarkdownListValue(content, "Communication style", profile.communication);
  content = replaceMarkdownListValue(content, "Approval thresholds", profile.approval);
  await fs.writeFile(file, content);
}

async function updateWorkspaceAgencyFile(file: string, profile: {
  agency: string;
  markets: string;
  verticals: string;
  approval: string;
}) {
  const content = await fs.readFile(file, "utf-8").catch(() => "# Agency Operating Defaults\n");
  const section = [
    `Agency/company: ${profile.agency}`,
    ``,
    `Primary markets: ${profile.markets}`,
    ``,
    `Active verticals: ${profile.verticals}`,
    ``,
    `Default approval boundary: ${profile.approval}`,
  ].join("\n");
  await fs.writeFile(file, upsertMarkdownSection(content, "Workspace Setup", section));
}

async function updateWorkspaceRunbookFile(file: string, profile: {
  userName: string;
  role: string;
  agency: string;
  timezone: string;
  verticals: string;
  approval: string;
  customInstructions?: string;
}) {
  const content = await fs.readFile(file, "utf-8");
  const section = [
    `Owner: ${profile.userName}`,
    `Role: ${profile.role}`,
    `Agency/company: ${profile.agency}`,
    `Timezone: ${profile.timezone}`,
    `Active verticals: ${profile.verticals}`,
    `Approval default: ${profile.approval}`,
    ``,
    profile.customInstructions ? `Custom instruction: ${profile.customInstructions}` : `Custom instruction: Add user-specific instructions here when they become durable.`,
    ``,
    `Starter path: create a client, enable one integration in fixture mode, run a safe readiness smoke, then let the agent work from the relevant skill file.`,
  ].join("\n");
  await fs.writeFile(file, upsertMarkdownSection(content, "Workspace Setup", section));
}

async function updateWorkspaceSoulFile(file: string, profile: {
  customInstructions?: string;
}) {
  if (!profile.customInstructions) return;
  const content = await fs.readFile(file, "utf-8");
  await fs.writeFile(file, upsertMarkdownSection(content, "Custom Instructions", profile.customInstructions));
}

async function updateWorkspaceActiveContext(file: string, profile: {
  agency: string;
  timezone: string;
}) {
  const content = await fs.readFile(file, "utf-8");
  const section = [
    `Workspace setup updated ${currentDate()} for ${profile.agency}.`,
    ``,
    `Timezone: ${profile.timezone}`,
    ``,
    `Next setup action: create the first real client or run \`runbook workspace menu <dir>\` for the guided setup menu.`,
  ].join("\n");
  await fs.writeFile(file, upsertMarkdownSection(content, "Workspace Setup", section));
}

async function doctorWorkspace(targetDir: string) {
  const checks = await runWorkspaceChecks(targetDir, { includePrivateScan: true });
  printChecks(checks);
  const failures = checks.filter((check) => check.level === "fail");
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

async function verifyWorkspace(targetDir: string) {
  const checks = await runWorkspaceChecks(targetDir, { includePrivateScan: true, strict: true });
  printChecks(checks);
  const failures = checks.filter((check) => check.level === "fail");
  if (failures.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log("RunbookOS verification passed.");
}

async function smokeWorkspace(targetDir: string) {
  const checks: CheckResult[] = [];
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const workspaceChecks = await runWorkspaceChecks(targetDir, { includePrivateScan: true, strict: true });
  checks.push(...workspaceChecks.map((check) => ({
    ...check,
    label: `workspace:${check.label}`,
  })));

  const clients = await listWorkspaceClientSlugs(targetDir, config.workspace.clientRoot);
  if (clients.length > 0) {
    checks.push(pass("client", `${clients.length} client folder(s) available`));
  } else {
    checks.push(fail("client", `no client found under ${config.workspace.clientRoot}; run \`runbook client create <slug> <dir>\``));
  }

  const enabledCore = ["workspace", "memory"].filter((id) => config.mcpServers[id]?.enabled);
  checks.push(enabledCore.length === 2
    ? pass("core-mcp", "workspace and memory enabled")
    : fail("core-mcp", `missing enabled core MCP(s): ${["workspace", "memory"].filter((id) => !config.mcpServers[id]?.enabled).join(", ")}`));

  const skills = await loadSkills(targetDir).catch(() => []);
  checks.push(skills.length > 0
    ? pass("agent-skills", `${skills.length} skill file(s) ready for the agent`)
    : fail("agent-skills", "no skills available for agent execution"));

  if (config.mcpServers.shopify?.enabled) {
    checks.push(pass("starter-integration", "shopify enabled"));
  } else {
    checks.push(warn("starter-integration", "shopify not enabled; run `runbook integrations setup shopify <dir> --mode fixture`"));
  }

  console.log("RunbookOS Smoke Summary");
  printChecks(checks);
  console.log("External actions executed: no");
  console.log("Credentials required: no");
  console.log("Agent runtime invoked: no");

  const failures = checks.filter((check) => check.level === "fail");
  const warnings = checks.filter((check) => check.level === "warn");
  if (failures.length > 0) {
    console.log(`Result: failed (${failures.length} failure(s), ${warnings.length} warning(s))`);
    process.exitCode = 1;
    return;
  }

  console.log(warnings.length > 0
    ? `Result: ready with attention (${warnings.length} warning(s))`
    : "Result: ready");
}

async function checkRelease(options: ReleaseCheckOptions) {
  const checks: CheckResult[] = [];
  const branch = gitOutput(["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = gitOutput(["status", "--short"]);
  const trackedWorkspaces = gitOutput(["ls-files", "workspaces"]);
  const ignoredWorkspaces = gitOutput(["status", "--ignored", "--short", "workspaces"]);
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const readme = await fs.readFile(path.join(repoRoot, "README.md"), "utf-8");
  const gitignore = await fs.readFile(path.join(repoRoot, ".gitignore"), "utf-8").catch(() => "");
  const requiredScripts = [
    "typecheck",
    "build",
    "verify:json",
    "verify:adapters",
    "verify:setup",
    "verify:user-start",
    "verify:client",
    "verify:skillsets",
    "verify:smoke",
    "verify:install",
    "verify:integrations",
    "verify:gmail",
    "verify:mcp",
    "verify:shopify",
    "verify:ahrefs",
  ];
  const quickStartCommands = [
    "pnpm runbook install check",
    "pnpm user:start",
    "pnpm runbook init ./my-workspace",
    "pnpm runbook setup wizard ./my-workspace",
    "pnpm runbook smoke ./my-workspace",
  ];

  checks.push(branch
    ? pass("git:branch", branch)
    : fail("git:branch", "could not read current branch"));
  checks.push(status.trim().length === 0
    ? pass("git:working-tree", "clean")
    : options.allowDirty
      ? warn("git:working-tree", `dirty allowed for this run (${status.trim().split("\n").length} item(s))`)
      : fail("git:working-tree", "uncommitted changes present"));
  checks.push(trackedWorkspaces.trim().length === 0
    ? pass("git:workspaces", "no tracked files under workspaces/")
    : fail("git:workspaces", `tracked workspace files: ${trackedWorkspaces.trim().split("\n").slice(0, 5).join(", ")}`));
  checks.push(ignoredWorkspaces.includes("!! workspaces/")
    ? pass("gitignore:workspaces", "workspaces/ is ignored")
    : gitignore.split(/\r?\n/).includes("workspaces/")
      ? pass("gitignore:workspaces", "workspaces/ ignore rule present")
      : fail("gitignore:workspaces", "workspaces/ is not ignored"));
  checks.push(gitignore.includes(".env")
    ? pass("gitignore:env", ".env files ignored")
    : fail("gitignore:env", ".env ignore rule missing"));

  const jsonErrors = await validateJsonFiles(repoRoot);
  checks.push(jsonErrors.length === 0
    ? pass("json", "all repository JSON files parse")
    : fail("json", jsonErrors.slice(0, 5).join("; ")));

  const publicScanFiles = await collectReleaseScanFiles(repoRoot);
  const privateHits = await scanFilesForPrivateData(repoRoot, publicScanFiles);
  checks.push(privateHits.length === 0
    ? pass("private-data", "no obvious tokens or prototype terms in public files")
    : fail("private-data", privateHits.slice(0, 8).join("; ")));

  for (const scriptName of requiredScripts) {
    checks.push(typeof scripts[scriptName] === "string"
      ? pass(`script:${scriptName}`, "present")
      : fail(`script:${scriptName}`, "missing"));
  }

  for (const command of quickStartCommands) {
    checks.push(readme.includes(command)
      ? pass(`readme:${command}`, "present")
      : fail(`readme:${command}`, "missing from README quick start"));
  }

  checks.push(readme.includes("public-safe")
    ? pass("readme:public-safe", "public-safe boundary stated")
    : warn("readme:public-safe", "README should state the public-safe boundary"));
  checks.push(readme.includes("docs/ship-readiness.md")
    ? pass("readme:ship-readiness", "ship-readiness doc linked")
    : warn("readme:ship-readiness", "README should link docs/ship-readiness.md"));

  console.log("RunbookOS Release Check");
  printChecks(checks);
  console.log(`Branch: ${branch || "unknown"}`);
  console.log(`Dirty allowed: ${options.allowDirty ? "yes" : "no"}`);
  console.log("Private workspaces scanned: no; workspaces/ must stay ignored and untracked.");

  const failures = checks.filter((check) => check.level === "fail");
  const warnings = checks.filter((check) => check.level === "warn");
  if (failures.length > 0) {
    console.log(`Result: not ready (${failures.length} failure(s), ${warnings.length} warning(s))`);
    process.exitCode = 1;
    return;
  }
  console.log(warnings.length > 0
    ? `Result: ready with attention (${warnings.length} warning(s))`
    : "Result: ready to share");
}

async function checkInstall() {
  const checks: CheckResult[] = [];
  const packageJson = await readJson(path.join(repoRoot, "package.json"));
  const packageManager = stringValue(packageJson.packageManager, "");
  const pnpmVersion = commandOutput("pnpm", ["--version"]);
  const nodeMajor = Number(process.versions.node.split(".")[0] ?? "0");
  const builtFiles = [
    "apps/cli/dist/index.js",
    "packages/mcp-workspace/dist/index.js",
    "packages/mcp-memory/dist/index.js",
    "packages/mcp-shopify/dist/index.js",
    "packages/mcp-ahrefs/dist/index.js",
  ];

  checks.push(nodeMajor >= 20
    ? pass("node", process.versions.node)
    : fail("node", `Node ${process.versions.node}; Node 20+ is required for the local source path`));
  checks.push(pnpmVersion.status === 0
    ? pass("pnpm", pnpmVersion.output)
    : fail("pnpm", "pnpm is not available on PATH"));
  checks.push(packageManager.startsWith("pnpm@")
    ? pass("packageManager", packageManager)
    : warn("packageManager", "package.json does not pin pnpm"));
  if (pnpmVersion.status === 0 && packageManager.startsWith("pnpm@")) {
    const expected = packageManager.slice("pnpm@".length);
    checks.push(pnpmVersion.output === expected
      ? pass("pnpm:version-match", expected)
      : warn("pnpm:version-match", `installed ${pnpmVersion.output}; packageManager pins ${expected}`));
  }
  checks.push(await exists(path.join(repoRoot, "pnpm-lock.yaml"))
    ? pass("lockfile", "pnpm-lock.yaml present")
    : fail("lockfile", "pnpm-lock.yaml missing"));
  checks.push(await exists(path.join(repoRoot, "pnpm-workspace.yaml"))
    ? pass("workspace", "pnpm-workspace.yaml present")
    : fail("workspace", "pnpm-workspace.yaml missing"));
  checks.push(await exists(path.join(repoRoot, "node_modules", ".pnpm"))
    ? pass("dependencies", "node_modules/.pnpm present")
    : warn("dependencies", "run pnpm install before using the source checkout"));

  for (const file of builtFiles) {
    checks.push(await exists(path.join(repoRoot, file))
      ? pass(`built:${file}`, "present")
      : warn(`built:${file}`, "run pnpm -w build before provider/MCP use"));
  }

  const help = commandOutput("pnpm", ["runbook", "--help"]);
  checks.push(help.status === 0 && help.output.includes("RunbookOS CLI")
    ? pass("cli", "pnpm runbook --help works")
    : fail("cli", "pnpm runbook --help failed"));

  console.log("RunbookOS Install Check");
  printChecks(checks);
  console.log("Install mode: source checkout");
  console.log("Global package install ready: no; package publishing is still planned.");
  console.log("External actions executed: no");

  const failures = checks.filter((check) => check.level === "fail");
  const warnings = checks.filter((check) => check.level === "warn");
  if (failures.length > 0) {
    console.log(`Result: not ready (${failures.length} failure(s), ${warnings.length} warning(s))`);
    process.exitCode = 1;
    return;
  }

  console.log(warnings.length > 0
    ? `Result: source install ready with attention (${warnings.length} warning(s))`
    : "Result: source install ready");
}

async function listSkills(targetDir: string) {
  const skills = await loadSkills(targetDir);
  if (skills.length === 0) {
    console.log("No skills found.");
    return;
  }

  for (const skill of skills) {
    console.log(`${skill.id}\t${skill.title}\t${skill.modelTier}\t${skill.version}`);
  }
}

function parseClientCreateArgs(args: string[], slug: string): ClientCreateOptions {
  const positional: string[] = [];
  let name: string | undefined;
  let website: string | undefined;
  let platform: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--name") {
      name = args[++index];
    } else if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length);
    } else if (arg === "--website") {
      website = args[++index];
    } else if (arg.startsWith("--website=")) {
      website = arg.slice("--website=".length);
    } else if (arg === "--platform") {
      platform = args[++index];
    } else if (arg.startsWith("--platform=")) {
      platform = arg.slice("--platform=".length);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown client create option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    slug: parseClientSlug(slug),
    targetDir: path.resolve(positional[0] ?? "."),
    name,
    website,
    platform,
  };
}

async function createClient(options: ClientCreateOptions) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(options.targetDir, "runbookos.config.json"), "utf-8")));
  const templateDir = safeWorkspaceJoin(options.targetDir, path.join(config.workspace.clientRoot, "_template"));
  const clientDir = safeWorkspaceJoin(options.targetDir, path.join(config.workspace.clientRoot, options.slug));

  assertAllowedWorkspaceWrite(options.targetDir, config.workspace.allowedWriteRoots, clientDir);
  if (await exists(clientDir)) {
    throw new Error(`Client already exists: ${path.relative(options.targetDir, clientDir)}`);
  }

  await copyDir(templateDir, clientDir);
  await customizeClientDashboard(clientDir, {
    name: options.name ?? titleFromSlug(options.slug),
    website: options.website ?? "example.com",
    platform: options.platform ?? "Shopify/WordPress/Custom",
  });
  await updateActiveContextForNewClient(options.targetDir, config.memory.activeContextFile, config.workspace.clientRoot, {
    slug: options.slug,
    name: options.name ?? titleFromSlug(options.slug),
  });

  console.log(`Client created: ${path.relative(options.targetDir, clientDir)}`);
  console.log(`Dashboard: ${path.relative(options.targetDir, path.join(clientDir, "README.md"))}`);
  console.log("Credentials written: no");
}

function parseIntegrationListArgs(args: string[], maybeTarget: string | undefined): IntegrationListOptions {
  const positional: string[] = [];
  let enabledOnly = false;

  if (maybeTarget) positional.push(maybeTarget);

  for (const arg of args) {
    if (arg === "--enabled") {
      enabledOnly = true;
    } else if (arg === "--all") {
      enabledOnly = false;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown integrations list option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    targetDir: path.resolve(positional[0] ?? "."),
    enabledOnly,
  };
}

function parseIntegrationDoctorArgs(args: string[], id: string): IntegrationDoctorOptions {
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-")) {
      throw new Error(`Unknown integrations doctor option: ${arg}`);
    }
    positional.push(arg);
  }

  return {
    id,
    targetDir: path.resolve(positional[0] ?? "."),
  };
}

function parseIntegrationSetupArgs(args: string[], id: string): IntegrationSetupOptions {
  const positional: string[] = [];
  let mode: string | undefined;
  let command: string | undefined;
  const commandArgs: string[] = [];
  const env: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--mode") {
      mode = args[++index];
    } else if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length);
    } else if (arg === "--command") {
      command = args[++index];
    } else if (arg.startsWith("--command=")) {
      command = arg.slice("--command=".length);
    } else if (arg === "--arg") {
      commandArgs.push(args[++index]);
    } else if (arg.startsWith("--arg=")) {
      commandArgs.push(arg.slice("--arg=".length));
    } else if (arg === "--env") {
      env.push(args[++index]);
    } else if (arg.startsWith("--env=")) {
      env.push(arg.slice("--env=".length));
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown integrations setup option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    id,
    targetDir: path.resolve(positional[0] ?? "."),
    mode,
    command,
    args: commandArgs,
    env,
  };
}

function parseCredentialsChecklistArgs(args: string[], fallbackTarget: string): CredentialsChecklistOptions {
  const positional: string[] = [];
  let writeLocalEnv = false;

  for (const arg of args) {
    if (arg === "--write-local-env") {
      writeLocalEnv = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown credentials checklist option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    targetDir: path.resolve(positional[0] ?? fallbackTarget),
    writeLocalEnv,
  };
}

async function listIntegrations(options: IntegrationListOptions) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(options.targetDir, "runbookos.config.json"), "utf-8")));
  const entries = Object.entries(config.mcpServers)
    .filter(([, server]) => !options.enabledOnly || server.enabled)
    .sort(([left], [right]) => sortIntegrationId(left).localeCompare(sortIntegrationId(right)));

  if (entries.length === 0) {
    console.log(options.enabledOnly ? "No enabled integrations found." : "No integrations configured.");
    return;
  }

  console.log(["id", "enabled", "status", "category", "env", "command", "docs"].join("\t"));
  for (const [id, server] of entries) {
    const metadata = integrationMetadata[id] ?? {
      status: "ready-config" as const,
      category: "custom",
      description: "Custom MCP integration from workspace config.",
    };
    console.log([
      id,
      server.enabled ? "yes" : "no",
      metadata.status,
      metadata.category,
      server.env.length > 0 ? server.env.join(",") : "-",
      formatIntegrationCommand(id, server),
      metadata.docs ?? "-",
    ].join("\t"));
  }
}

async function setupIntegration(options: IntegrationSetupOptions) {
  if (options.id === "shopify") {
    await setupShopifyIntegration(options);
    return;
  }

  if (options.id === "ahrefs") {
    await setupAhrefsIntegration(options);
    return;
  }

  if (options.id === "gmail") {
    await setupGmailIntegration(options);
    return;
  }

  await setupExternalIntegration(options);
}

async function doctorIntegration(options: IntegrationDoctorOptions) {
  if (options.id === "shopify") {
    await doctorShopifyIntegration(options.targetDir);
    return;
  }

  if (options.id === "ahrefs") {
    await doctorAhrefsIntegration(options.targetDir);
    return;
  }

  if (options.id === "gmail") {
    await doctorGmailIntegration(options.targetDir);
    return;
  }

  await doctorExternalIntegration(options);
}

async function setupExternalIntegration(options: IntegrationSetupOptions) {
  const metadata = integrationMetadata[options.id];
  if (!metadata) {
    throw new Error(`Unknown integration: ${options.id}. Try: runbook integrations list <dir>`);
  }

  const configPath = path.join(options.targetDir, "runbookos.config.json");
  const config = await readJson(configPath);
  const mcpServers: JsonRecord = isRecord(config.mcpServers) ? config.mcpServers : {};
  const configuredServer = mcpServers[options.id];
  const current: JsonRecord = isRecord(configuredServer) ? configuredServer : {};
  const currentCommand = typeof current.command === "string" ? current.command : undefined;
  const command = options.command ?? currentCommand;
  const currentArgs = arrayOfStrings(current.args);
  const currentEnv = arrayOfStrings(current.env);
  const env = options.env && options.env.length > 0 ? uniqueStrings(options.env) : currentEnv;
  const args = options.args && options.args.length > 0 ? options.args : currentArgs;

  if (!command) {
    throw new Error([
      `Integration ${options.id} has no first-party package or default external command yet.`,
      `Enable it with an external MCP command, for example:`,
      `runbook integrations setup ${options.id} <dir> --command <cmd> --arg <arg> --env <ENV_NAME>`,
      metadata.docs ? `Docs: ${metadata.docs}` : undefined,
    ].filter(Boolean).join("\n"));
  }

  mcpServers[options.id] = {
    ...current,
    enabled: true,
    command,
    args,
    env,
  };
  config.mcpServers = mcpServers;

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await generateAdapters(options.targetDir);

  console.log(`${options.id} integration enabled for ${path.relative(process.cwd(), options.targetDir) || "."}.`);
  console.log(`Status: ${metadata.status}`);
  console.log(`Command: ${[command, ...args].join(" ")}`);
  console.log(`Required env: ${env.length > 0 ? env.join(", ") : "-"}`);
  console.log("Generated provider adapters with external MCP wiring.");
  console.log("Credentials written: no");
  if (metadata.docs) console.log(`Docs: ${metadata.docs}`);
  if (env.length > 0) {
    console.log("Set runtime env vars before using this tool:");
    for (const envName of env) console.log(`export ${envName}=<value>`);
  }
  console.log(`Next: pnpm runbook integrations doctor ${options.id} <dir>`);
}

async function doctorExternalIntegration(options: IntegrationDoctorOptions) {
  const metadata = integrationMetadata[options.id];
  if (!metadata) throw new Error(`Unknown integration: ${options.id}. Try: runbook integrations list <dir>`);
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(options.targetDir, "runbookos.config.json"), "utf-8")));
  const server = config.mcpServers[options.id];
  const results: CheckResult[] = [];

  results.push(server?.enabled
    ? pass("config", `${options.id} integration is enabled`)
    : fail("config", `${options.id} integration is disabled in runbookos.config.json`));
  results.push(server?.command
    ? pass("command", [server.command, ...(server.args ?? [])].join(" "))
    : fail("command", "no external MCP command configured"));
  const missingEnv = (server?.env ?? []).filter((envName) => !process.env[envName]);
  results.push(missingEnv.length === 0
    ? pass("runtime-env", "all configured env vars are present or none are required")
    : warn("runtime-env", `missing env: ${missingEnv.join(", ")}`));
  results.push(pass("credentials", "credentials are runtime/env only"));
  results.push(warn("first-party-package", metadata.status === "working" ? "working package exists" : "external/user-supplied MCP path"));

  console.log(`RunbookOS ${options.id} Integration Doctor`);
  printChecks(results);
  if (metadata.docs) console.log(`Docs: ${metadata.docs}`);
  console.log("Provider/model calls made: no");
  console.log("External actions executed: no");

  if (results.some((result) => result.level === "fail")) {
    process.exitCode = 1;
  }
}

async function showCredentialsChecklist(options: CredentialsChecklistOptions) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(options.targetDir, "runbookos.config.json"), "utf-8")));
  const displayDir = formatCliPath(options.targetDir);
  const credentialTargets = [
    {
      id: "shopify",
      label: "Shopify",
      use: "customer-owned custom app for store reads and approval-preview write work",
      setup: `pnpm runbook integrations setup shopify ${displayDir} --mode customer_custom_app`,
      auth: "Create a Shopify custom app/admin token in the customer store, then export SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_TOKEN locally.",
    },
    {
      id: "gmail",
      label: "Gmail",
      use: "mailbox metadata reads and approval-backed draft creation",
      setup: `pnpm runbook integrations setup gmail ${displayDir}`,
      auth: `pnpm runbook gmail auth ${displayDir}`,
    },
    {
      id: "ahrefs",
      label: "Ahrefs",
      use: "SEO research and competitor data",
      setup: `pnpm runbook integrations setup ahrefs ${displayDir} --mode api_token`,
      auth: "Export AHREFS_API_TOKEN locally, or use fixture mode while testing.",
    },
    {
      id: "brightdata",
      label: "Bright Data",
      use: "public web data, ecommerce research, and lead-gen research through external MCP",
      setup: `pnpm runbook integrations setup brightdata ${displayDir}`,
      auth: "Export API_TOKEN locally for the Bright Data MCP runtime.",
    },
    {
      id: "image",
      label: "Image",
      use: "Codex-native image generation, Claude-to-Google/Nano Banana handoff, or external image MCP",
      setup: `pnpm runbook integrations setup image ${displayDir} --command <image-mcp-command> --env IMAGE_PROVIDER_API_KEY`,
      auth: "Codex-native image generation uses the provider session. External image MCPs should read IMAGE_PROVIDER_API_KEY or their own env vars locally.",
    },
    {
      id: "gsc",
      label: "Google Search Console",
      use: "owned-site SEO performance and indexing data",
      setup: `pnpm runbook integrations setup gsc ${displayDir} --command <gsc-mcp-command> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN`,
      auth: "Use a customer-authorized Google OAuth client/token; store values locally only.",
    },
    {
      id: "ga4",
      label: "GA4",
      use: "traffic, conversion, and ecommerce analytics",
      setup: `pnpm runbook integrations setup ga4 ${displayDir} --command <ga4-mcp-command> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN`,
      auth: "Use a customer-authorized Google OAuth client/token; store values locally only.",
    },
    {
      id: "gdrive",
      label: "Google Drive/Docs",
      use: "client briefs, source docs, handoff artifacts, and generated drafts",
      setup: `pnpm runbook integrations setup gdrive ${displayDir} --command <gdrive-mcp-command> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN`,
      auth: "Use a customer-authorized Google OAuth client/token; store values locally only.",
    },
  ];
  const allEnvNames = uniqueStrings(credentialTargets.flatMap((target) => config.mcpServers[target.id]?.env ?? []));

  console.log("RunbookOS Credential Checklist");
  console.log("");
  console.log(`Workspace: ${config.name}`);
  console.log(`Path: ${displayDir}`);
  console.log("Storage rule: keep secret values in local env, an ignored local env file, OS keychain/secret manager, or provider OAuth stores.");
  console.log("RunbookOS writes env names/placeholders only; do not commit real values.");
  console.log("");

  for (const target of credentialTargets) {
    const server = config.mcpServers[target.id];
    const envNames = server?.env ?? [];
    const missingEnv = envNames.filter((envName) => !process.env[envName]);
    console.log(`${target.label} (${target.id})`);
    console.log(`  Enabled: ${server?.enabled ? "yes" : "no"}`);
    console.log(`  Use: ${target.use}`);
    console.log(`  Env: ${envNames.length > 0 ? envNames.join(", ") : "none"}`);
    console.log(`  Runtime status: ${missingEnv.length > 0 ? `missing ${missingEnv.join(", ")}` : "present or not required"}`);
    console.log(`  Setup: ${target.setup}`);
    console.log(`  Auth: ${target.auth}`);
    console.log(`  Doctor: pnpm runbook integrations doctor ${target.id} ${displayDir}`);
    console.log("");
  }

  const localEnvPath = path.join(options.targetDir, ".runbookos", "local.env");
  console.log("Local Env Option");
  console.log(`  Ignored file: ${path.relative(process.cwd(), localEnvPath) || ".runbookos/local.env"}`);
  console.log("  Load in a shell with: set -a; source .runbookos/local.env; set +a");
  console.log("  Write placeholder file: pnpm runbook credentials checklist <dir> --write-local-env");

  if (options.writeLocalEnv) {
    const writtenPath = await upsertLocalEnvTemplate(localEnvPath, allEnvNames);
    console.log("");
    console.log(`Local env placeholder updated: ${path.relative(process.cwd(), writtenPath) || writtenPath}`);
    console.log("Secret values written by RunbookOS: no");
  }
}

async function setupShopifyIntegration(options: IntegrationSetupOptions) {
  const mode = parseShopifySetupMode(options.mode ?? "fixture");
  const configPath = path.join(options.targetDir, "runbookos.config.json");
  const config = await readJson(configPath);
  const mcpServers = isRecord(config.mcpServers) ? config.mcpServers : {};
  const current = isRecord(mcpServers.shopify) ? mcpServers.shopify : {};

  mcpServers.shopify = {
    ...current,
    enabled: true,
    env: [
      "RUNBOOKOS_SHOPIFY_AUTH_MODE",
      "SHOPIFY_ADMIN_TOKEN",
      "SHOPIFY_SHOP_DOMAIN",
      "SHOPIFY_API_VERSION",
    ],
  };
  config.mcpServers = mcpServers;

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await generateAdapters(options.targetDir);

  console.log(`Shopify integration enabled for ${path.relative(process.cwd(), options.targetDir) || "."}.`);
  console.log(`Mode: ${mode}`);
  console.log("Generated provider adapters with Shopify MCP wiring.");
  console.log("Credentials written: no");
  console.log("Writes implemented: no");
  if (mode === "fixture") {
    console.log("Next: pnpm runbook integrations doctor shopify <dir>");
    console.log("Fixture mode uses public demo data and requires no Shopify credentials.");
  } else {
    console.log("Set these runtime env vars before doctor/live-read:");
    console.log("export RUNBOOKOS_SHOPIFY_AUTH_MODE=customer_custom_app");
    console.log("export SHOPIFY_SHOP_DOMAIN=<customer-owned-shop.myshopify.com>");
    console.log("export SHOPIFY_ADMIN_TOKEN=<customer-owned-admin-token>");
    console.log("export SHOPIFY_API_VERSION=2026-04");
    console.log("Required current scopes: read_products, read_themes");
    console.log("Next: pnpm runbook integrations doctor shopify <dir>");
  }
}

function parseShopifySetupMode(value: string): "fixture" | "customer_custom_app" {
  if (value === "fixture") return "fixture";
  if (value === "customer_custom_app" || value === "customer-custom-app" || value === "custom-app") {
    return "customer_custom_app";
  }
  throw new Error("Shopify setup mode must be `fixture` or `customer_custom_app`.");
}

async function setupAhrefsIntegration(options: IntegrationSetupOptions) {
  const mode = parseAhrefsSetupMode(options.mode ?? "fixture");
  const configPath = path.join(options.targetDir, "runbookos.config.json");
  const config = await readJson(configPath);
  const mcpServers = isRecord(config.mcpServers) ? config.mcpServers : {};
  const current = isRecord(mcpServers.ahrefs) ? mcpServers.ahrefs : {};

  mcpServers.ahrefs = {
    ...current,
    enabled: true,
    env: [
      "RUNBOOKOS_AHREFS_AUTH_MODE",
      "AHREFS_API_TOKEN",
      "RUNBOOKOS_AHREFS_FIXTURE",
      "RUNBOOKOS_AHREFS_MAX_ROWS",
      "RUNBOOKOS_AHREFS_DATE",
    ],
  };
  config.mcpServers = mcpServers;

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await generateAdapters(options.targetDir);

  console.log(`Ahrefs integration enabled for ${path.relative(process.cwd(), options.targetDir) || "."}.`);
  console.log(`Mode: ${mode}`);
  console.log("Generated provider adapters with Ahrefs MCP wiring.");
  console.log("Credentials written: no");
  console.log("Writes implemented: no");
  if (mode === "fixture") {
    console.log("Next: pnpm runbook integrations doctor ahrefs <dir>");
    console.log("Fixture mode uses public demo SEO data and consumes no Ahrefs API units.");
  } else {
    console.log("Set these runtime env vars before doctor/live-read:");
    console.log("export RUNBOOKOS_AHREFS_AUTH_MODE=api_token");
    console.log("export AHREFS_API_TOKEN=<customer-owned-ahrefs-api-token>");
    console.log("export RUNBOOKOS_AHREFS_MAX_ROWS=25");
    console.log("Next: pnpm runbook integrations doctor ahrefs <dir>");
    console.log("Live reads can consume paid Ahrefs API units; keep row limits explicit.");
  }
}

function parseAhrefsSetupMode(value: string): "fixture" | "api_token" {
  if (value === "fixture") return "fixture";
  if (value === "api_token" || value === "api-token" || value === "live-read") return "api_token";
  throw new Error("Ahrefs setup mode must be `fixture` or `api_token`.");
}

async function setupGmailIntegration(options: IntegrationSetupOptions) {
  const mode = parseGmailSetupMode(options.mode ?? "oauth");
  const configPath = path.join(options.targetDir, "runbookos.config.json");
  const config = await readJson(configPath);
  const mcpServers = isRecord(config.mcpServers) ? config.mcpServers : {};
  const current = isRecord(mcpServers.gmail) ? mcpServers.gmail : {};

  mcpServers.gmail = {
    ...current,
    enabled: true,
    env: [
      "GMAIL_CLIENT_ID",
      "GMAIL_CLIENT_SECRET",
      "GMAIL_REFRESH_TOKEN",
      "GMAIL_USER_EMAIL",
    ],
  };
  config.mcpServers = mcpServers;

  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await generateAdapters(options.targetDir);

  console.log(`Gmail integration enabled for ${path.relative(process.cwd(), options.targetDir) || "."}.`);
  console.log(`Mode: ${mode}`);
  console.log("Generated provider adapters with Gmail MCP wiring.");
  console.log("Credentials written: no");
  console.log("Sending implemented: no");
  console.log("Set these runtime env vars before doctor/live-read:");
  console.log("export GMAIL_CLIENT_ID=<google-oauth-client-id>");
  console.log("export GMAIL_CLIENT_SECRET=<google-oauth-client-secret>");
  console.log("export GMAIL_REFRESH_TOKEN=<gmail-refresh-token>");
  console.log("export GMAIL_USER_EMAIL=<dedicated-runbookos-mailbox>");
  console.log("Next: pnpm runbook integrations doctor gmail <dir>");
}

function parseGmailSetupMode(value: string): "oauth" {
  if (value === "oauth" || value === "google-oauth") return "oauth";
  throw new Error("Gmail setup mode must be `oauth`.");
}

async function customizeClientDashboard(
  clientDir: string,
  args: { name: string; website: string; platform: string },
) {
  const dashboardPath = path.join(clientDir, "README.md");
  const content = await fs.readFile(dashboardPath, "utf-8");
  const updated = content
    .replace("# <Client Name>", `# ${args.name}`)
    .replace("> One-line client description.", `> Client workspace for ${args.name}.`)
    .replace("Website: example.com", `Website: ${args.website}`)
    .replace("Platform: Shopify/WordPress/Custom", `Platform: ${args.platform}`)
    .replace("_Updated: YYYY-MM-DD_", `_Updated: ${currentDate()}_`)
    .replace("## Current Focus\n\n- ", "## Current Focus\n\n- Confirm client context, active workstreams, credential pointers, and first useful agent task.\n")
    .replace("1. \n2. \n3. ", "1. Fill in brand and credential pointer context.\n2. Choose the first skill-backed task to run.\n3. Update this dashboard after the first useful artifact ships.");
  await fs.writeFile(dashboardPath, updated);
}

async function updateActiveContextForNewClient(
  targetDir: string,
  activeContextFile: string,
  clientRoot: string,
  args: { slug: string; name: string },
) {
  const activeContextPath = path.join(targetDir, activeContextFile);
  const entry = [
    ``,
    `### ${args.name} - \`${path.join(clientRoot, args.slug, "README.md")}\``,
    ``,
    `Status: Created ${currentDate()}. Context needs review.`,
    ``,
    `Next action: Fill in the client dashboard, brand context, credential pointers, and first skill-backed task.`,
    ``,
  ].join("\n");
  await fs.appendFile(activeContextPath, entry);
}

async function doctorShopifyIntegration(targetDir: string) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const server = config.mcpServers.shopify;
  const results: CheckResult[] = [];

  results.push(server?.enabled
    ? pass("config", "shopify integration is enabled")
    : fail("config", "shopify integration is disabled in runbookos.config.json"));

  let providerStatus: ShopifyProviderStatus | undefined;
  try {
    const provider = await createShopifyDataProviderForWorkspace(targetDir);
    providerStatus = await provider.status();
    results.push(pass("auth-mode", providerStatus.mode));
    results.push(providerStatus.credentialsPersistedByRunbookOS
      ? fail("credentials", "RunbookOS should not persist Shopify credentials")
      : pass("credentials", "credentials are runtime/env only"));
    results.push(providerStatus.configured
      ? pass("configured", providerStatus.activeDataSource === "live" ? "live read credentials present" : "fixture data available")
      : fail("configured", `missing env: ${providerStatus.missingEnv.join(", ") || "unknown"}`));
    results.push(providerStatus.safety.readOnly && !providerStatus.safety.writesImplemented
      ? pass("safety", "read-only; writes are not implemented")
      : fail("safety", "unexpected write capability reported"));

    if (providerStatus.configured) {
      const overview = await provider.storeOverview();
      results.push(pass("store_overview", stringValue(readNested(overview, ["store", "name"]), "store overview returned")));
      const productResult = await provider.productSearch({ limit: 5 });
      results.push(productResult.products.length > 0
        ? pass("product_search", `${productResult.products.length} product(s) returned from ${productResult.source}`)
        : warn("product_search", `no products returned from ${productResult.source}`));
      const collectionResult = await provider.collectionSearch({ limit: 5 });
      results.push(pass("collection_search", `${collectionResult.collections.length} collection(s) returned from ${collectionResult.source}`));
      await provider.themeInspect();
      results.push(pass("theme_inspect", "theme metadata read succeeded"));
    }
  } catch (err) {
    results.push(fail("shopify", err instanceof Error ? err.message : String(err)));
  }

  printChecks(results);
  if (providerStatus) {
    console.log(`Mode: ${providerStatus.mode}`);
    console.log(`Data source: ${providerStatus.activeDataSource}`);
    console.log(`Live read available: ${providerStatus.liveReadAvailable ? "yes" : "no"}`);
    console.log(`Required env: ${providerStatus.requiredEnv.length > 0 ? providerStatus.requiredEnv.join(", ") : "-"}`);
    console.log("Writes implemented: no");
    console.log("Credentials persisted by RunbookOS: no");
  }

  if (results.some((result) => result.level === "fail")) {
    process.exitCode = 1;
  }
}

async function doctorAhrefsIntegration(targetDir: string) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const server = config.mcpServers.ahrefs;
  const results: CheckResult[] = [];

  results.push(server?.enabled
    ? pass("config", "ahrefs integration is enabled")
    : fail("config", "ahrefs integration is disabled in runbookos.config.json"));

  let providerStatus: AhrefsProviderStatus | undefined;
  try {
    const provider = await createAhrefsDataProviderForWorkspace(targetDir);
    providerStatus = await provider.status();
    results.push(pass("auth-mode", providerStatus.mode));
    results.push(providerStatus.credentialsPersistedByRunbookOS
      ? fail("credentials", "RunbookOS should not persist Ahrefs credentials")
      : pass("credentials", "credentials are runtime/env only"));
    results.push(providerStatus.configured
      ? pass("configured", providerStatus.activeDataSource === "live" ? "live read credentials present" : "fixture data available")
      : fail("configured", `missing env or fixture: ${providerStatus.missingEnv.join(", ") || "unknown"}`));
    results.push(providerStatus.safety.readOnly && !providerStatus.safety.writesImplemented
      ? pass("safety", providerStatus.activeDataSource === "live" ? `read-only; max rows ${providerStatus.safety.maxLiveRowsPerCall}` : "read-only; fixture consumes no API units")
      : fail("safety", "unexpected write capability reported"));

    if (providerStatus.configured) {
      const overview = await provider.siteOverview({ domain: "demo-commerce.example", country: "gb", client: "_template" });
      results.push(pass("site_overview", `${overview.domain} ${overview.country} returned from ${overview.source}`));
      const keywords = await provider.keywordMatchingTerms({ seed: "desk lamp", country: "gb", limit: 5, client: "_template" });
      results.push(keywords.rows.length > 0
        ? pass("keyword_matching_terms", `${keywords.rows.length} row(s) returned from ${keywords.source}`)
        : warn("keyword_matching_terms", `no rows returned from ${keywords.source}`));
    }
  } catch (err) {
    results.push(fail("ahrefs", err instanceof Error ? err.message : String(err)));
  }

  printChecks(results);
  if (providerStatus) {
    console.log(`Mode: ${providerStatus.mode}`);
    console.log(`Data source: ${providerStatus.activeDataSource}`);
    console.log(`Live read available: ${providerStatus.liveReadAvailable ? "yes" : "no"}`);
    console.log(`Required env: ${providerStatus.requiredEnv.length > 0 ? providerStatus.requiredEnv.join(", ") : "-"}`);
    if (providerStatus.fixturePath) console.log(`Fixture: ${providerStatus.fixturePath}`);
    console.log("Writes implemented: no");
    console.log("Credentials persisted by RunbookOS: no");
  }

  if (results.some((result) => result.level === "fail")) {
    process.exitCode = 1;
  }
}

async function doctorGmailIntegration(targetDir: string) {
  const config = parseRunbookConfig(JSON.parse(await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8")));
  const server = config.mcpServers.gmail;
  const results: CheckResult[] = [];

  results.push(server?.enabled
    ? pass("config", "gmail integration is enabled")
    : fail("config", "gmail integration is disabled in runbookos.config.json"));

  let providerStatus: GmailProviderStatus | undefined;
  try {
    const provider = await createGmailDataProviderForWorkspace(targetDir);
    providerStatus = await provider.status();
    results.push(pass("auth-mode", providerStatus.mode));
    results.push(providerStatus.credentialsPersistedByRunbookOS
      ? fail("credentials", "RunbookOS should not persist Gmail credentials")
      : pass("credentials", "credentials are runtime/env only"));
    results.push(providerStatus.configured
      ? pass("configured", "Gmail OAuth credentials present")
      : fail("configured", `missing env: ${providerStatus.missingEnv.join(", ") || "unknown"}`));
    results.push(providerStatus.safety.metadataOnlyReads && providerStatus.safety.draftCreateImplemented && !providerStatus.safety.sendImplemented
      ? pass("safety", "metadata-only reads; draft creation only; sending is not implemented")
      : fail("safety", "unexpected Gmail capability reported"));

    if (providerStatus.configured) {
      const search = await provider.search({ query: "newer_than:30d", limit: 5 });
      results.push(pass("search", `${search.messages.length} message(s) returned from ${search.source}`));
    }
  } catch (err) {
    results.push(fail("gmail", err instanceof Error ? err.message : String(err)));
  }

  printChecks(results);
  if (providerStatus) {
    console.log(`Mode: ${providerStatus.mode}`);
    console.log(`Data source: ${providerStatus.activeDataSource}`);
    console.log(`Live read available: ${providerStatus.liveReadAvailable ? "yes" : "no"}`);
    console.log(`Draft create available: ${providerStatus.draftCreateAvailable ? "yes" : "no"}`);
    console.log(`Required env: ${providerStatus.requiredEnv.length > 0 ? providerStatus.requiredEnv.join(", ") : "-"}`);
    console.log(`Optional env: ${providerStatus.optionalEnv.length > 0 ? providerStatus.optionalEnv.join(", ") : "-"}`);
    console.log("Sending implemented: no");
    console.log("Credentials persisted by RunbookOS: no");
  }

  if (results.some((result) => result.level === "fail")) {
    process.exitCode = 1;
  }
}

function sortIntegrationId(id: string): string {
  const order = ["workspace", "memory", "shopify", "ahrefs", "gmail"];
  const index = order.indexOf(id);
  return index >= 0 ? `${String(index).padStart(2, "0")}-${id}` : `99-${id}`;
}

function formatIntegrationCommand(id: string, server: ReturnType<typeof parseRunbookConfig>["mcpServers"][string]): string {
  if (server.command) {
    return [server.command, ...(server.args ?? [])].join(" ");
  }
  return `@runbookos/mcp-${id}`;
}

function formatCliPath(targetDir: string): string {
  const relative = path.relative(process.cwd(), targetDir);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : targetDir;
}

interface CheckResult {
  level: "pass" | "warn" | "fail";
  label: string;
  detail: string;
}

interface LoadedSkill {
  id: string;
  title: string;
  version: string;
  triggers: string[];
  modelTier: string;
  instructions: string;
}

function currentDate(): string {
  return process.env.RUNBOOKOS_DATE ?? new Date().toISOString().slice(0, 10);
}

function stringDefault(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "item";
}

function splitCommaList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseClientSlug(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Client slug must include at least one letter or number.");
  return slug;
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function listWorkspaceClientSlugs(targetDir: string, clientRoot: string): Promise<string[]> {
  const clientsDir = safeWorkspaceJoin(targetDir, clientRoot);
  const entries = await fs.readdir(clientsDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== "_template")
    .map((entry) => entry.name)
    .sort();
}

async function isWorkspaceProfileConfigured(userFile: string): Promise<boolean> {
  const content = await fs.readFile(userFile, "utf-8").catch(() => "");
  return /^- Name:\s+\S/m.test(content) && /^- Role:\s+\S/m.test(content) && /^- Company:\s+\S/m.test(content);
}

function suggestWorkspaceSetupNextStep(
  displayDir: string,
  profileConfigured: boolean,
  clientCount: number,
  enabledIntegrations: string[],
  adaptersGenerated: boolean,
): string {
  if (!profileConfigured) {
    return `personalize the workspace with \`pnpm runbook workspace setup ${displayDir} --user "<Your Name>" --role "<Your Role>" --agency "<Agency or Company>" --timezone "<Timezone>"\`.`;
  }
  if (clientCount === 0) {
    return `create the first client with \`pnpm runbook client create <client-slug> ${displayDir} --name "<Client Name>" --website <domain> --platform Shopify\`.`;
  }
  if (!enabledIntegrations.includes("shopify")) {
    return `enable the Shopify fixture integration with \`pnpm runbook integrations setup shopify ${displayDir} --mode fixture\`.`;
  }
  if (!enabledIntegrations.includes("gmail")) {
    return `enable Gmail wiring with \`pnpm runbook integrations setup gmail ${displayDir}\`, then connect it with \`pnpm runbook gmail auth ${displayDir}\`.`;
  }
  if (enabledIntegrations.includes("gmail") && hasMissingGmailRuntimeEnv()) {
    return `connect Gmail with browser auth using \`pnpm runbook gmail auth ${displayDir}\`, then run \`pnpm runbook integrations doctor gmail ${displayDir}\`.`;
  }
  if (!adaptersGenerated) {
    return `regenerate provider adapters with \`pnpm runbook adapters ${displayDir}\`.`;
  }
  return `run \`pnpm runbook doctor ${displayDir}\`, then ask the agent to execute a small task using the relevant skill file.`;
}

function hasMissingGmailRuntimeEnv(): boolean {
  return ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"].some((name) => !process.env[name]);
}

function replaceMarkdownListValue(content: string, label: string, value: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- ${escapedLabel}:.*$`, "m");
  const replacement = `- ${label}: ${value}`;
  if (pattern.test(content)) return content.replace(pattern, replacement);
  return `${content.trimEnd()}\n- ${label}: ${value}\n`;
}

function upsertMarkdownSection(content: string, title: string, body: string): string {
  const heading = `## ${title}`;
  const section = `${heading}\n\n${body.trim()}\n`;
  const pattern = new RegExp(`(^## ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n\\n)[\\s\\S]*?(?=\\n## |$)`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, section);
  }
  return `${content.trimEnd()}\n\n${section}`;
}

function safeWorkspaceJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes workspace root: ${relativePath}`);
  }
  return target;
}

function assertAllowedWorkspaceWrite(targetDir: string, allowedRoots: string[], target: string) {
  const resolvedTarget = path.resolve(target);
  if (allowedRoots.some((root) => {
    const allowedRoot = safeWorkspaceJoin(targetDir, root);
    const relative = path.relative(allowedRoot, resolvedTarget);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  })) return;
  throw new Error(`Write target is outside allowedWriteRoots: ${path.relative(targetDir, resolvedTarget)}`);
}

async function findWorkspaceRoot(startPath: string): Promise<string> {
  let current = path.resolve(startPath);

  while (true) {
    if (await exists(path.join(current, "runbookos.config.json"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`Could not find runbookos.config.json above ${startPath}`);
    }
    current = parent;
  }
}

async function runWorkspaceChecks(
  targetDir: string,
  options: { includePrivateScan?: boolean; strict?: boolean } = {},
): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];

  try {
    const raw = await fs.readFile(path.join(targetDir, "runbookos.config.json"), "utf-8");
    parseRunbookConfig(JSON.parse(raw));
    checks.push(pass("config", "runbookos.config.json is valid"));
  } catch (err) {
    checks.push(fail("config", err instanceof Error ? err.message : String(err)));
  }

  for (const file of ["RUNBOOK.md", "USER.md", "MEMORY.md", "ACTIVE_CONTEXT.md"]) {
    checks.push(await exists(path.join(targetDir, file))
      ? pass(file, "present")
      : fail(file, "missing"));
  }

  for (const file of ["AGENTS.md", "CLAUDE.md", ".codex/config.toml", ".mcp.json"]) {
    checks.push(await exists(path.join(targetDir, file))
      ? pass(file, "adapter generated")
      : warn(file, "missing; run `runbook adapters <dir>`"));
  }

  const skills = await loadSkills(targetDir).catch(() => []);
  checks.push(skills.length > 0
    ? pass("skills", `${skills.length} installed`)
    : fail("skills", "no valid skills found"));

  const skillsets = await loadSkillsets(targetDir).catch(() => []);
  checks.push(skillsets.length > 0
    ? pass("skillsets", `${skillsets.length} installed`)
    : warn("skillsets", "no valid skillsets found"));


  const jsonErrors = await validateJsonFiles(targetDir);
  checks.push(jsonErrors.length === 0
    ? pass("json", "all JSON files parse")
    : fail("json", jsonErrors.join("; ")));

  if (options.includePrivateScan) {
    const hits = await scanForPrivateData(targetDir);
    const level = options.strict ? "fail" : "warn";
    checks.push(hits.length === 0
      ? pass("private-data", "no obvious private tokens or prototype strings found")
      : { level, label: "private-data", detail: hits.slice(0, 8).join("; ") });
  }

  return checks;
}

async function loadSkills(targetDir: string): Promise<LoadedSkill[]> {
  const skillsDir = path.join(targetDir, "skills");
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills: LoadedSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(skillsDir, entry.name);
    const manifest = await readJson(path.join(dir, "skill.json"));
    const instructions = await fs.readFile(path.join(dir, "SKILL.md"), "utf-8");
    if (typeof manifest.id !== "string" || typeof manifest.title !== "string") {
      throw new Error(`Invalid skill manifest: ${entry.name}`);
    }
    skills.push({
      id: manifest.id,
      title: manifest.title,
      version: stringValue(manifest.version, "0.1.0"),
      triggers: arrayOfStrings(manifest.triggers),
      modelTier: stringValue(manifest.modelTier, "balanced"),
      instructions,
    });
  }

  return skills.sort((a, b) => a.id.localeCompare(b.id));
}

async function validateJsonFiles(targetDir: string): Promise<string[]> {
  const files = await collectFiles(targetDir, [".json"]);
  const errors: string[] = [];
  for (const file of files) {
    try {
      JSON.parse(await fs.readFile(file, "utf-8"));
    } catch (err) {
      errors.push(`${path.relative(targetDir, file)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return errors;
}

async function scanForPrivateData(targetDir: string): Promise<string[]> {
  const files = await collectFiles(targetDir, [".json", ".md", ".toml", ".ts", ".js", ".sh", ".env"]);
  return scanFilesForPrivateData(targetDir, files);
}

async function scanFilesForPrivateData(targetDir: string, files: string[]): Promise<string[]> {
  const tokenPatterns = [
    new RegExp(`${["s", "k"].join("")}-[A-Za-z0-9_-]{20,}`),
    new RegExp(`${["g", "h", "p"].join("")}_[A-Za-z0-9_]{20,}`),
    new RegExp(`${["x", "o", "x"].join("")}[baprs]-[A-Za-z0-9-]{20,}`),
    new RegExp(`${["A", "I", "z", "a"].join("")}[A-Za-z0-9_-]{20,}`),
    new RegExp(`${["s", "h", "p"].join("")}(?:at|ss|pa|ua|ca)_[A-Za-z0-9_]{20,}`),
    new RegExp(`[a-z0-9][a-z0-9-]{2,}\\.myshopify\\.com`, "i"),
  ];
  const prototypeTerms = [
    ["grey", "haze"].join(""),
    ["pep", "tide"].join(""),
    ["stone", "and", "sky"].join("-"),
  ];
  const hits: string[] = [];

  for (const file of files) {
    const rel = path.relative(targetDir, file);
    if (rel.startsWith(".git/") || rel.includes("node_modules/") || rel.includes("dist/")) continue;
    if (isLocalSecretFile(rel)) continue;
    const text = await fs.readFile(file, "utf-8").catch(() => "");
    const textWithoutPlaceholders = text.replaceAll(/<[^>\n]*(?:token|domain|myshopify\.com|client-id|client-secret|refresh-token|api-key)[^>\n]*>/gi, "");
    if (tokenPatterns.some((pattern) => pattern.test(textWithoutPlaceholders))) {
      hits.push(`${rel}: possible secret token`);
    }
    const lower = text.toLowerCase();
    for (const term of prototypeTerms) {
      if (lower.includes(term)) {
        hits.push(`${rel}: prototype/private term "${term}"`);
      }
    }
  }

  return hits;
}

function isLocalSecretFile(relPath: string): boolean {
  return relPath === ".env"
    || relPath.startsWith(".env.")
    || relPath.startsWith(".runbookos/local.")
    || relPath === ".claude/settings.local.json"
    || relPath === ".codex/local.toml";
}

async function collectReleaseScanFiles(dir: string): Promise<string[]> {
  const files = await collectFiles(dir, [".json", ".md", ".toml", ".ts", ".js", ".sh", ".env"]);
  return files.filter((file) => {
    const rel = path.relative(dir, file);
    return !rel.startsWith("workspaces/")
      && !rel.startsWith(".git/")
      && !rel.includes("node_modules/")
      && !rel.includes("dist/");
  });
}

async function collectFiles(dir: string, extensions: string[]): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath, extensions));
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readJson(file: string): Promise<JsonRecord> {
  return JSON.parse(await fs.readFile(file, "utf-8")) as JsonRecord;
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function fileIncludes(file: string, expected: string): Promise<boolean> {
  const content = await fs.readFile(file, "utf-8").catch(() => "");
  return content.includes(expected);
}

function gitOutput(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  if (result.status !== 0) return "";
  return (result.stdout ?? "").trim();
}

function commandOutput(command: string, args: string[]): { status: number | null; output: string } {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function upsertLocalEnvTemplate(file: string, envNames: string[]): Promise<string> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const existing = await fs.readFile(file, "utf-8").catch(() => "");
  const existingNames = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)=/)?.[1])
      .filter((name): name is string => Boolean(name)),
  );
  const missingNames = uniqueStrings(envNames).filter((name) => !existingNames.has(name));
  if (!existing && missingNames.length === 0) {
    await fs.writeFile(file, "# RunbookOS local credentials\n# This file is ignored by the workspace .gitignore.\n");
    return file;
  }
  if (missingNames.length === 0) return file;
  const prefix = existing.trimEnd()
    ? `${existing.trimEnd()}\n\n`
    : "# RunbookOS local credentials\n# This file is ignored by the workspace .gitignore.\n# Fill values locally; do not commit secrets.\n\n";
  const appended = missingNames.map((name) => `${name}=`).join("\n");
  await fs.writeFile(file, `${prefix}${appended}\n`);
  return file;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNested(value: unknown, keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function pass(label: string, detail: string): CheckResult {
  return { level: "pass", label, detail };
}

function warn(label: string, detail: string): CheckResult {
  return { level: "warn", label, detail };
}

function fail(label: string, detail: string): CheckResult {
  return { level: "fail", label, detail };
}

function printChecks(checks: CheckResult[]) {
  for (const check of checks) {
    const marker = check.level === "pass" ? "PASS" : check.level === "warn" ? "WARN" : "FAIL";
    console.log(`${marker}\t${check.label}\t${check.detail}`);
  }
}

async function copyDir(src: string, dest: string) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, destPath);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
