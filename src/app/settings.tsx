import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { act, confirm, Header, ListRow, PickerSheet, Screen, T, toast, Toggle } from '@/components/ui';
import type { Currency, Settings } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useMe, useStore } from '@/store';

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'PGK', label: 'Kina only (PGK)' }, { value: 'USD', label: 'Show US dollars' }, { value: 'AUD', label: 'Show Australian dollars' }, { value: 'EUR', label: 'Show euros' },
];

export default function SettingsScreen() {
  const { c } = useTheme();
  const me = useMe();
  const s = useStore((st) => st.settings);
  const update = useStore((st) => st.updateSettings);
  const deleteAccount = useStore((st) => st.deleteAccount);
  const [sheet, setSheet] = useState<null | 'currency' | 'theme' | 'language'>(null);
  const set = (p: Partial<Settings>) => update(p);

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 6 }}>
      <T v="overline" color="textMuted" style={{ paddingHorizontal: 4 }}>{title}</T>
      <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border }}>{children}</View>
    </View>
  );

  return (
    <Screen padded={false} overlay={<>
      <PickerSheet visible={sheet === 'currency'} onClose={() => setSheet(null)} title="Currency display" value={s.currency} options={CURRENCIES} onSelect={(v) => set({ currency: v })} />
      <PickerSheet visible={sheet === 'theme'} onClose={() => setSheet(null)} title="Appearance" value={s.theme} options={[{ value: 'system', label: 'Match system' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onSelect={(v) => set({ theme: v })} />
      <PickerSheet visible={sheet === 'language'} onClose={() => setSheet(null)} title="Language" value={s.language} options={[{ value: 'en', label: 'English' }, { value: 'tpi', label: 'Tok Pisin', sub: 'Translation in progress' }]} onSelect={(v) => { set({ language: v }); if (v === 'tpi') toast('Tok Pisin is coming soon. Tenkyu for waiting!'); }} />
    </>}>
      <Header title="Settings" />
      <View style={{ paddingHorizontal: 16, gap: 22 }}>
        <Group title="Preferences">
          <ListRow title="Language" subtitle={s.language === 'en' ? 'English' : 'Tok Pisin'} onPress={() => setSheet('language')} />
          <ListRow title="Currency display" subtitle={CURRENCIES.find((x) => x.value === s.currency)?.label} onPress={() => setSheet('currency')} />
          <ListRow title="Appearance" subtitle={{ system: 'Match system', light: 'Light', dark: 'Dark' }[s.theme]} onPress={() => setSheet('theme')} last />
        </Group>
        <Group title="Data">
          <ListRow title="Data saver" subtitle="Lower-resolution images on mobile data" right={<Toggle value={s.dataSaver} onChange={(v) => set({ dataSaver: v })} />} last />
        </Group>
        <Group title="Notifications">
          <ListRow title="Order updates" subtitle="Shipping, delivery and payouts" right={<Toggle value={s.orderPush} onChange={(v) => set({ orderPush: v })} />} />
          <ListRow title="Activity" subtitle="New works from artists you follow" right={<Toggle value={s.activityPush} onChange={(v) => set({ activityPush: v })} />} last />
        </Group>
        <Group title="Security">
          <ListRow title="Unlock with biometrics" right={<Toggle value={s.biometrics} onChange={(v) => set({ biometrics: v })} />} />
          <ListRow title="Change password" onPress={() => router.push('/forgot-password')} last />
        </Group>
        {me && (
          <Group title="Account">
            <ListRow title="Delete account" danger right={<View />} last onPress={() => confirm({
              title: 'Delete your account?', body: 'Your profile, wishlist and saved addresses are removed. Certificates stay on the registry.', confirm: 'Delete', danger: true,
              onConfirm: async () => { if (await act(deleteAccount(), 'Account deleted')) router.replace('/home'); },
            })} />
          </Group>
        )}
        <T v="caption" color="textMuted" center>Tumbuna Arts 1.0.0 · Made with care for PNG artists</T>
      </View>
    </Screen>
  );
}
