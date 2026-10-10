import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Crescent, Icon, prefersReducedMotion } from "@/components/ui";
import { saveJson } from "@/lib/storage";
import { colors, fonts } from "@/theme";
import { WELCOME_KEY } from "./(tabs)/index";

// First-run splash: a crescent moon drawn as a bow, an arrow sliding in, then the name.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const moon = useRef(new Animated.Value(0)).current;
  const arrow = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) {
      [moon, arrow, words].forEach((v) => v.setValue(1));
      return;
    }
    const t = (v: Animated.Value, d: number, delay: number) => Animated.timing(v, { toValue: 1, duration: d, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([t(moon, 1100, 0), t(arrow, 700, 900), t(words, 800, 1300)]).start();
  }, [moon, arrow, words]);

  const begin = async () => {
    await saveJson(WELCOME_KEY, true);
    router.replace("/");
  };

  return (
    <View style={[styles.page, { paddingBottom: insets.bottom + 30 }]}>
      <View style={styles.center}>
        <View style={styles.mark}>
          <Animated.View style={{ opacity: moon, transform: [{ rotate: moon.interpolate({ inputRange: [0, 1], outputRange: ["-30deg", "0deg"] }) }, { scale: moon.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
            <Crescent size={140} />
          </Animated.View>
          <Animated.View style={[styles.arrow, { opacity: arrow, transform: [{ translateX: arrow.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}>
            <View style={styles.shaft} />
            <Icon name="chevron-forward" size={20} color="#C9708D" style={{ marginLeft: -10 }} />
          </Animated.View>
        </View>
        <Animated.Text style={[styles.name, { opacity: words }]}>ARTEMIS</Animated.Text>
        <Animated.Text style={[styles.line, { opacity: words }]}>She watches over{"\n"}every walk home.</Animated.Text>
      </View>
      <Animated.View style={{ opacity: words, gap: 14, alignItems: "stretch" }}>
        <Button label="Get started" size="lg" onPress={begin} />
        <Pressable onPress={begin} accessibilityRole="button" style={{ alignItems: "center", padding: 6 }}>
          <Text style={styles.sub}>I already have an account</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, backgroundColor: colors.bg, experimental_backgroundImage: "radial-gradient(90% 45% at 50% 38%, #F4E2E7 0%, rgba(244,226,231,0) 70%), linear-gradient(180deg, #F7F4F3 0%, #F7F4F3 100%)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mark: { width: 170, height: 150, alignItems: "center", justifyContent: "center" },
  arrow: { position: "absolute", left: 10, right: 0, top: 64, flexDirection: "row", alignItems: "center" },
  shaft: { flex: 1, height: 2, borderRadius: 1, backgroundColor: "#C9708D" },
  name: { fontFamily: fonts.mark, fontSize: 34, letterSpacing: 12, paddingLeft: 12, color: colors.ink, marginTop: 36 },
  line: { fontFamily: fonts.serifItalic, fontSize: 24, lineHeight: 31, color: "#5E5861", textAlign: "center", marginTop: 16 },
  sub: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkSoft },
});
