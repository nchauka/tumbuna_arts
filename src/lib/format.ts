import type { Currency } from '@/data/types';

/** Indicative rates from 1 PGK; the API serves live rates in production. */
export const FX: Record<Currency, { rate: number; symbol: string }> = {
  PGK: { rate: 1, symbol: 'K' },
  USD: { rate: 0.25, symbol: 'US$' },
  AUD: { rate: 0.38, symbol: 'AU$' },
  EUR: { rate: 0.23, symbol: '€' },
};

export const kina = (n: number, cents = false) =>
  `K ${n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;

export const convert = (n: number, c: Currency) => {
  const { rate, symbol } = FX[c];
  return `${symbol} ${Math.round(n * rate).toLocaleString('en-US')}`;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const date = (t: number) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const time = (t: number) => { const d = new Date(t); return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; };
export const ago = (t: number) => {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return date(t);
};

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Moning' : h < 18 ? 'Apinun' : 'Gutnait';
};

export const COUNTRIES = ['Papua New Guinea', 'Australia', 'New Zealand', 'United States', 'United Kingdom', 'Japan', 'Germany', 'France', 'Fiji', 'Solomon Islands', 'Singapore', 'China', 'Canada', 'Other'];
