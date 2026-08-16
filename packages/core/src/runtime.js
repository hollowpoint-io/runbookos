export class AgentRuntime {
    defaultProvider;
    modelMap;
    providers = new Map();
    constructor(defaultProvider, modelMap) {
        this.defaultProvider = defaultProvider;
        this.modelMap = modelMap;
    }
    register(provider) {
        this.providers.set(provider.id, provider);
        return this;
    }
    async run(prompt, options = {}) {
        const providerId = options.provider ?? this.defaultProvider;
        const provider = this.providers.get(providerId);
        if (!provider)
            throw new Error(`Provider not registered: ${providerId}`);
        const modelTier = options.modelTier ?? "balanced";
        const model = options.model ?? this.resolveModel(providerId, modelTier);
        return provider.run(prompt, { ...options, provider: providerId, modelTier, model });
    }
    resolveModel(providerId, tier) {
        return this.modelMap[tier]?.[providerId];
    }
    listProviders() {
        return [...this.providers.values()];
    }
}
//# sourceMappingURL=runtime.js.map