import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from "expo-audio";
import { useEffect } from "react";
import { panicAudioMode } from "@/lib/alarm";
import { addChunk, panicStore } from "@/lib/panic";
import { useStore } from "@/lib/store";

const CHUNK_MS = 10_000;

// Always mounted in the root layout. While panic mode is on it records 10 s chunks back to back
// and hands each finished file to the upload queue.
export function PanicRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const active = useStore(panicStore).active;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    (async () => {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        panicStore.set((s) => ({ ...s, error: "Microphone permission is off, so audio can't be recorded." }));
        return;
      }
      await panicAudioMode();

      while (!cancelled) {
        try {
          await recorder.prepareToRecordAsync();
          const startedAt = Date.now();
          recorder.record();
          while (!cancelled && Date.now() - startedAt < CHUNK_MS) {
            await new Promise((r) => setTimeout(r, 250));
          }
          await recorder.stop();
          if (recorder.uri) await addChunk(recorder.uri, startedAt);
        } catch (err) {
          panicStore.set((s) => ({ ...s, error: `Recording problem: ${(err as Error).message}` }));
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, recorder]);

  return null;
}
