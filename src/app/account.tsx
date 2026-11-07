import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { act, Button, Header, Input, PickerSheet, Screen, Select, T } from '@/components/ui';
import { COUNTRIES } from '@/lib/format';
import { useMe, useStore } from '@/store';

export default function Account() {
  const me = useMe();
  const update = useStore((s) => s.updateProfile);
  const [name, setName] = useState(me?.name ?? '');
  const [phone, setPhone] = useState(me?.phone ?? '');
  const [city, setCity] = useState(me?.city ?? '');
  const [country, setCountry] = useState(me?.country ?? 'Papua New Guinea');
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!me) return null;

  return (
    <Screen padded={false} footer={<Button title="Save changes" flex disabled={name.trim().length < 2} loading={busy} onPress={async () => {
      setBusy(true);
      const ok = await act(update({ name: name.trim(), phone: phone.trim() || undefined, city: city.trim() || undefined, country }), 'Profile updated');
      setBusy(false);
      if (ok) router.back();
    }} />}
      overlay={<PickerSheet visible={sheet} onClose={() => setSheet(false)} title="Country" value={country} options={COUNTRIES.map((x) => ({ value: x, label: x }))} onSelect={setCountry} />}>
      <Header title="Your account" />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input label="Email" value={me.email || 'Not set (signed up with phone)'} editable={false} />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+675 7…" />
        <Input label="Town / city" value={city} onChangeText={setCity} />
        <Select label="Country" value={country} onPress={() => setSheet(true)} />
        <T v="caption" color="textMuted">Your name appears on certificates you own and on reviews you write.</T>
      </View>
    </Screen>
  );
}
