import type { TextStyle } from "react-native";

// Artemis design system: warm off-white with a faint blush, near-black ink, black pill CTAs,
// Instrument Serif for display lines, Geist for UI text, Marcellus capitals for the wordmark
// and section labels. Dusty rose only on small labels; red only for SOS.
// "Women who rise" screens keep Playfair Display Black on full-bleed colour blocks.

export const fonts = {
  serif: "InstrumentSerif_400Regular",
  serifMedium: "InstrumentSerif_400Regular",
  serifBold: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  sans: "Geist_400Regular",
  sansMedium: "Geist_500Medium",
  sansSemi: "Geist_600SemiBold",
  sansBold: "Geist_600SemiBold",
  mark: "Marcellus_400Regular",
  display: "PlayfairDisplay_900Black",
  displayBold: "PlayfairDisplay_700Bold",
};

export const colors = {
  // Surfaces
  bg: "#F7F4F3",
  pinkTop: "#F6E8EC",
  pinkMid: "#F9F1F3",
  paper: "#FBF9F8",
  bubble: "#FFFFFF",
  bubbleSolid: "#FFFFFF",
  bubbleBorder: "rgba(23,20,26,0.06)",
  hairline: "rgba(23,20,26,0.07)",
  // Ink (on white: ink 18:1, inkSoft 4.9:1, inkFaint decorative only)
  ink: "#17141A",
  inkSoft: "#6E6870",
  inkFaint: "#A39DA3",
  // Accents (rose is for small labels; keep it rare)
  magenta: "#A0566F",
  magentaWash: "#F5E6EA",
  lilac: "#5A4E80",
  lilacWash: "#EEEAF5",
  dark: "#17141A",
  // Status
  sos: "#D9445F",
  sosDeep: "#B23A55",
  sosWash: "#F9E3E6",
  safe: "#3F6E53",
  safeWash: "#EAF1EC",
  amber: "#8A5A12",
  amberWash: "#F6EEDF",
  white: "#FFFFFF",
};

export const gradients = {
  // Faint blush at the top right, then plain warm white.
  screen: "radial-gradient(120% 50% at 80% 0%, #F6E8EC 0%, rgba(246,232,236,0) 70%), linear-gradient(180deg, #F7F4F3 0%, #F7F4F3 100%)",
  urgent: "radial-gradient(120% 45% at 50% 0%, #F7E1E4 0%, rgba(247,225,228,0) 70%), linear-gradient(180deg, #F7F4F3 0%, #F7F4F3 100%)",
  sos: "linear-gradient(150deg, #E2566F 0%, #D9445F 55%, #B23A55 100%)",
  sosGlow: "radial-gradient(circle at 50% 50%, rgba(217,68,95,0.22) 0%, rgba(217,68,95,0) 68%)",
  pinkGlow: "radial-gradient(circle at 50% 50%, rgba(201,112,141,0.18) 0%, rgba(201,112,141,0) 68%)",
  night: "radial-gradient(circle at 88% 120%, rgba(242,198,211,0.16) 0%, rgba(242,198,211,0) 45%), linear-gradient(180deg, #17141A 0%, #17141A 100%)",
};

export const shadows = {
  bubble: "0px 12px 32px rgba(70, 40, 55, 0.05)",
  lifted: "0px 16px 40px rgba(70, 40, 55, 0.08)",
  dark: "0px 14px 30px rgba(23, 20, 26, 0.18)",
  sos: "0px 10px 24px rgba(217, 68, 95, 0.30)",
};

export const radius = { sm: 14, md: 20, lg: 24, xl: 30, pill: 999 };
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 44 };
export const motion = { fast: 180, base: 280, slow: 560, stagger: 70 };

export const type = {
  hero: { fontFamily: fonts.serif, fontSize: 46, lineHeight: 50, color: colors.ink, letterSpacing: -1 } as TextStyle,
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, color: colors.ink, letterSpacing: -0.4 } as TextStyle,
  header: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20, color: colors.ink } as TextStyle,
  section: { fontFamily: fonts.mark, fontSize: 12, lineHeight: 16, color: colors.inkSoft, letterSpacing: 3 } as TextStyle,
  cardTitle: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22, color: colors.ink } as TextStyle,
  body: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.ink } as TextStyle,
  bodySoft: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, color: colors.inkSoft } as TextStyle,
  small: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, color: colors.inkSoft } as TextStyle,
  label: { fontFamily: fonts.sansMedium, fontSize: 13, lineHeight: 17, color: colors.ink } as TextStyle,
  accent: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, color: colors.magenta } as TextStyle,
  button: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 21 } as TextStyle,
  tab: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14 } as TextStyle,
  number: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 34, color: colors.ink } as TextStyle,
  mark: { fontFamily: fonts.mark, fontSize: 17, lineHeight: 22, color: colors.ink, letterSpacing: 4.5 } as TextStyle,
};
