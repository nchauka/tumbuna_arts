import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { ArtistChip, ArtworkCard, categoryName, provinceShort, ReviewItem, Stars } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Badge, Button, Chip, Divider, Empty, haptic, IconButton, Row, StickyFooter, T, Tabs, toast } from '@/components/ui';
import { materials, techniques } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { requireAuth } from '@/lib/auth';
import { convert, kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { artistRating, PERMIT_FEE, useStore } from '@/store';

export default function ArtworkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const art = useStore((s) => s.artworks.find((a) => a.id === id));
  const artist = useStore((s) => s.artists.find((a) => a.id === art?.artistId));
  const artworks = useStore((s) => s.artworks);
  const reviews = useStore((s) => s.reviews.filter((r) => r.artistId === art?.artistId));
  const rating = useStore((s) => (art ? artistRating(s, art.artistId) : { avg: 0, count: 0 }));
  const inCart = useStore((s) => s.cart.includes(id));
  const wished = useStore((s) => s.wishlist.includes(id));
  const mine = useStore((s) => !!art && s.me?.artistId === art.artistId);
  const currency = useStore((s) => s.settings.currency);
  const { addToCart, toggleWishlist, incrementViews } = useStore.getState();
  const [tab, setTab] = useState<'story' | 'details' | 'shipping'>('story');
  const [page, setPage] = useState(0);
  const viewed = useRef(false);

  useEffect(() => {
    if (art && !viewed.current) { viewed.current = true; incrementViews(art.id); }
  }, [art, incrementViews]);

  if (!art || !artist) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}><Empty title="Artwork not found" body="It may have been removed by the artist." action="Go home" onAction={() => router.replace('/home')} /></View>;

  const slides: { uri?: string; v?: number }[] = art.images.length ? art.images.map((uri) => ({ uri, v: art.variant })) : [{ uri: undefined, v: art.variant }, { uri: undefined, v: (art.variant ?? 0) + 1 }, { uri: undefined, v: (art.variant ?? 0) + 2 }];
  const moreByArtist = artworks.filter((a) => a.artistId === art.artistId && a.id !== art.id && a.status === 'live').slice(0, 6);
  const sameProvince = artworks.filter((a) => a.province === art.province && a.artistId !== art.artistId && a.status === 'live').slice(0, 6);
  const heroH = Math.min(width, 700) * 1.05;

  const add = () => {
    addToCart(art.id); haptic('success');
    toast('Added to cart');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <FlatList
            data={slides} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(_, i) => String(i)}
            onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))} scrollEventThrottle={32}
            renderItem={({ item, index }) => <ArtImage pattern={art.pattern} variant={index === 0 ? art.variant : item.v} uri={item.uri} seed={index + 1} style={{ width, height: heroH }} />}
          />
          <Row style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
            <IconButton name="back" label="Back" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
            <View style={{ flex: 1 }} />
            <IconButton name="share" label="Share" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => Share.share({ message: `${art.title} by ${artist.name} on Tumbuna Arts — ${kina(art.price)}. tumbunaarts://artwork/${art.id}` })} />
            <View style={{ width: 8 }} />
            <IconButton name="heart" label={wished ? 'Remove from wishlist' : 'Save to wishlist'} bg="rgba(255,255,255,0.94)" color={wished ? '#D62828' : '#1C1C1C'} fill={wished ? '#D62828' : 'none'} onPress={() => toggleWishlist(art.id)} />
          </Row>
          <Row gap={5} style={{ position: 'absolute', bottom: 14, alignSelf: 'center' }}>
            {slides.map((_, i) => <View key={i} style={{ width: i === page ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === page ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
          </Row>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            <Chip label={provinceShort(art.province)} icon="pin" tone="heritage" onPress={() => router.push(`/heritage/province/${art.province}`)} />
            <Chip label={categoryName(art.category)} onPress={() => router.push({ pathname: '/artworks', params: { category: art.category } })} />
            {art.oneOfAKind && <Chip label="One of a kind" tone="primary" />}
          </Row>
          <T v="h1">{art.title}</T>
          <ArtistChip artist={artist} />
          <Row style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <T v="price" style={{ fontSize: 26, lineHeight: 30 }}>{kina(art.price)}</T>
              <T v="caption" color="textMuted">≈ {convert(art.price, currency === 'PGK' ? 'USD' : currency)} · {art.views.toLocaleString()} views</T>
            </View>
            {rating.count > 0 && <Row gap={6}><Stars value={rating.avg} /><T v="label">{rating.avg.toFixed(1)}</T><T v="caption" color="textMuted">({rating.count})</T></Row>}
          </Row>

          <Pressable onPress={() => router.push(`/certificate/${art.certificateSerial}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.verifiedTint, borderRadius: radius.md, padding: 12 }}>
            <Icon name="seal" size={22} color={c.verified} />
            <View style={{ flex: 1 }}>
              <T v="label">Certificate of Authenticity included</T>
              <T v="caption" color="textSecondary">{artist.verification === 'verified' ? 'Verified artist · ' : ''}Serial {art.certificateSerial}</T>
            </View>
            <Icon name="chev" size={16} color={c.textSecondary} />
          </Pressable>

          <Tabs value={tab} onChange={setTab} options={[{ key: 'story', label: 'Story' }, { key: 'details', label: 'Details' }, { key: 'shipping', label: 'Shipping' }]} />

          {tab === 'story' && (
            <View style={{ gap: 12 }}>
              <T>{art.story || 'The artist has not added a story yet.'}</T>
              {!!art.significance && (
                <View style={{ borderLeftWidth: 3, borderLeftColor: c.heritage, paddingLeft: 12, gap: 4 }}>
                  <T v="overline" color="heritage">Cultural significance</T>
                  <T v="bodySm" color="textSecondary">{art.significance}</T>
                </View>
              )}
              {art.techniques.map((t) => {
                const tech = techniques.find((x) => x.slug === t);
                return tech && (
                  <Pressable key={t} onPress={() => router.push(`/heritage/technique/${t}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: c.heritageTint }}>
                    <Icon name="heritage" size={20} color={c.heritage} />
                    <View style={{ flex: 1 }}><T v="label">Technique: {tech.name}</T><T v="caption" color="textSecondary">See how it&apos;s made</T></View>
                    <Icon name="chev" size={16} color={c.heritage} />
                  </Pressable>
                );
              })}
            </View>
          )}
          {tab === 'details' && (
            <View>
              <Spec label="Materials" value={art.materials.map((m) => materials.find((x) => x.slug === m)?.name ?? m).join(', ') || '—'} />
              <Spec label="Technique" value={art.techniques.map((t) => techniques.find((x) => x.slug === t)?.name ?? t).join(', ') || 'Hand-made'} />
              <Spec label="Dimensions" value={art.dimensions || '—'} />
              <Spec label="Weight" value={`${art.weightKg} kg`} />
              <Spec label="Edition" value={art.oneOfAKind ? 'One of a kind' : 'Made to order, small batch'} />
              <Spec label="Care" value={materials.find((x) => x.slug === art.materials[0])?.care ?? 'Keep dry and out of direct sun.'} last />
            </View>
          )}
          {tab === 'shipping' && (
            <View>
              <Spec label="Ships from" value={`${artist.village ? artist.village + ', ' : ''}${provinceShort(art.province)}`} />
              <Spec label="Within PNG" value="Post PNG · K 35 standard (5–9 days) or K 60 EMS (2–4 days)" />
              <Spec label="International" value="DHL Express · K 165 (4–7 days) or Post PNG International K 95 (10–21 days)" />
              <Spec label="Export permit" value={art.exportPermit ? `Needed for international delivery. We arrange it with the National Museum & Art Gallery (K ${PERMIT_FEE}).` : 'Not needed. New work made for sale.'} />
              <Spec label="Buyer protection" value="Payment is held until you confirm delivery." last />
            </View>
          )}
        </View>

        <Divider style={{ marginHorizontal: 16 }} />
        <View style={{ padding: 16, gap: 4 }}>
          <Row><T v="h3" style={{ flex: 1 }}>Reviews of {artist.name.split(' ')[0]}</T>{rating.count > 0 && <Badge label={`★ ${rating.avg.toFixed(1)}`} tone="verified" />}</Row>
          {reviews.length ? reviews.slice(0, 3).map((r) => <ReviewItem key={r.id} review={r} />) : <T v="bodySm" color="textMuted" style={{ paddingVertical: 8 }}>No reviews yet.</T>}
        </View>

        {moreByArtist.length > 0 && (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Row style={{ paddingHorizontal: 16 }}><T v="h3" style={{ flex: 1 }}>More from {artist.name.split(' ')[0]}</T><Pressable onPress={() => router.push(`/artist/${artist.id}/portfolio`)}><T v="label" color="primary">See all</T></Pressable></Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>{moreByArtist.map((a) => <ArtworkCard key={a.id} art={a} width={150} />)}</ScrollView>
          </View>
        )}
        {sameProvince.length > 0 && (
          <View style={{ gap: 12, marginTop: 24 }}>
            <T v="h3" style={{ paddingHorizontal: 16 }}>Also from {provinceShort(art.province)}</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>{sameProvince.map((a) => <ArtworkCard key={a.id} art={a} width={150} />)}</ScrollView>
          </View>
        )}
      </ScrollView>

      <StickyFooter>
        {mine ? (
          <Button title="Edit listing" icon="edit" kind="dark" flex onPress={() => router.push({ pathname: '/upload', params: { id: art.id } })} />
        ) : art.status !== 'live' ? (
          <Button title={art.status === 'sold' ? 'Sold' : 'Not available'} disabled flex />
        ) : (
          <>
            <Pressable onPress={() => toggleWishlist(art.id)} accessibilityLabel="Save" style={{ width: 52, height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="heart" color={wished ? c.primary : c.text} fill={wished ? c.primary : 'none'} />
            </Pressable>
            {inCart ? <Button title="Go to cart" kind="dark" flex onPress={() => router.push('/cart')} /> : <Button title="Add to cart" flex onPress={add} />}
            <Button title="Buy now" kind="outline" onPress={() => { addToCart(art.id); requireAuth(() => router.push('/checkout'), '/checkout'); }} />
          </>
        )}
      </StickyFooter>
    </View>
  );
}

function Spec({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.border }}>
      <T v="bodySm" color="textMuted" style={{ width: 110 }}>{label}</T>
      <T v="bodySm" style={{ flex: 1 }}>{value}</T>
    </View>
  );
}

