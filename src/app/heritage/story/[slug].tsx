import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { ArtworkCard, categoryName, provinceShort, StoryCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Empty, IconButton, Row, T } from '@/components/ui';
import { stories } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function StoryReader() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const story = stories.find((s) => s.slug === slug);
  const works = useStore((s) => s.artworks.filter((a) => a.status === 'live' && story && (a.province === story.province || a.category === story.category)).slice(0, 6));
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => { void Speech.stop(); }, []);

  if (!story) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}><Empty title="Story not found" /></View>;

  const listen = async () => {
    if (speaking) { await Speech.stop(); setSpeaking(false); return; }
    const text = [story.title, story.intro, ...story.chapters.map((ch) => `${ch.title}. ${ch.body}`)].join('. ');
    setSpeaking(true);
    Speech.speak(text, { language: 'en-AU', rate: 0.95, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };
  const others = stories.filter((s) => s.slug !== story.slug).slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ height: 300 + insets.top }}>
          <ArtImage pattern={story.pattern} variant={story.variant} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(94,61,36,0.62)' }} />
          <Row style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
            <IconButton name="back" label="Back" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => router.back()} />
            <View style={{ flex: 1 }} />
            <IconButton name="share" label="Share" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => Share.share({ message: `${story.title} — a heritage story on Tumbuna Arts` })} />
          </Row>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 18, gap: 6 }}>
            <T v="overline" style={{ color: c.verified }}>{provinceShort(story.province)} · {categoryName(story.category)}</T>
            <T v="display" style={{ color: '#fff' }}>{story.title}</T>
            <T v="bodySm" style={{ color: '#F3EAE2' }}>{story.readMins} min read · {story.teller}</T>
          </View>
        </View>

        <View style={{ padding: 16, gap: 20 }}>
          <Pressable onPress={listen} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.heritageTint, borderRadius: radius.pill, padding: 6, paddingLeft: 18 }}>
            <T v="label" color="heritageDeep" style={{ flex: 1 }}>{speaking ? 'Listening… tap to stop' : 'Listen to this story'}</T>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.heritage, alignItems: 'center', justifyContent: 'center' }}>
              {speaking ? <View style={{ width: 12, height: 12, backgroundColor: '#fff', borderRadius: 2 }} /> : <Icon name="play" size={16} color="#fff" fill="#fff" />}
            </View>
          </Pressable>
          <T style={{ fontSize: 18, lineHeight: 28 }}>{story.intro}</T>
          <View style={{ borderLeftWidth: 2, borderLeftColor: c.border, borderStyle: 'dashed', marginLeft: 11, paddingLeft: 22, gap: 22 }}>
            {story.chapters.map((ch, i) => (
              <View key={ch.title} style={{ gap: 6 }}>
                <View style={{ position: 'absolute', left: -35, top: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: c.heritage, alignItems: 'center', justifyContent: 'center' }}>
                  <T v="caption" style={{ color: '#fff', fontFamily: 'Manrope_800ExtraBold' }}>{i + 1}</T>
                </View>
                <T v="h3" color="heritageDeep">{ch.title}</T>
                <T color="textSecondary">{ch.body}</T>
              </View>
            ))}
          </View>
          <T v="caption" color="textMuted">Shared with the consent of the teller. Some knowledge is kept within families and is not published here.</T>
        </View>

        {works.length > 0 && (
          <View style={{ gap: 12 }}>
            <Row style={{ paddingHorizontal: 16 }}>
              <T v="h3" style={{ flex: 1 }}>Shop works from this story</T>
              <Pressable onPress={() => router.push({ pathname: '/artworks', params: { category: story.category } })}><T v="label" color="primary">See all</T></Pressable>
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {works.map((a) => <ArtworkCard key={a.id} art={a} width={150} />)}
            </ScrollView>
          </View>
        )}
        <View style={{ gap: 12, marginTop: 28 }}>
          <T v="h3" style={{ paddingHorizontal: 16 }}>More stories</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}>
            {others.map((s) => <StoryCard key={s.slug} story={s} width={220} />)}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
