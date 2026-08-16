import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import {
  buildGmailOAuthUrl,
  exchangeGmailAuthorizationCode,
  gmailOAuthScopes,
} from "@runbookos/mcp-gmail";

export interface GmailAuthOptions {
  targetDir: string;
  clientId?: string;
  clientSecret?: string;
  email?: string;
  port: number;
  printUrlOnly: boolean;
}


export function parseGmailAuthArgs(args: string[], fallbackTargetDir: string): GmailAuthOptions {
  const positional: string[] = [];
  let clientId: string | undefined;
  let clientSecret: string | undefined;
  let email: string | undefined;
  let port = 0;
  let printUrlOnly = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--client-id") {
      clientId = args[++index];
    } else if (arg.startsWith("--client-id=")) {
      clientId = arg.slice("--client-id=".length);
    } else if (arg === "--client-secret") {
      clientSecret = args[++index];
    } else if (arg.startsWith("--client-secret=")) {
      clientSecret = arg.slice("--client-secret=".length);
    } else if (arg === "--email") {
      email = args[++index];
    } else if (arg.startsWith("--email=")) {
      email = arg.slice("--email=".length);
    } else if (arg === "--port") {
      port = parsePort(args[++index]);
    } else if (arg.startsWith("--port=")) {
      port = parsePort(arg.slice("--port=".length));
    } else if (arg === "--print-url-only") {
      printUrlOnly = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown gmail auth option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  return {
    targetDir: path.resolve(positional[0] ?? fallbackTargetDir),
    clientId,
    clientSecret,
    email,
    port,
    printUrlOnly,
  };
}

export async function runGmailAuth(options: GmailAuthOptions) {
  await fs.access(path.join(options.targetDir, "runbookos.config.json"));
  const clientId = options.clientId ?? process.env.GMAIL_CLIENT_ID;
  const clientSecret = options.clientSecret ?? process.env.GMAIL_CLIENT_SECRET;
  if (!clientId) throw new Error("Missing Gmail OAuth client id. Pass --client-id or set GMAIL_CLIENT_ID.");
  if (!options.printUrlOnly && !clientSecret) {
    throw new Error("Missing Gmail OAuth client secret. Pass --client-secret or set GMAIL_CLIENT_SECRET.");
  }

  const state = randomBytes(16).toString("hex");
  const callback = options.printUrlOnly
    ? undefined
    : await createGmailCallbackListener(options.port);
  const redirectUri = callback?.redirectUri ?? `http://127.0.0.1:${options.port || 53682}/oauth2callback`;
  const authUrl = buildGmailOAuthUrl({
    clientId,
    redirectUri,
    state,
    scopes: gmailOAuthScopes,
  });

  console.log("Open this URL to authorize Gmail:");
  console.log(authUrl);
  console.log("");
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Scopes: ${gmailOAuthScopes.join(", ")}`);
  console.log("Credentials written: no");
  console.log("Tokens printed only after Google returns an authorization code.");

  if (options.printUrlOnly) return;

  if (!callback) throw new Error("Gmail OAuth callback listener was not started.");
  try {
    const code = await callback.waitForCode(state);
    const token = await exchangeGmailAuthorizationCode({
      clientId,
      clientSecret: clientSecret ?? "",
      redirectUri,
      code,
    });
    if (!token.refreshToken) {
      throw new Error("Google did not return a refresh token. Re-run with a fresh consent grant or remove prior app consent, then try again.");
    }
    console.log("");
    console.log("Gmail OAuth complete. Add these to your private shell or secret manager:");
    console.log(`export GMAIL_CLIENT_ID=${shellQuote(clientId)}`);
    console.log(`export GMAIL_CLIENT_SECRET=${shellQuote(clientSecret ?? "")}`);
    console.log(`export GMAIL_REFRESH_TOKEN=${shellQuote(token.refreshToken)}`);
    if (options.email) console.log(`export GMAIL_USER_EMAIL=${shellQuote(options.email)}`);
    console.log("");
    console.log("Do not commit these values. RunbookOS has not written them to the workspace.");
    console.log(`Next: pnpm runbook integrations doctor gmail ${formatCliPath(options.targetDir)}`);
  } finally {
    await callback.close();
  }
}

async function createGmailCallbackListener(port: number): Promise<{
  redirectUri: string;
  waitForCode(expectedState: string): Promise<string>;
  close(): Promise<void>;
}> {
  let resolveCode: ((value: { state: string; code: string }) => void) | undefined;
  let rejectCode: ((err: Error) => void) | undefined;

  const codePromise = new Promise<{ state: string; code: string }>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createServer((request, response) => {
    const address = server.address();
    const activePort = typeof address === "object" && address ? address.port : port;
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${activePort}`);
    if (requestUrl.pathname !== "/oauth2callback") {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }

    const error = requestUrl.searchParams.get("error");
    if (error) {
      response.writeHead(400, { "Content-Type": "text/html" });
      response.end("<h1>RunbookOS Gmail auth failed</h1><p>You can close this tab and return to the terminal.</p>");
      rejectCode?.(new Error(`Google returned OAuth error: ${error}`));
      return;
    }

    const code = requestUrl.searchParams.get("code");
    const state = requestUrl.searchParams.get("state");
    if (!code || !state) {
      response.writeHead(400, { "Content-Type": "text/html" });
      response.end("<h1>RunbookOS Gmail auth failed</h1><p>Missing code or state.</p>");
      rejectCode?.(new Error("Google OAuth callback was missing code or state."));
      return;
    }

    response.writeHead(200, { "Content-Type": "text/html" });
    response.end("<h1>RunbookOS Gmail auth complete</h1><p>You can close this tab and return to the terminal.</p>");
    resolveCode?.({ state, code });
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;
  return {
    redirectUri: `http://127.0.0.1:${activePort}/oauth2callback`,
    async waitForCode(expectedState: string) {
      const value = await codePromise;
      if (value.state !== expectedState) throw new Error("Google OAuth callback state did not match.");
      return value.code;
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}


function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? "", 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("Port must be an integer from 0 to 65535.");
  }
  return port;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}


function formatCliPath(targetDir: string): string {
  const relative = path.relative(process.cwd(), targetDir);
  if (!relative) return ".";
  if (relative.startsWith("..") || path.isAbsolute(relative)) return targetDir;
  return relative;
}
