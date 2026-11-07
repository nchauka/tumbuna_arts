import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ArtImage } from '@/components/art-image';
import { Icon } from '@/components/icon';
import { act, Button, Chip, haptic, Header, Input, Row, Screen, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

const TAGS = ['Beautiful craft', 'Well packed', 'Great communication', 'Arrived quickly', 'Better than the photos'];

export default function Review() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const order = useStore((s) => s.orders.find((o) => o.id === id));
  const art = useStore((s) => s.artworks.find((a) => a.id === order?.items[0]?.artworkId));
  const addReview = useStore((s) => s.addReview);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!order || !art) return null;

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: 3 });
    if (!r.canceled) setPhotos([...photos, ...r.assets.map((a) => a.uri)].slice(0, 3));
  };

  return (
    <Screen padded={false} footer={<Button title="Submit review" flex disabled={!rating} loading={busy} onPress={async () => {
      setBusy(true);
      const ok = await act(addReview(order.id, { artworkId: art.id, rating, tags, text: text.trim(), photos }), 'Thanks! Your review helps other collectors.');
      setBusy(false);
      if (ok) router.back();
    }} />}>
      <Header title="Review" right={<Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingRight: 12 }}><T v="label" color="textMuted">Skip</T></Pressable>} />
      <View style={{ paddingHorizontal: 16, gap: 20 }}>
        <Row gap={12}>
          <ArtImage pattern={art.pattern} variant={art.variant} uri={art.images[0]} style={{ width: 64, height: 80, borderRadius: 10 }} />
          <View style={{ flex: 1 }}><T v="h3">{art.title}</T><T v="caption" color="textMuted">{order.number}</T></View>
        </Row>
        <View style={{ gap: 10, alignItems: 'center' }}>
          <T v="h2">How was it?</T>
          <Row gap={10}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => { haptic(); setRating(i); }} accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`} hitSlop={4}>
                <Icon name="star" size={40} color={c.verified} fill={i <= rating ? c.verified : 'none'} strokeWidth={1.6} />
              </Pressable>
            ))}
          </Row>
          {!!rating && <T v="label" color="textSecondary">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</T>}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TAGS.map((t) => <Chip key={t} label={t} selected={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} />)}
        </View>
        <Input label="Tell other collectors (optional)" value={text} onChangeText={setText} multiline placeholder="What do you love about it? Where does it live now?" />
        <View style={{ gap: 8 }}>
          <T v="label">Photos of the piece in its new home</T>
          <Row gap={8}>
            {photos.map((p) => <Image key={p} source={{ uri: p }} style={{ width: 80, height: 80, borderRadius: radius.md }} />)}
            {photos.length < 3 && (
              <Pressable onPress={pick} style={{ width: 80, height: 80, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="camera" color={c.textMuted} />
              </Pressable>
            )}
          </Row>
        </View>
      </View>
    </Screen>
  );
}
