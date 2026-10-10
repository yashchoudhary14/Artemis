import { router, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Portrait } from "@/components/art";
import { Button, FadeIn, Icon, Pressy, prefersReducedMotion } from "@/components/ui";
import { WOMEN } from "@/lib/women";
import { colors, fonts, space } from "@/theme";

// "Women in powerful roles" — styled after the Women Rise reference: illustrated portraits on
// full-bleed colour blocks with a heavy display serif.
export default function Rise() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setI((x) => (x + 1) % WOMEN.length), 3200);
    return () => clearInterval(t);
  }, []);

  const hero = WOMEN[i];
  const heroH = Math.round(width * 1.08);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFDFB" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.logo}>{"Women\nRise"}</Text>
          <Pressable onPress={() => router.push("/profile")} style={styles.menu} accessibilityRole="button" accessibilityLabel="Profile and settings">
            <Icon name="menu" size={20} color={colors.white} />
          </Pressable>
        </View>

        {/* Hero: cycling portraits with the big statement over them */}
        <Pressable onPress={() => router.push(`/woman/${hero.id}` as Href)} accessibilityRole="button" accessibilityLabel={`${hero.name}, ${hero.role}`}>
          <FadeIn key={hero.id} from={0}>
            <Portrait spec={{ ...hero.spec, bg: "#FFFDFB", pattern: undefined }} width={width} height={heroH} />
          </FadeIn>
          <View style={styles.heroText} pointerEvents="none">
            <Text style={styles.heroTitle}>{"Women in\npowerful\nroles"}</Text>
          </View>
          <View style={styles.caption} pointerEvents="none">
            <Text style={styles.captionName}>{hero.name}</Text>
            <Text style={styles.captionRole}>{hero.role}</Text>
          </View>
        </Pressable>

        <View style={styles.intro}>
          <Text style={styles.introTitle}>They took up space.{"\n"}So can you.</Text>
          <Text style={styles.introBody}>
            Police officers, pilots, presidents, scientists. Real women who went first — so the path is a little easier for whoever walks it next.
          </Text>
        </View>

        {WOMEN.map((w, idx) => (
          <Pressy key={w.id} onPress={() => router.push(`/woman/${w.id}` as Href)} accessibilityLabel={`${w.name}, ${w.role}`} scaleTo={0.985}>
            <View style={[styles.block, { backgroundColor: w.spec.bg, flexDirection: idx % 2 ? "row-reverse" : "row" }]}>
              <View style={styles.thumb}>
                <Portrait spec={w.spec} width={138} height={168} />
              </View>
              <View style={{ flex: 1, paddingHorizontal: space.md }}>
                <Text style={[styles.role, { color: w.ink }]}>{w.role}</Text>
                <Text style={[styles.name, { color: w.ink }]}>{w.name}</Text>
                <Text style={[styles.headline, { color: w.ink }]}>{w.headline}</Text>
                <View style={styles.readRow}>
                  <Text style={[styles.read, { color: w.ink }]}>Read her story</Text>
                  <Icon name="arrow-forward" size={14} color={w.ink} />
                </View>
              </View>
            </View>
          </Pressy>
        ))}

        <View style={styles.outro}>
          <Text style={styles.outroTitle}>Walk taller{"\n"}tonight.</Text>
          <Text style={styles.outroBody}>Your circle is one tap away, every step of the way.</Text>
          <Button label="Start a walk" iconRight="arrow-forward" variant="light" onPress={() => router.push("/walk")} style={{ alignSelf: "flex-start", marginTop: space.lg }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingBottom: space.sm },
  logo: { fontFamily: fonts.display, fontSize: 22, lineHeight: 22, color: colors.ink, letterSpacing: -0.5 },
  menu: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  heroText: { position: "absolute", left: space.lg, bottom: space.xl },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 46,
    lineHeight: 46,
    color: "#F4B9C7",
    letterSpacing: -1,
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowRadius: 14,
  },
  caption: { position: "absolute", right: space.lg, top: space.lg, alignItems: "flex-end", backgroundColor: "rgba(255,255,255,0.85)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  captionName: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  captionRole: { fontFamily: fonts.sans, fontSize: 11, color: colors.inkSoft },
  intro: { paddingHorizontal: space.lg, paddingVertical: space.xxl },
  introTitle: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.ink, letterSpacing: -0.5 },
  introBody: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 25, color: colors.inkSoft, marginTop: space.md },
  block: { alignItems: "center", paddingVertical: space.lg, paddingHorizontal: space.lg },
  thumb: { width: 138, height: 168, borderRadius: 18, overflow: "hidden", borderWidth: 3, borderColor: "rgba(255,255,255,0.7)" },
  role: { fontFamily: fonts.sansSemi, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8 },
  name: { fontFamily: fonts.display, fontSize: 25, lineHeight: 28, marginTop: 4, letterSpacing: -0.3 },
  headline: { fontFamily: fonts.serif, fontSize: 13.5, lineHeight: 20, marginTop: 6 },
  readRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.sm },
  read: { fontFamily: fonts.serifBold, fontSize: 13 },
  outro: { backgroundColor: colors.ink, paddingHorizontal: space.lg, paddingVertical: space.xxxl },
  outroTitle: { fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: colors.white, letterSpacing: -0.5 },
  outroBody: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, color: "rgba(255,255,255,0.75)", marginTop: space.sm },
});
