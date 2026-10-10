import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Banner,
  Bubble,
  Button,
  Card,
  Chip,
  ChipRow,
  FadeIn,
  Field,
  Header,
  HeaderIcon,
  Hero,
  Icon,
  IconBubble,
  Row,
  Screen,
  StatusPill,
  UnderlineTabs,
  prefersReducedMotion,
  type IconName,
} from "@/components/ui";
import { startWalk } from "@/lib/actions";
import { buddyApi, type BuddyState, type Departure } from "@/lib/buddy";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { colors, fonts, shadows, space, type } from "@/theme";

const LEAVE_IN = [10, 20, 30, 45, 60];

const AREA_ICON: Record<string, IconName> = {
  "Main Gate": "enter-outline",
  Library: "library-outline",
  "Academic Complex": "school-outline",
  Cafeteria: "cafe-outline",
  "Hostel Zone": "bed-outline",
  "Market Complex": "storefront-outline",
  Hospital: "medkit-outline",
  "Sports Complex": "football-outline",
  "Guest House": "home-outline",
  Lakeside: "water-outline",
};

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).toUpperCase();

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
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([buddyApi.me(), buddyApi.areas()]);
      setState(s);
      setAreas(a.areas);
      if (s.verified) setDeps((await buddyApi.departures()).departures);
    } catch (err) {
      setMsg((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (err) {
      setMsg((err as Error).message);
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
      setState(await buddyApi.createRequest(d.startArea, d.destArea, d.departAt));
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

  const header = (
    <Header
      title="Walk together"
      accent="Verified students only"
      accentIcon="shield-checkmark-outline"
      left={<HeaderIcon icon="chevron-back" label="Back" onPress={() => router.back()} />}
      right={<HeaderIcon icon="camera-outline" label="Your photo" onPress={pickPhoto} />}
    />
  );

  if (state && !state.verified) {
    return (
      <Screen header={header} bottomInset={40}>
        <FadeIn>
          <Hero title="Walk with me." accent={`Sign in with your @${state.domain || "institute"} email`} />
        </FadeIn>
        <FadeIn index={1}>
          <Card>
            <Field label="Institute email" icon="mail-outline" placeholder={`you@${state.domain || "institute.ac.in"}`} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {codeSent ? (
              <>
                <Field label="6-digit code" icon="keypad-outline" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                <Banner text="Demo shortcut: the code is printed in the server log instead of being emailed." />
                <Button label="Verify" iconRight="arrow-forward" loading={busy === "verify"} onPress={() => run("verify", async () => setState(await buddyApi.verifyEmail(email.trim().toLowerCase(), code.trim())))} />
              </>
            ) : (
              <Button
                label="Send code"
                iconRight="arrow-forward"
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
          {msg ? <Banner text={msg} tone="sos" /> : null}
        </FadeIn>
      </Screen>
    );
  }

  const m = state?.match;
  return (
    <Screen header={header} bottomInset={40}>
      <FadeIn>
        <Hero title="Walk with me." style={{ marginBottom: space.md }} />
      </FadeIn>
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "departures", label: "Departures" },
          { value: "mine", label: "My walk" },
        ]}
      />
      {msg ? <Banner text={msg} tone="sos" /> : null}

      {tab === "departures" ? (
        <>
          <FadeIn index={1}>
            <Radar names={deps.map((d) => d.name)} />
          </FadeIn>
          {deps.length === 0 ? <Text style={[type.small, { textAlign: "center", marginBottom: space.md }]}>No one is planning a walk right now — create one below.</Text> : null}
          {deps.map((d, i) => (
            <FadeIn key={d.id} index={2 + i}>
              <Card>
                <Row style={{ gap: space.sm }}>
                  <IconBubble icon={AREA_ICON[d.startArea] ?? "navigate-outline"} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.cardTitle}>
                      {d.startArea} → {d.destArea}
                    </Text>
                    <Text style={type.small}>Leaves {timeOf(d.departAt)}</Text>
                    <Row style={{ gap: 4, marginTop: 2 }}>
                      <Icon name="person-outline" size={12} color={colors.inkSoft} />
                      <Text style={[type.small, { fontSize: 11.5 }]}>{d.name} joining</Text>
                    </Row>
                  </View>
                  <Button label="Join" size="sm" loading={busy === d.id} onPress={() => join(d)} />
                </Row>
              </Card>
            </FadeIn>
          ))}

          <Text style={[type.section, { marginTop: space.lg, marginBottom: space.sm }]}>Create a walk</Text>
          <Card>
            <Text style={[type.small, { fontFamily: fonts.sansMedium, marginBottom: 8 }]}>From</Text>
            <ChipRow wrap>
              {areas.map((a) => (
                <Chip key={`f${a}`} label={a} icon={AREA_ICON[a]} selected={from === a} onPress={() => setFrom(a)} />
              ))}
            </ChipRow>
            <Text style={[type.small, { fontFamily: fonts.sansMedium, marginBottom: 8 }]}>To</Text>
            <ChipRow wrap>
              {areas.map((a) => (
                <Chip key={`t${a}`} label={a} icon={AREA_ICON[a]} selected={to === a} onPress={() => setTo(a)} />
              ))}
            </ChipRow>
            <Text style={[type.small, { fontFamily: fonts.sansMedium, marginBottom: 8 }]}>Leaving in</Text>
            <ChipRow wrap>
              {LEAVE_IN.map((n) => (
                <Chip key={n} icon="time-outline" label={`${n} min`} selected={leaveIn === n} onPress={() => setLeaveIn(n)} />
              ))}
            </ChipRow>
            <Button label="Create a walk" iconRight="arrow-forward" size="lg" loading={busy === "create"} onPress={create} />
          </Card>
        </>
      ) : (
        <FadeIn index={1}>
          {!state?.request && !m ? (
            <Bubble style={{ maxWidth: "100%" }}>
              <Text style={type.cardTitle}>No walk planned yet</Text>
              <Text style={[type.bodySoft, { marginTop: 4 }]}>Join a departure or create your own.</Text>
            </Bubble>
          ) : null}
          {state?.request && !m ? (
            <Card>
              <StatusPill text="Looking for a buddy" pulse />
              <Text style={[type.title, { marginTop: space.sm }]}>
                {state.request.startArea} → {state.request.destArea}
              </Text>
              <Text style={type.small}>Leaves {timeOf(state.request.departAt)} · matching anyone going the same way within ±15 min</Text>
              <Button label="Cancel request" variant="outline" size="sm" onPress={() => run("cancel", async () => setState(await buddyApi.cancelRequest()))} style={{ marginTop: space.md, alignSelf: "flex-start" }} />
            </Card>
          ) : null}
          {m ? (
            <Card style={{ padding: space.lg }}>
              <Row style={{ gap: space.md }}>
                <Avatar name={m.buddy.name} photo={m.buddy.photoUrl} size={64} square index={2} />
                <View style={{ flex: 1 }}>
                  <Text style={type.title}>{m.buddy.name}</Text>
                  <Row style={{ gap: 4 }}>
                    <Icon name="shield-checkmark" size={13} color={colors.safe} />
                    <Text style={[type.small, { color: colors.safe }]}>Verified institute email</Text>
                  </Row>
                </View>
              </Row>
              <Bubble style={{ maxWidth: "100%", marginTop: space.md, backgroundColor: colors.magentaWash }}>
                <Text style={type.cardTitle}>
                  {m.startArea} → {m.destArea}
                </Text>
                <Text style={type.small}>Leaves around {timeOf(m.departAt)}</Text>
              </Bubble>
              {m.status === "accepted" ? (
                <>
                  <Banner text="You're walking together. Both families have your buddy's name and photo." tone="safe" />
                  {active ? (
                    <Button label="Open your walk" iconRight="arrow-forward" onPress={() => router.replace("/walk")} />
                  ) : (
                    <Button label="Start walk together" iconRight="arrow-forward" size="lg" loading={busy === "walk"} onPress={walkTogether} />
                  )}
                </>
              ) : (
                <>
                  <Text style={[type.bodySoft, { marginVertical: space.sm }]}>
                    {m.iAccepted ? `Waiting for ${m.buddy.name} to accept…` : m.theyAccepted ? `${m.buddy.name} accepted. Walk together?` : "Walk together?"}
                  </Text>
                  <Row style={{ gap: space.xs }}>
                    <Button label="Not now" variant="outline" style={{ flex: 1 }} onPress={() => run("decline", async () => setState(await buddyApi.decline(m.id)))} />
                    {!m.iAccepted ? <Button label="Accept" iconRight="checkmark" style={{ flex: 1 }} loading={busy === "accept"} onPress={() => run("accept", async () => setState(await buddyApi.accept(m.id)))} /> : null}
                  </Row>
                </>
              )}
            </Card>
          ) : null}
        </FadeIn>
      )}
    </Screen>
  );
}

// "People planning a walk" radar with a slow sweep (find-a-buddy reference), in the pink palette.
function Radar({ names }: { names: string[] }) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [sweep]);
  const shown = names.slice(0, 6);
  const S = 270;
  const R = 100;
  return (
    <View style={styles.radar}>
      <View style={[styles.ring, { left: 0, top: 0, width: S, height: S, borderRadius: S / 2 }]} />
      <View style={[styles.ring, { left: S * 0.17, top: S * 0.17, width: S * 0.66, height: S * 0.66, borderRadius: S * 0.33, backgroundColor: "rgba(252,227,236,0.6)" }]} />
      <View style={[styles.ring, { left: S * 0.33, top: S * 0.33, width: S * 0.34, height: S * 0.34, borderRadius: S * 0.17, backgroundColor: "rgba(250,205,222,0.8)" }]} />
      <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}>
        <View style={styles.sweepArm} />
      </Animated.View>
      <View style={styles.hub}>
        <Icon name="people" size={22} color={colors.magenta} />
      </View>
      {shown.map((n, i) => {
        const a = (i / Math.max(shown.length, 1)) * 2 * Math.PI - Math.PI / 2 + 0.4;
        return (
          <View key={`${n}${i}`} style={[styles.person, { left: S / 2 + R * Math.cos(a) - 30, top: S / 2 + R * Math.sin(a) - 26 }]}>
            <Avatar name={n} index={i} size={42} />
            <View style={styles.nameTag}>
              <Text style={styles.nameText} numberOfLines={1}>
                {n}
              </Text>
            </View>
          </View>
        );
      })}
      <Text style={styles.radarLabel}>{shown.length ? `${names.length} planning a walk` : "Looking around campus…"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  radar: { width: 270, height: 300, alignSelf: "center", marginBottom: space.sm },
  ring: { position: "absolute", borderWidth: 1, borderColor: "rgba(201,42,102,0.16)", backgroundColor: "rgba(255,255,255,0.5)" },
  sweep: { position: "absolute", left: 0, top: 0, width: 270, height: 270, alignItems: "flex-start" },
  sweepArm: { width: 135, height: 135, marginLeft: 135, borderTopRightRadius: 135, experimental_backgroundImage: "linear-gradient(20deg, rgba(201,42,102,0.26) 0%, rgba(201,42,102,0.06) 45%, rgba(201,42,102,0) 75%)" },
  hub: { position: "absolute", left: 135 - 28, top: 135 - 28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", boxShadow: shadows.lifted },
  person: { position: "absolute", width: 60, alignItems: "center" },
  nameTag: { marginTop: -6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.white, boxShadow: shadows.bubble, maxWidth: 76 },
  nameText: { fontFamily: fonts.serifBold, fontSize: 10.5, color: colors.ink },
  radarLabel: { position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", fontFamily: fonts.serif, fontSize: 13, color: colors.inkSoft },
});
