import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BarChart } from '@/components/cards';
import { StudioHeader } from '@/components/studio-header';
import { Button, Card, Input, ListRow, Row, Segmented, Sheet, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { date, kina } from '@/lib/format';
import { palette, radius } from '@/constants/tokens';
import { artistBalances, artistOrders, COMMISSION, useMyArtist, useStore } from '@/store';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const METHODS = ['BSP bank account', 'Kina Bank account', 'Mobile money wallet'];

export default function Earnings() {
  const { c } = useTheme();
  const artist = useMyArtist()!;
  const state = useStore();
  const bal = artistBalances(state, artist.id);
  const orders = useMemo(() => artistOrders(state, artist.id).filter((o) => o.status !== 'cancelled'), [state, artist.id]);
  const payouts = state.payouts.filter((p) => p.artistId === artist.id);
  const [period, setPeriod] = useState<'week' | 'year'>('year');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(METHODS[0]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const series = useMemo(() => {
    const net = (from: number, to: number) => orders.filter((o) => o.createdAt >= from && o.createdAt < to).reduce((t, o) => t + o.subtotal * (1 - COMMISSION), 0);
    if (period === 'year') {
      const y = new Date().getFullYear();
      return MONTHS.map((l, m) => ({ l, v: net(new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime()) }));
    }
    return Array.from({ length: 8 }, (_, i) => {
      const end = Date.now() - (7 - i) * 7 * 86_400_000;
      return { l: `W${i + 1}`, v: net(end - 7 * 86_400_000, end) };
    });
  }, [orders, period]);
  const gross = orders.reduce((t, o) => t + o.subtotal, 0);

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <StudioHeader title="Earnings">
          <View style={{ backgroundColor: '#2A2622', borderRadius: radius.xl, padding: 16, gap: 12 }}>
            <T v="caption" style={{ color: '#CBC2B8' }}>Available to withdraw</T>
            <T v="display" style={{ color: palette.paradiseGold }}>{kina(bal.available, true)}</T>
            <Row gap={16}>
              <View><T v="caption" style={{ color: '#968B80' }}>Pending</T><T v="label" style={{ color: '#fff' }}>{kina(bal.pending, true)}</T></View>
              <View><T v="caption" style={{ color: '#968B80' }}>Lifetime</T><T v="label" style={{ color: '#fff' }}>{kina(bal.lifetime, true)}</T></View>
              <View><T v="caption" style={{ color: '#968B80' }}>Paid out</T><T v="label" style={{ color: '#fff' }}>{kina(bal.paidOut, true)}</T></View>
            </Row>
            <Button title="Withdraw" disabled={bal.available <= 0} onPress={() => { setAmount(bal.available.toFixed(2)); setErr(null); setOpen(true); }} />
          </View>
        </StudioHeader>
        <View style={{ padding: 16, gap: 16 }}>
          <Card style={{ gap: 14 }}>
            <Row><T v="h3" style={{ flex: 1 }}>Net earnings</T></Row>
            <Segmented options={[{ key: 'week', label: 'Last 8 weeks' }, { key: 'year', label: 'This year' }]} value={period} onChange={setPeriod} />
            <BarChart values={series.map((s) => s.v)} labels={series.map((s) => s.l)} highlight={period === 'year' ? new Date().getMonth() : 7} height={110} />
          </Card>
          <Card style={{ gap: 8 }}>
            <T v="h3">How fees work</T>
            <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Artwork sales</T><T v="bodySm">{kina(gross, true)}</T></Row>
            <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Tumbuna fee (10%)</T><T v="bodySm">− {kina(gross * COMMISSION, true)}</T></Row>
            <Row style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}><T v="bodyStrong" style={{ flex: 1 }}>You earn</T><T v="bodyStrong">{kina(gross * (1 - COMMISSION), true)}</T></Row>
            <T v="caption" color="textMuted">Shipping and export permit fees are passed to couriers and the museum. Money stays pending until the buyer confirms delivery.</T>
          </Card>
          <View>
            <T v="h3" style={{ marginBottom: 4 }}>Payout history</T>
            {payouts.length ? payouts.map((p, i) => <ListRow key={p.id} icon="wallet" title={kina(p.amount, true)} subtitle={`${p.method} · ${date(p.at)}`} last={i === payouts.length - 1} />)
              : <T v="bodySm" color="textMuted">No withdrawals yet.</T>}
          </View>
        </View>
      </ScrollView>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Withdraw earnings">
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <Input label="Amount (Kina)" value={amount} onChangeText={(v) => { setAmount(v.replace(/[^\d.]/g, '')); setErr(null); }} keyboardType="decimal-pad" error={err} hint={`Available: ${kina(bal.available, true)}`} />
          <T v="label">Send to</T>
          {METHODS.map((m) => <Button key={m} title={m} kind={method === m ? 'dark' : 'outline'} size="sm" onPress={() => setMethod(m)} />)}
          <Button title={`Withdraw ${kina(Number(amount) || 0, true)}`} loading={busy} onPress={async () => {
            setBusy(true);
            const e = await state.requestPayout(Number(amount), method);
            setBusy(false);
            if (e) return setErr(e);
            setOpen(false); toast('Withdrawal requested');
          }} />
        </View>
      </Sheet>
    </View>
  );
}
