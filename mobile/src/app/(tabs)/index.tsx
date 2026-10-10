import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar, Banner, Brand, Card, Hero, Muted, PillButton, Row, Screen, SectionTitle } from "@/components/ui";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { suspicionStore } from "@/lib/suspicion";
import { insideZoneStore, zonesStore } from "@/lib/zones";
import { colors, space, type } from "@/theme";

export default function Home() {
  const { me } = useStore(meStore);
  const active = useStore(sessionStore);
  const panic = useStore(panicStore);
  const listening = useStore(suspicionStore).listening;
  const zone = useStore(insideZoneStore);
  const zones = useStore(zonesStore);
  const circle = me?.contacts ?? [];
  const setupDone = Boolean(me) && circle.length > 0;

  return (
    <Screen>
      <Brand right={me ? <Avatar name={me.name} index={1} size={40} onPress={() => router.push("/rise")} /> : null} />
      <Hero title={"Go where life\ntakes you."} subtitle="Choose who stays with you." />

      {panic.active ? (
        <Card tint="coral" onPress={() => router.push("/sos")}>
          <Text style={styles.whiteTitle}>SOS is on</Text>
          <Text style={styles.whiteBody}>{panic.alertSent ? "Your circle has been alerted. Recording audio." : "Sending your alert…"} Tap to open.</Text>
        </Card>
      ) : active ? (
        <Card tint="lilac" onPress={() => router.push(active.kind === "suspicion" ? "/uneasy" : "/walk")}>
          <Text style={type.h2}>{active.kind === "suspicion" ? "Uneasy mode is on" : `Walking${active.destination ? ` to ${active.destination}` : ""}`}</Text>
          <Muted>
            {zone.inside ? `Inside ${zone.zoneName ?? "a private zone"} — sharing paused.` : "Your circle can see your walk."}
            {listening ? " Listening for your words." : ""} Tap to open.
          </Muted>
        </Card>
      ) : null}

      {!setupDone ? (
        <Card onPress={() => router.push("/rise")}>
          <Text style={type.h2}>Finish setting up</Text>
          <Muted>Add your name, your PINs and the people who should hear from SafeWalk. It takes two minutes.</Muted>
          <PillButton label="Set up now" onPress={() => router.push("/rise")} style={{ marginTop: space.md, alignSelf: "flex-start" }} />
        </Card>
      ) : null}

      <Card onPress={() => router.push("/rise")}>
        <SectionTitle title="Your circle" action={<Text style={styles.chev}>›</Text>} />
        <Muted>People you trust, always close.</Muted>
        <Row style={{ marginTop: space.md, gap: space.md, flexWrap: "wrap" }}>
          {circle.slice(0, 5).map((c, i) => (
            <View key={c.id} style={{ alignItems: "center" }}>
              <Avatar name={c.name} index={i} />
              <Text style={styles.avatarLabel}>{c.linked ? "✓" : "…"}</Text>
            </View>
          ))}
          <View style={{ alignItems: "center" }}>
            <Pressable onPress={() => router.push("/rise")} style={styles.addCircle}>
              <Text style={{ fontSize: 22, color: colors.lilacDeep }}>+</Text>
            </Pressable>
            <Text style={styles.avatarLabel}> </Text>
          </View>
        </Row>
      </Card>

      <Card tint="dusk" onPress={() => router.push("/buddy")}>
        <Text style={styles.duskTitle}>A little{"\n"}company?</Text>
        <Text style={styles.duskBody}>Plan a walk with people you trust or join others heading the same way.</Text>
        <PillButton label="Find a walking buddy  →" variant="lilac" onPress={() => router.push("/buddy")} style={{ marginTop: space.lg }} />
      </Card>

      <Row style={{ gap: space.md, alignItems: "stretch" }}>
        <Tile icon="🎙" title="I feel uneasy" sub={listening ? "Listening now" : "Get support now"} tint={colors.pinkSoft} onPress={() => router.push("/uneasy")} />
        <Tile icon="◎" title="Private zones" sub={zones.length ? `${zones.length} saved` : "Set your safe areas"} tint={colors.lilacSoft} onPress={() => router.push("/zones")} />
      </Row>

      <Card onPress={() => router.push("/help")}>
        <Row>
          <Text style={{ fontSize: 24 }}>✚</Text>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>Help, when you need it</Text>
            <Muted>Helplines, nearby hospitals and police, medical fast-dial.</Muted>
          </View>
          <Text style={styles.chev}>›</Text>
        </Row>
      </Card>

      {zone.inside ? <Banner text={`You're inside ${zone.zoneName ?? "a private zone"}. Location sharing and listening are paused here. SOS still works.`} /> : null}
    </Screen>
  );
}

function Tile({ icon, title, sub, tint, onPress }: { icon: string; title: string; sub: string; tint: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Muted>{sub}</Muted>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chev: { fontSize: 26, color: colors.muted },
  avatarLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lilac,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  duskTitle: { fontFamily: type.title.fontFamily, fontSize: 28, lineHeight: 32, color: colors.white, fontWeight: "600" },
  duskBody: { color: "#F4E9FF", marginTop: space.sm, fontSize: 15, lineHeight: 21 },
  whiteTitle: { ...type.h2, color: colors.white },
  whiteBody: { color: colors.white, marginTop: 4 },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    marginBottom: space.md,
    gap: 4,
  },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tileTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
});
