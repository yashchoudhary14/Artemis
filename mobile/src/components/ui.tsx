import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarTints, colors, gradients, radius, space, type } from "@/theme";

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const insets = useSafeAreaInsets();
  const content = padded ? { paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: 120 } : { flex: 1 };
  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, content]}>{children}</View>
      )}
    </View>
  );
}

export function Brand({ right }: { right?: ReactNode }) {
  return (
    <View style={styles.brandRow}>
      <Text style={styles.brand}>☾ SafeWalk</Text>
      {right}
    </View>
  );
}

export function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={type.hero}>{title}</Text>
      {subtitle ? <Text style={[type.body, { color: colors.muted, marginTop: 6 }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style, onPress, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tint?: "lilac" | "pink" | "dusk" | "coral" }) {
  const bg =
    tint === "dusk"
      ? { backgroundColor: colors.lilacDeep, experimental_backgroundImage: gradients.dusk, borderColor: "transparent" }
      : tint === "coral"
        ? { backgroundColor: colors.coral, experimental_backgroundImage: gradients.sos, borderColor: "transparent" }
        : tint === "lilac"
          ? { backgroundColor: colors.lilacSoft }
          : tint === "pink"
            ? { backgroundColor: colors.pinkSoft }
            : null;
  const body = <View style={[styles.card, bg, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

type Variant = "dark" | "lilac" | "coral" | "ghost" | "soft";

export function PillButton({
  label,
  onPress,
  variant = "dark",
  disabled,
  loading,
  big,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pill,
        big && { minHeight: 58 },
        { backgroundColor: v.bg, borderColor: v.border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.pillText, big && { fontSize: 18 }, { color: v.fg }]}>{label}</Text>}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  dark: { bg: colors.dark, fg: colors.white, border: colors.dark },
  lilac: { bg: colors.lilac, fg: colors.white, border: colors.lilac },
  coral: { bg: colors.coral, fg: colors.white, border: colors.coral },
  ghost: { bg: "transparent", fg: colors.ink, border: colors.line },
  soft: { bg: colors.white, fg: colors.ink, border: colors.line },
};

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={type.h2}>{title}</Text>
      {action}
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  return <Text style={[type.small, style]}>{children}</Text>;
}

export function Field(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <Text style={[type.label, { marginBottom: 6 }]}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.faint} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Avatar({ name, index = 0, size = 46, onPress }: { name: string; index?: number; size?: number; onPress?: () => void }) {
  const circle = (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarTints[index % avatarTints.length] }]}>
      <Text style={{ fontSize: size * 0.4, color: colors.ink, fontWeight: "600" }}>{name.trim().charAt(0).toUpperCase() || "+"}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{circle}</Pressable> : circle;
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && { backgroundColor: colors.dark, borderColor: colors.dark }]}>
      <Text style={{ color: selected ? colors.white : colors.ink, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ text, tone = "lilac" }: { text: string; tone?: "lilac" | "amber" | "coral" | "green" }) {
  const t = {
    lilac: [colors.lilacSoft, colors.lilacDeep],
    amber: [colors.amberSoft, colors.amber],
    coral: [colors.coralSoft, "#9F1239"],
    green: [colors.greenSoft, colors.green],
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t[0] }]}>
      <Text style={{ color: t[1], fontSize: 14, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.sm }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, experimental_backgroundImage: gradients.screen },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.lg },
  brand: { fontFamily: type.title.fontFamily, fontSize: 20, color: colors.lilacDeep, fontWeight: "600" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
  },
  pill: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  pillText: { fontSize: 16, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm, marginTop: space.sm },
  input: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
    fontSize: 16,
    color: colors.ink,
  },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  banner: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginBottom: space.md },
});
