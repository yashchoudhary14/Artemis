import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Brand,
  Button,
  Card,
  FadeIn,
  Icon,
  IconCircle,
  Pressy,
  Row,
  Screen,
  SectionHeader,
  StatusPill,
  type IconName,
} from "@/components/ui";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { suspicionStore } from "@/lib/suspicion";
import { insideZoneStore, zonesStore } from "@/lib/zones";
import { colors, fonts, gradients, radius, shadows, space, type } from "@/theme";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Home() {
  const { me } = useStore(meStore);
  const active = useStore(sessionStore);
  const panic = useStore(panicStore);
  const listening = useStore(suspicionStore).listening;
  const zone = useStore(insideZoneStore);
  const zones = useStore(zonesStore);
  const circle = me?.contacts ?? [];
  const first = me?.name.split(" ")[0];

  return (
    <Screen>
      <FadeIn>
        <Brand right={me ? <Avatar name={me.name} index={1} size={40} ring onPress={() => router.push("/rise")} /> : null} />
      </FadeIn>

      <FadeIn index={1}>
        <View style={styles.heroWrap}>
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyMedium, { color: colors.inkSoft, marginBottom: 6 }]}>
              {greeting()}
              {first ? `, ${first}` : ""}
            </Text>
            <Text style={type.display}>
              Move on{"\n"}
              <Text style={{ fontFamily: fonts.displayItalic, color: colors.violet }}>your terms.</Text>
            </Text>
            <Text style={[type.body, { color: colors.inkSoft, marginTop: 8 }]}>Different paths. A safer tomorrow.</Text>
          </View>
          <View style={styles.moonOrb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.moonGlow} />
            <View style={styles.moonRing} />
            <Icon name="moon" size={46} color={colors.violet} />
            <Icon name="sparkles" size={14} color={colors.rose} style={styles.sparkle} />
          </View>
        </View>
      </FadeIn>

      {/* Live status */}
      <FadeIn index={2}>
        {panic.active ? (
          <Card tone="sos" onPress={() => router.push("/sos")}>
            <Row style={{ gap: space.sm }}>
              <IconCircle icon="radio" tint="rgba(255,255,255,0.2)" color={colors.white} />
              <View style={{ flex: 1 }}>
                <Text style={[type.h3, { color: colors.white }]}>SOS is on</Text>
                <Text style={[type.small, { color: "rgba(255,255,255,0.85)" }]}>
                  {panic.alertSent ? "Your circle has been alerted · recording audio" : "Sending your alert…"}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.white} />
            </Row>
          </Card>
        ) : (
          <Card onPress={() => router.push(active ? (active.kind === "suspicion" ? "/uneasy" : "/walk") : "/zones")}>
            <Row style={{ gap: space.sm }}>
              <IconCircle
                icon={zone.inside ? "location" : active ? "navigate" : "shield-checkmark"}
                tint={zone.inside || !active ? colors.safeWash : colors.violetWash}
                color={zone.inside || !active ? colors.safe : colors.violet}
              />
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>
                  {zone.inside
                    ? `${zone.zoneName ?? "Private zone"}`
                    : active
                      ? active.kind === "suspicion"
                        ? "Staying with you"
                        : `Walking${active.destination ? ` to ${active.destination}` : ""}`
                      : "All quiet"}
                </Text>
                <Text style={type.small}>
                  {zone.inside
                    ? "Location sharing paused here"
                    : active
                      ? listening
                        ? "Your circle can see you · listening"
                        : "Your circle can see your live location"
                      : zones.length
                        ? `${zones.length} private zone${zones.length > 1 ? "s" : ""} set · ready when you are`
                        : "SafeWalk is ready when you are"}
                </Text>
              </View>
              {active || zone.inside ? <StatusPill text={zone.inside ? "Paused" : "Live"} tone={zone.inside ? "safe" : "violet"} pulse={!zone.inside} /> : <Icon name="chevron-forward" size={18} color={colors.inkFaint} />}
            </Row>
          </Card>
        )}
      </FadeIn>

      {/* Primary actions */}
      <FadeIn index={3}>
        <ActionRow
          tone="violet"
          icon="walk"
          title={active?.kind === "walk" ? "Open your walk" : "Start a walk"}
          subtitle="Set a check-in timer"
          onPress={() => router.push("/walk")}
        />
        <ActionRow tone="glass" icon="shield-half" title="I feel uneasy" subtitle={listening ? "Listening for your words" : "Stay with me for 30 min"} onPress={() => router.push("/uneasy")} />
      </FadeIn>

      {/* Circle */}
      <FadeIn index={4}>
        <SectionHeader title="Your circle" action="Edit" onAction={() => router.push("/rise")} />
        <Card>
          <Text style={[type.small, { marginBottom: space.md }]}>People you trust, always close.</Text>
          <Row style={{ gap: space.lg, flexWrap: "wrap", alignItems: "flex-start" }}>
            {circle.slice(0, 4).map((c, i) => (
              <View key={c.id} style={styles.member}>
                <View>
                  <Avatar name={c.name} index={i} size={56} />
                  <View style={[styles.badge, { backgroundColor: c.linked ? colors.safe : colors.inkFaint }]}>
                    <Icon name={c.linked ? "checkmark" : "time"} size={10} color={colors.white} />
                  </View>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {c.name}
                </Text>
              </View>
            ))}
            <Pressy onPress={() => router.push("/rise")} accessibilityLabel="Add someone to your circle">
              <View style={styles.member}>
                <View style={styles.addCircle}>
                  <Icon name="add" size={24} color={colors.violet} />
                </View>
                <Text style={styles.memberName}>Add</Text>
              </View>
            </Pressy>
          </Row>
        </Card>
      </FadeIn>

      {/* Buddy — night scene */}
      <FadeIn index={5}>
        <Pressy onPress={() => router.push("/buddy")} accessibilityLabel="Find a walking buddy">
          <View style={styles.dusk}>
            <NightScene />
            <Text style={styles.duskTitle}>A little{"\n"}company?</Text>
            <Text style={styles.duskBody}>Plan a walk with people you trust, or join others heading the same way.</Text>
            <Button label="Find a walking buddy" iconRight="arrow-forward" variant="light" size="sm" onPress={() => router.push("/buddy")} style={{ alignSelf: "flex-start", marginTop: space.lg }} />
          </View>
        </Pressy>
      </FadeIn>

      {/* Bento */}
      <FadeIn index={6}>
        <Row style={{ gap: space.sm, alignItems: "stretch" }}>
          <Tile icon="locate" tone="violetSoft" title="Private zones" sub={zones.length ? `${zones.length} saved` : "Set your safe areas"} onPress={() => router.push("/zones")} />
          <Tile icon="medkit" tone="rose" title="Help nearby" sub="Hospitals · police · 108" onPress={() => router.push("/help")} />
        </Row>
        <Card onPress={() => router.push("/help")} style={{ marginTop: space.xs }}>
          <Row style={{ gap: space.sm }}>
            <IconCircle icon="book" tint={colors.peach} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>Help, when you need it</Text>
              <Text style={type.small}>Verified helplines for your state</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.inkFaint} />
          </Row>
        </Card>
      </FadeIn>
    </Screen>
  );
}

function ActionRow({ tone, icon, title, subtitle, onPress }: { tone: "violet" | "glass"; icon: IconName; title: string; subtitle: string; onPress: () => void }) {
  const dark = tone === "violet";
  return (
    <Card tone={tone} onPress={onPress} style={{ paddingVertical: space.md }}>
      <Row style={{ gap: space.md }}>
        <IconCircle icon={icon} tint={dark ? "rgba(255,255,255,0.18)" : colors.roseWash} color={dark ? colors.white : colors.rose} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={[type.h3, { fontSize: 17 }, dark && { color: colors.white }]}>{title}</Text>
          <Text style={[type.small, dark && { color: "rgba(255,255,255,0.8)" }]}>{subtitle}</Text>
        </View>
        <View style={[styles.chev, dark && { backgroundColor: "rgba(255,255,255,0.18)" }]}>
          <Icon name="chevron-forward" size={16} color={dark ? colors.white : colors.ink} />
        </View>
      </Row>
    </Card>
  );
}

function Tile({ icon, tone, title, sub, onPress }: { icon: IconName; tone: "violetSoft" | "rose"; title: string; sub: string; onPress: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Card tone={tone} onPress={onPress} style={{ minHeight: 140, justifyContent: "space-between" }}>
        <View style={styles.tileIcon}>
          <Icon name={icon} size={20} color={tone === "rose" ? colors.rose : colors.violet} />
        </View>
        <View>
          <Text style={[type.h2, { fontSize: 18 }]}>{title}</Text>
          <Text style={type.small}>{sub}</Text>
        </View>
      </Card>
    </View>
  );
}

// Decorative dusk sky: moon glow, stars and a soft campus skyline (no image assets needed).
function NightScene() {
  const stars = [
    [0.62, 0.12, 3],
    [0.78, 0.22, 2],
    [0.9, 0.1, 3],
    [0.7, 0.36, 2],
    [0.55, 0.28, 2],
    [0.95, 0.42, 2],
  ];
  const skyline = [26, 44, 34, 58, 30, 48, 70, 38, 52, 32, 46];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.duskMoonGlow} />
      <View style={styles.duskMoon} />
      {stars.map(([x, y, s], i) => (
        <View key={i} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, width: s, height: s, borderRadius: s, backgroundColor: "rgba(255,255,255,0.85)" }} />
      ))}
      <View style={styles.skyline}>
        {skyline.map((h, i) => (
          <View key={i} style={{ flex: 1, height: h, marginHorizontal: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: i % 3 === 0 ? "rgba(26,14,39,0.55)" : "rgba(26,14,39,0.4)" }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { flexDirection: "row", alignItems: "flex-start", marginBottom: space.xl },
  moonOrb: { width: 108, height: 108, alignItems: "center", justifyContent: "center", marginTop: 18 },
  moonGlow: { position: "absolute", width: 120, height: 120, borderRadius: 60, experimental_backgroundImage: gradients.violetGlow },
  moonRing: { position: "absolute", width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: "rgba(116,66,216,0.25)" },
  sparkle: { position: "absolute", top: 10, right: 14 },
  member: { alignItems: "center", width: 64 },
  memberName: { fontFamily: fonts.sansSemi, fontSize: 12, color: colors.ink, marginTop: 6 },
  badge: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.white,
  },
  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.violetSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  chev: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.violetWash, alignItems: "center", justifyContent: "center" },
  dusk: {
    borderRadius: radius.xl,
    padding: space.xl,
    paddingBottom: space.xxl + 8,
    marginBottom: space.md,
    overflow: "hidden",
    backgroundColor: colors.plum,
    experimental_backgroundImage: gradients.dusk,
    boxShadow: shadows.dark,
  },
  duskMoonGlow: { position: "absolute", right: -30, top: -30, width: 190, height: 190, borderRadius: 95, experimental_backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,214,226,0.45) 0%, rgba(255,214,226,0) 65%)" },
  duskMoon: { position: "absolute", right: 34, top: 30, width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFE9F0", boxShadow: "0px 0px 24px rgba(255,220,232,0.9)" },
  skyline: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", alignItems: "flex-end", height: 72, paddingHorizontal: 6 },
  duskTitle: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.white, letterSpacing: -0.3 },
  duskBody: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21, color: "rgba(255,255,255,0.82)", marginTop: space.xs, maxWidth: "78%" },
  tileIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center", marginBottom: space.md },
});
