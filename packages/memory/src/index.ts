export interface DailyLogInput {
  date: string;
  workedOn: string[];
  decisions?: string[];
  clientUpdates?: string[];
  openThreads?: string[];
  notes?: string[];
}

export function renderDailyLog(input: DailyLogInput): string {
  return [
    `# Session Log - ${input.date}`,
    ``,
    `## What Was Worked On`,
    ...(input.workedOn.length ? input.workedOn : ["No material work recorded."]).map((item) => `- ${item}`),
    ``,
    `## Key Decisions`,
    ...(input.decisions?.length ? input.decisions : ["None."]).map((item) => `- ${item}`),
    ``,
    `## Client Updates`,
    ...(input.clientUpdates?.length ? input.clientUpdates : ["None."]).map((item) => `- ${item}`),
    ``,
    `## Open Threads`,
    ...(input.openThreads?.length ? input.openThreads : ["None."]).map((item) => `- ${item}`),
    ``,
    `## Notes`,
    ...(input.notes?.length ? input.notes : ["None."]).map((item) => `- ${item}`),
    ``,
  ].join("\n");
}
