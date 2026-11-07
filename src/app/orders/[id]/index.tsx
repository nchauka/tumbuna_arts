import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { ArtistChip, StatusBadge } from '@/components/cards';
import { Icon } from '@/components/icon';
import { act, Button, Card, confirm, Empty, Header, Row, Screen, T, toast } from '@/components/ui';
import type { OrderStatus } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { date, kina, time } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

const STEPS: { status: OrderStatus; label: string; sub: string }[] = [
  { status: 'placed', label: 'Order placed', sub: 'Payment held safely' },
  { status: 'packed', label: 'Artist packing', sub: 'Wrapped and labelled' },
  { status: 'shipped', label: 'Shipped', sub: 'With the courier' },
  { status: 'delivered', label: 'Delivered', sub: 'Confirm to release payment' },
];

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const artworks = useStore((s) => s.artworks);
  const artist = useStore((s) => s.artists.find((a) => a.id === artworks.find((w) => w.id === order?.items[0]?.artworkId)?.artistId));
  const isBuyer = useStore((s) => !!order && order.buyerId === s.sessionUserId);
  const { tick, confirmDelivery, cancelOrder } = useStore.getState();

  useEffect(() => { tick(); }, [tick]);

  if (!order) return <Screen padded={false}><Header title="Order" /><Empty title="Order not found" /></Screen>;
  const idx = order.status === 'cancelled' ? -1 : STEPS.findIndex((s) => s.status === order.status);
  const items = order.items.map((i) => artworks.find((a) => a.id === i.artworkId)!).filter(Boolean);
  const intl = order.address.country !== 'Papua New Guinea';
  const canConfirm = (order.status === 'shipped' || order.status === 'delivered') && !order.confirmedAt;

  return (
    <Screen padded={false} footer={
      !isBuyer ? undefined
        : canConfirm ? <Button title={order.status === 'shipped' ? 'I\'ve received it' : 'Confirm delivery'} flex onPress={() => confirm({
          title: 'Confirm you received it?', body: 'This releases the payment to the artist.', confirm: 'Yes, received',
          onConfirm: async () => { if (await act(confirmDelivery(order.id), 'Thank you. Payment released to the artist.')) router.push(`/orders/${order.id}/review`); },
        })} />
          : order.status === 'delivered' && !order.reviewed ? <Button title="Leave a review" flex onPress={() => router.push(`/orders/${order.id}/review`)} />
            : order.status === 'placed' ? <Button title="Cancel order" kind="outline" flex onPress={() => confirm({
              title: 'Cancel this order?', body: 'You will be refunded in full.', confirm: 'Cancel order', danger: true,
              onConfirm: () => { void act(cancelOrder(order.id), 'Order cancelled and refunded'); },
            })} />
              : undefined
    }>
      <Header title={order.number} />
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        <Row><T v="h2" style={{ flex: 1 }}>{order.status === 'cancelled' ? 'Cancelled' : STEPS[idx].label}</T><StatusBadge status={order.status} /></Row>
        {items.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/artwork/${a.id}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 64, height: 80, borderRadius: 10 }} />
            <View style={{ flex: 1 }}><T v="label">{a.title}</T><T v="caption" color="textMuted">{kina(a.price)}</T></View>
            <Pressable onPress={() => router.push(`/certificate/${a.certificateSerial}`)} hitSlop={8}><Icon name="cert" color={c.verifiedText} /></Pressable>
          </Pressable>
        ))}

        {order.trackingNo && (
          <Pressable onPress={async () => { await Clipboard.setStringAsync(order.trackingNo!); toast('Tracking number copied'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
            <Icon name="truck" color={c.text} />
            <View style={{ flex: 1 }}><T v="caption" color="textMuted">{order.shipping.carrier} tracking</T><T v="serial">{order.trackingNo}</T></View>
            <Icon name="copy" size={18} color={c.textMuted} />
          </Pressable>
        )}

        {order.status !== 'cancelled' && (
          <View style={{ gap: 0 }}>
            {STEPS.map((s, i) => {
              const ev = order.events.find((e) => e.status === s.status);
              const done = i <= idx;
              const current = i === idx;
              return (
                <View key={s.status} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ alignItems: 'center', width: 24 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? (current && s.status !== 'delivered' ? c.primary : c.success) : c.element }}>
                      {done && <Icon name="check" size={14} color="#fff" />}
                    </View>
                    {i < STEPS.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 34, backgroundColor: i < idx ? c.success : c.border }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: 18 }}>
                    <T v="label" color={done ? 'text' : 'textMuted'}>{s.label}{s.status === 'shipped' && intl ? ' · customs on arrival' : ''}</T>
                    <T v="caption" color="textMuted">{ev ? `${date(ev.at)} ${time(ev.at)}${ev.note ? ` · ${ev.note}` : ''}` : s.sub}</T>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        {artist && <Card style={{ gap: 12 }}><ArtistChip artist={artist} /><Button title="Message artist" icon="chat" kind="outline" size="sm" onPress={() => toast('In-app messaging is coming soon. Contact support from Help in the meantime.')} /></Card>}

        <Card style={{ gap: 6 }}>
          <T v="overline" color="textMuted">Delivery address</T>
          <T v="bodySm">{order.address.name} · {order.address.phone}</T>
          <T v="bodySm" color="textSecondary">{order.address.line1}, {order.address.city} {order.address.postcode}, {order.address.country}</T>
        </Card>
        <Card style={{ gap: 6 }}>
          <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Subtotal</T><T v="bodySm">{kina(order.subtotal, true)}</T></Row>
          <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>{order.shipping.label}</T><T v="bodySm">{kina(order.shipping.price, true)}</T></Row>
          {order.permitFee > 0 && <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Export permit</T><T v="bodySm">{kina(order.permitFee, true)}</T></Row>}
          <Row><T v="bodyStrong" style={{ flex: 1 }}>Total · {order.payment}</T><T v="bodyStrong">{kina(order.total, true)}</T></Row>
        </Card>
        <Pressable onPress={() => router.push('/help')} style={{ alignItems: 'center', padding: 8 }}><T v="label" color="primary">Need help with this order?</T></Pressable>
      </View>
    </Screen>
  );
}
