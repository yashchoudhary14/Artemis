import { Tabs } from "expo-router/js-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, PulseRings, type IconName } from "@/components/ui";
import { panicStore } from "@/lib/panic";
import { useStore } from "@/lib/store";
import { colors, fonts, gradients, shadows } from "@/theme";

// Bottom bar like the reference: plain white, thin outline icons, small serif labels.
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <Icon name={(focused ? name.replace("-outline", "") : name) as IconName} size={22} color={focused ? colors.ink : colors.inkFaint} />;
}

function SosTab({ onPress }: { onPress?: (...args: any[]) => void }) {
  const panic = useStore(panicStore).active;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="SOS" onPress={onPress} style={styles.sosWrap}>
      <View style={styles.sosOrb}>
        <PulseRings size={50} color={colors.sos} active={panic} />
        <View style={styles.sos}>
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
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: [styles.bar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + 6 }],
        tabBarLabelStyle: { fontFamily: fonts.serif, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon name="compass-outline" focused={focused} /> }} />
      <Tabs.Screen name="walk" options={{ title: "Walk", tabBarIcon: ({ focused }) => <TabIcon name="footsteps-outline" focused={focused} /> }} />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarButton: (props) => <SosTab onPress={props.onPress ?? undefined} />,
        }}
      />
      <Tabs.Screen name="help" options={{ title: "Help", tabBarIcon: ({ focused }) => <TabIcon name="medkit-outline" focused={focused} /> }} />
      <Tabs.Screen name="rise" options={{ title: "Rise", tabBarIcon: ({ focused }) => <TabIcon name="sparkles-outline" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: 6,
    backgroundColor: "rgba(253,248,250,0.97)",
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    elevation: 0,
  },
  sosWrap: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 2 },
  sosOrb: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  sos: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.sos,
    experimental_backgroundImage: gradients.sos,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: shadows.sos,
    borderWidth: 3,
    borderColor: colors.white,
  },
  sosText: { color: colors.white, fontFamily: fonts.sansBold, fontSize: 12.5, letterSpacing: 0.6 },
});
