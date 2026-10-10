import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Safety rule 3: helpline numbers come ONLY from data/helplines.json, and entries
// without a source URL are hidden.
export interface Helpline {
  number: string;
  purpose: string;
  coverage: string;
  sourceUrl: string;
  dateVerified: string;
  ambulance?: boolean;
}

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "helplines.json");

function load(): Helpline[] {
  const raw = JSON.parse(readFileSync(file, "utf8")) as { helplines: Helpline[] };
  return raw.helplines.filter((h) => typeof h.sourceUrl === "string" && h.sourceUrl.trim() !== "");
}

const sameState = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// National entries plus the entries for this state (if the phone knows its state).
export function helplinesFor(state?: string | null): Helpline[] {
  return load().filter((h) => sameState(h.coverage, "National") || (state ? sameState(h.coverage, state) : false));
}

// Medical fast-dial: the state's ambulance number from the JSON, otherwise 112.
export function ambulanceNumber(state?: string | null): string {
  const local = state ? load().find((h) => h.ambulance && sameState(h.coverage, state)) : undefined;
  return local?.number ?? "112";
}

// Every number in the file, for checking that AI text never contains an invented number.
export function allHelplineNumbers(): string[] {
  return load().map((h) => h.number);
}
