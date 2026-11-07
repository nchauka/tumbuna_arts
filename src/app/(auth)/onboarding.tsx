import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { Button, T } from '@/components/ui';
import type { ArtPattern } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

const PAGES: { pattern: ArtPattern; variant?: number; over: string; title: string; body: string }[] = [
  { pattern: 'carve', over: 'Marketplace', title: 'Authentic art, straight from the maker', body: 'Buy carvings, bilums, tapa and baskets directly from artists in all 22 provinces. More of every kina reaches the maker.' },
  { pattern: 'bilum', over: 'Heritage', title: 'Every piece carries a story', body: 'Learn who made it, where it comes from and what its patterns mean before it reaches your home.' },
  { pattern: 'mask', variant: 1, over: 'Authenticity', title: 'Certified and verifiable', body: 'Every artwork comes with a digital certificate. Scan its QR tag at any time to check that it is genuine.' },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [page, setPage] = useState(0);
  const list = useRef<FlatList>(null);
  const finish = useStore((s) => s.finishOnboarding);

  const done = (to: '/home' | '/register' = '/home') => {
    finish();
    router.replace('/home');
    if (to === '/register') router.push({ pathname: '/register', params: { role: 'artist' } });
  };
  const next = () => {
    if (page < PAGES.length - 1) list.current?.scrollToIndex({ index: page + 1 });
    else done();
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        ref={list}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.over}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <ArtImage pattern={item.pattern} variant={item.variant} style={{ width, height: height * 0.52 }} />
            <View style={{ padding: 24, gap: 12 }}>
              <T v="overline" color="heritage">{item.over}</T>
              <T v="display" style={{ fontSize: 30, lineHeight: 36 }}>{item.title}</T>
              <T color="textSecondary">{item.body}</T>
            </View>
          </View>
        )}
      />
      <Pressable onPress={() => done()} accessibilityRole="button" style={{ position: 'absolute', top: insets.top + 12, right: 16, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 }}>
        <T v="label" style={{ color: '#1C1C1C' }}>Skip</T>
      </Pressable>
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {PAGES.map((_, i) => <View key={i} style={{ height: 6, width: i === page ? 24 : 6, borderRadius: 3, backgroundColor: i === page ? c.primary : c.border }} />)}
        </View>
        <Button title={page === PAGES.length - 1 ? 'Start exploring' : 'Next'} onPress={next} />
        <Pressable onPress={() => done('/register')} style={{ alignItems: 'center', padding: 6 }} accessibilityRole="button">
          <T v="label">I&apos;m an artist · <T v="label" color="primary">Sell with us</T></T>
        </Pressable>
      </View>
    </View>
  );
}
