import { createHash } from 'node:crypto';

/** Shipping options in toea. Prices match the app's checkout. */
export const SHIPPING = {
  domestic: [
    { id: 'post', label: 'Post PNG Standard', carrier: 'Post PNG', priceToea: 35_00, eta: '5–9 days' },
    { id: 'ems', label: 'Post PNG EMS', carrier: 'Post PNG', priceToea: 60_00, eta: '2–4 days' },
  ],
  international: [
    { id: 'dhl', label: 'DHL Express', carrier: 'DHL', priceToea: 165_00, eta: '4–7 days' },
    { id: 'postintl', label: 'Post PNG International', carrier: 'Post PNG', priceToea: 95_00, eta: '10–21 days' },
  ],
};

export const isDomestic = (country: string) => country.trim().toLowerCase() === 'papua new guinea';

export function shippingOption(country: string, id: string) {
  return (isDomestic(country) ? SHIPPING.domestic : SHIPPING.international).find((o) => o.id === id) ?? null;
}

const luhn = (n: string) => {
  const d = n.replace(/\D/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) { let x = Number(d[d.length - 1 - i]); if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }
  return sum % 10 === 0;
};

export type PaymentInput =
  | { method: 'card'; card: { number: string; exp: string; cvc: string; name: string } }
  | { method: 'mobile_money'; phone: string }
  | { method: 'bank_transfer' };

export type PaymentResult = { ok: true; label: string; ref: string } | { ok: false; message: string };

/**
 * Test-mode payment provider. Card payments are validated and approved without charging;
 * mobile money and bank transfer return a reference. Replace with Stripe / a PNG gateway here.
 */
export function authorisePayment(p: PaymentInput, totalToea: number, checkoutId: string): PaymentResult {
  const ref = `PAY-${createHash('sha1').update(checkoutId).digest('hex').slice(0, 10).toUpperCase()}`;
  if (totalToea <= 0) return { ok: false, message: 'The order total must be above K 0.' };
  if (p.method === 'card') {
    const digits = p.card.number.replace(/\D/g, '');
    if (!luhn(digits)) return { ok: false, message: 'Check the card number.' };
    const m = p.card.exp.match(/^(\d{2})\/(\d{2})$/);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12 || new Date(2000 + Number(m[2]), Number(m[1])) <= new Date()) return { ok: false, message: 'The card has expired or the date is not MM/YY.' };
    if (!/^\d{3,4}$/.test(p.card.cvc)) return { ok: false, message: 'Check the security code.' };
    if (digits === '4000000000000002') return { ok: false, message: 'The card was declined. Try another card.' };
    return { ok: true, label: `Card •••• ${digits.slice(-4)}`, ref };
  }
  if (p.method === 'mobile_money') {
    if (p.phone.replace(/\D/g, '').length < 7) return { ok: false, message: 'Enter the mobile number for your wallet.' };
    return { ok: true, label: 'Mobile money', ref };
  }
  return { ok: true, label: 'Bank transfer', ref };
}
