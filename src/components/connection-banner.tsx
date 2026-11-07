import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { radius } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

/** Shown when the catalogue couldn't be loaded from the API, with a retry. */
export function ConnectionBanner() {
  const { c } = useTheme();
  const error = useStore((s) => s.catalogError);
  const cached = useStore((s) => s.artworks.length > 0);
  const [busy, setBusy] = useState(false);
  if (!error) return null;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: radius.lg, backgroundColor: c.verifiedTint, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Icon name="globe" color={c.verifiedText} />
      <View style={{ flex: 1 }}>
        <T v="label">{cached ? 'Showing saved works' : 'Can\'t load artworks'}</T>
        <T v="caption" color="textSecondary">{error}</T>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={async () => { setBusy(true); await useStore.getState().refresh(); setBusy(false); }}
        style={{ paddingHorizontal: 14, height: 34, borderRadius: radius.pill, backgroundColor: c.text, justifyContent: 'center' }}>
        {busy ? <ActivityIndicator color={c.background} size="small" /> : <T v="label" style={{ color: c.background, fontSize: 13 }}>Retry</T>}
      </Pressable>
    </View>
  );
}
