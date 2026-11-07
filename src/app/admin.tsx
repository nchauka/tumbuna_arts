import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { provinceName } from '@/components/cards';
import { Button, Card, Empty, Header, Input, Row, Screen, Segmented, Sheet, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { ago } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useMe } from '@/store';

type Request = {
  id: string; artistId: string; artistName: string; province: string; idPhotoUrl: string; selfieUrl: string;
  referee: { name: string; role: string; phone: string }; portfolio: string[]; status: 'pending' | 'approved' | 'rejected'; note?: string; createdAt: number;
};

/** Admin review of artist verification applications. */
export default function Admin() {
  const { c } = useTheme();
  const me = useMe();
  const [status, setStatus] = useState<Request['status']>('pending');
  const [items, setItems] = useState<Request[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setItems((await api<{ items: Request[] }>('GET', `/admin/verifications?status=${status}`)).items); } catch (e) { setError(errorMessage(e)); }
  }, [status]);
  useEffect(() => { setItems(null); void load(); }, [load]);

  const decide = async (r: Request, approve: boolean, reason?: string) => {
    setBusy(r.id);
    try {
      await api('POST', `/admin/verifications/${r.id}/decision`, { approve, note: reason });
      toast(approve ? `${r.artistName} is now verified` : `Sent back to ${r.artistName}`);
      setRejecting(null); setNote('');
      await load();
    } catch (e) { toast(errorMessage(e)); } finally { setBusy(null); }
  };

  if (me?.role !== 'admin') return <Screen padded={false}><Header title="Admin" /><Empty icon="lock" title="Admins only" /></Screen>;

  return (
    <Screen padded={false} scroll={false}
      overlay={
        <Sheet visible={!!rejecting} onClose={() => setRejecting(null)} title="Ask for more information">
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="bodySm" color="textSecondary">Tell {rejecting?.artistName} what to fix. They can apply again.</T>
            <Input label="Note to the artist" value={note} onChangeText={setNote} multiline placeholder="e.g. The ID photo is blurry. Please retake it in daylight." />
            <Button title="Send back" kind="danger" disabled={note.trim().length < 5} loading={busy === rejecting?.id} onPress={() => rejecting && decide(rejecting, false, note.trim())} />
          </View>
        </Sheet>
      }>
      <Header title="Verification review" />
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <Segmented options={[{ key: 'pending', label: 'Pending' }, { key: 'approved', label: 'Approved' }, { key: 'rejected', label: 'Sent back' }]} value={status} onChange={setStatus} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 14, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.primary} />}>
        {error && <Empty icon="globe" title="Couldn't load applications" body={error} action="Try again" onAction={load} />}
        {!error && !items && <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />}
        {items?.length === 0 && <Empty icon="seal" title={status === 'pending' ? 'No applications waiting' : 'Nothing here'} />}
        {items?.map((r) => (
          <Card key={r.id} style={{ gap: 12 }}>
            <Row><View style={{ flex: 1 }}><T v="h3">{r.artistName}</T><T v="caption" color="textMuted">{provinceName(r.province)} · applied {ago(r.createdAt)}</T></View></Row>
            <Row gap={8}>
              {[['ID', r.idPhotoUrl], ['Selfie', r.selfieUrl]].map(([label, url]) => (
                <View key={label} style={{ flex: 1, gap: 4 }}>
                  <Image source={{ uri: url }} style={{ height: 110, borderRadius: radius.md, backgroundColor: c.element }} contentFit="cover" />
                  <T v="caption" color="textMuted">{label}</T>
                </View>
              ))}
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {r.portfolio.map((u, i) => <Image key={i} source={{ uri: u }} style={{ width: 70, height: 70, borderRadius: radius.sm, backgroundColor: c.element }} />)}
            </ScrollView>
            <View style={{ gap: 2 }}>
              <T v="overline" color="textMuted">Referee</T>
              <T v="bodySm">{r.referee.name}{r.referee.role ? ` · ${r.referee.role}` : ''}</T>
              <T v="serial" color="textSecondary">{r.referee.phone}</T>
            </View>
            {r.note && <T v="bodySm" color="textSecondary">Note: {r.note}</T>}
            {r.status === 'pending' && (
              <Row gap={10}>
                <Button title="Send back" kind="outline" flex onPress={() => { setRejecting(r); setNote(''); }} />
                <Button title="Approve" flex loading={busy === r.id} onPress={() => decide(r, true)} />
              </Row>
            )}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
