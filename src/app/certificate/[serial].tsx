import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { BilumBand, KunduSeal } from '@/components/brand';
import { provinceName } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Button, Empty, Header, IconButton, Input, Row, Screen, Seal, Sheet, T, toast } from '@/components/ui';
import { materials } from '@/data/seed';
import type { Artist, Artwork } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, errorMessage } from '@/lib/api';
import { date } from '@/lib/format';
import { elevation, palette, radius } from '@/constants/tokens';
import { useStore } from '@/store';

type Certificate = {
  serial: string; fingerprint: string; issuedAt: number; owner: string | null; transferred: boolean;
  history: { event: 'listed' | 'purchase' | 'transfer'; at: number }[]; artwork: Artwork; artist: Artist;
};

const qrPayload = (serial: string) => `tumbunaarts://certificate/${serial}`;
const EVENT_LABEL = { listed: 'Listed by the artist', purchase: 'Sold through Tumbuna Arts', transfer: 'Ownership transferred' } as const;

export default function CertificateViewer() {
  const { serial } = useLocalSearchParams<{ serial: string }>();
  const { c } = useTheme();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const isOwner = useStore((s) => !!s.sessionUserId && s.artworks.some((a) => a.certificateSerial === serial && a.ownerId === s.sessionUserId));
  const transfer = useStore((s) => s.transferCertificate);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCert(await api<Certificate>('GET', `/certificates/${encodeURIComponent(serial)}`));
    } catch (e) {
      setError({ notFound: e instanceof ApiError && e.status === 404, message: errorMessage(e) });
    }
  }, [serial]);
  useEffect(() => { void load(); }, [load]);

  if (error) {
    return (
      <Screen padded={false}>
        <Header title="Certificate" />
        {error.notFound
          ? <Empty icon="cert" title="Certificate not recognised" body={`No artwork on the Tumbuna registry uses serial ${serial}. If this came from a tag, report it to us.`} action="Report this item" onAction={() => router.push('/help')} />
          : <Empty icon="globe" title="Couldn't load the certificate" body={error.message} action="Try again" onAction={load} />}
      </Screen>
    );
  }
  if (!cert) return <Screen padded={false}><Header title="Certificate" /><ActivityIndicator style={{ marginTop: 60 }} color={c.primary} /></Screen>;

  const { artwork: art, artist } = cert;
  const share = () => Share.share({ message: `Certificate of Authenticity ${cert.serial}: "${art.title}" by ${artist.name}. Verify: ${qrPayload(cert.serial)}` });

  return (
    <Screen padded={false} bg="element"
      footer={isOwner ? <><Button title="Share" kind="outline" icon="share" flex onPress={share} /><Button title="Transfer owner" kind="dark" flex onPress={() => setOpen(true)} /></> : <Button title="View artwork" kind="dark" flex onPress={() => router.push(`/artwork/${art.id}`)} />}
      overlay={
        <Sheet visible={open} onClose={() => setOpen(false)} title="Transfer ownership">
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="bodySm" color="textSecondary">Selling or gifting this work? Transfer the certificate so the new owner appears on the registry. This cannot be undone.</T>
            <Input label="New owner's account email" value={email} onChangeText={(v) => { setEmail(v); setErr(null); }} autoCapitalize="none" keyboardType="email-address" error={err} />
            <Button title="Transfer certificate" loading={busy} onPress={async () => {
              setBusy(true);
              const e = await transfer(cert.serial, email);
              setBusy(false);
              if (e) return setErr(e);
              setOpen(false); toast('Certificate transferred'); void load();
            }} />
          </View>
        </Sheet>
      }>
      <Header title="Certificate" right={<IconButton name="share" label="Share" onPress={share} />} />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={[{ backgroundColor: '#FFFFFF', borderRadius: radius.xl, overflow: 'hidden' }, elevation.e3]}>
          <BilumBand height={10} />
          <View style={{ padding: 20, alignItems: 'center', gap: 10 }}>
            <KunduSeal size={84} />
            <T v="overline" style={{ color: palette.paradiseGoldDeep }}>Certificate of Authenticity</T>
            <T v="h1" center style={{ color: palette.ink }}>{art.title}</T>
            <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: palette.sand200, paddingTop: 12, gap: 8 }}>
              <Field label="Artist" value={artist.name} seal={artist.verification === 'verified'} />
              <Field label="Origin" value={`${artist.village ? artist.village + ', ' : ''}${provinceName(art.province)}`} />
              <Field label="Materials" value={art.materials.map((m) => materials.find((x) => x.slug === m)?.name ?? m).join(', ') || 'Hand-made'} />
              <Field label="Dimensions" value={art.dimensions || '—'} />
              <Field label="Issued" value={date(cert.issuedAt)} />
              <Field label="Owner" value={cert.owner ?? 'Available for sale'} />
            </View>
            <Row gap={14} style={{ width: '100%', borderTopWidth: 1, borderTopColor: palette.sand200, paddingTop: 14, alignItems: 'center' }}>
              <View style={{ padding: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: palette.sand200 }}>
                <QRCode value={qrPayload(cert.serial)} size={92} color={palette.ink} backgroundColor="#FFFFFF" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <T v="caption" style={{ color: palette.sand500 }}>Serial</T>
                <Pressable onPress={async () => { await Clipboard.setStringAsync(cert.serial); toast('Serial copied'); }}><T v="serial" style={{ color: palette.ink }}>{cert.serial}</T></Pressable>
                <T v="caption" style={{ color: palette.sand500 }}>Fingerprint</T>
                <T v="serial" style={{ color: palette.sand700, fontSize: 11 }}>{cert.fingerprint.slice(0, 16)}</T>
                <Row gap={4}><Icon name="check" size={14} color={palette.rainforest} /><T v="caption" style={{ color: palette.rainforest, fontFamily: 'Manrope_800ExtraBold' }}>Verified on Tumbuna registry</T></Row>
              </View>
            </Row>
          </View>
        </View>

        <View style={{ marginTop: 24, gap: 10 }}>
          <T v="overline" color="textMuted">Provenance</T>
          {cert.history.map((h, i) => (
            <Row key={i} gap={12}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: h.event === 'listed' ? c.heritage : h.event === 'purchase' ? c.verified : c.success }} />
              <T v="bodySm" style={{ flex: 1 }}>{EVENT_LABEL[h.event]} · {date(h.at)}</T>
            </Row>
          ))}
          {cert.owner && <T v="bodySm" color="textSecondary">Current owner: {cert.owner}</T>}
          <T v="caption" color="textMuted" style={{ marginTop: 6 }}>Scan the QR code with the Tumbuna app to confirm this certificate at any time.</T>
        </View>
      </View>
    </Screen>
  );
}

function Field({ label, value, seal }: { label: string; value: string; seal?: boolean }) {
  return (
    <Row gap={12} style={{ alignItems: 'flex-start' }}>
      <T v="bodySm" style={{ width: 92, color: palette.sand500 }}>{label}</T>
      <Row gap={5} style={{ flex: 1, flexWrap: 'wrap' }}><T v="label" style={{ color: palette.ink }}>{value}</T>{seal && <Seal size={15} />}</Row>
    </Row>
  );
}

