# KIOSK marketplace: stores, the Hunt and words to wear

The shop (`vault.html`) is a hub. KIOSK sells its own label, and partner stores (thrift curators, independent labels, makers) can sell there too. All of it is configured in `js/kiosk-content.js`.

## Stores

```js
stores: [
  { id: 'kiosk', name: 'KIOSK', city: 'New York', country: 'US', lat: 40.7128, lon: -74.006, url: '',
    note: 'Our own label.', about: '…', cover: 'images/…webp', tags: ['streetwear'] },
  { id: 'casa-lisboa', name: 'Casa Lisboa', city: 'Lisbon', country: 'PT', lat: 38.72, lon: -9.14,
    url: 'https://casa-lisboa.myshopify.com', note: 'Vintage workwear, sourced in Portugal.', about: '…', cover: 'images/stores/casa-lisboa.webp', tags: ['vintage', 'workwear'] },
]
```
`casa-lisboa` is an example; only KIOSK is in the file today. Give each product `store: '<id>'`.

**Each store gets:**
- **A page at the kiosk.** `store.html?s=<id>` shows the cover, about text and the store's pieces, with a **Visit store** button. `store.html` on its own is a searchable directory of all stores.
- **Search.** The store shows up in search on the shop, the Hunt and the directory, matched by name, city, country or tags.
- **A beacon on the Hunt map** at its `lat`/`lon`.

**The "Sell at the KIOSK" buttons** (shop, directory and menu) collect a stockist's email through `/api/subscribe`, filed under the interest `stockist`.

### Visits from the kiosk (affiliate tracking)

**Visit store** links to `/go/<id>` (or `/go/<id>?p=<product id>`). That Cloudflare function (`functions/go/[store].js`) does three things.

1. It looks up the store in `js/kiosk-content.js`. Only listed stores can be targets, so the link can't be abused as an open redirect.
2. It records the visit:
   - **Always:** a `partner_visit` line in the Worker logs (Cloudflare dashboard › Workers › onlyatthekiosk › Logs).
   - **Optionally, in a KV namespace:** bind a namespace as `KIOSK_CLICKS`.
   - **Optionally, in Airtable:** set `AIRTABLE_VISITS_TABLE` to a table name with the fields Click, Store, Product, At, Country and Page. It uses the existing `AIRTABLE_ACCESS_TOKEN` and `AIRTABLE_BASE_ID`.

   No IP addresses or user agents are stored.
3. It sends the visitor to the store's `url` with these tags added:
   `utm_source=onlyatthekiosk&utm_medium=referral&utm_campaign=kiosk-store-page` (or `kiosk-product` with `utm_content=<product id>`), plus `ref=onlyatthekiosk` and a unique `kiosk_click` id.

**Reading the results:**
- **The store's side:** Shopify's own analytics shows UTM-tagged sessions and orders under the referral source `onlyatthekiosk`.
- **Settling commission:** the partner can quote the `kiosk_click` id from their order, and you match it against the click log.
- **Product deep links:** a product with `storeUrl: '/products/handle'` is linked straight to that page on the store's own site. Only links on the store's own domain are followed.
- **Google Analytics:** clicks also send a `partner_visit` event.

UTM tags record where visits come from but don't enforce payment. For automatic commission, use one of the setups below.

### Getting paid: each store keeps its Shopify, KIOSK takes a share

The site doesn't move money itself. Payments go through Shopify. Choose one of these setups:

1. **Shopify Collective** (simplest when partner stores are on Shopify). The partner lists products to your store. You sell them on your Shopify, the partner ships, and Shopify splits the payout automatically. You set your margin, which is your percentage. Put the imported product's handle in `shopifyHandle` and the Buy button checks out on your store.
2. **A multi-vendor marketplace app** for Shopify, if partners aren't on Shopify or are outside Collective's regions. These apps handle vendor accounts, commission rates and payouts.
3. **Link out:** set `href` to the partner's own product page with a referral code, and settle the percentage with the store directly.

Check Shopify's current terms and supported countries before you promise payouts to partners.

## The Hunt (pickup-only pieces)

```js
pickup: {
  place: 'Hudson Valley, NY',
  area: { lat: 41.71, lon: -73.93, radiusKm: 40 },   // the zone shown on the map until the drop
  coords: '',                                         // exact "lat, lon" once you announce it
  window: 'Date announced in the Dispatch',
  note: 'Packed and cleared by us. You travel to the coordinates to collect it.',
}
```
**Where pickup pieces show up:**
- **Card and panel:** any product with `pickup` gets a "Pickup only" status and a "Reserve · get the coordinates" button.
- **The Hunt page:** the product appears on `hunt.html` as a glowing beacon at the centre of its `area`, with a dashed circle `radiusKm` wide. When you fill in `coords` (for example `'40.8517, -73.9527'`), the beacon moves to the exact spot and the label changes from "Drop zone" to "Exact spot".

**The Hunt map** (`hunt.html`, `js/kiosk-hunt.js`):
- **Globe:** a MapLibre globe (`js/vendor/maplibre/`, BSD licence) with the KIOSK land dots.
- **Search:** finds Hunt pieces, products and stores. Matches with a location appear as small cards around the globe.
- **Flying in:** tapping a card or zooming in flies down to a top-down depth map. It combines:
  - terrain shading and elevation colours from the open AWS/Mapzen elevation tiles
  - streets and place names from OpenFreeMap

  At that zoom, beacons show their product cards; tapping one opens the product panel.
- **HUD:**
  - coordinates, altitude, zoom and view
  - zoom, north, tilt (3D terrain), locate me and back to the globe
  - drop and store toggles, and a depth-map toggle
  - a strip of drops with their distance from you
- **Links:** `hunt.html?item=<product id>` or `?store=<id>` flies straight to that item, and `?q=<words>` pre-fills the search.
- **Offline:** if the online map layers can't load, the globe, land, beacons and zones still work from local data (`data/land-110m.geojson`, Natural Earth).

The two Hunt pieces in the file are **examples to edit**: their places come from your shoots, they're marked `status: 'soon'`, and they have no exact coordinates yet.

## Words to wear (quote merch)

Quote pieces have a small K on the chest and the quote on the back:
```js
quote: 'Focus on direction, not speed.',
mockup: { type: 'tee', chest: true, quote: 'Focus on direction, not speed.', quoteStyle: 'serif' },   // or 'grotesk'
colorways: [{ name: 'Hudson Haze', garment: '#e4e1da', ink: '#121214' }],
```
Until a colourway has real photos, its card and product panel show a **tech sketch**: a factory-style line drawing on pattern paper, drawn from `mockup`, with numbered callouts and a spec block (colour, view, stage). Quote pieces show the back with the front as an inset. When you have on-model shots, add them to the colourway as `lifestyle: ['street.webp', 'terminal.webp']` and the sketch is replaced by the photos. Don't composite flat renders over shoot photos.

**Rights:** some sayings have known authors. Before printing for sale, check that you can use each line. Common proverbs are usually fine, but a living author's line or book title may not be.

For on-model photos, see `docs/LIFESTYLE_PROMPTS.md`.
