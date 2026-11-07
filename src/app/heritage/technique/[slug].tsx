import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { ArtistChip, ArtworkCard } from '@/components/cards';
import { Button, Chip, Empty, IconButton, Row, StickyFooter, T } from '@/components/ui';
import { techniques } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

export default function TechniqueDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = techniques.find((x) => x.slug === slug);
  const works = useStore((s) => s.artworks.filter((a) => a.techniques.includes(slug) && a.status === 'live'));
  const artists = useStore((s) => s.artists.filter((a) => works.some((w) => w.artistId === a.id)));
  if (!t) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}><Empty title="Technique not found" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: 230 + insets.top }}>
          <ArtImage pattern={t.pattern} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(94,61,36,0.6)' }} />
          <View style={{ position: 'absolute', top: insets.top + 8, left: 12 }}><IconButton name="back" label="Back" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => router.back()} /></View>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18, gap: 4 }}>
            <T v="overline" style={{ color: c.verified }}>Technique · {t.where}</T>
            <T v="display" style={{ color: '#fff' }}>{t.name}</T>
          </View>
        </View>
        <View style={{ padding: 16, gap: 22 }}>
          <T style={{ fontSize: 17, lineHeight: 26 }}>{t.summary}</T>
          <View style={{ borderLeftWidth: 2, borderLeftColor: c.border, marginLeft: 11, paddingLeft: 22, gap: 20 }}>
            {t.steps.map((s, i) => (
              <View key={s.title} style={{ gap: 4 }}>
                <View style={{ position: 'absolute', left: -35, top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: c.heritage, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="caption" style={{ color: '#fff', fontFamily: 'Manrope_800ExtraBold' }}>{i + 1}</T>
                </View>
                <T v="h3" color="heritageDeep">{s.title}</T>
                <T color="textSecondary">{s.body}</T>
              </View>
            ))}
          </View>
          <View style={{ gap: 8 }}>
            <T v="overline" color="textMuted">Tools</T>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>{t.tools.map((x) => <Chip key={x} label={x} tone="verified" />)}</Row>
          </View>
          {artists.length > 0 && (
            <View style={{ gap: 12 }}>
              <T v="overline" color="textMuted">Masters of this technique</T>
              {artists.map((a) => <ArtistChip key={a.id} artist={a} />)}
            </View>
          )}
        </View>
        {works.length > 0 && (
          <View style={{ gap: 12 }}>
            <T v="h3" style={{ paddingHorizontal: 16 }}>Made this way</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>{works.map((a) => <ArtworkCard key={a.id} art={a} width={150} />)}</ScrollView>
          </View>
        )}
      </ScrollView>
      {works.length > 0 && <StickyFooter><Button title="See works made this way" flex onPress={() => router.push({ pathname: '/artworks', params: { technique: t.slug } })} /></StickyFooter>}
    </View>
  );
}
