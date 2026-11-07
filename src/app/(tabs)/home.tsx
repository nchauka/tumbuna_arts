import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { CartBar } from '@/components/cart-bar';
import { ConnectionBanner } from '@/components/connection-banner';
import { ArtistAvatar, ArtworkCard, ArtworkGrid, provinceShort } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Chip, ChipRow, IconButton, Row, Section, T } from '@/components/ui';
import { categories, provinces, stories } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { greeting } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useMe, useStore } from '@/store';

export default function Home() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const artworks = useStore((s) => s.artworks);
  const artists = useStore((s) => s.artists);
  const cartCount = useStore((s) => s.cart.length);
  const unread = useStore((s) => s.notifications.filter((n) => !n.read).length);
  const wishlist = useStore((s) => s.wishlist);
  const refresh = useStore((s) => s.refresh);
  const [cat, setCat] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const live = useMemo(() => artworks.filter((a) => a.status === 'live'), [artworks]);
  const featured = live.filter((a) => a.featured).slice(0, 8);
  const forYou = useMemo(() => {
    const base = cat ? live.filter((a) => a.category === cat) : live;
    // Light personalisation: works in categories the user has saved come first.
    const likedCats = new Set(artworks.filter((a) => wishlist.includes(a.id)).map((a) => a.category));
    return [...base].sort((a, b) => Number(likedCats.has(b.category)) - Number(likedCats.has(a.category)) || b.createdAt - a.createdAt).slice(0, 12);
  }, [cat, live, artworks, wishlist]);
  const hero = stories[new Date().getDate() % stories.length];
  const topArtists = [...artists].sort((a, b) => Number(b.verification === 'verified') - Number(a.verification === 'verified')).slice(0, 8);
  const newest = [...live].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.primary} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}>
        <Row style={{ paddingHorizontal: 16, paddingTop: 8 }} gap={2}>
          <View style={{ flex: 1 }}>
            <T v="bodySm" color="textMuted">{greeting()},</T>
            <T v="h2">{me ? me.name.split(' ')[0] : 'welcome'}</T>
          </View>
          <IconButton name="scan" label="Scan QR to verify" onPress={() => router.push('/scan')} />
          <IconButton name="bell" label="Notifications" badge={unread} onPress={() => router.push(me ? '/notifications' : '/login')} />
          <IconButton name="bag" label="Cart" badge={cartCount} onPress={() => router.push('/cart')} />
        </Row>

        <Pressable onPress={() => router.push('/search')} accessibilityRole="search" style={{ marginHorizontal: 16, marginTop: 14, height: 48, borderRadius: radius.pill, backgroundColor: c.element, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
          <Icon name="search" size={18} color={c.textMuted} />
          <T color="textMuted">Carvings, bilums, artists…</T>
        </Pressable>

        <ConnectionBanner />

        <ChipRow style={{ marginTop: 14 }}>
          <Chip label="For you" selected={!cat} onPress={() => setCat(null)} />
          {categories.slice(0, 8).map((ct) => <Chip key={ct.slug} label={ct.name.replace('Shell & bead ', '')} selected={cat === ct.slug} onPress={() => setCat(cat === ct.slug ? null : ct.slug)} />)}
        </ChipRow>

        {!cat && (
          <Pressable onPress={() => router.push(`/heritage/story/${hero.slug}`)} style={{ marginHorizontal: 16, marginTop: 16, borderRadius: radius.xl, overflow: 'hidden' }}>
            <ArtImage pattern={hero.pattern} variant={hero.variant} style={{ height: 190 }} />
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(28,28,28,0.45)' }} />
            <View style={{ position: 'absolute', left: 16, right: 16, bottom: 14, gap: 4 }}>
              <T v="overline" style={{ color: c.verified }}>Heritage story · {provinceShort(hero.province)}</T>
              <T v="h2" style={{ color: '#fff' }}>{hero.title}</T>
              <T v="caption" style={{ color: '#E6E0DA' }}>{hero.readMins} min read · {hero.teller}</T>
            </View>
          </Pressable>
        )}

        {!cat && <>
          <Section title="Featured artists" action="See all" onAction={() => router.push('/artists')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
              {topArtists.map((a) => (
                <Pressable key={a.id} onPress={() => router.push(`/artist/${a.id}`)} style={{ alignItems: 'center', gap: 6, width: 68 }}>
                  <ArtistAvatar artist={a} size={64} ring />
                  <T v="caption" numberOfLines={1} style={{ fontFamily: 'Manrope_700Bold' }}>{a.name.split(' ')[0]}</T>
                </Pressable>
              ))}
            </ScrollView>
          </Section>

          <Section title="Featured artworks" action="See all" onAction={() => router.push({ pathname: '/artworks', params: { featured: '1' } })}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {featured.map((a) => <ArtworkCard key={a.id} art={a} width={156} />)}
            </ScrollView>
          </Section>

          <Section title="Explore by province" action="Map" onAction={() => router.push('/heritage/provinces')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
              {provinces.filter((p) => live.some((a) => a.province === p.slug)).map((p) => (
                <Pressable key={p.slug} onPress={() => router.push(`/heritage/province/${p.slug}`)} style={{ width: 140, borderRadius: radius.lg, overflow: 'hidden' }}>
                  <ArtImage pattern={p.pattern} style={{ height: 90 }} />
                  <View style={{ padding: 10, backgroundColor: c.heritageTint }}>
                    <T v="label" numberOfLines={1}>{provinceShort(p.slug)}</T>
                    <T v="caption" color="heritage">{live.filter((a) => a.province === p.slug).length} works</T>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Section>

          <Section title="New this week">
            <ArtworkGrid items={newest} />
          </Section>
        </>}

        {cat && (
          <View style={{ marginTop: 20 }}>
            {forYou.length ? <ArtworkGrid items={forYou} /> : <T color="textMuted" center style={{ padding: 40 }}>No works in this category yet.</T>}
          </View>
        )}
        {!cat && (
          <Section title="Picked for you">
            <ArtworkGrid items={forYou.slice(0, 6)} />
          </Section>
        )}
      </ScrollView>
      <CartBar />
    </View>
  );
}
