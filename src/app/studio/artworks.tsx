import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { Icon } from '@/components/icon';
import { StudioHeader } from '@/components/studio-header';
import { act, Badge, Button, confirm, Empty, Row, Sheet, T } from '@/components/ui';
import type { Artwork, ArtworkStatus } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useMyArtist, useStore } from '@/store';

const TABS: { key: ArtworkStatus; label: string }[] = [{ key: 'live', label: 'Live' }, { key: 'draft', label: 'Drafts' }, { key: 'sold', label: 'Sold' }, { key: 'hidden', label: 'Hidden' }];
const TONE: Record<ArtworkStatus, Parameters<typeof Badge>[0]['tone']> = { live: 'success', draft: 'neutral', sold: 'dark', hidden: 'warning' };

export default function ManageArtwork() {
  const { c } = useTheme();
  const artist = useMyArtist()!;
  const all = useStore((s) => s.artworks.filter((a) => a.artistId === artist.id));
  const wishCounts = useStore((s) => s.wishlist);
  const { setArtworkStatus, deleteArtwork } = useStore.getState();
  const [tab, setTab] = useState<ArtworkStatus>('live');
  const [menu, setMenu] = useState<Artwork | null>(null);
  const list = all.filter((a) => a.status === tab).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StudioHeader title="Artworks">
        <Row gap={6}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ paddingHorizontal: 14, height: 34, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? '#fff' : '#2A2622' }}>
                <T v="label" style={{ color: on ? '#1C1C1C' : '#CBC2B8', fontSize: 13 }}>{t.label} {all.filter((a) => a.status === t.key).length}</T>
              </Pressable>
            );
          })}
        </Row>
      </StudioHeader>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {!list.length && <Empty icon="grid" title={`No ${TABS.find((t) => t.key === tab)!.label.toLowerCase()} artworks`} body={tab === 'live' ? 'Tap + to list a new work.' : undefined} action={tab === 'live' ? 'Upload artwork' : undefined} onAction={() => router.push('/upload')} />}
        {list.map((a) => (
          <Pressable key={a.id} onPress={() => router.push({ pathname: '/upload', params: { id: a.id } })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceRaised }}>
            <ArtImage pattern={a.pattern} variant={a.variant} uri={a.images[0]} style={{ width: 60, height: 74, borderRadius: 10 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <T v="label" numberOfLines={1}>{a.title || 'Untitled draft'}</T>
              <T v="price" style={{ fontSize: 15 }}>{kina(a.price)}</T>
              <Row gap={10}>
                <Row gap={3}><Icon name="eye" size={13} color={c.textMuted} /><T v="caption" color="textMuted">{a.views}</T></Row>
                <Row gap={3}><Icon name="heart" size={13} color={c.textMuted} /><T v="caption" color="textMuted">{wishCounts.includes(a.id) ? 1 : 0}</T></Row>
                <Badge label={a.status} tone={TONE[a.status]} />
              </Row>
            </View>
            <Pressable onPress={() => setMenu(a)} hitSlop={10} accessibilityLabel="More actions" style={{ padding: 6 }}><Icon name="sliders" size={20} color={c.textSecondary} /></Pressable>
          </Pressable>
        ))}
      </ScrollView>
      <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu?.title || 'Artwork'}>
        {menu && (
          <View style={{ gap: 10, paddingBottom: 8 }}>
            <Button title="Edit" icon="edit" kind="outline" onPress={() => { setMenu(null); router.push({ pathname: '/upload', params: { id: menu.id } }); }} />
            {menu.status === 'live' && <Button title="View as buyer" icon="eye" kind="outline" onPress={() => { setMenu(null); router.push(`/artwork/${menu.id}`); }} />}
            {menu.status === 'live' && <Button title="Hide from shop" kind="outline" onPress={() => { const m = menu; setMenu(null); void act(setArtworkStatus(m.id, 'hidden'), 'Hidden from the shop'); }} />}
            {menu.status === 'hidden' && <Button title="Show in shop again" kind="outline" onPress={() => { const m = menu; setMenu(null); void act(setArtworkStatus(m.id, 'live'), 'Back in the shop'); }} />}
            {menu.status === 'live' && <Button title="Mark as sold elsewhere" kind="outline" onPress={() => { const m = menu; setMenu(null); void act(setArtworkStatus(m.id, 'sold'), 'Marked as sold'); }} />}
            {menu.status !== 'sold' && <Button title="Delete" kind="danger" icon="trash" onPress={() => { const m = menu; setMenu(null); confirm({ title: 'Delete this artwork?', body: 'This cannot be undone.', confirm: 'Delete', danger: true, onConfirm: () => { void act(deleteArtwork(m.id), 'Artwork deleted'); } }); }} />}
          </View>
        )}
      </Sheet>
    </View>
  );
}
