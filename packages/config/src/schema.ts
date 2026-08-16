import { z } from "zod";

export const modelMapSchema = z.object({
  claude: z.string().optional(),
  codex: z.string().optional(),
}).catchall(z.string());

export const runbookConfigSchema = z.object({
  name: z.string(),
  defaultProvider: z.string().default("codex"),
  modelTiers: z.object({
    deep: modelMapSchema,
    balanced: modelMapSchema,
    fast: modelMapSchema,
  }),
  memory: z.object({
    activeContextFile: z.string().default("ACTIVE_CONTEXT.md"),
    longTermFile: z.string().default("MEMORY.md"),
    dailyLogDir: z.string().default("memory"),
  }),
  workspace: z.object({
    clientRoot: z.string().default("workspace/clients"),
    allowedWriteRoots: z.array(z.string()).default(["workspace", "memory", "outbox"]),
  }),
  skills: z.array(z.string()).default([]),
  mcpServers: z.record(z.string(), z.object({
    enabled: z.boolean().default(false),
    env: z.array(z.string()).default([]),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
  })).default({}),
});

export type RunbookConfig = z.infer<typeof runbookConfigSchema>;

export function parseRunbookConfig(input: unknown): RunbookConfig {
  return runbookConfigSchema.parse(input);
}
