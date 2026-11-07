import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { ArtistCard, ArtworkGrid } from '@/components/cards';
import { Empty, Segmented, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

export default function Wishlist() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'works' | 'artists'>('works');
  const wishlist = useStore((s) => s.wishlist);
  const artworks = useStore((s) => s.artworks);
  const following = useStore((s) => s.following);
  const artists = useStore((s) => s.artists);
  const saved = wishlist.map((id) => artworks.find((a) => a.id === id)).filter((a) => !!a);
  const followed = following.map((id) => artists.find((a) => a.id === id)).filter((a) => !!a);
  const sold = saved.filter((a) => a.status === 'sold').length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={{ padding: 16, gap: 14 }}>
          <T v="h1">Wishlist</T>
          <Segmented options={[{ key: 'works', label: `Artworks · ${saved.length}` }, { key: 'artists', label: `Artists · ${followed.length}` }]} value={tab} onChange={setTab} />
          {tab === 'works' && sold > 0 && <T v="caption" color="textMuted">{sold} saved work{sold > 1 ? 's have' : ' has'} sold. Most pieces are one of a kind, so buy the ones you love early.</T>}
        </View>
        {tab === 'works' ? (
          saved.length ? <ArtworkGrid items={saved} /> : <Empty icon="heart" title="Your wishlist is empty" body="Tap the heart on any artwork to save it here." action="Explore bilums" onAction={() => router.push({ pathname: '/artworks', params: { category: 'bilums' } })} />
        ) : (
          followed.length ? <View style={{ paddingHorizontal: 16, gap: 14 }}>{followed.map((a) => <ArtistCard key={a.id} artist={a} />)}</View>
            : <Empty icon="user" title="You're not following anyone yet" body="Follow artists to see their new works first." action="Meet the artists" onAction={() => router.push('/artists')} />
        )}
      </ScrollView>
      <CartBar />
    </View>
  );
}
