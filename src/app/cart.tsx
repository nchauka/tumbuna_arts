import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { provinceShort } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Button, Empty, Header, Row, Screen, Seal, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { requireAuth } from '@/lib/auth';
import { convert, kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function Cart() {
  const { c } = useTheme();
  const cart = useStore((s) => s.cart);
  const artworks = useStore((s) => s.artworks);
  const artists = useStore((s) => s.artists);
  const currency = useStore((s) => s.settings.currency);
  const remove = useStore((s) => s.removeFromCart);
  const items = cart.map((id) => artworks.find((a) => a.id === id)).filter((a) => !!a);
  const groups = [...new Set(items.map((a) => a.artistId))].map((aid) => ({ artist: artists.find((a) => a.id === aid)!, items: items.filter((a) => a.artistId === aid) }));
  const subtotal = items.reduce((t, a) => t + a.price, 0);
  const unavailable = items.filter((a) => a.status !== 'live');

  if (!items.length) {
    return (
      <Screen padded={false}>
        <Header title="Cart" />
        <Empty icon="bag" title="Your cart is empty" body="Every piece is hand-made, and most are one of a kind." action="Start exploring" onAction={() => router.replace('/home')} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} footer={
      <View style={{ flex: 1, gap: 6 }}>
        {unavailable.length > 0 && <T v="caption" color="error">Remove sold items to continue.</T>}
        <Button title={`Checkout · ${kina(subtotal)}`} disabled={unavailable.length > 0} onPress={() => requireAuth(() => router.push('/checkout'), '/checkout')} />
      </View>
    }>
      <Header title={`Cart (${items.length})`} />
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        {groups.map(({ artist, items: its }) => (
          <View key={artist.id} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            <Row style={{ backgroundColor: c.surface, padding: 12 }} gap={6}>
              <T v="label">Ships from {artist.name}</T>{artist.verification === 'verified' && <Seal />}
              <T v="caption" color="textMuted" style={{ marginLeft: 'auto' }}>{provinceShort(artist.province)}</T>
            </Row>
            {its.map((a) => (
              <Row key={a.id} gap={12} style={{ padding: 12, borderTopWidth: 1, borderTopColor: c.border }}>
                <Pressable onPress={() => router.push(`/artwork/${a.id}`)}><ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 72, height: 90, borderRadius: 10 }} /></Pressable>
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="label" numberOfLines={2}>{a.title}</T>
                  <T v="caption" color="textMuted">{a.oneOfAKind ? 'One of a kind' : 'Small batch'}{a.exportPermit ? ' · Export permit for overseas' : ''}</T>
                  {a.status !== 'live' ? <T v="caption" color="error">No longer available</T> : <T v="price" style={{ fontSize: 16 }}>{kina(a.price)}</T>}
                </View>
                <Pressable onPress={() => remove(a.id)} hitSlop={10} accessibilityLabel={`Remove ${a.title}`}><Icon name="trash" size={20} color={c.textMuted} /></Pressable>
              </Row>
            ))}
          </View>
        ))}
        <View style={{ gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: c.surface }}>
          <Row><T color="textSecondary" style={{ flex: 1 }}>Subtotal</T><T v="bodyStrong">{kina(subtotal, true)}</T></Row>
          <Row><T color="textSecondary" style={{ flex: 1 }}>Shipping</T><T v="bodySm" color="textMuted">Calculated at checkout</T></Row>
          {currency !== 'PGK' && <T v="caption" color="textMuted" style={{ textAlign: 'right' }}>≈ {convert(subtotal, currency)} · you pay in PGK</T>}
          <Row gap={8} style={{ marginTop: 6 }}><Icon name="lock" size={16} color={c.success} /><T v="caption" color="textSecondary" style={{ flex: 1 }}>Your payment is held until you confirm delivery. Each artist ships separately.</T></Row>
        </View>
      </View>
    </Screen>
  );
}
