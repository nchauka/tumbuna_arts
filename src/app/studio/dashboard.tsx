import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { BarChart, OrderRow, StatusBadge } from '@/components/cards';
import { Icon } from '@/components/icon';
import { StudioHeader } from '@/components/studio-header';
import { Button, Card, Row, StatTile, T } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { kina } from '@/lib/format';
import { elevation, radius } from '@/constants/tokens';
import { artistBalances, artistOrders, artistRating, COMMISSION, useMyArtist, useStore } from '@/store';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StudioDashboard() {
  const { c } = useTheme();
  const artist = useMyArtist()!;
  const state = useStore();
  const orders = useMemo(() => artistOrders(state, artist.id).filter((o) => o.status !== 'cancelled'), [state, artist.id]);
  const works = state.artworks.filter((a) => a.artistId === artist.id);
  const rating = artistRating(state, artist.id);
  const bal = artistBalances(state, artist.id);
  const toShip = orders.filter((o) => o.status === 'placed' || o.status === 'packed');

  // Earnings for the last 7 days, today last.
  const week = useMemo(() => {
    const out: { v: number; l: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const end = d.getTime() + 86_400_000;
      out.push({ v: orders.filter((o) => o.createdAt >= d.getTime() && o.createdAt < end).reduce((t, o) => t + o.subtotal * (1 - COMMISSION), 0), l: DAYS[d.getDay()] });
    }
    return out;
  }, [orders]);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const month = orders.filter((o) => o.createdAt >= monthStart.getTime()).reduce((t, o) => t + o.subtotal * (1 - COMMISSION), 0);
  const views = works.reduce((t, a) => t + a.views, 0);
  const noPhotos = works.filter((a) => a.status === 'live' && a.images.length > 0 && a.images.length < 4).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={state.tick} tintColor={c.primary} />}>
        <StudioHeader extraBottom={56} />
        <View style={{ paddingHorizontal: 16, marginTop: -56, gap: 14 }}>
          <View style={[{ backgroundColor: c.surfaceRaised, borderRadius: radius.xl, padding: 16, gap: 10 }, elevation.e2]}>
            <Row><T v="bodySm" color="textMuted" style={{ flex: 1 }}>Earnings this month</T><Pressable onPress={() => router.push('/studio/earnings')}><T v="label" color="primary">Details</T></Pressable></Row>
            <T v="display" style={{ fontSize: 30 }}>{kina(month)}</T>
            <BarChart values={week.map((w) => w.v)} labels={week.map((w) => w.l)} highlight={6} />
          </View>
          <Row gap={10}>
            <StatTile value={String(orders.length)} label="Orders" />
            <StatTile value={views >= 1000 ? `${(views / 1000).toFixed(1)}k` : String(views)} label="Views" />
            <StatTile value={rating.count ? rating.avg.toFixed(1) : '–'} label="Rating" />
          </Row>
          <Row gap={10}>
            <StatTile value={kina(bal.available)} label="Available" sub="Ready to withdraw" subTone="success" />
            <StatTile value={kina(bal.pending)} label="Pending" sub="Until delivery confirmed" />
          </Row>

          {artist.verification !== 'verified' && (
            <Pressable onPress={() => router.push('/verify')}>
              <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.verifiedTint, borderColor: c.verifiedTint }}>
                <Icon name="seal" size={30} color={c.verified} />
                <View style={{ flex: 1 }}>
                  <T v="label">{artist.verification === 'pending' ? 'Verification under review' : 'Get your Verified Artist badge'}</T>
                  <T v="caption" color="textSecondary">{artist.verification === 'pending' ? 'We\'ll notify you when it\'s approved.' : 'Verified artists sell up to 3× more. It takes 5 minutes.'}</T>
                </View>
                <Icon name="chev" size={16} color={c.textSecondary} />
              </Card>
            </Pressable>
          )}

          <Row style={{ marginTop: 6 }}><T v="h3" style={{ flex: 1 }}>To ship</T><Pressable onPress={() => router.push('/studio/orders')}><T v="label" color="primary">All orders</T></Pressable></Row>
          {toShip.length ? toShip.slice(0, 4).map((o) => (
            <OrderRow key={o.id} order={o} onPress={() => router.push('/studio/orders')} right={<StatusBadge status={o.status} />} />
          )) : <Card><T v="bodySm" color="textMuted">Nothing to ship right now.</T></Card>}

          <Card style={{ gap: 6, backgroundColor: c.heritageTint, borderColor: c.heritageTint }}>
            <Row gap={8}><Icon name="leaf" size={18} color={c.heritage} /><T v="label" color="heritageDeep">Tip</T></Row>
            <T v="bodySm" color="textSecondary">{works.length === 0 ? 'List your first artwork. Good daylight photos and your own story sell best.' : noPhotos ? `${noPhotos} listing${noPhotos > 1 ? 's have' : ' has'} fewer than 4 photos. Add a close-up and a photo in your hands for scale.` : 'Record your story in your own voice. Buyers love hearing the maker.'}</T>
          </Card>
          {works.length === 0 && <Button title="Upload your first artwork" icon="plus" onPress={() => router.push('/upload')} />}
        </View>
      </ScrollView>
    </View>
  );
}
