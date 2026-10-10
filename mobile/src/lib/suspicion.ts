import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { startPanic } from "./panic";
import { loadJson, saveJson } from "./storage";
import { createStore } from "./store";
import { insideZoneStore } from "./zones";

// "I feel uneasy" mode: on-device keyword listening. Runs only BEFORE a trigger; on a keyword
// it stops completely so the audio recorder can take the microphone (no mic conflict).

export type Lang = "hi-IN" | "en-IN";

export interface SuspicionState {
  listening: boolean;
  paused: "safe-zone" | null;
  lang: Lang;
  customWord: string;
  lastHeard: string;
  error: string | null;
}

const SETTINGS_KEY = "sw.suspicion";
export const suspicionStore = createStore<SuspicionState>({
  listening: false,
  paused: null,
  lang: "hi-IN",
  customWord: "",
  lastHeard: "",
  error: null,
});

// Defaults "help" and "bachao", in both scripts, plus common recogniser spellings.
const BASE_WORDS = ["help", "bachao", "bachaao", "bachau", "bachav", "हेल्प", "बचाओ", "बचाव", "बचाओ बचाओ"];

export function keywordList(): string[] {
  const custom = suspicionStore.get().customWord.trim().toLowerCase();
  return custom ? [...BASE_WORDS, custom] : BASE_WORDS;
}

export function findKeyword(text: string): string | null {
  const t = ` ${text.toLowerCase().replace(/[.,!?।]/g, " ")} `;
  for (const w of keywordList()) {
    if (t.includes(` ${w} `) || (w.length > 4 && t.includes(w))) return w;
  }
  return null;
}

export async function loadSuspicionSettings() {
  const s = await loadJson<{ lang?: Lang; customWord?: string }>(SETTINGS_KEY, {});
  suspicionStore.set((p) => ({ ...p, lang: s.lang ?? p.lang, customWord: s.customWord ?? p.customWord }));
}

export async function saveSuspicionSettings(patch: { lang?: Lang; customWord?: string }) {
  suspicionStore.set((p) => ({ ...p, ...patch }));
  const { lang, customWord } = suspicionStore.get();
  await saveJson(SETTINGS_KEY, { lang, customWord });
}

const snippets: string[] = [];
let wanted = false;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAdded = false;

function remember(text: string) {
  if (!text || snippets[snippets.length - 1] === text) return;
  snippets.push(text);
  if (snippets.length > 8) snippets.shift();
}

function addListeners() {
  if (listenersAdded) return;
  listenersAdded = true;
  ExpoSpeechRecognitionModule.addListener("result", (e) => {
    const texts = e.results.map((r) => r.transcript).filter(Boolean);
    const best = texts[0] ?? "";
    suspicionStore.set((s) => ({ ...s, lastHeard: best }));
    for (const t of texts) {
      const hit = findKeyword(t);
      if (hit && wanted) {
        remember(best);
        trigger(hit);
        return;
      }
    }
    if (e.isFinal) remember(best);
  });
  ExpoSpeechRecognitionModule.addListener("end", () => scheduleRestart(250));
  ExpoSpeechRecognitionModule.addListener("error", (e) => {
    if (e.error === "not-allowed") {
      wanted = false;
      suspicionStore.set((s) => ({ ...s, listening: false, error: "Microphone or speech permission was refused." }));
      return;
    }
    scheduleRestart(e.error === "no-speech" ? 200 : 1500);
  });
  // Safety rule 6: no keyword listening inside a safe zone.
  insideZoneStore.subscribe(() => {
    if (!wanted) return;
    const inside = insideZoneStore.get().inside;
    suspicionStore.set((s) => ({ ...s, paused: inside ? "safe-zone" : null }));
    if (inside) ExpoSpeechRecognitionModule.abort();
    else scheduleRestart(100);
  });
}

function scheduleRestart(ms: number) {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (wanted && !insideZoneStore.get().inside) begin();
  }, ms);
}

function begin() {
  try {
    ExpoSpeechRecognitionModule.start({
      lang: suspicionStore.get().lang,
      interimResults: true,
      continuous: true,
      maxAlternatives: 3,
      // Offline where the phone supports it; otherwise the system recogniser decides.
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: ["help", "bachao", "बचाओ", suspicionStore.get().customWord].filter(Boolean),
    });
    suspicionStore.set((s) => ({ ...s, listening: true, error: null }));
  } catch (err) {
    suspicionStore.set((s) => ({ ...s, error: (err as Error).message }));
    scheduleRestart(2000);
  }
}

export async function startListening(): Promise<boolean> {
  const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  if (!perm.granted) {
    suspicionStore.set((s) => ({ ...s, error: "Microphone and speech permission are needed for keyword listening." }));
    return false;
  }
  addListeners();
  wanted = true;
  snippets.length = 0;
  const inside = insideZoneStore.get().inside;
  suspicionStore.set((s) => ({ ...s, listening: !inside, paused: inside ? "safe-zone" : null, error: null }));
  if (!inside) begin();
  return true;
}

export function stopListening() {
  wanted = false;
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = null;
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // not running
  }
  suspicionStore.set((s) => ({ ...s, listening: false, paused: null }));
}

function trigger(keyword: string) {
  // 1) stop speech recognition (frees the mic), 2) panic: instant server alert + recording.
  const heard = [...snippets];
  stopListening();
  void startPanic("keyword", { keyword, snippets: heard });
}
