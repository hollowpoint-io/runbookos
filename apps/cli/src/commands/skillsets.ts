import fs from "node:fs/promises";
import path from "node:path";
import { validateSkillsetManifest, type SkillsetManifest } from "@runbookos/skills";

type JsonRecord = Record<string, unknown>;

export interface LoadedSkillset {
  id: string;
  title: string;
  version: string;
  description: string;
  skills: string[];
  requiredTools: string[];
  path: string;
}

export async function listSkillsetsCli(targetDir: string) {
  const skillsets = await loadSkillsets(targetDir);
  if (skillsets.length === 0) {
    console.log("No skillsets found.");
    return;
  }

  console.log(["id", "skills", "tools", "version", "title"].join("\t"));
  for (const skillset of skillsets) {
    console.log([
      skillset.id,
      String(skillset.skills.length),
      skillset.requiredTools.length > 0 ? skillset.requiredTools.join(",") : "-",
      skillset.version,
      skillset.title,
    ].join("\t"));
  }
}

export async function loadSkillsets(targetDir: string): Promise<LoadedSkillset[]> {
  const skillsetsDir = path.join(targetDir, "skillsets");
  const entries = await fs.readdir(skillsetsDir, { withFileTypes: true }).catch(() => []);
  const skillsets: LoadedSkillset[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(skillsetsDir, entry.name);
    const manifest = validateSkillsetManifest(await readJson(path.join(dir, "skillset.json")));
    skillsets.push(toLoadedSkillset(manifest, path.relative(targetDir, dir)));
  }

  return skillsets.sort((left, right) => left.id.localeCompare(right.id));
}

function toLoadedSkillset(manifest: SkillsetManifest, manifestPath: string): LoadedSkillset {
  return {
    id: manifest.id,
    title: manifest.title,
    version: manifest.version,
    description: manifest.description,
    skills: manifest.skills,
    requiredTools: manifest.requiredTools,
    path: manifestPath,
  };
}

async function readJson(file: string): Promise<JsonRecord> {
  return JSON.parse(await fs.readFile(file, "utf-8")) as JsonRecord;
}
