import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { Icon, IconName } from '@/components/icon';
import { Button, Card, Header, Input, PickerSheet, Row, Screen, Select, Steps, T, toast } from '@/components/ui';
import { provinces } from '@/data/seed';
import type { Address, Order } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { convert, COUNTRIES, kina } from '@/lib/format';
import { radius } from '@/constants/tokens';
import { PERMIT_FEE, useMe, useStore, type PaymentInput } from '@/store';

type Ship = Order['shipping'];
const DOMESTIC: Ship[] = [
  { id: 'post', label: 'Post PNG Standard', carrier: 'Post PNG', price: 35, eta: '5–9 days' },
  { id: 'ems', label: 'Post PNG EMS', carrier: 'Post PNG', price: 60, eta: '2–4 days' },
];
const INTL: Ship[] = [
  { id: 'dhl', label: 'DHL Express', carrier: 'DHL', price: 165, eta: '4–7 days' },
  { id: 'postintl', label: 'Post PNG International', carrier: 'Post PNG', price: 95, eta: '10–21 days' },
];
const PAY: { id: string; label: string; sub: string; icon: IconName }[] = [
  { id: 'Card', label: 'Card', sub: 'Visa, Mastercard', icon: 'wallet' },
  { id: 'Mobile money', label: 'Mobile money', sub: 'Pay from your PNG mobile wallet', icon: 'phone' },
  { id: 'Bank transfer', label: 'Bank transfer', sub: 'BSP, Kina Bank, Westpac PNG, ANZ PNG', icon: 'box' },
];

const luhn = (n: string) => {
  const d = n.replace(/\D/g, ''); if (d.length < 13) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) { let x = Number(d[d.length - 1 - i]); if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }
  return sum % 10 === 0;
};

export default function Checkout() {
  const { c } = useTheme();
  const me = useMe();
  const cart = useStore((s) => s.cart);
  const artworks = useStore((s) => s.artworks);
  const saved = useStore((s) => s.addresses);
  const currency = useStore((s) => s.settings.currency);
  const { placeOrder } = useStore.getState();
  const items = cart.map((id) => artworks.find((a) => a.id === id)).filter((a) => !!a);
  const artistCount = new Set(items.map((a) => a.artistId)).size;

  const [step, setStep] = useState(0);
  const [addr, setAddr] = useState<Address>(saved[0] ?? { name: me?.name ?? '', phone: me?.phone ?? '', line1: '', city: me?.city ?? '', province: '', country: me?.country ?? 'Papua New Guinea', postcode: '' });
  const [sheet, setSheet] = useState<null | 'country' | 'province'>(null);
  const international = addr.country !== 'Papua New Guinea';
  const options = international ? INTL : DOMESTIC;
  const [shipId, setShipId] = useState<string>('');
  const ship = options.find((o) => o.id === shipId) ?? options[0];
  const [pay, setPay] = useState('Card');
  const [card, setCard] = useState({ number: '', exp: '', cvc: '', name: '' });
  const [wallet, setWallet] = useState(me?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const subtotal = items.reduce((t, a) => t + a.price, 0);
  const permit = international ? items.filter((a) => a.exportPermit).length * PERMIT_FEE : 0;
  const shipping = ship.price * artistCount;
  const total = subtotal + permit + shipping;

  const addrErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (addr.name.trim().length < 2) e.name = 'Enter the recipient\'s name.';
    if (addr.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number the courier can call.';
    if (addr.line1.trim().length < 3) e.line1 = 'Enter a street address, section/lot or PO Box.';
    if (!addr.city.trim()) e.city = 'Enter a town or city.';
    if (!addr.province.trim()) e.province = international ? 'Enter a state or region.' : 'Choose a province.';
    return e;
  }, [addr, international]);

  const payErrors = () => {
    const e: Record<string, string> = {};
    if (pay === 'Card') {
      if (!luhn(card.number)) e.number = 'Check the card number.';
      const m = card.exp.match(/^(\d{2})\/(\d{2})$/);
      const valid = m && Number(m[1]) >= 1 && Number(m[1]) <= 12 && new Date(2000 + Number(m[2]), Number(m[1])) > new Date();
      if (!valid) e.exp = 'Use MM/YY and a future date.';
      if (!/^\d{3,4}$/.test(card.cvc)) e.cvc = '3 or 4 digits.';
      if (card.name.trim().length < 2) e.cardName = 'Name as shown on the card.';
    }
    if (pay === 'Mobile money' && wallet.replace(/\D/g, '').length < 7) e.wallet = 'Enter the mobile number for your wallet.';
    return e;
  };

  const next = async () => {
    if (step === 0) {
      if (Object.keys(addrErrors).length) { setErrors(addrErrors); return; }
      setErrors({}); setStep(1);
    } else if (step === 1) setStep(2);
    else {
      const e = payErrors();
      if (Object.keys(e).length) { setErrors(e); return; }
      setBusy(true);
      const payment: PaymentInput = pay === 'Card' ? { method: 'card', card } : pay === 'Mobile money' ? { method: 'mobile_money', phone: wallet } : { method: 'bank_transfer' };
      const res = await placeOrder({ address: addr, shippingId: ship.id, payment });
      setBusy(false);
      if ('error' in res) { toast(res.error); return; }
      router.replace({ pathname: '/checkout/success', params: { id: res.orders[0].id, ids: res.orders.map((o) => o.id).join(',') } });
    }
  };

  if (!items.length) {
    return <Screen padded={false}><Header title="Checkout" /><T center color="textMuted" style={{ padding: 40 }}>Your cart is empty.</T></Screen>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false} footer={
        <View style={{ flex: 1, gap: 6 }}>
          <Button title={step < 2 ? 'Continue' : `Pay ${kina(total, true)}`} onPress={next} loading={busy} />
          {step === 2 && <T v="caption" color="textMuted" center>Payment held until you confirm delivery</T>}
        </View>
      }>
        <Header title="Checkout" onBack={() => (step ? setStep(step - 1) : router.back())} />
        <View style={{ paddingHorizontal: 16, gap: 20 }}>
          <Steps steps={['Address', 'Shipping', 'Payment']} current={step} />

          {step === 0 && (
            <View style={{ gap: 14 }}>
              <T v="h2">Where should it go?</T>
              {saved.length > 0 && (
                <View style={{ gap: 8 }}>
                  {saved.map((a) => (
                    <RadioCard key={a.line1} selected={addr.line1 === a.line1} title={a.name} sub={`${a.line1}, ${a.city}, ${a.country}`} onPress={() => setAddr(a)} />
                  ))}
                </View>
              )}
              <Input label="Recipient name" value={addr.name} onChangeText={(v) => setAddr({ ...addr, name: v })} error={errors.name} />
              <Input label="Phone" value={addr.phone} onChangeText={(v) => setAddr({ ...addr, phone: v })} keyboardType="phone-pad" placeholder="+675 7…" error={errors.phone} />
              <Select label="Country" value={addr.country} onPress={() => setSheet('country')} />
              <Input label="Street, section/lot or PO Box" value={addr.line1} onChangeText={(v) => setAddr({ ...addr, line1: v })} error={errors.line1} />
              <Row gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1.4 }}><Input label="Town / city" value={addr.city} onChangeText={(v) => setAddr({ ...addr, city: v })} error={errors.city} /></View>
                <View style={{ flex: 1 }}><Input label="Postcode" value={addr.postcode} onChangeText={(v) => setAddr({ ...addr, postcode: v })} keyboardType="number-pad" /></View>
              </Row>
              {international
                ? <Input label="State / region" value={addr.province} onChangeText={(v) => setAddr({ ...addr, province: v })} error={errors.province} />
                : <View style={{ gap: 4 }}><Select label="Province" value={provinces.find((p) => p.slug === addr.province)?.name ?? addr.province} placeholder="Choose province" onPress={() => setSheet('province')} />{errors.province && <T v="caption" color="error">{errors.province}</T>}</View>}
            </View>
          )}

          {step === 1 && (
            <View style={{ gap: 12 }}>
              <T v="h2">Shipping</T>
              <T v="bodySm" color="textSecondary">{artistCount > 1 ? `Your works come from ${artistCount} artists, so they ship in ${artistCount} parcels.` : 'Ships directly from the artist.'}</T>
              {options.map((o) => (
                <RadioCard key={o.id} selected={ship.id === o.id} title={`${o.label} · ${kina(o.price * artistCount)}`} sub={`${o.eta}${artistCount > 1 ? ` · K ${o.price} per parcel` : ''}`} onPress={() => setShipId(o.id)} />
              ))}
              {international && (
                <Card style={{ backgroundColor: c.verifiedTint, borderColor: c.verifiedTint, gap: 6 }}>
                  <Row gap={8}><Icon name="info" size={18} color={c.verifiedText} /><T v="label">Export & customs</T></Row>
                  <T v="bodySm" color="textSecondary">
                    {permit ? `${permit / PERMIT_FEE} item${permit / PERMIT_FEE > 1 ? 's need' : ' needs'} a National Museum & Art Gallery export permit. We arrange it for K ${PERMIT_FEE} each. ` : 'No export permits needed for this order. '}
                    Import duties in {addr.country} are paid on delivery. Wooden items may be inspected by biosecurity.
                  </T>
                </Card>
              )}
            </View>
          )}

          {step === 2 && (
            <View style={{ gap: 12 }}>
              <T v="h2">Pay with</T>
              {PAY.map((p) => <RadioCard key={p.id} icon={p.icon} selected={pay === p.id} title={p.label} sub={p.sub} onPress={() => { setPay(p.id); setErrors({}); }} />)}
              {pay === 'Card' && (
                <View style={{ gap: 12 }}>
                  <Input label="Card number" value={card.number} keyboardType="number-pad" placeholder="4242 4242 4242 4242" error={errors.number}
                    onChangeText={(v) => setCard({ ...card, number: v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim() })} />
                  <Row gap={10} style={{ alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}><Input label="Expiry" value={card.exp} placeholder="MM/YY" keyboardType="number-pad" error={errors.exp}
                      onChangeText={(v) => { const d = v.replace(/\D/g, '').slice(0, 4); setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }); }} /></View>
                    <View style={{ flex: 1 }}><Input label="CVC" value={card.cvc} keyboardType="number-pad" secure error={errors.cvc} onChangeText={(v) => setCard({ ...card, cvc: v.replace(/\D/g, '').slice(0, 4) })} /></View>
                  </Row>
                  <Input label="Name on card" value={card.name} onChangeText={(v) => setCard({ ...card, name: v })} error={errors.cardName} />
                  <T v="caption" color="textMuted">Test mode: no money is taken. Use 4242 4242 4242 4242 with any future date (4000 0000 0000 0002 is declined).</T>
                </View>
              )}
              {pay === 'Mobile money' && <Input label="Wallet mobile number" value={wallet} onChangeText={setWallet} keyboardType="phone-pad" placeholder="+675 7…" hint="You'll get a prompt on your phone to approve the payment." error={errors.wallet} />}
              {pay === 'Bank transfer' && <Card><T v="bodySm" color="textSecondary">After you place the order we&apos;ll show the account details and a payment reference. Your order is reserved for 48 hours.</T></Card>}

              <View style={{ gap: 8, padding: 16, borderRadius: radius.lg, backgroundColor: c.surface, marginTop: 4 }}>
                {items.map((a) => <Row key={a.id}><T v="bodySm" style={{ flex: 1 }} numberOfLines={1}>{a.title}</T><T v="bodySm">{kina(a.price, true)}</T></Row>)}
                <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>{ship.label}{artistCount > 1 ? ` × ${artistCount}` : ''}</T><T v="bodySm">{kina(shipping, true)}</T></Row>
                {permit > 0 && <Row><T v="bodySm" color="textSecondary" style={{ flex: 1 }}>Export permit (NMAG)</T><T v="bodySm">{kina(permit, true)}</T></Row>}
                <Row style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 }}><T v="bodyStrong" style={{ flex: 1 }}>Total</T><T v="price">{kina(total, true)}</T></Row>
                {currency !== 'PGK' && <T v="caption" color="textMuted" style={{ textAlign: 'right' }}>≈ {convert(total, currency)} · charged in PGK</T>}
              </View>
            </View>
          )}
        </View>
      </Screen>
      <PickerSheet visible={sheet === 'country'} onClose={() => setSheet(null)} title="Country" value={addr.country} options={COUNTRIES.map((x) => ({ value: x, label: x }))} onSelect={(v) => { setAddr({ ...addr, country: v, province: '' }); setShipId(''); }} />
      <PickerSheet visible={sheet === 'province'} onClose={() => setSheet(null)} title="Province" value={addr.province} options={provinces.map((p) => ({ value: p.slug, label: p.name }))} onSelect={(v) => setAddr({ ...addr, province: v })} />
    </KeyboardAvoidingView>
  );
}

function RadioCard({ selected, title, sub, onPress, icon }: { selected: boolean; title: string; sub?: string; onPress: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1.5, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primaryTint : c.background }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: selected ? 6 : 1.5, borderColor: selected ? c.primary : c.border }} />
      {icon && <Icon name={icon} size={20} color={c.text} />}
      <View style={{ flex: 1 }}>
        <T v="label">{title}</T>
        {sub && <T v="caption" color="textMuted">{sub}</T>}
      </View>
    </Pressable>
  );
}
