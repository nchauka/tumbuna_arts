import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, Button, Card, Header, Input, Row, Screen, Seal, Steps, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { ago } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useMyArtist, useStore } from '@/store';

export default function ArtistVerification() {
  const { c } = useTheme();
  const artist = useMyArtist();
  const submit = useStore((s) => s.submitVerification);
  const [step, setStep] = useState(0);
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [referee, setReferee] = useState({ name: '', role: '', phone: '' });
  const [works, setWorks] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!artist) return null;

  if (artist.verification !== 'none') {
    const verified = artist.verification === 'verified';
    return (
      <Screen padded={false}>
        <Header title="Verification" />
        <View style={{ alignItems: 'center', gap: 14, padding: 24 }}>
          <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: c.verifiedTint, alignItems: 'center', justifyContent: 'center' }}>
            {verified ? <Seal size={64} /> : <Icon name="clock" size={48} color={c.verifiedText} />}
          </View>
          <T v="h1" center>{verified ? 'You are verified' : 'Under review'}</T>
          <T center color="textSecondary">{verified ? 'The gold Verified Artist badge now appears on your profile, every listing and every certificate.' : `Submitted ${ago(artist.verificationSubmittedAt ?? Date.now())}. We check your documents and call your referee, usually within 48 hours.`}</T>
          <Badge label={verified ? 'Verified artist' : 'Pending'} tone={verified ? 'verified' : 'neutral'} />
          {!verified && <T v="caption" color="textMuted" center>An admin approves applications from the admin tools (demo admin: admin@example.com).</T>}
          <Button title={verified ? 'See my profile' : 'Back to Studio'} onPress={() => (verified ? router.replace(`/artist/${artist.id}`) : router.back())} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </View>
      </Screen>
    );
  }

  const take = async (setter: (u: string) => void, front = false) => {
    const useCam = Platform.OS !== 'web' && (await ImagePicker.requestCameraPermissionsAsync()).granted;
    const r = useCam
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!r.canceled) setter(r.assets[0].uri);
  };
  const pickWorks = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 6 });
    if (!r.canceled) setWorks([...works, ...r.assets.map((a) => a.uri)].slice(0, 6));
  };

  const next = async () => {
    setErr(null);
    if (step === 0 && (!idPhoto || !selfie)) return setErr('Add a photo of your ID and a selfie.');
    if (step === 1 && (referee.name.trim().length < 2 || referee.phone.replace(/\D/g, '').length < 7)) return setErr('Add your referee\'s name and phone number.');
    if (step === 2) {
      if (works.length < 3) return setErr('Add at least 3 photos of your work, including one in progress.');
      setBusy(true);
      const e = await submit({ idPhoto: idPhoto!, selfie: selfie!, referee, works });
      setBusy(false);
      if (e) return setErr(e);
      toast('Submitted for review');
      return;
    }
    setStep(step + 1);
  };

  const Capture = ({ label, uri, onPress, icon }: { label: string; uri: string | null; onPress: () => void; icon: 'cert' | 'user' }) => (
    <Pressable onPress={onPress} style={{ flex: 1, height: 150, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: uri ? 'solid' : 'dashed', borderColor: uri ? c.success : c.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {uri ? <Image source={{ uri }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" /> : <><Icon name={icon} size={28} color={c.textMuted} /><T v="label" color="textMuted">{label}</T></>}
      {uri && <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#fff" /></View>}
    </Pressable>
  );

  return (
    <Screen padded={false} footer={<Button title={step < 2 ? 'Continue' : 'Submit for review'} flex loading={busy} onPress={next} />}>
      <Header title="Get verified" onBack={() => (step ? setStep(step - 1) : router.back())} />
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.verifiedTint, borderColor: c.verifiedTint }}>
          <Seal size={34} />
          <T v="bodySm" style={{ flex: 1 }}>This badge will appear on your profile, listings and certificates. Buyers trust verified artists more.</T>
        </Card>
        <Steps steps={['Identity', 'Referee', 'Your work']} current={step} />
        {step === 0 && <>
          <T color="textSecondary">A National ID, voter ID, driver&apos;s licence or passport. Only our verification team sees it.</T>
          <Row gap={12}>
            <Capture label="Photo ID" uri={idPhoto} icon="cert" onPress={() => take(setIdPhoto)} />
            <Capture label="Selfie" uri={selfie} icon="user" onPress={() => take(setSelfie, true)} />
          </Row>
        </>}
        {step === 1 && <>
          <T color="textSecondary">Not everyone has formal ID, so a respected person in your community vouches for you. We&apos;ll call them.</T>
          <Input label="Referee's full name" value={referee.name} onChangeText={(v) => setReferee({ ...referee, name: v })} />
          <Input label="Their role" value={referee.role} onChangeText={(v) => setReferee({ ...referee, role: v })} placeholder="e.g. Ward councillor, pastor, cultural centre manager" />
          <Input label="Their phone" value={referee.phone} onChangeText={(v) => setReferee({ ...referee, phone: v })} keyboardType="phone-pad" placeholder="+675 7…" />
        </>}
        {step === 2 && <>
          <T color="textSecondary">Three or more photos of your work. Include at least one taken while you&apos;re making it.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {works.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 96, height: 96, borderRadius: radius.md }} />)}
            {works.length < 6 && (
              <Pressable onPress={pickWorks} style={{ width: 96, height: 96, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="plus" color={c.textMuted} />
              </Pressable>
            )}
          </View>
        </>}
        {err && <T v="bodySm" color="error">{err}</T>}
      </View>
    </Screen>
  );
}
