import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { KunduSeal } from '@/components/brand';
import { Icon } from '@/components/icon';
import { Button, Empty, Header, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function MyCertificates() {
  const { c } = useTheme();
  const owned = useStore((s) => s.artworks.filter((a) => a.ownerId && a.ownerId === s.sessionUserId));
  return (
    <Screen padded={false} footer={<Button title="Scan a tag" icon="scan" kind="outline" flex onPress={() => router.push('/scan')} />}>
      <Header title="My certificates" />
      {!owned.length ? (
        <Empty icon="cert" title="No certificates yet" body="Every artwork you buy comes with a digital certificate of authenticity. It will appear here." />
      ) : (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {owned.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/certificate/${a.certificateSerial}`)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: radius.lg, backgroundColor: c.verifiedTint }}>
              <ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 56, height: 70, borderRadius: 10 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="label" numberOfLines={1}>{a.title}</T>
                <T v="serial" color="textSecondary" style={{ fontSize: 11 }}>{a.certificateSerial}</T>
              </View>
              <KunduSeal size={36} />
              <Icon name="chev" size={16} color={c.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
