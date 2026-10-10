import { useEffect, useState } from "react";
import { api, type Briefing } from "./api";
import { snapshot } from "./geo";

// Artemis briefing (Cline agent on the server, plain-code fallback there too).
// Cached on the phone for 10 minutes per destination/timer so screens can call it freely.
const cache = new Map<string, { at: number; value: Briefing }>();

export async function getBriefing(destination?: string, timerMinutes?: number): Promise<Briefing | null> {
  const key = `${destination ?? ""}|${timerMinutes ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;
  try {
    const { lat, lng } = await snapshot();
    const value = await api.briefing({ lat, lng, destination: destination || undefined, timerMinutes });
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

/** Debounced so typing a destination doesn't fire a request per keystroke. */
export function useBriefing(destination?: string, timerMinutes?: number, enabled = true) {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      void getBriefing(destination?.trim(), timerMinutes).then((b) => {
        if (!alive) return;
        setBriefing(b);
        setLoading(false);
      });
    }, 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [destination, timerMinutes, enabled]);
  return { briefing, loading };
}
