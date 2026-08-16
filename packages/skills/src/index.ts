export interface SkillManifest {
  id: string;
  title: string;
  version: string;
  triggers: string[];
  modelTier: "deep" | "balanced" | "fast";
  requiredTools: string[];
  writesTo: string[];
}

export interface LoadedSkill {
  manifest: SkillManifest;
  instructions: string;
}

export interface SkillsetManifest {
  id: string;
  title: string;
  version: string;
  description: string;
  skills: string[];
  requiredTools: string[];
}

export function validateSkillManifest(input: unknown): SkillManifest {
  const value = input as Partial<SkillManifest>;
  if (!value.id || !value.title || !value.version || !Array.isArray(value.triggers)) {
    throw new Error("Invalid skill manifest");
  }
  return {
    id: value.id,
    title: value.title,
    version: value.version,
    triggers: value.triggers,
    modelTier: value.modelTier ?? "balanced",
    requiredTools: value.requiredTools ?? [],
    writesTo: value.writesTo ?? [],
  };
}

export function validateSkillsetManifest(input: unknown): SkillsetManifest {
  const value = input as Partial<SkillsetManifest>;
  if (!value.id || !value.title || !value.version || !Array.isArray(value.skills)) {
    throw new Error("Invalid skillset manifest");
  }
  return {
    id: value.id,
    title: value.title,
    version: value.version,
    description: value.description ?? "",
    skills: value.skills,
    requiredTools: value.requiredTools ?? [],
  };
}

export function matchLoadedSkill(message: string, skills: LoadedSkill[]): LoadedSkill | null {
  const lower = message.toLowerCase();
  return skills.find((skill) =>
    skill.manifest.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))
  ) ?? null;
}
