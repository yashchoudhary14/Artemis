import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Collage } from "@/components/art";
import {
  Avatar,
  BrandHandle,
  Button,
  Chip,
  ChipRow,
  FadeIn,
  FeatureCard,
  Header,
  HeaderIcon,
  Hero,
  InputPill,
  Pressy,
  Row,
  Screen,
  SectionTitle,
  StackedCards,
  StatusPill,
} from "@/components/ui";
import { meStore } from "@/lib/account";
import { panicStore } from "@/lib/panic";
import { sessionStore } from "@/lib/session";
import { useStore } from "@/lib/store";
import { suspicionStore } from "@/lib/suspicion";
import { insideZoneStore, zonesStore } from "@/lib/zones";
import { colors, fonts, space, type } from "@/theme";

function question() {
  const h = new Date().getHours();
  if (h >= 18 || h < 5) return "Ready to walk home safe tonight?";
  if (h < 12) return "Where are you headed this morning?";
  return "Where are you headed today?";
}

export default function Home() {
  const { me } = useStore(meStore);
  const active = useStore(sessionStore);
  const panic = useStore(panicStore);
  const listening = useStore(suspicionStore).listening;
  const zone = useStore(insideZoneStore);
  const zones = useStore(zonesStore);
  const [dest, setDest] = useState("");
  const circle = me?.contacts ?? [];
  const linked = circle.filter((c) => c.linked).length;
  const handle = (me?.name ?? "safewalk").split(" ")[0].toLowerCase();

  const go = () => {
    router.push({ pathname: "/walk", params: dest.trim() ? { destination: dest.trim() } : {} });
    setDest("");
  };

  return (
    <Screen
      header={
        <Header
          left={<BrandHandle name={handle} onPress={() => router.push("/profile")} />}
          right={
            <>
              <HeaderIcon icon="add" label="Start a walk" onPress={() => router.push("/walk")} />
              <HeaderIcon icon="ellipsis-horizontal" label="Profile and settings" onPress={() => router.push("/profile")} />
            </>
          }
        />
      }
    >
      <FadeIn>
        <Hero
          title={question()}
          accent={panic.active ? "SOS is on" : active ? (zone.inside ? "Private zone · sharing paused" : "Your circle can see you") : "SafeWalk is with you"}
          accentIcon={panic.active ? "radio" : "sync-outline"}
        />
      </FadeIn>

      <FadeIn index={1}>
        <ChipRow>
          <Chip icon="footsteps-outline" label="Start a walk" onPress={() => router.push("/walk")} />
          <Chip icon="mic-outline" label="I feel uneasy" onPress={() => router.push("/uneasy")} />
          <Chip icon="location-outline" label="Private zones" onPress={() => router.push("/zones")} />
          <Chip icon="people-outline" label="Walk together" onPress={() => router.push("/buddy")} />
          <Chip icon="medkit-outline" label="Help nearby" onPress={() => router.push("/help")} />
        </ChipRow>
      </FadeIn>

      {/* Status — stacked like "Saved Insights" */}
      <FadeIn index={2}>
        <StackedCards
          behind={[
            { title: `Your circle · ${linked}/${circle.length} linked`, icon: "people-outline" },
            { title: `Private zones · ${zones.length} saved`, icon: "location-outline" },
          ]}
        >
          {panic.active ? (
            <Pressy onPress={() => router.push("/sos")} accessibilityLabel="Open SOS">
              <Row style={{ justifyContent: "space-between", marginBottom: space.xs }}>
                <StatusPill text="SOS active" tone="sos" pulse />
                <Text style={type.small}>{panic.alertSent ? "Circle alerted" : "Sending…"}</Text>
              </Row>
              <Text style={type.title}>Help is on the way to your circle.</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>Recording audio and sharing your location every 5 seconds. Tap to see who got the message.</Text>
            </Pressy>
          ) : active ? (
            <Pressy onPress={() => router.push(active.kind === "suspicion" ? "/uneasy" : "/walk")} accessibilityLabel="Open your session">
              <Row style={{ justifyContent: "space-between", marginBottom: space.xs }}>
                <StatusPill text={zone.inside ? "Sharing paused" : "Live"} tone={zone.inside ? "safe" : "magenta"} pulse={!zone.inside} />
                <Text style={type.small}>{listening ? "Listening for your words" : "15 s updates"}</Text>
              </Row>
              <Text style={type.title}>{active.kind === "suspicion" ? "Staying with you." : `Walking${active.destination ? ` to ${active.destination}` : ""}.`}</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>
                {zone.inside ? `You're inside ${zone.zoneName ?? "a private zone"}, so nothing is shared here.` : "Your circle can follow your live location until you end it with your PIN."}
              </Text>
            </Pressy>
          ) : (
            <>
              <Row style={{ gap: space.xs, marginBottom: space.xs }}>
                <Avatar name={me?.name ?? "S"} size={30} index={1} />
                <View>
                  <Text style={[type.cardTitle, { fontSize: 14 }]}>Tonight's check-in</Text>
                  <Text style={[type.small, { fontSize: 11.5 }]}>Nothing running</Text>
                </View>
              </Row>
              <Text style={[type.title, { fontSize: 20, lineHeight: 28 }]}>Every walk is better when someone's watching out.</Text>
              <Text style={[type.bodySoft, { marginTop: 6 }]}>Start a walk and your circle can follow you live. Miss your check-in and they hear from SafeWalk.</Text>
              <Button label="Start a walk" iconRight="arrow-forward" size="sm" onPress={() => router.push("/walk")} style={{ alignSelf: "flex-start", marginTop: space.md }} />
            </>
          )}
        </StackedCards>
      </FadeIn>

      <FadeIn index={3}>
        <SectionTitle title="Your circle" icon="options-outline" onIcon={() => router.push("/profile")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg }}>
          {circle.map((c, i) => (
            <View key={c.id} style={styles.member}>
              <Avatar name={c.name} index={i} size={58} square />
              <Text style={styles.memberName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={[type.small, { fontSize: 11, color: c.linked ? colors.safe : colors.inkFaint }]}>{c.linked ? "linked" : "not linked"}</Text>
            </View>
          ))}
          <Pressy onPress={() => router.push("/profile")} accessibilityLabel="Add someone to your circle">
            <View style={styles.member}>
              <View style={styles.add}>
                <Text style={{ fontSize: 26, color: colors.inkSoft, fontFamily: fonts.sans }}>+</Text>
              </View>
              <Text style={styles.memberName}>Add</Text>
            </View>
          </Pressy>
        </ScrollView>
      </FadeIn>

      <FadeIn index={4}>
        <SectionTitle title="Made for your walk home" icon="funnel-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg, marginBottom: space.lg }}>
          <FeatureCard art={<Collage icon="mic" tones={["#FAD3E0", "#F3A9C4"]} />} title="Feeling uneasy?" text="Say “bachao” and your circle is alerted at once, with audio." onPress={() => router.push("/uneasy")} />
          <FeatureCard art={<Collage icon="people" tones={["#E6DDFB", "#C3B0F0"]} accent={colors.lilac} />} title="Walk together" text="Match with verified students going your way, ±15 minutes." onPress={() => router.push("/buddy")} />
          <FeatureCard art={<Collage icon="location" tones={["#FFE3D3", "#F6BFA0"]} accent="#C25E2E" />} title="Private zones" text="Home and hostel stay private. Checked only on your phone." onPress={() => router.push("/zones")} />
          <FeatureCard art={<Collage icon="sparkles" tones={["#FCE7B2", "#F5C451"]} accent="#9A6A00" />} title="Women who rise" text="Stories of women in powerful roles, to walk taller." onPress={() => router.push("/rise")} />
        </ScrollView>
      </FadeIn>

      <FadeIn index={5}>
        <InputPill value={dest} onChangeText={setDest} placeholder="Where are you going?" onPlus={() => router.push("/walk")} onSubmit={go} icon="arrow-forward-circle" />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  member: { alignItems: "center", width: 66 },
  memberName: { fontFamily: fonts.serif, fontSize: 12.5, color: colors.ink, marginTop: 6 },
  add: {
    width: 58,
    height: 58,
    borderRadius: 13,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(26,23,28,0.2)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
