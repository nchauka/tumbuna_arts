import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { radius } from '@/constants/tokens';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/store';

/** Floating bar shown on browse screens once the cart has items. */
export function CartBar() {
  const { c } = useTheme();
  const cart = useStore((s) => s.cart);
  const total = useStore((s) => s.artworks.filter((a) => s.cart.includes(a.id)).reduce((t, a) => t + a.price, 0));
  if (!cart.length) return null;
  return (
    <Pressable onPress={() => router.push('/cart')} accessibilityRole="button"
      style={{ position: 'absolute', left: 16, right: 16, bottom: 12, height: 52, borderRadius: radius.lg, backgroundColor: c.text, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }}>
      <Icon name="bag" size={20} color={c.background} />
      <T v="label" style={{ color: c.background, flex: 1 }}>View cart · {cart.length} item{cart.length > 1 ? 's' : ''}</T>
      <T v="price" style={{ color: c.background, fontSize: 16 }}>K {total.toLocaleString()}</T>
    </Pressable>
  );
}
