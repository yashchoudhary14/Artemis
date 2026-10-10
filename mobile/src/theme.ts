import { Platform, type TextStyle } from "react-native";

// Light pink/lilac palette (UI_reference/general app UI/design 1) on the Artemis layout (design 2).
export const colors = {
  bg: "#F7F0FA",
  bgPink: "#FBE9F1",
  bgLilac: "#EEE6FB",
  card: "rgba(255,255,255,0.88)",
  cardSolid: "#FFFFFF",
  ink: "#2A1838",
  muted: "#6F5F7C",
  faint: "#A898B3",
  line: "#EAD9F0",
  lilac: "#8B5CF6",
  lilacDeep: "#5B3A8C",
  lilacSoft: "#EFE5FF",
  pinkSoft: "#FDE4EE",
  peachSoft: "#FFE7D6",
  coral: "#F2545B",
  coralSoft: "#FFE1E3",
  dark: "#241430",
  green: "#15803D",
  greenSoft: "#DCFCE7",
  amber: "#B45309",
  amberSoft: "#FEF3C7",
  white: "#FFFFFF",
};

// Avatar tints for the circle (A, R, S…) like the mock.
export const avatarTints = ["#F9C6DA", "#D9C8FB", "#FFD3B5", "#C9E8F5", "#D7F2C9"];

export const serif = Platform.select({ android: "serif", ios: "Georgia", default: "serif" });

export const type = {
  hero: { fontFamily: serif, fontSize: 34, lineHeight: 38, fontWeight: "600", color: colors.ink } as TextStyle,
  title: { fontFamily: serif, fontSize: 24, lineHeight: 29, fontWeight: "600", color: colors.ink } as TextStyle,
  h2: { fontFamily: serif, fontSize: 20, lineHeight: 25, fontWeight: "600", color: colors.ink } as TextStyle,
  body: { fontSize: 16, lineHeight: 22, color: colors.ink } as TextStyle,
  small: { fontSize: 13, lineHeight: 18, color: colors.muted } as TextStyle,
  label: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: colors.muted } as TextStyle,
};

export const radius = { card: 24, pill: 999, input: 16 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// RN 0.86 renders CSS gradients natively; older renderers fall back to backgroundColor.
export const gradients = {
  screen: `linear-gradient(170deg, ${colors.bgPink} 0%, ${colors.bg} 45%, ${colors.bgLilac} 100%)`,
  card: "linear-gradient(160deg, #FFFFFF 0%, #F7EFFF 100%)",
  dusk: "linear-gradient(150deg, #3B2352 0%, #6B4A8F 55%, #C08BB5 100%)",
  sos: "linear-gradient(160deg, #FF7A7F 0%, #F2545B 60%, #D93F4A 100%)",
};
