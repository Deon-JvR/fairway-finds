# Fairway Finds Supabase setup

Fairway Finds is currently a direct marketplace:

- Standard listings are free.
- Revenue comes from featured listings, sponsored listings, homepage advertising, and dealer subscriptions.
- Buyers and sellers arrange payment, collection, and delivery directly.
- Fairway Finds does not process buyer payments, courier quotes, seller payouts, refunds, or payment reversals.
- Every listing should show this warning: Fairway Finds is a marketplace connecting buyers and sellers. Payments and deliveries are arranged directly between parties. Never pay for goods before verifying the seller.

## Database setup

Run `supabase-schema.sql` for a fresh database.

For an existing database, run:

1. `supabase-update-direct-marketplace.sql`
2. Any listing image/gallery updates that have not already been applied.

The direct marketplace update sets every profile to buyer-seller access and changes listing commission defaults to `0.00`.

## Required Netlify variables

Set these values in Netlify under Site configuration, Environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`

Payment and courier gateway variables are not required for this version.

## Payment links for Fairway Finds products

Buyer payments still happen directly between buyer and seller. Fairway Finds payment links are only for platform products:

- Featured listing - R49
- Sponsored listing - R99
- Browse/homepage advertising

Paste your real Yoco, PayFast, Ozow, or other payment URLs into `FAIRWAY_PAYMENT_LINKS` in `supabase-config.js`.
After admin approves a listing, the seller dashboard shows the correct payment button for approved featured or sponsored requests.

For iKhokha checkout, add these in Netlify environment variables:

- `IKHOKHA_APP_ID`
- `IKHOKHA_SECRET`
- `IKHOKHA_ENTITY_ID`
- `IKHOKHA_API_URL` if iKhokha gives you a different checkout endpoint
- `ADVERTISING_PAYMENT_CENTS` for the Browse advertising checkout amount

iKhokha is only used for Fairway Finds products. Buyer-seller item payments stay direct between the two parties.

## Admin flow

Admins can:

- approve or reject profiles
- approve or reject listings
- activate or cancel featured/sponsored listing placement
- review marketplace settings

## Buyer and seller flow

1. A user creates a profile and waits for approval.
2. The approved user creates a free listing, with optional featured or sponsored placement.
3. Admin reviews the listing before it appears publicly.
4. Buyer views the listing, reads the safety warning, and contacts the seller directly.
5. Buyer and seller arrange payment, collection, or delivery between themselves.
