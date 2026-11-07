import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistCard, ArtworkGrid, StoryCard } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Chip, Empty, Row, T, Tabs } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { search, TRENDING } from '@/lib/catalog';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

export default function Search() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const artworks = useStore((s) => s.artworks);
  const artists = useStore((s) => s.artists);
  const recents = useStore((s) => s.recentSearches);
  const addRecent = useStore((s) => s.addRecentSearch);
  const clearRecent = useStore((s) => s.clearRecentSearches);
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [scope, setScope] = useState<'works' | 'artists' | 'stories'>('works');
  const query = submitted || q;
  const results = useMemo(() => search(query, artworks, artists), [query, artworks, artists]);
  const run = (v: string) => { setQ(v); setSubmitted(v); addRecent(v); };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <Row style={{ padding: 16, paddingBottom: 8 }} gap={10}>
        <View style={{ flex: 1, height: 48, borderRadius: radius.pill, backgroundColor: c.element, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <Icon name="search" size={18} color={c.textMuted} />
          <TextInput
            autoFocus value={q} onChangeText={(t) => { setQ(t); setSubmitted(''); }} onSubmitEditing={() => run(q)} returnKeyType="search"
            placeholder="Carvings, bilums, artists…" placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.text, fontFamily: 'Manrope_500Medium', fontSize: 16, height: 46 }}
          />
          {!!q && <Pressable onPress={() => { setQ(''); setSubmitted(''); }} hitSlop={8} accessibilityLabel="Clear"><Icon name="close" size={18} color={c.textMuted} /></Pressable>}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}><T v="label">Cancel</T></Pressable>
      </Row>

      {!query.trim() ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }} keyboardShouldPersistTaps="handled">
          {recents.length > 0 && (
            <View style={{ gap: 10 }}>
              <Row><T v="overline" color="textMuted" style={{ flex: 1 }}>Recent</T><Pressable onPress={clearRecent}><T v="label" color="primary">Clear</T></Pressable></Row>
              {recents.map((r) => (
                <Pressable key={r} onPress={() => run(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
                  <Icon name="clock" size={18} color={c.textMuted} /><T style={{ flex: 1 }}>{r}</T><Icon name="chev" size={16} color={c.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ gap: 10 }}>
            <T v="overline" color="textMuted">Trending</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{TRENDING.map((t) => <Chip key={t} label={t} onPress={() => run(t)} />)}</View>
          </View>
          <View style={{ gap: 10 }}>
            <T v="overline" color="textMuted">Try searching by place</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['Goroka', 'East Sepik', 'Buka', 'Trobriand', 'Oro'].map((t) => <Chip key={t} label={t} icon="pin" tone="heritage" onPress={() => run(t)} />)}</View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
            <Tabs value={scope} onChange={setScope} options={[
              { key: 'works', label: `Artworks ${results.works.length}` },
              { key: 'artists', label: `Artists ${results.artists.length}` },
              { key: 'stories', label: `Stories ${results.stories.length}` },
            ]} />
          </View>
          {scope === 'works' && (results.works.length ? <ArtworkGrid items={results.works} /> : <NoResults q={query} />)}
          {scope === 'artists' && (results.artists.length ? <View style={{ paddingHorizontal: 16, gap: 12 }}>{results.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}</View> : <NoResults q={query} />)}
          {scope === 'stories' && (results.stories.length ? <View style={{ paddingHorizontal: 16, gap: 20 }}>{results.stories.map((s) => <StoryCard key={s.slug} story={s} />)}</View> : <NoResults q={query} />)}
        </ScrollView>
      )}
    </View>
  );
}

function NoResults({ q }: { q: string }) {
  return <Empty icon="search" title={`Nothing for "${q}"`} body="Check the spelling, or browse by category instead." action="Browse categories" onAction={() => router.replace('/explore')} />;
}
