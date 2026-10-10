import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowDisc, Avatar, Crescent, FadeIn, Icon, Pressy, Screen, StatusPill, Tile, Wordmark } from "@/components/ui";
import { meStore } from "@/lib/account";
import { useBriefing } from "@/lib/briefing";
import { panicStore } from "@/lib/panic";
import { sessionStore } from "@/lib/session";
import { loadJson } from "@/lib/storage";
import { useStore } from "@/lib/store";
import { suspicionStore } from "@/lib/suspicion";
import { insideZoneStore, zonesStore } from "@/lib/zones";
import { colors, fonts, gradients, shadows, space, type } from "@/theme";

export const WELCOME_KEY = "artemis.welcomed";

function greeting() {
  const h = new Date().getHours();
  if (h < 5 || h >= 17) return "Good evening";
  if (h < 12) return "Good morning";
  return "Good afternoon";
}

export default function Home() {
  const { me } = useStore(meStore);
  const active = useStore(sessionStore);
  const panic = useStore(panicStore);
  const listening = useStore(suspicionStore).listening;
  const zone = useStore(insideZoneStore);
  const zones = useStore(zonesStore);
  const [welcomed, setWelcomed] = useState<boolean | null>(null);
  const { briefing } = useBriefing(undefined, undefined, !active && !panic.active);
  const circle = me?.contacts ?? [];
  const linked = circle.filter((c) => c.linked).length;
  const first = (me?.name ?? "").split(" ")[0];

  useEffect(() => {
    void loadJson<boolean>(WELCOME_KEY, false).then(setWelcomed);
  }, []);
  if (welcomed === false) return <Redirect href="/welcome" />;

  const headline = panic.active ? "Help is coming." : active ? (active.kind === "suspicion" ? "I'm listening." : "You're on a walk.") : "You're safe.";
  const tip = briefing?.tips[0];

  return (
    <Screen bottomInset={130}>
      <FadeIn style={styles.top}>
        <Wordmark />
        <Avatar name={me?.name ?? "A"} size={40} onPress={() => router.push("/profile")} />
      </FadeIn>

      <FadeIn index={1} style={{ marginTop: space.xxl }}>
        <Text style={type.small}>
          {greeting()}
          {first ? `, ${first}` : ""}
        </Text>
        <Text style={[type.hero, { fontSize: 50, lineHeight: 54, marginTop: 6 }]}>{headline}</Text>
        <View style={styles.status}>
          {active || panic.active ? (
            <StatusPill text={panic.active ? "SOS on" : zone.inside ? "Sharing paused" : listening ? "Listening" : "Live"} tone={panic.active ? "sos" : zone.inside ? "safe" : "magenta"} pulse />
          ) : (
            <View style={styles.dotRow}>
              <View style={[styles.dot, { backgroundColor: linked ? "#5FA27E" : colors.inkFaint }]} />
              <Text style={type.small}>{circle.length ? `${circle.length} in your circle` : "Add your circle"}</Text>
            </View>
          )}
          <Text style={type.small}>{zones.length} private zone{zones.length === 1 ? "" : "s"}</Text>
        </View>
      </FadeIn>

      <FadeIn index={2}>
        {panic.active || active ? (
          <Pressy onPress={() => router.push(panic.active ? "/sos" : active?.kind === "suspicion" ? "/uneasy" : "/walk")} accessibilityLabel="Open what's running">
            <View style={styles.night}>
              <Crescent size={130} color="rgba(255,255,255,0.08)" />
              <View style={styles.nightBody}>
                <View>
                  <Text style={styles.nightTitle}>{panic.active ? "Stay with me" : active?.kind === "suspicion" ? "Uneasy mode" : active?.destination ? `To ${active.destination}` : "Your walk"}</Text>
                  <Text style={styles.nightSub}>{zone.inside ? "Inside a private zone, nothing is shared here." : "Your circle can follow you live."}</Text>
                </View>
                <ArrowDisc dark />
              </View>
            </View>
          </Pressy>
        ) : (
          <Pressy onPress={() => router.push("/walk")} accessibilityLabel="Start a walk">
            <View style={styles.night}>
              <View style={styles.moon}>
                <Crescent size={130} color="rgba(255,255,255,0.09)" />
              </View>
              <View style={styles.nightBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nightTitle}>Start a walk</Text>
                  <Text style={styles.nightSub}>Set a timer. Your circle hears if you don't arrive.</Text>
                </View>
                <View style={styles.go}>
                  <Icon name="arrow-forward" size={18} color={colors.ink} />
                </View>
              </View>
              {tip ? (
                <View style={styles.tipRow}>
                  <Crescent size={11} color="#F2C6D3" />
                  <Text style={styles.tip} numberOfLines={2}>
                    Artemis: {tip}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressy>
        )}
      </FadeIn>

      <FadeIn index={3} style={styles.grid}>
        <View style={styles.gridRow}>
          <Tile icon="mic-outline" label="I feel uneasy" tint={colors.magentaWash} color="#8E3F5A" onPress={() => router.push("/uneasy")} />
          <Tile icon="people-outline" label="Walk with me" tint={colors.lilacWash} color={colors.lilac} onPress={() => router.push("/buddy")} />
          <Tile icon="lock-closed-outline" label="Private zones" tint={colors.safeWash} color={colors.safe} onPress={() => router.push("/zones")} />
        </View>
        <View style={styles.gridRow}>
          <Tile icon="medkit-outline" label="Medical help" tint="#F7E7E4" color="#9A4A3C" onPress={() => router.push("/help")} />
          <Tile icon="call-outline" label="Helplines" tint="#F1EEE8" color="#5E5446" onPress={() => router.push("/help")} />
          <Tile icon="sparkles-outline" label="Women who rise" tint={colors.magentaWash} color="#8E3F5A" onPress={() => router.push("/rise")} />
        </View>
      </FadeIn>

      <FadeIn index={4}>
        <Pressy onPress={() => router.push("/profile")} accessibilityLabel="Your circle">
          <View style={styles.circle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flexDirection: "row" }}>
                {circle.slice(0, 3).map((c, i) => (
                  <View key={c.id} style={{ marginLeft: i ? -8 : 0 }}>
                    <Avatar name={c.name} index={i} size={28} />
                  </View>
                ))}
              </View>
              <Text style={[type.body, { fontSize: 14 }]}>Your circle</Text>
            </View>
            <Text style={type.small}>{circle.length ? `${linked} of ${circle.length} on Telegram` : "Add someone"}</Text>
          </View>
        </Pressy>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: space.xs },
  status: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 14, marginBottom: space.xl },
  dotRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  night: {
    borderRadius: 26,
    backgroundColor: colors.dark,
    experimental_backgroundImage: gradients.night,
    padding: 20,
    paddingLeft: 22,
    minHeight: 118,
    overflow: "hidden",
    boxShadow: shadows.dark,
    justifyContent: "space-between",
  },
  moon: { position: "absolute", right: -30, bottom: -60 },
  nightBody: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  nightTitle: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 32, color: colors.white },
  nightSub: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: "rgba(255,255,255,0.62)", marginTop: 6 },
  go: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  tip: { flex: 1, fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: "rgba(255,255,255,0.72)" },
  grid: { gap: 8, marginTop: space.md },
  gridRow: { flexDirection: "row", gap: 8 },
  circle: {
    marginTop: space.md,
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
