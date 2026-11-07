import { json, ms, toKina } from '../http';

/** Row → JSON shapes. Field names match the app's types in src/data/types.ts. */

export type UserRow = { Id: string; Name: string; Email: string | null; Phone: string | null; Role: string; ArtistId: string | null; Country: string; City: string | null; CreatedAt: Date };
export const mapUser = (u: UserRow) => ({
  id: u.Id, name: u.Name, email: u.Email ?? '', phone: u.Phone ?? undefined, role: u.Role, artistId: u.ArtistId ?? undefined,
  country: u.Country, city: u.City ?? undefined, createdAt: ms(u.CreatedAt),
});

export type ArtistRow = {
  Id: string; Name: string; ProvinceSlug: string; Village: string; Crafts: string; Bio: string; Lineage: string; YearsPractising: number;
  Verification: string; VerificationSubmittedAt: Date | null; Pattern: string; Variant: number | null; AvatarUrl: string | null; JoinedAt: Date;
  RatingAvg?: number | null; RatingCount?: number | null;
};
export const mapArtist = (a: ArtistRow) => ({
  id: a.Id, name: a.Name, province: a.ProvinceSlug, village: a.Village, crafts: json<string[]>(a.Crafts, []), bio: a.Bio, lineage: a.Lineage,
  yearsPractising: a.YearsPractising, verification: a.Verification, verificationSubmittedAt: ms(a.VerificationSubmittedAt),
  pattern: a.Pattern, variant: a.Variant ?? undefined, avatarUri: a.AvatarUrl ?? undefined, joinedAt: ms(a.JoinedAt),
  ...(a.RatingCount !== undefined ? { rating: { avg: a.RatingAvg ? Number(a.RatingAvg) : 0, count: a.RatingCount ?? 0 } } : {}),
});

export type ReviewRow = { Id: string; ArtworkId: string; ArtistId: string; UserName: string; Rating: number; Tags: string; Text: string; Photos: string; CreatedAt: Date };
export const mapReview = (r: ReviewRow) => ({
  id: r.Id, artworkId: r.ArtworkId, artistId: r.ArtistId, userName: r.UserName, rating: r.Rating,
  tags: json<string[]>(r.Tags, []), text: r.Text, photos: json<string[]>(r.Photos, []), at: ms(r.CreatedAt),
});

export type OrderRow = {
  Id: string; Number: string; BuyerId: string | null; BuyerName: string; ArtistId: string; ShipName: string; ShipPhone: string; ShipLine1: string; ShipCity: string;
  ShipProvince: string; ShipCountry: string; ShipPostcode: string; ShippingId: string; ShippingLabel: string; Carrier: string; ShippingToea: number; Eta: string;
  PermitFeeToea: number; SubtotalToea: number; TotalToea: number; Payment: string; PaymentRef: string | null; Status: string; TrackingNo: string | null;
  Reviewed: boolean; Sample: boolean; CreatedAt: Date; ConfirmedAt: Date | null;
};
export const mapOrder = (o: OrderRow, items: { ArtworkId: string; PriceToea: number }[], events: { Status: string; Note: string | null; CreatedAt: Date }[]) => ({
  id: o.Id, number: o.Number, buyerId: o.BuyerId ?? 'sample', buyerName: o.BuyerName, artistId: o.ArtistId,
  items: items.map((i) => ({ artworkId: i.ArtworkId, price: toKina(i.PriceToea) })),
  address: { name: o.ShipName, phone: o.ShipPhone, line1: o.ShipLine1, city: o.ShipCity, province: o.ShipProvince, country: o.ShipCountry, postcode: o.ShipPostcode },
  shipping: { id: o.ShippingId, label: o.ShippingLabel, carrier: o.Carrier, price: toKina(o.ShippingToea), eta: o.Eta },
  permitFee: toKina(o.PermitFeeToea), subtotal: toKina(o.SubtotalToea), total: toKina(o.TotalToea), payment: o.Payment, paymentRef: o.PaymentRef ?? undefined,
  status: o.Status, trackingNo: o.TrackingNo ?? undefined, reviewed: o.Reviewed, sample: o.Sample, simulated: false,
  events: events.map((e) => ({ status: e.Status, at: ms(e.CreatedAt), note: e.Note ?? undefined })),
  createdAt: ms(o.CreatedAt), confirmedAt: ms(o.ConfirmedAt),
});

export type NotificationRow = { Id: string; UserId: string; Kind: string; Title: string; Body: string; Link: string | null; IsRead: boolean; CreatedAt: Date };
export const mapNotification = (n: NotificationRow) => ({ id: n.Id, userId: n.UserId, kind: n.Kind, title: n.Title, body: n.Body, link: n.Link ?? undefined, read: n.IsRead, at: ms(n.CreatedAt) });
