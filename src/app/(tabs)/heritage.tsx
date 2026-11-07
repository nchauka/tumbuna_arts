import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { FaceMark } from '@/components/brand';
import { provinceShort, StoryCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Row, Section, T } from '@/components/ui';
import { materials, provinces, stories, techniques } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';

export default function Heritage() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const featured = stories[0];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ paddingTop: insets.top }}>
          <ArtImage pattern="carve" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 210 + insets.top }} />
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 210 + insets.top, backgroundColor: 'rgba(94,61,36,0.72)' }} />
          <View style={{ padding: 16, paddingTop: 20, gap: 10, height: 210 }}>
            <Row gap={10}><FaceMark size={40} /><T v="overline" style={{ color: c.verified }}>Cultural archive</T></Row>
            <T v="display" style={{ color: '#fff' }}>Heritage</T>
            <T v="bodySm" style={{ color: '#F3EAE2', maxWidth: 320 }}>Stories, places, techniques and materials behind the art of Papua New Guinea.</T>
          </View>
        </View>

        <Pressable onPress={() => router.push(`/heritage/story/${featured.slug}`)} style={{ margin: 16, marginTop: -18, backgroundColor: c.surfaceRaised, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
          <ArtImage pattern={featured.pattern} style={{ height: 150 }} />
          <View style={{ padding: 16, gap: 6 }}>
            <T v="overline" color="heritage">Story of the week · {provinceShort(featured.province)}</T>
            <T v="h2">{featured.title}</T>
            <T v="bodySm" color="textSecondary" numberOfLines={2}>{featured.intro}</T>
            <Row style={{ marginTop: 6 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.heritage, alignItems: 'center', justifyContent: 'center' }}><Icon name="play" size={13} color="#fff" fill="#fff" /></View>
              <T v="label" color="heritage">Read or listen · {featured.readMins} min</T>
            </Row>
          </View>
        </Pressable>

        <Section title="Stories" action="See all" onAction={() => router.push('/heritage/stories')} style={{ marginTop: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
            {stories.slice(1).map((s) => <StoryCard key={s.slug} story={s} width={230} />)}
          </ScrollView>
        </Section>

        <Section title="Provinces" action="Map" onAction={() => router.push('/heritage/provinces')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {provinces.map((p) => (
              <Pressable key={p.slug} onPress={() => router.push(`/heritage/province/${p.slug}`)} style={{ width: 120, gap: 6 }}>
                <ArtImage pattern={p.pattern} style={{ height: 120, borderRadius: radius.lg }} />
                <T v="label" numberOfLines={1}>{provinceShort(p.slug)}</T>
                <T v="caption" color="heritage">{p.region}</T>
              </Pressable>
            ))}
          </ScrollView>
        </Section>

        <Section title="Traditional techniques" action="See all" onAction={() => router.push('/heritage/techniques')}>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {techniques.slice(0, 4).map((t) => (
              <Pressable key={t.slug} onPress={() => router.push(`/heritage/technique/${t.slug}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.heritageTint, borderRadius: radius.lg, padding: 10 }}>
                <ArtImage pattern={t.pattern} style={{ width: 56, height: 56, borderRadius: 12 }} />
                <View style={{ flex: 1 }}>
                  <T v="label">{t.name}</T>
                  <T v="caption" color="textSecondary" numberOfLines={2}>{t.where}</T>
                </View>
                <Icon name="chev" size={18} color={c.heritage} />
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Material library" action="Open" onAction={() => router.push('/heritage/materials')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {materials.slice(0, 8).map((m) => (
              <Pressable key={m.slug} onPress={() => router.push({ pathname: '/heritage/materials', params: { open: m.slug } })} style={{ width: 110, gap: 6 }}>
                <ArtImage pattern={m.pattern} style={{ height: 80, borderRadius: radius.md }} />
                <T v="caption" numberOfLines={2} style={{ fontFamily: 'Manrope_700Bold' }}>{m.name}</T>
              </Pressable>
            ))}
          </ScrollView>
        </Section>

        <Pressable onPress={() => router.push('/heritage/resources')} style={{ margin: 16, marginTop: 28, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Icon name="globe" color={c.heritage} />
          <View style={{ flex: 1 }}>
            <T v="label">Heritage resources</T>
            <T v="caption" color="textMuted">Museums, festivals, glossary and buying protocols</T>
          </View>
          <Icon name="chev" size={18} color={c.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}
