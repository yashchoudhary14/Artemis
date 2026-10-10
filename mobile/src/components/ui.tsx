import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
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
import { colors, fonts, gradients, motion, radius, shadows, space, type } from "@/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// ---------- motion ----------

let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion = v));
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => (reduceMotion = v));
export const prefersReducedMotion = () => reduceMotion;

export function FadeIn({ children, index = 0, style, from = 12 }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle>; from?: number }) {
  const v = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(v, { toValue: 1, duration: motion.slow, delay: index * motion.stagger, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, index]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

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
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 5 }).start();
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

export function Icon({ name, size = 20, color = colors.ink, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Ionicons name={name} size={size} color={color} style={style} accessibilityElementsHidden importantForAccessibility="no" />;
}

// ---------- layout ----------

/** Page with the pink wash. `header` stays fixed; content scrolls under it. */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  bottomInset = 120,
  background = gradients.screen,
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  bottomInset?: number;
  background?: string;
}) {
  const insets = useSafeAreaInsets();
  const pad = { paddingHorizontal: space.lg, paddingTop: header ? space.xs : insets.top + space.md, paddingBottom: bottomInset + insets.bottom };
  return (
    <View style={[styles.screen, { experimental_backgroundImage: background }]}>
      {header ? <View style={{ paddingTop: insets.top + 4, paddingHorizontal: space.md }}>{header}</View> : null}
      {scroll ? (
        <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function HeaderIcon({ icon, onPress, label, color = colors.ink, size = 22 }: { icon: IconName; onPress?: () => void; label: string; color?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={10} style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.5 }]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** Centered serif title with an optional magenta accent line ("SMM model ⟳" in the reference). */
export function Header({ title, accent, accentIcon, left, right, light }: { title?: string; accent?: string; accentIcon?: IconName; left?: ReactNode; right?: ReactNode; light?: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>{left}</View>
      <View style={{ flex: 1, alignItems: "center" }}>
        {title ? (
          <Text style={[type.header, light && { color: colors.white }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {accent ? (
          <View style={styles.accentRow}>
            <Text style={type.accent}>{accent}</Text>
            {accentIcon ? <Icon name={accentIcon} size={12} color={colors.magenta} /> : null}
          </View>
        ) : null}
      </View>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

/** "safewalk ⌄" brand switch like "romankivv ⌄". */
export function BrandHandle({ name, onPress }: { name: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.handle} accessibilityRole="button" accessibilityLabel="Your profile" hitSlop={8}>
      <Text style={[type.header, { fontSize: 15 }]} numberOfLines={1}>
        {name}
      </Text>
      <Icon name="chevron-down" size={14} color={colors.ink} />
    </Pressable>
  );
}

/** Big centered serif statement + magenta accent line. */
export function Hero({ title, accent, accentIcon, style }: { title: string; accent?: string; accentIcon?: IconName; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ alignItems: "center", paddingHorizontal: space.sm, marginTop: space.md, marginBottom: space.xl }, style]}>
      <Text style={type.hero}>{title}</Text>
      {accent ? (
        <View style={[styles.accentRow, { marginTop: space.sm }]}>
          <Text style={type.accent}>{accent}</Text>
          {accentIcon ? <Icon name={accentIcon} size={13} color={colors.magenta} /> : null}
        </View>
      ) : null}
    </View>
  );
}

export function SectionTitle({ title, icon, onIcon, action, onAction }: { title: string; icon?: IconName; onIcon?: () => void; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={type.section}>{title}</Text>
      {icon ? <HeaderIcon icon={icon} label={title} onPress={onIcon} size={18} color={colors.inkSoft} /> : null}
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <Text style={[type.label, { color: colors.magenta }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- surfaces ----------

export function Card({ children, style, onPress, padded = true, tint }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; padded?: boolean; tint?: string }) {
  const body = <View style={[styles.card, padded && { padding: space.md }, tint ? { backgroundColor: tint } : null, style]}>{children}</View>;
  return onPress ? <Pressy onPress={onPress}>{body}</Pressy> : body;
}

/** Chat bubble. `side` decides alignment; `time` shows "11:23 ✓✓" like the reference. */
export function Bubble({ children, side = "left", time, read, style }: { children: ReactNode; side?: "left" | "right"; time?: string; read?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bubble, side === "right" ? styles.bubbleRight : styles.bubbleLeft, style]}>
      {children}
      {time ? (
        <View style={styles.bubbleMeta}>
          <Text style={[type.small, { fontSize: 11, fontStyle: "italic" }]}>{time}</Text>
          {read !== undefined ? <Icon name={read ? "checkmark-done" : "checkmark"} size={13} color={read ? colors.safe : colors.inkFaint} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** Horizontal feature card: art on top, serif title, grey copy ("No-Buy 2025" in the reference). */
export function FeatureCard({ art, title, text, onPress, width = 168 }: { art: ReactNode; title: string; text: string; onPress?: () => void; width?: number }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={title} style={{ width }}>
      <View style={styles.feature}>
        <View style={styles.featureArt}>{art}</View>
        <Text style={[type.cardTitle, { marginTop: space.sm }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[type.small, { marginTop: 4 }]} numberOfLines={3}>
          {text}
        </Text>
      </View>
    </Pressy>
  );
}

/** Fanned stack of cards with the front one fully visible ("Saved Insights" in the reference). */
export function StackedCards({ behind, children }: { behind: { title: string; icon: IconName }[]; children: ReactNode }) {
  return (
    <View style={{ marginBottom: space.md }}>
      {behind.map((b, i) => (
        <View key={b.title} style={[styles.stackPeek, { marginHorizontal: 22 - i * 10, opacity: 0.75 + i * 0.12, marginBottom: -14 }]}>
          <View style={styles.stackIcon}>
            <Icon name={b.icon} size={13} color={colors.inkSoft} />
          </View>
          <Text style={[type.small, { color: colors.ink, fontFamily: fonts.sansMedium }]} numberOfLines={1}>
            {b.title}
          </Text>
        </View>
      ))}
      <View style={[styles.card, styles.stackFront]}>{children}</View>
    </View>
  );
}

// ---------- controls ----------

type Variant = "dark" | "light" | "sos" | "outline";

const BTN: Record<Variant, { box: ViewStyle; fg: string }> = {
  dark: { box: { backgroundColor: colors.dark, boxShadow: shadows.dark }, fg: colors.white },
  light: { box: { backgroundColor: colors.white, boxShadow: shadows.bubble }, fg: colors.ink },
  sos: { box: { backgroundColor: colors.sos, experimental_backgroundImage: gradients.sos, boxShadow: shadows.sos }, fg: colors.white },
  outline: { box: { backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "rgba(26,23,28,0.16)" }, fg: colors.ink },
};

/** Serif pill button ("Create new →"). */
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
  const h = size === "lg" ? 58 : size === "sm" ? 40 : 50;
  return (
    <Pressy onPress={onPress} disabled={disabled || loading} accessibilityLabel={label} style={[{ opacity: disabled ? 0.45 : 1 }, style]}>
      <View style={[styles.btn, { minHeight: h, paddingHorizontal: size === "sm" ? 16 : 26 }, v.box]}>
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <>
            {icon ? <Icon name={icon} size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
            <Text style={[type.button, { color: v.fg, fontSize: size === "lg" ? 17 : size === "sm" ? 14 : 16 }]}>{label}</Text>
            {iconRight ? <Icon name={iconRight} size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
          </>
        )}
      </View>
    </Pressy>
  );
}

/** Outlined icon chip ("Engagement Post", "Audio Content"). */
export function Chip({ label, icon, selected, onPress }: { label: string; icon?: IconName; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.95}>
      <View style={[styles.chip, selected && styles.chipOn]}>
        {icon ? <Icon name={icon} size={14} color={selected ? colors.white : colors.inkSoft} /> : null}
        <Text style={[type.label, { fontSize: 12.5, color: selected ? colors.white : colors.ink }]}>{label}</Text>
      </View>
    </Pressy>
  );
}

export function ChipRow({ children, wrap }: { children: ReactNode; wrap?: boolean }) {
  if (wrap) return <View style={styles.chipWrap}>{children}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingRight: space.lg }} style={{ marginHorizontal: -space.lg, paddingLeft: space.lg, flexGrow: 0, marginBottom: space.md }}>
      {children}
    </ScrollView>
  );
}

/** Pill message bar ("Type a message here…" with + and mic). */
export function InputPill({
  value,
  onChangeText,
  placeholder,
  onPlus,
  onSubmit,
  icon = "mic-outline",
  onIcon,
}: {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder: string;
  onPlus?: () => void;
  onSubmit?: () => void;
  icon?: IconName;
  onIcon?: () => void;
}) {
  return (
    <View style={styles.inputBar}>
      {onPlus ? (
        <Pressy onPress={onPlus} accessibilityLabel="More" scaleTo={0.9}>
          <View style={styles.plus}>
            <Icon name="add" size={22} color={colors.ink} />
          </View>
        </Pressy>
      ) : null}
      <View style={styles.inputPill}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inkFaint}
          style={styles.inputText}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        <Pressable onPress={onIcon ?? onSubmit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go">
          <Icon name={icon} size={20} color={colors.inkSoft} />
        </Pressable>
      </View>
    </View>
  );
}

export function Field({ label, icon, style, ...rest }: TextInputProps & { label?: string; icon?: IconName }) {
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <Text style={[type.small, { marginBottom: 6, fontFamily: fonts.sansMedium }]}>{label}</Text> : null}
      <View style={styles.field}>
        {icon ? <Icon name={icon} size={17} color={colors.inkFaint} /> : null}
        <TextInput placeholderTextColor={colors.inkFaint} style={[styles.fieldText, style]} {...rest} />
      </View>
    </View>
  );
}

/** Serif tabs with an underline ("Posts  Media  Likes  Collections"). */
export function UnderlineTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.tabs}>
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Text style={[type.button, { fontSize: 14.5, color: on ? colors.ink : colors.inkFaint }]}>{t.label}</Text>
            <View style={[styles.tabLine, on && { backgroundColor: colors.ink }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const AVATAR_TINTS = [
  "linear-gradient(140deg, #F9C9D9 0%, #E89BB6 100%)",
  "linear-gradient(140deg, #E2D8FA 0%, #B7A2EE 100%)",
  "linear-gradient(140deg, #FFE0CC 0%, #F4B38E 100%)",
  "linear-gradient(140deg, #D5ECFA 0%, #98C5EA 100%)",
  "linear-gradient(140deg, #DCF2E2 0%, #9DD5B2 100%)",
];

/** Round or rounded-square avatar; uses a photo when given, else a serif initial on a soft gradient. */
export function Avatar({ name, index = 0, size = 44, square, photo, onPress, ring }: { name: string; index?: number; size?: number; square?: boolean; photo?: string | null; onPress?: () => void; ring?: boolean }) {
  const r = square ? size * 0.22 : size / 2;
  const body = photo ? (
    <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: r, borderWidth: square ? 3 : 2, borderColor: colors.white }} />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F2B8CB",
        experimental_backgroundImage: AVATAR_TINTS[index % AVATAR_TINTS.length],
        borderWidth: square ? 3 : 2,
        borderColor: colors.white,
      }}
    >
      <Text style={{ fontFamily: fonts.serifBold, fontSize: size * 0.38, color: "#3B2232" }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
  const wrapped = ring ? <View style={{ padding: 2, borderRadius: r + 4, borderWidth: 1.5, borderColor: colors.magenta }}>{body}</View> : body;
  return onPress ? (
    <Pressy onPress={onPress} accessibilityLabel={name} scaleTo={0.92}>
      {wrapped}
    </Pressy>
  ) : (
    wrapped
  );
}

export function ListItem({
  title,
  subtitle,
  icon,
  iconTint = colors.magentaWash,
  iconColor = colors.magenta,
  leading,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTint?: string;
  iconColor?: string;
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.listItem, !last && styles.listDivider]}>
      {leading ?? (icon ? <IconBubble icon={icon} tint={iconTint} color={iconColor} /> : null)}
      <View style={{ flex: 1 }}>
        <Text style={[type.cardTitle, { fontSize: 15 }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[type.small, { marginTop: 2 }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={16} color={colors.inkFaint} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function IconBubble({ icon, tint = colors.magentaWash, color = colors.magenta, size = 40 }: { icon: IconName; tint?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

export function RoundIconButton({ icon, onPress, label, tone = "dark", size = 44 }: { icon: IconName; onPress?: () => void; label: string; tone?: "dark" | "light" | "sos"; size?: number }) {
  const bg = tone === "dark" ? colors.dark : tone === "sos" ? colors.sos : colors.white;
  return (
    <Pressy onPress={onPress} accessibilityLabel={label} scaleTo={0.9}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", boxShadow: tone === "light" ? shadows.bubble : shadows.dark }}>
        <Icon name={icon} size={size * 0.42} color={tone === "light" ? colors.ink : colors.white} />
      </View>
    </Pressy>
  );
}

export function StatusPill({ text, tone = "magenta", pulse }: { text: string; tone?: "magenta" | "safe" | "sos" | "amber" | "ink"; pulse?: boolean }) {
  const t = {
    magenta: [colors.magentaWash, colors.magenta],
    safe: [colors.safeWash, colors.safe],
    sos: [colors.sosWash, colors.sosDeep],
    amber: [colors.amberWash, colors.amber],
    ink: ["rgba(26,23,28,0.07)", colors.ink],
  }[tone];
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse || reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, v]);
  return (
    <View style={[styles.pill, { backgroundColor: t[0] }]}>
      <Animated.View style={[styles.pillDot, { backgroundColor: t[1], opacity: v }]} />
      <Text style={[type.label, { fontSize: 12, color: t[1] }]}>{text}</Text>
    </View>
  );
}

export function Banner({ text, tone = "magenta", icon }: { text: string; tone?: "magenta" | "amber" | "sos" | "safe"; icon?: IconName }) {
  const t = {
    magenta: [colors.magentaWash, colors.magenta, "information-circle-outline"],
    amber: [colors.amberWash, colors.amber, "warning-outline"],
    sos: [colors.sosWash, colors.sosDeep, "alert-circle-outline"],
    safe: [colors.safeWash, colors.safe, "checkmark-circle-outline"],
  }[tone] as [string, string, IconName];
  return (
    <View style={[styles.banner, { backgroundColor: t[0] }]}>
      <Icon name={icon ?? t[2]} size={17} color={t[1]} />
      <Text style={[type.small, { color: t[1], flex: 1, fontFamily: fonts.sansMedium }]}>{text}</Text>
    </View>
  );
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.small, style]}>{children}</Text>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space.xs }, style]}>{children}</View>;
}

export function PulseRings({ size, color, active = true }: { size: number; color: string; active?: boolean }) {
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (!active || reduceMotion) return;
    const loops = rings.map((r, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(r, { toValue: 1, duration: 2100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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

export function Waveform({ bars = 13, color = colors.magenta, active = true, height = 40 }: { bars?: number; color?: string; active?: boolean; height?: number }) {
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
        return <Animated.View key={i} style={{ width: 3.5, height, borderRadius: 2, backgroundColor: color, opacity: 0.35 + edge * 0.65, transform: [{ scaleY: active ? v : 0.15 }] }} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", minHeight: 48, marginBottom: space.xs },
  headerSide: { width: 92, flexDirection: "row", alignItems: "center", gap: 2 },
  headerIcon: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
  handle: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 6, maxWidth: 140 },
  accentRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.lg, marginBottom: space.sm },
  card: {
    backgroundColor: colors.bubble,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    marginBottom: space.sm,
    boxShadow: shadows.bubble,
  },
  bubble: {
    backgroundColor: colors.bubble,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: space.xs,
    maxWidth: "84%",
    boxShadow: shadows.bubble,
  },
  bubbleLeft: { alignSelf: "flex-start", borderBottomLeftRadius: 6 },
  bubbleRight: { alignSelf: "flex-end", borderBottomRightRadius: 6 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  feature: {
    backgroundColor: colors.bubble,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
    padding: space.sm,
    minHeight: 236,
    boxShadow: shadows.bubble,
  },
  featureArt: { height: 112, borderRadius: 14, overflow: "hidden" },
  stackPeek: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 9,
    paddingBottom: 20,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: colors.bubbleBorder,
  },
  stackIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.magentaWash, alignItems: "center", justifyContent: "center" },
  stackFront: { padding: space.md, backgroundColor: colors.bubbleSolid, boxShadow: shadows.lifted },
  btn: { borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(26,23,28,0.06)",
  },
  chipOn: { backgroundColor: colors.dark, borderColor: colors.dark },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.md },
  inputBar: { flexDirection: "row", alignItems: "center", gap: space.xs },
  plus: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", boxShadow: shadows.bubble },
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: space.md,
    boxShadow: shadows.bubble,
  },
  inputText: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 10 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(26,23,28,0.07)",
    paddingHorizontal: space.md,
  },
  fieldText: { flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.ink, paddingVertical: 11 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.hairline, marginBottom: space.md },
  tab: { flex: 1, alignItems: "center", paddingTop: 10 },
  tabLine: { height: 2, width: "70%", marginTop: 9, borderRadius: 1, backgroundColor: "transparent" },
  listItem: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 12 },
  listDivider: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  banner: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: radius.sm, paddingVertical: 11, paddingHorizontal: 13, marginBottom: space.sm },
});
