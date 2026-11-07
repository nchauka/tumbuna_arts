import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtworkCard, categoryName, provinceName } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Button, Card, Chip, confirm, Input, PickerSheet, ProgressBar, Row, Select, StickyFooter, T, toast, Toggle } from '@/components/ui';
import { categories, materials, provinces, techniques } from '@/data/seed';
import type { Artwork } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { COMMISSION, useMyArtist, useStore } from '@/store';

const STEPS = ['Photos & details', 'Story & meaning', 'Price & shipping', 'Preview'];
const PERMIT_HINT = new Set(['masks', 'carvings', 'instruments']);

export default function Upload() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artist = useMyArtist();
  const existing = useStore((s) => (id ? s.artworks.find((a) => a.id === id) : undefined));
  const saveArtwork = useStore((s) => s.saveArtwork);
  const [step, setStep] = useState(0);
  const [sheet, setSheet] = useState<null | 'category' | 'province'>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [a, setA] = useState<Partial<Artwork>>(() => existing ?? {
    title: '', category: '', province: artist?.province, price: 0, images: [], story: '', significance: '', materials: [], techniques: [],
    dimensions: '', weightKg: 1, exportPermit: false, oneOfAKind: true,
  });
  const [priceText, setPriceText] = useState(existing ? String(existing.price) : '');
  const [weightText, setWeightText] = useState(existing ? String(existing.weightKg) : '1');
  const set = (p: Partial<Artwork>) => setA((prev) => ({ ...prev, ...p }));

  if (!artist) {
    return <View style={{ flex: 1, backgroundColor: c.background, padding: 24, paddingTop: insets.top + 40, gap: 16 }}><T v="h2">Artist account needed</T><Button title="Create an artist account" onPress={() => router.replace({ pathname: '/register', params: { role: 'artist' } })} /></View>;
  }

  const images = a.images ?? [];
  const cat = categories.find((x) => x.slug === a.category);
  const price = Number(priceText) || 0;

  const pick = async (camera: boolean) => {
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) { toast('Allow camera access in Settings to take photos.'); return; }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: !camera, selectionLimit: 8 - images.length };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!r.canceled) set({ images: [...images, ...r.assets.map((x) => x.uri)].slice(0, 8) });
  };

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if ((a.title ?? '').trim().length < 3) e.title = 'Give your work a title.';
      if (!a.category) e.category = 'Choose a category.';
    }
    if (s === 1 && (a.story ?? '').trim().length < 20) e.story = 'Tell buyers a little more (at least a sentence or two).';
    if (s === 2) {
      if (price < 10) e.price = 'Set a price of at least K 10.';
      if (!(Number(weightText) > 0)) e.weight = 'Enter the packed weight in kg.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const payload = (): Partial<Artwork> => ({
    ...a, id: existing?.id, price, weightKg: Number(weightText) || 1,
    pattern: cat?.pattern ?? 'carve', variant: cat?.variant, title: (a.title ?? '').trim(), story: (a.story ?? '').trim(), significance: (a.significance ?? '').trim(),
  });

  /** Shows server-side validation on the step that owns the field. */
  const showServerErrors = (fields?: Record<string, string>) => {
    if (!fields) return;
    setErrors({ ...fields, weight: fields.weightKg ?? '' });
    const keys = Object.keys(fields);
    setStep(keys.some((k) => k === 'title' || k === 'category') ? 0 : keys.includes('story') ? 1 : 2);
  };
  const saveDraft = async () => {
    setBusy(true);
    const res = await saveArtwork(payload(), false);
    setBusy(false);
    if ('error' in res) { toast(res.error); showServerErrors(res.fields); return; }
    toast('Draft saved');
    router.back();
  };
  const publish = async () => {
    for (const s of [0, 1, 2]) if (!validate(s)) { setStep(s); return; }
    setBusy(true);
    const res = await saveArtwork(payload(), true);
    setBusy(false);
    if ('error' in res) { toast(res.error); showServerErrors(res.fields); return; }
    toast(existing?.status === 'live' ? 'Listing updated' : 'Listed! We\'ll tell you when it sells.');
    router.back();
    if (!existing) router.push(`/artwork/${res.id}`);
  };
  const close = () => {
    if (!a.title && !images.length) { router.back(); return; }
    confirm({ title: 'Keep this as a draft?', body: 'You can finish it later from Artworks → Drafts.', confirm: 'Save draft', onConfirm: () => { void saveDraft(); } });
  };

  const preview = { ...(payload() as Artwork), id: existing?.id ?? 'preview', artistId: artist.id, status: 'live' as const, views: 0, createdAt: Date.now(), certificateSerial: existing?.certificateSerial ?? 'Issued on publish', images };
  const thumb = (width - 32 - 8 * 3) / 4;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, gap: 10, paddingBottom: 10 }}>
        <Row>
          <Pressable onPress={close} hitSlop={10}><T v="label">Cancel</T></Pressable>
          <T v="h3" style={{ flex: 1, textAlign: 'center' }}>{existing ? 'Edit artwork' : 'New artwork'}</T>
          <T v="label" color="textMuted">{step + 1} / 4</T>
        </Row>
        <ProgressBar value={(step + 1) / 4} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <T v="h2">{STEPS[step]}</T>

        {step === 0 && <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {images.map((uri, i) => (
              <View key={uri} style={{ width: thumb, height: thumb }}>
                <Image source={{ uri }} style={{ width: thumb, height: thumb, borderRadius: radius.sm }} contentFit="cover" />
                {i === 0 ? <View style={{ position: 'absolute', left: 4, bottom: 4, backgroundColor: '#1C1C1C', borderRadius: 4, paddingHorizontal: 5 }}><T v="caption" style={{ color: '#fff', fontSize: 9, fontFamily: 'Manrope_800ExtraBold' }}>COVER</T></View>
                  : <Pressable onPress={() => set({ images: [uri, ...images.filter((x) => x !== uri)] })} style={{ position: 'absolute', left: 4, bottom: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 4, paddingHorizontal: 5 }}><T v="caption" style={{ color: '#1C1C1C', fontSize: 9, fontFamily: 'Manrope_800ExtraBold' }}>MAKE COVER</T></Pressable>}
                <Pressable onPress={() => set({ images: images.filter((x) => x !== uri) })} hitSlop={6} accessibilityLabel="Remove photo" style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(28,28,28,0.75)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={12} color="#fff" strokeWidth={3} />
                </Pressable>
              </View>
            ))}
            {images.length < 8 && <>
              <Pressable onPress={() => pick(false)} style={{ width: thumb, height: thumb, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <Icon name="image" color={c.textMuted} /><T v="caption" color="textMuted">Gallery</T>
              </Pressable>
              {Platform.OS !== 'web' && (
                <Pressable onPress={() => pick(true)} style={{ width: thumb, height: thumb, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.border, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Icon name="camera" color={c.textMuted} /><T v="caption" color="textMuted">Camera</T>
                </Pressable>
              )}
            </>}
          </View>
          <T v="caption" color="textMuted">Add up to 8 photos in daylight: front, back, a close-up, and one in your hands for scale. Without photos, a placeholder pattern is shown.</T>
          <Input label="Title" value={a.title} onChangeText={(v) => set({ title: v })} placeholder="e.g. Crocodile spirit storyboard" error={errors.title} />
          <View style={{ gap: 4 }}><Select label="Category" value={cat?.name} placeholder="Choose category" onPress={() => setSheet('category')} />{errors.category && <T v="caption" color="error">{errors.category}</T>}</View>
          <Select label="Province of origin" value={provinceName(a.province ?? artist.province)} onPress={() => setSheet('province')} />
          <View style={{ gap: 8 }}>
            <T v="label">Materials</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {materials.map((m) => <Chip key={m.slug} label={m.name} selected={a.materials?.includes(m.slug)} onPress={() => set({ materials: a.materials?.includes(m.slug) ? a.materials.filter((x) => x !== m.slug) : [...(a.materials ?? []), m.slug] })} />)}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <T v="label">Technique</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {techniques.map((t) => <Chip key={t.slug} label={t.name} selected={a.techniques?.includes(t.slug)} onPress={() => set({ techniques: a.techniques?.includes(t.slug) ? a.techniques.filter((x) => x !== t.slug) : [...(a.techniques ?? []), t.slug] })} />)}
            </View>
          </View>
        </>}

        {step === 1 && <>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.heritageTint, borderColor: c.heritageTint }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.heritage, alignItems: 'center', justifyContent: 'center' }}><Icon name="mic" size={20} color="#fff" /></View>
            <T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Prefer speaking? Tap the microphone on your keyboard and tell the story in your own words.</T>
          </Card>
          <Input label="The story of this piece" value={a.story} onChangeText={(v) => set({ story: v })} multiline placeholder="What does it show? Who taught you this design? How long did it take?" error={errors.story} />
          <Input label="Cultural significance (optional)" value={a.significance} onChangeText={(v) => set({ significance: v })} multiline placeholder="What does it mean in your community? Only share what you have the right to share." />
        </>}

        {step === 2 && <>
          <Input label="Price (Kina)" value={priceText} onChangeText={(v) => setPriceText(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="e.g. 450" error={errors.price} left="wallet" />
          {price > 0 && (
            <Card style={{ gap: 6 }}>
              <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Buyer pays</T><T v="bodySm">{kina(price, true)}</T></Row>
              <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Tumbuna fee (10%)</T><T v="bodySm">− {kina(price * COMMISSION, true)}</T></Row>
              <Row style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6 }}><T v="bodyStrong" style={{ flex: 1 }}>You receive</T><T v="price" color="success">{kina(price * (1 - COMMISSION), true)}</T></Row>
            </Card>
          )}
          <Input label="Dimensions" value={a.dimensions} onChangeText={(v) => set({ dimensions: v })} placeholder="e.g. 60 × 30 × 4 cm" />
          <Input label="Packed weight (kg)" value={weightText} onChangeText={(v) => setWeightText(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" error={errors.weight} />
          <Row style={{ paddingVertical: 4 }}><View style={{ flex: 1 }}><T v="bodyStrong">One of a kind</T><T v="caption" color="textMuted">Turn off if you can make more like it</T></View><Toggle value={!!a.oneOfAKind} onChange={(v) => set({ oneOfAKind: v })} /></Row>
          <Row style={{ paddingVertical: 4 }}>
            <View style={{ flex: 1 }}><T v="bodyStrong">Needs export permit</T><T v="caption" color="textMuted">{PERMIT_HINT.has(a.category ?? '') ? 'Masks, carvings and instruments often need one to leave PNG.' : 'For antique, ceremonial or protected-material items.'}</T></View>
            <Toggle value={!!a.exportPermit} onChange={(v) => set({ exportPermit: v })} />
          </Row>
        </>}

        {step === 3 && <>
          <View style={{ alignItems: 'center' }}><ArtworkCard art={preview} width={Math.min(240, width - 64)} /></View>
          <Card style={{ gap: 8 }}>
            <Row><T v="bodySm" color="textSecondary" style={{ width: 110 }}>Category</T><T v="bodySm">{categoryName(a.category ?? '')}</T></Row>
            <Row><T v="bodySm" color="textSecondary" style={{ width: 110 }}>Province</T><T v="bodySm" style={{ flex: 1 }}>{provinceName(a.province ?? artist.province)}</T></Row>
            <Row><T v="bodySm" color="textSecondary" style={{ width: 110 }}>Photos</T><T v="bodySm">{images.length || 'None (placeholder pattern)'}</T></Row>
            <Row style={{ alignItems: 'flex-start' }}><T v="bodySm" color="textSecondary" style={{ width: 110 }}>Story</T><T v="bodySm" style={{ flex: 1 }} numberOfLines={4}>{a.story}</T></Row>
          </Card>
          <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: c.verifiedTint, borderColor: c.verifiedTint }}>
            <Icon name="seal" size={24} color={c.verified} />
            <T v="bodySm" style={{ flex: 1 }}>A Certificate of Authenticity with a QR code is issued automatically when you publish.{artist.verification !== 'verified' ? ' Get verified to show the gold badge on it.' : ''}</T>
          </Card>
        </>}
      </ScrollView>
      <StickyFooter>
        {step === 0 ? <Button title="Save draft" kind="outline" flex disabled={busy} onPress={saveDraft} /> : <Button title="Back" kind="outline" flex onPress={() => setStep(step - 1)} />}
        {step < 3 ? <Button title="Continue" flex onPress={() => validate(step) && setStep(step + 1)} /> : <Button title={existing?.status === 'live' ? 'Save changes' : 'Publish'} flex loading={busy} onPress={publish} />}
      </StickyFooter>
      <PickerSheet visible={sheet === 'category'} onClose={() => setSheet(null)} title="Category" value={a.category} options={categories.map((x) => ({ value: x.slug, label: x.name }))}
        onSelect={(v) => set({ category: v, exportPermit: a.exportPermit || PERMIT_HINT.has(v) })} />
      <PickerSheet visible={sheet === 'province'} onClose={() => setSheet(null)} title="Province" value={a.province} options={provinces.map((p) => ({ value: p.slug, label: p.name }))} onSelect={(v) => set({ province: v })} />
    </KeyboardAvoidingView>
  );
}
