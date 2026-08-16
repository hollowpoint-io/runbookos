import path from "node:path";
export function resolveWorkspacePaths(root) {
    return {
        root,
        clientRoot: path.join(root, "workspace", "clients"),
        memoryDir: path.join(root, "memory"),
        outboxDir: path.join(root, "outbox"),
    };
}
export function clientSlug(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
//# sourceMappingURL=workspace.js.map