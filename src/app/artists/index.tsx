import { useState } from 'react';
import { View } from 'react-native';

import { ArtistCard } from '@/components/cards';
import { Chip, ChipRow, Header, Screen, T } from '@/components/ui';
import { useStore } from '@/store';

const CRAFTS = ['All', 'Storyboards', 'Bilums', 'Tapa cloth', 'Masks', 'Baskets', 'Ebony carvings', 'Paintings', 'Pottery', 'Shell & bead jewellery'];

export default function FeaturedArtists() {
  const artists = useStore((s) => s.artists);
  const artworks = useStore((s) => s.artworks);
  const [craft, setCraft] = useState('All');
  const list = artists
    .filter((a) => artworks.some((w) => w.artistId === a.id && w.status !== 'draft'))
    .filter((a) => craft === 'All' || a.crafts.includes(craft))
    .sort((a, b) => Number(b.verification === 'verified') - Number(a.verification === 'verified'));
  return (
    <Screen padded={false}>
      <Header title="Featured artists" />
      <T v="bodySm" color="textSecondary" style={{ paddingHorizontal: 16, marginBottom: 12 }}>Meet the makers. Gold rings mark verified artists.</T>
      <ChipRow style={{ paddingBottom: 14 }}>{CRAFTS.map((c) => <Chip key={c} label={c} selected={craft === c} onPress={() => setCraft(c)} />)}</ChipRow>
      <View style={{ paddingHorizontal: 16, gap: 14 }}>
        {list.map((a) => <ArtistCard key={a.id} artist={a} />)}
        {!list.length && <T color="textMuted" center style={{ padding: 32 }}>No artists in this craft yet.</T>}
      </View>
    </Screen>
  );
}
