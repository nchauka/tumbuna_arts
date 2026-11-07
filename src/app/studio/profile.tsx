import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ArtistAvatar } from '@/components/cards';
import { Icon } from '@/components/icon';
import { act, Button, Header, Input, PickerSheet, Screen, Select, T } from '@/components/ui';
import { provinces } from '@/data/seed';
import { useTheme } from '@/hooks/use-theme';
import { useMyArtist, useStore } from '@/store';

export default function EditArtistProfile() {
  const { c } = useTheme();
  const artist = useMyArtist()!;
  const update = useStore((s) => s.updateArtistProfile);
  const [form, setForm] = useState({ village: artist.village, bio: artist.bio, lineage: artist.lineage, years: String(artist.yearsPractising), province: artist.province, avatarUri: artist.avatarUri });
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled) setForm({ ...form, avatarUri: r.assets[0].uri });
  };

  return (
    <Screen padded={false} footer={<Button title="Save profile" flex loading={busy} onPress={async () => {
      setBusy(true);
      const ok = await act(update({
        village: form.village.trim(), bio: form.bio.trim(), lineage: form.lineage.trim(), yearsPractising: Math.max(0, Number(form.years) || 0), province: form.province,
        avatarUri: form.avatarUri !== artist.avatarUri ? form.avatarUri : undefined,
      }), 'Profile saved');
      setBusy(false);
      if (ok) router.back();
    }} />} overlay={<PickerSheet visible={sheet} onClose={() => setSheet(false)} title="Province" value={form.province} options={provinces.map((p) => ({ value: p.slug, label: p.name }))} onSelect={(v) => setForm({ ...form, province: v })} />}>
      <Header title="Artist profile" />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <Pressable onPress={pick} style={{ alignSelf: 'center', alignItems: 'center', gap: 8 }}>
          <ArtistAvatar artist={{ ...artist, avatarUri: form.avatarUri }} size={96} ring />
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="camera" size={16} color={c.primary} /><T v="label" color="primary">Change photo</T></View>
        </Pressable>
        <Select label="Province" value={provinces.find((p) => p.slug === form.province)?.name} onPress={() => setSheet(true)} />
        <Input label="Village or town" value={form.village} onChangeText={(v) => setForm({ ...form, village: v })} placeholder="e.g. Kambot village" />
        <Input label="Years practising" value={form.years} onChangeText={(v) => setForm({ ...form, years: v.replace(/\D/g, '') })} keyboardType="number-pad" />
        <Input label="Your story" value={form.bio} onChangeText={(v) => setForm({ ...form, bio: v })} multiline placeholder="What do you make, and why? Who taught you?" />
        <Input label="Lineage" value={form.lineage} onChangeText={(v) => setForm({ ...form, lineage: v })} multiline placeholder="Who passed the craft to you?" hint="Collectors and museums value knowing where a tradition comes from." />
      </View>
    </Screen>
  );
}
