import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { Icon } from '@/components/icon';
import { Badge, Button, Header, Screen, Sheet, T } from '@/components/ui';
import { materials } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function MaterialLibrary() {
  const params = useLocalSearchParams<{ open?: string }>();
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | undefined>(params.open);
  const artworks = useStore((s) => s.artworks);
  const list = materials.filter((m) => `${m.name} ${m.source}`.toLowerCase().includes(q.toLowerCase()));
  const sel = materials.find((m) => m.slug === open);
  const w = (Math.min(width, 900) - 32 - 12) / 2;
  const count = sel ? artworks.filter((a) => a.materials.includes(sel.slug) && a.status === 'live').length : 0;

  return (
    <Screen padded={false} overlay={
      <Sheet visible={!!sel} onClose={() => setOpen(undefined)} title={sel?.name}>
        {sel && (
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <ArtImage pattern={sel.pattern} style={{ height: 140, borderRadius: radius.lg }} />
            {sel.sustainable && <Badge label="Sustainably sourced" tone="success" />}
            <View style={{ gap: 4 }}><T v="overline" color="heritage">Source</T><T color="textSecondary">{sel.source}</T></View>
            <View style={{ gap: 4 }}><T v="overline" color="heritage">Care</T><T color="textSecondary">{sel.care}</T></View>
            {sel.exportNote && <View style={{ gap: 4 }}><T v="overline" color="heritage">Export</T><T color="textSecondary">{sel.exportNote}</T></View>}
            <Button title={count ? `Shop ${count} work${count > 1 ? 's' : ''} in ${sel.name.split(' (')[0].toLowerCase()}` : 'No works listed yet'} disabled={!count}
              onPress={() => { setOpen(undefined); router.push({ pathname: '/artworks', params: { material: sel.slug } }); }} />
          </View>
        )}
      </Sheet>
    }>
      <Header title="Material library" />
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        <View style={{ height: 48, borderRadius: radius.pill, backgroundColor: c.element, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <Icon name="search" size={18} color={c.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search materials" placeholderTextColor={c.textMuted} style={{ flex: 1, color: c.text, fontFamily: 'Manrope_500Medium', fontSize: 16, height: 46 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {list.map((m) => (
            <Pressable key={m.slug} onPress={() => setOpen(m.slug)} style={{ width: w, gap: 8 }}>
              <ArtImage pattern={m.pattern} style={{ height: 110, borderRadius: radius.lg }} />
              <T v="label">{m.name}</T>
              <T v="caption" color="textMuted" numberOfLines={2}>{m.source}</T>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
