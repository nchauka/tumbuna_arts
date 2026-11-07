import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, useFonts } from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BilumBand, LogoMark } from '@/components/brand';
import { ConfirmHost, ToastHost } from '@/components/ui';
import { palette } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    IBMPlexMono_500Medium,
  });
  const hydrated = useStore((s) => s.hydrated);
  const booted = useStore((s) => s.booted);
  const hasCache = useStore((s) => s.artworks.length > 0);
  const { bootstrap, tick, refresh } = useStore.getState();
  const { c, dark } = useTheme();
  const [bootTimedOut, setBootTimedOut] = useState(false);
  // With a cached catalogue the app opens immediately and refreshes in the background.
  const ready = (fontsLoaded || !!fontError) && hydrated && (booted || hasCache || bootTimedOut);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!hydrated) return;
    void bootstrap();
    const t = setTimeout(() => setBootTimedOut(true), 6000);
    return () => clearTimeout(t);
  }, [hydrated, bootstrap]);

  // Keep orders and notifications fresh while signed in; refresh everything when the app returns to the foreground.
  useEffect(() => {
    if (!booted) return;
    const id = setInterval(tick, 20_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => { clearInterval(id); sub.remove(); };
  }, [booted, tick, refresh]);

  const navTheme = dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.background, card: c.background, primary: c.primary, text: c.text, border: c.border } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.background, card: c.background, primary: c.primary, text: c.text, border: c.border } };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {ready && (
          <Stack screenOptions={{ headerShown: false, title: 'Tumbuna Arts', contentStyle: { backgroundColor: c.background }, animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default' }}>
            <Stack.Screen name="upload" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="checkout/success" options={{ gestureEnabled: false, animation: 'fade' }} />
          </Stack>
        )}
        <ToastHost />
        <ConfirmHost />
        <SplashOverlay ready={ready} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** Branded splash that holds while fonts and saved data load, then fades out. */
function SplashOverlay({ ready }: { ready: boolean }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const [gone, setGone] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', damping: 12 }).start();
    const t = setTimeout(() => setMinTimePassed(true), 900);
    return () => clearTimeout(t);
  }, [scale]);

  useEffect(() => {
    if (ready && minTimePassed) {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }).start(() => setGone(true));
    }
  }, [ready, minTimePassed, opacity]);

  if (gone) return null;
  return (
    <Animated.View pointerEvents={ready && minTimePassed ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, { backgroundColor: palette.ink, opacity, zIndex: 200 }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
        <Animated.View style={{ transform: [{ scale }] }}><LogoMark size={96} /></Animated.View>
        <Text style={{ color: '#fff', fontSize: 30, fontFamily: 'BricolageGrotesque_800ExtraBold', letterSpacing: -0.6 }}>Tumbuna Arts</Text>
        <Text style={{ color: palette.paradiseGold, fontSize: 12, letterSpacing: 2.4, fontFamily: 'Manrope_700Bold' }}>BUY · DISCOVER · PRESERVE</Text>
      </View>
      <Text style={{ color: '#968B80', textAlign: 'center', fontSize: 12, marginBottom: 18, fontFamily: 'Manrope_500Medium' }}>Art from Papua New Guinea&apos;s 22 provinces</Text>
      <BilumBand height={12} />
    </Animated.View>
  );
}
