# KIOSK Content Guide

How to publish films, photo stories, interviews, radio playlists and products on the KIOSK Glass site.

Everything lives in **one file: `js/kiosk-content.js`**. There's no CMS and no build step. Edit the file, add your media, commit, and Cloudflare Pages deploys it.

| Page | URL | Renders |
| --- | --- | --- |
| Home | `index.html` | Lead story, Garage rail, films, radio, Vault preview, Dispatch signup |
| Journal | `journal.html` | Every story as a blog post: date, read time, chapters (`?draft=1` shows unwritten chapters) |
| Garage | `garage.html` | Every story, with filters (machine, format, era, season, city, search, saved) |
| Story | `story.html?s=<slug>` | One shoot: hero, specs, story, subjects, slideshow, colour guide, behind the scenes, interview, shop the look |
| Radio | `radio.html` | Phonk playlists. Plays in the site-wide radio dock with a live waveform |
| Shop | `vault.html?c=<category>&sort=new` | KIOSK Supply: apparel, headwear, skate, accessories, films, LUT packs |

The older Shopify apparel pages (`store.html`, `collections/*`) are unchanged. In the new nav they appear as **Supply**.

---

## 1. Add a story (film, photo story or interview)

The stories are real shoots: `andy-q50`, `moses-r1m`, `honda-f4i-shop`, `l0st-tapes` and `doom-racing-prospect-meet`. Copy one of them to start a new story. Add `hidden: true` to take a story off the site without deleting it (`lunar-new-year-meet` is hidden for now).

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

### Blog chapters (dictated)
Each story is also a Journal post. Its `chapters` start empty and stay hidden from visitors until they have a `body`. Dictate a chapter to Claude and it gets typed in. See **`docs/DICTATION.md`** for every post's chapter list and prompts.
```js
author: 'RollerReels',
chapters: [
  { id: 'the-car', heading: 'The Q50', prompt: 'What has been done to the car?', body: 'First paragraph…\n\nSecond paragraph…' },
]
```
`type` can be `'car'`, `'motorcycle'` or `'meet'`.

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
soundtrack: 'phonk-n95',           // slug of a mix or playlist → "Soundtrack" button
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

## 3. Radio: Spotify playlists (free to listen, nothing for sale)

Radio plays in a **dock that stays at the bottom of every page**. Once a visitor presses play, links between the KIOSK pages (Home, Garage, Journal, Story, Radio, Shop) load in place, so the music keeps going. Older pages (store, about, contact…) still reload normally, which stops playback. Playing a film pauses the radio.

**Live waveform:** every `<canvas data-wave>` draws the music as it plays: in the dock, on the radio deck, on each playlist card, and in the nav "Radio" pill. For a self-hosted `audio` file, the waveform is the real signal. Spotify doesn't let websites read its audio, so for Spotify playlists the waveform is generated to match a phonk beat, and it starts, stops and seeks with Spotify. Visitors logged in to Spotify hear full tracks; everyone else gets Spotify's 30-second previews.

To add a playlist, copy its share link (`open.spotify.com/playlist/<ID>`) and add an entry to `mixes`:
```js
{
  slug: 'phonk-n95', title: 'Phonk nº 95', volume: 'Playlist 01',
  mood: 'Phonk · curated on Spotify', tone: 'graphite',
  spotify: '1fO87QEdH8Y3WIVjAjDARS',   // playlist ID
  cover: '',                            // optional cover image URL
  length: '', bpm: '', audio: '', tracks: [],
}
```
**SoundCloud:** instead of `spotify`, set `soundcloud` to any SoundCloud link: a track, a playlist (set), or a profile's likes page (`https://soundcloud.com/<username>/likes`). It plays in the same dock, and the dock shows the current track and artist. If an `on.soundcloud.com/…` short link doesn't play, use the full `soundcloud.com/…` link it opens to.

For a self-hosted DJ mix, set `audio` to an MP3 URL (320 kbps). It then plays in the KIOSK player instead of the Spotify embed, and `length`, `bpm` and `tracks` show on the deck.

> Large media: Cloudflare Pages rejects any single file over 25 MB. Host long mixes and films on R2, Bunny or YouTube/Vimeo, and use those URLs in `audio`, `video` or `embed`.

---

## 3a. Magazine layouts: departments, mosaics and rails

The site is organised like a magazine with four **desks**: Travel, Automotive, Music and Fashion.

- **Departments rail** (home page and Journal): one big card per desk.
- **Mosaic** (home page, Journal archive, and the contact sheet on each story): a Pinterest-style board. It mixes gallery photos, Vimeo films, story palettes, 3D product renders, playlists and pull quotes, with filter chips per desk. Tap a photo to open the photo viewer (← → to browse).
- **Lookbook rail** (shop): each product colourway next to the shoot whose palette it's named after.
- **Rails** scroll sideways with drag, arrow buttons or the keyboard.

Each story has a `desk` (`'travel' | 'automotive'`). A single gallery photo can go to a different desk with `desk: 'travel'` on that entry. Products always go under Fashion and playlists under Music.

**Thumbnails:** mosaics load 720px versions from `images/garage/<slug>/thumbs/`. After adding photos, make them with:
```bash
for f in images/garage/<slug>/[0-9][0-9].webp; do mkdir -p images/garage/<slug>/thumbs; convert "$f" -resize '720x720>' -strip -quality 72 "images/garage/<slug>/thumbs/$(basename "$f")"; done
```
If a thumbnail is missing, the full image is used instead.

## 3b. Films on Vimeo

Vimeo films show in an **On Vimeo** strip on the home page and the Garage. Add the ID from the link (`vimeo.com/<id>`, or `vimeo.com/<id>/<hash>` for an unlisted video):
```js
vimeo: [
  { id: '1212483051', hash: 'f428c5372f', title: '', story: 'andy-q50' },
]
```
The title, thumbnail and length load from Vimeo automatically. `title` overrides Vimeo's title, and `story` adds a "Read the story" link in the player. To use a Vimeo film as a story's main film instead, set that story's `embed` to `https://player.vimeo.com/video/<id>?h=<hash>`. In Vimeo, set the video's embed privacy to allow `onlyatthekiosk.com` (and the `*.pages.dev` preview), or Vimeo won't play it on the site.

## 3c. Look and feel: cover, intro, day/night

- **Cover video:** `issue.reel` / `issue.reelWebm` / `issue.reelPoster` play full screen behind the giant KIOSK on the home page. `videos/kiosk-reel.*` is cut from the Q50 and R1M shoots. Replace it with any 10–20 s muted clip under about 8 MB.
- **Globe intro:** plays once per visit on the home page (skippable). It's skipped for visitors who have reduced motion turned on.
- **Day / night:** follows the visitor's local time (day 06:00–18:59). The header button cycles auto → day → night, and the choice is remembered. The digital clock in the header and menu shows the visitor's local time and city.

For stores, partner payouts, pickup-only Hunt pieces and quote merch, see **`docs/MARKETPLACE.md`**.

## 4. Add or sell a product (KIOSK Supply)

The shop is `vault.html`, shown as **Shop** in the nav. Until you set a real product photo, each product renders as a **vector mockup** on a light tile.

```js
{
  id: 'hoodie-garage', category: 'apparel',   // apparel | headwear | skate | accessories | films | luts
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

**Mockup types:** `tee`, `longsleeve`, `crew`, `hoodie`, `cap`, `beanie`, `deck`, `socks`, `tote`, `keytag`, `stickers`, `chain`. Digital goods use `vhs` (films) and `lutbox` (LUT packs; pass `swatches: ['#hex', …]`).

**Prints:** `wordmark`, `kmark`, `wangan`, `issue`, `arch`, `phonk`, `cafe`, `checker`. Pass `printW` to resize a print. Decks take `deckText` and `deckSub`, longsleeves take `sleevePrint`, and cassettes and VHS tapes take `label` and `sub`. New prints and garment types live in `js/kiosk-mockups.js`.

**3D product renders:** tees and hoodies use rendered product shots in `images/shop/3d/<id>-<colourway index>.webp`, set per colourway with `image`. To re-render after changing a print or colour, run `node scripts/render-3d-flat.js <dir>` with the local server on port 8765, then `python3 scripts/render-3d-shade.py <dir>/<id>--<n>.png images/shop/3d/<id>-<n>.webp tee|hoodie`.

**Colourways:** `garment` is the fabric colour and `ink` is the print colour. Name a colourway after a story palette colour (for example "Sodium" or "Midnight Purple") and that story's **Shop the look** will feature the product in that colourway automatically.

**To start selling a product:**
1. Create it in Shopify, one product per colourway. For films and LUTs, use a digital-delivery app such as Shopify's free **Digital Downloads** app.
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
