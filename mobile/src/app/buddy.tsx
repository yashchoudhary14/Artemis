import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  BackHeader,
  Banner,
  Button,
  Card,
  Chip,
  FadeIn,
  Field,
  Hero,
  Icon,
  IconCircle,
  Pressy,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  StatusPill,
  prefersReducedMotion,
  type IconName,
} from "@/components/ui";
import { startWalk } from "@/lib/actions";
import { buddyApi, type BuddyState, type Departure } from "@/lib/buddy";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

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
    const t = setInterval(load, 5000); // pick up the other person's accept
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

  if (state && !state.verified) {
    return (
      <Screen bottomInset={40}>
        <BackHeader title="Walk together" onBack={() => router.back()} />
        <FadeIn>
          <Hero title={"Walk your way.\n"} accent="Together." subtitle={`Only verified @${state.domain || "institute"} students can join, so you always know who you're walking with.`} />
        </FadeIn>
        <FadeIn index={1}>
          <Card>
            <Row style={{ gap: space.sm, marginBottom: space.lg }}>
              <IconCircle icon="school" />
              <Text style={[type.small, { flex: 1 }]}>Verify your institute email once. Your family will see your buddy's verified name and photo.</Text>
            </Row>
            <Field
              label="Institute email"
              icon="mail-outline"
              placeholder={`you@${state.domain || "institute.ac.in"}`}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {codeSent ? (
              <>
                <Field label="6-digit code" icon="keypad-outline" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} />
                <Banner text="Demo shortcut: the code is printed in the server log instead of being emailed." tone="violet" />
                <Button
                  label="Verify"
                  variant="violet"
                  iconRight="arrow-forward"
                  loading={busy === "verify"}
                  onPress={() => run("verify", async () => setState(await buddyApi.verifyEmail(email.trim().toLowerCase(), code.trim())))}
                />
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
    <Screen bottomInset={40}>
      <BackHeader title="Walk together" onBack={() => router.back()} />
      <FadeIn>
        <Text style={type.display}>
          Walk your way.{"\n"}
          <Text style={{ fontFamily: fonts.displayItalic, color: colors.violet }}>Together.</Text>
        </Text>
        <Pressy onPress={pickPhoto} style={styles.campus} accessibilityLabel="Add your photo">
          {state?.photoUrl ? <Image source={{ uri: state.photoUrl }} style={styles.me} /> : <Icon name="camera-outline" size={18} color={colors.violet} />}
          <Text style={type.smallBold}>{state?.photoUrl ? "Campus group" : busy === "photo" ? "Uploading…" : "Add your photo"}</Text>
          <Icon name="chevron-down" size={14} color={colors.inkSoft} />
        </Pressy>
      </FadeIn>

      <FadeIn index={1}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "departures", label: "Departures" },
            { value: "mine", label: "My walk" },
          ]}
        />
      </FadeIn>

      {msg ? <Banner text={msg} tone="sos" /> : null}

      {tab === "departures" ? (
        <>
          <FadeIn index={2}>
            <Radar names={deps.map((d) => d.name)} />
          </FadeIn>
          {deps.length === 0 ? <Text style={[type.small, { textAlign: "center", marginBottom: space.md }]}>No one is planning a walk right now — create one below.</Text> : null}
          {deps.map((d, i) => (
            <FadeIn key={d.id} index={3 + i}>
              <Card style={{ paddingVertical: space.md }}>
                <Row style={{ gap: space.md }}>
                  <View style={styles.depIcon}>
                    <Icon name={AREA_ICON[d.startArea] ?? "navigate-outline"} size={22} color={colors.violet} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3}>
                      {d.startArea} <Text style={{ color: colors.violet }}>→</Text> {d.destArea}
                    </Text>
                    <Text style={type.small}>Leaves {timeOf(d.departAt)}</Text>
                    <Row style={{ gap: 4, marginTop: 2 }}>
                      <Icon name="person-outline" size={12} color={colors.inkSoft} />
                      <Text style={[type.small, { fontSize: 12 }]}>{d.name} joining</Text>
                    </Row>
                  </View>
                  <Button label="Request to join" size="sm" loading={busy === d.id} onPress={() => join(d)} />
                </Row>
              </Card>
            </FadeIn>
          ))}

          <SectionHeader title="Create a walk" />
          <Card>
            <Text style={[type.label, { marginBottom: space.sm }]}>From</Text>
            <Row style={styles.wrap}>
              {areas.map((a) => (
                <Chip key={`f${a}`} label={a} icon={AREA_ICON[a]} selected={from === a} onPress={() => setFrom(a)} />
              ))}
            </Row>
            <Text style={[type.label, { marginVertical: space.sm }]}>To</Text>
            <Row style={styles.wrap}>
              {areas.map((a) => (
                <Chip key={`t${a}`} label={a} icon={AREA_ICON[a]} selected={to === a} onPress={() => setTo(a)} />
              ))}
            </Row>
            <Text style={[type.label, { marginVertical: space.sm }]}>Leaving in</Text>
            <Row style={styles.wrap}>
              {LEAVE_IN.map((n) => (
                <Chip key={n} label={`${n} min`} selected={leaveIn === n} onPress={() => setLeaveIn(n)} />
              ))}
            </Row>
            <Button label="Create a walk" icon="add-circle-outline" size="lg" loading={busy === "create"} onPress={create} style={{ marginTop: space.lg }} />
          </Card>
        </>
      ) : (
        <FadeIn index={2}>
          {!state?.request && !m ? (
            <Card style={{ alignItems: "center", paddingVertical: space.xxl }}>
              <IconCircle icon="footsteps-outline" size={56} />
              <Text style={[type.h2, { marginTop: space.md }]}>No walk planned</Text>
              <Text style={[type.small, { textAlign: "center", marginTop: 4 }]}>Join a departure or create your own.</Text>
            </Card>
          ) : null}
          {state?.request && !m ? (
            <Card>
              <StatusPill text="Looking for a buddy" tone="violet" pulse />
              <Text style={[type.h2, { marginTop: space.md }]}>
                {state.request.startArea} → {state.request.destArea}
              </Text>
              <Text style={type.small}>Leaves {timeOf(state.request.departAt)} · matching anyone going the same way within ±15 min</Text>
              <Button label="Cancel request" variant="ghost" size="sm" onPress={() => run("cancel", async () => setState(await buddyApi.cancelRequest()))} style={{ marginTop: space.md, alignSelf: "flex-start" }} />
            </Card>
          ) : null}
          {m ? (
            <Card tone={m.status === "accepted" ? "violetSoft" : "glass"}>
              <Row style={{ gap: space.md }}>
                {m.buddy.photoUrl ? <Image source={{ uri: m.buddy.photoUrl }} style={styles.buddyPhoto} /> : <Avatar name={m.buddy.name} size={64} index={2} ring />}
                <View style={{ flex: 1 }}>
                  <Text style={type.title}>{m.buddy.name}</Text>
                  <Row style={{ gap: 4 }}>
                    <Icon name="shield-checkmark" size={14} color={colors.safe} />
                    <Text style={[type.small, { color: colors.safe }]}>Verified institute email</Text>
                  </Row>
                </View>
              </Row>
              <View style={styles.route}>
                <Icon name={AREA_ICON[m.startArea] ?? "navigate-outline"} size={18} color={colors.violet} />
                <Text style={[type.h3, { flex: 1 }]}>
                  {m.startArea} → {m.destArea}
                </Text>
                <Text style={type.smallBold}>{timeOf(m.departAt)}</Text>
              </View>
              {m.status === "accepted" ? (
                <>
                  <Banner text="You're walking together. Both families have your buddy's name and photo." tone="safe" />
                  {active ? (
                    <Button label="Open your walk" iconRight="arrow-forward" onPress={() => router.replace("/walk")} />
                  ) : (
                    <Button label="Start walk together" icon="walk" variant="violet" size="lg" loading={busy === "walk"} onPress={walkTogether} />
                  )}
                </>
              ) : (
                <>
                  <Text style={[type.body, { color: colors.inkSoft, marginBottom: space.md }]}>
                    {m.iAccepted ? `Waiting for ${m.buddy.name} to accept…` : m.theyAccepted ? `${m.buddy.name} accepted. Walk together?` : "Walk together?"}
                  </Text>
                  <Row style={{ gap: space.sm }}>
                    <Button label="Not now" variant="ghost" style={{ flex: 1 }} onPress={() => run("decline", async () => setState(await buddyApi.decline(m.id)))} />
                    {!m.iAccepted ? (
                      <Button label="Accept" icon="checkmark" variant="violet" style={{ flex: 1 }} loading={busy === "accept"} onPress={() => run("accept", async () => setState(await buddyApi.accept(m.id)))} />
                    ) : null}
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

// "People planning a walk" radar with a slow sweep (from the find-a-buddy reference).
function Radar({ names }: { names: string[] }) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [sweep]);
  const shown = names.slice(0, 6);
  const S = 280;
  const R = 104;
  return (
    <View style={styles.radar}>
      <View style={[styles.ring, { width: S, height: S, borderRadius: S / 2 }]} />
      <View style={[styles.ring, styles.ringMid, { width: S * 0.66, height: S * 0.66, borderRadius: S * 0.33 }]} />
      <View style={[styles.ring, styles.ringInner, { width: S * 0.34, height: S * 0.34, borderRadius: S * 0.17 }]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.sweep, { transform: [{ rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}
      >
        <View style={styles.sweepArm} />
      </Animated.View>
      <View style={styles.hub}>
        <Icon name="people" size={24} color={colors.violet} />
      </View>
      {shown.map((n, i) => {
        const a = (i / Math.max(shown.length, 1)) * 2 * Math.PI - Math.PI / 2 + 0.4;
        return (
          <View key={`${n}${i}`} style={[styles.person, { left: S / 2 + R * Math.cos(a) - 30, top: S / 2 + R * Math.sin(a) - 26 }]}>
            <Avatar name={n} index={i} size={44} />
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
  campus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.glassStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.soft,
    marginTop: space.md,
    marginBottom: space.lg,
  },
  me: { width: 26, height: 26, borderRadius: 13 },
  radar: { width: 280, height: 310, alignSelf: "center", marginBottom: space.sm },
  ring: { position: "absolute", left: 0, top: 0, borderWidth: 1, borderColor: "rgba(116,66,216,0.18)", backgroundColor: "rgba(239,232,255,0.35)" },
  ringMid: { left: 280 * 0.17, top: 280 * 0.17, backgroundColor: "rgba(239,232,255,0.55)" },
  ringInner: { left: 280 * 0.33, top: 280 * 0.33, backgroundColor: "rgba(226,213,255,0.8)" },
  // A quarter-disc from the centre to the top-right, rotated around the radar's centre.
  sweep: { position: "absolute", left: 0, top: 0, width: 280, height: 280, alignItems: "flex-start" },
  sweepArm: {
    width: 140,
    height: 140,
    marginLeft: 140,
    borderTopRightRadius: 140,
    experimental_backgroundImage: "linear-gradient(20deg, rgba(139,92,246,0.32) 0%, rgba(139,92,246,0.08) 45%, rgba(139,92,246,0) 75%)",
  },
  hub: {
    position: "absolute",
    left: 140 - 30,
    top: 140 - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.violet,
  },
  person: { position: "absolute", width: 60, alignItems: "center" },
  nameTag: { marginTop: -6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.white, boxShadow: shadows.soft, maxWidth: 76 },
  nameText: { fontFamily: fonts.sansBold, fontSize: 11, color: colors.ink },
  radarLabel: { position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", fontFamily: fonts.sansSemi, fontSize: 13, color: colors.inkSoft },
  depIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.violetWash, alignItems: "center", justifyContent: "center" },
  wrap: { flexWrap: "wrap" },
  buddyPhoto: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: colors.white },
  route: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: radius.sm,
    padding: space.md,
    marginVertical: space.md,
    experimental_backgroundImage: gradients.glass,
  },
});
