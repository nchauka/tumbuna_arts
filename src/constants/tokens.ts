/**
 * Tumbuna Arts design tokens.
 * Single source of truth for color, type, spacing, radius, elevation and motion.
 * Fonts load through expo-font / @expo-google-fonts:
 *   Bricolage Grotesque (display), Manrope (body), IBM Plex Mono (certificate IDs, prices in tables).
 */

export const palette = {
  kumulRed: '#D62828',
  kumulRedDeep: '#A81E1E',
  kumulRedTint: '#FCE9E9',
  paradiseGold: '#F4B400',
  paradiseGoldDeep: '#9A6F00',
  paradiseGoldTint: '#FFF6DB',
  ink: '#1C1C1C',
  earth: '#8B5E3C',
  earthDeep: '#5E3D24',
  earthTint: '#F3EAE2',
  white: '#FFFFFF',

  // Warm neutrals, biased toward earth brown
  sand50: '#FAF8F6',
  sand100: '#F3EFEB',
  sand200: '#E6E0DA',
  sand300: '#CFC6BD',
  sand500: '#8A8078',
  sand700: '#4A433E',

  rainforest: '#2E7D4F',
  lagoon: '#2F6690',
  error: '#C0392B',
} as const;

export const colors = {
  light: {
    background: palette.white,
    surface: palette.sand50,
    surfaceRaised: palette.white,
    element: palette.sand100,
    border: palette.sand200,
    text: palette.ink,
    textSecondary: palette.sand700,
    textMuted: palette.sand500,
    primary: palette.kumulRed,
    primaryPressed: palette.kumulRedDeep,
    primaryTint: palette.kumulRedTint,
    onPrimary: palette.white,
    verified: palette.paradiseGold,
    verifiedText: palette.paradiseGoldDeep,
    verifiedTint: palette.paradiseGoldTint,
    heritage: palette.earth,
    heritageDeep: palette.earthDeep,
    heritageTint: palette.earthTint,
    success: palette.rainforest,
    info: palette.lagoon,
    error: palette.error,
    overlay: 'rgba(28,28,28,0.55)',
  },
  dark: {
    background: '#141210',
    surface: '#1B1815',
    surfaceRaised: '#221E1A',
    element: '#2A2622',
    border: '#3A342E',
    text: '#F5F1EC',
    textSecondary: '#CBC2B8',
    textMuted: '#968B80',
    primary: '#EF4B4B',
    primaryPressed: '#D62828',
    primaryTint: '#3A1A18',
    onPrimary: palette.white,
    verified: palette.paradiseGold,
    verifiedText: '#F7C93D',
    verifiedTint: '#3A2E10',
    heritage: '#C08A60',
    heritageDeep: '#E0B48E',
    heritageTint: '#2E241C',
    success: '#4FB07A',
    info: '#6FA3CC',
    error: '#E5675B',
    overlay: 'rgba(0,0,0,0.65)',
  },
} as const;

export type ColorToken = keyof typeof colors.light;

export const fontFamily = {
  display: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemibold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  mono: 'IBMPlexMono_500Medium',
} as const;

export const typography = {
  display: { fontFamily: fontFamily.displayHeavy, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fontFamily.bodyBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.bodyRegular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodySemibold, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fontFamily.bodyRegular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.bodySemibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fontFamily.bodyBold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  price: { fontFamily: fontFamily.display, fontSize: 20, lineHeight: 24 },
  serial: { fontFamily: fontFamily.mono, fontSize: 13, lineHeight: 18, letterSpacing: 0.5 },
} as const;

/** 4pt grid */
export const space = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  giant: 64,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12, // artwork thumbnails, inputs
  lg: 16, // cards, buttons
  xl: 24, // bottom sheets, hero cards
  pill: 999, // chips, badges, tab indicator
} as const;

export const elevation = {
  e0: { shadowOpacity: 0, elevation: 0 },
  e1: { shadowColor: '#3B2A1C', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  e2: { shadowColor: '#3B2A1C', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  e3: { shadowColor: '#3B2A1C', shadowOpacity: 0.16, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  spring: { damping: 18, stiffness: 180 },
} as const;

export const layout = {
  screenGutter: space.md,
  minTouchTarget: 44,
  tabBarHeight: 64,
  headerHeight: 56,
  artworkAspect: 4 / 5,
  gridColumns: 2,
} as const;

export const tokens = { palette, colors, fontFamily, typography, space, radius, elevation, motion, layout };
export default tokens;
