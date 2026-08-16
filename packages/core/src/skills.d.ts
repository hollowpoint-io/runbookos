import type { RunbookSkill } from "./types.js";
export declare function matchSkill(message: string, skills: RunbookSkill[]): RunbookSkill | null;
export declare function formatSkillHeader(skill: RunbookSkill): string;
