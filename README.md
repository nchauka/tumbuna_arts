# Tumbuna Arts

**Buy PNG Art. Discover Its Story. Preserve Its Culture.**

A mobile marketplace and cultural heritage archive for Papua New Guinean artists: a React Native app (Expo SDK 57, Expo Router) backed by a Node.js/Express API on Postgres (Supabase). The design spec lives in [`docs/design/tumbuna-arts-design.html`](docs/design/tumbuna-arts-design.html).

## Run it

You need the API running first. Its one-time Supabase setup is in [`server/README.md`](server/README.md).

```bash
# terminal 1: API on http://localhost:4000
cd server
npm install
npm run db:migrate && npm run db:seed   # first time only
npm run dev

# terminal 2: the app
npm install
npx expo start        # press w (web), a (Android emulator), i (iOS simulator), or scan the QR with Expo Go
```

The app finds the API automatically in development:

- **Web:** port 4000 on the same host.
- **Emulators:** `10.0.2.2` (Android) or `localhost` (iOS).
- **A phone running Expo Go:** port 4000 on the computer running `expo start`. The phone must be on the same Wi‑Fi, and Windows Firewall must allow inbound connections on port 4000.

For a deployed API, set `EXPO_PUBLIC_API_URL=https://api.example.com/api/v1` before starting or building.

### Demo accounts

All use the password `tumbuna123`, and the login screen has one-tap buttons for them.

| Account | Email | What to try |
|---|---|---|
| Buyer | `kila@example.com` | Browse, wishlist, cart, checkout, order tracking, certificates, reviews |
| Artist | `joseph@example.com` | Profile → Switch to Studio: dashboard, ship orders, upload artwork, earnings, withdraw |
| Admin | `admin@example.com` | Profile → Verification review: approve or send back artist applications |

Try it across accounts: buy one of Joseph's works as Kila, then log in as Joseph to pack and ship it, then back as Kila to confirm delivery. Joseph's earnings update when Kila confirms.

Test card: `4242 4242 4242 4242`, any future expiry, any CVC. `4000 0000 0000 0002` is always declined.

## What works

- **Auth:** onboarding, register (buyer or artist, email or phone), login, password reset with a code, guest browsing. A guest's wishlist and follows are saved to their account when they sign in. The session token is kept in the device keychain (SecureStore).
- **Marketplace:** home feed, categories, listings with filters and sort, typo-tolerant search, product details, cart grouped by artist, and 3-step checkout. Checkout covers address, shipping with export-permit fees, and card / mobile money / bank transfer. The server prices and locks the order so a one-of-a-kind work can't be sold twice.
- **Buyer:** wishlist and followed artists, purchase history, order tracking, delivery confirmation (releases payment to the artist), reviews with photos, cancellation.
- **Artist Studio:**
  - Dashboard, earnings chart and order fulfilment (pack, then ship with a tracking number).
  - A 4-step upload wizard; photos upload to the server.
  - Drafts, editing, hide and delete.
  - Earnings with withdrawals, profile editing, and verification (ID, selfie, community referee, portfolio).
- **Admin:** review and approve or send back artist verification applications.
- **Heritage archive:** stories with text-to-speech narration, all 22 provinces, techniques, material library, festivals, glossary and buying protocols.
- **Verification:** every artwork has a Certificate of Authenticity with a QR code. The scanner and the certificate viewer check the server registry, and you can transfer ownership.
- **Profile:** account editing, settings (currency display, theme, data saver, notifications), notification centre (refreshed every 20 seconds while signed in), help centre with a support form.

## How data flows

`src/store/index.ts` is the only file that talks to the API (through `src/lib/api.ts`). It keeps a cached copy of the catalogue and your account data, saved on the device so the app opens instantly and still shows saved works offline. Every change goes to the server first and the cache updates from the response. If the server can't be reached, Home and Explore show a banner with a Retry button.

Heritage reference content (provinces, categories, materials, techniques, stories) ships with the app in `src/data/seed.ts`. The same file seeds the database.

## Not real yet

- **Payments** run in test mode on the server: card details are validated, nothing is charged.
- **Password reset codes** are logged by the server instead of being sent by SMS or email. The development server returns the code so the app can show it.
- **Push notifications:** notifications appear in the app, but nothing is pushed to the phone yet.
- **Messaging artists** and **Tok Pisin translation** are placeholders.
- **Artwork imagery** for seed works is generated as material textures (bilum, wood grain, tapa…). Artist uploads use real photos.

## Project structure

```
src/                   the app
  app/                 Expo Router routes (one file per screen)
    (auth)/            onboarding, login, register, forgot-password
    (tabs)/            buyer tabs: home, explore, heritage, wishlist, profile
    studio/            artist mode: dashboard, artworks, orders, earnings, profile
    artwork/[id], artist/[id]/, checkout/, orders/, heritage/, certificate/[serial], admin, scan, upload, verify, …
  components/          ui.tsx (primitives), cards.tsx (composites), brand.tsx, art-image.tsx, icon.tsx
  constants/tokens.ts  design tokens
  data/                shared types and heritage/seed content
  lib/api.ts           API client: base URL, token storage, errors, image upload
  store/               zustand store: API calls + cached state
server/                the API: Express routes, SQL schema, migrations, seed, integration tests
docs/                  design spec and API mapping
```

## Checks

```bash
npx tsc --noEmit                      # app type check
npx expo export --platform android    # app production bundle
cd server && npm test                 # API integration tests (needs DATABASE_URL)
```
