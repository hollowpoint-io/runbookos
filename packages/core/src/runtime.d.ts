import type { AgentProvider, AgentRunOptions, AgentRunResult, ModelTier, ProviderId } from "./types.js";
export interface ProviderModelMap {
    deep: Record<string, string | undefined>;
    balanced: Record<string, string | undefined>;
    fast: Record<string, string | undefined>;
}
export declare class AgentRuntime {
    private readonly defaultProvider;
    private readonly modelMap;
    private readonly providers;
    constructor(defaultProvider: ProviderId, modelMap: ProviderModelMap);
    register(provider: AgentProvider): this;
    run(prompt: string, options?: AgentRunOptions): Promise<AgentRunResult>;
    resolveModel(providerId: ProviderId, tier: ModelTier): string | undefined;
    listProviders(): AgentProvider[];
}
