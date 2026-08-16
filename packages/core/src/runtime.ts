import type { AgentProvider, AgentRunOptions, AgentRunResult, ModelTier, ProviderId } from "./types.js";

export interface ProviderModelMap {
  deep: Record<string, string | undefined>;
  balanced: Record<string, string | undefined>;
  fast: Record<string, string | undefined>;
}

export class AgentRuntime {
  private readonly providers = new Map<ProviderId, AgentProvider>();

  constructor(
    private readonly defaultProvider: ProviderId,
    private readonly modelMap: ProviderModelMap
  ) {}

  register(provider: AgentProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  async run(prompt: string, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const providerId = options.provider ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider not registered: ${providerId}`);

    const modelTier = options.modelTier ?? "balanced";
    const model = options.model ?? this.resolveModel(providerId, modelTier);
    return provider.run(prompt, { ...options, provider: providerId, modelTier, model });
  }

  resolveModel(providerId: ProviderId, tier: ModelTier): string | undefined {
    return this.modelMap[tier]?.[providerId];
  }

  listProviders(): AgentProvider[] {
    return [...this.providers.values()];
  }
}
