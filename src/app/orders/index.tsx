import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OrderRow } from '@/components/cards';
import { Chip, ChipRow, Empty, Header, Screen, T } from '@/components/ui';
import type { OrderStatus } from '@/data/types';
import { useStore } from '@/store';

const FILTERS: { key: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'progress', label: 'In progress', match: (s) => s === 'placed' || s === 'packed' || s === 'shipped' },
  { key: 'delivered', label: 'Delivered', match: (s) => s === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' },
];

export default function PurchaseHistory() {
  const orders = useStore((s) => s.orders.filter((o) => o.buyerId === s.sessionUserId));
  const [f, setF] = useState('all');
  const list = orders.filter((o) => FILTERS.find((x) => x.key === f)!.match(o.status)).sort((a, b) => b.createdAt - a.createdAt);
  const years = [...new Set(list.map((o) => new Date(o.createdAt).getFullYear()))];

  return (
    <Screen padded={false}>
      <Header title="Purchase history" />
      <ChipRow style={{ paddingBottom: 12 }}>{FILTERS.map((x) => <Chip key={x.key} label={x.label} selected={f === x.key} onPress={() => setF(x.key)} />)}</ChipRow>
      {!list.length ? (
        <Empty icon="box" title={orders.length ? 'No orders here' : 'No orders yet'} body={orders.length ? 'Try another filter.' : 'When you buy a work, you can follow it from the artist\'s village to your door.'} action={orders.length ? undefined : 'Start exploring'} onAction={() => router.replace('/home')} />
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {years.map((y) => (
            <View key={y} style={{ gap: 10 }}>
              <T v="overline" color="textMuted" style={{ marginTop: 6 }}>{y}</T>
              {list.filter((o) => new Date(o.createdAt).getFullYear() === y).map((o) => <OrderRow key={o.id} order={o} onPress={() => router.push(`/orders/${o.id}`)} />)}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
