import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { NativeModules, Vibration } from "react-native";
import { createStore } from "./store";

// Loud SOS alarm: a generated two-tone siren on loop at full player volume + continuous vibration.
// System volume is pushed to max when react-native-volume-manager is in the build (dev build #3+);
// in older builds that native module is missing and we fall back to the current media volume.

export const alarmStore = createStore<{ on: boolean }>({ on: false });

let player: AudioPlayer | null = null;
let previousVolume: number | null = null;

type VolumeApi = {
  getVolume: () => Promise<{ volume: number }>;
  setVolume: (v: number, c?: { type?: string; showUI?: boolean; playSound?: boolean }) => Promise<void>;
};

function volumeManager(): VolumeApi | null {
  // Only touch the library when its native part is in this build; otherwise its own
  // async setup throws "doesn't seem to be linked" errors.
  if (!NativeModules.VolumeManager) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-volume-manager") as { VolumeManager?: VolumeApi };
    return mod.VolumeManager ?? null;
  } catch {
    return null;
  }
}

// Shared by the alarm and the panic recorder so they don't fight over the audio session.
export function panicAudioMode() {
  return setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    allowsRecording: true,
    allowsBackgroundRecording: true,
    interruptionMode: "doNotMix",
    shouldRouteThroughEarpiece: false,
  } as Parameters<typeof setAudioModeAsync>[0]);
}

async function maxVolume() {
  const vm = volumeManager();
  if (!vm) return;
  try {
    previousVolume = (await vm.getVolume()).volume;
    await vm.setVolume(1, { type: "music", showUI: false, playSound: false });
  } catch {
    // native module not in this build
  }
}

async function restoreVolume() {
  const vm = volumeManager();
  if (!vm || previousVolume == null) return;
  try {
    await vm.setVolume(previousVolume, { type: "music", showUI: false, playSound: false });
  } catch {
    // ignore
  }
  previousVolume = null;
}

export async function startAlarm() {
  if (alarmStore.get().on) return;
  alarmStore.set({ on: true });
  Vibration.vibrate([0, 700, 300], true);
  try {
    await panicAudioMode();
    await maxVolume();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    player = createAudioPlayer(require("../../assets/sounds/siren.wav"));
    player.loop = true;
    player.volume = 1;
    player.play();
  } catch {
    // vibration still runs if audio fails
  }
}

export async function stopAlarm() {
  if (!alarmStore.get().on) return;
  alarmStore.set({ on: false });
  Vibration.cancel();
  try {
    player?.pause();
    player?.remove();
  } catch {
    // already released
  }
  player = null;
  await restoreVolume();
}
