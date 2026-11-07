import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import { z } from 'zod';

import { me, requireAuth } from '../auth';
import { config } from '../config';
import { exec, inList, one, query, tx, type Runner } from '../db';
import { badRequest, conflict, forbidden, HttpError, newId, notFound, parse, toKina } from '../http';
import { authorisePayment, isDomestic, SHIPPING, shippingOption, type PaymentInput } from '../services/commerce';
import { mapOrder, type OrderRow } from '../services/mappers';
import { notify } from '../services/notify';

export const ordersRouter = Router();
// Mounted at the API root, so auth is scoped to this router's own paths.
ordersRouter.use(['/orders', '/checkout'], requireAuth);

const Address = z.object({
  name: z.string().trim().min(2, 'Enter the recipient\'s name.').max(120),
  phone: z.string().trim().refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a phone number the courier can call.'),
  line1: z.string().trim().min(3, 'Enter a street address, section/lot or PO Box.').max(200),
  city: z.string().trim().min(1, 'Enter a town or city.').max(120),
  province: z.string().trim().min(1, 'Choose a province or state.').max(120),
  country: z.string().trim().min(2).max(80),
  postcode: z.string().trim().max(20).default(''),
});
const Payment = z.discriminatedUnion('method', [
  z.object({ method: z.literal('card'), card: z.object({ number: z.string(), exp: z.string(), cvc: z.string(), name: z.string().trim().min(2, 'Enter the name on the card.') }) }),
  z.object({ method: z.literal('mobile_money'), phone: z.string() }),
  z.object({ method: z.literal('bank_transfer') }),
]);
const ArtworkIds = z.array(z.string()).min(1, 'Your cart is empty.').max(20).transform((ids) => [...new Set(ids)]);

type LockedArt = { Id: string; Title: string; ArtistId: string; PriceToea: number; ExportPermit: boolean; Status: string };

/** Prices a cart: one parcel per artist, export permit fees for international delivery. */
function price(arts: LockedArt[], country: string, shippingId: string) {
  const ship = shippingOption(country, shippingId);
  if (!ship) throw badRequest(`That shipping option isn't available to ${country}.`, { shippingId: 'Choose a shipping option.' });
  const intl = !isDomestic(country);
  const groups = [...new Set(arts.map((a) => a.ArtistId))].map((artistId) => {
    const items = arts.filter((a) => a.ArtistId === artistId);
    const subtotal = items.reduce((t, a) => t + a.PriceToea, 0);
    const permit = intl ? items.filter((a) => a.ExportPermit).length * config.rules.permitFeeToea : 0;
    return { artistId, items, subtotal, permit, shipping: ship.priceToea, total: subtotal + permit + ship.priceToea };
  });
  return { ship, groups, total: groups.reduce((t, g) => t + g.total, 0) };
}

ordersRouter.post('/checkout/quote', async (req, res) => {
  const b = parse(z.object({ artworkIds: ArtworkIds, country: z.string().min(2), shippingId: z.string().optional() }), req.body);
  const params: Record<string, unknown> = {};
  const arts = await query<LockedArt>(`SELECT Id, Title, ArtistId, PriceToea, ExportPermit, Status FROM Artworks WHERE Id IN (${inList(b.artworkIds, params)})`, params);
  const options = isDomestic(b.country) ? SHIPPING.domestic : SHIPPING.international;
  const q = price(arts.filter((a) => a.Status === 'live'), b.country, b.shippingId ?? options[0].id);
  res.json({
    unavailable: b.artworkIds.filter((id) => !arts.some((a) => a.Id === id && a.Status === 'live')),
    shippingOptions: options.map((o) => ({ id: o.id, label: o.label, carrier: o.carrier, price: toKina(o.priceToea), eta: o.eta })),
    parcels: q.groups.length,
    subtotal: toKina(q.groups.reduce((t, g) => t + g.subtotal, 0)),
    shipping: toKina(q.groups.reduce((t, g) => t + g.shipping, 0)),
    permitFee: toKina(q.groups.reduce((t, g) => t + g.permit, 0)),
    total: toKina(q.total),
  });
});

async function loadOrders(where: string, params: Record<string, unknown>, runner?: Runner) {
  const rows = await query<OrderRow>(`SELECT * FROM Orders WHERE ${where} ORDER BY CreatedAt DESC`, params, runner);
  if (!rows.length) return [];
  const p: Record<string, unknown> = {};
  const ids = inList(rows.map((r) => r.Id), p, 'o');
  const items = await query<{ OrderId: string; ArtworkId: string; PriceToea: number }>(`SELECT OrderId, ArtworkId, PriceToea FROM OrderItems WHERE OrderId IN (${ids})`, p, runner);
  const events = await query<{ OrderId: string; Status: string; Note: string | null; CreatedAt: Date }>(`SELECT OrderId, Status, Note, CreatedAt FROM OrderEvents WHERE OrderId IN (${ids}) ORDER BY CreatedAt, Id`, p, runner);
  return rows.map((o) => mapOrder(o, items.filter((i) => i.OrderId === o.Id), events.filter((e) => e.OrderId === o.Id)));
}
export { loadOrders };

ordersRouter.post('/orders', async (req, res) => {
  const b = parse(z.object({ artworkIds: ArtworkIds, address: Address, shippingId: z.string(), payment: Payment }), req.body);
  const u = me(req);
  const checkoutId = randomUUID();

  const created = await tx(async (t) => {
    // Lock the rows so two buyers can't purchase the same one-of-a-kind work.
    const params: Record<string, unknown> = {};
    const arts = await query<LockedArt>(`SELECT Id, Title, ArtistId, PriceToea, ExportPermit, Status FROM Artworks WHERE Id IN (${inList(b.artworkIds, params)}) FOR UPDATE`, params, t);
    const missing = b.artworkIds.find((id) => !arts.some((a) => a.Id === id));
    if (missing) throw notFound('Artwork');
    const gone = arts.find((a) => a.Status !== 'live');
    if (gone) throw conflict(`"${gone.Title}" is no longer available. Remove it from your cart to continue.`);
    if (u.artistId && arts.some((a) => a.ArtistId === u.artistId)) throw badRequest('You can\'t buy your own artwork.');

    const q = price(arts, b.address.country, b.shippingId);
    const pay = authorisePayment(b.payment as PaymentInput, q.total, checkoutId);
    if (!pay.ok) throw new HttpError(402, pay.message, 'payment_failed');

    for (const [i, g] of q.groups.entries()) {
      const id = newId('o');
      const number = `TA-${String(Date.now()).slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}${q.groups.length > 1 ? `-${i + 1}` : ''}`;
      await exec(`INSERT INTO Orders (Id, Number, CheckoutId, BuyerId, BuyerName, ArtistId, ShipName, ShipPhone, ShipLine1, ShipCity, ShipProvince, ShipCountry, ShipPostcode,
                    ShippingId, ShippingLabel, Carrier, ShippingToea, Eta, PermitFeeToea, SubtotalToea, TotalToea, Payment, PaymentRef, Status)
                  VALUES (@id, @number, @checkoutId, @buyerId, @buyerName, @artistId, @sn, @sp, @sl, @sc, @spr, @sco, @spc,
                    @shipId, @shipLabel, @carrier, @shipToea, @eta, @permit, @subtotal, @total, @payment, @ref, 'placed')`,
      { id, number, checkoutId, buyerId: u.id, buyerName: u.name, artistId: g.artistId,
        sn: b.address.name, sp: b.address.phone, sl: b.address.line1, sc: b.address.city, spr: b.address.province, sco: b.address.country, spc: b.address.postcode,
        shipId: q.ship.id, shipLabel: q.ship.label, carrier: q.ship.carrier, shipToea: g.shipping, eta: q.ship.eta, permit: g.permit, subtotal: g.subtotal, total: g.total,
        payment: pay.label, ref: pay.ref }, t);
      for (const a of g.items) {
        await exec('INSERT INTO OrderItems (OrderId, ArtworkId, PriceToea) VALUES (@id, @aid, @price)', { id, aid: a.Id, price: a.PriceToea }, t);
        await exec(`UPDATE Artworks SET Status = 'sold', UpdatedAt = now() WHERE Id = @aid`, { aid: a.Id }, t);
        await exec('UPDATE Certificates SET OwnerUserId = @uid, OwnerName = NULL WHERE ArtworkId = @aid', { uid: u.id, aid: a.Id }, t);
        await exec(`INSERT INTO CertificateTransfers (Serial, FromUserId, ToUserId, Reason) SELECT Serial, NULL, @uid, 'purchase' FROM Certificates WHERE ArtworkId = @aid`, { uid: u.id, aid: a.Id }, t);
      }
      await exec(`INSERT INTO OrderEvents (OrderId, Status, Note) VALUES (@id, 'placed', 'Payment held until you confirm delivery')`, { id }, t);
    }
    await exec('DELETE FROM Wishlist WHERE UserId = @uid AND ArtworkId IN (SELECT ArtworkId FROM OrderItems WHERE OrderId IN (SELECT Id FROM Orders WHERE CheckoutId = @cid))', { uid: u.id, cid: checkoutId }, t);
    await exec('DELETE FROM Addresses WHERE UserId = @uid AND Line1 = @line1', { uid: u.id, line1: b.address.line1 }, t);
    await exec(`INSERT INTO Addresses (UserId, Name, Phone, Line1, City, Province, Country, Postcode) VALUES (@uid, @name, @phone, @line1, @city, @province, @country, @postcode)`,
    { uid: u.id, ...b.address }, t);

    const all = await loadOrders('CheckoutId = @cid', { cid: checkoutId }, t);
    for (const o of all) {
      await notify(u.id, { kind: 'order', title: 'Order confirmed', body: `${o.number} · We'll tell you when it ships.`, link: `/orders/${o.id}` }, t);
      const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @a', { a: o.artistId }, t);
      await notify(artistUser?.Id, { kind: 'order', title: 'New order', body: `${u.name} bought ${o.items.length} work${o.items.length > 1 ? 's' : ''}. Pack and ship within 3 days.`, link: '/studio/orders' }, t);
    }
    return all;
  });
  res.status(201).json({ orders: created, checkoutId });
});

ordersRouter.get('/orders', async (req, res) => {
  res.json({ items: await loadOrders('BuyerId = @uid', { uid: me(req).id }) });
});

/** Loads an order the caller may see: its buyer, or the artist who sells it. */
async function visibleOrder(id: string, userId: string, artistId: string | null) {
  const [o] = await loadOrders('Id = @id', { id });
  if (!o) throw notFound('Order');
  if (o.buyerId !== userId && o.artistId !== artistId) throw notFound('Order');
  return o;
}

ordersRouter.get('/orders/:id', async (req, res) => {
  const u = me(req);
  res.json(await visibleOrder(req.params.id as string, u.id, u.artistId));
});

ordersRouter.post('/orders/:id/cancel', async (req, res) => {
  const u = me(req);
  const o = await visibleOrder(req.params.id as string, u.id, null);
  if (o.status !== 'placed') throw conflict('This order is already being packed, so it can\'t be cancelled. Contact the artist or support.');
  await tx(async (t) => {
    const n = await exec(`UPDATE Orders SET Status = 'cancelled' WHERE Id = @id AND Status = 'placed'`, { id: o.id }, t);
    if (!n) throw conflict('This order changed while you were cancelling. Refresh and try again.');
    await exec(`INSERT INTO OrderEvents (OrderId, Status, Note) VALUES (@id, 'cancelled', 'Cancelled and refunded')`, { id: o.id }, t);
    await exec(`UPDATE Artworks SET Status = 'live' WHERE Id IN (SELECT ArtworkId FROM OrderItems WHERE OrderId = @id)`, { id: o.id }, t);
    await exec('UPDATE Certificates SET OwnerUserId = NULL WHERE ArtworkId IN (SELECT ArtworkId FROM OrderItems WHERE OrderId = @id)', { id: o.id }, t);
    const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @a', { a: o.artistId }, t);
    await notify(artistUser?.Id, { kind: 'order', title: 'Order cancelled', body: `${o.number} was cancelled by the buyer. The work is back in your shop.`, link: '/studio/orders' }, t);
  });
  res.json(await visibleOrder(o.id, u.id, null));
});

ordersRouter.post('/orders/:id/confirm', async (req, res) => {
  const u = me(req);
  const o = await visibleOrder(req.params.id as string, u.id, null);
  if (o.buyerId !== u.id) throw forbidden();
  if (o.status !== 'shipped' && o.status !== 'delivered') throw conflict('You can confirm delivery once the order has shipped.');
  if (o.confirmedAt) throw conflict('You already confirmed this delivery.');
  await tx(async (t) => {
    await exec(`UPDATE Orders SET Status = 'delivered', ConfirmedAt = now() WHERE Id = @id`, { id: o.id }, t);
    if (o.status !== 'delivered') await exec(`INSERT INTO OrderEvents (OrderId, Status, Note) VALUES (@id, 'delivered', 'Confirmed by buyer')`, { id: o.id }, t);
    const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @a', { a: o.artistId }, t);
    await notify(artistUser?.Id, { kind: 'payout', title: 'Payment released', body: `${o.number} confirmed. Earnings are now available to withdraw.`, link: '/studio/earnings' }, t);
  });
  res.json(await visibleOrder(o.id, u.id, null));
});

ordersRouter.post('/orders/:id/review', async (req, res) => {
  const b = parse(z.object({
    artworkId: z.string(), rating: z.number().int().min(1, 'Choose a star rating.').max(5),
    tags: z.array(z.string().max(60)).max(8).default([]), text: z.string().trim().max(2000).default(''), photos: z.array(z.url()).max(3).default([]),
  }), req.body);
  const u = me(req);
  const o = await visibleOrder(req.params.id as string, u.id, null);
  if (o.buyerId !== u.id) throw forbidden();
  if (o.status !== 'delivered') throw conflict('You can review once the order has been delivered.');
  if (o.reviewed) throw conflict('You already reviewed this order.');
  if (!o.items.some((i) => i.artworkId === b.artworkId)) throw badRequest('That artwork is not part of this order.');
  const city = (await one<{ City: string | null; Country: string }>('SELECT City, Country FROM Users WHERE Id = @id', { id: u.id }))!;
  const id = newId('r');
  await tx(async (t) => {
    await exec(`INSERT INTO Reviews (Id, ArtworkId, ArtistId, OrderId, UserId, UserName, Rating, Tags, Text, Photos) VALUES (@id, @aid, @artistId, @oid, @uid, @uname, @rating, @tags, @text, @photos)`,
      { id, aid: b.artworkId, artistId: o.artistId, oid: o.id, uid: u.id, uname: `${u.name.split(' ')[0]}, ${city.City ?? city.Country}`, rating: b.rating, tags: JSON.stringify(b.tags), text: b.text, photos: JSON.stringify(b.photos) }, t);
    await exec('UPDATE Orders SET Reviewed = true WHERE Id = @id', { id: o.id }, t);
    const artistUser = await one<{ Id: string }>('SELECT Id FROM Users WHERE ArtistId = @a', { a: o.artistId }, t);
    await notify(artistUser?.Id, { kind: 'activity', title: `New ${b.rating}-star review`, body: b.text ? `"${b.text.slice(0, 60)}"` : `${u.name.split(' ')[0]} rated your work.`, link: `/artist/${o.artistId}` }, t);
  });
  res.status(201).json({ id });
});
