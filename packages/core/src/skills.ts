import type { RunbookSkill } from "./types.js";

export function matchSkill(message: string, skills: RunbookSkill[]): RunbookSkill | null {
  const lower = message.toLowerCase();
  return skills.find((skill) =>
    skill.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))
  ) ?? null;
}

export function formatSkillHeader(skill: RunbookSkill): string {
  return [
    `# Skill: ${skill.title}`,
    ``,
    skill.description,
    ``,
    `## Safety`,
    ...skill.safety.map((item) => `- ${item}`),
  ].join("\n");
}
