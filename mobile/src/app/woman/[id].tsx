import { router, useLocalSearchParams, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Portrait } from "@/components/art";
import { Button, FadeIn, Icon } from "@/components/ui";
import { WOMEN, womanById } from "@/lib/women";
import { colors, fonts, space } from "@/theme";

// One story on its own colour block.
export default function WomanStory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = womanById(id ?? "") ?? WOMEN[0];
  const next = WOMEN[(WOMEN.indexOf(w) + 1) % WOMEN.length];
  const pw = width - space.lg * 2;

  return (
    <View style={{ flex: 1, backgroundColor: w.spec.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: space.lg }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.logo}>{"Women\nRise"}</Text>
          <View style={{ width: 44 }} />
        </View>
        <FadeIn key={w.id}>
          <View style={styles.frame}>
            <Portrait spec={w.spec} width={pw} height={Math.round(pw * 1.15)} />
          </View>
          <Text style={[styles.role, { color: w.ink }]}>{w.role}</Text>
          <Text style={[styles.name, { color: w.ink }]}>{w.name}</Text>
          <Text style={[styles.headline, { color: w.ink }]}>{w.headline}</Text>
          {w.story.map((p, i) => (
            <Text key={i} style={[styles.para, { color: w.ink }]}>
              {p}
            </Text>
          ))}
          <Text style={[styles.note, { color: w.ink }]}>Illustration is a stylised tribute, not a likeness.</Text>
          <Button label={`Next: ${next.name}`} iconRight="arrow-forward" onPress={() => router.replace(`/woman/${next.id}` as Href)} style={{ alignSelf: "flex-start", marginTop: space.xl }} />
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.md },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  logo: { fontFamily: fonts.display, fontSize: 20, lineHeight: 20, color: colors.ink, textAlign: "center" },
  frame: { borderRadius: 28, overflow: "hidden", borderWidth: 4, borderColor: "rgba(255,255,255,0.75)", marginBottom: space.xl },
  role: { fontFamily: fonts.sansSemi, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", opacity: 0.8 },
  name: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, marginTop: 6, letterSpacing: -0.6 },
  headline: { fontFamily: fonts.serifBold, fontSize: 17, lineHeight: 26, marginTop: space.sm, marginBottom: space.md },
  para: { fontFamily: fonts.serif, fontSize: 15.5, lineHeight: 27, marginBottom: space.sm },
  note: { fontFamily: fonts.serifItalic, fontSize: 12, opacity: 0.65, marginTop: space.sm },
});
