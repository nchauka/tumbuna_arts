import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { StatusBadge } from '@/components/cards';
import { StudioHeader } from '@/components/studio-header';
import { act, Button, Card, Empty, Input, Row, Sheet, T } from '@/components/ui';
import type { Order } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { ago, kina } from '@/lib/format';
import { COMMISSION, artistOrders, useMyArtist, useStore } from '@/store';

const FILTERS = [{ key: 'open', label: 'To do' }, { key: 'shipped', label: 'Shipped' }, { key: 'done', label: 'Completed' }] as const;

export default function StudioOrders() {
  const { c } = useTheme();
  const artist = useMyArtist()!;
  const state = useStore();
  const orders = useMemo(() => artistOrders(state, artist.id).sort((a, b) => b.createdAt - a.createdAt), [state, artist.id]);
  const [f, setF] = useState<(typeof FILTERS)[number]['key']>('open');
  const [shipping, setShipping] = useState<Order | null>(null);
  const [tracking, setTracking] = useState('');
  const list = orders.filter((o) => (f === 'open' ? o.status === 'placed' || o.status === 'packed' : f === 'shipped' ? o.status === 'shipped' : o.status === 'delivered' || o.status === 'cancelled'));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StudioHeader title="Orders">
        <Row gap={6}>
          {FILTERS.map((x) => (
            <Pressable key={x.key} onPress={() => setF(x.key)} style={{ paddingHorizontal: 14, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: f === x.key ? '#fff' : '#2A2622' }}>
              <T v="label" style={{ color: f === x.key ? '#1C1C1C' : '#CBC2B8', fontSize: 13 }}>{x.label}</T>
            </Pressable>
          ))}
        </Row>
      </StudioHeader>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {!list.length && <Empty icon="box" title={f === 'open' ? 'No orders to ship' : 'Nothing here yet'} body={f === 'open' ? 'New orders appear here and in your notifications.' : undefined} />}
        {list.map((o) => {
          const items = o.items.map((i) => state.artworks.find((a) => a.id === i.artworkId)!).filter(Boolean);
          return (
            <Card key={o.id} style={{ gap: 12 }}>
              <Row><T v="serial" style={{ flex: 1 }}>{o.number}</T><StatusBadge status={o.status} /></Row>
              {items.map((a) => (
                <Row key={a.id} gap={10}>
                  <ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 44, height: 54, borderRadius: 8 }} />
                  <View style={{ flex: 1 }}><T v="label" numberOfLines={1}>{a.title}</T><T v="caption" color="textMuted">{kina(a.price)} · you receive {kina(a.price * (1 - COMMISSION))}</T></View>
                </Row>
              ))}
              <View style={{ gap: 2 }}>
                <T v="bodySm">{o.buyerName} · {o.address.city}, {o.address.country}{o.sample ? ' · sample order' : ''}</T>
                <T v="caption" color="textMuted">{o.shipping.label} · ordered {ago(o.createdAt)}{o.permitFee ? ' · export permit arranged by Tumbuna' : ''}</T>
                {o.trackingNo && <T v="caption" color="textMuted">Tracking {o.trackingNo}</T>}
              </View>
              {o.status === 'placed' && <Button title="Mark as packed" kind="dark" size="sm" onPress={() => { void act(state.advanceOrder(o.id, 'packed'), o.sample ? 'Marked as packed' : 'Buyer notified: packing'); }} />}
              {o.status === 'packed' && <Button title="Mark as shipped" size="sm" onPress={() => { setShipping(o); setTracking(''); }} />}
              {o.status === 'shipped' && <Button title="Mark as delivered" kind="outline" size="sm" onPress={() => { void act(state.advanceOrder(o.id, 'delivered'), o.sample ? 'Delivered. Payment released.' : 'Buyer asked to confirm delivery'); }} />}
              {o.status === 'delivered' && !o.confirmedAt && <T v="caption" color="textMuted">Waiting for the buyer to confirm delivery.</T>}
            </Card>
          );
        })}
      </ScrollView>
      <Sheet visible={!!shipping} onClose={() => setShipping(null)} title="Ship order">
        {shipping && (
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="bodySm" color="textSecondary">Send with {shipping.shipping.carrier} to {shipping.address.name}, {shipping.address.line1}, {shipping.address.city}, {shipping.address.country}.</T>
            <Input label={`${shipping.shipping.carrier} tracking number`} value={tracking} onChangeText={setTracking} autoCapitalize="characters" placeholder="e.g. PNG12345678" />
            <Button title="Confirm shipped" disabled={tracking.trim().length < 5} onPress={async () => { if (await act(state.advanceOrder(shipping.id, 'shipped', tracking.trim()), 'Buyer notified: shipped')) setShipping(null); }} />
          </View>
        )}
      </Sheet>
    </View>
  );
}
