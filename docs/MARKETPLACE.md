# KIOSK marketplace: stores, the Hunt and words to wear

The shop (`vault.html`) is a hub. KIOSK sells its own label, and partner stores (thrift curators, independent labels, makers) can sell there too. All of it is configured in `js/kiosk-content.js`.

## Stores

```js
stores: [
  { id: 'kiosk', name: 'KIOSK', city: 'New York', country: 'US', note: 'Our own label.' },
  { id: 'casa-lisboa', name: 'Casa Lisboa', city: 'Lisbon', country: 'PT', note: 'Vintage workwear, sourced in Portugal.' },
]
```
Give each product `store: '<id>'`. Cards show "by <store>" and the **Stores at the kiosk** section lists every store with its piece count. The "Sell at the KIOSK" buttons (shop page and menu) collect a stockist's email through `/api/subscribe`, filed under the interest `stockist`.

### Getting paid: each store keeps its Shopify, KIOSK takes a share

The site doesn't move money itself. Payments go through Shopify. Choose one of these setups:

1. **Shopify Collective** (simplest when partner stores are on Shopify). The partner lists products to your store. You sell them on your Shopify, the partner ships, and Shopify splits the payout automatically. You set your margin, which is your percentage. Put the imported product's handle in `shopifyHandle` and the Buy button checks out on your store.
2. **A multi-vendor marketplace app** for Shopify, if partners aren't on Shopify or are outside Collective's regions. These apps handle vendor accounts, commission rates and payouts.
3. **Link out:** set `href` to the partner's own product page with a referral code, and settle the percentage with the store directly.

Check Shopify's current terms and supported countries before you promise payouts to partners.

## The Hunt (pickup-only pieces)

```js
pickup: { place: 'Hudson Valley, NY', coords: '', window: 'Date announced in the Dispatch', note: 'Packed and cleared by us. You travel to the coordinates to collect it.' }
```
Any product with `pickup` gets a "Pickup only" badge, appears in **The Hunt** section, and quick view shows the place, coordinates and window. Leave `coords` empty until the drop. Visitors see "Coordinates revealed at the drop" and can join the Dispatch to get them. The two Hunt pieces in the file are **examples to edit**: their places come from your shoots, they're marked `status: 'soon'`, and they have no coordinates yet.

## Words to wear (quote merch)

Quote pieces have a small K on the chest and the quote on the back:
```js
quote: 'Focus on direction, not speed.',
mockup: { type: 'tee', chest: true, quote: 'Focus on direction, not speed.', quoteStyle: 'serif' },   // or 'grotesk'
lifestyle: ['images/shop/lifestyle/tee-q-direction.webp'],
colorways: [{ name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214',
  image: 'images/shop/3d/tee-q-direction-0-back.webp', imageFront: 'images/shop/3d/tee-q-direction-0-front.webp' }],
```
Cards show the back and flip to the front on hover. Quick view has Back, Front and On location views.

**Rights:** some sayings have known authors. Before printing for sale, check that you can use each line. Common proverbs are usually fine, but a living author's line or book title may not be.

### Regenerating the images
1. Start the local server (`python3 -m http.server 8765`), then flat-render front and back: `node scripts/render-3d-flat.js <dir> '^(tee-q|hoodie-q|hunt-)'`
2. Shade each one into a 3D render: `python3 scripts/render-3d-shade.py <dir>/<id>--<n>--back.png images/shop/3d/<id>-<n>-back.webp tee|hoodie` (and the same for `--front`).
3. Make a lifestyle composite (hanger in front of a shoot photo): `python3 scripts/render-lifestyle.py images/shop/3d/<id>-0-back.webp images/garage/<slug>/<nn>.webp images/shop/lifestyle/<id>.webp`

For on-model photos, see `docs/LIFESTYLE_PROMPTS.md`.
