import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { KunduSeal } from '@/components/brand';
import { Icon } from '@/components/icon';
import { Button, Card, haptic, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function OrderSuccess() {
  const { id, ids } = useLocalSearchParams<{ id: string; ids?: string }>();
  const { c } = useTheme();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const siblings = useStore((s) => s.orders.filter((o) => (ids ? ids.split(',') : [id]).includes(o.id)));
  const artworks = useStore((s) => s.artworks);
  const artists = useStore((s) => s.artists);
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    haptic('success');
    Animated.spring(scale, { toValue: 1, damping: 9, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [scale]);

  if (!order) return null;
  const items = siblings.flatMap((o) => o.items.map((i) => artworks.find((a) => a.id === i.artworkId)!)).filter(Boolean);
  const makers = [...new Set(items.map((a) => artists.find((x) => x.id === a.artistId)?.name.split(' ')[0]))].join(' and ');
  const total = siblings.reduce((t, o) => t + o.total, 0);

  return (
    <Screen footer={<View style={{ flex: 1, gap: 8 }}><Button title="Track order" onPress={() => router.replace(`/orders/${order.id}`)} /><Button title="Continue shopping" kind="outline" onPress={() => router.replace('/home')} /></View>}>
      <View style={{ alignItems: 'center', gap: 14, paddingTop: 40 }}>
        <Animated.View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: c.verifiedTint, alignItems: 'center', justifyContent: 'center', transform: [{ scale }] }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={40} color="#fff" strokeWidth={3} /></View>
        </Animated.View>
        <T v="display" center style={{ fontSize: 30 }}>Tenkyu tru!</T>
        <T center color="textSecondary">Your order is confirmed. {makers} will be notified to start packing.</T>
        <T v="serial" color="textMuted">{siblings.map((o) => o.number).join(' · ')}</T>
      </View>
      <View style={{ gap: 12, marginTop: 28 }}>
        {items.map((a) => (
          <Row key={a.id} gap={12}>
            <ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 56, height: 70, borderRadius: 10 }} />
            <View style={{ flex: 1 }}><T v="label">{a.title}</T><T v="caption" color="textMuted">{order.shipping.label} · {order.shipping.eta}</T></View>
          </Row>
        ))}
        <Row><T color="textSecondary" style={{ flex: 1 }}>Total paid</T><T v="price">{kina(total, true)}</T></Row>
        <Pressable onPress={() => items[0] && router.push(`/certificate/${items[0].certificateSerial}`)}>
          <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: c.verifiedTint, borderColor: c.verifiedTint, borderRadius: radius.lg }}>
            <KunduSeal size={52} />
            <View style={{ flex: 1 }}>
              <T v="label">Your certificate{items.length > 1 ? 's are' : ' is'} ready</T>
              <T v="caption" color="textSecondary">Ownership is now registered to you. Find it any time in Profile → Certificates.</T>
            </View>
            <Icon name="chev" size={18} color={c.textSecondary} />
          </Card>
        </Pressable>
      </View>
    </Screen>
  );
}
