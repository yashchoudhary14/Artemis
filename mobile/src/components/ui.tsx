import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { avatarTints, colors, fonts, gradients, motion, radius, shadows, space, type } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// ---------- motion helpers ----------

let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion = v));
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => (reduceMotion = v));
export const prefersReducedMotion = () => reduceMotion;

/** Fades + slides content in on mount; `index` staggers siblings. */
export function FadeIn({ children, index = 0, style, from = 14 }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: motion.slow,
      delay: index * motion.stagger,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v, index]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Pressable with a soft scale-down (no layout shift). */
export function Pressy({
  children,
  onPress,
  onLongPress,
  delayLongPress,
  onPressIn,
  onPressOut,
  style,
  disabled,
  accessibilityLabel,
  scaleTo = 0.97,
  hitSlop,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
  scaleTo?: number;
  hitSlop?: number;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      onPressIn={() => {
        to(scaleTo);
        onPressIn?.();
      }}
      onPressOut={() => {
        to(1);
        onPressOut?.();
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- layout ----------

export function Screen({ children, scroll = true, bottomInset = 128, background = gradients.screen }: { children: ReactNode; scroll?: boolean; bottomInset?: number; background?: string }) {
  const insets = useSafeAreaInsets();
  const content = { paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: bottomInset + insets.bottom };
  return (
    <View style={[styles.screen, { experimental_backgroundImage: background }]}>
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

export function Icon({ name, size = 22, color = colors.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} accessibilityElementsHidden importantForAccessibility="no" />;
}

/** Brand mark: crescent in a soft orb + spaced wordmark, like the Artemis header. */
export function Brand({ right, light }: { right?: ReactNode; light?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandLeft}>
        <View style={[styles.brandOrb, light && { backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.25)" }]}>
          <Icon name="moon" size={16} color={light ? colors.white : colors.violet} />
        </View>
        <View>
          <Text style={[styles.brandWord, light && { color: colors.white }]}>SAFEWALK</Text>
          <Text style={[styles.brandTag, light && { color: "rgba(255,255,255,0.7)" }]}>Your space. Your pace.</Text>
        </View>
      </View>
      {right}
    </View>
  );
}

export function BackHeader({ title, onBack, right, light }: { title?: string; onBack: () => void; right?: ReactNode; light?: boolean }) {
  return (
    <View style={styles.backRow}>
      <IconButton icon="chevron-back" onPress={onBack} label="Back" light={light} />
      {title ? <Text style={[styles.backTitle, light && { color: colors.white }]}>{title}</Text> : <View style={{ flex: 1 }} />}
      <View style={{ width: 44, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, label, light, size = 44 }: { icon: IconName; onPress?: () => void; label: string; light?: boolean; size?: number }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.92}>
      <View style={[light ? styles.iconBtnLight : styles.iconBtn, { width: size, height: size, borderRadius: size / 2 }]}>
        <Icon name={icon} size={20} color={light ? colors.white : colors.ink} />
      </View>
    </Pressy>
  );
}

export function Hero({ title, accent, subtitle, eyebrow, light }: { title: string; accent?: string; subtitle?: string; eyebrow?: string; light?: boolean }) {
  return (
    <View style={{ marginBottom: space.xl }}>
      {eyebrow ? <Text style={[type.bodyMedium, { color: light ? "rgba(255,255,255,0.75)" : colors.inkSoft, marginBottom: 6 }]}>{eyebrow}</Text> : null}
      <Text style={[type.display, light && { color: colors.white }]}>
        {title}
        {accent ? <Text style={{ fontFamily: fonts.displayItalic, color: light ? colors.roseSoft : colors.violet }}>{accent}</Text> : null}
      </Text>
      {subtitle ? <Text style={[type.body, { color: light ? "rgba(255,255,255,0.78)" : colors.inkSoft, marginTop: 8 }]}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------- surfaces ----------

type Tone = "glass" | "violet" | "dusk" | "night" | "sos" | "rose" | "safe" | "violetSoft";

const TONES: Record<Tone, ViewStyle> = {
  glass: { backgroundColor: colors.glass, experimental_backgroundImage: gradients.glass, borderColor: colors.glassBorder, boxShadow: shadows.card },
  violet: { backgroundColor: colors.violet, experimental_backgroundImage: gradients.violet, borderColor: "transparent", boxShadow: shadows.violet },
  violetSoft: { backgroundColor: colors.violetWash, experimental_backgroundImage: gradients.violetSoft, borderColor: "rgba(255,255,255,0.8)", boxShadow: shadows.soft },
  dusk: { backgroundColor: colors.plum, experimental_backgroundImage: gradients.dusk, borderColor: "transparent", boxShadow: shadows.dark },
  night: { backgroundColor: colors.plumDeep, experimental_backgroundImage: gradients.night, borderColor: "rgba(255,255,255,0.08)", boxShadow: shadows.dark },
  sos: { backgroundColor: colors.sos, experimental_backgroundImage: gradients.sos, borderColor: "transparent", boxShadow: shadows.sos },
  rose: { backgroundColor: colors.roseWash, experimental_backgroundImage: gradients.rose, borderColor: "rgba(255,255,255,0.8)", boxShadow: shadows.soft },
  safe: { backgroundColor: colors.safeWash, experimental_backgroundImage: gradients.safe, borderColor: "rgba(255,255,255,0.8)", boxShadow: shadows.soft },
};

export function Card({ children, style, onPress, tone = "glass", padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: Tone; padded?: boolean }) {
  const body = <View style={[styles.card, TONES[tone], padded && { padding: space.lg }, style]}>{children}</View>;
  return onPress ? <Pressy onPress={onPress}>{body}</Pressy> : body;
}

export function IconCircle({ icon, tint = colors.violetWash, color = colors.violet, size = 44 }: { icon: IconName; tint?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={size * 0.46} color={color} />
    </View>
  );
}

export function ListRow({
  icon,
  tint,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: IconName;
  tint?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.listRow, !last && styles.listDivider]}>
      {icon ? <IconCircle icon={icon} tint={tint} color={iconColor} size={42} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{title}</Text>
        {subtitle ? <Text style={[type.small, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={colors.inkFaint} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function SectionHeader({ title, action, onAction, light }: { title: string; action?: string; onAction?: () => void; light?: boolean }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[type.h2, light && { color: colors.white }]}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text style={[type.smallBold, { color: light ? colors.roseSoft : colors.violet }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- controls ----------

type Variant = "dark" | "violet" | "sos" | "glass" | "ghost" | "light";

const BTN: Record<Variant, { box: ViewStyle; fg: string }> = {
  dark: { box: { backgroundColor: colors.ink, boxShadow: shadows.dark }, fg: colors.white },
  violet: { box: { backgroundColor: colors.violet, experimental_backgroundImage: gradients.violet, boxShadow: shadows.violet }, fg: colors.white },
  sos: { box: { backgroundColor: colors.sos, experimental_backgroundImage: gradients.sos, boxShadow: shadows.sos }, fg: colors.white },
  glass: { box: { backgroundColor: colors.glassStrong, borderWidth: 1, borderColor: colors.glassBorder, boxShadow: shadows.soft }, fg: colors.ink },
  ghost: { box: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(74,40,102,0.16)" }, fg: colors.ink },
  light: { box: { backgroundColor: colors.white, boxShadow: shadows.soft }, fg: colors.ink },
};

export function Button({
  label,
  onPress,
  variant = "dark",
  icon,
  iconRight,
  disabled,
  loading,
  size = "md",
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const v = BTN[variant];
  const h = size === "lg" ? 60 : size === "sm" ? 42 : 52;
  return (
    <Pressy onPress={onPress} disabled={disabled || loading} accessibilityLabel={label} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <View style={[styles.btn, { minHeight: h, paddingHorizontal: size === "sm" ? 16 : 24 }, v.box]}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={size === "sm" ? 16 : 19} color={v.fg} /> : null}
            <Text style={[type.button, { color: v.fg, fontSize: size === "lg" ? 17 : size === "sm" ? 14 : 16 }]}>{label}</Text>
            {iconRight ? <Icon name={iconRight} size={size === "sm" ? 16 : 19} color={v.fg} /> : null}
          </>
        )}
      </View>
    </Pressy>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.95}>
      <View style={[styles.chip, selected && styles.chipOn]}>
        {icon ? <Icon name={icon} size={15} color={selected ? colors.white : colors.inkSoft} /> : null}
        <Text style={[type.smallBold, { color: selected ? colors.white : colors.ink }]}>{label}</Text>
      </View>
    </Pressy>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, on && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {o.icon ? <Icon name={o.icon} size={15} color={on ? colors.white : colors.inkSoft} /> : null}
            <Text style={[type.smallBold, { color: on ? colors.white : colors.inkSoft }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatusPill({ text, tone = "violet", pulse }: { text: string; tone?: "violet" | "safe" | "sos" | "amber" | "light"; pulse?: boolean }) {
  const t = {
    violet: [colors.violetWash, colors.violet],
    safe: [colors.safeWash, colors.safe],
    sos: [colors.sosWash, colors.sosDeep],
    amber: [colors.amberWash, colors.amber],
    light: ["rgba(255,255,255,0.16)", colors.white],
  }[tone];
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, v]);
  return (
    <View style={[styles.pill, { backgroundColor: t[0] }]}>
      <Animated.View style={[styles.pillDot, { backgroundColor: t[1], opacity: v }]} />
      <Text style={[type.smallBold, { color: t[1] }]}>{text}</Text>
    </View>
  );
}

export function Banner({ text, tone = "violet", icon }: { text: string; tone?: "violet" | "amber" | "sos" | "safe"; icon?: IconName }) {
  const t = {
    violet: [colors.violetWash, colors.violet, "information-circle"],
    amber: [colors.amberWash, colors.amber, "warning"],
    sos: [colors.sosWash, colors.sosDeep, "alert-circle"],
    safe: [colors.safeWash, colors.safe, "checkmark-circle"],
  }[tone] as [string, string, IconName];
  return (
    <View style={[styles.banner, { backgroundColor: t[0] }]}>
      <Icon name={icon ?? t[2]} size={18} color={t[1]} />
      <Text style={[type.small, { color: t[1], flex: 1, fontFamily: fonts.sansMedium }]}>{text}</Text>
    </View>
  );
}

export function Field({ label, icon, style, ...rest }: TextInputProps & { label?: string; icon?: IconName }) {
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <Text style={[type.label, { marginBottom: 8 }]}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <Icon name={icon} size={18} color={colors.inkFaint} /> : null}
        <TextInput placeholderTextColor={colors.inkFaint} style={[styles.input, style]} {...rest} />
      </View>
    </View>
  );
}

export function Avatar({ name, index = 0, size = 48, ring, onPress }: { name: string; index?: number; size?: number; ring?: boolean; onPress?: () => void }) {
  const circle = (
    <View style={[ring && { padding: 3, borderRadius: size, borderWidth: 2, borderColor: colors.violetSoft }]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          experimental_backgroundImage: avatarTints[index % avatarTints.length],
          backgroundColor: colors.roseSoft,
          borderWidth: 2,
          borderColor: colors.white,
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.42, color: colors.plum }}>{name.trim().charAt(0).toUpperCase()}</Text>
      </View>
    </View>
  );
  return onPress ? (
    <Pressy onPress={onPress} accessibilityLabel={name} scaleTo={0.92}>
      {circle}
    </Pressy>
  ) : (
    circle
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.small, style]}>{children}</Text>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.xs }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: space.sm }} />;
}

/** Pulsing glow rings behind an orb (SOS, listening mic). */
export function PulseRings({ size, color, active = true }: { size: number; color: string; active?: boolean }) {
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!active || reduceMotion) return;
    const loops = rings.map((r, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 730),
          Animated.timing(r, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [rings, active]);
  if (!active) return null;
  return (
    <>
      {rings.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
          }}
        />
      ))}
    </>
  );
}

/** Animated voice bars for "listening" / "recording". */
export function Waveform({ bars = 13, color = colors.violet, active = true, height = 46 }: { bars?: number; color?: string; active?: boolean; height?: number }) {
  const vals = useRef(Array.from({ length: bars }, () => new Animated.Value(0.3))).current;
  useEffect(() => {
    if (!active || reduceMotion) return;
    const loops = vals.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 0.3 + Math.random() * 0.7, duration: 260 + ((i * 37) % 200), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0.2 + Math.random() * 0.3, duration: 260 + ((i * 53) % 220), useNativeDriver: true }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, vals]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height }}>
      {vals.map((v, i) => {
        const edge = Math.min(i, bars - 1 - i) / (bars / 2);
        return (
          <Animated.View
            key={i}
            style={{
              width: 4,
              height,
              borderRadius: 2,
              backgroundColor: color,
              opacity: 0.35 + edge * 0.65,
              transform: [{ scaleY: active ? v : 0.15 }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.xl },
  brandLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandOrb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.soft,
  },
  brandWord: { fontFamily: fonts.sansBold, fontSize: 14, letterSpacing: 4, color: colors.ink },
  brandTag: { fontFamily: fonts.displayItalic, fontSize: 12, color: colors.inkSoft, marginTop: 1 },
  backRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg },
  backTitle: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  iconBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: shadows.soft,
  },
  iconBtnLight: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  card: { borderRadius: radius.lg, borderWidth: 1, marginBottom: space.md, overflow: "hidden" },
  listRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 14 },
  listDivider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: space.md, marginBottom: space.sm },
  btn: { borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    boxShadow: "0px 3px 10px rgba(74,40,102,0.06)",
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink, boxShadow: shadows.dark },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: radius.pill,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: space.md,
    boxShadow: shadows.soft,
  },
  segItem: { flex: 1, minHeight: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  segOn: { backgroundColor: colors.ink },
  pill: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: radius.sm, paddingVertical: 12, paddingHorizontal: 14, marginBottom: space.md },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(74,40,102,0.12)",
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 16, color: colors.ink, paddingVertical: 12 },
});
