import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Row, Seal, T } from '@/components/ui';
import { palette } from '@/constants/tokens';
import { useMyArtist, useStore } from '@/store';

/** Ink header that marks artist mode, with the switch back to buying. */
export function StudioHeader({ title, children, extraBottom = 0 }: { title?: string; children?: ReactNode; extraBottom?: number }) {
  const insets = useSafeAreaInsets();
  const artist = useMyArtist();
  const setMode = useStore((s) => s.setMode);
  return (
    <View style={{ backgroundColor: palette.ink, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 16 + extraBottom, gap: 12 }}>
      <Row>
        <View style={{ flex: 1 }}>
          <T v="overline" style={{ color: palette.paradiseGold }}>Studio{title ? ` · ${title}` : ''}</T>
          <Row gap={6}><T v="h2" style={{ color: '#fff' }} numberOfLines={1}>{artist?.name}</T>{artist?.verification === 'verified' && <Seal size={18} />}</Row>
        </View>
        <Pressable onPress={() => { setMode('buyer'); router.replace('/home'); }} accessibilityRole="button"
          style={{ borderWidth: 1, borderColor: '#4A433E', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
          <T v="caption" style={{ color: '#fff', fontFamily: 'Manrope_800ExtraBold' }}>Buyer mode</T>
        </Pressable>
      </Row>
      {children}
    </View>
  );
}
