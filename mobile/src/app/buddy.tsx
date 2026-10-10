import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Banner, Brand, Card, Chip, Field, Hero, Muted, PillButton, Row, Screen, SectionTitle } from "@/components/ui";
import { startWalk } from "@/lib/actions";
import { buddyApi, type BuddyState, type Departure } from "@/lib/buddy";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { colors, radius, space, type } from "@/theme";

const LEAVE_IN = [10, 20, 30, 45, 60];

function timeOf(ms: number) {
  return new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();
}

// F4: walking buddy — institute email, campus areas, ±15 min matching, both accept.
export default function Buddy() {
  const active = useStore(sessionStore);
  const [state, setState] = useState<BuddyState | null>(null);
  const [areas, setAreas] = useState<string[]>([]);
  const [deps, setDeps] = useState<Departure[]>([]);
  const [tab, setTab] = useState<"departures" | "mine">("departures");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [leaveIn, setLeaveIn] = useState(20);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: "green" | "coral" | "amber" } | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([buddyApi.me(), buddyApi.areas()]);
      setState(s);
      setAreas(a.areas);
      if (s.verified) setDeps((await buddyApi.departures()).departures);
    } catch (err) {
      setMsg({ text: (err as Error).message, tone: "coral" });
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000); // pick up the other person's accept
    return () => clearInterval(t);
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      setMsg({ text: (err as Error).message, tone: "coral" });
    } finally {
      setBusy(null);
    }
  };

  const pickPhoto = () =>
    run("photo", async () => {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setState(await buddyApi.uploadPhoto(a.uri, a.mimeType ?? "image/jpeg"));
    });

  const join = (d: Departure) =>
    run(d.id, async () => {
      const s = await buddyApi.createRequest(d.startArea, d.destArea, d.departAt);
      setState(s);
      setTab("mine");
    });

  const create = () =>
    run("create", async () => {
      if (!from || !to) throw new Error("Pick where you start and where you're going.");
      if (from === to) throw new Error("Start and destination must be different.");
      setState(await buddyApi.createRequest(from, to, Date.now() + leaveIn * 60_000));
      setTab("mine");
    });

  const walkTogether = () =>
    run("walk", async () => {
      const m = state?.match;
      if (!m) return;
      const minutes = Math.max(10, Math.round((m.departAt - Date.now()) / 60_000) + 20);
      await startWalk({ destination: m.destArea, timerMinutes: Math.min(minutes, 60), buddyMatchId: m.id });
      router.replace("/walk");
    });

  if (state && !state.verified) {
    return (
      <Screen>
        <Brand right={<Close />} />
        <Hero title={"Walk your way.\nTogether."} subtitle={`Only people with a verified @${state.domain || "institute"} email can join.`} />
        <Card>
          <Field
            label="Institute email"
            placeholder={`you@${state.domain || "institute.ac.in"}`}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {codeSent ? (
            <>
              <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
              <Muted style={{ marginBottom: space.md }}>Hackathon shortcut: the code is printed in the server log instead of being emailed.</Muted>
              <PillButton
                label="Verify"
                loading={busy === "verify"}
                onPress={() => run("verify", async () => setState(await buddyApi.verifyEmail(email.trim().toLowerCase(), code.trim())))}
              />
            </>
          ) : (
            <PillButton
              label="Send code"
              loading={busy === "code"}
              onPress={() =>
                run("code", async () => {
                  await buddyApi.startEmail(email.trim().toLowerCase());
                  setCodeSent(true);
                })
              }
            />
          )}
        </Card>
        {msg ? <Banner text={msg.text} tone={msg.tone} /> : null}
      </Screen>
    );
  }

  const m = state?.match;
  return (
    <Screen>
      <Brand right={<Close />} />
      <Hero title={"Walk your way.\nTogether."} />
      <Row style={{ marginBottom: space.md }}>
        <Pressable onPress={pickPhoto} style={styles.campus}>
          {state?.photoUrl ? <Image source={{ uri: state.photoUrl }} style={styles.me} /> : <Text style={{ fontSize: 16 }}>📷</Text>}
          <Text style={{ fontWeight: "600", color: colors.ink }}>{state?.photoUrl ? "Campus group" : busy === "photo" ? "Uploading…" : "Add your photo"}</Text>
        </Pressable>
      </Row>

      <View style={styles.segment}>
        <Pressable onPress={() => setTab("departures")} style={[styles.seg, tab === "departures" && styles.segOn]}>
          <Text style={[styles.segText, tab === "departures" && { color: colors.white }]}>Departures</Text>
        </Pressable>
        <Pressable onPress={() => setTab("mine")} style={[styles.seg, tab === "mine" && styles.segOn]}>
          <Text style={[styles.segText, tab === "mine" && { color: colors.white }]}>My walk</Text>
        </Pressable>
      </View>

      {msg ? <Banner text={msg.text} tone={msg.tone} /> : null}

      {tab === "departures" ? (
        <>
          <Radar names={deps.map((d) => d.name)} />
          {deps.length === 0 ? <Muted style={{ textAlign: "center", marginBottom: space.md }}>No one is planning a walk right now. Create one below.</Muted> : null}
          {deps.map((d) => (
            <Card key={d.id}>
              <Row>
                <View style={styles.depIcon}>
                  <Text style={{ fontSize: 18 }}>⇢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.route}>
                    {d.startArea} → {d.destArea}
                  </Text>
                  <Muted>
                    Leaves {timeOf(d.departAt)} · {d.name}
                  </Muted>
                </View>
                <PillButton label="Request to join" style={styles.smallBtn} loading={busy === d.id} onPress={() => join(d)} />
              </Row>
            </Card>
          ))}
          <SectionTitle title="Create a walk" />
          <Card>
            <Text style={[type.label, { marginBottom: 8 }]}>From</Text>
            <Row style={styles.wrap}>
              {areas.map((a) => (
                <Chip key={`f${a}`} label={a} selected={from === a} onPress={() => setFrom(a)} />
              ))}
            </Row>
            <Text style={[type.label, { marginVertical: 8 }]}>To</Text>
            <Row style={styles.wrap}>
              {areas.map((a) => (
                <Chip key={`t${a}`} label={a} selected={to === a} onPress={() => setTo(a)} />
              ))}
            </Row>
            <Text style={[type.label, { marginVertical: 8 }]}>Leaving in (minutes)</Text>
            <Row style={styles.wrap}>
              {LEAVE_IN.map((n) => (
                <Chip key={n} label={`${n}`} selected={leaveIn === n} onPress={() => setLeaveIn(n)} />
              ))}
            </Row>
            <PillButton label="⊕  Create a walk" big loading={busy === "create"} onPress={create} style={{ marginTop: space.md }} />
          </Card>
        </>
      ) : (
        <>
          {!state?.request && !m ? <Muted>You have no walk planned. Join a departure or create one.</Muted> : null}
          {state?.request && !m ? (
            <Card>
              <Text style={styles.route}>
                {state.request.startArea} → {state.request.destArea}
              </Text>
              <Muted>Leaves {timeOf(state.request.departAt)} · waiting for someone going the same way (±15 min)</Muted>
              <PillButton label="Cancel" variant="ghost" onPress={() => run("cancel", async () => setState(await buddyApi.cancelRequest()))} style={{ marginTop: space.md }} />
            </Card>
          ) : null}
          {m ? (
            <Card tint={m.status === "accepted" ? "lilac" : undefined}>
              <Row>
                {m.buddy.photoUrl ? <Image source={{ uri: m.buddy.photoUrl }} style={styles.buddyPhoto} /> : <Avatar name={m.buddy.name} size={56} index={2} />}
                <View style={{ flex: 1 }}>
                  <Text style={type.h2}>{m.buddy.name}</Text>
                  <Muted>Verified institute email</Muted>
                </View>
              </Row>
              <Text style={[styles.route, { marginTop: space.md }]}>
                {m.startArea} → {m.destArea}
              </Text>
              <Muted>Leaves around {timeOf(m.departAt)}</Muted>
              {m.status === "accepted" ? (
                <>
                  <Banner text="You're walking together. Both families have your buddy's name and photo." tone="green" />
                  {active ? (
                    <PillButton label="Open your walk" onPress={() => router.replace("/walk")} />
                  ) : (
                    <PillButton label="Start walk together" big loading={busy === "walk"} onPress={walkTogether} />
                  )}
                </>
              ) : (
                <>
                  <Muted style={{ marginTop: space.sm }}>
                    {m.iAccepted ? `Waiting for ${m.buddy.name} to accept…` : m.theyAccepted ? `${m.buddy.name} accepted. Walk together?` : "Walk together?"}
                  </Muted>
                  <Row style={{ marginTop: space.md }}>
                    <PillButton label="Not now" variant="ghost" style={{ flex: 1 }} onPress={() => run("decline", async () => setState(await buddyApi.decline(m.id)))} />
                    {!m.iAccepted ? (
                      <PillButton label="Accept" style={{ flex: 1 }} loading={busy === "accept"} onPress={() => run("accept", async () => setState(await buddyApi.accept(m.id)))} />
                    ) : null}
                  </Row>
                </>
              )}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Close() {
  return (
    <Pressable onPress={() => router.back()}>
      <Text style={{ fontSize: 15, color: colors.muted }}>Close</Text>
    </Pressable>
  );
}

// "People planning a walk" radar from the mock.
function Radar({ names }: { names: string[] }) {
  const shown = names.slice(0, 6);
  const R = 92;
  return (
    <View style={styles.radar}>
      <View style={styles.ring1} />
      <View style={styles.ring2} />
      <View style={styles.hub}>
        <Text style={{ fontSize: 22 }}>👥</Text>
      </View>
      {shown.map((n, i) => {
        const a = (i / Math.max(shown.length, 1)) * 2 * Math.PI - Math.PI / 2;
        return (
          <View key={`${n}${i}`} style={{ position: "absolute", left: 120 + R * Math.cos(a) - 21, top: 120 + R * Math.sin(a) - 21 }}>
            <Avatar name={n} index={i} size={42} />
          </View>
        );
      })}
      <Text style={styles.radarLabel}>People planning a walk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  campus: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.line },
  me: { width: 28, height: 28, borderRadius: 14 },
  segment: { flexDirection: "row", backgroundColor: colors.white, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.line, marginBottom: space.md },
  seg: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  segOn: { backgroundColor: colors.dark },
  segText: { fontWeight: "700", color: colors.ink },
  radar: { width: 240, height: 270, alignSelf: "center", marginBottom: space.sm },
  ring1: { position: "absolute", left: 10, top: 10, width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: colors.line, borderStyle: "dashed" },
  ring2: { position: "absolute", left: 60, top: 60, width: 120, height: 120, borderRadius: 60, backgroundColor: colors.lilacSoft },
  hub: { position: "absolute", left: 92, top: 92, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  radarLabel: { position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", color: colors.muted, fontSize: 13 },
  depIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lilacSoft, alignItems: "center", justifyContent: "center" },
  route: { fontSize: 16, fontWeight: "700", color: colors.ink },
  smallBtn: { minHeight: 40, paddingHorizontal: 14 },
  wrap: { flexWrap: "wrap" },
  buddyPhoto: { width: 56, height: 56, borderRadius: 28 },
});
