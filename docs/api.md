# How the app uses the API

The app is connected to the API in [`server/`](../server/README.md). All calls live in `src/store/index.ts` (via `src/lib/api.ts`). This table shows which endpoint each store action uses.

| Store action | Endpoint |
|---|---|
| `register` | `POST /api/v1/auth/register` → keep `token`, use `user` and `artist` |
| `login` | `POST /api/v1/auth/login` |
| `resetPassword` | `POST /auth/reset/request`, then `POST /auth/reset/confirm` |
| `updateProfile` / `deleteAccount` | `PATCH /me`, `DELETE /me` |
| catalogue reads | `GET /meta`, `/stories`, `/artworks?…`, `/artworks/:id`, `/artists`, `/artists/:id`, `/artists/:id/reviews`, `/search?q=` |
| `incrementViews` | `POST /artworks/:id/view` |
| `toggleWishlist` / `toggleFollow` | `PUT` or `DELETE /me/wishlist/:id`, `/me/following/:id` |
| `addToCart` / `removeFromCart` | stays on the device; `POST /checkout/quote` prices it |
| addresses | saved automatically at checkout; `GET /me/addresses` |
| `placeOrder` | `POST /orders` (payment `{ method: 'card' \| 'mobile_money' \| 'bank_transfer', … }`) |
| `cancelOrder` / `confirmDelivery` | `POST /orders/:id/cancel`, `POST /orders/:id/confirm` |
| `addReview` | `POST /orders/:id/review` (upload photos first) |
| `advanceOrder` | `POST /studio/orders/:id/status` |
| `saveArtwork` | `POST /studio/artworks`, `PATCH /studio/artworks/:id` (upload photos first with `POST /uploads`) |
| `setArtworkStatus` / `deleteArtwork` | `PATCH /studio/artworks/:id { status }`, `DELETE /studio/artworks/:id` |
| `updateArtistProfile` | `PATCH /studio/profile` |
| `submitVerification` | `POST /studio/verification` (approved by an admin via `/admin/verifications`) |
| `requestPayout` | `POST /studio/payouts` |
| `transferCertificate` | `POST /certificates/:serial/transfer` |
| certificate lookup / QR scan | `GET /certificates/:serial` |
| `markNotificationRead(s)` | `POST /me/notifications/read` |
| `requestCommission` / `sendSupport` | `POST /artists/:id/commissions`, `POST /support` |
| admin review screen | `GET /admin/verifications`, `POST /admin/verifications/:id/decision` |
| `tick` / `refresh` | re-fetch session data every 20 s while signed in; full refresh on app foreground |

Studio balances are computed on the device from your orders and payouts using the same rules as `GET /studio/summary`.
