import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { Header, Screen, T } from '@/components/ui';
import { techniques } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';

export default function Techniques() {
  const { c } = useTheme();
  return (
    <Screen padded={false}>
      <Header title="Traditional techniques" />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        {techniques.map((t) => (
          <Pressable key={t.slug} onPress={() => router.push(`/heritage/technique/${t.slug}`)} style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.heritageTint }}>
            <ArtImage pattern={t.pattern} style={{ height: 110 }} />
            <View style={{ padding: 14, gap: 4 }}>
              <T v="h3">{t.name}</T>
              <T v="caption" color="heritage">{t.where}</T>
              <T v="bodySm" color="textSecondary" numberOfLines={2}>{t.summary}</T>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
