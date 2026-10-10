import { DEMO } from "@/demo";
import { api, type Me } from "./api";
import { getPins, getToken, setPins, setToken } from "./storage";
import { createStore } from "./store";

// The signed-in profile (name, contacts, medical card, buddy info). Refreshed from the server.
export const meStore = createStore<{ me: Me | null; loading: boolean; error: string | null }>({ me: null, loading: false, error: null });

export async function refreshMe(): Promise<Me | null> {
  if (!(await getToken())) {
    meStore.set({ me: null, loading: false, error: null });
    return null;
  }
  meStore.set((s) => ({ ...s, loading: true }));
  try {
    const me = await api.me();
    meStore.set({ me, loading: false, error: null });
    return me;
  } catch (err) {
    meStore.set((s) => ({ ...s, loading: false, error: (err as Error).message }));
    return meStore.get().me;
  }
}

export function setMe(me: Me) {
  meStore.set({ me, loading: false, error: null });
}

// Demo mode: the app is ready the moment it opens (account, PINs, one contact). See src/demo.ts.
export async function ensureDemoSetup(): Promise<void> {
  if (!DEMO.enabled || !DEMO.serverUrl) return;
  try {
    const pins = await getPins();
    if (!pins.pin || !pins.duressPin) await setPins(DEMO.pin, DEMO.duressPin);
    let me: Me | null = null;
    if (await getToken()) me = await api.me().catch((err) => ((err as { status?: number }).status === 401 ? null : Promise.reject(err)));
    if (!me) {
      // No account on this server yet (new install or a fresh server database).
      const created = await api.createUser(DEMO.name, DEMO.escalationWaitSeconds);
      await setToken(created.token);
      const { token: _t, ...profile } = created;
      me = profile;
    }
    if (me.contacts.length === 0) {
      for (const c of DEMO.contacts) await api.addContact(c.name, c.tier);
      me = await api.me();
    }
    setMe(me);
  } catch (err) {
    meStore.set((s) => ({ ...s, error: `Demo setup: ${(err as Error).message}` }));
  }
}
