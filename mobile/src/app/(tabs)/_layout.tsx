import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PulseRings, type IconName } from "@/components/ui";
import { panicStore } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, shadows } from "@/theme";

// Floating glass tab bar: Home / Walk / SOS (raised coral orb) / Help / Rise.
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconOn]}>
      <Icon name={(focused ? name.replace("-outline", "") : name) as IconName} size={21} color={focused ? colors.violet : colors.inkFaint} />
    </View>
  );
}

function SosButton({ onPress }: { onPress?: (...args: any[]) => void }) {
  const panic = useStore(panicStore).active;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={onPress} style={styles.sosWrap}>
      <View style={styles.sosHalo}>
        <PulseRings size={64} color={colors.sos} active={panic} />
        <View style={styles.sos}>
          <Icon name="call" size={18} color={colors.white} />
          <Text style={styles.sosText}>SOS</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.violet,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: [styles.bar, { bottom: Math.max(insets.bottom, 10) + 6 }],
        tabBarItemStyle: { paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 11, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} /> }} />
      <Tabs.Screen name="walk" options={{ title: "Walk", tabBarIcon: ({ focused }) => <TabIcon name="walk-outline" focused={focused} /> }} />
      <Tabs.Screen
        name="sos"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => <SosButton onPress={props.onPress ?? undefined} />,
        }}
      />
      <Tabs.Screen name="help" options={{ title: "Help", tabBarIcon: ({ focused }) => <TabIcon name="medkit-outline" focused={focused} /> }} />
      <Tabs.Screen name="rise" options={{ title: "Rise", tabBarIcon: ({ focused }) => <TabIcon name="sparkles-outline" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 74,
    borderRadius: 30,
    borderTopWidth: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    boxShadow: shadows.lifted,
    elevation: 0,
    paddingBottom: 8,
  },
  iconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconOn: { backgroundColor: colors.violetWash },
  sosWrap: { flex: 1, alignItems: "center" },
  sosHalo: {
    marginTop: -26,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    boxShadow: shadows.soft,
  },
  sos: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.sos,
  },
  sosText: { color: colors.white, fontFamily: fonts.sansExtra, fontSize: 12, letterSpacing: 1, marginTop: -1 },
});
