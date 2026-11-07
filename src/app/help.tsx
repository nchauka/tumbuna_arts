import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon, IconName } from '@/components/icon';
import { act, Button, Header, Input, ListRow, Row, Screen, Sheet, T, toast } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { radius } from '@/constants/tokens';
import { useStore } from '@/store';

const TOPICS: { key: string; label: string; icon: IconName }[] = [
  { key: 'buying', label: 'Buying', icon: 'bag' },
  { key: 'shipping', label: 'Shipping & customs', icon: 'truck' },
  { key: 'selling', label: 'Selling', icon: 'chart' },
  { key: 'payments', label: 'Payments & payouts', icon: 'wallet' },
  { key: 'authenticity', label: 'Authenticity', icon: 'seal' },
];

const FAQ: { topic: string; q: string; a: string }[] = [
  { topic: 'buying', q: 'Is my payment safe?', a: 'Yes. We hold your payment until you confirm the artwork arrived. If it never arrives or is not as described, you get a full refund.' },
  { topic: 'buying', q: 'Can I cancel an order?', a: 'You can cancel any time before the artist starts packing. Open the order and tap Cancel order for an instant refund.' },
  { topic: 'shipping', q: 'Do I need an export permit?', a: 'Some carvings, masks and shell items need a National Museum & Art Gallery permit to leave PNG. The listing tells you, and we arrange it for K 30 per item.' },
  { topic: 'shipping', q: 'Will customs inspect wooden items?', a: 'Countries such as Australia and New Zealand may inspect wood, fibre and shell. Artists treat and pack items to meet these rules, and permits travel with the parcel.' },
  { topic: 'shipping', q: 'How long does delivery take?', a: 'Within PNG: 2–9 days with Post PNG. Overseas: 4–7 days with DHL Express or 10–21 days with Post PNG International.' },
  { topic: 'selling', q: 'How do I get verified?', a: 'In Studio, open Get verified. Add a photo ID and selfie, a community referee such as a ward councillor or church leader, and three works with in-progress photos. Reviews take up to 48 hours.' },
  { topic: 'selling', q: 'What does it cost to sell?', a: 'Listing is free. We keep 10% of the artwork price when it sells, which covers payments, certificates and buyer support. Shipping fees go to the courier.' },
  { topic: 'payments', q: 'When do I get paid?', a: 'As soon as the buyer confirms delivery, the money becomes available in Earnings. Withdraw to a PNG bank account or mobile money wallet; it arrives in 1–2 business days.' },
  { topic: 'authenticity', q: 'How do I check a certificate?', a: 'Tap the scan icon on Home and point your camera at the QR tag, or enter the serial number. Genuine certificates open straight from the Tumbuna registry.' },
  { topic: 'authenticity', q: 'What if a scan says "Not recognised"?', a: 'The item may not be genuine. Tap Report this item and our team will investigate with the seller.' },
];

export default function Help() {
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [chat, setChat] = useState(false);
  const sendSupport = useStore((st) => st.sendSupport);
  const [msg, setMsg] = useState('');
  const list = FAQ.filter((f) => (!topic || f.topic === topic) && `${f.q} ${f.a}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen padded={false} footer={<Button title="Chat with us" icon="chat" flex onPress={() => setChat(true)} />}
      overlay={
        <Sheet visible={chat} onClose={() => setChat(false)} title="Message support">
          <View style={{ gap: 14, paddingBottom: 8 }}>
            <T v="bodySm" color="textSecondary">We reply within a few hours, in English or Tok Pisin.</T>
            <Input label="How can we help?" value={msg} onChangeText={setMsg} multiline placeholder="Tell us your order number if it's about an order" />
            <Button title="Send message" disabled={msg.trim().length < 5} onPress={async () => { if (await act(sendSupport(msg.trim(), 'help-center'), 'Message sent. We\'ll reply by email or in your notifications.')) { setChat(false); setMsg(''); } }} />
          </View>
        </Sheet>
      }>
      <Header title="Help center" />
      <View style={{ paddingHorizontal: 16, gap: 18 }}>
        <View style={{ height: 48, borderRadius: radius.pill, backgroundColor: c.element, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <Icon name="search" size={18} color={c.textMuted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search help" placeholderTextColor={c.textMuted} style={{ flex: 1, color: c.text, fontFamily: 'Manrope_500Medium', fontSize: 16, height: 46 }} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TOPICS.map((t) => (
            <Pressable key={t.key} onPress={() => setTopic(topic === t.key ? null : t.key)} style={{ width: '31%', flexGrow: 1, padding: 14, borderRadius: radius.lg, gap: 8, backgroundColor: topic === t.key ? c.text : c.surface, borderWidth: 1, borderColor: topic === t.key ? c.text : c.border }}>
              <Icon name={t.icon} color={topic === t.key ? c.background : t.icon === 'seal' ? c.verified : c.text} />
              <T v="label" style={{ color: topic === t.key ? c.background : c.text, fontSize: 13 }}>{t.label}</T>
            </Pressable>
          ))}
        </View>
        <View>
          {list.map((f) => (
            <Pressable key={f.q} onPress={() => setOpen(open === f.q ? null : f.q)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 8 }}>
              <Row><T v="bodyStrong" style={{ flex: 1 }}>{f.q}</T><Icon name={open === f.q ? 'minus' : 'plus'} size={18} color={c.textMuted} /></Row>
              {open === f.q && <T v="bodySm" color="textSecondary">{f.a}</T>}
            </Pressable>
          ))}
          {!list.length && <T color="textMuted" center style={{ padding: 20 }}>No answers match. Chat with us below.</T>}
        </View>
        <View>
          <T v="overline" color="textMuted">Other ways to reach us</T>
          <ListRow icon="mail" title="help@tumbuna.art" subtitle="Tap to copy" onPress={async () => { await Clipboard.setStringAsync('help@tumbuna.art'); toast('Email copied'); }} />
          <ListRow icon="phone" title="+675 7000 0000" subtitle="Mon–Fri, 8am–5pm PNG time · Tap to copy" last onPress={async () => { await Clipboard.setStringAsync('+67570000000'); toast('Number copied'); }} />
        </View>
      </View>
    </Screen>
  );
}
