// Safety rule 3: the agent may never invent phone numbers. Any phone-like number in an
// AI-written message must come from data/helplines.json or a Google Places result.

const digitsOf = (s: string) => s.replace(/\D/g, "");

// Strip things that contain digits but are not phone numbers: links, times, percentages, decimals.
function withoutHarmlessNumbers(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b\d{1,2}[:.]\d{2}\s?(am|pm)?\b/gi, " ")
    .replace(/\b\d{1,3}\s?%/g, " ")
    .replace(/\b\d+\.\d+\b/g, " ");
}

// A known number matches if the digits are equal, or equal after dropping +91 / leading 0.
function matches(found: string, allowed: string): boolean {
  const strip = (d: string) => d.replace(/^91(?=\d{10}$)/, "").replace(/^0+/, "");
  return found === allowed || strip(found) === strip(allowed);
}

/** Returns the phone-like numbers in `text` that are not in `allowed` (empty = safe). */
export function unknownNumbers(text: string, allowed: Iterable<string>): string[] {
  const allowedDigits = [...allowed].map(digitsOf).filter(Boolean);
  const candidates = withoutHarmlessNumbers(text).match(/\+?\d[\d\s\-()]{1,}\d/g) ?? [];
  return candidates
    .map((c) => c.trim())
    .filter((c) => digitsOf(c).length >= 3)
    .filter((c) => !allowedDigits.some((a) => matches(digitsOf(c), a)));
}
