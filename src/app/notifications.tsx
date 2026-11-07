import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, IconName } from '@/components/icon';
import { Chip, ChipRow, Empty, Header, Screen, T } from '@/components/ui';
import type { AppNotification } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { ago } from '@/lib/format';
import { useStore } from '@/store';

const ICON: Record<AppNotification['kind'], IconName> = { order: 'box', activity: 'heritage', verify: 'seal', payout: 'wallet' };

export default function Notifications() {
  const { c } = useTheme();
  const items = useStore((s) => s.notifications);
  const { markNotificationsRead, markNotificationRead } = useStore.getState();
  const [tab, setTab] = useState<'all' | 'order' | 'activity'>('all');
  const list = items.filter((n) => tab === 'all' || (tab === 'order' ? n.kind === 'order' || n.kind === 'payout' : n.kind === 'activity' || n.kind === 'verify'));
  const today = list.filter((n) => Date.now() - n.at < 86_400_000);
  const earlier = list.filter((n) => Date.now() - n.at >= 86_400_000);

  const Row = ({ n }: { n: AppNotification }) => (
    <Pressable onPress={() => { markNotificationRead(n.id); if (n.link) router.push(n.link as never); }}
      style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: n.read ? 'transparent' : c.primaryTint }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.element, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ICON[n.kind]} size={20} color={n.kind === 'verify' ? c.verified : n.kind === 'activity' ? c.heritage : c.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{n.title}</T>
        <T v="bodySm" color="textSecondary">{n.body}</T>
        <T v="caption" color="textMuted">{ago(n.at)}</T>
      </View>
      {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, marginTop: 6 }} />}
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <Header title="Notifications" right={items.some((n) => !n.read) ? <Pressable onPress={markNotificationsRead} style={{ paddingRight: 12 }}><T v="label" color="primary">Read all</T></Pressable> : undefined} />
      <ChipRow style={{ paddingBottom: 12 }}>
        <Chip label="All" selected={tab === 'all'} onPress={() => setTab('all')} />
        <Chip label="Orders" selected={tab === 'order'} onPress={() => setTab('order')} />
        <Chip label="Activity" selected={tab === 'activity'} onPress={() => setTab('activity')} />
      </ChipRow>
      {!list.length ? <Empty icon="bell" title="You're all caught up" body="Order updates and news from artists you follow appear here." /> : (
        <View style={{ paddingHorizontal: 10, gap: 4 }}>
          {today.length > 0 && <T v="overline" color="textMuted" style={{ padding: 6 }}>Today</T>}
          {today.map((n) => <Row key={n.id} n={n} />)}
          {earlier.length > 0 && <T v="overline" color="textMuted" style={{ padding: 6, marginTop: 8 }}>Earlier</T>}
          {earlier.map((n) => <Row key={n.id} n={n} />)}
        </View>
      )}
    </Screen>
  );
}
