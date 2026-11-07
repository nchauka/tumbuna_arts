export type ArtPattern = 'carve' | 'bilum' | 'tapa' | 'basket' | 'mask' | 'paint' | 'shell' | 'pottery';

export type Region = 'Highlands' | 'Momase' | 'Southern' | 'Islands';

export type Province = {
  slug: string;
  name: string;
  code: string;
  region: Region;
  capital: string;
  crafts: string[];
  blurb: string;
  pattern: ArtPattern;
};

export type Category = { slug: string; name: string; pattern: ArtPattern; variant?: number };

export type Material = {
  slug: string;
  name: string;
  source: string;
  care: string;
  exportNote?: string;
  sustainable: boolean;
  pattern: ArtPattern;
};

export type Technique = {
  slug: string;
  name: string;
  where: string;
  summary: string;
  steps: { title: string; body: string }[];
  tools: string[];
  pattern: ArtPattern;
};

export type Story = {
  slug: string;
  title: string;
  province: string;
  category: string;
  teller: string;
  readMins: number;
  pattern: ArtPattern;
  variant?: number;
  intro: string;
  chapters: { title: string; body: string }[];
};

export type VerificationStatus = 'none' | 'pending' | 'verified';

export type Artist = {
  id: string;
  name: string;
  province: string;
  village: string;
  crafts: string[];
  bio: string;
  lineage: string;
  yearsPractising: number;
  verification: VerificationStatus;
  verificationSubmittedAt?: number;
  pattern: ArtPattern;
  variant?: number;
  avatarUri?: string;
  joinedAt: number;
};

export type ArtworkStatus = 'live' | 'draft' | 'sold' | 'hidden';

export type Artwork = {
  id: string;
  title: string;
  artistId: string;
  category: string;
  province: string;
  price: number; // Kina
  pattern: ArtPattern;
  variant?: number;
  images: string[]; // uploaded photo URIs; empty → generated pattern
  story: string;
  significance: string;
  materials: string[];
  techniques: string[];
  dimensions: string;
  weightKg: number;
  exportPermit: boolean;
  oneOfAKind: boolean;
  status: ArtworkStatus;
  featured?: boolean;
  views: number;
  createdAt: number;
  certificateSerial: string;
  ownerId?: string;
};

export type Review = {
  id: string;
  artworkId: string;
  artistId: string;
  userName: string;
  rating: number;
  tags: string[];
  text: string;
  photos: string[];
  at: number;
};

export type Role = 'buyer' | 'artist';

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** Only in seed data for the server; the API never returns it. */
  password?: string;
  role: Role | 'admin';
  artistId?: string;
  country: string;
  city?: string;
  createdAt: number;
};

export type Address = {
  name: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  country: string;
  postcode: string;
};

export type OrderStatus = 'placed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  number: string;
  buyerId: string;
  buyerName: string;
  artistId?: string;
  items: { artworkId: string; price: number }[];
  address: Address;
  shipping: { id: string; label: string; carrier: string; price: number; eta: string };
  permitFee: number;
  subtotal: number;
  total: number;
  payment: string;
  paymentRef?: string;
  status: OrderStatus;
  events: { status: OrderStatus; at: number; note?: string }[];
  trackingNo?: string;
  createdAt: number;
  confirmedAt?: number;
  reviewed?: boolean;
  simulated?: boolean;
  sample?: boolean;
};

export type AppNotification = {
  id: string;
  userId: string;
  kind: 'order' | 'activity' | 'verify' | 'payout';
  title: string;
  body: string;
  at: number;
  read: boolean;
  link?: string;
};

export type Payout = { id: string; artistId: string; amount: number; method: string; at: number };

export type Currency = 'PGK' | 'USD' | 'AUD' | 'EUR';

export type Settings = {
  currency: Currency;
  language: 'en' | 'tpi';
  theme: 'system' | 'light' | 'dark';
  dataSaver: boolean;
  biometrics: boolean;
  orderPush: boolean;
  activityPush: boolean;
};
