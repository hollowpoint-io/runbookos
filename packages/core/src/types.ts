export type ProviderId = "claude" | "codex" | "openai" | "anthropic" | string;

export type ModelTier = "deep" | "balanced" | "fast";

export interface AgentRunOptions {
  provider?: ProviderId;
  modelTier?: ModelTier;
  model?: string;
  systemPrompt?: string;
  cwd?: string;
  maxTurns?: number;
  allowedTools?: string[];
  metadata?: Record<string, unknown>;
}

export interface ToolCallSummary {
  name: string;
  server?: string;
}

export interface AgentRunResult {
  response: string;
  tokensIn: number;
  tokensOut: number;
  turns: number;
  toolCalls: ToolCallSummary[];
  raw?: unknown;
}

export interface AgentProvider {
  id: ProviderId;
  displayName: string;
  run(prompt: string, options: AgentRunOptions): Promise<AgentRunResult>;
}

export interface WorkspacePaths {
  root: string;
  clientRoot: string;
  memoryDir: string;
  outboxDir: string;
}

export interface RunbookSkill {
  id: string;
  title: string;
  description: string;
  triggers: string[];
  inputs: SkillInput[];
  safety: string[];
}

export interface SkillInput {
  name: string;
  required: boolean;
  description: string;
}
