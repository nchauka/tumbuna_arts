import { router } from 'expo-router';
import { Pressable, StyleProp, Text, useWindowDimensions, View, ViewStyle } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { Icon } from '@/components/icon';
import { Badge, haptic, Row, Seal, T } from '@/components/ui';
import { categories, provinces } from '@/data/seed';
import type { Artist, Artwork, Order, OrderStatus, Review, Story } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { convert, date, kina } from '@/lib/format';
import { radius, space } from '@/constants/tokens';
import { artistRating, useStore } from '@/store';

export const provinceName = (slug: string) => provinces.find((p) => p.slug === slug)?.name ?? slug;
export const provinceShort = (slug: string) => provinceName(slug).replace(/ \(.*\)/, '').replace('Autonomous Region of ', '');
export const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

export function Price({ value, size = 'md', showFx = true }: { value: number; size?: 'sm' | 'md' | 'lg'; showFx?: boolean }) {
  const currency = useStore((s) => s.settings.currency);
  const fs = { sm: 15, md: 17, lg: 24 }[size];
  return (
    <Row gap={6} style={{ alignItems: 'baseline' }}>
      <T v="price" style={{ fontSize: fs, lineHeight: fs + 4 }}>{kina(value)}</T>
      {showFx && currency !== 'PGK' && <T v="caption" color="textMuted">≈ {convert(value, currency)}</T>}
    </Row>
  );
}

export function ArtworkCard({ art, width, style }: { art: Artwork; width?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const artist = useStore((s) => s.artists.find((a) => a.id === art.artistId));
  const wished = useStore((s) => s.wishlist.includes(art.id));
  const toggle = useStore((s) => s.toggleWishlist);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${art.title}, ${kina(art.price)}`} onPress={() => router.push(`/artwork/${art.id}`)}
      style={({ pressed }) => [{ width, gap: 6, opacity: pressed ? 0.85 : 1 }, style]}>
      <View>
        <ArtImage pattern={art.pattern} variant={art.variant} uri={art.images[0]} style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.md }} />
        <Pressable accessibilityLabel={wished ? 'Remove from wishlist' : 'Save to wishlist'} hitSlop={8} onPress={() => { haptic(); toggle(art.id); }}
          style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={17} color={wished ? '#D62828' : '#1C1C1C'} fill={wished ? '#D62828' : 'none'} />
        </Pressable>
        {art.status === 'sold' && <View style={{ position: 'absolute', left: 8, top: 8 }}><Badge label="Sold" tone="dark" /></View>}
      </View>
      <T v="label" numberOfLines={2} style={{ lineHeight: 18 }}>{art.title}</T>
      <Row gap={4}>
        <T v="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>{artist?.name}</T>
        {artist?.verification === 'verified' && <Seal size={13} />}
      </Row>
      <Text style={{ color: c.text }}><Price value={art.price} size="sm" showFx={false} /></Text>
    </Pressable>
  );
}

/** Two-column grid that keeps the 4:5 card shape at any width. */
export function ArtworkGrid({ items, padded = true }: { items: Artwork[]; padded?: boolean }) {
  const { width } = useWindowDimensions();
  const max = Math.min(width, 900);
  const cols = max > 640 ? 3 : 2;
  const gutter = 12;
  const w = (max - space.md * (padded ? 2 : 0) - gutter * (cols - 1)) / cols;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: gutter, rowGap: 20, paddingHorizontal: padded ? space.md : 0 }}>
      {items.map((a) => <ArtworkCard key={a.id} art={a} width={w} />)}
    </View>
  );
}

export function ArtistAvatar({ artist, size = 56, ring }: { artist: Artist; size?: number; ring?: boolean }) {
  const { c } = useTheme();
  const verified = artist.verification === 'verified';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring ? 2.5 : 0, borderWidth: ring ? 2 : 0, borderColor: verified ? c.verified : c.border }}>
      <ArtImage pattern={artist.pattern} variant={artist.variant} uri={artist.avatarUri} seed={artist.name.length} style={{ flex: 1, borderRadius: size }} />
    </View>
  );
}

export function ArtistChip({ artist }: { artist: Artist }) {
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityRole="button">
      <ArtistAvatar artist={artist} size={36} />
      <View style={{ flex: 1 }}>
        <Row gap={5}><T v="label">{artist.name}</T>{artist.verification === 'verified' && <Seal />}</Row>
        <T v="caption" color="textMuted">{artist.village ? `${artist.village} · ` : ''}{provinceShort(artist.province)}</T>
      </View>
    </Pressable>
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  const { c } = useTheme();
  const works = useStore((s) => s.artworks.filter((a) => a.artistId === artist.id && a.status !== 'draft' && a.status !== 'hidden').slice(0, 3));
  const following = useStore((s) => s.following.includes(artist.id));
  const toggle = useStore((s) => s.toggleFollow);
  const rating = useStore((s) => artistRating(s, artist.id));
  return (
    <Pressable onPress={() => router.push(`/artist/${artist.id}`)} style={{ backgroundColor: c.surfaceRaised, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <View style={{ flexDirection: 'row', height: 92, gap: 2 }}>
        {(works.length ? works : [null, null, null]).map((w, i) => (
          <ArtImage key={w?.id ?? i} pattern={w?.pattern ?? artist.pattern} variant={w?.variant} uri={w?.images[0]} style={{ flex: 1 }} />
        ))}
      </View>
      <Row gap={12} style={{ padding: 14, paddingTop: 0, marginTop: -22, alignItems: 'flex-end' }}>
        <View style={{ borderWidth: 3, borderColor: c.surfaceRaised, borderRadius: 40 }}><ArtistAvatar artist={artist} size={56} /></View>
        <View style={{ flex: 1, paddingBottom: 2 }}>
          <Row gap={5}><T v="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{artist.name}</T>{artist.verification === 'verified' && <Seal size={18} />}</Row>
          <T v="caption" color="textMuted" numberOfLines={1}>{artist.crafts.join(', ')} · {provinceShort(artist.province)}{rating.count ? ` · ★ ${rating.avg.toFixed(1)}` : ''}</T>
        </View>
        <Pressable onPress={() => { haptic(); toggle(artist.id); }} accessibilityRole="button"
          style={{ paddingHorizontal: 14, height: 34, borderRadius: radius.pill, borderWidth: 1.5, borderColor: following ? c.primary : c.border, backgroundColor: following ? c.primaryTint : 'transparent', justifyContent: 'center' }}>
          <T v="label" color={following ? 'primary' : 'text'} style={{ fontSize: 13 }}>{following ? 'Following' : 'Follow'}</T>
        </Pressable>
      </Row>
    </Pressable>
  );
}

export function StoryCard({ story, width }: { story: Story; width?: number }) {
  return (
    <Pressable onPress={() => router.push(`/heritage/story/${story.slug}`)} style={{ width, gap: 8 }} accessibilityRole="button">
      <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
        <ArtImage pattern={story.pattern} variant={story.variant} style={{ width: '100%', height: 150 }} />
        <View style={{ position: 'absolute', left: 10, bottom: 10 }}><Badge label={`${story.readMins} min read`} tone="heritage" /></View>
      </View>
      <T v="overline" color="heritage">{provinceShort(story.province)}</T>
      <T v="h3" numberOfLines={2}>{story.title}</T>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, [string, Parameters<typeof Badge>[0]['tone']]> = {
    placed: ['Placed', 'warning'], packed: ['Packing', 'warning'], shipped: ['Shipped', 'heritage'], delivered: ['Delivered', 'success'], cancelled: ['Cancelled', 'neutral'],
  };
  return <Badge label={map[status][0]} tone={map[status][1]} />;
}

export function OrderRow({ order, onPress, right }: { order: Order; onPress?: () => void; right?: React.ReactNode }) {
  const { c } = useTheme();
  const art = useStore((s) => s.artworks.find((a) => a.id === order.items[0]?.artworkId));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, backgroundColor: c.surfaceRaised, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, opacity: pressed ? 0.85 : 1 })}>
      {art && <ArtImage pattern={art.pattern} variant={art.variant} uri={art.images[0]} style={{ width: 56, height: 56, borderRadius: 10 }} />}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" numberOfLines={1}>{art?.title ?? 'Artwork'}{order.items.length > 1 ? ` +${order.items.length - 1}` : ''}</T>
        <T v="caption" color="textMuted">{order.number} · {date(order.createdAt)}</T>
        <T v="caption" color="textSecondary">{order.buyerName !== undefined && right ? `${order.buyerName} · ${order.address.city}` : kina(order.total, true)}</T>
      </View>
      {right ?? <StatusBadge status={order.status} />}
    </Pressable>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { c } = useTheme();
  return <Row gap={2}>{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} color={c.verified} fill={i <= Math.round(value) ? c.verified : 'none'} />)}</Row>;
}

export function ReviewItem({ review }: { review: Review }) {
  return (
    <View style={{ gap: 6, paddingVertical: 12 }}>
      <Row><Stars value={review.rating} /><T v="caption" color="textMuted" style={{ marginLeft: 6 }}>{review.userName} · {date(review.at)}</T></Row>
      {!!review.text && <T v="bodySm">{review.text}</T>}
      {review.tags.length > 0 && <Row gap={6} style={{ flexWrap: 'wrap' }}>{review.tags.map((t) => <Badge key={t} label={t} />)}</Row>}
    </View>
  );
}

export function BarChart({ values, labels, highlight, height = 90 }: { values: number[]; labels: string[]; highlight?: number; height?: number }) {
  const { c } = useTheme();
  const max = Math.max(1, ...values);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(4, (v / max) * height), borderRadius: 4, backgroundColor: i === highlight ? c.primary : c.element }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {labels.map((l, i) => <T key={i} v="caption" color={i === highlight ? 'text' : 'textMuted'} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>{l}</T>)}
      </View>
    </View>
  );
}
