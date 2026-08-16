import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const output = runCapture(["runbook", "release", "check", "--allow-dirty"]);

assertTextIncludes(output, "RunbookOS Release Check");
assertTextIncludes(output, "PASS\tgit:branch");
assertTextIncludes(output, "PASS\tgit:workspaces\tno tracked files under workspaces/");
assertTextIncludes(output, "PASS\tgitignore:workspaces");
assertTextIncludes(output, "PASS\tgitignore:env");
assertTextIncludes(output, "PASS\tjson\tall repository JSON files parse");
assertTextIncludes(output, "PASS\tprivate-data\tno obvious tokens or prototype terms in public files");
assertTextIncludes(output, "PASS\tscript:verify:smoke\tpresent");
assertTextIncludes(output, "PASS\tscript:verify:install\tpresent");
assertTextIncludes(output, "PASS\tscript:verify:gmail\tpresent");
assertTextIncludes(output, "PASS\tscript:verify:mcp\tpresent");
assertTextIncludes(output, "PASS\tscript:verify:shopify\tpresent");
assertTextIncludes(output, "PASS\treadme:pnpm runbook install check\tpresent");
assertTextIncludes(output, "PASS\treadme:pnpm runbook init ./my-workspace\tpresent");
assertTextIncludes(output, "PASS\treadme:pnpm runbook setup wizard ./my-workspace\tpresent");
assertTextIncludes(output, "PASS\treadme:pnpm runbook smoke ./my-workspace\tpresent");
assertTextIncludes(output, "Private workspaces scanned: no");

console.log("release check smoke passed");

function runCapture(args) {
  const result = spawnSync(pnpm, args, {
    cwd: repoRoot,
    env: process.env,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: pnpm ${args.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }

  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertTextIncludes(content, expected) {
  if (!content.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}
