import { useColorScheme } from 'react-native';

import { colors } from '@/constants/tokens';
import { useStore } from '@/store';

export type Palette = { [K in keyof typeof colors.light]: string };

export function useTheme() {
  const pref = useStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = pref === 'dark' || (pref === 'system' && system === 'dark');
  return { c: (dark ? colors.dark : colors.light) as Palette, dark };
}
