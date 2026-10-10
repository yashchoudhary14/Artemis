// Fixed campus areas so "same start and destination" matching is exact.
// Edit this list to match the campus used in the demo.
export const CAMPUS_AREAS = [
  "Main Gate",
  "Library",
  "Academic Complex",
  "Cafeteria",
  "Hostel Zone",
  "Market Complex",
  "Hospital",
  "Sports Complex",
  "Guest House",
  "Lakeside",
] as const;

export const isArea = (a: string) => (CAMPUS_AREAS as readonly string[]).includes(a);
