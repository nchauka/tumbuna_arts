import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtImage } from '@/components/art-image';
import { ArtistAvatar, ArtworkGrid, provinceName, ReviewItem } from '@/components/cards';
import { Badge, Button, Empty, IconButton, Row, Seal, StatTile, T, Tabs, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { date } from '@/lib/format';
import { artistRating, useStore } from '@/store';

export default function ArtistProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const artist = useStore((s) => s.artists.find((a) => a.id === id));
  const artworks = useStore((s) => s.artworks.filter((a) => a.artistId === id));
  const reviews = useStore((s) => s.reviews.filter((r) => r.artistId === id));
  const rating = useStore((s) => artistRating(s, id));
  const following = useStore((s) => s.following.includes(id));
  const isMe = useStore((s) => s.me?.artistId === id);
  const toggleFollow = useStore((s) => s.toggleFollow);
  const [tab, setTab] = useState<'works' | 'story' | 'reviews'>('works');
  const [expanded, setExpanded] = useState(false);

  if (!artist) return <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}><Empty title="Artist not found" /></View>;
  const live = artworks.filter((a) => a.status === 'live');
  const sold = artworks.filter((a) => a.status === 'sold').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View>
        <ArtImage pattern={artworks[0]?.pattern ?? artist.pattern} variant={artworks[0]?.variant} uri={artworks[0]?.images[0]} style={{ height: 200 + insets.top }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28,28,28,0.35)' }} />
        <Row style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
          <IconButton name="back" label="Back" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
          <IconButton name="share" label="Share" bg="rgba(255,255,255,0.94)" color="#1C1C1C" onPress={() => Share.share({ message: `${artist.name} on Tumbuna Arts — tumbunaarts://artist/${artist.id}` })} />
        </Row>
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: -44, gap: 12 }}>
        <View style={{ borderWidth: 4, borderColor: c.background, borderRadius: 60, alignSelf: 'flex-start' }}><ArtistAvatar artist={artist} size={88} /></View>
        <View style={{ gap: 4 }}>
          <Row gap={6}><T v="h1">{artist.name}</T>{artist.verification === 'verified' && <Seal size={22} />}</Row>
          <T color="textSecondary">{artist.crafts.join(' · ')}</T>
          <T v="bodySm" color="textMuted">{artist.village ? `${artist.village}, ` : ''}{provinceName(artist.province)}</T>
          {artist.verification === 'verified' ? <Badge label="Verified artist" tone="verified" /> : artist.verification === 'pending' ? <Badge label="Verification pending" tone="neutral" /> : null}
        </View>
        <Row gap={10}>
          <StatTile value={String(sold)} label="Works sold" />
          <StatTile value={rating.count ? rating.avg.toFixed(1) : '–'} label={`Rating (${rating.count})`} />
          <StatTile value={String(artist.yearsPractising)} label="Years practising" />
        </Row>
        {isMe ? (
          <Row gap={10}><Button title="Edit profile" kind="dark" flex onPress={() => router.push('/studio/profile')} /><Button title="Studio" kind="outline" flex onPress={() => { useStore.getState().setMode('studio'); router.replace('/studio/dashboard'); }} /></Row>
        ) : (
          <Row gap={10}>
            <Button title={following ? 'Following' : 'Follow'} kind={following ? 'outline' : 'primary'} flex onPress={() => { toggleFollow(artist.id); toast(following ? `Unfollowed ${artist.name.split(' ')[0]}` : `You'll see ${artist.name.split(' ')[0]}'s new works first`); }} />
            <Button title="Request commission" kind="outline" flex onPress={() => router.push(`/artist/${artist.id}/portfolio`)} />
          </Row>
        )}
        {!!artist.bio && (
          <Pressable onPress={() => setExpanded(!expanded)}>
            <T numberOfLines={expanded ? undefined : 3}>{artist.bio}</T>
            <T v="label" color="primary" style={{ marginTop: 4 }}>{expanded ? 'Show less' : 'Read more'}</T>
          </Pressable>
        )}
        <Tabs value={tab} onChange={setTab} options={[{ key: 'works', label: `Works ${live.length}` }, { key: 'story', label: 'Story' }, { key: 'reviews', label: `Reviews ${reviews.length}` }]} />
      </View>
      <View style={{ marginTop: 16 }}>
        {tab === 'works' && (live.length ? <>
          <ArtworkGrid items={live} />
          <Pressable onPress={() => router.push(`/artist/${artist.id}/portfolio`)} style={{ alignItems: 'center', padding: 16 }}><T v="label" color="primary">See full portfolio, including sold works</T></Pressable>
        </> : <Empty title="No works for sale right now" body="Follow to hear when new works are listed." />)}
        {tab === 'story' && (
          <View style={{ paddingHorizontal: 16, gap: 14 }}>
            <View style={{ borderLeftWidth: 3, borderLeftColor: c.heritage, paddingLeft: 12, gap: 4 }}>
              <T v="overline" color="heritage">Lineage</T>
              <T color="textSecondary">{artist.lineage || 'Not added yet.'}</T>
            </View>
            <View style={{ borderLeftWidth: 3, borderLeftColor: c.heritage, paddingLeft: 12, gap: 4 }}>
              <T v="overline" color="heritage">Home</T>
              <T color="textSecondary">{artist.village ? `${artist.village}, ` : ''}{provinceName(artist.province)}</T>
              <Pressable onPress={() => router.push(`/heritage/province/${artist.province}`)}><T v="label" color="primary">Explore the province</T></Pressable>
            </View>
            <T v="caption" color="textMuted">On Tumbuna Arts since {date(artist.joinedAt)}</T>
          </View>
        )}
        {tab === 'reviews' && (
          <View style={{ paddingHorizontal: 16 }}>
            {reviews.length ? reviews.map((r) => <ReviewItem key={r.id} review={r} />) : <Empty icon="star" title="No reviews yet" />}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
