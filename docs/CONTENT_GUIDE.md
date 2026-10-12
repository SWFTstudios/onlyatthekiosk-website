# KIOSK Content Guide

How to publish films, photo stories, interviews, phonk mixes and products on the KIOSK Glass site.

Everything lives in **one file: `js/kiosk-content.js`**. There's no CMS and no build step. Edit the file, add your media, commit, and Cloudflare Pages deploys it.

| Page | URL | Renders |
| --- | --- | --- |
| Home | `index.html` | Lead story, Garage rail, films, radio, Vault preview, Dispatch signup |
| Garage | `garage.html` | Every story, with filters (machine, format, era, season, city, search, saved) |
| Story | `story.html?s=<slug>` | One shoot: hero, specs, story, subjects, slideshow, colour guide, behind the scenes, interview, shop the look |
| Radio | `radio.html` | Phonk mixes, player, tracklists |
| Vault | `vault.html?c=<category>` | Mixes, films, LUT packs, accessories, apparel |

The older Shopify apparel pages (`store.html`, `collections/*`) are unchanged. In the new nav they appear as **Supply**.

---

## 1. Add a story (film, photo story or interview)

1. Create a folder for the media: `images/garage/<slug>/`. Use short, lowercase slugs like `r32-wangan` or `cb750-brooklyn`.
2. Export images as **WebP**, about 2400 px on the long edge for covers and slides, and about 1200 px for behind-the-scenes frames.
3. Copy an existing object in `features` and edit it.

```js
{
  slug: 'r32-wangan',            // URL: story.html?s=r32-wangan
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
  image: 'images/garage/r32-wangan/cover.webp',
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
}
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
| A product `colors` name equals a story `palette` name | +3 each |
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

## 4. Add or sell a product

```js
{
  id: 'lut-sodium-night', category: 'luts',      // mixes | films | luts | accessories | apparel
  title: 'Sodium Night', detail: '12 LUTs · .cube · S-Log3 / Rec.709', price: 29,
  tone: 'sodium', image: 'images/vault/sodium-night.webp',
  status: 'soon',                // 'soon' → "Notify me"   |   'available' → Buy
  shopifyHandle: '',             // when available: links to /products/<handle> (Shopify)
  href: '',                      // …or any URL (Gumroad, Shopify collection, etc.)
  seasons: ['fall', 'winter'], vibes: ['night', 'neon'], colors: ['Sodium'],
}
```

**To start selling a product:**
1. Create it in Shopify. For mixes, films and LUTs, use a digital-delivery app such as Shopify's free **Digital Downloads** app.
2. Copy the product handle into `shopifyHandle` and change `status` to `'available'`.

The existing `/products/:handle` route (`product.html`) handles the product page and checkout.

"Notify me" sends the email to the existing `/api/subscribe` function, which writes to the Airtable "Incoming Interest" table. Right now it stores the email only, not which product the visitor asked about.

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
- Colour: graphite, bone and glass. A single signal orange (`--signal`) appears only on "live" and "now playing" dots.
- Placeholder **plates** (tones `sodium`, `chrome`, `desert`, `ice`, `ember`, `graphite`, `moss`) stand in for any missing image, so pages never look broken while footage is in post.
