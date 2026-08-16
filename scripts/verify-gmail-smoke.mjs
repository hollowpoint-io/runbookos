import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "runbookos-gmail-smoke-"));
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  run(["runbook", "init", workspaceDir]);

  const setup = runCapture(["runbook", "integrations", "setup", "gmail", workspaceDir], scrubbedEnv());
  assertTextIncludes(setup, "Gmail integration enabled");
  assertTextIncludes(setup, "Mode: oauth");
  assertTextIncludes(setup, "Generated provider adapters with Gmail MCP wiring.");
  assertTextIncludes(setup, "Credentials written: no");
  assertTextIncludes(setup, "Sending implemented: no");

  const mcp = JSON.parse(fs.readFileSync(path.join(workspaceDir, ".mcp.json"), "utf-8"));
  const gmailServer = mcp.mcpServers.gmail;
  if (!gmailServer) throw new Error("Generated .mcp.json did not include gmail server");
  if (gmailServer.command !== "node") {
    throw new Error(`Expected local gmail command to use node, got ${gmailServer.command}`);
  }
  assertTextIncludes(gmailServer.args.join(" "), "packages/mcp-gmail/dist/index.js");

  const client = new Client({ name: "runbookos-gmail-smoke", version: "0.1.0" });
  const transport = new StdioClientTransport({
    command: gmailServer.command,
    args: gmailServer.args,
    stderr: "pipe",
    env: scrubbedEnv(),
  });

  await client.connect(transport);
  try {
    const resources = await client.listResources();
    assertResource(resources, "runbook://gmail/status");

    const status = await client.readResource({ uri: "runbook://gmail/status" });
    assertTextIncludes(status.contents[0]?.text, "\"mode\": \"oauth\"");
    assertTextIncludes(status.contents[0]?.text, "\"configured\": false");
    assertTextIncludes(status.contents[0]?.text, "\"draftCreateImplemented\": true");
    assertTextIncludes(status.contents[0]?.text, "\"sendImplemented\": false");
    assertTextIncludes(status.contents[0]?.text, "\"credentialsPersistedByRunbookOS\": false");

    const search = await client.callTool({
      name: "gmail.search",
      arguments: { query: "newer_than:7d", limit: 5 },
    });
    if (!search.isError) throw new Error("gmail.search should require Gmail OAuth env");
    assertTextIncludes(search.content[0]?.text, "Missing required Gmail env");

    const draft = await client.callTool({
      name: "gmail.draft_create",
      arguments: {
        to: ["operator@example.com"],
        subject: "RunbookOS smoke draft",
        bodyText: "This draft should not be created without OAuth env.",
      },
    });
    if (!draft.isError) throw new Error("gmail.draft_create should require Gmail OAuth env");
    assertTextIncludes(draft.content[0]?.text, "Missing required Gmail env");
  } finally {
    await client.close();
  }

  const doctor = runCaptureExpectFailure(["runbook", "integrations", "doctor", "gmail", workspaceDir], scrubbedEnv());
  assertTextIncludes(doctor, "PASS\tconfig\tgmail integration is enabled");
  assertTextIncludes(doctor, "PASS\tauth-mode\toauth");
  assertTextIncludes(doctor, "PASS\tcredentials\tcredentials are runtime/env only");
  assertTextIncludes(doctor, "FAIL\tconfigured\tmissing env: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN");
  assertTextIncludes(doctor, "PASS\tsafety\tmetadata-only reads; draft creation only; sending is not implemented");

  const auth = runCapture([
    "runbook",
    "gmail",
    "auth",
    workspaceDir,
    "--client-id",
    "runbookos-smoke-client.apps.googleusercontent.com",
    "--print-url-only",
    "--port",
    "53682",
  ], scrubbedEnv());
  assertTextIncludes(auth, "Open this URL to authorize Gmail:");
  assertTextIncludes(auth, "https://accounts.google.com/o/oauth2/v2/auth");
  assertTextIncludes(auth, "redirect_uri=http%3A%2F%2F127.0.0.1%3A53682%2Foauth2callback");
  assertTextIncludes(auth, "gmail.readonly");
  assertTextIncludes(auth, "gmail.compose");
  assertTextIncludes(auth, "Credentials written: no");


  run(["runbook", "verify", workspaceDir]);
  console.log(`gmail smoke passed: ${workspaceDir}`);
} finally {
  if (!process.env.RUNBOOKOS_KEEP_SMOKE) {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }
}

function run(args, env = process.env) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}`);
  }
}

function runCapture(args, env = process.env) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout;
}

function runCaptureExpectFailure(args, env = process.env) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env,
    encoding: "utf-8",
  });

  if (result.status === 0) {
    throw new Error(`Expected command to fail: pnpm ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  }

  return `${result.stdout}\n${result.stderr}`;
}

function scrubbedEnv() {
  const env = { ...process.env };
  for (const name of ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_USER_EMAIL"]) {
    delete env[name];
  }
  return env;
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
