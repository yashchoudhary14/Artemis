import type { TextStyle } from "react-native";

// SafeWalk design system — "Moonlit blush".
// Layout from the Artemis mock (design 2), palette + serif voice from design 1:
// blush → lavender gradients, frosted white cards, plum ink, dark pill CTAs, coral SOS.
// Fonts: Playfair Display (display/headlines) + Plus Jakarta Sans (UI), loaded in app/_layout.tsx.

export const fonts = {
  display: "PlayfairDisplay_600SemiBold",
  displayMedium: "PlayfairDisplay_500Medium",
  displayItalic: "PlayfairDisplay_500Medium_Italic",
  sans: "PlusJakartaSans_400Regular",
  sansMedium: "PlusJakartaSans_500Medium",
  sansSemi: "PlusJakartaSans_600SemiBold",
  sansBold: "PlusJakartaSans_700Bold",
  sansExtra: "PlusJakartaSans_800ExtraBold",
};

export const colors = {
  // Surfaces
  bg: "#FBF3F8",
  blush: "#FFE9F0",
  lavender: "#EEE8FF",
  glass: "rgba(255,255,255,0.74)",
  glassStrong: "rgba(255,255,255,0.9)",
  glassBorder: "rgba(255,255,255,0.95)",
  hairline: "rgba(74,40,102,0.08)",
  // Ink (contrast on white: ink 15.8:1, inkSoft 6.9:1, inkFaint 3.4:1 — faint for large/decorative only)
  ink: "#21122E",
  inkSoft: "#5D4A6E",
  inkFaint: "#9A88AA",
  // Brand
  violet: "#7442D8",
  violetSoft: "#A88BF5",
  violetWash: "#EFE8FF",
  rose: "#D9467A",
  roseSoft: "#F6A6C1",
  roseWash: "#FFE6EF",
  peach: "#FFD9C7",
  plum: "#2B1740",
  plumDeep: "#1A0E27",
  // Status
  sos: "#F04E5E",
  sosDeep: "#D63447",
  sosWash: "#FFE4E6",
  safe: "#1E8A5A",
  safeWash: "#DDF4E7",
  amber: "#A15C07",
  amberWash: "#FDF1DA",
  white: "#FFFFFF",
};

export const avatarTints = [
  "linear-gradient(140deg, #FFD3E2 0%, #F6A6C1 100%)",
  "linear-gradient(140deg, #E4DAFF 0%, #B9A2F7 100%)",
  "linear-gradient(140deg, #FFE2CF 0%, #FFB892 100%)",
  "linear-gradient(140deg, #D6EEFF 0%, #9CC8F2 100%)",
  "linear-gradient(140deg, #DDF4E7 0%, #9FD9B9 100%)",
];
export const avatarSolids = ["#F6A6C1", "#B9A2F7", "#FFB892", "#9CC8F2", "#9FD9B9"];

// RN 0.86 renders CSS gradients and box-shadows natively (Fabric).
export const gradients = {
  screen:
    "radial-gradient(circle at 12% 0%, rgba(255,196,214,0.75) 0%, rgba(255,196,214,0) 42%), radial-gradient(circle at 100% 22%, rgba(200,182,255,0.7) 0%, rgba(200,182,255,0) 45%), radial-gradient(circle at 0% 78%, rgba(255,220,200,0.55) 0%, rgba(255,220,200,0) 40%), linear-gradient(180deg, #FDF4F8 0%, #F6EEFB 55%, #EFEAFF 100%)",
  glass: "linear-gradient(160deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.7) 100%)",
  violet: "linear-gradient(135deg, #8B5CF6 0%, #7442D8 55%, #5B2FB8 100%)",
  violetSoft: "linear-gradient(135deg, #EDE4FF 0%, #E2D5FF 100%)",
  rose: "linear-gradient(135deg, #FFE6EF 0%, #FFD3E2 100%)",
  dusk: "linear-gradient(160deg, #2B1740 0%, #4B2A6E 45%, #9A5C9E 80%, #E89AA8 100%)",
  night: "linear-gradient(170deg, #1A0E27 0%, #2B1740 60%, #3D2258 100%)",
  sos: "linear-gradient(150deg, #FF8A7A 0%, #F04E5E 50%, #D63447 100%)",
  sosGlow: "radial-gradient(circle at 50% 50%, rgba(240,78,94,0.35) 0%, rgba(240,78,94,0) 70%)",
  violetGlow: "radial-gradient(circle at 50% 50%, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0) 70%)",
  safe: "linear-gradient(135deg, #E3F7EC 0%, #CFEFDD 100%)",
};

export const shadows = {
  card: "0px 12px 32px rgba(74, 40, 102, 0.10), 0px 2px 6px rgba(74, 40, 102, 0.05)",
  soft: "0px 6px 18px rgba(74, 40, 102, 0.10)",
  lifted: "0px 18px 40px rgba(74, 40, 102, 0.18)",
  violet: "0px 12px 28px rgba(116, 66, 216, 0.35)",
  dark: "0px 12px 26px rgba(33, 18, 46, 0.30)",
  sos: "0px 14px 34px rgba(240, 78, 94, 0.45)",
};

export const radius = { xs: 10, sm: 14, md: 20, lg: 26, xl: 32, pill: 999 };
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 };
export const motion = { press: 120, fast: 180, base: 280, slow: 420, stagger: 60 };

export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.ink, letterSpacing: -0.6 } as TextStyle,
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink, letterSpacing: -0.4 } as TextStyle,
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.2 } as TextStyle,
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, color: colors.ink } as TextStyle,
  h3: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 22, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 23, color: colors.ink } as TextStyle,
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22, color: colors.ink } as TextStyle,
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 19, color: colors.inkSoft } as TextStyle,
  smallBold: { fontFamily: fonts.sansSemi, fontSize: 13, lineHeight: 18, color: colors.ink } as TextStyle,
  label: { fontFamily: fonts.sansBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.6, textTransform: "uppercase", color: colors.inkSoft } as TextStyle,
  button: { fontFamily: fonts.sansBold, fontSize: 16, lineHeight: 20, letterSpacing: 0.1 } as TextStyle,
  number: { fontFamily: fonts.sansExtra, fontSize: 22, lineHeight: 26, color: colors.ink, letterSpacing: -0.3 } as TextStyle,
};
