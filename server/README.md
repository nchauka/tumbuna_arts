# Tumbuna Arts API

REST API for the Tumbuna Arts app: Node.js, Express 5, Postgres on Supabase (`pg` driver), JWT auth, zod validation, image uploads to Supabase Storage or local disk.

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com) (or use an existing one). The API needs two things from it:

- **Database connection string** (required): click **Connect** in the dashboard and copy the **Session pooler** URI (port 5432), with your database password filled in. The direct connection also works if your network has IPv6. Don't use the transaction pooler (port 6543): the API sets `search_path` per connection and holds row locks across statements.
- **Storage** (optional): Project Settings → API gives the project URL and the `service_role` key. With them set, uploads go to a public `tumbuna-media` bucket, which the API creates on first upload. Without them, uploads are stored in `./uploads`.

The tables live in their own Postgres schema (`tumbuna`, set by `DB_SCHEMA`), not `public`. Supabase's auto-generated REST API only exposes `public` by default, so the anon key can't reach this data; everything goes through this API. You can still browse the tables in the Table Editor by switching the schema dropdown to `tumbuna`.

### 2. Configure and run

```bash
cd server
npm install
cp .env.example .env      # set DATABASE_URL and JWT_SECRET (and the SUPABASE_* keys for Storage)
npm run db:migrate        # creates the tumbuna schema and tables
npm run db:seed           # loads the app's catalogue and demo accounts
npm run dev               # http://localhost:4000/api/v1, reloads on change
```

Demo accounts (password `tumbuna123`): `kila@example.com` (buyer), `joseph@example.com` (artist), `admin@example.com` (admin, reviews verifications).

| Script | What it does |
|---|---|
| `npm run dev` | Run with reload (tsx) |
| `npm run build` / `npm start` | Bundle to `dist/index.js` and run it |
| `npm run db:migrate` | Create the schema if missing and apply new `sql/*.sql` files |
| `npm run db:seed` | Load seed data into an empty database |
| `npm run db:reset` | Drop, recreate and reseed (destroys data) |
| `npm test` | Integration tests against a throwaway `tumbuna_test` schema in the same database |
| `npm run typecheck` | TypeScript check |

## Endpoints

Base path `/api/v1`. JSON in and out. Send `Authorization: Bearer <token>` where marked 🔒. Errors look like `{ "error": { "code", "message", "fields"? } }`, where `fields` maps form fields to messages. Prices are in kina; the database stores toea.

**Auth**
| | |
|---|---|
| `POST /auth/register` | `{ name, identifier, password, role: buyer\|artist, country, province?, crafts? }` → `{ token, user, artist }` |
| `POST /auth/login` | `{ identifier, password }` → `{ token, user, artist }`. Identifier is an email or a phone number |
| `POST /auth/reset/request` | `{ identifier }`. Sends a 6-digit code; outside production the response includes `devCode` |
| `POST /auth/reset/confirm` | `{ identifier, code, password }` |

**Me** 🔒
| | |
|---|---|
| `GET /me` · `PATCH /me` · `DELETE /me` | Session (`user` + `artist`), edit profile, delete account |
| `GET /me/wishlist` · `PUT/DELETE /me/wishlist/:artworkId` | Saved artworks |
| `GET /me/following` · `PUT/DELETE /me/following/:artistId` | Followed artists |
| `GET /me/addresses` | Last 5 delivery addresses (saved at checkout) |
| `GET /me/certificates` | Artworks whose certificate you own |
| `GET /me/notifications` · `POST /me/notifications/read` | `{ ids? }`; no ids marks everything read |

**Catalogue** (public)
| | |
|---|---|
| `GET /meta` | Provinces, categories, materials, techniques |
| `GET /stories` · `GET /stories/:slug` | Heritage stories |
| `GET /artworks` | Query: `category province material technique artist min max verified noPermit featured q status sort limit offset` → `{ items, total }` |
| `GET /artworks/:id` · `POST /artworks/:id/view` | Drafts and hidden works are visible only to their artist |
| `GET /artists` · `GET /artists/:id` · `GET /artists/:id/reviews` | Artist with `rating` and `stats` |
| `GET /reviews?artistId&limit` | Latest reviews (up to 500), optionally for one artist |
| `POST /artists/:id/commissions` 🔒 | `{ brief, budget? }` |
| `GET /search?q=` | `{ works, artists, stories }` |

**Orders** 🔒
| | |
|---|---|
| `POST /checkout/quote` | `{ artworkIds, country, shippingId? }` → shipping options, parcels, permit fees, total |
| `POST /orders` | `{ artworkIds, address, shippingId, payment }` → one order per artist. `payment` is `{ method: 'card', card }`, `{ method: 'mobile_money', phone }` or `{ method: 'bank_transfer' }`. 402 if the payment fails, 409 if a work was just sold |
| `GET /orders` · `GET /orders/:id` | Buyer's orders; an order is visible to its buyer and its artist |
| `POST /orders/:id/cancel` | Only while `placed`; the work goes back on sale |
| `POST /orders/:id/confirm` | Buyer confirms delivery and releases payment to the artist |
| `POST /orders/:id/review` | `{ artworkId, rating, tags?, text?, photos? }`, once per delivered order |

**Studio** 🔒 artist accounts
| | |
|---|---|
| `GET /studio/summary` | Month earnings, 7-day chart, KPIs, balances |
| `GET /studio/artworks?status=` · `POST /studio/artworks` | Create a draft (any fields) or publish (`publish: true`, full validation). Issues the certificate |
| `PATCH /studio/artworks/:id` · `DELETE /studio/artworks/:id` | Edit; `{ status: 'hidden'\|'live'\|'sold' }` alone changes visibility. Works that are part of an order can't be deleted |
| `GET /studio/orders` · `POST /studio/orders/:id/status` | `{ status: packed\|shipped\|delivered, trackingNo? }`; steps must go in order and shipping needs a tracking number. Marking a sample order delivered also releases its payment |
| `GET /studio/earnings` · `POST /studio/payouts` | `{ amount, method }`, limited to the available balance |
| `PATCH /studio/profile` | Village, bio, lineage, years, province, avatar, crafts |
| `GET /studio/verification` · `POST /studio/verification` | `{ idPhotoUrl, selfieUrl, referee: { name, role, phone }, portfolio: url[3..6] }` |

**Certificates, uploads, support, admin**
| | |
|---|---|
| `GET /certificates/:serial` | Public lookup for the QR scanner. Owner shown as initials |
| `POST /certificates/:serial/transfer` 🔒 | `{ toEmail }`, current owner only |
| `POST /uploads` 🔒 | multipart: `file` (JPEG/PNG/WebP/HEIC, ≤ 8 MB), `folder` (`artworks\|avatars\|reviews\|verification`) → `{ url }` |
| `POST /support` | `{ message, context? }` |
| `GET /admin/verifications` · `POST /admin/verifications/:id/decision` 🔒 admin | `{ approve, note? }`; a note is required when rejecting |
| `GET /health` | `{ status, db }` (outside `/api/v1`) |

## Business rules

- **Fee:** 10% of the artwork price. Artists earn the rest once the buyer confirms delivery; until then it's "pending".
- **Shipping:** domestic is Post PNG Standard K 35 or EMS K 60; international is DHL K 165 or Post PNG International K 95. Each artist ships separately, so shipping is charged per parcel.
- **Export permit:** K 30 per flagged item on international orders.
- **Overselling:** checkout locks the artwork rows (`SELECT … FOR UPDATE`), so a one-of-a-kind work can only be bought once. The tests race two buyers to prove it.
- **Payouts** are serialised per artist so two requests can't spend the same balance.

## Not connected yet

These are placeholders, each isolated in one function:

- **Payments** run in test mode in `services/commerce.ts → authorisePayment`. Card numbers pass a Luhn check; `4000 0000 0000 0002` is always declined. Plug in Stripe or a PNG gateway here.
- **SMS and email** codes are logged to the console in `services/notify.ts → sendCode`.
- **Push notifications:** notifications are stored and served by the API, but push delivery (Expo push tokens) isn't wired.
- **Uploads** go to `./uploads` unless `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, in which case they go to Supabase Storage.
