import { router } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { CartBar } from '@/components/cart-bar';
import { ConnectionBanner } from '@/components/connection-banner';
import { provinceShort } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Chip, Section, T } from '@/components/ui';
import { categories, provinces } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function Explore() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artworks = useStore((s) => s.artworks);
  const count = (slug: string) => artworks.filter((a) => a.status === 'live' && a.category === slug).length;
  const tileW = (Math.min(width, 900) - 32 - 12) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 14 }}>
          <T v="h1">Explore</T>
          <Pressable onPress={() => router.push('/search')} style={{ height: 48, borderRadius: radius.pill, backgroundColor: c.element, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 }}>
            <Icon name="search" size={18} color={c.textMuted} />
            <T color="textMuted">Search artworks, artists, stories</T>
          </Pressable>
        </View>
        <ConnectionBanner />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 }}>
          {categories.map((ct) => (
            <Pressable key={ct.slug} onPress={() => router.push({ pathname: '/artworks', params: { category: ct.slug } })} style={({ pressed }) => ({ width: tileW, height: 132, borderRadius: radius.lg, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}>
              <ArtImage pattern={ct.pattern} variant={ct.variant} style={{ flex: 1 }} />
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(28,28,28,0.38)' }} />
              <View style={{ position: 'absolute', left: 12, bottom: 10, right: 12 }}>
                <T v="h3" style={{ color: '#fff' }}>{ct.name}</T>
                <T v="caption" style={{ color: '#E6E0DA' }}>{count(ct.slug)} works</T>
              </View>
            </Pressable>
          ))}
        </View>
        <Section title="Shop by province" action="All provinces" onAction={() => router.push('/heritage/provinces')} style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
            {provinces.map((p) => <Chip key={p.slug} label={provinceShort(p.slug)} icon="pin" tone="heritage" onPress={() => router.push(`/heritage/province/${p.slug}`)} />)}
          </View>
        </Section>
        <Section title="Quick filters">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
            <Chip label="Under K 200" onPress={() => router.push({ pathname: '/artworks', params: { max: '200' } })} />
            <Chip label="Verified artists only" icon="seal" tone="verified" onPress={() => router.push({ pathname: '/artworks', params: { verified: '1' } })} />
            <Chip label="No export permit needed" onPress={() => router.push({ pathname: '/artworks', params: { nopermit: '1' } })} />
            <Chip label="Featured" onPress={() => router.push({ pathname: '/artworks', params: { featured: '1' } })} />
          </View>
        </Section>
      </ScrollView>
      <CartBar />
    </View>
  );
}
