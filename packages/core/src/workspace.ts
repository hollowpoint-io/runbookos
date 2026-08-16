import path from "node:path";
import type { WorkspacePaths } from "./types.js";

export function resolveWorkspacePaths(root: string): WorkspacePaths {
  return {
    root,
    clientRoot: path.join(root, "workspace", "clients"),
    memoryDir: path.join(root, "memory"),
    outboxDir: path.join(root, "outbox"),
  };
}

export function clientSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
