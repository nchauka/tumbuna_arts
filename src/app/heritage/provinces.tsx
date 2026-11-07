import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { provinceShort } from '@/components/cards';
import { Header, Screen, Segmented, T } from '@/components/ui';
import { provinces } from '@/data/seed';
import type { Region } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

const REGIONS: Region[] = ['Highlands', 'Momase', 'Southern', 'Islands'];

export default function Provinces() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [region, setRegion] = useState<Region>('Momase');
  const artworks = useStore((s) => s.artworks);
  const list = provinces.filter((p) => p.region === region);
  const w = (Math.min(width, 900) - 32 - 12) / 2;

  return (
    <Screen padded={false}>
      <Header title="Province collections" />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <T v="bodySm" color="textSecondary">Papua New Guinea has 22 provincial-level regions and more than 800 languages. Each place has its own art.</T>
        <Segmented options={REGIONS.map((r) => ({ key: r, label: r }))} value={region} onChange={setRegion} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {list.map((p) => {
            const n = artworks.filter((a) => a.province === p.slug && a.status === 'live').length;
            return (
              <Pressable key={p.slug} onPress={() => router.push(`/heritage/province/${p.slug}`)} style={{ width: w, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.heritageTint }}>
                <ArtImage pattern={p.pattern} style={{ height: 96 }} />
                <View style={{ padding: 12, gap: 2 }}>
                  <T v="label" numberOfLines={1}>{provinceShort(p.slug)}</T>
                  <T v="caption" color="textSecondary" numberOfLines={1}>{p.crafts.slice(0, 2).join(', ')}</T>
                  <T v="caption" color="heritage">{n ? `${n} work${n > 1 ? 's' : ''} for sale` : 'Archive only'}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
