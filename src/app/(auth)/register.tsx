import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Chip, Header, Input, PickerSheet, Row, Screen, Segmented, Select, T, toast } from '@/components/ui';
import { provinces } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { afterAuth } from '@/lib/auth';
import { COUNTRIES } from '@/lib/format';
import { useStore } from '@/store';

const CRAFTS = ['Carvings', 'Bilums', 'Tapa cloth', 'Baskets', 'Paintings', 'Masks', 'Pottery', 'Jewellery', 'Instruments', 'Sculpture'];

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

export default function Register() {
  const params = useLocalSearchParams<{ role?: string; next?: string }>();
  const { c } = useTheme();
  const register = useStore((s) => s.register);
  const [role, setRole] = useState<'buyer' | 'artist'>(params.role === 'artist' ? 'artist' : 'buyer');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [country, setCountry] = useState('Papua New Guinea');
  const [province, setProvince] = useState<string>('');
  const [crafts, setCrafts] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [sheet, setSheet] = useState<null | 'country' | 'province'>(null);
  const [error, setError] = useState<string | null>(null);
  const s = strength(pw);

  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) return setError('Enter your full name.');
    if (role === 'artist' && !province) return setError('Choose the province you work in.');
    if (role === 'artist' && !crafts.length) return setError('Choose at least one craft.');
    if (!terms) return setError('Please accept the terms to continue.');
    setBusy(true);
    const err = await register({ name, identifier: id, password: pw, role, country: role === 'artist' ? 'Papua New Guinea' : country, province, crafts });
    setBusy(false);
    if (err) return setError(err);
    useStore.getState().finishOnboarding();
    toast(role === 'artist' ? 'Welcome to your Studio' : 'Account created');
    afterAuth(params.next);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false} footer={<Button title="Create account" onPress={submit} loading={busy} flex />}>
        <Header />
        <View style={{ paddingHorizontal: 16, gap: 18 }}>
          <View style={{ gap: 6 }}>
            <T v="h1">Create your account</T>
            <T color="textSecondary">{role === 'artist' ? 'Sell your work to buyers in PNG and around the world.' : 'Save favourites, buy securely and keep your certificates.'}</T>
          </View>
          <Segmented options={[{ key: 'buyer', label: 'I want to buy' }, { key: 'artist', label: 'I want to sell' }]} value={role} onChange={(r) => { setRole(r); setError(null); }} />
          <Input label="Full name" value={name} onChangeText={setName} placeholder="e.g. Mary Tumu" autoComplete="name" />
          <Input label="Email or phone" value={id} onChangeText={setId} placeholder="you@example.com or +675 7…" autoCapitalize="none" keyboardType="email-address" hint="Artists without email can sign up with a mobile number." />
          <View style={{ gap: 8 }}>
            <Input label="Password" value={pw} onChangeText={setPw} placeholder="At least 8 characters" secure />
            <Row gap={4}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < s ? (s < 2 ? c.error : s < 3 ? c.verified : c.success) : c.element }} />)}</Row>
            {!!pw && <T v="caption" color="textMuted">{['Too short', 'Weak', 'Okay', 'Strong', 'Very strong'][s]}</T>}
          </View>
          {role === 'buyer' ? (
            <Select label="Country" value={country} onPress={() => setSheet('country')} />
          ) : (
            <>
              <Select label="Province you work in" value={provinces.find((p) => p.slug === province)?.name} placeholder="Choose province" onPress={() => setSheet('province')} />
              <View style={{ gap: 8 }}>
                <T v="label">Your crafts</T>
                <Row gap={8} style={{ flexWrap: 'wrap' }}>
                  {CRAFTS.map((cr) => <Chip key={cr} label={cr} selected={crafts.includes(cr)} onPress={() => setCrafts(crafts.includes(cr) ? crafts.filter((x) => x !== cr) : [...crafts, cr])} />)}
                </Row>
              </View>
            </>
          )}
          <Pressable onPress={() => setTerms(!terms)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: terms ? c.primary : c.border, backgroundColor: terms ? c.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {terms && <Icon name="check" size={14} color="#fff" />}
            </View>
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>I agree to the Terms of Use and the cultural protocols for buying and selling heritage art.</T>
          </Pressable>
          {error && <T v="bodySm" color="error">{error}</T>}
          <Row style={{ justifyContent: 'center' }}>
            <T v="bodySm" color="textSecondary">Already have an account?</T>
            <Pressable onPress={() => router.replace('/login')}><T v="label" color="primary">Log in</T></Pressable>
          </Row>
        </View>
      </Screen>
      <PickerSheet visible={sheet === 'country'} onClose={() => setSheet(null)} title="Country" value={country} options={COUNTRIES.map((x) => ({ value: x, label: x }))} onSelect={setCountry} />
      <PickerSheet visible={sheet === 'province'} onClose={() => setSheet(null)} title="Province" value={province} options={provinces.map((p) => ({ value: p.slug, label: p.name, sub: p.region }))} onSelect={setProvince} />
    </KeyboardAvoidingView>
  );
}
