import { Tabs } from 'expo-router/js-tabs';

import { Icon, IconName } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'home', title: 'Home', icon: 'home' },
  { name: 'explore', title: 'Explore', icon: 'search' },
  { name: 'heritage', title: 'Heritage', icon: 'bilum' },
  { name: 'wishlist', title: 'Wishlist', icon: 'heart' },
  { name: 'profile', title: 'Profile', icon: 'user' },
];

export default function BuyerTabs() {
  const { c } = useTheme();
  const wishCount = useStore((s) => s.wishlist.length);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border },
        tabBarLabelStyle: { fontFamily: 'Manrope_700Bold', fontSize: 11 },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarBadge: t.name === 'wishlist' && wishCount ? wishCount : undefined,
            tabBarBadgeStyle: { backgroundColor: c.primary, fontSize: 10 },
            // Design system: outline icons, solid when selected.
            tabBarIcon: ({ color, focused }) => <Icon name={t.icon} color={color as string} filled={focused} inner={c.background} />,
          }}
        />
      ))}
    </Tabs>
  );
}
