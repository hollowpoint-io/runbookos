export function matchSkill(message, skills) {
    const lower = message.toLowerCase();
    return skills.find((skill) => skill.triggers.some((trigger) => lower.includes(trigger.toLowerCase()))) ?? null;
}
export function formatSkillHeader(skill) {
    return [
        `# Skill: ${skill.title}`,
        ``,
        skill.description,
        ``,
        `## Safety`,
        ...skill.safety.map((item) => `- ${item}`),
    ].join("\n");
}
//# sourceMappingURL=skills.js.map