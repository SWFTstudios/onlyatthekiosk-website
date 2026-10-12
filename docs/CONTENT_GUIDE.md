# KIOSK Content Guide

How to publish films, photo stories, interviews, phonk mixes and products on the KIOSK Glass site.

Everything lives in **one file: `js/kiosk-content.js`**. There's no CMS and no build step. Edit the file, add your media, commit, and Cloudflare Pages deploys it.

| Page | URL | Renders |
| --- | --- | --- |
| Home | `index.html` | Lead story, Garage rail, films, radio, Vault preview, Dispatch signup |
| Garage | `garage.html` | Every story, with filters (machine, format, era, season, city, search, saved) |
| Story | `story.html?s=<slug>` | One shoot: hero, specs, story, subjects, slideshow, colour guide, behind the scenes, interview, shop the look |
| Radio | `radio.html` | Phonk mixes, player, tracklists |
| Shop | `vault.html?c=<category>&sort=new` | KIOSK Supply: apparel, headwear, skate, accessories, mixes, films, LUT packs |

The older Shopify apparel pages (`store.html`, `collections/*`) are unchanged. In the new nav they appear as **Supply**.

---

## 1. Add a story (film, photo story or interview)

The first three stories are real shoots from Google Drive › *RollerReels Video Files*: `andy-q50`, `moses-r1m` and `lunar-new-year-meet`. Copy one of them to start a new story.

**Films from Google Drive:** set `embed` to `https://drive.google.com/file/d/<FILE_ID>/preview`. It only plays for visitors once the Drive file is shared as **Anyone with the link → Viewer**. For the best playback, upload to YouTube or Vimeo and use that embed URL instead.

**Gallery captions:** put the camera settings in `meta`, e.g. `'A7C II · 28mm · 1/50 · f/8 · ISO 100'`. They show under each slide.

1. Create a folder for the media: `images/garage/<slug>/`. Use short, lowercase slugs like `r32-wangan` or `cb750-brooklyn`.
2. Export images as **WebP**, about 2400 px on the long edge for covers and slides, and about 1200 px for behind-the-scenes frames.
3. Copy an existing object in `features` and edit it.

```js
{
  slug: 'andy-q50',              // URL: story.html?s=andy-q50
  type: 'car',                   // 'car' | 'motorcycle'
  format: 'film',                // 'film' | 'gallery' | 'interview'  (garage filter + label)
  year: 1991, make: 'Nissan', model: 'Skyline GT-R', code: 'R32',  // code = giant hero text
  title: 'Wangan Nights',
  tagline: 'Midnight purple on the Wangan line.',
  excerpt: 'One or two sentences shown in the hero panel and on cards.',
  era: '90s',                    // filter chip
  season: 'fall',                // 'spring' | 'summer' | 'fall' | 'winter'
  vibes: ['night', 'neon', 'jdm', 'moody'],   // used for "Shop the look"
  location: 'Wangan Line', city: 'Tokyo', country: 'JP', coords: '35.6264° N, 139.7753° E',
  shotOn: 'Sony FX3', lens: '35mm f/1.4', runtime: '04:12', published: '2026-09-18',
  tone: 'sodium',                // placeholder colour while media is missing

  // MEDIA
  image: 'images/garage/andy-q50/01.webp',
  focus: '62% 78%',              // where to centre the cover when it's cropped (CSS object-position)
  poster: 'images/garage/r32-wangan/poster.webp',
  video: 'videos/garage/r32-wangan.mp4',               // self-hosted, or…
  embed: 'https://www.youtube.com/embed/VIDEO_ID',     // …YouTube / Vimeo player URL
  gallery: [
    { src: 'images/garage/r32-wangan/01.webp', caption: 'Daikoku, 1:40 a.m.', meta: 'FX3 · 35mm · 1/50 · f/1.4 · ISO 3200' },
    { src: 'images/garage/r32-wangan/02.webp', caption: 'Bayshore run' },
  ],
  …
}
```

Cards and the hero only need the identity fields (`slug` through `tone`) plus the media. Every other section on the story page is optional, and a section with no data is hidden.

### Specs (the stat strip)
```js
specs: [ { label: 'Engine', value: '2.6L RB26DETT' }, { label: 'Power', value: '276 HP' } ]
```

### Story body (the blog part)
An ordered list of blocks:
```js
story: [
  { type: 'text', lead: 'Daikoku Futo, 1:40 a.m.', body: 'The parking deck empties out…' },
  { type: 'quote', text: 'Daylight tells you too much about a car.', cite: 'Ken' },
  { type: 'heading', text: 'The build' },
  { type: 'image', src: 'images/garage/r32-wangan/engine.webp', caption: 'RB26, rebuilt over two winters' },
]
```
In a `text` block, `lead` renders in white and `body` in grey, using the same two-tone style as the rest of the site.

### Subjects (who and what is in the film)
```js
subjects: [
  { name: 'Ken', role: 'Owner · Driver', bio: 'Night-shift sound engineer…' },
  { name: 'The R32', role: 'Machine', bio: 'Factory Midnight Purple…' },
]
owner: { name: 'Ken', quote: 'Pull quote used if the story has no quote block.' }
```

### Colour guide
Pick 3–6 colours from your grade. Visitors can tap a swatch to copy its hex.
```js
palette: [
  { name: 'Midnight Purple', hex: '#2b1d3a', note: 'LP2 paint in shadow' },
  { name: 'Sodium', hex: '#e8892b', note: 'Overhead lamps' },
]
```
If the gallery is still empty, the slideshow shows placeholder frames tinted with these colours.

### Behind the scenes
```js
bts: {
  crew: [ { role: 'Director / DP', name: 'KIOSK' } ],
  gear: [ 'Sony FX3', 'Sigma 35mm f/1.4', 'DJI RS 3 Pro' ],
  conditions: [ { label: 'Call time', value: '00:30' }, { label: 'Weather', value: '14°C · clear' } ],
  notes: 'Shot entirely under existing street light…',
  frames: [ 'images/garage/r32-wangan/bts-01.webp' ],
  // Raw / behind-the-scenes clips: short muted loops (a few seconds, no audio, ~1 MB max)
  clips: [
    { src: 'images/garage/r32-wangan/bts/raw-01.mp4', webm: 'images/garage/r32-wangan/bts/raw-01.webm',
      poster: 'images/garage/r32-wangan/bts/raw-01.webp', caption: 'Setting up the rig', meta: 'Osmo Pocket 3 · raw' },
  ],
}
```
Clips autoplay muted on loop. When the visitor has reduced motion turned on, they show controls instead. Encode them like this:
```bash
ffmpeg -i clip.MP4 -an -vf "scale=960:-2,fps=24" -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart raw-01.mp4
ffmpeg -i raw-01.mp4 -c:v libvpx-vp9 -b:v 0 -crf 38 raw-01.webm
ffmpeg -ss 1 -i raw-01.mp4 -frames:v 1 raw-01.webp
```

### Interview and timeline
```js
interview: [ { q: 'Why only at night?', a: 'Sodium light…' } ],
timeline: [ { year: '1991', label: 'Built in Musashimurayama' }, { year: '2026', label: 'Shot for Issue 01' } ],
```

### Links to Radio and the Vault
```js
soundtrack: 'wangan-drift-vol1',    // slug of a mix → "Soundtrack" button plays it
gradedWith: 'lut-sodium-night',     // product id → "Graded with" link
filmProduct: 'film-r32-wangan',     // product id → "Own the film"
products: ['film-r32-wangan', 'app-hoodies'],   // pinned first in "Shop the look"
```

---

## 2. How "Shop the look" picks products

Products listed in a story's `products` always come first. The remaining slots go to the products that best match the story:

| Match | Points |
| --- | --- |
| Product is the story's `gradedWith` LUT | +4 |
| Product is the story's soundtrack mix | +4 |
| A product colourway name (or `colors` entry) equals a story `palette` name | +3 each, and that colourway is preselected |
| Product `seasons` includes the story `season` | +2 |
| A product `vibes` word matches a story `vibes` word | +2 each |

Each card shows the reasons it matched, such as `FALL`, `NIGHT` or `GRADED WITH`. For good matches, use the **same words** in both places. If a story uses the vibe `golden-hour`, tag the matching products with `golden-hour` too.

---

## 3. Add a phonk mix

1. Put the audio in `audio/radio/<slug>.mp3`. Use 320 kbps MP3 for streaming.
2. Add it to `mixes`:
```js
{
  slug: 'wangan-drift-vol1', title: 'Wangan Drift', volume: 'Vol. 01',
  length: '42:10', bpm: '130–140', mood: 'Drift phonk · cowbell · night drive',
  tone: 'sodium', cover: 'images/radio/wangan-drift.webp',
  audio: 'audio/radio/wangan-drift-vol1.mp3',
  product: 'mix-wangan-drift-vol1',     // Vault item for the full download
  tracks: ['Intro', 'Overpass', '…'],
}
```
While `audio` is empty, the play button shows a "drops soon" message instead of playing.

> Large media: Cloudflare Pages rejects any single file over 25 MB. Host long mixes and films on R2, Bunny or YouTube/Vimeo, and use those URLs in `audio`, `video` or `embed`.

---

## 4. Add or sell a product (KIOSK Supply)

The shop is `vault.html`, shown as **Shop** in the nav. Until you set a real product photo, each product renders as a **vector mockup** on a light tile.

```js
{
  id: 'hoodie-garage', category: 'apparel',   // apparel | headwear | skate | accessories | mixes | films | luts
  title: 'Midnight Garage Hoodie', price: 98,
  badge: 'New',                               // tile label: 'New', 'Issue 01' (orange sticker), 'Classic', 'Digital'…
  added: '2026-09-28',                        // used by "Newest" sort and the home "New in" row
  detail: 'Brushed fleece · kangaroo pocket · arch print',
  mockup: { type: 'hoodie', print: 'arch' },
  colorways: [
    { name: 'Plattenbau', garment: '#a7a39a', ink: '#141414' },
    { name: 'Asphalt',    garment: '#141416', ink: '#f2f0eb', shopifyHandle: 'garage-hoodie-asphalt' },
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  status: 'soon',            // 'soon' → "Notify me"   |   'available' → Buy
  shopifyHandle: '',         // fallback handle when a colourway has none
  href: '',                  // …or any URL
  image: '',                 // real photo replaces the mockup
  seasons: ['fall', 'winter'], vibes: ['night', 'urban'], colors: [],
}
```

**Mockup types:** `tee`, `longsleeve`, `crew`, `hoodie`, `cap`, `beanie`, `deck`, `socks`, `tote`, `keytag`, `stickers`, `chain`. Digital goods use `cassette` (mixes), `vhs` (films) and `lutbox` (LUT packs; pass `swatches: ['#hex', …]`).

**Prints:** `wordmark`, `kmark`, `wangan`, `issue`, `arch`, `phonk`, `cafe`, `checker`. Pass `printW` to resize a print. Decks take `deckText` and `deckSub`, longsleeves take `sleevePrint`, and cassettes and VHS tapes take `label` and `sub`. New prints and garment types live in `js/kiosk-mockups.js`.

**Colourways:** `garment` is the fabric colour and `ink` is the print colour. Name a colourway after a story palette colour (for example "Sodium" or "Midnight Purple") and that story's **Shop the look** will feature the product in that colourway automatically.

**To start selling a product:**
1. Create it in Shopify, one product per colourway. For mixes, films and LUTs, use a digital-delivery app such as Shopify's free **Digital Downloads** app.
2. Put each handle on its colourway (`shopifyHandle`) and set `status: 'available'`.

The Buy button then goes to `/products/<handle>` for whichever colourway the customer picked, and the existing `product.html` page handles checkout. The "Classic" #001 hoodie, tee, chain and bracelet are already linked to their existing Shopify handles.

"Notify me" sends the email to `/api/subscribe`, which writes to the Airtable "Incoming Interest" table. It stores the email only, not the product.

---

## 5. Lead story and hero reel

```js
issue: {
  number: '01', title: 'Night Shift', dek: '…',
  lead: 'r32-wangan',                        // story featured in the home hero
  reel: 'videos/reel.mp4',                   // optional muted autoplay loop behind the hero
  reelPoster: 'images/garage/reel-poster.webp',
}
```
Keep the hero reel short (10–20 s), muted, under about 8 MB, and encoded in H.264.

---

## 6. Design system

- Styles: `css/kiosk-glass.css`. Rendering: `js/kiosk-glass.js`. Content: `js/kiosk-content.js`.
- Fonts: General Sans (local) and **Instrument Serif** from Google Fonts for italic editorial accents.
- Theme: white by default. Photo and film surfaces (heroes, story cards, radio deck, player, lightbox) use a dark token scope so footage stays cinematic. Add class `k-dark` or `k-light` to flip any block.
- Colour: graphite, bone and glass. A single signal orange (`--signal`) appears only on "live" and "now playing" dots and the "Issue 01" sticker.
- Placeholder **plates** (tones `sodium`, `chrome`, `desert`, `ice`, `ember`, `graphite`, `moss`) stand in for any missing image, so pages never look broken while footage is in post.
