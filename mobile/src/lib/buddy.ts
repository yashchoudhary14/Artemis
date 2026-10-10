import { request } from "./api";

// Walking buddy (institute only). Mirrors server/src/buddy/routes.ts.

export interface BuddyMatch {
  id: string;
  status: "proposed" | "accepted" | "declined";
  iAccepted: boolean;
  theyAccepted: boolean;
  buddy: { name: string; photoUrl: string | null; email: string | null };
  startArea: string;
  destArea: string;
  departAt: number;
}

export interface BuddyState {
  email: string | null;
  verified: boolean;
  photoUrl: string | null;
  domain: string;
  request: { id: string; startArea: string; destArea: string; departAt: number; status: string } | null;
  match: BuddyMatch | null;
}

export interface Departure {
  id: string;
  name: string;
  startArea: string;
  destArea: string;
  departAt: number;
}

export const buddyApi = {
  me: () => request<BuddyState>("GET", "/buddy/me"),
  areas: () => request<{ areas: string[] }>("GET", "/buddy/areas"),
  startEmail: (email: string) => request<{ ok: true; email: string }>("POST", "/buddy/email/start", { email }),
  verifyEmail: (email: string, code: string) => request<BuddyState>("POST", "/buddy/email/verify", { email, code }),
  departures: () => request<{ departures: Departure[] }>("GET", "/buddy/departures"),
  createRequest: (startArea: string, destArea: string, departAt: number) =>
    request<BuddyState>("POST", "/buddy/requests", { startArea, destArea, departAt }),
  cancelRequest: () => request<BuddyState>("DELETE", "/buddy/requests"),
  accept: (id: string) => request<BuddyState>("POST", `/buddy/matches/${id}/accept`),
  decline: (id: string) => request<BuddyState>("POST", `/buddy/matches/${id}/decline`),
  uploadPhoto: (uri: string, mime: string) => {
    const form = new FormData();
    form.append("file", { uri, name: "photo.jpg", type: mime } as unknown as Blob);
    return request<BuddyState>("POST", "/buddy/photo", form, { timeoutMs: 30000 });
  },
};
