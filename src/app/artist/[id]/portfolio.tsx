import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ArtworkGrid } from '@/components/cards';
import { act, Button, Empty, Header, Input, Screen, Segmented, Sheet, T } from '@/components/ui';
import { requireAuth } from '@/lib/auth';
import { useStore } from '@/store';

export default function Portfolio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = useStore((s) => s.artists.find((a) => a.id === id));
  const artworks = useStore((s) => s.artworks.filter((a) => a.artistId === id));
  const [tab, setTab] = useState<'live' | 'sold'>('live');
  const [open, setOpen] = useState(false);
  const requestCommission = useStore((s) => s.requestCommission);
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const list = artworks.filter((a) => a.status === tab);

  return (
    <Screen padded={false}
      footer={<Button title="Request a commission" kind="outline" flex onPress={() => requireAuth(() => setOpen(true), `/artist/${id}/portfolio`)} />}
      overlay={
        <Sheet visible={open} onClose={() => setOpen(false)} title={`Commission ${artist?.name.split(' ')[0] ?? ''}`}>
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="bodySm" color="textSecondary">Describe what you&apos;d like. The artist replies with a price and timeline before any payment.</T>
            <Input label="What would you like made?" value={brief} onChangeText={setBrief} multiline placeholder="e.g. A storyboard about my family's river, about 60 cm wide" />
            <Input label="Budget (Kina)" value={budget} onChangeText={(v) => setBudget(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="e.g. 800" />
            <Button title="Send request" disabled={brief.trim().length < 10} onPress={async () => { if (await act(requestCommission(id, brief.trim(), budget ? Number(budget) : undefined), `Request sent to ${artist?.name.split(' ')[0]}`)) { setOpen(false); setBrief(''); setBudget(''); } }} />
          </View>
        </Sheet>
      }>
      <Header title={artist ? `${artist.name.split(' ')[0]}'s portfolio` : 'Portfolio'} />
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <Segmented options={[{ key: 'live', label: `Available · ${artworks.filter((a) => a.status === 'live').length}` }, { key: 'sold', label: `Sold · ${artworks.filter((a) => a.status === 'sold').length}` }]} value={tab} onChange={setTab} />
      </View>
      {list.length ? <ArtworkGrid items={list} /> : <Empty title={tab === 'live' ? 'Nothing available right now' : 'No sold works yet'} body={tab === 'sold' ? 'Sold works stay here as a record of the artist\'s practice.' : 'Request a commission for something made just for you.'} />}
    </Screen>
  );
}
