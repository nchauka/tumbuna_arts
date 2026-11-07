import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { ArtistAvatar, ArtworkGrid, StoryCard } from '@/components/cards';
import { Button, Chip, Empty, IconButton, Row, Section, StickyFooter, T } from '@/components/ui';
import { provinces, stories } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

export default function ProvinceDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = provinces.find((x) => x.slug === slug);
  const works = useStore((s) => s.artworks.filter((a) => a.province === slug && a.status === 'live'));
  const artists = useStore((s) => s.artists.filter((a) => a.province === slug));
  if (!p) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}><Empty title="Province not found" /></View>;
  const related = stories.filter((s) => s.province === slug);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 240 + insets.top }}>
          <ArtImage pattern={p.pattern} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,28,0.5)' }} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 12 }}><IconButton name="back" label="Back" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => router.back()} /></View>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18, gap: 4 }}>
            <T v="overline" style={{ color: c.verified }}>{p.region} region · capital {p.capital}</T>
            <T v="display" style={{ color: '#fff' }}>{p.name}</T>
          </View>
        </View>
        <View style={{ padding: 16, gap: 14 }}>
          <T>{p.blurb}</T>
          <View style={{ gap: 8 }}>
            <T v="overline" color="textMuted">Signature crafts</T>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>{p.crafts.map((cr) => <Chip key={cr} label={cr} tone="heritage" />)}</Row>
          </View>
        </View>
        {artists.length > 0 && (
          <Section title="Artists from here" style={{ marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
              {artists.map((a) => (
                <Pressable key={a.id} style={{ alignItems: 'center', gap: 6, width: 76 }} onPress={() => router.push(`/artist/${a.id}`)}>
                  <ArtistAvatar artist={a} size={64} ring /><T v="caption" numberOfLines={1} style={{ fontFamily: 'Manrope_700Bold' }}>{a.name.split(' ')[0]}</T>
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        )}
        {related.length > 0 && (
          <Section title="Stories">
            <View style={{ paddingHorizontal: 16, gap: 16 }}>{related.map((s) => <StoryCard key={s.slug} story={s} />)}</View>
          </Section>
        )}
        <Section title={`Works for sale (${works.length})`}>
          {works.length ? <ArtworkGrid items={works} /> : <T color="textMuted" style={{ paddingHorizontal: 16 }}>No works listed from {p.name} yet. Artists here can join from the Studio.</T>}
        </Section>
      </ScrollView>
      {works.length > 0 && <StickyFooter><Button title={`Shop ${p.name.replace(/ \(.*\)/, '')}`} flex onPress={() => router.push({ pathname: '/artworks', params: { province: p.slug } })} /></StickyFooter>}
    </View>
  );
}
