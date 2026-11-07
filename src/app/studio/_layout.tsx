import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '@/components/icon';
import { haptic } from '@/components/ui';
import { palette } from '@/constants/tokens';
import { useMyArtist } from '@/store';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'dashboard', title: 'Dashboard', icon: 'chart' },
  { name: 'artworks', title: 'Artworks', icon: 'grid' },
  { name: 'orders', title: 'Orders', icon: 'box' },
  { name: 'earnings', title: 'Earnings', icon: 'wallet' },
];

/** Ink tab bar with a red centre button that opens Upload as a modal. */
function StudioTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const visible = state.routes.filter((r) => TABS.some((t) => t.name === r.name));
  const items = [...visible.slice(0, 2), null, ...visible.slice(2)];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: palette.ink, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), alignItems: 'center' }}>
      {items.map((route) => {
        if (!route) {
          return (
            <View key="upload" style={{ flex: 1, alignItems: 'center' }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Upload artwork" onPress={() => { haptic(); router.push('/upload'); }}
                style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.kumulRed, alignItems: 'center', justifyContent: 'center', marginTop: -18, borderWidth: 4, borderColor: palette.ink, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
                <Icon name="plus" color="#fff" size={24} strokeWidth={2.6} />
              </Pressable>
            </View>
          );
        }
        const tab = TABS.find((t) => t.name === route.name)!;
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? palette.paradiseGold : '#968B80';
        return (
          <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} onPress={() => { haptic(); navigation.navigate(route.name); }} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Icon name={tab.icon} color={color} filled={focused} inner={palette.ink} />
            <Text style={{ color, fontSize: 11, fontFamily: 'Manrope_700Bold' }}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function StudioLayout() {
  const artist = useMyArtist();
  if (!artist) return <Redirect href="/login" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <StudioTabBar {...props} />}>
      {TABS.map((t) => <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />)}
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
