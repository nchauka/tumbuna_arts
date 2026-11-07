import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistAvatar } from '@/components/cards';
import { Icon } from '@/components/icon';
import { Button, confirm, ListRow, Row, Seal, StatTile, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { date } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { useMe, useMyArtist, useStore } from '@/store';

export default function Profile() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const artist = useMyArtist();
  const orders = useStore((s) => s.orders.filter((o) => o.buyerId === s.sessionUserId));
  const certs = useStore((s) => s.artworks.filter((a) => a.ownerId && a.ownerId === s.sessionUserId).length);
  const reviews = useStore((s) => s.orders.filter((o) => o.buyerId === s.sessionUserId && o.reviewed).length);
  const setMode = useStore((s) => s.setMode);
  const logout = useStore((s) => s.logout);

  if (!me) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 24, paddingHorizontal: 16, gap: 16 }}>
        <T v="h1">Profile</T>
        <View style={{ backgroundColor: c.heritageTint, borderRadius: radius.xl, padding: 20, gap: 10 }}>
          <T v="h3">Join Tumbuna Arts</T>
          <T v="bodySm" color="textSecondary">Log in to buy, track orders, keep your certificates and sell your own work.</T>
          <Row gap={10} style={{ marginTop: 6 }}>
            <Button title="Log in" flex onPress={() => router.push('/login')} />
            <Button title="Sign up" kind="outline" flex onPress={() => router.push('/register')} />
          </Row>
        </View>
        <View>
          <ListRow icon="scan" title="Verify an artwork" subtitle="Scan a Tumbuna QR tag" onPress={() => router.push('/scan')} />
          <ListRow icon="sliders" title="Settings" onPress={() => router.push('/settings')} />
          <ListRow icon="help" title="Help center" onPress={() => router.push('/help')} last />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 18 }}>
        <Row gap={14}>
          {artist ? <ArtistAvatar artist={artist} size={64} ring /> : (
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
              <T v="h1" style={{ color: '#fff' }}>{me.name[0]}</T>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Row gap={6}><T v="h2">{me.name}</T>{artist?.verification === 'verified' && <Seal size={18} />}</Row>
            <T v="bodySm" color="textMuted">{me.city ? `${me.city}, ` : ''}{me.country} · since {date(me.createdAt)}</T>
          </View>
          <Pressable onPress={() => router.push('/account')} hitSlop={8}><Icon name="edit" size={20} color={c.textSecondary} /></Pressable>
        </Row>

        <Row gap={10}>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/orders')}><StatTile value={String(orders.length)} label="Orders" /></Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/certificates')}><StatTile value={String(certs)} label="Certificates" /></Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push('/orders')}><StatTile value={String(reviews)} label="Reviews" /></Pressable>
        </Row>

        <Pressable onPress={() => {
          if (artist) { setMode('studio'); router.replace('/studio/dashboard'); }
          else router.push({ pathname: '/register', params: { role: 'artist' } });
        }} style={{ backgroundColor: '#1C1C1C', borderRadius: radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#2A2622', alignItems: 'center', justifyContent: 'center' }}><Icon name="chart" color={c.verified} /></View>
          <View style={{ flex: 1 }}>
            <T v="overline" style={{ color: c.verified }}>{artist ? 'Studio' : 'Start selling'}</T>
            <T v="h3" style={{ color: '#fff' }}>{artist ? 'Switch to Studio' : 'Sell your art on Tumbuna'}</T>
            <T v="caption" style={{ color: '#CBC2B8' }}>{artist ? 'Manage artworks, orders and earnings' : 'Create an artist account in two minutes'}</T>
          </View>
          <Icon name="chev" color="#fff" size={18} />
        </Pressable>

        <View>
          {me.role === 'admin' && <ListRow icon="seal" title="Verification review" subtitle="Admin" onPress={() => router.push('/admin')} />}
          <ListRow icon="box" title="Purchase history" onPress={() => router.push('/orders')} />
          <ListRow icon="cert" title="My certificates" onPress={() => router.push('/certificates')} />
          <ListRow icon="user" title="Following" onPress={() => router.push('/wishlist')} />
          <ListRow icon="scan" title="Verify an artwork" onPress={() => router.push('/scan')} />
          <ListRow icon="bell" title="Notifications" onPress={() => router.push('/notifications')} />
          <ListRow icon="sliders" title="Settings" onPress={() => router.push('/settings')} />
          <ListRow icon="help" title="Help center" onPress={() => router.push('/help')} />
          <ListRow icon="logout" title="Log out" danger last right={<View />} onPress={() => confirm({ title: 'Log out?', body: 'Your saved works stay on this device.', confirm: 'Log out', danger: true, onConfirm: async () => { await logout(); toast('Logged out'); router.replace('/home'); } })} />
        </View>
      </ScrollView>
    </View>
  );
}
