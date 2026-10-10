import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PulseRings, type IconName } from "@/components/ui";
import { panicStore } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, fonts, shadows } from "@/theme";

// Floating glass pill with SOS raised in the middle: Home · Walk · SOS · Map · Help.
// "rise" (Women who rise) stays a route but is reached from Home, not from the bar.
const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Home", icon: "home-outline" },
  { name: "walk", label: "Walk", icon: "footsteps-outline" },
  { name: "sos", label: "SOS", icon: "alert-circle-outline" },
  { name: "map", label: "Map", icon: "map-outline" },
  { name: "help", label: "Help", icon: "heart-outline" },
];

function SosButton({ onPress }: { onPress: () => void }) {
  const panic = useStore(panicStore).active;
  return (
    <View style={styles.sosSlot}>
      <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={onPress} style={styles.sosOrb}>
        <PulseRings size={66} color={colors.sos} active={panic} />
        <View style={styles.sos}>
          <Text style={styles.sosText}>SOS</Text>
        </View>
      </Pressable>
    </View>
  );
}

function ArtemisTabBar({ state, navigation }: { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (name: string) => void } }) {
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]}>
      <View style={styles.bar}>
        {TABS.map((t) => {
          if (t.name === "sos") return <SosButton key={t.name} onPress={() => navigation.navigate("sos")} />;
          const on = current === t.name;
          return (
            <Pressable
              key={t.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t.label}
              onPress={() => navigation.navigate(t.name)}
              style={[styles.tab, on && styles.tabOn]}
            >
              <Icon name={(on ? t.icon.replace("-outline", "") : t.icon) as IconName} size={20} color={on ? colors.white : colors.inkSoft} />
              <Text style={[styles.label, { color: on ? colors.white : colors.inkSoft }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <ArtemisTabBar state={props.state} navigation={props.navigation as never} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="walk" options={{ title: "Walk" }} />
      <Tabs.Screen name="sos" options={{ title: "SOS" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="help" options={{ title: "Help" }} />
      <Tabs.Screen name="rise" options={{ title: "Women who rise" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14 },
  bar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    boxShadow: "0px 14px 34px rgba(70, 40, 55, 0.10)",
  },
  tab: { flex: 1, height: 56, marginHorizontal: 2, borderRadius: 28, alignItems: "center", justifyContent: "center", gap: 3 },
  tabOn: { backgroundColor: colors.dark },
  label: { fontFamily: fonts.sans, fontSize: 11 },
  sosSlot: { flex: 1, alignItems: "center" },
  sosOrb: { width: 76, height: 76, marginTop: -34, alignItems: "center", justifyContent: "center" },
  sos: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sos,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: colors.bg,
    boxShadow: shadows.sos,
  },
  sosText: { color: colors.white, fontFamily: fonts.sansSemi, fontSize: 17, letterSpacing: 0.5 },
});
