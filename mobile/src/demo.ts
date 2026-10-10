import { DEMO_SERVER_URL } from "./demoServer";

// HARDCODED DEMO DEFAULTS (hackathon shortcut). To remove: set DEMO.enabled = false, and users
// go through Rise → Server / You / PINs / Your circle themselves.
export const DEMO = {
  enabled: true,
  serverUrl: DEMO_SERVER_URL,
  name: "Priya",
  pin: "1234",
  duressPin: "9999",
  escalationWaitSeconds: 60,
  contacts: [{ name: "Mum", tier: "inner" as const }],
};
